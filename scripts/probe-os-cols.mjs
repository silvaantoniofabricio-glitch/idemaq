// Inspeciona colunas da tabela `os` que importam pra foto da coleta.
// Uso: node scripts/probe-os-cols.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

const { data, error } = await supabase
  .from('os')
  .select('id, numero, pre_diagnostico')
  .limit(3)

if (error) {
  console.log('ERRO:', error.message, error.code)
  process.exit(1)
}

console.log('=== Coluna pre_diagnostico em `os` ===\n')
for (const os of data) {
  console.log(`OS #${os.numero}: pre_diagnostico =`, JSON.stringify(os.pre_diagnostico))
}
