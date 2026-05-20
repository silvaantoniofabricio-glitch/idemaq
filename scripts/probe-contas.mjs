// Inspeciona contas bancárias e lançamentos em prod pra plugar OS→Financeiro.
// Uso: node scripts/probe-contas.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

console.log('=== Conta bancária ===\n')
const { data: contas, error: errC, count: countC } = await supabase
  .from('conta_bancaria')
  .select('id, nome, tipo, ativo, deleted_at', { count: 'exact' })
  .order('nome')

if (errC) {
  console.log('ERRO contas:', errC.message, errC.code)
} else {
  console.log(`Total (incluindo soft-deleted): ${countC}`)
  for (const c of contas) {
    const flag = c.deleted_at ? ' [DELETED]' : (c.ativo ? '' : ' [inativo]')
    console.log(`  ${c.nome.padEnd(22)} tipo=${(c.tipo || '').padEnd(12)}${flag}`)
  }
}

console.log('\n=== Lançamento financeiro ===\n')
const { data: lancs, error: errL, count: countL } = await supabase
  .from('lancamento_financeiro')
  .select('id, tipo, valor, conta_id, pago_em', { count: 'exact', head: false })
  .limit(3)

if (errL) {
  console.log('ERRO lancs:', errL.message, errL.code)
} else {
  console.log(`Total: ${countL}`)
  for (const l of lancs) {
    console.log(`  ${l.tipo.padEnd(8)} R$${String(l.valor).padStart(8)} conta=${l.conta_id || 'NULL'} pago_em=${l.pago_em || 'aberto'}`)
  }
}
