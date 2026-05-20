// Testa cada coluna esperada da tabela `usuarios` individualmente.
// Uso: node scripts/probe-usuarios.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

const colunas = ['id', 'email', 'apelido', 'nome', 'papel', 'role', 'ativo', 'deleted_at']

console.log('=== Testando cada coluna em `usuarios` ===\n')
for (const col of colunas) {
  const { error } = await supabase
    .from('usuarios')
    .select(col, { head: true })
    .limit(1)

  if (error) {
    if (error.code === '42703' || (error.message || '').includes('does not exist')) {
      console.log(`[FALTA]  ${col}`)
    } else if (error.code === 'PGRST116' || error.code === 'PGRST204' || (error.message || '').includes('not found')) {
      console.log(`[FALTA]  ${col} (${error.message})`)
    } else {
      console.log(`[?]      ${col} → ${error.code}: ${error.message}`)
    }
  } else {
    console.log(`[OK]     ${col}`)
  }
}

console.log('\n=== Tentando filtros do useUsuarios ===\n')

// .is('deleted_at', null)
const r1 = await supabase.from('usuarios').select('id', { head: true }).is('deleted_at', null).limit(1)
console.log(`.is('deleted_at', null) →`, r1.error ? `ERRO: ${r1.error.message}` : 'OK')

// .eq('ativo', true)
const r2 = await supabase.from('usuarios').select('id', { head: true }).eq('ativo', true).limit(1)
console.log(`.eq('ativo', true) →`, r2.error ? `ERRO: ${r2.error.message}` : 'OK')
