// src/hooks/useOSItens.js
// Itens de uma OS (tabela os_item) — substituiu OS_ITENS_MOCK.
// Filtra soft-delete e ordena por criado_em ascendente.

import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

/**
 * Lê os itens de uma OS específica.
 * @param {string|null} osId — UUID da OS. Se null, retorna [] sem buscar.
 */
export function useOSItens(osId) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchItens() {
    if (!osId) { setItens([]); return }
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

  return { itens, loading, error, refetch: fetchItens }
}
