// idemaq-src/hooks/useConfiguracoes.js
// Hook chave/valor pra `configuracoes` (Módulo 09).
//
// Schema da tabela (sql/10-configuracoes.sql):
//   id uuid · chave text UNIQUE · valor jsonb · descricao text
//   + auditoria padrão + soft-delete + RLS (leitura aberta, escrita só dono)
//
// Uso:
//   const { get, set, loading, tabelaAusente } = useConfiguracoes()
//   const meta = Number(get('meta_mensal', 20000))
//   await set('meta_mensal', 22000)
//
// Fallback: enquanto sql/10 não rodar, devolve `tabelaAusente: true` e
// um mapa em memória com os defaults (espelha o seed). Operações de
// escrita retornam OFFLINE — UI pode mostrar aviso.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// ─── Detecção de tabela ausente ─────────────────────────────────────────────
function isMissingTable(err) {
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('not found'))
}

// ─── Defaults (espelham o seed do sql/10-configuracoes.sql) ─────────────────
export const CONFIG_DEFAULTS = {
  meta_mensal: 20000,
  jornada_padrao_horas: 8,
}

const CONFIG_DESCRICOES = {
  meta_mensal: 'Meta mensal de faturamento (R$). Usada no Painel pra calcular progresso e meta diária restante.',
  jornada_padrao_horas: 'Jornada padrão de trabalho por dia (em horas). Base do módulo Ponto.',
}

export function useConfiguracoes() {
  const [configs, setConfigs]     = useState({}) // { chave: valor (desserializado) }
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [tabelaAusente, setTabelaAusente] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .is('deleted_at', null)

      if (err) {
        if (isMissingTable(err)) {
          setTabelaAusente(true)
          setConfigs({ ...CONFIG_DEFAULTS })
          return
        }
        throw err
      }

      const mapa = { ...CONFIG_DEFAULTS }
      for (const row of data || []) {
        mapa[row.chave] = row.valor
      }
      setTabelaAusente(false)
      setConfigs(mapa)
    } catch (err) {
      setError(err)
      console.error('useConfiguracoes:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── API ──────────────────────────────────────────────────────────────────
  /** Leitura sincrona via mapa em memória, com fallback explícito. */
  const get = useCallback((chave, fallback) => {
    if (configs[chave] !== undefined) return configs[chave]
    if (fallback !== undefined) return fallback
    return CONFIG_DEFAULTS[chave]
  }, [configs])

  /** UPSERT por chave. Em modo demo, atualiza só em memória. */
  async function set(chave, valor) {
    // Otimista: atualiza local primeiro pra UI refletir na hora
    setConfigs(prev => ({ ...prev, [chave]: valor }))

    if (tabelaAusente) {
      return { data: null, error: { code: 'OFFLINE', message: 'Tabela configuracoes não aplicada' } }
    }

    const { data, error: err } = await supabase
      .from('configuracoes')
      .upsert(
        { chave, valor, descricao: CONFIG_DESCRICOES[chave] || null },
        { onConflict: 'chave' }
      )
      .select()
      .single()

    if (err) {
      // Rollback otimista
      await fetchAll()
      return { data: null, error: err }
    }
    return { data, error: null }
  }

  return {
    configs,
    loading, error, tabelaAusente,
    refetch: fetchAll,
    get, set,
  }
}
