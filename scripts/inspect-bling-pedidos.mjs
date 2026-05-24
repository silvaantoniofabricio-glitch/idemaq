// Inspeção dos CSVs Bling pra entender estrutura antes de gerar import.
import fs from 'fs'
import path from 'path'

const ROOT = 'C:/Users/Toni-PC/projetos/idemaq/Base de dados clientes Bling/Nova pasta'

function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.length > 0)
  const parseLine = (line) => {
    const out = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (ch === ';' && !inQ) { out.push(cur); cur = '' }
      else cur += ch
    }
    out.push(cur)
    return out
  }
  const headers = parseLine(lines[0])
  return lines.slice(1).map(l => {
    const vals = parseLine(l)
    const obj = {}
    headers.forEach((h, i) => obj[h] = vals[i] || '')
    return obj
  })
}

function summarize(file) {
  const rows = parseCSV(fs.readFileSync(path.join(ROOT, file), 'utf8'))
  return { rows, count: rows.length, cols: Object.keys(rows[0] || {}) }
}

console.log('=== pedidos_venda.csv ===')
const ped = summarize('pedidos_venda.csv')
console.log('rows:', ped.count, 'cols:', ped.cols.length)
const numPedidos = new Set(ped.rows.map(r => r['Número pedido']))
console.log('Pedidos únicos:', numPedidos.size, '(=> média', (ped.count / numPedidos.size).toFixed(2), 'produtos/pedido)')
const comTrello = ped.rows.filter(r => /trello\.com\/c\//.test(r['E-mail Comprador'])).length
console.log('Com URL Trello:', comTrello, 'de', ped.count)
const formas = {}
ped.rows.forEach(r => { const f = r['Forma Pagamento'] || '(vazio)'; formas[f] = (formas[f] || 0) + 1 })
console.log('Formas pagamento:', Object.entries(formas).sort((a,b) => b[1]-a[1]).slice(0,10))
const produtosTop = {}
ped.rows.forEach(r => { const p = r['Produto'] || '(vazio)'; produtosTop[p] = (produtosTop[p] || 0) + 1 })
console.log('Top produtos:', Object.entries(produtosTop).sort((a,b) => b[1]-a[1]).slice(0,10))

console.log('\n=== contas_receber.csv ===')
const rec = summarize('contas_receber.csv')
console.log('rows:', rec.count, 'cols:', rec.cols)
const sit = {}, cats = {}
rec.rows.forEach(r => {
  sit[r['Situação']] = (sit[r['Situação']] || 0) + 1
  cats[r['Categoria']] = (cats[r['Categoria']] || 0) + 1
})
console.log('Situações:', sit)
console.log('Categorias:', Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0,8))
const contasReceber = new Set(rec.rows.map(r => r['Conta financeira']))
console.log('Contas financeiras:', [...contasReceber])
console.log('Sample row:', JSON.stringify(rec.rows[0], null, 2))

console.log('\n=== contas_pagar.csv ===')
const pag = summarize('contas_pagar.csv')
console.log('rows:', pag.count)
const sitP = {}, catsP = {}
pag.rows.forEach(r => {
  sitP[r['Situação']] = (sitP[r['Situação']] || 0) + 1
  catsP[r['Categoria']] = (catsP[r['Categoria']] || 0) + 1
})
console.log('Situações:', sitP)
console.log('Top categorias:', Object.entries(catsP).sort((a,b) => b[1]-a[1]).slice(0,10))

console.log('\n=== caixa_bancos.csv ===')
const caixa = summarize('caixa_bancos.csv')
console.log('rows:', caixa.count, 'cols:', caixa.cols)
const tipos = {}, catsC = {}
caixa.rows.forEach(r => {
  tipos[r['Tipo']] = (tipos[r['Tipo']] || 0) + 1
  catsC[r['Categoria']] = (catsC[r['Categoria']] || 0) + 1
})
console.log('Tipos (S=Saída? E=Entrada? D=Despesa? C=Crédito?):', tipos)
console.log('Top categorias:', Object.entries(catsC).sort((a,b) => b[1]-a[1]).slice(0,10))
console.log('Sample (3 linhas):', JSON.stringify(caixa.rows.slice(0, 3), null, 2))
