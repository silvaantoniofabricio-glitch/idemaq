// Gera sql/14-cliente-importar-trello-restantes.sql.
//
// Cobre o que ficou de fora do sql/11:
//   A) Bucket B — cards com só telefone no Card Name (sem nome real).
//      Estrategia (decisao do Toni): nome = telefone literal. Ele revisa
//      depois "quem tem nome igual a telefone".
//
//   B) Bucket C com telefone-no-nome — coluna Telefone vazia, mas o
//      Card Name contém um padrão de telefone (ex: "Joao 41 9669-1408").
//      Estrategia: extrair telefone via regex, nome = card name sem o tel.
//      Cards sem nada extraível (ex: "Electrolux 12kg", "MaqSoldas")
//      são descartados.
//
//   C) Cards de revisao com nome+telefone (Aguardando/Leeds/etc) — não viram
//      OS (decisão anterior), mas o cliente em si vale cadastrar.
//
// Dedupe entre buckets: por telefone normalizado.
// Anti-join no SQL: contra cliente.telefone existente.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { boardsPath } from './_trello-export-path.mjs'

const WRITE = process.argv.includes('--write')
const CSV = resolve(boardsPath(), 'serviços/serviços.csv')
const REVISAR = resolve('notas-trello/cards-para-revisar.json')
const OUT = resolve('sql/14-cliente-importar-trello-restantes.sql')

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rows = []
  let row = [], cur = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { cur += ch }
    } else {
      if (ch === ',') { row.push(cur); cur = '' }
      else if (ch === '"' && cur === '') { inQuotes = true }
      else if (ch === '\r') { /* skip */ }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else { cur += ch }
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row) }
  return rows
}

const norm = s => String(s || '').replace(/\D/g, '')
const sqlEscape = s => s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'"
// Remove apóstrofos/aspas no início (Excel força string com "'" e o CSV exporta junto)
const limpar = s => String(s || '').replace(/^[\s'"`]+/, '').trim()

function extrairNome(cardName) {
  if (!cardName) return ''
  let n = cardName
    .replace(/[​-‏‪-‮﻿]/g, '')
    .replace(/^[\s'"`]+/, '')
    .trim()
  n = n.replace(/^\+\d{1,3}\s+/, '')
  n = n.replace(/\s*\d{2}\s*\d{4,5}[\s-]?\d{4}\s*$/, '').trim()
  n = n.replace(/\s*\d{10,11}\s*$/, '').trim()
  if (/^\+?[\d\s\-()]+$/.test(n) && n.replace(/\D/g, '').length >= 8) return ''
  if (/^\+?\d{0,3}\s*$/.test(n)) return ''
  return n
}

// Extrai um telefone de um texto qualquer (nome de card).
// Retorna { telOriginal, telNorm } ou null.
function extrairTelefone(text) {
  if (!text) return null
  // DDD DDDD-DDDD ou DDD DDDDD-DDDD (com ou sem espaco/traco)
  let m = text.match(/\b\d{2}\s+\d{4,5}[\s-]?\d{4}\b/)
  if (!m) m = text.match(/\b\d{2}-\d{4,5}-?\d{4}\b/)
  if (!m) m = text.match(/\b\d{10,11}\b/)
  if (!m) return null
  const telOriginal = m[0].trim()
  const telNorm = norm(telOriginal)
  if (telNorm.length < 8) return null
  return { telOriginal, telNorm }
}

// ─── Pipeline ────────────────────────────────────────────────────────────────
console.log(`[trello-restantes] modo: ${WRITE ? 'WRITE' : 'DRY-RUN'}`)
console.log(`[trello-restantes] lendo CSV…`)
const rows = parseCsv(readFileSync(CSV, 'utf8'))
const header = rows[0]
const data = rows.slice(1).filter(r => r.length >= header.length)
const col = {}
header.forEach((n, i) => { col[n.trim()] = i })

const candidatos = new Map() // tel_norm → { nome, telefone, telNorm, endereco, observacoes, origem }

// Bucket A: B (só telefone, qualquer archived/ativo)
let bucketB_count = 0
for (const r of data) {
  const cardName = r[col['Card Name']] || ''
  const tel = r[col['Telefone']] || ''
  const end = r[col['Endereço']] || ''
  const telN = norm(tel)
  if (telN.length < 8) continue
  const nome = extrairNome(cardName)
  if (nome) continue // tem nome, ja foi processado pelo sql/11

  bucketB_count++
  const telClean = limpar(tel)
  if (!candidatos.has(telN)) {
    candidatos.set(telN, {
      nome: telClean,                         // nome = telefone literal (decisao do Toni)
      telefone: telClean,
      telNorm: telN,
      endereco: end.trim() || null,
      observacoes: 'Trello — sem nome (revisar)',
      origem: 'B',
    })
  }
}

// Bucket B (script): C com tel-no-nome
let bucketC_extraido = 0
let bucketC_descartado = 0
for (const r of data) {
  const cardName = r[col['Card Name']] || ''
  const tel = r[col['Telefone']] || ''
  const end = r[col['Endereço']] || ''
  const telN = norm(tel)
  if (telN.length >= 8) continue // ja tem tel valido na coluna, nao e bucket C
  // Tenta extrair tel do Card Name
  const extr = extrairTelefone(cardName)
  if (!extr) { bucketC_descartado++; continue }
  // Nome = card name sem o telefone
  const nome = extrairNome(cardName) || cardName.replace(extr.telOriginal, '').trim() || extr.telOriginal
  bucketC_extraido++
  if (!candidatos.has(extr.telNorm)) {
    candidatos.set(extr.telNorm, {
      nome: limpar(nome).slice(0, 100) || extr.telOriginal,
      telefone: extr.telOriginal,
      telNorm: extr.telNorm,
      endereco: end.trim() || null,
      observacoes: 'Trello — tel extraído do nome do card',
      origem: 'C',
    })
  }
}

// Bucket C (script): cards de revisao com nome+tel
let bucketR_count = 0
const revisar = JSON.parse(readFileSync(REVISAR, 'utf8'))
for (const c of revisar) {
  if (!c.nome) continue
  if (!c.telNorm || c.telNorm.length < 8) continue
  bucketR_count++
  if (!candidatos.has(c.telNorm)) {
    candidatos.set(c.telNorm, {
      nome: c.nome,
      telefone: c.telefone,
      telNorm: c.telNorm,
      endereco: c.endereco,
      observacoes: `Trello — ${c.lista} (revisar)`,
      origem: 'R',
    })
  }
}

console.log('')
console.log(`Bucket B (só telefone, nome=tel): ${bucketB_count} cards → ${[...candidatos.values()].filter(x => x.origem === 'B').length} únicos`)
console.log(`Bucket C (tel-no-nome extraído) : ${bucketC_extraido} cards extraídos, ${bucketC_descartado} descartados`)
console.log(`Cards de revisão (nome+tel)     : ${bucketR_count} cards`)
console.log(`─────────────────────────────────────`)
console.log(`Total candidatos únicos         : ${candidatos.size}`)
console.log('')

console.log('Amostra (até 8):')
let n = 0
for (const c of candidatos.values()) {
  if (n++ >= 8) break
  console.log(`  [${c.origem}] nome="${c.nome.padEnd(28)}" tel="${c.telefone}"`)
}
console.log('')

if (!WRITE) {
  console.log('[trello-restantes] DRY-RUN. Use --write pra gerar SQL.')
  process.exit(0)
}

// ─── Gera SQL ────────────────────────────────────────────────────────────────
const ordenados = [...candidatos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

const linhas = ordenados.map((c, i) => {
  const cast = i === 0 ? '::text' : ''
  return `    (${sqlEscape(c.nome)}${cast}, ${sqlEscape(c.telefone)}${cast}, ${sqlEscape(c.telNorm)}${cast}, ${sqlEscape(c.endereco)}${cast}, ${sqlEscape(c.observacoes)}${cast})`
})

const sql = `-- ============================================================================
-- Importacao dos clientes do Trello que ficaram de fora do sql/11
-- Gerado em ${new Date().toISOString().slice(0, 10)} por scripts/importar-clientes-trello-restantes.mjs
--
-- 3 buckets agrupados (dedupe entre eles por telefone normalizado):
--   B (${[...candidatos.values()].filter(x => x.origem === 'B').length}) — só telefone (nome = telefone literal; revisar depois)
--   C (${[...candidatos.values()].filter(x => x.origem === 'C').length}) — telefone extraido do Card Name via regex
--   R (${[...candidatos.values()].filter(x => x.origem === 'R').length}) — cards de revisao (Aguardando/Leeds/etc), só cliente (OS não)
--
-- Total candidatos: ${ordenados.length}
-- Match: anti-join por telefone normalizado >= 8 digitos.
-- Idempotente. Mesmo padrao do sql/11 (CTE WITH stg AS (VALUES ...)).
-- ============================================================================

INSERT INTO cliente (nome, telefone, endereco, observacoes)
WITH stg(nome, telefone, tel_norm, endereco, obs) AS (
  VALUES
${linhas.join(',\n')}
)
SELECT s.nome, s.telefone, s.endereco, s.obs
FROM stg s
WHERE NOT EXISTS (
  SELECT 1 FROM cliente c
  WHERE c.deleted_at IS NULL
    AND LENGTH(COALESCE(s.tel_norm, '')) >= 8
    AND regexp_replace(COALESCE(c.telefone, ''), '\\D', '', 'g') = s.tel_norm
);

-- Conferencia:
-- SELECT COUNT(*) FROM cliente WHERE observacoes LIKE 'Trello — %';
-- SELECT COUNT(*) FROM cliente WHERE deleted_at IS NULL;
-- Revisao dos "nome = telefone":
-- SELECT id, nome, telefone FROM cliente
--  WHERE observacoes = 'Trello — sem nome (revisar)' ORDER BY nome;
`

writeFileSync(OUT, sql, 'utf8')
console.log(`[trello-restantes] ✓ ${OUT}  (${ordenados.length} candidatos, ${(sql.length / 1024).toFixed(1)} KB)`)
console.log('\nProximo passo: abrir no Supabase SQL Editor → Run')
