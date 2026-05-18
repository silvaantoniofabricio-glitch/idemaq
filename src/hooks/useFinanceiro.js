// idemaq-src/hooks/useFinanceiro.js
// Hook de lançamentos financeiros (contas a receber, a pagar, caixa).
//
// Schema parte 2 (`lancamento_financeiro` + `categoria_financeira` + `conta_bancaria`)
// ainda pode não existir no banco quando esse hook for chamado — o tratamento
// de erro é GRACIOSO: se a tabela não existir, retorna listas vazias e seta
// `tabelaAusente: true` pro caller renderizar empty state em vez de tela branca.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// Postgres SQLSTATE 42P01 = undefined_table. Supabase encapsula em error.code.
function isMissingTable(err) {
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || msg.includes('relation') && msg.includes('not found')
}

/**
 * @param {object} filtros — { tipo?, status?, dataInicio?, dataFim? }
 */
export function useFinanceiro(filtros = {}) {
  const [lancamentos, setLancamentos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tabelaAusente, setTabelaAusente] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    setTabelaAusente(false)

    try {
      // Categorias
      const { data: cats, error: errCat } = await supabase
        .from('categoria_financeira')
        .select('*')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('ordem', { ascending: true })
      if (errCat) {
        if (isMissingTable(errCat)) {
          setTabelaAusente(true)
          setCategorias([]); setContas([]); setLancamentos([])
          return
        }
        throw errCat
      }
      setCategorias(cats || [])

      // Contas
      const { data: ctas, error: errCta } = await supabase
        .from('conta_bancaria')
        .select('*')
        .is('deleted_at', null)
        .eq('ativo', true)
      if (errCta) {
        if (isMissingTable(errCta)) {
          setTabelaAusente(true)
          setContas([]); setLancamentos([])
          return
        }
        throw errCta
      }
      setContas(ctas || [])

      // Lançamentos com filtros — joins via FK
      let q = supabase
        .from('lancamento_financeiro')
        .select(`
          *,
          categoria:categoria_id (id, nome, tipo, icone),
          conta:conta_id (id, nome, tipo)
        `)
        .is('deleted_at', null)

      if (filtros.tipo)        q = q.eq('tipo', filtros.tipo)
      if (filtros.status)      q = q.eq('status', filtros.status)
      if (filtros.dataInicio)  q = q.gte('data_vencimento', filtros.dataInicio)
      if (filtros.dataFim)     q = q.lte('data_vencimento', filtros.dataFim)

      q = q.order('data_vencimento', { ascending: false })

      const { data: lancs, error: errLanc } = await q
      if (errLanc) {
        if (isMissingTable(errLanc)) {
          setTabelaAusente(true)
          setLancamentos([])
          return
        }
        throw errLanc
      }
      setLancamentos(lancs || [])
    } catch (err) {
      setError(err)
      console.error('useFinanceiro:', err)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filtros)])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── CRUD ──────────────────────────────────────────────────────────────

  async function criar(payload) {
    const limpo = {
      tipo: payload.tipo,
      natureza: payload.natureza || 'avulso',
      status: payload.status || 'pendente',
      categoria_id: payload.categoria_id || null,
      conta_id: payload.conta_id || null,
      valor: Number(payload.valor) || 0,
      data_vencimento: payload.data_vencimento,
      descricao: payload.descricao?.trim(),
      observacoes: payload.observacoes?.trim() || null,
      os_id: payload.os_id || null,
    }
    const { data, error: err } = await supabase
      .from('lancamento_financeiro')
      .insert(limpo)
      .select()
      .single()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  // Marca como pago, registra valor pago, forma e data. Sem `forma_pagamento`,
  // o campo fica null (cumpre a regra "registrei sem detalhar a forma").
  async function darBaixa(id, { valor_pago, forma_pagamento, data_pagamento } = {}) {
    const patch = {
      status: 'pago',
      valor_pago: Number(valor_pago) || 0,
      data_pagamento: data_pagamento || new Date().toISOString().slice(0, 10),
    }
    if (forma_pagamento) patch.forma_pagamento = forma_pagamento

    const { data, error: err } = await supabase
      .from('lancamento_financeiro')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function excluir(id) {
    const { data: user } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('lancamento_financeiro')
      .update({
        deleted_at: new Date().toISOString(),
        excluido_por: user?.user?.id || null,
      })
      .eq('id', id)
    if (!err) await fetchAll()
    return { error: err }
  }

  return {
    lancamentos, categorias, contas,
    loading, error, tabelaAusente,
    refetch: fetchAll, criar, darBaixa, excluir,
  }
}
