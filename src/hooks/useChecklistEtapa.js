// src/hooks/useChecklistEtapa.js
// Lê + persiste o checklist de UMA etapa específica de UMA OS.
//
// IMPORTANTE: A tabela `checklist_etapa` (sql/05) nunca foi aplicada no
// banco de produção. Pra evitar perda de dados, este hook agora persiste
// no campo `os.pre_diagnostico` (jsonb) que JÁ EXISTE.
//
// Estrutura usada em pre_diagnostico:
//   {
//     ...outros campos (foto, causa_diagnostico, etc),
//     checklist: {
//       recebido:    { itens: [...], observacoes: "..." },
//       teste_final: { itens: [...], observacoes: "..." },
//       ...
//     }
//   }
//
// Quando a tabela for criada, basta reverter este arquivo. O contrato
// (osId, etapaDb) → { itens, observacoes, salvar } permanece igual.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isUUID = v => typeof v === 'string' && UUID_REGEX.test(v)

export function useChecklistEtapa(osId, etapaDb) {
  const [itens, setItens] = useState([])
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [preDiagnostico, setPreDiagnostico] = useState(null)

  const fetchChecklist = useCallback(async () => {
    if (!isUUID(osId) || !etapaDb) {
      setItens([]); setObservacoes(''); setLoading(false)
      return
    }
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('os')
      .select('pre_diagnostico')
      .eq('id', osId)
      .is('deleted_at', null)
      .maybeSingle()
    if (err) { setError(err); setLoading(false); return }
    const preDiag = data?.pre_diagnostico || {}
    setPreDiagnostico(preDiag)
    const slot = preDiag.checklist?.[etapaDb] || {}
    setItens(Array.isArray(slot.itens) ? slot.itens : [])
    setObservacoes(slot.observacoes || '')
    setLoading(false)
  }, [osId, etapaDb])

  useEffect(() => { fetchChecklist() }, [fetchChecklist])

  // Salva o checklist da etapa em pre_diagnostico.checklist.<etapa>.
  // Lê o pre_diagnostico atual (otimisticamente do estado, fallback no DB)
  // e merge com o novo valor, preservando outros campos.
  const salvar = useCallback(async (novosItens, novasObs) => {
    if (!isUUID(osId) || !etapaDb) return { data: null, error: new Error('osId/etapa inválido') }
    const novoSlot = {
      itens: novosItens ?? [],
      observacoes: novasObs ?? null,
    }
    // optimistic
    setItens(novoSlot.itens)
    if (novasObs !== undefined) setObservacoes(novasObs || '')

    // Re-busca o pre_diagnostico atual pra nao sobrescrever campos vizinhos
    // (foto_coleta_1, causa_diagnostico, etc) que outras telas escrevem.
    const { data: row, error: errGet } = await supabase
      .from('os')
      .select('pre_diagnostico')
      .eq('id', osId)
      .maybeSingle()
    if (errGet) { setError(errGet); return { data: null, error: errGet } }

    const preDiagAtual = row?.pre_diagnostico || {}
    const novoPreDiag = {
      ...preDiagAtual,
      checklist: {
        ...(preDiagAtual.checklist || {}),
        [etapaDb]: novoSlot,
      },
    }
    setPreDiagnostico(novoPreDiag)

    const { data, error: err } = await supabase
      .from('os')
      .update({ pre_diagnostico: novoPreDiag })
      .eq('id', osId)
      .select()
      .single()
    if (err) {
      setError(err)
      console.error('[useChecklistEtapa.salvar]', err)
    }
    return { data, error: err }
  }, [osId, etapaDb])

  return { itens, observacoes, loading, error, salvar, refetch: fetchChecklist }
}
