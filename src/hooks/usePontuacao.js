// src/hooks/usePontuacao.js
// Agrega os pontos por desempenho (src/utils/pontuacao.js) por funcionário,
// num período [iniIso, fimIso]. Lê pre_diagnostico de TODAS as OS não
// deletadas — a filtragem por período acontece no carimbo (`em`) de cada
// check, não em criado_em/atualizado_em da OS (uma OS aberta em maio pode
// ter um check pontuado em julho).
//
// OS de garantia (os.garantia = true) NÃO geram pontos — é retrabalho
// decorrente de um problema, não serviço novo. O desconto de quem fez o
// serviço original é rastreado à parte, em useRelatorioQualidade.js.
//
// Uso: const { data, loading, error } = usePontuacao({ iniIso, fimIso })
//   data.equipe: [{ funcionario_id, apelido, total, porServico, entries }]
//   data.totalPontos: soma geral do período

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { calcularPontosOS } from '../utils/pontuacao'

// ── Ajuste manual ÚNICO — gap de lançamento (08/07/2026) ──────────────────
// 14 OS tiveram trabalho real entre 01-05/07/2026, ANTES do sistema de
// autoria existir (foi ao ar em 06/07) — 233 pontos que teriam sido gerados
// (calculados sem autoria, mesma lógica do sql/127) nunca puderam ser
// atribuídos a ninguém porque não tem carimbo. Combinado com o Toni: soma
// um bônus fixo dividido igual entre os funcionários ativos (não-dono) SÓ
// quando o período consultado cobre essa janela. Se auto-expira sozinho —
// depois de agosto/2026 a condição de sobreposição nunca mais é verdadeira,
// não precisa lembrar de remover. Não mexe nada além do total do mês de
// julho/2026 pra quem já tinha pontos reais também.
const BONUS_GAP_JULHO = {
  janelaIni: '2026-07-01T00:00:00.000Z',
  janelaFim: '2026-07-06T00:00:00.000Z',
  pontosTotais: 233,
}

export function usePontuacao({ iniIso, fimIso } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true); setError(null)
      const { data: rows, error: err } = await supabase
        .from('os')
        .select('id, numero, tipo_equipamento, pre_diagnostico, garantia')
        .is('deleted_at', null)

      if (cancel) return
      if (err) { setError(err.message); setLoading(false); return }

      const todasEntries = []
      for (const os of rows || []) {
        if (os.garantia) continue // retrabalho de garantia não pontua
        const entries = calcularPontosOS({
          id: os.id,
          numero: os.numero,
          tipoEquipamento: os.tipo_equipamento,
          pre_diagnostico: os.pre_diagnostico,
        })
        todasEntries.push(...entries)
      }

      const filtradas = todasEntries.filter(e => {
        if (!e.em) return false
        if (iniIso && e.em < iniIso) return false
        if (fimIso && e.em > fimIso) return false
        return true
      })

      const porFunc = {}
      for (const e of filtradas) {
        const chave = e.funcionario_id || e.apelido
        if (!porFunc[chave]) {
          porFunc[chave] = {
            funcionario_id: e.funcionario_id,
            apelido: e.apelido,
            total: 0,
            porServico: {},
            entries: [],
          }
        }
        porFunc[chave].total += e.pontos
        porFunc[chave].porServico[e.servico] = (porFunc[chave].porServico[e.servico] || 0) + e.pontos
        porFunc[chave].entries.push(e)
      }

      // Bônus do gap de lançamento — só quando o período pedido cobre a
      // janela 01-05/07/2026 (ver BONUS_GAP_JULHO acima).
      const cobreJanelaGap = (!iniIso || iniIso < BONUS_GAP_JULHO.janelaFim)
        && (!fimIso || fimIso >= BONUS_GAP_JULHO.janelaIni)
      let bonusPorPessoa = 0
      if (cobreJanelaGap) {
        const { data: funcs } = await supabase
          .from('usuarios')
          .select('id, apelido')
          .eq('ativo', true)
          .neq('papel', 'dono')
        if (cancel) return
        const lista = funcs || []
        if (lista.length > 0) {
          bonusPorPessoa = Math.round((BONUS_GAP_JULHO.pontosTotais / lista.length) * 10) / 10
          for (const f of lista) {
            if (!porFunc[f.id]) {
              porFunc[f.id] = { funcionario_id: f.id, apelido: f.apelido, total: 0, porServico: {}, entries: [] }
            }
            porFunc[f.id].total += bonusPorPessoa
            porFunc[f.id].porServico['ajuste_gap'] = (porFunc[f.id].porServico['ajuste_gap'] || 0) + bonusPorPessoa
          }
        }
      }

      const equipe = Object.values(porFunc).sort((a, b) => b.total - a.total)
      const totalPontos = equipe.reduce((s, f) => s + f.total, 0)

      if (!cancel) { setData({ equipe, totalPontos }); setLoading(false) }
    })()
    return () => { cancel = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}
