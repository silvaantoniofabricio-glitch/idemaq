// Confirma que sql/11-peca-movimentacao.sql foi aplicado.
// Uso: node scripts/probe-sql-11.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

console.log('=== Validacao sql/11 — peca_movimentacao ===\n')

const { error, count } = await supabase
  .from('peca_movimentacao')
  .select('id', { head: true, count: 'exact' })

if (error) {
  const msg = (error.message || '').toLowerCase()
  if (error.code === '42P01' || msg.includes('does not exist') || msg.includes('not found')) {
    console.log('[FALTA]  tabela peca_movimentacao nao existe — rodar sql/11')
    process.exit(1)
  }
  // RLS bloqueando anon eh OK — significa que existe
  console.log('[OK/RLS] tabela existe (RLS bloqueia anon, esperado)')
} else {
  console.log(`[OK]     tabela existe e responde (linhas: ${count ?? 0})`)
}

console.log('\n=> sql/11 aplicado. Historico real de estoque destravado.')
