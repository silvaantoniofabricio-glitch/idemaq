// src/hooks/useRelatorios.js
// 6 hooks reais pros relatórios — Geral, Operacional, Estoque, Vendas, DRE, Funcionários.
// Os 2 que alimentam a IA (DRE, Funcionários) também são reais agora; o botão
// "Gerar análise" continua gateado por IA_DEPLOYED no Relatorios.jsx até o
// deploy da edge function `relatorio-ia`.
//
// Cada hook é lazy: só faz fetch quando montado (i.e., quando o usuário abre
// o relatório). Re-fetch ao mudar o período. Sem realtime — relatório é foto.
//
// Schema das tabelas (em uso aqui):
//   os                    (criado_em, data_conclusao, etapa, tipo, valor_total,
//                          desconto, garantia, recusada, deleted_at, cliente_id)
//   os_item               (os_id, peca_id, nome, quantidade, valor_unitario,
//                          valor_total, criado_em, deleted_at)
//   os_historico          (os_id, etapa_de, etapa_para, data, duracao_segundos,
//                          funcionario_id)
//   peca                  (qtd_atual, qtd_minima, custo_atual, custo_medio, categoria)
//   lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
//                          vencimento, pago_em, taxa_pct, forma_pagamento,
//                          os_id, deleted_at)
//   usuarios              (id, apelido, papel)

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { CATEGORIA_POR_ID } from '../utils/categoriasPeca'

// =============================================================================
// computeRange — traduz (periodo, mesEsp, dataIni, dataFim) → { iniIso, fimIso, label }
// =============================================================================
const MESES_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function pad(n) { return n < 10 ? `0${n}` : String(n) }

function isoStartOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString() }
function isoEndOfDay(d)   { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString() }

export function computeRange(periodo, mesEsp, dataIni, dataFim) {
  // 1) Mês específico (YYYY-MM) tem prioridade
  if (mesEsp) {
    const [y, m] = mesEsp.split('-').map(Number)
    const ini = new Date(y, m - 1, 1)
    const fim = new Date(y, m, 0)
    return {
      iniIso: isoStartOfDay(ini),
      fimIso: isoEndOfDay(fim),
      label: `${MESES_PT[m - 1]}/${y}`,
    }
  }

  // 2) Intervalo livre — aceita só ini, só fim, ou ambos
  if (dataIni || dataFim) {
    const ini = dataIni ? new Date(`${dataIni}T00:00:00`) : new Date(2000, 0, 1)
    const fim = dataFim ? new Date(`${dataFim}T00:00:00`) : new Date()
    return {
      iniIso: isoStartOfDay(ini),
      fimIso: isoEndOfDay(fim),
      label: dataIni && dataFim ? `${dataIni} → ${dataFim}` : (dataIni ? `≥ ${dataIni}` : `≤ ${dataFim}`),
    }
  }

  // 3) Presets — janelas rolantes
  const hoje = new Date()
  let ini
  switch (periodo) {
    case 'trimestre': ini = new Date(hoje); ini.setMonth(ini.getMonth() - 3); break
    case 'semestre':  ini = new Date(hoje); ini.setMonth(ini.getMonth() - 6); break
    case 'ano':       ini = new Date(hoje); ini.setFullYear(ini.getFullYear() - 1); break
    case 'mes':
    default:          ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1); break
  }
  return {
    iniIso: isoStartOfDay(ini),
    fimIso: isoEndOfDay(hoje),
    label: periodo || 'mes',
  }
}

// =============================================================================
// Util: formata segundos em "Xd Yh"
// =============================================================================
function fmtDuracao(segs) {
  if (!segs || segs < 0) return '—'
  const dias = Math.floor(segs / 86400)
  const horas = Math.floor((segs % 86400) / 3600)
  if (dias === 0 && horas === 0) {
    const min = Math.floor(segs / 60)
    return `${min}min`
  }
  return `${dias}d ${horas}h`
}

// =============================================================================
// Util: Postgres `interval` → minutos. Suporta os 3 formatos que PostgREST
// pode devolver:
//   - string "HH:MM:SS"  ou  "N day(s) HH:MM:SS"  (com sinal opcional)
//   - objeto { days?, hours?, minutes?, seconds? } (formato JSON do iso8601)
//   - número (já em minutos — proteção)
// Retorna inteiro com sinal (pode ser negativo — saldo de banco de horas).
// =============================================================================
function intervalToMinutes(iv) {
  if (iv == null) return 0
  if (typeof iv === 'number') return Math.round(iv)
  if (typeof iv === 'object') {
    const days    = Number(iv.days    || 0)
    const hours   = Number(iv.hours   || 0)
    const minutes = Number(iv.minutes || 0)
    const seconds = Number(iv.seconds || 0)
    return Math.round(days * 1440 + hours * 60 + minutes + seconds / 60)
  }
  if (typeof iv === 'string') {
    let s = iv.trim()
    if (!s) return 0
    let sign = 1
    if (s.startsWith('-')) { sign = -1; s = s.slice(1) }
    let total = 0
    const dayMatch = s.match(/(\d+)\s+days?/i)
    if (dayMatch) total += Number(dayMatch[1]) * 1440
    const timeMatch = s.match(/(\d+):(\d+)(?::(\d+(?:\.\d+)?))?/)
    if (timeMatch) {
      total += Number(timeMatch[1]) * 60
      total += Number(timeMatch[2])
      if (timeMatch[3]) total += Number(timeMatch[3]) / 60
    }
    return Math.round(sign * total)
  }
  return 0
}

// =============================================================================
// Util: minutos → "Xh Ymin" (com sinal se negativo). Usado em saldo de banco.
// =============================================================================
function fmtHorasMin(min) {
  if (min == null || isNaN(min)) return '—'
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const sign = min < 0 ? '-' : ''
  if (h === 0) return `${sign}${m}min`
  if (m === 0) return `${sign}${h}h`
  return `${sign}${h}h ${m}min`
}

// Label amigável das etapas (DB → UI)
const LABEL_ETAPA = {
  aguardando_agendamento: 'Agenda',
  agendamento:            'Coleta',
  recebido:               'Avaliação',
  diagnostico:            'Diagnóstico',
  orcamento:              'Orçamento',
  em_oficina:             'Conserto',
  teste_final:            'Teste',
  entrega:                'Entrega',
  pagamento:              'A receber',
  concluido:              'Concluído',
  recusado:               'Recusado',
}

// =============================================================================
// useRelatorioGeral
// =============================================================================
export function useRelatorioGeral({ iniIso, fimIso }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function run() {
      setLoading(true); setError(null)
      try {
        // OS concluídas no período (faturamento e ticket)
        const { data: concl, error: errC } = await supabase
          .from('os')
          .select('id, tipo, valor_total, desconto, data_conclusao')
          .is('deleted_at', null)
          .eq('etapa', 'concluido')
          .not('data_conclusao', 'is', null)
          .gte('data_conclusao', iniIso)
          .lte('data_conclusao', fimIso)
        if (errC) throw errC

        // OS abertas no período (distribuição por tipo — total geral)
        const { data: abertas, error: errA } = await supabase
          .from('os')
          .select('id, tipo')
          .is('deleted_at', null)
          .gte('criado_em', iniIso)
          .lte('criado_em', fimIso)
        if (errA) throw errA

        // Últimos 12 meses (independente do período) — pra sparklines
        const hoje = new Date()
        const ini12m = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1)
        const { data: hist12m, error: err12 } = await supabase
          .from('os')
          .select('id, valor_total, data_conclusao, etapa')
          .is('deleted_at', null)
          .eq('etapa', 'concluido')
          .not('data_conclusao', 'is', null)
          .gte('data_conclusao', isoStartOfDay(ini12m))
        if (err12) throw err12

        if (cancelado) return

        const faturamento = (concl || []).reduce((s, o) => s + Number(o.valor_total || 0) - Number(o.desconto || 0), 0)
        const osConcluidas = (concl || []).length
        const ticketMedio = osConcluidas > 0 ? faturamento / osConcluidas : 0

        // Distribuição por tipo (das abertas no período, pra ter total dos 3)
        const porTipo = { atendimento: 0, fabricacao: 0, venda: 0 }
        for (const o of abertas || []) {
          if (porTipo[o.tipo] != null) porTipo[o.tipo] += 1
        }

        // Buckets dos últimos 12 meses (idx 0 = mês mais antigo)
        const sparkFat = new Array(12).fill(0)
        const sparkOS  = new Array(12).fill(0)
        const labelsMes = []
        for (let i = 0; i < 12; i++) {
          const d = new Date(ini12m.getFullYear(), ini12m.getMonth() + i, 1)
          labelsMes.push(`${MESES_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`)
        }
        for (const o of hist12m || []) {
          const d = new Date(o.data_conclusao)
          const idx = (d.getFullYear() - ini12m.getFullYear()) * 12 + (d.getMonth() - ini12m.getMonth())
          if (idx >= 0 && idx < 12) {
            sparkFat[idx] += Number(o.valor_total || 0)
            sparkOS[idx]  += 1
          }
        }

        setData({
          faturamento,
          osConcluidas,
          ticketMedio,
          totalAbertas: (abertas || []).length,
          porTipo: [
            { id: 'atendimento', label: 'Atendimento', valor: porTipo.atendimento },
            { id: 'fabricacao',  label: 'Fabricação',  valor: porTipo.fabricacao  },
            { id: 'venda',       label: 'Venda',       valor: porTipo.venda       },
          ],
          totalDistribuicao: porTipo.atendimento + porTipo.fabricacao + porTipo.venda,
          sparkFat,
          sparkOS,
          labelsMes,
        })
      } catch (e) {
        if (!cancelado) setError(e?.message || 'Erro ao carregar relatório')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    run()
    return () => { cancelado = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}

// =============================================================================
// useRelatorioOperacional
// =============================================================================
export function useRelatorioOperacional({ iniIso, fimIso }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function run() {
      setLoading(true); setError(null)
      try {
        // OS concluídas no período pra lead time, recusadas, retrabalho
        const { data: osPeriodo, error: errOS } = await supabase
          .from('os')
          .select('id, etapa, recusada, garantia, criado_em, data_conclusao')
          .is('deleted_at', null)
          .or(`and(etapa.eq.concluido,data_conclusao.gte.${iniIso},data_conclusao.lte.${fimIso}),and(criado_em.gte.${iniIso},criado_em.lte.${fimIso})`)
        if (errOS) throw errOS

        // Histórico — duracao por etapa. Filtra por data do registro.
        const { data: historico, error: errH } = await supabase
          .from('os_historico')
          .select('etapa_de, etapa_para, duracao_segundos, data')
          .gte('data', iniIso)
          .lte('data', fimIso)
        if (errH) throw errH

        if (cancelado) return

        const concluidasArr = (osPeriodo || []).filter(o => o.etapa === 'concluido' && o.data_conclusao && o.data_conclusao >= iniIso && o.data_conclusao <= fimIso)
        const osConcluidas = concluidasArr.length

        // Lead time: data_conclusao - criado_em (média em segundos)
        const leadSecs = concluidasArr
          .map(o => (new Date(o.data_conclusao) - new Date(o.criado_em)) / 1000)
          .filter(s => s > 0)
        const leadMedio = leadSecs.length ? leadSecs.reduce((a, b) => a + b, 0) / leadSecs.length : 0

        // Recusadas no período (criado_em no range + flag)
        const recusadasArr = (osPeriodo || []).filter(o =>
          (o.recusada === true || o.etapa === 'recusado') &&
          o.criado_em >= iniIso && o.criado_em <= fimIso
        )

        // Retrabalho: OS de garantia abertas no período
        const garantiaArr = (osPeriodo || []).filter(o =>
          o.garantia === true && o.criado_em >= iniIso && o.criado_em <= fimIso
        )
        const totalAbertas = (osPeriodo || []).filter(o => o.criado_em >= iniIso && o.criado_em <= fimIso).length
        const pctRetrabalho = totalAbertas > 0 ? Math.round((garantiaArr.length / totalAbertas) * 100) : 0

        // Tempo médio por etapa — agrega por etapa_de
        const acc = {}
        for (const h of historico || []) {
          if (!h.etapa_de || h.duracao_segundos == null) continue
          if (!acc[h.etapa_de]) acc[h.etapa_de] = { soma: 0, n: 0 }
          acc[h.etapa_de].soma += Number(h.duracao_segundos)
          acc[h.etapa_de].n += 1
        }
        const etapasMedia = Object.entries(acc)
          .map(([etapa, { soma, n }]) => ({
            etapa,
            label: LABEL_ETAPA[etapa] || etapa,
            mediaSegs: n > 0 ? soma / n : 0,
            n,
          }))
          .sort((a, b) => b.mediaSegs - a.mediaSegs)

        const maxMedia = etapasMedia[0]?.mediaSegs || 1
        const tempoMedioPorEtapa = etapasMedia.map(e => ({
          label: e.label,
          valor: fmtDuracao(e.mediaSegs),
          pct: Math.max(2, Math.round((e.mediaSegs / maxMedia) * 100)),
        }))

        // Gargalos — top 3 etapas. Badge muda pelo ranking.
        const gargalos = etapasMedia.slice(0, 3).map((e, idx) => ({
          titulo: e.label,
          detalhe: `Média de ${fmtDuracao(e.mediaSegs)} sobre ${e.n} movimentações`,
          badge: idx === 0 ? 'Crítico' : idx === 1 ? 'Atenção' : 'OK',
          badgeVar: idx === 0 ? 'vermelho' : idx === 1 ? 'amarelo' : 'azul',
        }))

        setData({
          leadTimeSegs: leadMedio,
          osConcluidas,
          osRecusadas: recusadasArr.length,
          osGarantia: garantiaArr.length,
          pctRetrabalho,
          totalAbertas,
          tempoMedioPorEtapa,
          gargalos,
        })
      } catch (e) {
        if (!cancelado) setError(e?.message || 'Erro ao carregar relatório')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    run()
    return () => { cancelado = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}

// =============================================================================
// useRelatorioEstoque — snapshot (independente do período pros KPIs) +
// consumo de peças via os_item no período.
//
// Métricas de gestão de estoque adicionadas (23/06/2026):
//   - Curva ABC (Pareto de valor): classifica SKUs ativos por % de contribuição
//     no capital parado (A = até 80% acumulado, B = até 95%, C = resto)
//   - Sugestão de reposição: SKUs em/abaixo do mínimo, com qtd sugerida e custo
//   - Estoque zerado (ruptura): qtd_atual=0 excluindo catálogo (qtd_minima=0)
//   - Giro de estoque: % do estoque atual que teve consumo no período
//     (proxy simples — não temos snapshot histórico de saldo pra giro clássico)
//   - Valor por categoria: capital parado agrupado por categoria
//   - Movimentações (peca_movimentacao): entradas x saídas no período — opcional,
//     tolera tabela ausente/RLS (42P01/PGRST205/42501) sem quebrar o relatório
// =============================================================================
export function useRelatorioEstoque({ iniIso, fimIso }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function run() {
      setLoading(true); setError(null)
      try {
        // Snapshot do estoque atual
        const { data: pecas, error: errP } = await supabase
          .from('peca')
          .select('id, nome, categoria, qtd_atual, qtd_minima, qtd_maxima, custo_atual, custo_medio, preco_venda')
          .is('deleted_at', null)
        if (errP) throw errP

        // Consumo no período — itens de OS vinculados a peças do estoque
        // (peca_id preenchido = peça do estoque; null = serviço/avulso)
        const { data: itens, error: errI } = await supabase
          .from('os_item')
          .select('nome, quantidade, valor_unitario, valor_total, peca_id, criado_em')
          .not('peca_id', 'is', null)
          .is('deleted_at', null)
          .gte('criado_em', iniIso)
          .lte('criado_em', fimIso)
        if (errI) throw errI

        // Movimentações reais (entradas/saídas) — opcional, tolera ausência da tabela
        let movs = []
        try {
          const { data: m, error: errM } = await supabase
            .from('peca_movimentacao')
            .select('tipo, delta, criado_em')
            .is('deleted_at', null)
            .gte('criado_em', iniIso)
            .lte('criado_em', fimIso)
          if (errM) throw errM
          movs = m || []
        } catch (e) {
          const code = e?.code || ''
          if (!['42P01', 'PGRST205', '42501'].includes(code)) throw e
          movs = null // sinaliza "indisponível" pra UI esconder a seção
        }

        if (cancelado) return

        const ativas = (pecas || []).filter(p => Number(p.qtd_atual || 0) > 0)
        const totalItens = ativas.reduce((s, p) => s + Number(p.qtd_atual || 0), 0)
        const custoDe = p => Number(p.custo_atual || p.custo_medio || 0)
        const valorParado = ativas.reduce((s, p) => s + (Number(p.qtd_atual || 0) * custoDe(p)), 0)
        const estoqueBaixo = (pecas || []).filter(p =>
          Number(p.qtd_minima || 0) > 0 &&
          Number(p.qtd_atual || 0) <= Number(p.qtd_minima || 0)
        ).length
        const estoqueZerado = (pecas || []).filter(p =>
          Number(p.qtd_minima || 0) > 0 && Number(p.qtd_atual || 0) === 0
        ).length

        // Consumo por nome de peça — top 5 (+ mapa de qtd total pro giro/ABC)
        const consumoPorNome = {}
        for (const it of itens || []) {
          const k = (it.nome || '').trim().toLowerCase()
          if (!k) continue
          if (!consumoPorNome[k]) consumoPorNome[k] = { nome: it.nome, qtd: 0 }
          consumoPorNome[k].qtd += Number(it.quantidade || 1)
        }
        const ranking = Object.values(consumoPorNome).sort((a, b) => b.qtd - a.qtd).slice(0, 5)
        const maxQtd = ranking[0]?.qtd || 1
        const pecasMaisUsadas = ranking.map(r => ({
          label: r.nome,
          valor: `${r.qtd} un`,
          pct: Math.max(5, Math.round((r.qtd / maxQtd) * 100)),
        }))

        // Giro de estoque: % do total de unidades em estoque que saiu no período
        const totalConsumidoUn = (itens || []).reduce((s, it) => s + Number(it.quantidade || 1), 0)
        const giroEstoquePct = totalItens > 0 ? Math.round((totalConsumidoUn / totalItens) * 100) : 0

        // Peças paradas: qtd_atual > 0 e nenhum consumo registrado no período
        const nomesUsados = new Set(
          (itens || []).map(it => (it.nome || '').trim().toLowerCase()).filter(Boolean)
        )
        const paradas = (pecas || [])
          .filter(p => Number(p.qtd_atual || 0) > 0 && !nomesUsados.has((p.nome || '').trim().toLowerCase()))
          .map(p => ({
            nome: p.nome,
            categoria: p.categoria,
            qtd: Number(p.qtd_atual || 0),
            custoTotal: Number(p.qtd_atual || 0) * custoDe(p),
          }))
          .sort((a, b) => b.custoTotal - a.custoTotal)
          .slice(0, 5)

        // Curva ABC — Pareto de valor sobre SKUs ativos
        const porValorDesc = ativas
          .map(p => ({ nome: p.nome, valor: Number(p.qtd_atual || 0) * custoDe(p) }))
          .sort((a, b) => b.valor - a.valor)
        const valorTotalAtivas = porValorDesc.reduce((s, p) => s + p.valor, 0) || 1
        let acumulado = 0
        const classes = { A: { skus: 0, valor: 0 }, B: { skus: 0, valor: 0 }, C: { skus: 0, valor: 0 } }
        for (const p of porValorDesc) {
          acumulado += p.valor
          const pctAcum = acumulado / valorTotalAtivas
          const classe = pctAcum <= 0.8 ? 'A' : pctAcum <= 0.95 ? 'B' : 'C'
          classes[classe].skus += 1
          classes[classe].valor += p.valor
        }
        const curvaABC = ['A', 'B', 'C'].map(c => ({
          classe: c,
          skus: classes[c].skus,
          valor: classes[c].valor,
          pctValor: Math.round((classes[c].valor / valorTotalAtivas) * 100),
        }))

        // Sugestão de reposição — SKUs em/abaixo do mínimo, priorizando ruptura
        const sugestaoReposicao = (pecas || [])
          .filter(p => Number(p.qtd_minima || 0) > 0 && Number(p.qtd_atual || 0) <= Number(p.qtd_minima || 0))
          .map(p => {
            const atual = Number(p.qtd_atual || 0)
            const minima = Number(p.qtd_minima || 0)
            const alvo = Number(p.qtd_maxima || 0) > minima ? Number(p.qtd_maxima) : minima * 3
            const sugestaoQtd = Math.max(alvo - atual, minima)
            return {
              nome: p.nome,
              categoria: p.categoria,
              atual, minima,
              sugestaoQtd,
              custoEstimado: sugestaoQtd * custoDe(p),
              zerado: atual === 0,
            }
          })
          .sort((a, b) => (a.zerado === b.zerado ? b.custoEstimado - a.custoEstimado : a.zerado ? -1 : 1))
          .slice(0, 8)

        // Valor por categoria — capital parado agrupado (top 6 + "Outras")
        const porCategoria = {}
        for (const p of ativas) {
          const cat = p.categoria || 'outros'
          porCategoria[cat] = (porCategoria[cat] || 0) + (Number(p.qtd_atual || 0) * custoDe(p))
        }
        const catOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])
        const catTop = catOrdenadas.slice(0, 6)
        const catResto = catOrdenadas.slice(6).reduce((s, [, v]) => s + v, 0)
        const valorPorCategoria = [
          ...catTop.map(([categoria, valor]) => ({ categoria, valor })),
          ...(catResto > 0 ? [{ categoria: 'Outras', valor: catResto }] : []),
        ]

        // Movimentações no período (opcional — null se tabela indisponível)
        let movimentacoes = null
        if (movs !== null) {
          const entradas = movs.filter(m => Number(m.delta) > 0)
          const saidas = movs.filter(m => Number(m.delta) < 0)
          movimentacoes = {
            totalEntradasUn: entradas.reduce((s, m) => s + Number(m.delta), 0),
            totalSaidasUn: Math.abs(saidas.reduce((s, m) => s + Number(m.delta), 0)),
            qtdMovimentacoes: movs.length,
            porTipo: Object.entries(
              movs.reduce((acc, m) => { acc[m.tipo] = (acc[m.tipo] || 0) + 1; return acc }, {})
            ).map(([tipo, n]) => ({ tipo, n })).sort((a, b) => b.n - a.n),
          }
        }

        setData({
          totalItens,
          valorParado,
          estoqueBaixo,
          estoqueZerado,
          giroEstoquePct,
          totalSkus: (pecas || []).length,
          pecasMaisUsadas,
          pecasParadas: paradas,
          temConsumo: (itens || []).length > 0,
          curvaABC,
          skusAtivos: ativas.length,
          sugestaoReposicao,
          valorPorCategoria,
          movimentacoes,
        })
      } catch (e) {
        if (!cancelado) setError(e?.message || 'Erro ao carregar relatório')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    run()
    return () => { cancelado = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}

// =============================================================================
// useRelatorioVendas — funil + ticket + serviços vendidos
// =============================================================================
export function useRelatorioVendas({ iniIso, fimIso }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function run() {
      setLoading(true); setError(null)
      try {
        // OS abertas no período (todas)
        const { data: osAbertas, error: errA } = await supabase
          .from('os')
          .select('id, tipo, etapa, valor_total, desconto, recusada, criado_em, data_conclusao')
          .is('deleted_at', null)
          .gte('criado_em', iniIso)
          .lte('criado_em', fimIso)
        if (errA) throw errA

        // Itens vendidos no período (serviços e peças)
        // tipo é derivado: peca_id preenchido → 'peca'; null → 'servico'
        const { data: itens, error: errI } = await supabase
          .from('os_item')
          .select('peca_id, nome, quantidade, valor_total, criado_em')
          .is('deleted_at', null)
          .gte('criado_em', iniIso)
          .lte('criado_em', fimIso)
        if (errI) throw errI

        // Histórico do período — pra montar funil (etapas alcançadas)
        const osIds = (osAbertas || []).map(o => o.id)
        let historico = []
        if (osIds.length > 0) {
          const { data: h, error: errH } = await supabase
            .from('os_historico')
            .select('os_id, etapa_para')
            .in('os_id', osIds)
          if (errH) throw errH
          historico = h || []
        }

        if (cancelado) return

        const totalAbertas = (osAbertas || []).length

        // Conversão orçamento = (passaram da fase orçamento) / (chegaram em orçamento)
        const chegaramOrcamento = new Set()
        const passaramOrcamento = new Set()
        const etapasAlcancadas = {} // por etapa → Set de os_id
        for (const h of historico) {
          if (!h.etapa_para) continue
          if (!etapasAlcancadas[h.etapa_para]) etapasAlcancadas[h.etapa_para] = new Set()
          etapasAlcancadas[h.etapa_para].add(h.os_id)
          if (h.etapa_para === 'orcamento') chegaramOrcamento.add(h.os_id)
          // Etapas pós-orçamento na linha do atendimento
          if (['em_oficina', 'teste_final', 'entrega', 'pagamento', 'concluido'].includes(h.etapa_para)) {
            passaramOrcamento.add(h.os_id)
          }
        }
        // Inclui OS que estão atualmente na etapa (não tinha entrada de histórico ainda)
        for (const o of osAbertas || []) {
          if (o.etapa === 'orcamento') chegaramOrcamento.add(o.id)
          if (['em_oficina', 'teste_final', 'entrega', 'pagamento', 'concluido'].includes(o.etapa)) {
            chegaramOrcamento.add(o.id)
            passaramOrcamento.add(o.id)
          }
        }
        const conversaoOrcamento = chegaramOrcamento.size > 0
          ? Math.round((passaramOrcamento.size / chegaramOrcamento.size) * 100)
          : 0

        // Ticket médio das concluídas
        const concluidas = (osAbertas || []).filter(o => o.etapa === 'concluido')
        const faturamento = concluidas.reduce((s, o) => s + Number(o.valor_total || 0) - Number(o.desconto || 0), 0)
        const ticketMedio = concluidas.length ? faturamento / concluidas.length : 0

        // Máquinas vendidas — tipo='venda' com etapa='concluido'
        const vendas = (osAbertas || []).filter(o => o.tipo === 'venda' && o.etapa === 'concluido')
        const maquinasVendidas = vendas.length
        const receitaMaquinas = vendas.reduce((s, o) => s + Number(o.valor_total || 0) - Number(o.desconto || 0), 0)

        // Funil de OS (atendimento)
        // Aceita array de etapas — 'recebido' (aposentada 06/07/2026) e
        // 'diagnostico' contam juntas como "Diagnosticadas".
        function countEtapa(etapas) {
          const listaEtapas = Array.isArray(etapas) ? etapas : [etapas]
          // Quantos chegaram nessa etapa (passaram em algum momento)
          const ids = new Set()
          for (const e of listaEtapas) {
            for (const id of (etapasAlcancadas[e] || [])) ids.add(id)
          }
          // Soma os que estão atualmente na etapa mas sem registro de histórico
          for (const o of osAbertas || []) {
            if (listaEtapas.includes(o.etapa)) ids.add(o.id)
          }
          return ids.size
        }
        const f0 = totalAbertas
        const funil = [
          { etapa: 'criadas',     label: 'Criadas',          n: f0 },
          { etapa: 'diagnostico', label: 'Diagnosticadas',   n: countEtapa(['recebido', 'diagnostico']) },
          { etapa: 'orcamento',   label: 'Orçadas',          n: countEtapa('orcamento') },
          { etapa: 'em_oficina',  label: 'Aprovadas (ofic.)', n: countEtapa('em_oficina') },
          { etapa: 'entrega',     label: 'Entregues',        n: countEtapa('entrega') },
          { etapa: 'concluido',   label: 'Concluídas',       n: countEtapa('concluido') },
        ]
        const funilBase = f0 || 1
        const funilUI = funil.map(s => ({
          label: s.label,
          valor: `${s.n} OS`,
          pct: Math.max(2, Math.round((s.n / funilBase) * 100)),
        }))

        // Serviços / peças mais vendidos no período
        const porNome = {}
        for (const it of itens || []) {
          const tipo = it.peca_id ? 'peca' : 'servico'
          const k = `${tipo}:${(it.nome || '').trim().toLowerCase()}`
          if (!k.endsWith(':')) {
            if (!porNome[k]) porNome[k] = { nome: it.nome, tipo, qtd: 0, receita: 0 }
            porNome[k].qtd += Number(it.quantidade || 1)
            porNome[k].receita += Number(it.valor_total || 0)
          }
        }
        const rankItens = Object.values(porNome).sort((a, b) => b.qtd - a.qtd).slice(0, 6)
        const totalQtd = rankItens.reduce((s, r) => s + r.qtd, 0) || 1
        const servicosMaisVendidos = rankItens.map(r => ({
          label: `${r.nome} (${r.tipo})`,
          valor: r.qtd,
          tipo: r.tipo,
          pct: Math.round((r.qtd / totalQtd) * 100),
        }))

        setData({
          totalAbertas,
          conversaoOrcamento,
          ticketMedio,
          maquinasVendidas,
          receitaMaquinas,
          faturamento,
          osConcluidas: concluidas.length,
          funil: funilUI,
          servicosMaisVendidos,
          totalItensVendidos: (itens || []).length,
        })
      } catch (e) {
        if (!cancelado) setError(e?.message || 'Erro ao carregar relatório')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    run()
    return () => { cancelado = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}

// =============================================================================
// useRelatorioDRE — agrega `lancamento_financeiro` no período (por categoria)
// Considera o regime de caixa: filtra `pago_em` no range (não `vencimento`),
// porque o DRE da Idemaq é caixa, não competência. Ignora lançamentos abertos
// (pago_em IS NULL) — eles aparecem nos relatórios "A Receber/A Pagar" do
// Financeiro, não no DRE.
// =============================================================================
export function useRelatorioDRE({ iniIso, fimIso }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function run() {
      setLoading(true); setError(null)
      try {
        const iniDate = iniIso.slice(0, 10)
        const fimDate = fimIso.slice(0, 10)

        const { data: lancs, error: errL } = await supabase
          .from('lancamento_financeiro')
          .select('tipo, valor, categoria, pago_em, taxa_pct')
          .is('deleted_at', null)
          .not('pago_em', 'is', null)
          .gte('pago_em', iniDate)
          .lte('pago_em', fimDate)
        if (errL) throw errL

        if (cancelado) return

        let receitas = 0
        let despesas = 0
        const receitasPorCat = {}
        const despesasPorCat = {}

        for (const l of lancs || []) {
          const valor = Number(l.valor || 0)
          const cat = (l.categoria || '').trim() || 'Sem categoria'
          if (l.tipo === 'receita') {
            receitas += valor
            receitasPorCat[cat] = (receitasPorCat[cat] || 0) + valor
          } else if (l.tipo === 'despesa') {
            despesas += valor
            despesasPorCat[cat] = (despesasPorCat[cat] || 0) + valor
          }
        }

        const lucro = receitas - despesas
        const margem = receitas > 0 ? Math.round((lucro / receitas) * 100) : 0

        const sortDesc = (a, b) => b.valor - a.valor
        const receitasDetalhe = Object.entries(receitasPorCat)
          .map(([categoria, valor]) => ({ categoria, valor }))
          .sort(sortDesc)
        const despesasDetalhe = Object.entries(despesasPorCat)
          .map(([categoria, valor]) => ({ categoria, valor }))
          .sort(sortDesc)

        setData({
          receitas,
          despesas,
          lucro,
          margem,
          receitasDetalhe,
          despesasDetalhe,
          totalLancamentos: (lancs || []).length,
        })
      } catch (e) {
        if (!cancelado) setError(e?.message || 'Erro ao carregar DRE')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    run()
    return () => { cancelado = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}

// =============================================================================
// useRelatorioFinanceiroMensal — Relatório financeiro completo do mês.
// Mais rico que o DRE: cobre receitas+despesas por categoria/conta/forma de
// pagamento, top 10 maiores despesas individuais, a receber e a pagar em aberto,
// fluxo diário, taxas pagas (maquininhas) e comparativo com mês anterior.
// Tudo em regime de caixa (pago_em dentro do range), exceto os "abertos" que
// usam pago_em IS NULL com vencimento dentro do range.
// =============================================================================
export function useRelatorioFinanceiroMensal({ iniIso, fimIso }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function run() {
      setLoading(true); setError(null)
      try {
        const iniDate = iniIso.slice(0, 10)
        const fimDate = fimIso.slice(0, 10)

        // Período anterior do mesmo tamanho (em dias) pra comparativo
        const dIni = new Date(iniDate + 'T00:00:00')
        const dFim = new Date(fimDate + 'T00:00:00')
        const dias = Math.max(1, Math.round((dFim - dIni) / 86400000) + 1)
        const dAntFim = new Date(dIni.getTime() - 86400000)
        const dAntIni = new Date(dAntFim.getTime() - (dias - 1) * 86400000)
        const antIni = dAntIni.toISOString().slice(0,10)
        const antFim = dAntFim.toISOString().slice(0,10)

        // 1) Lançamentos pagos no período + contas
        const { data: lancs, error: errL } = await supabase
          .from('lancamento_financeiro')
          .select('id, tipo, valor, categoria, descricao, conta_id, pago_em, vencimento, taxa_pct, forma_pagamento, os_id')
          .is('deleted_at', null)
          .or(`and(pago_em.gte.${iniDate},pago_em.lte.${fimDate}),and(pago_em.is.null,vencimento.gte.${iniDate},vencimento.lte.${fimDate})`)
        if (errL) throw errL

        // 2) Lançamentos pagos no período anterior (só totais)
        const { data: lancsAnt } = await supabase
          .from('lancamento_financeiro')
          .select('tipo, valor')
          .is('deleted_at', null)
          .not('pago_em', 'is', null)
          .gte('pago_em', antIni)
          .lte('pago_em', antFim)

        // 3) Contas bancárias
        const { data: contas } = await supabase
          .from('conta_bancaria')
          .select('id, nome, tipo')
          .is('deleted_at', null)

        if (cancelado) return

        const nomeConta = Object.fromEntries((contas || []).map(c => [c.id, c.nome]))

        // Estado agregado
        let recPagas = 0, despPagas = 0
        let aReceber = 0, aPagar = 0
        let totalTaxasMaq = 0
        const recPorCat = {}, despPorCat = {}
        const recPorForma = {}, despPorForma = {}
        const recPorConta = {}, despPorConta = {}
        const fluxoPorDia = {}
        const maioresDesp = []
        const aReceberLista = []
        const aPagarLista = []

        for (const l of lancs || []) {
          const v = Number(l.valor || 0)
          const cat = (l.categoria || '').trim() || 'Sem categoria'
          const forma = (l.forma_pagamento || '').trim() || 'Sem forma'
          const conta = nomeConta[l.conta_id] || 'Sem conta'
          const pago = !!l.pago_em

          if (pago) {
            const dia = String(l.pago_em).slice(0,10)
            fluxoPorDia[dia] = fluxoPorDia[dia] || { dia, entrada: 0, saida: 0 }

            if (l.tipo === 'receita') {
              recPagas += v
              recPorCat[cat] = (recPorCat[cat] || 0) + v
              recPorForma[forma] = (recPorForma[forma] || 0) + v
              recPorConta[conta] = (recPorConta[conta] || 0) + v
              fluxoPorDia[dia].entrada += v
            } else if (l.tipo === 'despesa') {
              despPagas += v
              despPorCat[cat] = (despPorCat[cat] || 0) + v
              despPorForma[forma] = (despPorForma[forma] || 0) + v
              despPorConta[conta] = (despPorConta[conta] || 0) + v
              fluxoPorDia[dia].saida += v
              maioresDesp.push({
                id: l.id, valor: v, categoria: cat, descricao: l.descricao || '', conta,
                pago_em: l.pago_em,
              })
              if (cat.toLowerCase().includes('taxa')) totalTaxasMaq += v
            }
          } else {
            // Aberto (pago_em null + vencimento dentro do range)
            if (l.tipo === 'receita') {
              aReceber += v
              aReceberLista.push({ id: l.id, valor: v, categoria: cat, descricao: l.descricao || '', vencimento: l.vencimento })
            } else if (l.tipo === 'despesa') {
              aPagar += v
              aPagarLista.push({ id: l.id, valor: v, categoria: cat, descricao: l.descricao || '', vencimento: l.vencimento })
            }
          }
        }

        // Comparativo (período anterior pago)
        let recAnt = 0, despAnt = 0
        for (const l of lancsAnt || []) {
          const v = Number(l.valor || 0)
          if (l.tipo === 'receita') recAnt += v
          else if (l.tipo === 'despesa') despAnt += v
        }
        const lucroAnt = recAnt - despAnt
        const pctDelta = (atual, ant) => (ant > 0 ? Math.round(((atual - ant) / ant) * 100) : (atual > 0 ? 100 : 0))

        const lucro = recPagas - despPagas
        const margem = recPagas > 0 ? Math.round((lucro / recPagas) * 100) : 0
        const receitaLiquida = recPagas - totalTaxasMaq

        const sortValor = (a, b) => b.valor - a.valor
        const mapObj = (obj) => Object.entries(obj)
          .map(([k, v]) => ({ label: k, valor: v }))
          .sort(sortValor)

        const fluxoDias = Object.values(fluxoPorDia)
          .sort((a, b) => a.dia.localeCompare(b.dia))
          .map(f => ({ ...f, saldo: f.entrada - f.saida }))

        maioresDesp.sort(sortValor)
        aReceberLista.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))
        aPagarLista.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))

        setData({
          // KPIs principais
          receitas: recPagas,
          receitaLiquida,
          despesas: despPagas,
          lucro,
          margem,
          aReceber,
          aPagar,
          totalTaxasMaq,

          // Comparativo mês anterior
          delta: {
            receitas: pctDelta(recPagas, recAnt),
            despesas: pctDelta(despPagas, despAnt),
            lucro: pctDelta(lucro, lucroAnt),
          },

          // Detalhes
          receitasPorCategoria: mapObj(recPorCat),
          despesasPorCategoria: mapObj(despPorCat),
          receitasPorForma: mapObj(recPorForma),
          despesasPorForma: mapObj(despPorForma),
          receitasPorConta: mapObj(recPorConta),
          despesasPorConta: mapObj(despPorConta),
          maioresDespesas: maioresDesp.slice(0, 10),
          aReceberLista: aReceberLista.slice(0, 15),
          aPagarLista: aPagarLista.slice(0, 15),
          fluxoDias,

          totalLancamentos: (lancs || []).length,
          periodo: { iniDate, fimDate, antIni, antFim },
        })
      } catch (e) {
        if (!cancelado) setError(e?.message || 'Erro ao carregar relatório financeiro')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    run()
    return () => { cancelado = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}

// =============================================================================
// useRelatorioFuncionarios — agrega `os_historico` + `usuarios` no período.
// Por funcionário:
//   - etapasFeitas: linhas do histórico com funcionario_id no período
//   - tempoMedio: média de duracao_segundos das etapas
//   - osTotal: distintos os_id que ele tocou (participação)
//   - osFinalizadas: das OS que ele tocou, quantas concluíram no período
//   - faturamento + ticketMedio: das OS finalizadas (valor_total - desconto)
// =============================================================================
export function useRelatorioFuncionarios({ iniIso, fimIso }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function run() {
      setLoading(true); setError(null)
      try {
        // 1) Histórico no período com join de usuarios
        const { data: hist, error: errH } = await supabase
          .from('os_historico')
          .select(`
            os_id, etapa_de, etapa_para, duracao_segundos, data, funcionario_id,
            usuarios:funcionario_id ( id, apelido, papel )
          `)
          .gte('data', iniIso)
          .lte('data', fimIso)
          .not('funcionario_id', 'is', null)
        if (errH) throw errH

        // 2) Pra ticket médio — OS concluídas no período (valor_total - desconto)
        const { data: osConcl, error: errO } = await supabase
          .from('os')
          .select('id, valor_total, desconto, data_conclusao')
          .is('deleted_at', null)
          .eq('etapa', 'concluido')
          .not('data_conclusao', 'is', null)
          .gte('data_conclusao', iniIso)
          .lte('data_conclusao', fimIso)
        if (errO) throw errO

        if (cancelado) return

        const osValorPorId = {}
        for (const o of osConcl || []) {
          osValorPorId[o.id] = Number(o.valor_total || 0) - Number(o.desconto || 0)
        }

        // Agrega por funcionario_id
        const porFunc = {}
        for (const h of hist || []) {
          const fid = h.funcionario_id
          if (!fid) continue
          if (!porFunc[fid]) {
            porFunc[fid] = {
              id: fid,
              nome: h.usuarios?.apelido || 'desconhecido',
              papel: h.usuarios?.papel || null,
              etapasFeitas: 0,
              somaDuracao: 0,
              durCount: 0,
              osSet: new Set(),
              porEtapa: {},     // { etapa_de: { soma, n } } — duração média (gargalo)
              contagemEtapa: {}, // { etapa_de: n } — distribuição de trabalho (todas as movimentações)
            }
          }
          const f = porFunc[fid]
          f.etapasFeitas += 1
          if (h.duracao_segundos != null && h.duracao_segundos > 0) {
            f.somaDuracao += Number(h.duracao_segundos)
            f.durCount += 1
          }
          if (h.os_id) f.osSet.add(h.os_id)
          if (h.etapa_de) {
            if (!f.porEtapa[h.etapa_de]) f.porEtapa[h.etapa_de] = { soma: 0, n: 0 }
            if (h.duracao_segundos != null && h.duracao_segundos > 0) {
              f.porEtapa[h.etapa_de].soma += Number(h.duracao_segundos)
              f.porEtapa[h.etapa_de].n += 1
            }
            f.contagemEtapa[h.etapa_de] = (f.contagemEtapa[h.etapa_de] || 0) + 1
          }
        }

        // Constrói shape final
        const equipe = Object.values(porFunc).map(f => {
          const osIds = Array.from(f.osSet)
          const osFinalizadasIds = osIds.filter(id => osValorPorId[id] != null)
          const faturamento = osFinalizadasIds.reduce((s, id) => s + osValorPorId[id], 0)
          const ticketMedio = osFinalizadasIds.length > 0 ? faturamento / osFinalizadasIds.length : 0
          const tempoMedioSegs = f.durCount > 0 ? f.somaDuracao / f.durCount : 0

          // Top etapa onde ele mais gasta tempo (gargalo individual)
          const etapaMaisDemorada = Object.entries(f.porEtapa)
            .filter(([, v]) => v.n > 0)
            .map(([etapa, v]) => ({ etapa, label: LABEL_ETAPA[etapa] || etapa, media: v.soma / v.n }))
            .sort((a, b) => b.media - a.media)[0] || null

          // Distribuição de trabalho — em que etapas essa pessoa mais atua (contagem, não duração)
          const totalContagem = Object.values(f.contagemEtapa).reduce((s, n) => s + n, 0) || 1
          const distribuicaoEtapas = Object.entries(f.contagemEtapa)
            .map(([etapa, n]) => ({
              etapa, label: LABEL_ETAPA[etapa] || etapa, n,
              pct: Math.round((n / totalContagem) * 100),
            }))
            .sort((a, b) => b.n - a.n)
            .slice(0, 4)

          return {
            id: f.id,
            nome: f.nome,
            papel: f.papel,
            osTotal: osIds.length,
            osFinalizadas: osFinalizadasIds.length,
            etapasFeitas: f.etapasFeitas,
            tempoMedioSegs,
            tempoMedio: fmtDuracao(tempoMedioSegs),
            faturamento,
            ticketMedio,
            etapaMaisDemorada: etapaMaisDemorada ? {
              label: etapaMaisDemorada.label,
              tempo: fmtDuracao(etapaMaisDemorada.media),
            } : null,
            distribuicaoEtapas,
          }
        }).sort((a, b) => b.etapasFeitas - a.etapasFeitas)

        const totalEtapas = equipe.reduce((s, f) => s + f.etapasFeitas, 0)
        const totalOSDistintas = new Set()
        for (const h of hist || []) if (h.os_id) totalOSDistintas.add(h.os_id)

        setData({
          equipe,
          totalEtapas,
          totalOSAtendidas: totalOSDistintas.size,
          totalFuncionarios: equipe.length,
        })
      } catch (e) {
        if (!cancelado) setError(e?.message || 'Erro ao carregar relatório de funcionários')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    run()
    return () => { cancelado = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}

// =============================================================================
// useRelatorioPonto — agrega `ponto_registro` no período (client-side).
// Lê batidas brutas com join em `usuarios` e calcula horas/faltas no front,
// igual ao EspelhoPonto. Não depende de `jornada_funcionario` (ainda vazia).
//
// Jornada padrão: 8h dias úteis (seg-sex), 4h sábado. Domingo = folga.
// Falta: dia útil sem nenhuma batida até o dia de hoje.
// =============================================================================
const JORNADA_DIA_MIN = 8 * 60
const JORNADA_SAB_MIN = 4 * 60

function minutosTrabBatidas(batidas) {
  const lista = [...batidas].sort((a, b) => new Date(a.bateu_em) - new Date(b.bateu_em))
  let total = 0
  let entrada = null
  for (const b of lista) {
    const t = new Date(b.bateu_em)
    if (b.tipo === 'entrada' || b.tipo === 'volta_almoco') {
      entrada = t
    } else if ((b.tipo === 'saida_almoco' || b.tipo === 'saida') && entrada) {
      total += Math.round((t - entrada) / 60000)
      entrada = null
    }
  }
  // se ainda trabalhando (sem saída), não conta — só dias encerrados
  return total
}

function diasUteisNoPeriodo(iniIso, fimIso) {
  // Retorna lista de { iso, diaSemana } de dias úteis (seg-sáb) no período
  const dias = []
  const ini = new Date(iniIso.slice(0, 10) + 'T00:00:00')
  const fim = new Date(fimIso.slice(0, 10) + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const cur = new Date(ini)
  while (cur <= fim && cur <= hoje) {
    const dow = cur.getDay()
    if (dow !== 0) {  // 0 = domingo = folga
      const iso = cur.toISOString().slice(0, 10)
      dias.push({ iso, diaSemana: dow })
    }
    cur.setDate(cur.getDate() + 1)
  }
  return dias
}

export function useRelatorioPonto({ iniIso, fimIso, funcionarioId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    async function run() {
      setLoading(true); setError(null)
      try {
        let query = supabase
          .from('ponto_registro')
          .select('funcionario_id, tipo, bateu_em, funcionario:funcionario_id(id, apelido, papel)')
          .is('deleted_at', null)
          .gte('bateu_em', iniIso)
          .lte('bateu_em', fimIso)
          .order('bateu_em', { ascending: true })

        if (funcionarioId) query = query.eq('funcionario_id', funcionarioId)

        const { data: batidas, error: errB } = await query
        if (errB) throw errB
        if (cancelado) return

        // Agrupa batidas por funcionário → por dia ISO
        const porFunc = {}
        for (const b of batidas || []) {
          const fid = b.funcionario_id
          if (!fid) continue
          if (!porFunc[fid]) {
            porFunc[fid] = {
              id: fid,
              nome: b.funcionario?.apelido || 'desconhecido',
              papel: b.funcionario?.papel || null,
              porDia: {},
            }
          }
          const diaIso = new Date(b.bateu_em).toISOString().slice(0, 10)
          if (!porFunc[fid].porDia[diaIso]) porFunc[fid].porDia[diaIso] = []
          porFunc[fid].porDia[diaIso].push(b)
        }

        const diasUteis = diasUteisNoPeriodo(iniIso, fimIso)
        const hojeIso = new Date().toISOString().slice(0, 10)

        const lista = Object.values(porFunc).map(f => {
          let totalHorasMin = 0
          let totalJornadaMin = 0
          let faltas = 0
          let diasAtraso = 0
          let diasExtras = 0
          const diasDetalhados = []
          const horaEntradaSab = f.papel === 'logistica' ? 8 : 7

          for (const { iso, diaSemana } of diasUteis) {
            const batidasDia = f.porDia[iso] || []
            const teveBatida = batidasDia.length > 0
            const carga = diaSemana === 6 ? JORNADA_SAB_MIN : JORNADA_DIA_MIN
            totalJornadaMin += carga

            let minDia = 0
            let statusDia = 'falta'
            let entradaTs = null
            let saidaTs = null

            if (teveBatida) {
              minDia = minutosTrabBatidas(batidasDia)
              totalHorasMin += minDia

              const sorted = [...batidasDia].sort((a, b) => new Date(a.bateu_em) - new Date(b.bateu_em))
              entradaTs = sorted.find(b => b.tipo === 'entrada')?.bateu_em || null
              saidaTs = [...sorted].reverse().find(b => b.tipo === 'saida')?.bateu_em || null

              if (entradaTs) {
                const entradaDate = new Date(entradaTs)
                const padrao = new Date(entradaDate)
                padrao.setHours(diaSemana === 6 ? horaEntradaSab : 8, 5, 0, 0)
                if (entradaDate > padrao) { statusDia = 'atraso'; diasAtraso++ }
                else if (minDia > carga)  { statusDia = 'extra';  diasExtras++ }
                else                       { statusDia = 'ok' }
              } else { statusDia = 'ok' }
            } else {
              faltas++
              statusDia = 'falta'
            }

            diasDetalhados.push({ iso, diaSemana, status: statusDia, totalMin: minDia, entrada: entradaTs, saida: saidaTs })
          }

          // Status em tempo real hoje
          const batidasHoje = f.porDia[hojeIso] || []
          let statusHoje = 'ausente'
          if (batidasHoje.length > 0) {
            const ultima = [...batidasHoje].sort((a, b) => new Date(b.bateu_em) - new Date(a.bateu_em))[0]
            statusHoje = ultima.tipo === 'saida' ? 'encerrado'
              : ultima.tipo === 'saida_almoco' ? 'almoco'
              : 'trabalhando'
          }

          const diasPresentes = diasUteis.length - faltas
          const taxaPresenca  = diasUteis.length > 0 ? Math.round((diasPresentes / diasUteis.length) * 100) : 0
          const mediaHorasDia = diasPresentes > 0 ? fmtHorasMin(Math.round(totalHorasMin / diasPresentes)) : '—'
          const saldoHorasMin = totalHorasMin - totalJornadaMin

          return {
            id: f.id, nome: f.nome, papel: f.papel,
            totalHorasMin, totalHoras: fmtHorasMin(totalHorasMin),
            faltas, faltasJustificadas: 0,
            saldoHorasMin, saldoHoras: fmtHorasMin(saldoHorasMin),
            diasComputados: diasUteis.length,
            taxaPresenca, mediaHorasDia,
            diasAtraso, diasExtras,
            statusHoje, diasDetalhados,
          }
        })

        lista.sort((a, b) => b.totalHorasMin - a.totalHorasMin)

        const totalHorasMin      = lista.reduce((s, f) => s + f.totalHorasMin, 0)
        const totalFaltas        = lista.reduce((s, f) => s + f.faltas, 0)
        const totalAtrasos       = lista.reduce((s, f) => s + f.diasAtraso, 0)
        const totalHorasExtrasMin = lista.reduce((s, f) => s + Math.max(0, f.saldoHorasMin), 0)
        const taxaPresencaGeral  = lista.length > 0
          ? Math.round(lista.reduce((s, f) => s + f.taxaPresenca, 0) / lista.length)
          : 0
        const topPerformer = lista[0] || null

        setData({
          porFuncionario: lista,
          totalHorasMin, totalHoras: fmtHorasMin(totalHorasMin),
          totalFaltas, totalAtrasos,
          totalHorasExtrasMin, totalHorasExtras: fmtHorasMin(totalHorasExtrasMin),
          totalDias: diasUteis.length,
          totalFuncionarios: lista.length,
          taxaPresencaGeral, topPerformer,
        })
      } catch (e) {
        if (!cancelado) setError(e?.message || 'Erro ao carregar relatório de ponto')
      } finally {
        if (!cancelado) setLoading(false)
      }
    }
    run()
    return () => { cancelado = true }
  }, [iniIso, fimIso, funcionarioId])

  return { data, loading, error }
}

// Re-export utils
export { CATEGORIA_POR_ID, fmtDuracao, fmtHorasMin, intervalToMinutes }
