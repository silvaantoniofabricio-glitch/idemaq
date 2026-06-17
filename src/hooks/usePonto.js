// src/hooks/usePonto.js
// Hook do módulo Relógio de Ponto.
//
// Tabelas (schema parte 2 — sql/09-ponto-schema.sql):
//   ponto_registro      → 1 linha por batida
//     (id, funcionario_id, tipo enum, bateu_em, lat, lng,
//      endereco_aproximado, observacao + soft-delete + auditoria)
//
//   jornada_funcionario → agregado diário (1 por funcionario/dia)
//     (entrada/saida_almoco/volta_almoco/saida + totais interval +
//      status enum presente|falta|falta_justificada|feriado)
//
// Tipos da batida: 'entrada' | 'saida_almoco' | 'volta_almoco' | 'saida'
//
// Comportamento de fallback: enquanto o schema ainda não existir no
// Supabase (sql/09 não rodou), o hook retorna `tabelaAusente: true` e as
// mutações respondem com `{ error: { code: 'OFFLINE' } }`. A UI fica em
// modo demo (usa _mocks.js) sem quebrar.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'

// ─── Detecção de tabela ausente ─────────────────────────────────────────────
function isMissingTable(err) {
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('not found'))
}

// ─── Helpers de tempo ───────────────────────────────────────────────────────
const JORNADA_PADRAO_MIN = 8 * 60  // 8h/dia — futuro: configurável

function inicioDoDia(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function fimDoDia(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function diaIso(d = new Date()) {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

// Próximo tipo baseado na última batida do dia
export function proximoTipo(ultimaBatida) {
  if (!ultimaBatida) return 'entrada'
  const mapa = {
    entrada:      'saida_almoco',
    saida_almoco: 'volta_almoco',
    volta_almoco: 'saida',
    saida:        null,  // expediente encerrado
  }
  return mapa[ultimaBatida.tipo] ?? null
}

// Calcula minutos trabalhados a partir de uma lista de batidas (mesmo dia).
// Pareia entrada→saida_almoco e volta_almoco→saida.
// Se entrou e ainda não saiu, conta até `agora`.
export function minutosTrabalhados(batidas, agora = new Date()) {
  if (!batidas || batidas.length === 0) return 0
  const lista = [...batidas].sort((a, b) => new Date(a.bateu_em) - new Date(b.bateu_em))
  let totalMin = 0
  let entradaT = null
  for (const b of lista) {
    const t = new Date(b.bateu_em)
    if (b.tipo === 'entrada' || b.tipo === 'volta_almoco') {
      entradaT = t
    } else if ((b.tipo === 'saida_almoco' || b.tipo === 'saida') && entradaT) {
      totalMin += Math.round((t - entradaT) / 60000)
      entradaT = null
    }
  }
  if (entradaT) {
    totalMin += Math.round((agora - entradaT) / 60000)
  }
  return totalMin
}

// Saldo banco de horas do dia em minutos (positivo = extra, negativo = deve).
// Só conta se o expediente foi encerrado (tem saída).
export function saldoBancoMinutos(batidas, jornadaPadraoMin = JORNADA_PADRAO_MIN) {
  if (!batidas || batidas.length === 0) return 0
  const teveSaida = batidas.some(b => b.tipo === 'saida')
  if (!teveSaida) return 0
  const trab = minutosTrabalhados(batidas)
  return trab - jornadaPadraoMin
}

// ─── Captura de geolocalização ──────────────────────────────────────────────
// Promessa que resolve { lat, lng, precisao } ou rejeita com Error.
// Front DEVE chamar isso antes de bater ponto — bloqueia se for negado.
export function capturarGeolocalizacao(opts = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error('Navegador não suporta geolocalização'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        precisao: pos.coords.accuracy,
      }),
      (err) => {
        const msg = err.code === 1
          ? 'Permissão de localização negada'
          : err.code === 2
            ? 'Localização indisponível'
            : 'Tempo esgotado pra capturar localização'
        reject(new Error(msg))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...opts }
    )
  })
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================
//
// Uso típico no painel do funcionário:
//   const { batidasHoje, ultima, prox, bater, loading, tabelaAusente } =
//     usePonto({ funcionarioId: user.id, escopo: 'hoje' })
//
// Uso no espelho mensal ou relatório do dono:
//   const { batidas, jornadas, ... } =
//     usePonto({ funcionarioId, escopo: 'mes', ano: 2026, mes: 4 })
//
// Parâmetros:
//   - funcionarioId: uuid do funcionário (omitir = traz batidas de todos,
//                    usado pelo dono no relatório consolidado)
//   - escopo: 'hoje' | 'semana' | 'mes' | 'custom'
//   - dataInicio/dataFim: pra escopo='custom' (Date objects)
//   - ano/mes: pra escopo='mes' (mes é 0-indexed igual JS)

export function usePonto({
  funcionarioId,
  escopo = 'hoje',
  ano,
  mes,
  dataInicio,
  dataFim,
} = {}) {
  const [batidas, setBatidas] = useState([])
  const [jornadas, setJornadas] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabelaAusente, setTabelaAusente] = useState(false)
  const [erro, setErro] = useState(null)

  // ─── Resolve janela temporal a partir do escopo ──────────────────────────
  const { inicio, fim } = useMemo(() => {
    const agora = new Date()
    if (escopo === 'custom' && dataInicio && dataFim) {
      return { inicio: inicioDoDia(dataInicio), fim: fimDoDia(dataFim) }
    }
    if (escopo === 'mes') {
      const a = ano ?? agora.getFullYear()
      const m = mes ?? agora.getMonth()
      return {
        inicio: inicioDoDia(new Date(a, m, 1)),
        fim: fimDoDia(new Date(a, m + 1, 0)),
      }
    }
    if (escopo === 'semana') {
      const i = new Date(agora)
      i.setDate(i.getDate() - 6)
      return { inicio: inicioDoDia(i), fim: fimDoDia(agora) }
    }
    // hoje (default)
    return { inicio: inicioDoDia(agora), fim: fimDoDia(agora) }
  }, [escopo, ano, mes, dataInicio, dataFim])

  // ─── Carrega batidas + jornadas da janela ────────────────────────────────
  const carregar = useCallback(async () => {
    // funcionarioId=null significa "ainda carregando o usuário" — aguarda.
    // funcionarioId=undefined significa "modo dono: busca todos" (intencional).
    if (funcionarioId === null) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErro(null)
    let qBat = supabase
      .from('ponto_registro')
      .select('*')
      .is('deleted_at', null)
      .gte('bateu_em', inicio.toISOString())
      .lte('bateu_em', fim.toISOString())
      .order('bateu_em', { ascending: true })
    if (funcionarioId) qBat = qBat.eq('funcionario_id', funcionarioId)

    let qJor = supabase
      .from('jornada_funcionario')
      .select('*')
      .is('deleted_at', null)
      .gte('dia', diaIso(inicio))
      .lte('dia', diaIso(fim))
      .order('dia', { ascending: false })
    if (funcionarioId) qJor = qJor.eq('funcionario_id', funcionarioId)

    const [{ data: dataBat, error: errBat }, { data: dataJor, error: errJor }] =
      await Promise.all([qBat, qJor])

    if (isMissingTable(errBat) || isMissingTable(errJor)) {
      setTabelaAusente(true)
      setBatidas([])
      setJornadas([])
      setLoading(false)
      return
    }

    if (errBat) {
      setErro(errBat)
      console.error('[usePonto] erro batidas:', errBat)
    } else {
      setBatidas(dataBat || [])
    }

    if (errJor) {
      console.error('[usePonto] erro jornadas:', errJor)
    } else {
      setJornadas(dataJor || [])
    }

    setTabelaAusente(false)
    setLoading(false)
  }, [funcionarioId, inicio, fim])

  useEffect(() => {
    carregar()
  }, [carregar])

  // ─── Realtime: novas batidas do funcionário aparecem instantaneamente ────
  useEffect(() => {
    if (tabelaAusente) return
    const canal = supabase
      .channel(`ponto_registro_${funcionarioId || 'todos'}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ponto_registro' },
        () => { carregar() }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [funcionarioId, tabelaAusente, carregar])

  // ─── Bater ponto ─────────────────────────────────────────────────────────
  // Insere linha em `ponto_registro`. `bateu_em` é preenchido pelo banco
  // (DEFAULT now()) — front NÃO envia, pra evitar batida retroativa.
  // Captura geolocalização antes — se falhar, propaga erro pra UI bloquear.
  const bater = useCallback(async ({ tipo, observacao, geo, semGeo = false } = {}) => {
    if (!funcionarioId) {
      return { error: new Error('funcionarioId obrigatório pra bater ponto') }
    }
    if (tabelaAusente) {
      return { error: { code: 'OFFLINE', message: 'Schema do Ponto ainda não aplicado' } }
    }

    let loc = geo
    if (!loc && !semGeo) {
      try {
        loc = await capturarGeolocalizacao()
      } catch (e) {
        return { error: e }
      }
    }

    const { data, error } = await supabase
      .from('ponto_registro')
      .insert({
        funcionario_id: funcionarioId,
        tipo,
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        endereco_aproximado: loc?.endereco_aproximado ?? null,
        observacao: observacao || null,
      })
      .select()
      .single()

    if (error) return { error }

    // Optimistic update — Realtime cobre, mas garante UI imediata
    setBatidas(prev => [...prev, data])
    return { data }
  }, [funcionarioId, tabelaAusente])

  // ─── Derivações úteis pra UI ─────────────────────────────────────────────

  // Batidas de hoje
  const batidasHoje = useMemo(() => {
    const i = inicioDoDia()
    const f = fimDoDia()
    return batidas.filter(b => {
      const t = new Date(b.bateu_em)
      return t >= i && t <= f
    })
  }, [batidas])

  // Última batida de hoje (pra resolver próximo tipo)
  const ultima = useMemo(() => {
    if (batidasHoje.length === 0) return null
    return [...batidasHoje].sort((a, b) =>
      new Date(b.bateu_em) - new Date(a.bateu_em))[0]
  }, [batidasHoje])

  const prox = useMemo(() => proximoTipo(ultima), [ultima])

  // Saldo banco de horas acumulado da janela (soma de saldo_horas das
  // linhas em jornada_funcionario). Quando jornadas vier vazia, fallback
  // pra cálculo client-side agrupando batidas por dia.
  const saldoBancoMin = useMemo(() => {
    if (jornadas.length > 0) {
      // jornada_funcionario.saldo_horas é interval → string tipo '01:30:00'
      // Sem parser de interval no front; pra MVP soma minutos trabalhados
      // do dia inteiro (batidas) e subtrai jornada padrão.
    }
    // Agrupa batidas por dia ISO
    const porDia = {}
    for (const b of batidas) {
      const dia = diaIso(new Date(b.bateu_em))
      if (!porDia[dia]) porDia[dia] = []
      porDia[dia].push(b)
    }
    let total = 0
    for (const dia of Object.keys(porDia)) {
      total += saldoBancoMinutos(porDia[dia])
    }
    return total
  }, [batidas, jornadas])

  return {
    batidas,
    batidasHoje,
    jornadas,
    ultima,
    prox,
    minutosTrabHoje: minutosTrabalhados(batidasHoje),
    saldoBancoMin,
    loading,
    tabelaAusente,
    erro,
    bater,
    recarregar: carregar,
  }
}

export default usePonto
