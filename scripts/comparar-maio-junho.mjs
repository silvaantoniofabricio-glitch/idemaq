// Compara PF maio vs junho 2026 por categoria
// Uso: node scripts/comparar-maio-junho.mjs

import { DESPESAS_PF_POR_MES } from '../src/data/controleFinanceiroPF.js'

const FLUXO_INTERNO = new Set(['Transferencia', 'Cartao'])

function totaisPorCategoria(lista) {
  const map = {}
  for (const d of lista) {
    if (FLUXO_INTERNO.has(d.categoria)) continue
    map[d.categoria] = (map[d.categoria] || 0) + d.valor
  }
  return map
}

function fmt(v) {
  return `R$ ${v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

const maio  = DESPESAS_PF_POR_MES['2026-05']?.total || []
const junho = DESPESAS_PF_POR_MES['2026-06']?.total || []

const catMaio  = totaisPorCategoria(maio)
const catJunho = totaisPorCategoria(junho)

const todasCats = new Set([...Object.keys(catMaio), ...Object.keys(catJunho)])

const linhas = []
for (const cat of todasCats) {
  const m = catMaio[cat] || 0
  const j = catJunho[cat] || 0
  const diff = j - m
  const pct = m > 0 ? ((diff / m) * 100).toFixed(0) : (j > 0 ? '+inf' : '0')
  linhas.push({ cat, m, j, diff, pct })
}

// Ordena por maior diferença absoluta
linhas.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

console.log('\n=== COMPARAÇÃO PF CASAL: MAIO vs JUNHO 2026 ===\n')
console.log(`${'CATEGORIA'.padEnd(22)} ${'MAIO'.padStart(12)} ${'JUNHO'.padStart(12)} ${'DIFERENÇA'.padStart(13)} ${'VAR%'.padStart(7)}`)
console.log('─'.repeat(70))

for (const { cat, m, j, diff, pct } of linhas) {
  const sinal = diff > 0 ? '+' : ''
  const flag = Math.abs(diff) > 500 ? ' ⚠' : (Math.abs(diff) > 200 ? ' ↑' : '')
  console.log(
    `${cat.padEnd(22)} ${fmt(m).padStart(12)} ${fmt(j).padStart(12)} ${(sinal + fmt(diff)).padStart(13)} ${(sinal + pct + '%').padStart(7)}${flag}`
  )
}

const totalMaio  = linhas.reduce((s, l) => s + l.m, 0)
const totalJunho = linhas.reduce((s, l) => s + l.j, 0)
console.log('─'.repeat(70))
console.log(`${'TOTAL'.padEnd(22)} ${fmt(totalMaio).padStart(12)} ${fmt(totalJunho).padStart(12)} ${(totalJunho > totalMaio ? '+' : '') + fmt(totalJunho - totalMaio).padStart(13)}`)

console.log('\n=== ITENS PRESENTES SÓ EM MAIO ===')
linhas.filter(l => l.j === 0).forEach(l => console.log(`  ${l.cat}: ${fmt(l.m)}`))

console.log('\n=== CATEGORIAS NOVAS EM JUNHO (ausentes em maio) ===')
linhas.filter(l => l.m === 0).forEach(l => console.log(`  ${l.cat}: ${fmt(l.j)}`))
