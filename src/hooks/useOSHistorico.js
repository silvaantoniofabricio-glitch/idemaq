// src/hooks/useOSHistorico.js
// Histórico cronológico de mudanças de etapa de uma OS (tabela os_historico).
// Faz JOIN com usuarios pra trazer apelido + papel do funcionário responsável.
// IMPORTANTE: os_historico NÃO tem soft-delete (é append-only, CASCADE com `os`).
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
 * Lê o histórico cronológico de uma OS, com apelido do funcionário.
 * @param {string|null} osId — UUID da OS. Se null ou não-UUID, retorna [] sem buscar.
 */
export function useOSHistorico(osId) {
  const [historico, setHistorico] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchHistorico() {
    if (!osId || !isUUID(osId)) {
      setHistorico([])
      setLoading(false)
      return
    }
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('os_historico')
      .select(`
        id, etapa_de, etapa_para, data, duracao_segundos, observacao,
        funcionario_id,
        usuarios:funcionario_id ( apelido, papel )
      `)
      .eq('os_id', osId)
      .order('data', { ascending: true })
    if (err) { setError(err); setLoading(false); return }
    // Normaliza o JOIN — `h.apelido` direto em vez de `h.usuarios.apelido`.
    const normalizado = (data || []).map(h => ({
      ...h,
      apelido: h.usuarios?.apelido || 'desconhecido',
      papel: h.usuarios?.papel || null,
    }))
    setHistorico(normalizado)
    setLoading(false)
  }

  useEffect(() => { fetchHistorico() }, [osId])

  return { historico, loading, error, refetch: fetchHistorico }
}
