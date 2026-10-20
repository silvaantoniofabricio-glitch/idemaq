import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

// Busca batidas de julho, agosto e setembro 2026
const { data, error } = await sb
  .from('ponto_registro')
  .select('id, tipo, bateu_em, deleted_at, funcionario:funcionario_id(apelido, papel)')
  .gte('bateu_em', '2026-07-01T00:00:00')
  .lte('bateu_em', '2026-09-30T23:59:59')
  .is('deleted_at', null)
  .order('bateu_em')

if (error) { console.error(error); process.exit(1) }

const UTC_OFFSET = -4

function toLocal(iso) {
  const d = new Date(iso)
  return new Date(d.getTime() + UTC_OFFSET * 3600 * 1000)
}
function diaIso(iso) { return toLocal(iso).toISOString().slice(0, 10) }
function hora(iso) { return toLocal(iso).toISOString().slice(11, 16) }
function toMin(h) { const [hh, mm] = h.split(':').map(Number); return hh * 60 + mm }
function fromMin(m) { const h = Math.floor(m/60); const mm = m%60; return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}` }

const ale = data.filter(b => b.funcionario?.papel === 'logistica')
const gui = data.filter(b => b.funcionario?.papel === 'oficina')

// Dias a ignorar nos cálculos (os próprios dias problemáticos + feriado)
const diasIgnorarAle = new Set(['2026-09-11','2026-09-07','2026-08-27','2026-07-21'])
const diasIgnorarGui = new Set(['2026-09-04','2026-09-09','2026-09-12','2026-09-16','2026-09-18','2026-09-23','2026-09-24','2026-09-25','2026-09-28'])

function calcMedia(registros, papel, meses, tipos, diasIgnorar) {
  // meses = array de prefixos '2026-09', etc
  const acc = {}
  for (const tipo of tipos) acc[tipo] = []

  for (const b of registros) {
    const dia = diaIso(b.bateu_em)
    const mes = dia.slice(0, 7)
    if (!meses.includes(mes)) continue
    if (diasIgnorar.has(dia)) continue
    const dow = new Date(dia + 'T12:00:00').getDay()
    const ehSab = dow === 6
    if (b.tipo === 'entrada' || b.tipo === 'saida_almoco' || b.tipo === 'volta_almoco' || b.tipo === 'saida') {
      if (tipos.includes(b.tipo)) {
        acc[b.tipo].push({ hora: hora(b.bateu_em), min: toMin(hora(b.bateu_em)), dia, ehSab })
      }
    }
  }
  return acc
}

function mediaComCap(lista, base, cap = 10) {
  if (!lista || lista.length === 0) return null
  const avg = Math.round(lista.reduce((s, x) => s + x.min, 0) / lista.length)
  const baseMin = toMin(base)
  const diff = avg - baseMin
  const capped = diff > cap ? baseMin + cap : avg
  return { avg: fromMin(avg), capped: fromMin(capped), n: lista.length, usouCap: diff > cap }
}

console.log('=== ALESSANDRO ===\n')
// Setembro (para 11/09 entrada, 7/9 feriado) e Agosto (27/8 saída) e Julho (21/7 saída)
const aleTypes = ['entrada', 'saida_almoco', 'volta_almoco', 'saida']

const aleSet = calcMedia(ale, 'logistica', ['2026-07','2026-08','2026-09'], aleTypes, diasIgnorarAle)

// Mostrar por mês separado
for (const mes of ['2026-07','2026-08','2026-09']) {
  const set = calcMedia(ale, 'logistica', [mes], aleTypes, diasIgnorarAle)
  console.log(`-- ${mes}`)
  for (const tipo of aleTypes) {
    const lista = set[tipo]
    if (!lista.length) continue
    // base por tipo
    const base = tipo === 'entrada' ? '08:00' : tipo === 'saida_almoco' ? '11:00' : tipo === 'volta_almoco' ? '13:00' : '18:00'
    const r = mediaComCap(lista, base)
    const flag = r.usouCap ? ' ← CAPEADO' : ''
    console.log(`  ${tipo.padEnd(14)} avg=${r.avg}  usado=${r.capped}  (n=${r.n})${flag}`)
  }
}

// Mostrar batidas no dia do feriado 7/9
const aleSet7set = ale.filter(b => diaIso(b.bateu_em) === '2026-09-07')
console.log('\n-- Batidas do Alessandro em 07/09 (feriado):')
if (aleSet7set.length === 0) console.log('  nenhuma')
else aleSet7set.forEach(b => console.log(`  ${hora(b.bateu_em)} ${b.tipo}  #${b.id.slice(0,8)}`))

// Batidas do Alessandro em 11/9
const aleSet11set = ale.filter(b => diaIso(b.bateu_em) === '2026-09-11')
console.log('\n-- Batidas do Alessandro em 11/09:')
if (aleSet11set.length === 0) console.log('  nenhuma')
else aleSet11set.forEach(b => console.log(`  ${hora(b.bateu_em)} ${b.tipo}  #${b.id.slice(0,8)}`))

// Batidas do Alessandro em 27/8
const aleSet27ago = ale.filter(b => diaIso(b.bateu_em) === '2026-08-27')
console.log('\n-- Batidas do Alessandro em 27/08:')
if (aleSet27ago.length === 0) console.log('  nenhuma')
else aleSet27ago.forEach(b => console.log(`  ${hora(b.bateu_em)} ${b.tipo}  #${b.id.slice(0,8)}`))

// Batidas do Alessandro em 21/7
const aleSet21jul = ale.filter(b => diaIso(b.bateu_em) === '2026-07-21')
console.log('\n-- Batidas do Alessandro em 21/07:')
if (aleSet21jul.length === 0) console.log('  nenhuma')
else aleSet21jul.forEach(b => console.log(`  ${hora(b.bateu_em)} ${b.tipo}  #${b.id.slice(0,8)}`))

console.log('\n\n=== GUILHERME ===\n')
const guiTypes = ['entrada', 'saida_almoco', 'volta_almoco', 'saida']

for (const mes of ['2026-09']) {
  const set = calcMedia(gui, 'oficina', [mes], guiTypes, diasIgnorarGui)
  console.log(`-- ${mes}`)
  for (const tipo of guiTypes) {
    const lista = set[tipo]
    if (!lista.length) continue
    const base = tipo === 'entrada' ? '08:00' : tipo === 'saida_almoco' ? '11:00' : tipo === 'volta_almoco' ? '13:00' : '18:00'
    const r = mediaComCap(lista, base)
    const flag = r.usouCap ? ' ← CAPEADO' : ''
    console.log(`  ${tipo.padEnd(14)} avg=${r.avg}  usado=${r.capped}  (n=${r.n})${flag}`)
  }
}

// Mostrar batidas de cada dia problemático do Guilherme
const diasGui = ['2026-09-04','2026-09-09','2026-09-12','2026-09-16','2026-09-18','2026-09-23','2026-09-24','2026-09-25','2026-09-28']
for (const dia of diasGui) {
  const batidas = gui.filter(b => diaIso(b.bateu_em) === dia)
  const dow = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(dia+'T12:00:00').getDay()]
  console.log(`\n-- Guilherme ${dia} (${dow}):`)
  if (batidas.length === 0) console.log('  nenhuma')
  else batidas.forEach(b => console.log(`  ${hora(b.bateu_em)} ${b.tipo}  #${b.id.slice(0,8)}`))
}
