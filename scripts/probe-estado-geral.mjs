// Probe geral do estado das tabelas pra planejar import Bling.
// Usa publishable key (anon) — pode bater RLS, mas confirma schemas e contagens visíveis.
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

async function probe(label, q) {
  const r = await q
  console.log(`--- ${label} ---`)
  if (r.error) console.log('ERR:', r.error.code, r.error.message)
  else console.log('count:', r.count ?? r.data?.length, 'sample:', r.data?.[0] ? JSON.stringify(r.data[0]).slice(0, 200) : '(vazio)')
}

await probe('OS total (count)', supabase.from('os').select('*', { count: 'exact', head: true }).is('deleted_at', null))
await probe('OS TRELLO-CARD tagged', supabase.from('os').select('numero, observacoes', { count: 'exact', head: false }).ilike('observacoes', 'TRELLO-CARD:%').limit(3))
await probe('cliente total', supabase.from('cliente').select('*', { count: 'exact', head: true }).is('deleted_at', null))
await probe('peca total', supabase.from('peca').select('*', { count: 'exact', head: true }).is('deleted_at', null))
await probe('lancamento_financeiro total', supabase.from('lancamento_financeiro').select('*', { count: 'exact', head: true }).is('deleted_at', null))
await probe('conta_bancaria', supabase.from('conta_bancaria').select('id, nome, tipo', { count: 'exact', head: false }).limit(10))
await probe('os_item total', supabase.from('os_item').select('*', { count: 'exact', head: true }).is('deleted_at', null))
await probe('peca_movimentacao total', supabase.from('peca_movimentacao').select('*', { count: 'exact', head: true }).is('deleted_at', null))
