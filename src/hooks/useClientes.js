// idemaq-src/hooks/useClientes.js
// CRUD da tabela `cliente` no Supabase.
// Estratégia de cache: useState simples + refetch manual (Opção 1 do Lote 1 do
// Módulo 00c). Sem realtime nesta sessão.
//
// Regras seguidas:
//  - Filtrar `deleted_at IS NULL` em todo SELECT.
//  - NÃO preencher criado_em/criado_por no INSERT — trigger faz isso.
//  - Exclusão é soft-delete (`update` setando `deleted_at` + `excluido_por`).
//  - Toda mutação chama refetch ao final pra sincronizar.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchClientes = useCallback(async () => {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('cliente')
      .select('*')
      .is('deleted_at', null)
      .order('nome', { ascending: true })
    if (err) {
      setError(err)
      setLoading(false)
      return
    }
    setClientes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  /**
   * Cria um novo cliente. Retorna { data, error }.
   * Não passar criado_em/criado_por — trigger preenche via auth.uid().
   */
  async function criar(payload) {
    const limpo = {
      nome:     payload.nome?.trim(),
      fone:     payload.fone?.trim() || null,
      endereco: payload.endereco?.trim() || null,
      cidade:   payload.cidade?.trim() || 'Naviraí',
      uf:       payload.uf?.trim() || 'MS',
      cep:      payload.cep?.trim() || null,
      email:    payload.email?.trim() || null,
      obs:      payload.obs?.trim() || null,
    }
    const { data, error: err } = await supabase
      .from('cliente')
      .insert(limpo)
      .select()
      .single()
    if (!err) await fetchClientes()
    return { data, error: err }
  }

  /**
   * Atualiza cliente existente. Patch parcial — só os campos passados.
   * Não passar atualizado_em/por — trigger preenche.
   */
  async function atualizar(id, patch) {
    const { data, error: err } = await supabase
      .from('cliente')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (!err) await fetchClientes()
    return { data, error: err }
  }

  /**
   * Soft-delete: marca deleted_at + excluido_por. Não some do banco.
   * Pra restaurar, basta setar deleted_at = null.
   */
  async function excluir(id) {
    const { data: userData } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('cliente')
      .update({
        deleted_at: new Date().toISOString(),
        excluido_por: userData?.user?.id || null,
      })
      .eq('id', id)
    if (!err) await fetchClientes()
    return { error: err }
  }

  return { clientes, loading, error, refetch: fetchClientes, criar, atualizar, excluir }
}
