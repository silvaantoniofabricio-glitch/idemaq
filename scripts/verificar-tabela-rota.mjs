// Verifica se sql/06-rota.sql foi aplicado no Supabase.
// Uso: node scripts/verificar-tabela-rota.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

console.log('=== Verificando tabela `rota` no Supabase ===\n')

const { data, error } = await supabase
  .from('rota')
  .select('id, data, motorista_id, paradas, status, deleted_at')
  .limit(1)

if (error) {
  const msg = (error.message || '').toLowerCase()
  const ausente =
    error.code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes("could not find the table")
  if (ausente) {
    console.log('TABELA AUSENTE.')
    console.log('Aplicar o arquivo `sql/06-rota.sql` no SQL Editor do Supabase.')
    console.log('URL: https://supabase.com/dashboard/project/yfbbruxqfzgetapbvrgd/sql/new')
    process.exit(1)
  }
  console.log('ERRO inesperado:', error.message)
  process.exit(2)
}

console.log('OK: tabela `rota` existe e responde a SELECT.')
console.log(`Linhas retornadas (limit 1): ${data.length}`)
if (data[0]) {
  console.log('Amostra:', JSON.stringify(data[0], null, 2))
}
