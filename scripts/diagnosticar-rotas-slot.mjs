// Mostra TODAS as rotas das últimas 5 datas. Útil pra entender em qual data
// o front está criando os slots e quais nomes existem.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

console.log('=== Últimas rotas no Supabase (até 5 datas) ===\n')

const { data, error } = await supabase
  .from('rota')
  .select('id, data, nome, paradas, status, motorista_id, criado_em, deleted_at')
  .is('deleted_at', null)
  .order('data', { ascending: false })
  .order('nome', { ascending: true, nullsFirst: false })
  .limit(50)

if (error) {
  console.log('ERRO:', error.message)
  process.exit(1)
}

if (!data || data.length === 0) {
  console.log('Nenhuma rota no banco.')
  process.exit(0)
}

let dataAnterior = null
for (const r of data) {
  if (r.data !== dataAnterior) {
    console.log(`\n📅 ${r.data}`)
    dataAnterior = r.data
  }
  const n = Array.isArray(r.paradas) ? r.paradas.length : 0
  const mot = r.motorista_id ? r.motorista_id.slice(0, 8) : '∅'
  console.log(`  • ${r.nome || '(legacy)'} · ${n} parada(s) · status=${r.status} · motorista=${mot} · criado=${r.criado_em?.slice(0, 19) || '?'}`)
  if (n > 0) {
    for (const p of r.paradas) {
      console.log(`    - ordem=${p.ordem} tipo=${p.tipo} os=${p.os_num ?? '∅'} cliente="${p.cliente_nome ?? '∅'}" lat/lng=${p.lat ?? '∅'}/${p.lng ?? '∅'}`)
    }
  }
}
