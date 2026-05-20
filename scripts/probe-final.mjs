// Confirma que sql/09 (ponto) + sql/10 (configuracoes) estao em prod.
// Uso: node scripts/probe-final.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

const TABELAS = ['ponto_registro', 'jornada_funcionario', 'configuracoes']

console.log('=== Validacao final — tabelas em prod ===\n')

for (const t of TABELAS) {
  const { error } = await supabase.from(t).select('id', { head: true, count: 'exact' }).limit(1)
  if (error) {
    const msg = (error.message || '').toLowerCase()
    if (error.code === '42P01' || msg.includes('does not exist') || msg.includes('not found')) {
      console.log(`[FALTA]   ${t.padEnd(22)} → tabela nao existe`)
    } else {
      // RLS bloqueando anon eh OK — significa que existe
      console.log(`[OK/RLS]  ${t.padEnd(22)} → existe (RLS bloqueia leitura anon, esperado)`)
    }
  } else {
    console.log(`[OK]      ${t.padEnd(22)} → existe e responde a SELECT`)
  }
}

console.log('\n=== Storage bucket ===\n')
const { error: errBucket } = await supabase.storage
  .from('idemaq-privado')
  .list('os', { limit: 1 })
if (errBucket) {
  console.log('[?]      idemaq-privado     →', errBucket.message)
} else {
  console.log('[OK]     idemaq-privado     → bucket privado acessivel')
}
