// Verifica se a importacao do BCM foi rodada no Supabase

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

// 1) Schema: as colunas novas existem?
console.log('=== Verificando schema (colunas novas existem?) ===')
const { data: amostra, error: errSchema } = await supabase
  .from('peca')
  .select('id, nome, categoria, marca, tipo, referencia, modelo, modelos_compativeis, fornecedor, deleted_at')
  .limit(1)

if (errSchema) {
  console.log('ERRO no schema:', errSchema.message)
  if (errSchema.message.includes('column') && errSchema.message.includes('does not exist')) {
    console.log('\n>> As colunas novas AINDA NAO foram criadas.')
    console.log('>> O SQL #1 (sql/02-peca-add-colunas.sql) ainda nao foi rodado.\n')
    process.exit(1)
  }
} else {
  console.log('OK: colunas marca/tipo/referencia/modelo/modelos_compativeis existem.\n')
}

// 2) Contagem
console.log('=== Contagem de pecas ===')
const { count: ativas } = await supabase
  .from('peca')
  .select('*', { count: 'exact', head: true })
  .is('deleted_at', null)

const { count: deletadas } = await supabase
  .from('peca')
  .select('*', { count: 'exact', head: true })
  .not('deleted_at', 'is', null)

const { count: bcm } = await supabase
  .from('peca')
  .select('*', { count: 'exact', head: true })
  .eq('fornecedor', 'BCM Refrigeracao')

console.log(`  Ativas (deleted_at IS NULL):  ${ativas}`)
console.log(`  Soft-deletadas:               ${deletadas}`)
console.log(`  Importadas do BCM:            ${bcm}`)

// 3) Diagnostico
console.log('\n=== Diagnostico ===')
if (bcm === 0) {
  console.log('>> SQL #2 (importacao) NAO foi rodado ainda.')
  console.log(`>> Estoque atual tem ${ativas} pecas (devem ser as 459 das NF-e originais).\n`)
} else if (bcm === 680 && ativas === 680 && deletadas === 459) {
  console.log('>> IMPORTACAO 100% OK')
  console.log('>> 680 do BCM ativas + 459 antigas soft-deletadas. Esperado.\n')
} else if (bcm === 680 && ativas > 680) {
  console.log('>> BCM importado MAS as 459 antigas nao foram soft-deletadas.')
  console.log(`>> Esperava 680 ativas, achei ${ativas}.\n`)
} else {
  console.log('>> Estado inesperado:')
  console.log(`   - BCM importadas: ${bcm} (esperado 680)`)
  console.log(`   - Ativas: ${ativas} (esperado 680)`)
  console.log(`   - Soft-deletadas: ${deletadas} (esperado 459)\n`)
}

// 4) Distribuicao por categoria (se houver BCM)
if (bcm > 0) {
  console.log('=== Top 10 categorias (peças ativas) ===')
  const { data: pecasAtivas } = await supabase
    .from('peca')
    .select('categoria')
    .is('deleted_at', null)

  const contagem = {}
  for (const p of pecasAtivas ?? []) {
    contagem[p.categoria] = (contagem[p.categoria] || 0) + 1
  }
  const top = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 10)
  for (const [cat, n] of top) console.log(`  ${cat.padEnd(25)} ${n}`)
}

// 5) Amostra
console.log('\n=== Amostra das 3 primeiras pecas ativas ===')
const { data: amostraAtivas } = await supabase
  .from('peca')
  .select('nome, categoria, marca, modelo, modelos_compativeis')
  .is('deleted_at', null)
  .limit(3)

for (const p of amostraAtivas ?? []) {
  console.log(`  ${p.nome}`)
  console.log(`    cat=${p.categoria}  marca=${p.marca || '-'}  modelo=${p.modelo || '-'}`)
  if (p.modelos_compativeis) console.log(`    compat=${p.modelos_compativeis.slice(0, 80)}${p.modelos_compativeis.length > 80 ? '...' : ''}`)
}
