// src/hooks/useRelatorioIA.js
// Hook que invoca a edge function `relatorio-ia` (Supabase Functions) pra
// gerar análise em Markdown via Claude API (claude-opus-4-7).
//
// A chave da Anthropic NÃO vem pro front — fica no servidor. Aqui só passamos
// `{ tipo, dados }` e recebemos `{ markdown }`.
//
// Uso:
//   const { markdown, loading, error, gerar } = useRelatorioIA()
//   <Button onClick={() => gerar('dre', dadosAgregados)}>Gerar análise IA</Button>
//
// `tipo`:
//   - 'dre'           → análise do DRE
//   - 'funcionarios'  → análise da equipe
//
// `dados`: objeto JSON com os números já agregados (a edge function só formata).

import { useState, useCallback } from 'react'
import { supabase } from '../supabase'

export function useRelatorioIA() {
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [usage, setUsage]       = useState(null)

  const gerar = useCallback(async (tipo, dados) => {
    setLoading(true); setError(null); setMarkdown('')
    try {
      const { data, error: errFn } = await supabase.functions.invoke('relatorio-ia', {
        body: { tipo, dados },
      })
      if (errFn) throw errFn
      if (data?.error) throw new Error(data.error)

      setMarkdown(data?.markdown || '')
      setUsage(data?.usage || null)
      return data
    } catch (e) {
      const msg = e?.message || String(e)
      setError(msg)
      return { error: msg }
    } finally {
      setLoading(false)
    }
  }, [])

  const resetar = useCallback(() => {
    setMarkdown(''); setError(null); setUsage(null)
  }, [])

  return { markdown, loading, error, usage, gerar, resetar }
}
