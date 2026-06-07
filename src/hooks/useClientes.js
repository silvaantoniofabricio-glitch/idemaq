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

/**
 * INSERT puro na tabela `cliente` — sem hook/refetch.
 * Usado por consumidores que precisam só criar (ex: NovaOSModal inline)
 * e não querem pagar o custo de carregar os 782 clientes do useClientes.
 *
 * Schema real: nome, telefone, telefone2, endereco (text concat), endereco2, email, observacoes.
 * Aceita payload com nomes antigos (fone/obs) e novos (telefone/observacoes).
 * telefone2 adicionado via sql/78; endereco2 via sql/81.
 */
export async function criarClientePersist(payload) {
  const enderecos = Array.isArray(payload.enderecos)
    ? payload.enderecos.map(e => (e || '').trim()).filter(Boolean)
    : []
  const enderecoBase = enderecos.length > 0
    ? enderecos.join(' | ')
    : (payload.endereco?.trim() || '')

  const sufixoLocal = [payload.cidade?.trim(), payload.uf?.trim()].filter(Boolean).join('/')
  const partes = [enderecoBase, sufixoLocal, payload.cep?.trim()].filter(Boolean)
  const enderecoFinal = partes.length ? partes.join(' — ') : null

  const limpo = {
    nome:        payload.nome?.trim(),
    telefone:    (payload.telefone || payload.fone)?.trim() || null,
    telefone2:   payload.telefone2?.trim() || null,
    endereco:    enderecoFinal,
    endereco2:   payload.endereco2?.trim() || null,
    email:       payload.email?.trim() || null,
    observacoes: (payload.observacoes || payload.obs)?.trim() || null,
  }
  return supabase.from('cliente').insert(limpo).select().single()
}

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
   * Cria um novo cliente + refetch. Retorna { data, error }.
   * Não passar criado_em/criado_por — trigger preenche via auth.uid().
   */
  async function criar(payload) {
    const res = await criarClientePersist(payload)
    if (!res.error) await fetchClientes()
    return res
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
