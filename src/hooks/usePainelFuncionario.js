// src/hooks/usePainelFuncionario.js
// Agrega dados do Painel do funcionário (Alessandro/Guilherme):
//   - osDoDia: OS ativas (NÃO concluido/recusado), prioridade pras agendadas pra hoje
//   - desempenho: OS concluídas no mês + tempo médio (global) + pontualidade (do funcionário)
//
// funcId vem como 'func1' | 'func2' (do getRole(user)). O lookup pra UUID em
// `usuarios` é feito por email — convenção idemaq (func1@idemaq.com, func2@idemaq.com).
// Cache em memória pra evitar N round-trips.

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const EMAIL_POR_FUNC_ID = {
  func1: 'func1@idemaq.com',
  func2: 'func2@idemaq.com',
}

// Cache de uuid por funcId — sobrevive entre renders do mesmo bundle.
const _cacheUuid = new Map()

async function resolverFuncionarioId(funcId) {
  if (_cacheUuid.has(funcId)) return _cacheUuid.get(funcId)
  const email = EMAIL_POR_FUNC_ID[funcId]
  if (!email) {
    _cacheUuid.set(funcId, null)
    return null
  }
  const { data, error } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .limit(1)
    .maybeSingle()
  if (error || !data) {
    console.warn(`[usePainelFuncionario] usuario "${email}" não encontrado`)
    _cacheUuid.set(funcId, null)
    return null
  }
  _cacheUuid.set(funcId, data.id)
  return data.id
}

// Início e fim do mês corrente como ISO date 'YYYY-MM-DD'
function rangeDoMes() {
  const hoje = new Date()
  const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  const toIso = d => d.toISOString().slice(0, 10)
  return { iniIso: toIso(ini), fimIso: toIso(fim) }
}

// Ordena OS ativas: agendadas pra hoje primeiro, depois por prazo, depois por criado_em
function ordenarOSDoDia(lista) {
  const hojeIso = new Date().toISOString().slice(0, 10)
  return [...lista].sort((a, b) => {
    const aHoje = (a.data_agendamento || '').slice(0, 10) === hojeIso
    const bHoje = (b.data_agendamento || '').slice(0, 10) === hojeIso
    if (aHoje !== bHoje) return aHoje ? -1 : 1
    const aPrazo = a.prazo || a.criado_em || ''
    const bPrazo = b.prazo || b.criado_em || ''
    return aPrazo.localeCompare(bPrazo)
  })
}

// Hora HH:mm de uma data_agendamento, ou null se não for hoje/não existir
function horaSeForHoje(dataAgendamento) {
  if (!dataAgendamento) return null
  const d = new Date(dataAgendamento)
  const hojeIni = new Date(); hojeIni.setHours(0, 0, 0, 0)
  const hojeFim = new Date(); hojeFim.setHours(23, 59, 59, 999)
  if (d < hojeIni || d > hojeFim) return null
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Formata duração em horas decimais → "3h22"
function fmtTempoMedio(horasDecimal) {
  if (!horasDecimal || isNaN(horasDecimal)) return '—'
  const h = Math.floor(horasDecimal)
  const m = Math.round((horasDecimal - h) * 60)
  return `${h}h${String(m).padStart(2, '0')}`
}

/**
 * @param {string} funcId — 'func1' | 'func2'
 * @returns {object} { osDoDia, desempenho, loading, error }
 */
export function usePainelFuncionario(funcId) {
  const [osDoDia, setOsDoDia] = useState([])
  const [desempenho, setDesempenho] = useState({
    osConcluidas: 0,
    tempoMedio: '—',
    pontualidade: '—',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false

    async function carregar() {
      setLoading(true)
      setError(null)
      try {
        const { iniIso, fimIso } = rangeDoMes()

        // ─── 1. OS ativas (não concluído/recusado) — top 10 ──────────────────
        const { data: osAtivas, error: errOS } = await supabase
          .from('os')
          .select(`
            id, numero, tipo, etapa,
            prazo, data_agendamento, criado_em,
            cliente:cliente_id(nome)
          `)
          .is('deleted_at', null)
          .not('etapa', 'in', '("concluido","recusado")')
          .order('criado_em', { ascending: false })
          .limit(20)
        if (errOS) throw errOS
        if (cancelado) return

        const osDia = ordenarOSDoDia(osAtivas || []).slice(0, 10).map(os => ({
          numero: os.numero,
          cliente: os.cliente?.nome || 'Fabricação',
          etapa: os.etapa,
          tipo: os.tipo,
          hora: horaSeForHoje(os.data_agendamento),
        }))
        setOsDoDia(osDia)

        // ─── 2. Desempenho global do mês (todas as OS concluídas) ────────────
        const { data: concluidas, error: errCl } = await supabase
          .from('os')
          .select('id, criado_em, data_conclusao')
          .is('deleted_at', null)
          .eq('etapa', 'concluido')
          .gte('data_conclusao', iniIso)
          .lte('data_conclusao', fimIso + 'T23:59:59')
        if (errCl) throw errCl
        if (cancelado) return

        const osConcluidas = (concluidas || []).length
        let tempoMedio = '—'
        if (osConcluidas > 0) {
          const horas = (concluidas || [])
            .map(o => {
              if (!o.criado_em || !o.data_conclusao) return null
              const ms = new Date(o.data_conclusao) - new Date(o.criado_em)
              return ms / (1000 * 60 * 60)
            })
            .filter(h => h != null && h >= 0)
          if (horas.length > 0) {
            const media = horas.reduce((s, h) => s + h, 0) / horas.length
            tempoMedio = fmtTempoMedio(media)
          }
        }

        // ─── 3. Pontualidade do funcionário no mês ───────────────────────────
        let pontualidade = '—'
        const funcUuid = await resolverFuncionarioId(funcId)
        if (funcUuid) {
          const { data: jornadas, error: errJ } = await supabase
            .from('jornada_funcionario')
            .select('status')
            .is('deleted_at', null)
            .eq('funcionario_id', funcUuid)
            .gte('dia', iniIso)
            .lte('dia', fimIso)
          if (errJ) throw errJ
          if (cancelado) return

          if ((jornadas || []).length > 0) {
            const presentes = jornadas.filter(j => j.status === 'presente').length
            pontualidade = `${Math.round((presentes / jornadas.length) * 100)}%`
          }
        }

        setDesempenho({ osConcluidas, tempoMedio, pontualidade })
      } catch (e) {
        if (cancelado) return
        setError(e?.message || 'Erro ao carregar painel')
        console.error('[usePainelFuncionario]', e)
      } finally {
        if (!cancelado) setLoading(false)
      }
    }

    carregar()
    return () => { cancelado = true }
  }, [funcId])

  return { osDoDia, desempenho, loading, error }
}
