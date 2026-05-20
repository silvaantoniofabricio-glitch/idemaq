// Verifica se sql/07-os-itens-baixados.sql foi aplicado no Supabase.
// Confere as 2 colunas novas: os.itens_baixados (boolean) + os_item.peca_id (uuid).
// Uso: node scripts/verificar-sql-07.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

console.log('=== Verificando sql/07 no Supabase ===\n')

let falhou = false

// 1) os.itens_baixados
const { error: errOs } = await supabase
  .from('os')
  .select('id, itens_baixados')
  .limit(1)

if (errOs) {
  if (errOs.code === '42703' || (errOs.message || '').includes('itens_baixados')) {
    console.log('[FALHA] coluna os.itens_baixados NAO EXISTE — sql/07 nao rodou (ou rodou parcial).')
    falhou = true
  } else {
    console.log('[ERRO] os.itens_baixados:', errOs.message)
    falhou = true
  }
} else {
  console.log('[OK]    coluna os.itens_baixados existe e responde a SELECT.')
}

// 2) os_item.peca_id
const { error: errIt } = await supabase
  .from('os_item')
  .select('id, peca_id')
  .limit(1)

if (errIt) {
  if (errIt.code === '42703' || (errIt.message || '').includes('peca_id')) {
    console.log('[FALHA] coluna os_item.peca_id NAO EXISTE — sql/07 nao rodou (ou rodou parcial).')
    falhou = true
  } else {
    console.log('[ERRO] os_item.peca_id:', errIt.message)
    falhou = true
  }
} else {
  console.log('[OK]    coluna os_item.peca_id existe e responde a SELECT.')
}

console.log()
if (falhou) {
  console.log('=> Aplicar `sql/07-os-itens-baixados.sql` no SQL Editor do Supabase.')
  console.log('   https://supabase.com/dashboard/project/yfbbruxqfzgetapbvrgd/sql/new')
  process.exit(1)
} else {
  console.log('=> sql/07 aplicado com sucesso. Baixa automatica de estoque liberada.')
}
