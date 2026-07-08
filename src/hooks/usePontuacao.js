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

      const equipe = Object.values(porFunc).sort((a, b) => b.total - a.total)
      const totalPontos = filtradas.reduce((s, e) => s + e.pontos, 0)

      if (!cancel) { setData({ equipe, totalPontos }); setLoading(false) }
    })()
    return () => { cancel = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}
