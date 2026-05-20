// Verifica buckets existentes no Supabase Storage.
// Uso: node scripts/probe-storage.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

const { data, error } = await supabase.storage.listBuckets()

if (error) {
  console.log('ERRO:', error.message)
  process.exit(1)
}

console.log('=== Buckets em prod ===\n')
if (data.length === 0) {
  console.log('(nenhum bucket criado)')
} else {
  for (const b of data) {
    console.log(`  ${b.name.padEnd(22)} public=${b.public} created_at=${b.created_at}`)
  }
}
