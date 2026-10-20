import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

// Busca movimentações pra etapa 'entrega' em junho/2026 via os_historico
const { data: historico, error: errH } = await supabase
  .from('os_historico')
  .select('os_id, etapa_para, data')
  .eq('etapa_para', 'entrega')
  .gte('data', '2026-06-01T00:00:00Z')
  .lt('data', '2026-07-01T00:00:00Z')
  .order('data', { ascending: true })

if (errH) {
  console.error('Erro historico:', errH)
  process.exit(1)
}

// Também busca OS com etapa=entrega e data_conclusao em junho (fallback)
const { data: osConcluidas, error: errC } = await supabase
  .from('os')
  .select(`
    id, numero, tipo, etapa,
    valor_total, pago, forma_pagamento,
    data_conclusao, atualizado_em,
    marca_equipamento, modelo_equipamento, tipo_equipamento,
    defeito_relatado,
    cliente:cliente_id(nome, telefone)
  `)
  .eq('etapa', 'entrega')
  .gte('atualizado_em', '2026-06-01T00:00:00Z')
  .is('deleted_at', null)
  .order('atualizado_em', { ascending: true })

if (errC) console.error('Err fallback:', errC)

// Se temos historico, busca detalhes das OS
let osList = []
const dataEntregaMap = {}

if (historico && historico.length > 0) {
  const osIds = [...new Set(historico.map(h => h.os_id))]
  for (const h of historico) {
    if (!dataEntregaMap[h.os_id]) dataEntregaMap[h.os_id] = h.data
  }

  const { data, error: errO } = await supabase
    .from('os')
    .select(`
      id, numero, tipo, etapa,
      valor_total, pago, forma_pagamento,
      data_conclusao, atualizado_em,
      marca_equipamento, modelo_equipamento, tipo_equipamento,
      defeito_relatado,
      cliente:cliente_id(nome, telefone)
    `)
    .in('id', osIds)
    .is('deleted_at', null)
    .order('numero', { ascending: true })

  if (errO) { console.error('Erro OS:', errO); process.exit(1) }
  osList = data || []
} else if (osConcluidas && osConcluidas.length > 0) {
  // fallback: OS com etapa=entrega atualizada em junho
  osList = osConcluidas
  for (const os of osList) dataEntregaMap[os.id] = os.atualizado_em
  console.log('(Usando fallback: OS com etapa=entrega atualizadas em junho)\n')
}

console.log(`\n=== OS Entregues em Junho/2026 ===`)
console.log(`Total: ${osList.length}\n`)

if (osList.length === 0) {
  console.log('Nenhuma OS encontrada com entrega em junho/2026.')
  console.log('\nDebug — historico rows:', historico?.length ?? 0)
  console.log('Debug — osConcluidas:', osConcluidas?.length ?? 0)
  process.exit(0)
}

let totalValor = 0
const linhas = []

for (const os of osList) {
  const dataRaw = dataEntregaMap[os.id] ?? os.atualizado_em
  const dataFmt = dataRaw
    ? new Date(dataRaw).toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba', day: '2-digit', month: '2-digit' })
    : '?'
  const valor = Number(os.valor_total ?? 0)
  totalValor += valor
  const equip = [os.marca_equipamento, os.modelo_equipamento].filter(Boolean).join(' ') || os.tipo_equipamento || '—'
  linhas.push({
    data: dataFmt,
    dataRaw,
    numero: os.numero,
    cliente: os.cliente?.nome ?? '—',
    telefone: os.cliente?.telefone ?? '',
    tipo: os.tipo ?? '—',
    equipamento: equip,
    pago: os.pago ? 'Pago' : 'A receber',
    forma: os.forma_pagamento ?? '—',
    valor
  })
}

linhas.sort((a, b) => new Date(a.dataRaw) - new Date(b.dataRaw))

const sep = '-'.repeat(110)
console.log(sep)
console.log('DT  | OS#   | CLIENTE                        | EQUIPAMENTO             | VALOR       | STATUS')
console.log(sep)
for (const l of linhas) {
  const c = l.cliente.slice(0, 28).padEnd(30)
  const e = l.equipamento.slice(0, 23).padEnd(23)
  const v = `R$ ${l.valor.toFixed(2)}`.padStart(11)
  const s = l.pago === 'Pago' ? '✓ Pago' : '⚠ A receber'
  console.log(`${l.data} | #${String(l.numero).padEnd(4)} | ${c} | ${e} | ${v} | ${s}`)
}
console.log(sep)

const pagas = linhas.filter(l => l.pago === 'Pago')
const aReceber = linhas.filter(l => l.pago !== 'Pago')
const totalPago = pagas.reduce((s, l) => s + l.valor, 0)
const totalReceber = aReceber.reduce((s, l) => s + l.valor, 0)

console.log(`\nRESUMO:`)
console.log(`  Total de OS entregues : ${linhas.length}`)
console.log(`  Pagas                 : ${pagas.length}  →  R$ ${totalPago.toFixed(2)}`)
console.log(`  A receber             : ${aReceber.length}  →  R$ ${totalReceber.toFixed(2)}`)
console.log(`  TOTAL GERAL           : R$ ${totalValor.toFixed(2)}`)
