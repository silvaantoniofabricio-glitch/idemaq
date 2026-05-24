// scripts/gerar-sql-bling-financeiro.mjs
// Gera SQL idempotente pra importar contas_receber.csv + contas_pagar.csv do Bling
// em `lancamento_financeiro`. Idempotência via tag "BLING-REC:<ID>" / "BLING-PAG:<ID>"
// no campo `descricao`. Conta destino: "Caixa Bling" (criada se não existir).

import fs from 'fs'
import path from 'path'

const ROOT_BLING = 'C:/Users/Toni-PC/projetos/idemaq/Base de dados clientes Bling/Nova pasta'
const SQL_OUT = 'C:/Users/Toni-PC/projetos/idemaq/sql/20-bling-financeiro-import.sql'
const JSON_OUT = 'C:/Users/Toni-PC/projetos/idemaq/relatorios/bling-financeiro-import.json'

// ────────── CSV parser ──────────
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

// ────────── Helpers ──────────
function parseDataBR(s) {
  // "19/11/2024" → "2024-11-19" (ISO)
  if (!s) return null
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function parseValor(s) {
  // "630,00" → 630.00
  if (!s) return null
  const cleaned = String(s).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function sqlEscape(s) {
  if (s == null) return 'NULL'
  return "'" + String(s).replace(/'/g, "''") + "'"
}

function mapCategoriaReceber(cat) {
  const map = {
    'Vendas de serviços': 'Vendas de serviços',
    'Vendas de produtos': 'Vendas de produtos',
    'Vendas de mercadorias': 'Vendas de mercadorias',
    '': 'Outros',
  }
  return map[cat] ?? cat ?? 'Outros'
}

function mapCategoriaPagar(cat) {
  // Mantém categorias originais — convencional, já legíveis
  return cat || 'Outros'
}

function mapFormaPagamento(f) {
  if (!f) return null
  const fl = f.toLowerCase().trim()
  if (fl === 'pix') return 'pix'
  if (fl === 'dinheiro') return 'dinheiro'
  if (fl === 'cartão de credito' || fl === 'cartao de credito' || fl === 'crédito' || fl === 'credito') return 'credito_1x'
  if (fl === 'cartão de débito' || fl === 'cartao de debito' || fl === 'débito' || fl === 'debito') return 'debito'
  if (fl === 'boleto') return 'boleto'
  if (fl === 'transferência bancária' || fl === 'transferencia bancaria' || fl === 'transferência' || fl === 'transferencia') return 'transferencia'
  return f.toLowerCase().replace(/\s+/g, '_')
}

// ────────── Carga ──────────
const receber = parseCSV(fs.readFileSync(path.join(ROOT_BLING, 'contas_receber.csv'), 'utf8'))
const pagar = parseCSV(fs.readFileSync(path.join(ROOT_BLING, 'contas_pagar.csv'), 'utf8'))

console.log(`📥 contas_receber: ${receber.length} linhas`)
console.log(`📤 contas_pagar:   ${pagar.length} linhas`)

// ────────── Processa ──────────
const stats = {
  receber: { total: receber.length, valido: 0, ignorado: 0, soma: 0 },
  pagar: { total: pagar.length, valido: 0, ignorado: 0, soma: 0 },
}

const lancamentosReceber = []
const ignoradosRec = []
for (const r of receber) {
  const id = r['ID']?.trim()
  const valor = parseValor(r['Valor documento'])
  const valorRecebido = parseValor(r['Valor recebido'])
  const vencimento = parseDataBR(r['Data vencimento'])
  const liquidacao = parseDataBR(r['Data liquidação'])
  const situacao = r['Situação']?.trim()

  if (!id || valor == null || !vencimento) {
    ignoradosRec.push({ id, motivo: !id ? 'sem ID' : valor == null ? 'sem valor' : 'sem data vencimento', raw: r })
    stats.receber.ignorado++
    continue
  }

  const pagoEm = (situacao === 'pago' && liquidacao) ? liquidacao : null

  lancamentosReceber.push({
    bling_id: id,
    tipo: 'receita',
    valor: pagoEm ? (valorRecebido ?? valor) : valor,
    categoria: mapCategoriaReceber(r['Categoria']),
    descricao: `BLING-REC:${id} ${r['Cliente'] || ''} ${r['Histórico'] || ''}`.trim(),
    vencimento,
    pago_em: pagoEm,
    forma_pagamento: mapFormaPagamento(r['Forma pagamento']),
    cliente: r['Cliente'] || null,
    historico: r['Histórico'] || null,
    cpf_cnpj: r['CPF/CNPJ'] || null,
    situacao,
  })
  stats.receber.valido++
  stats.receber.soma += lancamentosReceber.at(-1).valor
}

const lancamentosPagar = []
const ignoradosPag = []
for (const r of pagar) {
  const id = r['ID']?.trim()
  const valor = parseValor(r['Valor documento'])
  const valorPago = parseValor(r['Valor pago'])
  const vencimento = parseDataBR(r['Data vencimento'])
  const liquidacao = parseDataBR(r['Data liquidação'])
  const situacao = r['Situação']?.trim()

  if (!id || valor == null || !vencimento) {
    ignoradosPag.push({ id, motivo: !id ? 'sem ID' : valor == null ? 'sem valor' : 'sem data vencimento', raw: r })
    stats.pagar.ignorado++
    continue
  }

  const pagoEm = (situacao === 'pago' && liquidacao) ? liquidacao : null

  lancamentosPagar.push({
    bling_id: id,
    tipo: 'despesa',
    valor: pagoEm ? (valorPago ?? valor) : valor,
    categoria: mapCategoriaPagar(r['Categoria']),
    descricao: `BLING-PAG:${id} ${r['Fornecedor'] || ''} ${r['Histórico'] || ''}`.trim(),
    vencimento,
    pago_em: pagoEm,
    forma_pagamento: mapFormaPagamento(r['Forma pagamento']),
    fornecedor: r['Fornecedor'] || null,
    historico: r['Histórico'] || null,
    cpf_cnpj: r['CPF/CNPJ'] || null,
    situacao,
  })
  stats.pagar.valido++
  stats.pagar.soma += lancamentosPagar.at(-1).valor
}

console.log(`✅ Receber válidos: ${stats.receber.valido} (R$ ${stats.receber.soma.toFixed(2)})`)
console.log(`✅ Pagar válidos:   ${stats.pagar.valido} (R$ ${stats.pagar.soma.toFixed(2)})`)
console.log(`⚠️  Ignorados rec: ${stats.receber.ignorado} · pag: ${stats.pagar.ignorado}`)

// ────────── JSON pra revisão ──────────
fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true })
fs.writeFileSync(JSON_OUT, JSON.stringify({
  stats,
  ignoradosRec: ignoradosRec.slice(0, 50),
  ignoradosPag: ignoradosPag.slice(0, 50),
  sampleRec: lancamentosReceber.slice(0, 5),
  samplePag: lancamentosPagar.slice(0, 5),
  totalRec: lancamentosReceber.length,
  totalPag: lancamentosPagar.length,
}, null, 2))
console.log(`📄 JSON review: ${JSON_OUT}`)

// ────────── Gera SQL ──────────
function lancamentoToValuesRow(l) {
  return `  (
    ${sqlEscape(l.tipo)},
    ${l.valor.toFixed(2)}::numeric,
    ${sqlEscape(l.categoria)},
    ${sqlEscape(l.descricao.slice(0, 500))},
    ${sqlEscape(l.vencimento)}::date,
    ${l.pago_em ? sqlEscape(l.pago_em) + '::date' : 'NULL::date'},
    ${sqlEscape(l.forma_pagamento)}
  )`
}

const sql = []
sql.push(`-- ============================================================`)
sql.push(`-- sql/20-bling-financeiro-import.sql`)
sql.push(`-- Importa contas_receber + contas_pagar do Bling em lancamento_financeiro.`)
sql.push(`-- Idempotente: cada lançamento tem tag "BLING-REC:<ID>" ou "BLING-PAG:<ID>"`)
sql.push(`-- no campo descricao; INSERT só roda WHERE NOT EXISTS.`)
sql.push(`--`)
sql.push(`-- Total: ${lancamentosReceber.length} receitas + ${lancamentosPagar.length} despesas`)
sql.push(`-- Soma: R$ ${stats.receber.soma.toFixed(2)} (rec) + R$ ${stats.pagar.soma.toFixed(2)} (pag)`)
sql.push(`-- ============================================================`)
sql.push(``)
sql.push(`BEGIN;`)
sql.push(``)
sql.push(`-- 1. Garante que a conta "Caixa Bling" existe`)
sql.push(`INSERT INTO conta_bancaria (nome, tipo)`)
sql.push(`SELECT 'Caixa Bling', 'banco'`)
sql.push(`WHERE NOT EXISTS (SELECT 1 FROM conta_bancaria WHERE nome = 'Caixa Bling');`)
sql.push(``)

// Função geradora de bloco INSERT idempotente em batch de N
// Sintaxe: WITH cte1 AS (...), cte2 AS (...) INSERT INTO ... SELECT ... FROM ... WHERE NOT EXISTS (...)
function gerarBlocoInsert(lista, nomeBatch) {
  const out = []
  const BATCH = 200
  for (let i = 0; i < lista.length; i += BATCH) {
    const slice = lista.slice(i, i + BATCH)
    out.push(`-- ${nomeBatch} — batch ${Math.floor(i/BATCH)+1}/${Math.ceil(lista.length/BATCH)} (${slice.length} linhas)`)
    out.push(`WITH`)
    out.push(`  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1),`)
    out.push(`  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (`)
    out.push(`    VALUES`)
    out.push(slice.map(lancamentoToValuesRow).join(',\n'))
    out.push(`  )`)
    out.push(`INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)`)
    out.push(`SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id`)
    out.push(`FROM novos n CROSS JOIN conta_cte c`)
    out.push(`WHERE NOT EXISTS (`)
    out.push(`  SELECT 1 FROM lancamento_financeiro lf`)
    out.push(`  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'`)
    out.push(`);`)
    out.push(``)
  }
  return out.join('\n')
}

sql.push(`-- ============================================================`)
sql.push(`-- 2. INSERT contas a receber (${lancamentosReceber.length})`)
sql.push(`-- ============================================================`)
sql.push(gerarBlocoInsert(lancamentosReceber, 'CONTAS A RECEBER'))

sql.push(`-- ============================================================`)
sql.push(`-- 3. INSERT contas a pagar (${lancamentosPagar.length})`)
sql.push(`-- ============================================================`)
sql.push(gerarBlocoInsert(lancamentosPagar, 'CONTAS A PAGAR'))

sql.push(`-- ============================================================`)
sql.push(`-- 4. Verificação`)
sql.push(`-- ============================================================`)
sql.push(`SELECT`)
sql.push(`  COUNT(*) FILTER (WHERE descricao LIKE 'BLING-REC:%') AS receitas_bling,`)
sql.push(`  COUNT(*) FILTER (WHERE descricao LIKE 'BLING-PAG:%') AS despesas_bling,`)
sql.push(`  SUM(valor) FILTER (WHERE descricao LIKE 'BLING-REC:%') AS soma_receitas,`)
sql.push(`  SUM(valor) FILTER (WHERE descricao LIKE 'BLING-PAG:%') AS soma_despesas`)
sql.push(`FROM lancamento_financeiro;`)
sql.push(``)
sql.push(`COMMIT;`)

fs.writeFileSync(SQL_OUT, sql.join('\n'))
const sqlSize = (fs.statSync(SQL_OUT).size / 1024).toFixed(1)
console.log(`📜 SQL: ${SQL_OUT} (${sqlSize} KB)`)

console.log(`\n✨ Pronto. Próximo passo: Toni revisa o JSON, cola o SQL no Supabase SQL Editor.`)
