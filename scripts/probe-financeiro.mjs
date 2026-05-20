// Diagnóstico do estado real da tabela lancamento_financeiro no Supabase.
// Confirma schema (colunas antigas vs novas) e contagem de linhas visíveis
// pra publishable key (pode estar mascarado por RLS).
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

console.log('--- T1: tabela existe (SELECT *) ---')
const r1 = await supabase.from('lancamento_financeiro').select('*').limit(1)
console.log('error:', r1.error, '\nfirst row:', r1.data?.[0] || '(vazio)')

console.log('\n--- T2: schema novo (vencimento/pago_em/taxa_pct/categoria) ---')
const r2 = await supabase.from('lancamento_financeiro')
  .select('id, tipo, vencimento, pago_em, taxa_pct, categoria').limit(5)
console.log('error:', r2.error, '\ndata:', r2.data)

console.log('\n--- T3: schema antigo (data_vencimento/categoria_id/status) ---')
const r3 = await supabase.from('lancamento_financeiro')
  .select('id, tipo, data_vencimento, data_pagamento, categoria_id, status').limit(5)
console.log('error:', r3.error, '\ndata:', r3.data)

console.log('\n--- T4: conta_bancaria ---')
const r4 = await supabase.from('conta_bancaria').select('*').limit(20)
console.log('error:', r4.error, '\ncount:', r4.data?.length, '\nfirst:', r4.data?.[0])

console.log('\n--- T5: categoria_financeira (schema antigo tinha) ---')
const r5 = await supabase.from('categoria_financeira').select('*').limit(5)
console.log('error:', r5.error, '\ncount:', r5.data?.length)
