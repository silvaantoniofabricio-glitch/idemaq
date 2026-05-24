// scripts/gerar-sql-xlsx-cresol2.mjs
// Importa 3 XLSX da 2ª conta Cresol (Ag 1373, Conta 40990-1).
// Idempotente via tag CRESOL2-<data>-<valor>-<hash> em descricao (não tem FITID em XLSX).
//
// Pré-requisito: XLSX já extraídos em /tmp/xlsx_extract/ (feito via bash unzip).

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const SQL_DIR = 'C:/Users/Toni-PC/projetos/idemaq/sql'
const JSON_OUT = 'C:/Users/Toni-PC/projetos/idemaq/relatorios/cresol2-xlsx-import.json'

const FILES = [
  { name: 'extrato', label: '2024' },
  { name: 'extrato__1_', label: '2025' },
  { name: 'extrato__2_', label: '2026' },
]

// ────────── XLSX parser (manual XML) ──────────
function loadSharedStrings(dir) {
  const xml = fs.readFileSync(path.join(dir, 'xl/sharedStrings.xml'), 'utf8')
  const strs = []
  // <si>...<t>texto</t>...</si> ou <si><r>...</r></si>
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/g
  let m
  while ((m = siRegex.exec(xml))) {
    const body = m[1]
    // pega todos <t>...</t>
    const ts = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => x[1])
    strs.push(ts.join(''))
  }
  return strs
}

function decodeXmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function colLetterToIdx(letters) {
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

function parseSheet(dir, strings) {
  const xml = fs.readFileSync(path.join(dir, 'xl/worksheets/sheet1.xml'), 'utf8')
  const rows = []
  const rowRegex = /<row\s+r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g
  let rMatch
  while ((rMatch = rowRegex.exec(xml))) {
    const rowNum = parseInt(rMatch[1])
    const cellsXml = rMatch[2]
    const row = []
    const cellRegex = /<c\s+r="([A-Z]+)\d+"(?:\s+t="([^"]+)")?(?:\s+s="[^"]+")?\s*(?:\/>|>([\s\S]*?)<\/c>)/g
    let cMatch
    while ((cMatch = cellRegex.exec(cellsXml))) {
      const colIdx = colLetterToIdx(cMatch[1])
      const type = cMatch[2] || 'n'
      const body = cMatch[3] || ''
      const vMatch = body.match(/<v>([\s\S]*?)<\/v>/)
      let value = vMatch ? vMatch[1] : ''
      if (type === 's') {
        value = strings[parseInt(value)] || ''
      } else if (type === 'inlineStr') {
        const tMatch = body.match(/<t[^>]*>([\s\S]*?)<\/t>/)
        value = tMatch ? decodeXmlEntities(tMatch[1]) : ''
      }
      row[colIdx] = decodeXmlEntities(value)
    }
    rows[rowNum - 1] = row
  }
  return rows.filter(r => r) // remove undefined gaps
}

// ────────── Parse data row (Cresol format) ──────────
// Header: Data do Lançamento | Histórico | Documento | Tipo? | Crédito | Débito | Saldo
function parseValorBR(s) {
  if (!s) return null
  const cleaned = String(s).replace(/[R$\s.]/g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseDataBR(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

// ────────── Processa cada arquivo ──────────
const todosLancamentos = []
const dedupSet = new Set()

for (const { name, label } of FILES) {
  const dir = `C:/Users/Toni-PC/projetos/idemaq/tmp/${name}`
  if (!fs.existsSync(dir)) { console.log(`⚠️  ${name} não extraído`); continue }
  const strings = loadSharedStrings(dir)
  const rows = parseSheet(dir, strings)
  console.log(`📥 ${name} (${label}): ${rows.length} linhas brutas`)

  // XLSX Cresol não tem header — dados direto. Colunas fixas:
  // 0=Data 1=Histórico 2=Documento 3=Tipo(Crédito/Débito) 4=Valor 5=Saldo
  let novos = 0, ignorados = 0
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.length === 0) continue
    const data = parseDataBR(r[0])
    if (!data) { ignorados++; continue }
    const historico = r[1] || ''
    if (/Saldo do Dia/i.test(historico)) { continue } // pular linhas de saldo
    const documento = r[2] || ''
    const tipoStr = (r[3] || '').toString().toLowerCase()
    const valorAbs = Math.abs(parseValorBR(r[4]) ?? 0)
    if (!valorAbs) { ignorados++; continue }

    let tipo
    if (/cr[eé]dito/i.test(tipoStr)) tipo = 'receita'
    else if (/d[eé]bito/i.test(tipoStr)) tipo = 'despesa'
    else { ignorados++; continue }
    const valor = valorAbs

    // Dedupe key (não tem FITID): data + valor + hash do historico
    const dedupHash = crypto.createHash('md5').update(`${data}|${valor}|${historico}|${documento}`).digest('hex').slice(0, 16)
    if (dedupSet.has(dedupHash)) continue
    dedupSet.add(dedupHash)

    todosLancamentos.push({ data, tipo, valor, historico: historico.slice(0, 200), documento, dedupHash })
    novos++
  }
  console.log(`  ✅ ${novos} novos, ${ignorados} ignorados`)
}

console.log(`\n✨ Total único: ${todosLancamentos.length}`)
const somaRec = todosLancamentos.filter(l => l.tipo === 'receita').reduce((s, l) => s + l.valor, 0)
const somaDesp = todosLancamentos.filter(l => l.tipo === 'despesa').reduce((s, l) => s + l.valor, 0)
console.log(`💰 Receitas: ${todosLancamentos.filter(l => l.tipo === 'receita').length} = R$ ${somaRec.toFixed(2)}`)
console.log(`💸 Despesas: ${todosLancamentos.filter(l => l.tipo === 'despesa').length} = R$ ${somaDesp.toFixed(2)}`)

todosLancamentos.sort((a, b) => a.data.localeCompare(b.data))

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true })
fs.writeFileSync(JSON_OUT, JSON.stringify({
  total: todosLancamentos.length,
  receitas_soma: somaRec,
  despesas_soma: somaDesp,
  primeira: todosLancamentos[0]?.data,
  ultima: todosLancamentos.at(-1)?.data,
  amostra: todosLancamentos.slice(0, 8),
}, null, 2))

// ────────── Categorização heurística ──────────
function categorizar(historico, tipo) {
  const h = (historico || '').toUpperCase()
  if (tipo === 'receita') {
    if (/PIX/.test(h)) return 'Vendas de serviços'
    if (/TED|DOC|TRANSFER/.test(h)) return 'Transferência recebida'
    if (/DEPOSITO|CRED/.test(h)) return 'Depósito'
    return 'Receita diversa'
  }
  if (/IOF|TARIFA|JUROS|CESTA|ANUID|MANUT/.test(h)) return 'Taxas bancárias'
  if (/PIX/.test(h)) return 'PIX enviado'
  if (/PAGTO|PAGAMENTO|TED|DOC/.test(h)) return 'Pagamento'
  if (/ENCARGOS|LIMITE/.test(h)) return 'Encargos bancários'
  if (/SAQUE/.test(h)) return 'Saque'
  return 'Despesa diversa'
}

function formaPagamento(historico) {
  const h = (historico || '').toUpperCase()
  if (/PIX/.test(h)) return 'pix'
  if (/TED|DOC|TRANSFER/.test(h)) return 'transferencia'
  if (/DEBITO/.test(h)) return 'debito'
  return null
}

function sqlEscape(s) { return s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'" }

// ────────── Gera SQL — dividido em 3 arquivos pra evitar truncamento (>100KB) ──────────
function writeFile(name, content) {
  const p = `${SQL_DIR}/${name}`
  fs.writeFileSync(p, content)
  console.log(`📜 ${name} (${(fs.statSync(p).size/1024).toFixed(1)} KB)`)
}

function gerarBatchInsert(slice, batchNum, totalBatches) {
  const out = []
  out.push(`-- batch ${batchNum}/${totalBatches} (${slice.length} linhas)`)
  out.push(`WITH`)
  out.push(`  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Cresol 2 (40990-1)' LIMIT 1),`)
  out.push(`  novos (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento) AS (`)
  out.push(`    VALUES`)
  out.push(slice.map(l => {
    const cat = categorizar(l.historico, l.tipo)
    const forma = formaPagamento(l.historico)
    const desc = `CRESOL2-${l.dedupHash} ${l.historico}`.slice(0, 400)
    return `      (${sqlEscape(l.tipo)}, ${l.valor.toFixed(2)}::numeric, ${sqlEscape(cat)}, ${sqlEscape(desc)}, ${sqlEscape(l.data)}::date, ${sqlEscape(l.data)}::date, ${sqlEscape(forma)})`
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

// 3 arquivos: 24a (header + 1/3), 24b (2/3), 24c (3/3 + verificação)
const HEADER = [
  `-- sql/24X-cresol2-xlsx-import.sql`,
  `-- Importa ${todosLancamentos.length} transações da Cresol 2ª conta (Ag 1373, Conta 40990-1).`,
  `-- Período: ${todosLancamentos[0]?.data} → ${todosLancamentos.at(-1)?.data}`,
  `-- Receitas: R$ ${somaRec.toFixed(2)} · Despesas: R$ ${somaDesp.toFixed(2)}`,
  `-- Idempotente via tag CRESOL2-<hash16> em descricao.`,
  ``,
].join('\n')

const BATCH = 150
const totalBatches = Math.ceil(todosLancamentos.length / BATCH)
const partSize = Math.ceil(totalBatches / 3) // 3 arquivos

const batches = []
for (let i = 0; i < todosLancamentos.length; i += BATCH) {
  batches.push(gerarBatchInsert(todosLancamentos.slice(i, i + BATCH), Math.floor(i/BATCH)+1, totalBatches))
}

// 24a: setup conta + 1ª parte
const a = []
a.push(HEADER.replace('24X', '24a'))
a.push(`-- PARTE 1/3: cria conta + insere ${partSize} batches`)
a.push(`INSERT INTO conta_bancaria (nome, tipo)`)
a.push(`SELECT 'Cresol 2 (40990-1)', 'banco'`)
a.push(`WHERE NOT EXISTS (SELECT 1 FROM conta_bancaria WHERE nome = 'Cresol 2 (40990-1)');`)
a.push(``)
a.push(batches.slice(0, partSize).join('\n'))
a.push(`SELECT COUNT(*) FILTER (WHERE descricao LIKE 'CRESOL2-%') AS cresol2_parcial_1 FROM lancamento_financeiro;`)
writeFile('24a-cresol2-xlsx-1.sql', a.join('\n'))

// 24b
const b = []
b.push(HEADER.replace('24X', '24b'))
b.push(`-- PARTE 2/3`)
b.push(batches.slice(partSize, partSize * 2).join('\n'))
b.push(`SELECT COUNT(*) FILTER (WHERE descricao LIKE 'CRESOL2-%') AS cresol2_parcial_2 FROM lancamento_financeiro;`)
writeFile('24b-cresol2-xlsx-2.sql', b.join('\n'))

// 24c
const c = []
c.push(HEADER.replace('24X', '24c'))
c.push(`-- PARTE 3/3 + verificação final`)
c.push(batches.slice(partSize * 2).join('\n'))
c.push(`-- Verificação final`)
c.push(`SELECT COUNT(*) FILTER (WHERE descricao LIKE 'CRESOL2-%') AS cresol2_total,`)
c.push(`       SUM(valor) FILTER (WHERE tipo='receita' AND descricao LIKE 'CRESOL2-%') AS receitas_soma,`)
c.push(`       SUM(valor) FILTER (WHERE tipo='despesa' AND descricao LIKE 'CRESOL2-%') AS despesas_soma`)
c.push(`FROM lancamento_financeiro;`)
writeFile('24c-cresol2-xlsx-3.sql', c.join('\n'))

// Limpa o monolítico se existir
const oldMono = `${SQL_DIR}/24-cresol2-xlsx-import.sql`
if (fs.existsSync(oldMono)) { fs.unlinkSync(oldMono); console.log(`🗑️  Removido monolítico`) }

console.log(`\n✨ Rodar NA ORDEM: 24a → 24b → 24c`)
