// src/hooks/useChecklistEtapa.js
// Lê + persiste o checklist de UMA etapa específica de UMA OS.
// Tabela: checklist_etapa (sql/05-schema-parte-2-checklist-falha.sql)
//   UNIQUE(os_id, etapa)  → upsert on conflict garante 1 linha por etapa por OS
//
// Contrato:
//   - `etapaDb` é o valor enum do banco (recebido | em_oficina | teste_final | …),
//     não o id da UI. As ações já chamam com o valor certo.
//   - `itens` é o array jsonb da spec: [{ id, label, checked }, …]. Quem
//     decide a estrutura é o front (Recebido/Oficina/Teste montam diferente).
//   - `salvar(itens, observacoes?)` faz upsert e devolve { data, error }.
//
// Nota: o select da OS no useOS.js NÃO carrega checklist_etapa em batch — cada
// modal de OSDetalhe que precisa lê on-demand via este hook. Mantém o select
// principal enxuto e evita N+1 no Kanban (que não usa checklist).

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isUUID = v => typeof v === 'string' && UUID_REGEX.test(v)

export function useChecklistEtapa(osId, etapaDb) {
  const [itens, setItens] = useState([])
  const [observacoes, setObservacoes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [exists, setExists] = useState(false)

  const fetchChecklist = useCallback(async () => {
    if (!isUUID(osId) || !etapaDb) {
      setItens([]); setObservacoes(''); setExists(false); setLoading(false)
      return
    }
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('checklist_etapa')
      .select('itens, observacoes')
      .eq('os_id', osId).eq('etapa', etapaDb)
      .is('deleted_at', null)
      .maybeSingle()
    if (err) { setError(err); setLoading(false); return }
    setItens(Array.isArray(data?.itens) ? data.itens : [])
    setObservacoes(data?.observacoes || '')
    setExists(!!data)
    setLoading(false)
  }, [osId, etapaDb])

  useEffect(() => { fetchChecklist() }, [fetchChecklist])

  // Upsert por (os_id, etapa). onConflict precisa do nome da UNIQUE index.
  // Como o index é parcial (WHERE deleted_at IS NULL), fazemos SELECT + UPDATE/INSERT
  // manual em vez de .upsert() — Supabase não casa upsert com index parcial.
  const salvar = useCallback(async (novosItens, novasObs) => {
    if (!isUUID(osId) || !etapaDb) return { data: null, error: new Error('osId/etapa inválido') }
    const payload = {
      itens: novosItens ?? [],
      observacoes: novasObs ?? null,
    }
    // optimistic
    setItens(payload.itens); if (novasObs !== undefined) setObservacoes(novasObs || '')

    if (exists) {
      const { data, error: err } = await supabase
        .from('checklist_etapa')
        .update(payload)
        .eq('os_id', osId).eq('etapa', etapaDb)
        .is('deleted_at', null)
        .select().single()
      if (err) setError(err)
      return { data, error: err }
    }
    const { data, error: err } = await supabase
      .from('checklist_etapa')
      .insert({ os_id: osId, etapa: etapaDb, ...payload })
      .select().single()
    if (err) { setError(err); return { data: null, error: err } }
    setExists(true)
    return { data, error: null }
  }, [osId, etapaDb, exists])

  return { itens, observacoes, loading, error, salvar, refetch: fetchChecklist }
}
