// src/hooks/useOSItens.js
// Itens de uma OS (tabela os_item) — substituiu OS_ITENS_MOCK.
// Filtra soft-delete e ordena por criado_em ascendente.
//
// Blindagem (18/05): ignora silenciosamente IDs que não são UUID válidos
// (ex: 'mock-003'). Evita o erro de Postgres 'invalid input syntax for
// type uuid' aparecer pro usuário durante a transição mock → real.

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function isUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

/**
 * Lê os itens de uma OS específica.
 * @param {string|null} osId — UUID da OS. Se null ou não-UUID, retorna [] sem buscar.
 */
export function useOSItens(osId) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchItens() {
    if (!osId || !isUUID(osId)) {
      setItens([])
      setLoading(false)
      return
    }
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('os_item')
      .select('*')
      .eq('os_id', osId)
      .is('deleted_at', null)
      .order('criado_em', { ascending: true })
    if (err) { setError(err); setLoading(false); return }
    setItens(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItens() }, [osId])

  // Adicionar item novo
  async function addItem(novoItem) {
    // novoItem: { nome, quantidade, valor_unitario, peca_id? }
    // peca_id NULL = item avulso/serviço; preenchido = peça do catálogo.
    const { data, error } = await supabase
      .from('os_item')
      .insert({ ...novoItem, os_id: osId })
      .select()
      .single()
    if (!error) await fetchItens()
    return { data, error }
  }

  // Atualizar item existente
  async function updateItem(id, patch) {
    const { error } = await supabase
      .from('os_item')
      .update(patch)
      .eq('id', id)
    if (!error) await fetchItens()
    return { error }
  }

  // Remover item (hard delete — itens não têm soft-delete)
  async function removeItem(id) {
    const { error } = await supabase
      .from('os_item')
      .delete()
      .eq('id', id)
    if (!error) await fetchItens()
    return { error }
  }

  return { itens, loading, error, refetch: fetchItens, addItem, updateItem, removeItem }
}
