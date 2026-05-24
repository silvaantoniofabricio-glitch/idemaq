// scripts/gerar-sql-cresol1-csv.mjs
// Importa 3 CSVs UUID da Cresol 1ª conta (Ag 1373, Conta 358510-7).
// Formato igual aos XLSX, mas em CSV.

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const ROOT = 'C:/Users/Toni-PC/projetos/idemaq/Base de dados clientes Bling'
const SQL_DIR = 'C:/Users/Toni-PC/projetos/idemaq/sql'
const FILES = [
  '0f1949a3-7dc6-4f8c-83a1-20ee69637944.csv',
  'e34a94de-5e1a-4531-9711-79bf425a8182.csv',
  'f83ab530-869e-4d20-b44a-793a338c66cd.csv',
]

function parseDataBR(s) {
  const m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}
function parseValorBR(s) {
  if (!s || !String(s).trim()) return null
  const cleaned = String(s).trim().replace(/[R$\s.]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}
function sqlEscape(s) { return s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'" }

const todos = []
const dedup = new Set()
for (const f of FILES) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^﻿/, '')
  const lines = text.split(/\r?\n/).filter(l => l.length > 0)
  console.log(`📥 ${f}: ${lines.length} linhas`)
  // Linha 0: cabeçalho "Extrato de:..."; Linha 1: header de colunas; Linha 2+: dados
  for (let i = 2; i < lines.length; i++) {
    const cols = lines[i].split(';')
    const data = parseDataBR(cols[0])
    if (!data) continue
    const historico = cols[1] || ''
    const documento = cols[2] || ''
    const credito = parseValorBR(cols[3])
    const debito = parseValorBR(cols[4])
    if (/^COD\. LANC\.|^Saldo do Dia/i.test(historico)) continue
    let tipo, valor
    if (credito && credito > 0) { tipo = 'receita'; valor = credito }
    else if (debito && debito > 0) { tipo = 'despesa'; valor = debito }
    else continue
    const hash = crypto.createHash('md5').update(`${data}|${valor}|${historico}|${documento}`).digest('hex').slice(0, 16)
    if (dedup.has(hash)) continue
    dedup.add(hash)
    todos.push({ data, tipo, valor, historico: historico.slice(0, 200), documento, hash })
  }
}

console.log(`\n✨ Total único: ${todos.length}`)
const rec = todos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
const desp = todos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
console.log(`💰 Receitas: ${todos.filter(l => l.tipo === 'receita').length} = R$ ${rec.toFixed(2)}`)
console.log(`💸 Despesas: ${todos.filter(l => l.tipo === 'despesa').length} = R$ ${desp.toFixed(2)}`)

todos.sort((a, b) => a.data.localeCompare(b.data))

function categorizar(h, tipo) {
  const m = (h || '').toUpperCase()
  if (tipo === 'receita') {
    if (/PIX/.test(m)) return 'Transferência PIX recebida'
    if (/CRED|DEPOSITO/.test(m)) return 'Depósito'
    return 'Receita diversa'
  }
  if (/IOF|TARIFA|ENCARGO|JUROS|MANUT/.test(m)) return 'Taxas bancárias'
  if (/PIX/.test(m)) return 'PIX enviado'
  if (/PAGTO|PAGAMENTO/.test(m)) return 'Pagamento'
  return 'Despesa diversa'
}
function forma(h) {
  if (/PIX/i.test(h)) return 'pix'
  if (/TED|DOC|TRANSFER/i.test(h)) return 'transferencia'
  return null
}

function gerarBatchInsert(slice, batchNum, totalBatches) {
  const out = []
  out.push(`-- batch ${batchNum}/${totalBatches} (${slice.length} linhas)`)
  out.push(`WITH`)
  out.push(`  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' LIMIT 1),`)
  out.push(`  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (`)
  out.push(`    VALUES`)
  out.push(slice.map(l => {
    const cat = categorizar(l.historico, l.tipo)
    const f = forma(l.historico)
    const desc = `CRESOL1-${l.hash} ${l.historico}`.slice(0, 400)
    return `      (${sqlEscape(l.tipo)}, ${l.valor.toFixed(2)}::numeric, ${sqlEscape(cat)}, ${sqlEscape(desc)}, ${sqlEscape(l.data)}::date, ${sqlEscape(l.data)}::date, ${sqlEscape(f)})`
  }).join(',\n'))
  out.push(`  )`)
  out.push(`INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)`)
  out.push(`SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id`)
  out.push(`FROM novos n CROSS JOIN conta_cte c`)
  out.push(`WHERE NOT EXISTS (`)
  out.push(`  SELECT 1 FROM lancamento_financeiro lf`)
  out.push(`  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'`)
  out.push(`);`)
  out.push(``)
  return out.join('\n')
}

const HEADER = [
  `-- sql/26X-cresol1-csv-import.sql`,
  `-- Importa ${todos.length} transações da Cresol 1ª conta (Ag 1373, Conta 358510-7).`,
  `-- Origem: 3 CSVs com nome UUID em "Base de dados clientes Bling/".`,
  `-- Receitas: R$ ${rec.toFixed(2)} · Despesas: R$ ${desp.toFixed(2)}`,
  `-- Conta destino: 'Cresol' (já existe em conta_bancaria). Tag: CRESOL1-<hash>.`,
  ``,
].join('\n')

const BATCH = 150
const totalBatches = Math.ceil(todos.length / BATCH)
const batches = []
for (let i = 0; i < todos.length; i += BATCH) {
  batches.push(gerarBatchInsert(todos.slice(i, i + BATCH), Math.floor(i/BATCH)+1, totalBatches))
}

// Provavelmente cabe em 1 arquivo, mas dividir se >95KB. Estimo ~80KB.
function writeFile(name, content) {
  const p = `${SQL_DIR}/${name}`
  fs.writeFileSync(p, content)
  console.log(`📜 ${name} (${(fs.statSync(p).size/1024).toFixed(1)} KB)`)
}

if (todos.length <= 450) {
  // 1 arquivo só
  const sql = [HEADER.replace('26X', '26')]
  sql.push(batches.join('\n'))
  sql.push(`SELECT COUNT(*) FILTER (WHERE descricao LIKE 'CRESOL1-%') AS cresol1_total,`)
  sql.push(`       SUM(valor) FILTER (WHERE tipo='receita' AND descricao LIKE 'CRESOL1-%') AS receitas,`)
  sql.push(`       SUM(valor) FILTER (WHERE tipo='despesa' AND descricao LIKE 'CRESOL1-%') AS despesas`)
  sql.push(`FROM lancamento_financeiro;`)
  writeFile('26-cresol1-csv-import.sql', sql.join('\n'))
} else {
  // 2 arquivos
  const half = Math.ceil(batches.length / 2)
  const a = [HEADER.replace('26X', '26a'), `-- PARTE 1/2`, batches.slice(0, half).join('\n'), `SELECT COUNT(*) FILTER (WHERE descricao LIKE 'CRESOL1-%') AS parcial FROM lancamento_financeiro;`]
  const b = [HEADER.replace('26X', '26b'), `-- PARTE 2/2 + verificação`, batches.slice(half).join('\n'),
    `SELECT COUNT(*) FILTER (WHERE descricao LIKE 'CRESOL1-%') AS cresol1_total,`,
    `       SUM(valor) FILTER (WHERE tipo='receita' AND descricao LIKE 'CRESOL1-%') AS receitas,`,
    `       SUM(valor) FILTER (WHERE tipo='despesa' AND descricao LIKE 'CRESOL1-%') AS despesas`,
    `FROM lancamento_financeiro;`]
  writeFile('26a-cresol1-csv-1.sql', a.join('\n'))
  writeFile('26b-cresol1-csv-2.sql', b.join('\n'))
}
