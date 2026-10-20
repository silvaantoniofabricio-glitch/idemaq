import { createClient } from '@supabase/supabase-js'
const sb = createClient('https://yfbbruxqfzgetapbvrgd.supabase.co','sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP')

// Pega 1 OS pra ver colunas
const { data: os } = await sb.from('os').select('*').limit(1)
console.log('OS colunas:', Object.keys(os?.[0] || {}).join(', '))

// Pega contas bancarias
const { data: contas } = await sb.from('conta_bancaria').select('id, nome, banco').is('deleted_at', null)
console.log('\nContas bancárias:')
contas?.forEach(c => console.log(`  ${c.id} | ${c.nome} | ${c.banco}`))

// Pega 1 lancamento pra ver colunas
const { data: lanc } = await sb.from('lancamento_financeiro').select('*').limit(1)
console.log('\nLancamento colunas:', Object.keys(lanc?.[0] || {}).join(', '))

// Categorias existentes
const { data: cats } = await sb.from('lancamento_financeiro').select('categoria').is('deleted_at', null).limit(200)
const unicas = [...new Set(cats?.map(c => c.categoria).filter(Boolean))]
console.log('\nCategorias existentes:', unicas.join(', '))
