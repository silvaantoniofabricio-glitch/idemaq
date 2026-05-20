// Verifica buckets existentes no Supabase Storage.
// Uso: node scripts/probe-storage.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

console.log('=== Buckets em prod ===\n')

const { data, error } = await supabase.storage.listBuckets()

if (error) {
  console.log('ERRO listBuckets:', error.message)
} else if (data.length === 0) {
  console.log('(listBuckets retornou vazio — pode ser RLS bloqueando anon key)')
} else {
  for (const b of data) {
    console.log(`  ${b.name.padEnd(22)} public=${b.public} created_at=${b.created_at}`)
  }
}

console.log('\n=== Teste direto: existe `idemaq-privado`? ===\n')

// Tenta listar arquivos do bucket — se der "Bucket not found", nao existe.
// Se der outro erro (permission denied / RLS), o bucket EXISTE.
const { data: lista, error: errList } = await supabase.storage
  .from('idemaq-privado')
  .list('os', { limit: 5 })

if (errList) {
  const msg = errList.message || ''
  if (msg.includes('Bucket not found') || msg.includes('not_found')) {
    console.log('[NAO EXISTE] bucket "idemaq-privado" precisa ser criado')
    console.log('  → Dashboard Storage → New bucket → idemaq-privado (private)')
  } else {
    console.log(`[EXISTE] bucket "idemaq-privado" — mas anon nao pode listar (RLS):`)
    console.log(`  erro: ${msg}`)
    console.log('  → Isso e esperado se as policies do sql/08 ainda nao rodaram')
  }
} else {
  console.log(`[EXISTE + ACESSIVEL] bucket "idemaq-privado"`)
  console.log(`  Arquivos em /os: ${lista.length}`)
  for (const f of lista) console.log(`    - ${f.name}`)
}
