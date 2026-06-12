// idemaq-src/hooks/useMaquinas.js
// CRUD da tabela `maquina` — máquinas refurbish + revenda (Módulo 07).
// Requer sql/12-maquina.sql aplicado no Supabase.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const SELECT_COLS = [
  'id', 'modelo', 'marca', 'capacidade', 'estado',
  'custo_compra', 'custo_itens', 'custo_servico', 'preco_venda',
  'observacoes', 'criado_em',
].join(', ')

function dbToUi(row) {
  if (!row) return row
  return {
    id:           row.id,
    modelo:       row.modelo       || '',
    marca:        row.marca        || '',
    capacidade:   row.capacidade   || '',
    estado:       row.estado       || 'disponivel',
    custoCompra:  Number(row.custo_compra  ?? 0),
    custoItens:   Number(row.custo_itens   ?? 0),
    custoServico: Number(row.custo_servico ?? 0),
    precoVenda:   Number(row.preco_venda   ?? 0),
    observacoes:  row.observacoes  || '',
    criadoEm:     row.criado_em,
  }
}

function uiToDb(patch) {
  const map = {
    modelo:       'modelo',
    marca:        'marca',
    capacidade:   'capacidade',
    estado:       'estado',
    custoCompra:  'custo_compra',
    custoItens:   'custo_itens',
    custoServico: 'custo_servico',
    precoVenda:   'preco_venda',
    observacoes:  'observacoes',
  }
  const out = {}
  for (const [k, v] of Object.entries(patch || {})) {
    const col = map[k]
    if (!col) continue
    if (typeof v === 'string') out[col] = v.trim() || null
    else out[col] = v
  }
  return out
}

export function useMaquinas() {
  const [maquinas, setMaquinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMaquinas = useCallback(async () => {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('maquina')
      .select(SELECT_COLS)
      .is('deleted_at', null)
      .order('criado_em', { ascending: false })
    if (err) {
      // Tabela ainda não criada — silencia pra não quebrar a tela
      if (err.code === '42P01' || err.code === 'PGRST205' || err.code === 'PGRST204') {
        setMaquinas([])
        setLoading(false)
        return
      }
      setError(err)
      setLoading(false)
      return
    }
    setMaquinas((data || []).map(dbToUi))
    setLoading(false)
  }, [])

  useEffect(() => { fetchMaquinas() }, [fetchMaquinas])

  async function criar(payload) {
    const { data, error: err } = await supabase
      .from('maquina')
      .insert(uiToDb(payload))
      .select(SELECT_COLS)
      .single()
    if (!err) await fetchMaquinas()
    return { data: data ? dbToUi(data) : null, error: err }
  }

  async function atualizar(id, patch) {
    const { data, error: err } = await supabase
      .from('maquina')
      .update(uiToDb(patch))
      .eq('id', id)
      .select(SELECT_COLS)
      .single()
    if (!err) await fetchMaquinas()
    return { data: data ? dbToUi(data) : null, error: err }
  }

  async function excluir(id) {
    const { error: err } = await supabase
      .from('maquina')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (!err) await fetchMaquinas()
    return { error: err }
  }

  return { maquinas, loading, error, refetch: fetchMaquinas, criar, atualizar, excluir }
}
