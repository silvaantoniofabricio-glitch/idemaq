// src/hooks/useRoteiro.js
// Hook do "Roteiro do Dia" — agenda diária por funcionário.
//
// Tabela: roteiro_item (sql/83-roteiro-dia.sql)
//   1 linha = 1 tarefa do dia de UM funcionário.
//   Campos: dia (date local), responsavel_id, ordem, texto, os_id (opcional),
//           urgente, feito, feito_em + auditoria + soft-delete.
//
// Uso pelo dono (monta agenda de todos):
//   const r = useRoteiro({ dia })                  // traz itens de todos
// Uso pelo funcionário (só o próprio):
//   const r = useRoteiro({ dia, responsavelId })   // filtra por pessoa
//
// Comportamento de fallback: enquanto sql/83 não rodar no Supabase, o hook
// retorna `tabelaAusente: true` e as mutações respondem { error:{code:'OFFLINE'} }.
// A UI mostra aviso "rode o SQL" sem quebrar (mesmo padrão do usePonto).

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'

// ─── Detecção de tabela ausente ─────────────────────────────────────────────
function isMissingTable(err) {
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('not found'))
}

// Data local (America/Cuiaba) no formato 'YYYY-MM-DD'.
export function diaCuiaba(d = new Date()) {
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Cuiaba', year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/').reverse().join('-')
}

export function useRoteiro({ dia, responsavelId } = {}) {
  const diaAtual = dia || diaCuiaba()

  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [tabelaAusente, setTabelaAusente] = useState(false)
  const [erro, setErro] = useState(null)

  // ─── Carrega itens do dia ──────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    let q = supabase
      .from('roteiro_item')
      .select('*')
      .eq('dia', diaAtual)
      .is('deleted_at', null)
      .order('responsavel_id', { ascending: true })
      .order('ordem', { ascending: true })
    if (responsavelId) q = q.eq('responsavel_id', responsavelId)

    const { data, error } = await q
    if (isMissingTable(error)) {
      setTabelaAusente(true); setItens([]); setLoading(false); return
    }
    if (error) { setErro(error); console.error('[useRoteiro] erro:', error) }
    else { setItens(data || []) }
    setTabelaAusente(false)
    setLoading(false)
  }, [diaAtual, responsavelId])

  useEffect(() => { carregar() }, [carregar])

  // ─── Realtime: mudanças aparecem ao vivo em todos os dispositivos ──────────
  // Nome único por instância (Supabase proíbe 2 canais com mesmo nome).
  const canalIdRef = useRef(`roteiro_${Math.random().toString(36).slice(2)}`)
  useEffect(() => {
    if (tabelaAusente) return
    const canal = supabase
      .channel(canalIdRef.current)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'roteiro_item' },
        () => { carregar() }
      )
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [tabelaAusente, carregar])

  const offline = () => ({ error: { code: 'OFFLINE', message: 'Roteiro do Dia: rode sql/83 no Supabase' } })

  // ─── Adicionar item ────────────────────────────────────────────────────────
  const adicionar = useCallback(async ({ responsavelId: alvo, texto = '', osId = null, urgente = false }) => {
    if (tabelaAusente) return offline()
    if (!alvo) return { error: new Error('responsavelId obrigatório') }
    // ordem = fim da coluna daquela pessoa
    const daPessoa = itens.filter(i => i.responsavel_id === alvo)
    const ordem = daPessoa.length ? Math.max(...daPessoa.map(i => i.ordem)) + 1 : 0
    const { data, error } = await supabase
      .from('roteiro_item')
      .insert({ dia: diaAtual, responsavel_id: alvo, texto, os_id: osId, urgente, ordem })
      .select().single()
    if (error) return { error }
    setItens(prev => [...prev, data])
    return { data }
  }, [tabelaAusente, itens, diaAtual])

  // ─── Patch genérico com optimistic + rollback ──────────────────────────────
  const patch = useCallback(async (id, campos) => {
    if (tabelaAusente) return offline()
    const prev = itens
    setItens(p => p.map(i => i.id === id ? { ...i, ...campos } : i))
    const { error } = await supabase.from('roteiro_item').update(campos).eq('id', id)
    if (error) { setItens(prev); return { error } }
    return { ok: true }
  }, [tabelaAusente, itens])

  const marcarFeito = useCallback((item) =>
    patch(item.id, { feito: !item.feito, feito_em: !item.feito ? new Date().toISOString() : null })
  , [patch])

  const editarTexto = useCallback((id, texto) => patch(id, { texto }), [patch])
  const setUrgente  = useCallback((id, urgente) => patch(id, { urgente }), [patch])
  const setOS       = useCallback((id, osId) => patch(id, { os_id: osId }), [patch])

  // ─── Remover (delete físico — dono) ────────────────────────────────────────
  const remover = useCallback(async (id) => {
    if (tabelaAusente) return offline()
    const prev = itens
    setItens(p => p.filter(i => i.id !== id))
    const { error } = await supabase.from('roteiro_item').delete().eq('id', id)
    if (error) { setItens(prev); return { error } }
    return { ok: true }
  }, [tabelaAusente, itens])

  // ─── Reordenar a coluna de uma pessoa (lista de ids na nova ordem) ─────────
  const reordenar = useCallback(async (idsOrdenados) => {
    if (tabelaAusente) return offline()
    const prev = itens
    const ordemPorId = new Map(idsOrdenados.map((id, i) => [id, i]))
    setItens(p => p.map(i => ordemPorId.has(i.id) ? { ...i, ordem: ordemPorId.get(i.id) } : i))
    const updates = idsOrdenados.map((id, i) =>
      supabase.from('roteiro_item').update({ ordem: i }).eq('id', id))
    const results = await Promise.all(updates)
    if (results.some(r => r.error)) { setItens(prev); return { error: results.find(r => r.error).error } }
    return { ok: true }
  }, [tabelaAusente, itens])

  return {
    itens, loading, tabelaAusente, erro, dia: diaAtual,
    adicionar, marcarFeito, editarTexto, setUrgente, setOS, remover, reordenar,
    recarregar: carregar,
  }
}

export default useRoteiro
