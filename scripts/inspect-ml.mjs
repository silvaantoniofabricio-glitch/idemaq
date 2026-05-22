import fs from 'fs'

function parseCsv(texto) {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.length > 0)
  const header = parseLine(linhas[0])
  const rows = []
  for (let i = 1; i < linhas.length; i++) {
    const valores = parseLine(linhas[i])
    const obj = {}
    header.forEach((h, j) => { obj[h] = valores[j] || '' })
    rows.push(obj)
  }
  return rows
}
function parseLine(linha) {
  const out = []
  let curr = '', inQuotes = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (inQuotes && linha[i+1] === '"') { curr += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (c === ',' && !inQuotes) {
      out.push(curr); curr = ''
    } else {
      curr += c
    }
  }
  out.push(curr)
  return out
}

const rows = parseCsv(fs.readFileSync('RELATORIO OUTRAS LOJAS/COMPRAS ML/compras_EMPRESA.csv', 'utf8'))
console.log('Total compras EMPRESA:', rows.length)
console.log('Header amostra:', Object.keys(rows[0]))
console.log()

const groups = new Map()
for (const r of rows) {
  const n = (r['Numero da Compra'] || '').trim()
  if (!groups.has(n)) groups.set(n, [])
  groups.get(n).push(r)
}
const multis = [...groups.entries()].filter(([k,v]) => v.length >= 2 && k.length > 0)
console.log('Pedidos com 2+ itens:', multis.length)
console.log('Pedidos unicos:', groups.size)
console.log()

for (const [num, items] of multis.slice(0, 4)) {
  console.log(`Pedido ${num} — ${items.length} itens`)
  for (const it of items) {
    console.log(`  ${it['Valor Total']?.padStart(10)} | ${it['Data da Compra']} | ${(it['Item Comprado']||'').slice(0,70)}`)
  }
  console.log()
}
