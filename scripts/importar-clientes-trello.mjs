// Gera sql/11-cliente-importar-trello.sql a partir do export Trello.
//
// USO:
//   node scripts/importar-clientes-trello.mjs            # dry-run (só relatório)
//   node scripts/importar-clientes-trello.mjs --write    # grava sql/11
//
// Fonte: Base de dados clientes Bling/areadetrabalho95498714_20260519_035333/
//        boards/serviços/serviços.csv  (876 cards reais)
//
// POR QUE SQL e não INSERT direto via JS:
//   RLS na tabela `cliente` exige usuário logado. Anon key (no script) é
//   bloqueado. SQL Editor do Supabase roda como service role e bypassa RLS —
//   mesmo padrão do sql/04-cliente-importar-bling.sql v3 (777 clientes).
//
// MATCH idempotente (igual sql/04):
//   regexp_replace(c.telefone, '\D', '', 'g') = staging.tel_norm
//   Mínimo 8 dígitos pra contar como match. Roda quantas vezes quiser.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { boardsPath } from './_trello-export-path.mjs'

const WRITE = process.argv.includes('--write')
const CSV_PATH = resolve(boardsPath(), 'serviços/serviços.csv')
const SQL_OUT = resolve('sql/11-cliente-importar-trello.sql')

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

// ─── Mini CSV parser (suporta aspas, vírgulas e \n em campo) ─────────────────
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1) // BOM
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const normalizarTelefone = s => String(s || '').replace(/\D/g, '')

function extrairNome(cardName) {
  if (!cardName) return ''
  let name = cardName
    // Remove invisíveis (RLM/LRM/zero-width) que o Trello às vezes solta
    .replace(/[​-‏‪-‮﻿]/g, '')
    // Remove aspas/apóstrofos no início (Excel-style "'" pra forçar string)
    .replace(/^[\s'"`]+/, '')
    .trim()
  // Remove prefixo internacional "+55 " se houver
  name = name.replace(/^\+\d{1,3}\s+/, '')
  // Remove tel no final
  name = name.replace(/\s*\d{2}\s*\d{4,5}[\s-]?\d{4}\s*$/, '').trim()
  name = name.replace(/\s*\d{10,11}\s*$/, '').trim()
  // Se sobrou só dígitos + pontuação de telefone (DDDs, espaços, traços), é tel
  if (/^\+?[\d\s\-()]+$/.test(name) && name.replace(/\D/g, '').length >= 8) return ''
  // Se sobrou só prefixo curto de tel ou vazio
  if (/^\+?\d{0,3}\s*$/.test(name)) return ''
  return name
}

function truncar(s, max = 60) {
  s = String(s || '')
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function sqlEscape(s) {
  if (s == null) return 'NULL'
  return "'" + String(s).replace(/'/g, "''") + "'"
}

// ─── Pipeline ────────────────────────────────────────────────────────────────
console.log(`[trello-import] modo: ${WRITE ? 'WRITE (vai gerar SQL)' : 'DRY-RUN (só relatório)'}`)
console.log(`[trello-import] lendo ${CSV_PATH}`)

const raw = readFileSync(CSV_PATH, 'utf8')
const rows = parseCsv(raw)
const header = rows[0]
const dataRows = rows.slice(1).filter(r => r.length >= header.length)
console.log(`[trello-import] cards no CSV: ${dataRows.length}`)

const col = {}
header.forEach((name, i) => { col[name.trim()] = i })
for (const r of ['Card Name', 'Telefone', 'Endereço', 'Obs', 'Last Activity Date']) {
  if (col[r] === undefined) {
    console.error(`ERRO: coluna "${r}" não encontrada.`)
    process.exit(1)
  }
}

const bucketA = new Map()
const bucketB = []
const bucketC = []

for (const r of dataRows) {
  const cardName = r[col['Card Name']] || ''
  const tel = r[col['Telefone']] || ''
  const end = r[col['Endereço']] || ''
  const obs = r[col['Obs']] || ''
  const last = r[col['Last Activity Date']] || ''

  const telNorm = normalizarTelefone(tel)
  if (telNorm.length < 8) { bucketC.push({ cardName, tel }); continue }

  const nome = extrairNome(cardName)
  if (!nome) { bucketB.push({ cardName, telNorm, telOriginal: tel, endereco: end }); continue }

  const prev = bucketA.get(telNorm)
  if (!prev || (last && last > prev.lastActivity)) {
    bucketA.set(telNorm, {
      nome,
      telefone: tel.trim(),
      telNorm,
      endereco: end.trim() || null,
      observacoes: obs.trim() ? `Trello: ${obs.trim()}` : 'Importado do Trello',
      lastActivity: last,
    })
  }
}

console.log('')
console.log(`Bucket A (nome + tel ≥ 8 díg)  : ${bucketA.size}  → candidatos a cadastrar`)
console.log(`Bucket B (só telefone)         : ${bucketB.length} → sem nome, NÃO incluídos`)
console.log(`Bucket C (sem chave)           : ${bucketC.length} → ignorados`)
console.log('')

// ─── Tenta diff opcional via Supabase (pode falhar com RLS) ──────────────────
console.log('[trello-import] tentando ler clientes existentes pra estimar diff (pode dar 0 se RLS bloquear o anon)…')
const existentes = new Set()
let from = 0
const PAGE = 1000
let leu = 0
let erroRLS = null
while (true) {
  const { data, error } = await supabase
    .from('cliente')
    .select('id, telefone')
    .is('deleted_at', null)
    .range(from, from + PAGE - 1)
  if (error) { erroRLS = error.message; break }
  if (!data || data.length === 0) break
  leu += data.length
  for (const c of data) {
    const tn = normalizarTelefone(c.telefone)
    if (tn.length >= 8) existentes.add(tn)
  }
  if (data.length < PAGE) break
  from += PAGE
}

if (erroRLS) {
  console.log('[trello-import] ⚠ erro lendo cliente:', erroRLS)
} else if (leu === 0) {
  console.log('[trello-import] ⚠ leu 0 clientes (RLS provável — script não tem login). Diff será calculado NO SQL.')
} else {
  console.log(`[trello-import] leu ${leu} clientes; com tel ≥ 8 díg: ${existentes.size}`)
  let novos = 0, jaTem = 0
  for (const [tn] of bucketA) (existentes.has(tn) ? jaTem++ : novos++)
  console.log(`   → estimativa: ${novos} novos, ${jaTem} já cadastrados`)
}
console.log('')

console.log('Amostra dos 10 primeiros candidatos:')
let i = 0
for (const [, c] of bucketA) {
  if (i++ >= 10) break
  console.log(`  - ${truncar(c.nome, 32).padEnd(33)} | ${c.telefone.padEnd(15)} | ${truncar(c.endereco, 45)}`)
}
console.log('')

if (bucketB.length > 0) {
  console.log(`Bucket B (cards sem nome — NÃO entram no SQL): primeiros 5`)
  for (const c of bucketB.slice(0, 5)) {
    console.log(`  - card="${truncar(c.cardName, 30)}" tel="${c.telOriginal}"`)
  }
  if (bucketB.length > 5) console.log(`  … e mais ${bucketB.length - 5}`)
  console.log('')
}

if (!WRITE) {
  console.log('[trello-import] DRY-RUN — nenhum arquivo gerado.')
  console.log('[trello-import] Pra gerar sql/11-cliente-importar-trello.sql: rode com --write')
  process.exit(0)
}

// ─── Gera o SQL ──────────────────────────────────────────────────────────────
console.log(`[trello-import] gerando ${SQL_OUT}…`)

const candidatos = Array.from(bucketA.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

const linhasValues = candidatos.map((c, i) => {
  // Primeira linha: cast explicito pra VALUES dentro de CTE inferir tipos certo
  if (i === 0) {
    return `    (${sqlEscape(c.nome)}::text, ${sqlEscape(c.telefone)}::text, ${sqlEscape(c.telNorm)}::text, ${sqlEscape(c.endereco)}::text, ${sqlEscape(c.observacoes)}::text)`
  }
  return `    (${sqlEscape(c.nome)}, ${sqlEscape(c.telefone)}, ${sqlEscape(c.telNorm)}, ${sqlEscape(c.endereco)}, ${sqlEscape(c.observacoes)})`
})

const sql = `-- ============================================================================
-- Importacao de clientes do export Trello
-- Gerado em ${new Date().toISOString().slice(0, 10)} por scripts/importar-clientes-trello.mjs
-- Fonte: Base de dados clientes Bling/areadetrabalho95498714_20260519_035333/
--        boards/servicos/servicos.csv (876 cards, 4 boards)
--
-- Filtros aplicados:
--   * Telefone (coluna do card) com >= 8 digitos
--   * Card Name com nome extraido (removendo telefone do final)
--   * Dedupe por telefone normalizado, mantendo o card mais recente
--
-- Mapeamento Card -> cliente:
--   Card Name (sem tel)    -> nome
--   Telefone (coluna)      -> telefone
--   Endereco (coluna)      -> endereco
--   Obs (coluna) || marker -> observacoes (com prefixo "Trello: ...")
--
-- IDEMPOTENTE: match por telefone normalizado (regexp_replace digits) com >= 8.
-- Roda quantas vezes quiser, so insere os que nao existem.
--
-- Total de candidatos: ${candidatos.length}.
--
-- Por que CTE e nao TEMP TABLE: Supabase SQL Editor abre uma transacao
-- propria por statement; "CREATE TEMP TABLE ... ON COMMIT DROP" mata a tabela
-- antes do INSERT seguinte chegar nela. CTE roda tudo em um statement so.
-- ============================================================================

INSERT INTO cliente (nome, telefone, endereco, observacoes)
WITH stg(nome, telefone, tel_norm, endereco, obs) AS (
  VALUES
${linhasValues.join(',\n')}
)
SELECT s.nome, s.telefone, s.endereco, s.obs
FROM stg s
WHERE NOT EXISTS (
  SELECT 1 FROM cliente c
  WHERE c.deleted_at IS NULL
    AND LENGTH(COALESCE(s.tel_norm, '')) >= 8
    AND regexp_replace(COALESCE(c.telefone, ''), '\\D', '', 'g') = s.tel_norm
);

-- Conferencia (rodar separado depois):
-- SELECT COUNT(*) FROM cliente WHERE observacoes LIKE 'Trello%' OR observacoes LIKE 'Importado do Trello%';
-- SELECT COUNT(*) FROM cliente WHERE deleted_at IS NULL;
`

writeFileSync(SQL_OUT, sql, 'utf8')
console.log(`[trello-import] ✓ gerado ${SQL_OUT}`)
console.log(`[trello-import]   ${candidatos.length} candidatos no INSERT INTO cliente_trello_stg`)
console.log(`[trello-import]   ${(sql.length / 1024).toFixed(1)} KB`)
console.log('')
console.log('Próximo passo: abra o arquivo no Supabase Dashboard → SQL Editor → Run.')
console.log('               O SQL é idempotente: só insere quem ainda não está cadastrado.')
