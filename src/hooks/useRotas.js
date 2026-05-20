// idemaq-src/hooks/useRotas.js
// Hook de rotas (logística — coletas + entregas do dia).
//
// MODO REAL: consulta a tabela `rota` no Supabase. Se a tabela ainda não
// existir (sql/06-rota.sql não aplicado), o hook devolve `tabelaAusente: true`
// e a UI degrada graciosamente — mesmo padrão usado em `useFinanceiro.js`.
//
// Cada linha em `rota` representa uma rota diária (data + motorista). As
// paradas vivem dentro do jsonb `paradas`. Mutações de parada fazem UPDATE
// do array `paradas` inteiro via `.update({ paradas: novaLista })`.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// Postgres SQLSTATE 42P01 = undefined_table. PostgREST devolve mensagens com
// "Could not find the table" ou "does not exist" dependendo da camada.
function isMissingTable(err) {
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = (err.message || '').toLowerCase()
  return (
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('not found'))
  )
}

/**
 * @param {object} filtros — { data? (YYYY-MM-DD), motorista_id?, status? }
 */
export function useRotas(filtros = {}) {
  const [rotas, setRotas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tabelaAusente, setTabelaAusente] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let q = supabase
        .from('rota')
        .select(`*, motorista:motorista_id (id, apelido)`)
        .is('deleted_at', null)
      if (filtros.data)         q = q.eq('data', filtros.data)
      if (filtros.motorista_id) q = q.eq('motorista_id', filtros.motorista_id)
      if (filtros.status)       q = q.eq('status', filtros.status)
      q = q.order('data', { ascending: false })

      const { data, error: err } = await q
      if (err) {
        if (isMissingTable(err)) {
          setTabelaAusente(true)
          setRotas([])
          return
        }
        throw err
      }

      setTabelaAusente(false)
      // Achata `motorista` da join pra `motorista_nome` (compat com UI)
      const normalizadas = (data || []).map(r => ({
        ...r,
        motorista_nome: r.motorista?.apelido || null,
        paradas: Array.isArray(r.paradas) ? r.paradas : [],
      }))
      setRotas(normalizadas)
    } catch (err) {
      setError(err)
      console.error('useRotas:', err)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filtros)])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── Mutações ──────────────────────────────────────────────────────────
  // Paradas vivem no jsonb — toda mutação faz UPDATE do array inteiro.
  // Optimistic UI: atualiza estado local antes do request, faz rollback se falhar.

  async function persistirParadas(rotaId, novasParadas) {
    if (tabelaAusente) return { error: null }
    const { error: err } = await supabase
      .from('rota')
      .update({ paradas: novasParadas })
      .eq('id', rotaId)
    if (err) console.error('useRotas.persistirParadas:', err)
    return { error: err }
  }

  async function concluirParada(rotaId, paradaId) {
    let snapshot = null
    let novasParadas = null

    setRotas(prev => prev.map(r => {
      if (r.id !== rotaId) return r
      snapshot = r.paradas
      novasParadas = r.paradas.map(p =>
        p.id === paradaId
          ? {
              ...p,
              status: 'concluida',
              horario_chegada: new Date().toTimeString().slice(0, 5),
            }
          : p
      )
      return { ...r, paradas: novasParadas }
    }))

    if (!novasParadas) return
    const { error: err } = await persistirParadas(rotaId, novasParadas)
    if (err) {
      // rollback
      setRotas(prev => prev.map(r => r.id === rotaId ? { ...r, paradas: snapshot } : r))
    }
  }

  async function reordenarParadas(rotaId, novaOrdem) {
    let snapshot = null
    const renumerada = novaOrdem.map((p, i) => ({ ...p, ordem: i + 1 }))

    setRotas(prev => prev.map(r => {
      if (r.id !== rotaId) return r
      snapshot = r.paradas
      return { ...r, paradas: renumerada }
    }))

    const { error: err } = await persistirParadas(rotaId, renumerada)
    if (err) {
      setRotas(prev => prev.map(r => r.id === rotaId ? { ...r, paradas: snapshot } : r))
    }
  }

  async function criar(payload) {
    if (tabelaAusente) return { data: null, error: new Error('Tabela `rota` ainda não criada') }
    const { data, error: err } = await supabase
      .from('rota')
      .insert(payload)
      .select()
      .single()
    if (err) {
      console.error('useRotas.criar:', err)
      return { data: null, error: err }
    }
    await fetchAll()
    return { data, error: null }
  }

  async function atualizar(id, patch) {
    if (tabelaAusente) return { data: null, error: new Error('Tabela `rota` ainda não criada') }
    const { data, error: err } = await supabase
      .from('rota')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (err) {
      console.error('useRotas.atualizar:', err)
      return { data: null, error: err }
    }
    await fetchAll()
    return { data, error: null }
  }

  async function excluir(id) {
    if (tabelaAusente) return { error: new Error('Tabela `rota` ainda não criada') }
    // Soft-delete (padrão Idemaq)
    const { error: err } = await supabase
      .from('rota')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (err) {
      console.error('useRotas.excluir:', err)
      return { error: err }
    }
    await fetchAll()
    return { error: null }
  }

  return {
    rotas,
    loading,
    error,
    tabelaAusente,
    refetch: fetchAll,
    concluirParada,
    reordenarParadas,
    criar,
    atualizar,
    excluir,
  }
}
