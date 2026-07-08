// src/hooks/useAlertasPontuacao.js
// Rastro de reatribuição de checks — quando alguém mexe (marca ou desmarca)
// num item que já tinha o carimbo de OUTRA pessoa (ver
// src/hooks/useAutorCheck.js → detectarTrocaAutor). Gravado em
// os.pre_diagnostico.alertas_pontuacao[] nos 3 lugares com check:
// AcaoDiagnosticoHIG, AcaoTesteHIG, AcaoOficinaHIG.
//
// Não impede a reatribuição — só deixa rastro visível pro dono revisar
// (Relatórios → Funcionários → "Alertas de reatribuição").

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useAlertasPontuacao({ iniIso, fimIso } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true); setError(null)
      const { data: rows, error: err } = await supabase
        .from('os')
        .select('id, numero, pre_diagnostico')
        .is('deleted_at', null)

      if (cancel) return
      if (err) { setError(err.message); setLoading(false); return }

      const alertas = []
      for (const os of rows || []) {
        const lista = os.pre_diagnostico?.alertas_pontuacao || []
        for (const a of lista) {
          if (!a.em) continue
          if (iniIso && a.em < iniIso) continue
          if (fimIso && a.em > fimIso) continue
          alertas.push({ ...a, os_id: os.id, os_numero: os.numero })
        }
      }
      alertas.sort((x, y) => new Date(y.em) - new Date(x.em))

      if (!cancel) { setData({ alertas, total: alertas.length }); setLoading(false) }
    })()
    return () => { cancel = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}
