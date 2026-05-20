// src/hooks/useFalhaTeste.js
// Lê + escreve falhas do Teste Final (tabela falha_teste).
// Substitui o array jsonb em memória `os.teste_falhas` que sumia ao recarregar.
//
// Fluxo:
//   - AcaoTeste reprova um teste (defeito/barulho) → insere 1 linha por falha
//     com tipo='defeito'|'sujeira' (mapeia 'barulho'→'defeito' por ora) e
//     descrição "Entrada de água: com defeito"
//   - AcaoOficina lê falhas abertas (resolvida=false) pra mostrar banner vermelho
//   - Ao concluir oficina (ou aprovar teste de novo), marca todas como resolvidas
//
// O enum no banco aceita: 'sujeira' | 'defeito' | 'ambos'. O UI hoje usa
// 'defeito' e 'barulho' — mapeamos barulho→defeito (semanticamente é "não passou
// no teste, vibração anômala"), e mantemos a label original na descrição.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isUUID = v => typeof v === 'string' && UUID_REGEX.test(v)

export function useFalhaTeste(osId) {
  const [falhas, setFalhas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!isUUID(osId)) { setFalhas([]); setLoading(false); return }
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('falha_teste')
      .select('id, tipo, descricao, resolvida, resolvida_em, criado_em')
      .eq('os_id', osId)
      .is('deleted_at', null)
      .order('criado_em', { ascending: true })
    if (err) { setError(err); setLoading(false); return }
    setFalhas(data || [])
    setLoading(false)
  }, [osId])

  useEffect(() => { fetch() }, [fetch])

  // Substitui o conjunto de falhas em aberto pelo array `descricoes`.
  // Estratégia: marca todas as abertas como resolvidas + insere as novas.
  // Mais simples que diff por descrição (que pode ter colisão).
  const sincronizarAbertas = useCallback(async (descricoes) => {
    if (!isUUID(osId)) return { error: new Error('osId inválido') }
    // 1. Resolver todas as abertas atuais
    const { error: errClose } = await supabase
      .from('falha_teste')
      .update({ resolvida: true, resolvida_em: new Date().toISOString() })
      .eq('os_id', osId).eq('resolvida', false)
      .is('deleted_at', null)
    if (errClose) return { error: errClose }

    // 2. Inserir as novas (se houver)
    if (descricoes && descricoes.length > 0) {
      const linhas = descricoes.map(desc => ({
        os_id: osId,
        tipo: 'defeito',  // UI "barulho" também entra como defeito (ver topo)
        descricao: desc,
      }))
      const { error: errIns } = await supabase.from('falha_teste').insert(linhas)
      if (errIns) return { error: errIns }
    }
    await fetch()
    return { error: null }
  }, [osId, fetch])

  // Marca todas as falhas abertas como resolvidas (usado quando técnico
  // termina a oficina sem reprovar de novo).
  const resolverTodas = useCallback(async () => {
    if (!isUUID(osId)) return { error: new Error('osId inválido') }
    const { error: err } = await supabase
      .from('falha_teste')
      .update({ resolvida: true, resolvida_em: new Date().toISOString() })
      .eq('os_id', osId).eq('resolvida', false)
      .is('deleted_at', null)
    if (!err) await fetch()
    return { error: err }
  }, [osId, fetch])

  const abertas = falhas.filter(f => !f.resolvida)

  return { falhas, abertas, loading, error, sincronizarAbertas, resolverTodas, refetch: fetch }
}
