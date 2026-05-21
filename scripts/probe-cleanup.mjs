// Verifica se o cleanup-test-data.sql apagou tudo direitinho.
// Uso: node scripts/probe-cleanup.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

const APAGAR = [
  'os', 'os_item', 'os_historico', 'checklist_etapa', 'falha_teste',
  'lancamento_financeiro', 'rota', 'peca_movimentacao',
]
const PRESERVAR = ['cliente', 'peca', 'conta_bancaria', 'usuarios']

console.log('=== APAGADO (devem estar em 0 ou bloqueados por RLS) ===\n')
for (const t of APAGAR) {
  const { error, count } = await supabase.from(t).select('id', { head: true, count: 'exact' })
  if (error) {
    console.log(`  ${t.padEnd(24)} ERRO: ${error.message}`)
  } else {
    const status = count === 0 ? '[OK] LIMPO' : `[${count} linhas]`
    console.log(`  ${t.padEnd(24)} ${status}`)
  }
}

console.log('\n=== PRESERVADO (devem ter as quantidades originais) ===\n')
for (const t of PRESERVAR) {
  const { error, count } = await supabase.from(t).select('id', { head: true, count: 'exact' })
  if (error) {
    console.log(`  ${t.padEnd(24)} ERRO: ${error.message}`)
  } else {
    console.log(`  ${t.padEnd(24)} ${count} linhas`)
  }
}

console.log('\nNota: count=0 com RLS bloqueando anon pode aparecer mesmo em tabela com dados.')
console.log('A verificação real é via SQL no Supabase Editor — query no final do sql/cleanup-test-data.sql.')
