// scripts/gerar-sql-ofx-cresol.mjs
// Importa OFX da Cresol (Conta 358510-7) em lancamento_financeiro.
// Idempotência via FITID (identificador único da transação no OFX) na descricao:
// "CRESOL-FITID:<fitid> ..."
//
// Conta destino: "Cresol" (já cadastrada em sql/01-lancamento-financeiro.sql)

import fs from 'fs'
import path from 'path'

const ROOT = 'C:/Users/Toni-PC/projetos/idemaq/Base de dados clientes Bling'
const SQL_OUT = 'C:/Users/Toni-PC/projetos/idemaq/sql/21-cresol-ofx-import.sql'
const JSON_OUT = 'C:/Users/Toni-PC/projetos/idemaq/relatorios/cresol-ofx-import.json'

// ────────── Parser OFX (regex — OFX 1.x é SGML, não XML estrito) ──────────
function parseOFX(text) {
  // Extrai bloco BANKACCTFROM pra identificar conta
  const acctMatch = text.match(/<BANKID>(\d+).*?<ACCTID>(\d+)/s)
  const conta = acctMatch ? { bankid: acctMatch[1], acctid: acctMatch[2] } : null

  // Extrai cada STMTTRN (transação)
  const txns = []
  const blocks = text.split(/<STMTTRN>/i).slice(1)
  for (const b of blocks) {
    const endIdx = b.search(/<\/STMTTRN>/i)
    if (endIdx === -1) continue
    const body = b.slice(0, endIdx)

    const get = (tag) => {
      const m = body.match(new RegExp(`<${tag}>([^<\\n]*?)(?:\\n|<|$)`, 'i'))
      return m ? m[1].trim() : null
    }

    const tipo = get('TRNTYPE')
    const dt = get('DTPOSTED')
    const valor = get('TRNAMT')
    const fitid = get('FITID')
    const memo = get('MEMO')
    const checknum = get('CHECKNUM')

    if (!fitid || !valor || !dt) continue

    txns.push({
      fitid,
      tipo, // CREDIT|DEBIT
      data_iso: `${dt.slice(0,4)}-${dt.slice(4,6)}-${dt.slice(6,8)}`,
      valor: parseFloat(valor),
      memo: memo || null,
      checknum: checknum || null,
    })
  }
  return { conta, txns }
}

// ────────── Carrega TODOS os OFX ──────────
const ofxFiles = fs.readdirSync(ROOT).filter(f => f.toLowerCase().endsWith('.ofx'))
console.log(`📥 ${ofxFiles.length} arquivos OFX`)

const todasTxns = new Map() // fitid → txn (dedupe)
for (const f of ofxFiles) {
  const text = fs.readFileSync(path.join(ROOT, f), 'utf8')
  const { conta, txns } = parseOFX(text)
  let novos = 0
  for (const t of txns) {
    if (!todasTxns.has(t.fitid)) {
      todasTxns.set(t.fitid, { ...t, arquivo: f })
      novos++
    }
  }
  console.log(`  ${f}: ${txns.length} txns (${novos} novas, conta ${conta?.bankid}/${conta?.acctid})`)
}

const txns = [...todasTxns.values()].sort((a, b) => a.data_iso.localeCompare(b.data_iso))
console.log(`\n✨ Total único (dedupe por FITID): ${txns.length} transações`)

// ────────── Categorização heurística ──────────
function categorizar(memo, valor) {
  const m = (memo || '').toUpperCase()
  // Receitas (valor > 0)
  if (valor > 0) {
    if (/PIX/.test(m)) return 'Vendas de serviços'
    if (/CRED.*TED|CRED.*DOC|TRANSFER/.test(m)) return 'Transferência recebida'
    if (/DEPOSITO|CRED.*ESPEC|DINH/.test(m)) return 'Depósito'
    if (/EMPREST|FINANC/.test(m)) return 'Empréstimo'
    return 'Receita diversa'
  }
  // Despesas (valor < 0)
  if (/IOF|TARIFA|JUROS|CESTA|ANUID|SERV/.test(m)) return 'Taxas bancárias'
  if (/PIX/.test(m)) return 'PIX enviado'
  if (/PAGAMENTO|TED|DOC/.test(m)) return 'Pagamento'
  if (/ENCARGOS|LIMITE/.test(m)) return 'Encargos bancários'
  return 'Despesa diversa'
}

function forma(memo) {
  const m = (memo || '').toUpperCase()
  if (/PIX/.test(m)) return 'pix'
  if (/TED|DOC|TRANSFER/.test(m)) return 'transferencia'
  if (/DEBITO|DEBIT/.test(m)) return 'debito'
  if (/CREDITO|CREDIT/.test(m)) return 'credito_1x'
  return null
}

// ────────── Gera SQL ──────────
function sqlEscape(s) { return s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'" }

const lancamentos = txns.map(t => ({
  fitid: t.fitid,
  tipo: t.valor > 0 ? 'receita' : 'despesa',
  valor: Math.abs(t.valor),
  categoria: categorizar(t.memo, t.valor),
  descricao: `CRESOL-FITID:${t.fitid} ${(t.memo || '').slice(0, 200)}`.trim(),
  vencimento: t.data_iso,
  pago_em: t.data_iso, // OFX = caixa real, já liquidado
  forma_pagamento: forma(t.memo),
}))

const somaRec = lancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
const somaDesp = lancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
console.log(`💰 Receitas: ${lancamentos.filter(l => l.tipo === 'receita').length} = R$ ${somaRec.toFixed(2)}`)
console.log(`💸 Despesas: ${lancamentos.filter(l => l.tipo === 'despesa').length} = R$ ${somaDesp.toFixed(2)}`)

// JSON pra revisão
const distCat = {}
lancamentos.forEach(l => { distCat[l.categoria] = (distCat[l.categoria] || 0) + 1 })
fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true })
fs.writeFileSync(JSON_OUT, JSON.stringify({
  total: lancamentos.length,
  receitas: { count: lancamentos.filter(l => l.tipo === 'receita').length, soma: somaRec },
  despesas: { count: lancamentos.filter(l => l.tipo === 'despesa').length, soma: somaDesp },
  por_categoria: Object.entries(distCat).sort((a,b) => b[1]-a[1]),
  primeira_data: lancamentos[0]?.vencimento,
  ultima_data: lancamentos.at(-1)?.vencimento,
  amostra: lancamentos.slice(0, 10),
}, null, 2))
console.log(`📄 JSON: ${JSON_OUT}`)

const sql = []
sql.push(`-- ============================================================`)
sql.push(`-- sql/21-cresol-ofx-import.sql`)
sql.push(`-- Importa ${lancamentos.length} transações da Cresol (Conta 358510-7)`)
sql.push(`-- de ${lancamentos[0]?.vencimento} a ${lancamentos.at(-1)?.vencimento}`)
sql.push(`-- Receitas: R$ ${somaRec.toFixed(2)} · Despesas: R$ ${somaDesp.toFixed(2)}`)
sql.push(`-- Idempotente via tag CRESOL-FITID:<id> na descricao`)
sql.push(`-- ============================================================`)
sql.push(``)
sql.push(`BEGIN;`)
sql.push(``)
sql.push(`-- Garante conta Cresol existe (já criada em sql/01, mas seguro)`)
sql.push(`INSERT INTO conta_bancaria (nome, tipo)`)
sql.push(`SELECT 'Cresol', 'banco'`)
sql.push(`WHERE NOT EXISTS (SELECT 1 FROM conta_bancaria WHERE nome = 'Cresol');`)
sql.push(``)

const BATCH = 200
for (let i = 0; i < lancamentos.length; i += BATCH) {
  const slice = lancamentos.slice(i, i + BATCH)
  sql.push(`-- batch ${Math.floor(i/BATCH)+1}/${Math.ceil(lancamentos.length/BATCH)} (${slice.length} linhas)`)
  sql.push(`WITH`)
  sql.push(`  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' LIMIT 1),`)
  sql.push(`  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (`)
  sql.push(`    VALUES`)
  sql.push(slice.map(l => `      (${sqlEscape(l.tipo)}, ${l.valor.toFixed(2)}::numeric, ${sqlEscape(l.categoria)}, ${sqlEscape(l.descricao)}, ${sqlEscape(l.vencimento)}::date, ${sqlEscape(l.pago_em)}::date, ${sqlEscape(l.forma_pagamento)})`).join(',\n'))
  sql.push(`  )`)
  sql.push(`INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)`)
  sql.push(`SELECT n.tipo, n.valor, n.categoria, n.descricao, n.vencimento, n.pago_em, n.forma_pagamento, c.id`)
  sql.push(`FROM novos n CROSS JOIN conta_cte c`)
  sql.push(`WHERE NOT EXISTS (`)
  sql.push(`  SELECT 1 FROM lancamento_financeiro lf`)
  sql.push(`  WHERE lf.descricao LIKE split_part(n.descricao, ' ', 1) || '%'`)
  sql.push(`);`)
  sql.push(``)
}

sql.push(`-- Verificação`)
sql.push(`SELECT COUNT(*) FILTER (WHERE descricao LIKE 'CRESOL-FITID:%') AS cresol_importados,`)
sql.push(`       SUM(valor) FILTER (WHERE tipo='receita' AND descricao LIKE 'CRESOL-FITID:%') AS cresol_receitas,`)
sql.push(`       SUM(valor) FILTER (WHERE tipo='despesa' AND descricao LIKE 'CRESOL-FITID:%') AS cresol_despesas`)
sql.push(`FROM lancamento_financeiro;`)
sql.push(``)
sql.push(`COMMIT;`)

fs.writeFileSync(SQL_OUT, sql.join('\n'))
const sz = (fs.statSync(SQL_OUT).size / 1024).toFixed(1)
console.log(`📜 SQL: ${SQL_OUT} (${sz} KB)`)
