// src/hooks/useRelatorioQualidade.js
// Qualidade por funcionário: OS que voltaram do Teste com falha (retrabalho)
// + OS que voltaram em garantia — ambas atribuídas a quem fez o conserto
// (autoria dos checks de oficina em pre_diagnostico.oficina.execucao).
//
// Retrabalho: falha_teste criada no período → acha a OS → extrai autores da
// oficina dessa OS (quem desmontou/limpou/consertou/montou). Conta 1x por OS
// (não por defeito individual — uma OS com 3 defeitos simultâneos = 1 "falha").
//
// Garantia: OS nova com garantia=true criada no período → segue os_origem_id
// até a OS original → extrai autores da oficina de LÁ (quem fez o serviço
// que voltou).

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function autoresOficina(pd) {
  const exec = pd?.oficina?.execucao || {}
  const porId = new Map() // uid (ou apelido, se uid ausente) -> apelido
  function add(carimbo) {
    if (carimbo && typeof carimbo === 'object' && carimbo.apelido) {
      porId.set(carimbo.uid || carimbo.apelido, carimbo.apelido)
    }
  }
  add(exec.desmontagem)
  add(exec.montagem)
  add(exec.limpeza_serv)
  for (const v of Object.values(exec.manut_serv || {})) add(v)
  return Array.from(porId.entries()).map(([id, apelido]) => ({ id, apelido }))
}

export function useRelatorioQualidade({ iniIso, fimIso }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true); setError(null)
      try {
        const { data: falhas, error: errF } = await supabase
          .from('falha_teste')
          .select('id, os_id, criado_em')
          .is('deleted_at', null)
          .gte('criado_em', iniIso)
          .lte('criado_em', fimIso)
        if (errF) throw errF

        const { data: garantias, error: errG } = await supabase
          .from('os')
          .select('id, os_origem_id, criado_em')
          .is('deleted_at', null)
          .eq('garantia', true)
          .not('os_origem_id', 'is', null)
          .gte('criado_em', iniIso)
          .lte('criado_em', fimIso)
        if (errG) throw errG

        const osIdsFalha = [...new Set((falhas || []).map(f => f.os_id))]
        const osIdsGarantiaOrigem = [...new Set((garantias || []).map(g => g.os_origem_id))]
        const todosIds = [...new Set([...osIdsFalha, ...osIdsGarantiaOrigem])]

        let osMap = {}
        if (todosIds.length > 0) {
          const { data: osRows, error: errO } = await supabase
            .from('os')
            .select('id, numero, pre_diagnostico')
            .in('id', todosIds)
          if (errO) throw errO
          osMap = Object.fromEntries((osRows || []).map(o => [o.id, o]))
        }

        if (cancel) return

        const porFunc = {}
        function bump(id, apelido, campo, osNumero) {
          if (!porFunc[id]) porFunc[id] = { id, apelido, falhas: 0, garantias: 0, osFalhas: [], osGarantias: [] }
          porFunc[id][campo] += 1
          if (campo === 'falhas') porFunc[id].osFalhas.push(osNumero)
          else porFunc[id].osGarantias.push(osNumero)
        }

        for (const osId of osIdsFalha) {
          const os = osMap[osId]
          if (!os) continue
          for (const a of autoresOficina(os.pre_diagnostico)) bump(a.id, a.apelido, 'falhas', os.numero)
        }
        for (const g of garantias || []) {
          const os = osMap[g.os_origem_id]
          if (!os) continue
          for (const a of autoresOficina(os.pre_diagnostico)) bump(a.id, a.apelido, 'garantias', os.numero)
        }

        setData({
          equipe: Object.values(porFunc),
          totalFalhas: osIdsFalha.length,
          totalGarantias: (garantias || []).length,
        })
        setLoading(false)
      } catch (e) {
        if (!cancel) { setError(e?.message || 'Erro ao carregar qualidade'); setLoading(false) }
      }
    })()
    return () => { cancel = true }
  }, [iniIso, fimIso])

  return { data, loading, error }
}
