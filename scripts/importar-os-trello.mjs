// Importa OS do export Trello pro banco.
//
// USO:
//   node scripts/importar-os-trello.mjs            # dry-run (default)
//   node scripts/importar-os-trello.mjs --write    # gera arquivos
//
// Saidas (so com --write):
//   sql/12-os-importar-trello.sql       — INSERT INTO cliente (novos) + INSERT INTO os
//   notas-trello/cards-para-revisar.json — cards de listas que nao viram OS
//   notas-trello/dry-run-summary.txt     — relatorio do parsing
//
// Decisoes do Toni (20/05/2026):
//   * Escopo: so cards ATIVOS (nao-archived). 586 archived sao pulados.
//   * Listas OS: PAGOS, Finalizados/Pagos ABRIL/MARCO/MAIO, A RECEBER,
//     FINALIZADOS (etapa=entrega — sao maquinas prontas pra entregar),
//     LIMPEZAS/SERVICOS (oficina), DIAGNOSTICOS, Pre-Diagnostico (recebido),
//     ORCAMENTO.
//   * Listas pra revisar (vao pro JSON): Aguardando, Leeds Limpeza, Lembretes,
//     PEDIDOS, Maquinas pra venda, REGISTRO DE CLIENTE, Lancados no ERP,
//     VISITAS, ROTA ATUAL.
//   * Cliente sem match por telefone: criar cliente novo com nome do card.
//   * Data de entrada (criado_em): primeira vez que o card esteve em lista
//     DIFERENTE de VISITAS e ROTA ATUAL (extraida da timeline de actions).
//   * Pagamento: parsear comentarios. Padroes "VALOR FORMA [DATA]" tipo
//     "280 pix" ou "650 cartao 12/5". Sem comentario indicativo → valor=0.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { boardsPath } from './_trello-export-path.mjs'

const WRITE = process.argv.includes('--write')
const BASE = resolve(boardsPath(), 'serviços')
const CSV_PATH = resolve(BASE, 'serviços.csv')
const JSON_PATH = resolve(BASE, 'serviços.json')
const OUT_SQL = resolve('sql/12-os-importar-trello.sql')
const OUT_REVISAR = resolve('notas-trello/cards-para-revisar.json')
const OUT_SUMMARY = resolve('notas-trello/dry-run-summary.txt')

// ─── Mapeamento de listas ────────────────────────────────────────────────────
// Valores sao do ENUM os_etapa do BANCO (nao do id da UI).
// Mapeamento UI→DB em src/hooks/useOS.js: oficina→em_oficina, agendado→agendamento,
// ag_agendamento→aguardando_agendamento, entregue→entrega.
//
// v2 (21/05/2026): Toni revisou o mapeamento. Mudancas vs v1:
//   - A RECEBER: recebido → pagamento (precisa UPDATE nas 13 OS ja inseridas)
//   - VISITAS e ROTA ATUAL: passaram a virar OS (aguardando_agendamento)
const LISTAS_OS = {
  'PAGOS':                       { etapa: 'concluido',              pago: 'total' },
  'Finalizados/Pagos ABRIL':     { etapa: 'concluido',              pago: 'total' },
  'Finalizados/Pagos de MARÇO':  { etapa: 'concluido',              pago: 'total' },
  'Finalizados/Pagos MAIO':      { etapa: 'concluido',              pago: 'total' },
  'A RECEBER':                   { etapa: 'pagamento',              pago: 'nao'   },
  'FINALIZADOS':                 { etapa: 'entrega',                pago: 'nao'   },
  'LIMPEZAS':                    { etapa: 'em_oficina',             pago: 'nao'   },
  'SERVIÇOS':                    { etapa: 'em_oficina',             pago: 'nao'   },
  'DIAGNOSTICOS':                { etapa: 'diagnostico',            pago: 'nao'   },
  'Pré-Diagnostico':             { etapa: 'recebido',               pago: 'nao'   },
  'ORÇAMENTO':                   { etapa: 'orcamento',              pago: 'nao'   },
  'VISITAS':                     { etapa: 'aguardando_agendamento', pago: 'nao'   },
  'ROTA ATUAL':                  { etapa: 'aguardando_agendamento', pago: 'nao'   },
}

const LISTAS_REVISAR = new Set([
  'Aguardando', 'Leeds Limpeza', 'Lembretes', 'Máquinas pra venda',
  // Esses 3 abaixo nao foram citados pelo Toni mas todos os cards ja estao
  // archived (0 ativos) — ficam no JSON por seguranca pra revisao futura.
  'PEDIDOS', 'REGISTRO DE CLIENTE AUTOMATICO', 'Lançados no ERP',
])

// Mantido mesmo apos VISITAS/ROTA ATUAL virarem OS: a regra do Toni continua
// valendo — pra calcular "data de entrada" da OS, ignoramos passagens por
// essas listas. Card que ATUALMENTE esta em VISITAS nao tem data de entrada
// definida (criado_em vai cair no COALESCE(NOW())).
const LISTAS_IGNORAR_TIMELINE = new Set(['VISITAS', 'ROTA ATUAL'])

// Mapeamento ANTERIOR (v1) → usado pra gerar sql/13 com UPDATEs nas OS ja
// inseridas que mudaram de etapa.
const REMAP_v1_v2 = {
  'A RECEBER': { antes: 'recebido', depois: 'pagamento' },
}

// ─── CSV parser ──────────────────────────────────────────────────────────────
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
const norm = s => String(s || '').replace(/\D/g, '')
const sqlEscape = s => s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'"

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

// Parser de pagamento nos comentarios.
// Tenta detectar: valor, forma, data.
// Exemplos suportados:
//   "280 pix"           → valor=280, forma=pix, data=date do comentario
//   "650 cartao 12/5"   → valor=650, forma=cartao, data=12/5 (ano do comentario)
//   "limpeza 430"       → valor=430, forma=null, data=date do comentario
//   "limpeza"           → null (sem valor)
function parseComentarioPagamento(text, commentDate) {
  if (!text) return null
  const lower = text.toLowerCase()
  let forma = null
  if (/\bpix\b/.test(lower))                       forma = 'pix'
  else if (/\bcart[ãa]o\b|cred|deb/.test(lower))  forma = 'cartao'
  else if (/\bdinheiro\b|\bdim\b|\bespecie\b/.test(lower)) forma = 'dinheiro'

  // Data DD/MM ou DD-MM (assume ano do comentario)
  let data = null
  const matchData = text.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/)
  if (matchData) {
    const dd = matchData[1].padStart(2, '0')
    const mm = matchData[2].padStart(2, '0')
    const ano = commentDate ? commentDate.slice(0, 4) : new Date().getFullYear()
    data = `${ano}-${mm}-${dd}`
  } else if (commentDate) {
    data = commentDate.slice(0, 10)
  }

  // Valor: pega o MAIOR numero do texto (>= 10 e <= 99999), excluindo a data
  let textoSemData = text
  if (matchData) textoSemData = text.replace(matchData[0], ' ')
  const nums = (textoSemData.match(/\b\d{2,5}\b/g) || []).map(Number).filter(n => n >= 10 && n <= 99999)
  const valor = nums.length ? Math.max(...nums) : null

  if (!valor) return null
  return { valor, forma, data }
}

// ─── Pipeline ────────────────────────────────────────────────────────────────
console.log(`[trello-os] modo: ${WRITE ? 'WRITE' : 'DRY-RUN'}`)
console.log(`[trello-os] lendo CSV…`)
const csvRaw = readFileSync(CSV_PATH, 'utf8')
const rows = parseCsv(csvRaw)
const header = rows[0]
const dataRows = rows.slice(1).filter(r => r.length >= header.length)
const col = {}
header.forEach((n, i) => { col[n.trim()] = i })
console.log(`[trello-os] cards no CSV: ${dataRows.length}`)

console.log(`[trello-os] lendo JSON (20MB)…`)
const json = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
console.log(`[trello-os] actions: ${json.actions.length}, cards: ${json.cards.length}`)

// Indexa actions por idCard
const actionsPorCard = new Map()
const comentariosPorCard = new Map()
for (const a of json.actions) {
  const idCard = a.data?.card?.id
  if (!idCard) continue
  if (!actionsPorCard.has(idCard)) actionsPorCard.set(idCard, [])
  actionsPorCard.get(idCard).push(a)
  if (a.type === 'commentCard') {
    if (!comentariosPorCard.has(idCard)) comentariosPorCard.set(idCard, [])
    comentariosPorCard.get(idCard).push({ date: a.date, text: a.data?.text || '' })
  }
}

// Pra cada card, calcula data de entrada (1a aparicao em lista != VISITAS/ROTA ATUAL)
function dataEntrada(idCard) {
  const acts = (actionsPorCard.get(idCard) || []).slice().sort((a, b) => a.date.localeCompare(b.date))
  for (const a of acts) {
    let listaNova = null
    if (a.type === 'createCard') listaNova = a.data?.list?.name
    else if (a.type === 'updateCard' && a.data?.listAfter) listaNova = a.data.listAfter.name
    else if (a.type === 'copyCard') listaNova = a.data?.list?.name
    if (listaNova && !LISTAS_IGNORAR_TIMELINE.has(listaNova)) return a.date
  }
  return null
}

// Pra cada card, varre comentarios buscando padrao de pagamento (pega o ULTIMO match)
function pagamentoDoCard(idCard) {
  const coms = (comentariosPorCard.get(idCard) || []).slice().sort((a, b) => a.date.localeCompare(b.date))
  let melhor = null
  for (const c of coms) {
    const p = parseComentarioPagamento(c.text, c.date)
    if (p) melhor = p
  }
  return melhor
}

// ─── Classificacao ──────────────────────────────────────────────────────────
const osCandidatos = []   // viram OS no banco
const paraRevisar = []    // vao pro JSON
const ignorados = []      // archived ou sem mapeamento

let semClienteMatch = 0   // serao criados como cliente novo
let comPagamentoParsed = 0

// Pra criar clientes novos sem duplicar, dedupe por telefone normalizado
const clientesNovosPorTel = new Map()

for (const r of dataRows) {
  const cardId   = r[col['Card ID']]
  const cardName = r[col['Card Name']] || ''
  const lista    = r[col['List Name']]
  const archived = (r[col['Archived']] || '').toLowerCase() === 'true'
  const tel      = r[col['Telefone']] || ''
  const end      = r[col['Endereço']] || ''
  const obs      = r[col['Obs']] || ''
  const servicos = r[col['Serviços']] || ''
  const lastAct  = r[col['Last Activity Date']] || ''
  const valorCsv = r[col['Valor']] || ''
  const telNorm  = norm(tel)
  const nome     = extrairNome(cardName)

  // Pula archived (decisao do Toni: so ativos)
  if (archived) { ignorados.push({ cardId, cardName, lista, motivo: 'archived' }); continue }

  // Lista de revisao
  if (LISTAS_REVISAR.has(lista)) {
    paraRevisar.push({
      cardId, cardName, nome, telefone: tel, telNorm, endereco: end,
      lista, obs, servicos, lastActivity: lastAct, valor: valorCsv,
      comentarios: (comentariosPorCard.get(cardId) || []).map(c => ({ date: c.date, text: c.text })),
    })
    continue
  }

  // Lista que vira OS
  const mapa = LISTAS_OS[lista]
  if (!mapa) {
    ignorados.push({ cardId, cardName, lista, motivo: 'lista-desconhecida' })
    continue
  }

  // Telefone valido?
  if (telNorm.length < 8) {
    ignorados.push({ cardId, cardName, lista, motivo: 'sem-telefone' })
    continue
  }

  const pag    = pagamentoDoCard(cardId)
  const dtEntr = dataEntrada(cardId) || lastAct || null
  if (pag) comPagamentoParsed++

  // Defeito: prioriza Obs do CSV, depois Servicos, depois ultimo comentario
  let defeito = obs.trim() || servicos.trim()
  if (!defeito) {
    const coms = comentariosPorCard.get(cardId) || []
    if (coms.length) defeito = coms[coms.length - 1].text.slice(0, 200)
  }

  osCandidatos.push({
    cardId, cardName, nome: nome || `Trello s/nome ${tel}`,
    telefone: tel.trim(), telNorm, endereco: end.trim() || null,
    lista, etapa: mapa.etapa, pago: mapa.pago,
    valor_total: pag?.valor || (valorCsv ? parseFloat(valorCsv) : null) || 0,
    forma_pagamento: pag?.forma || null,
    data_pagamento: pag?.data || null,
    defeito: defeito || null,
    criado_em: dtEntr,
  })

  // Marca pra criar cliente novo se nao matchar (sera resolvido no SQL)
  if (!clientesNovosPorTel.has(telNorm)) {
    clientesNovosPorTel.set(telNorm, {
      nome: nome || `Trello s/nome ${tel}`,
      telefone: tel.trim(),
      telNorm,
      endereco: end.trim() || null,
      observacoes: 'Importado do Trello (via OS)',
    })
  }
}

// ─── Relatorio ───────────────────────────────────────────────────────────────
const porEtapa = new Map()
for (const o of osCandidatos) porEtapa.set(o.etapa, (porEtapa.get(o.etapa) || 0) + 1)
const porListaCount = new Map()
for (const o of osCandidatos) porListaCount.set(o.lista, (porListaCount.get(o.lista) || 0) + 1)
const porListaRev = new Map()
for (const r of paraRevisar) porListaRev.set(r.lista, (porListaRev.get(r.lista) || 0) + 1)

const summary = []
summary.push(`[trello-os] === RELATORIO ===\n`)
summary.push(`Total cards CSV: ${dataRows.length}`)
summary.push(`  Archived (pulados): ${ignorados.filter(i => i.motivo === 'archived').length}`)
summary.push(`  Lista desconhecida: ${ignorados.filter(i => i.motivo === 'lista-desconhecida').length}`)
summary.push(`  Sem telefone valido: ${ignorados.filter(i => i.motivo === 'sem-telefone').length}`)
summary.push(``)
summary.push(`OS a CRIAR: ${osCandidatos.length}`)
for (const [lista, qtd] of [...porListaCount.entries()].sort((a, b) => b[1] - a[1])) {
  summary.push(`  ${String(qtd).padStart(3)} | ${lista}`)
}
summary.push(``)
summary.push(`Por etapa do banco:`)
for (const [etapa, qtd] of [...porEtapa.entries()].sort((a, b) => b[1] - a[1])) {
  summary.push(`  ${String(qtd).padStart(3)} | ${etapa}`)
}
summary.push(``)
summary.push(`Pagamento parseado dos comentarios: ${comPagamentoParsed} OS`)
summary.push(`Clientes novos a inserir (telefone nao matchou): a calcular no SQL`)
summary.push(`Total telefones unicos pra clientes: ${clientesNovosPorTel.size}`)
summary.push(``)
summary.push(`CARDS PRA REVISAR (vao pro JSON): ${paraRevisar.length}`)
for (const [lista, qtd] of [...porListaRev.entries()].sort((a, b) => b[1] - a[1])) {
  summary.push(`  ${String(qtd).padStart(3)} | ${lista}`)
}

console.log('\n' + summary.join('\n'))

if (!WRITE) {
  console.log('\n[trello-os] DRY-RUN — nada foi gerado. Use --write pra gerar arquivos.')
  process.exit(0)
}

// ─── Escreve arquivos ────────────────────────────────────────────────────────
const outDir = resolve('notas-trello')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

writeFileSync(OUT_REVISAR, JSON.stringify(paraRevisar, null, 2), 'utf8')
console.log(`\n[trello-os] ✓ ${OUT_REVISAR}  (${paraRevisar.length} cards, ${(JSON.stringify(paraRevisar).length / 1024).toFixed(1)} KB)`)

writeFileSync(OUT_SUMMARY, summary.join('\n'), 'utf8')
console.log(`[trello-os] ✓ ${OUT_SUMMARY}`)

// ─── Gera SQL ────────────────────────────────────────────────────────────────
// Estrategia em 2 statements (SQL Editor abre transacao por statement):
//   S1: INSERT INTO cliente (...) — novos clientes (anti-join por telefone)
//   S2: INSERT INTO os (...) — todas as OS, com JOIN no cliente p/ pegar id

const clientesNovos = Array.from(clientesNovosPorTel.values())
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

const clientesValues = clientesNovos.map((c, i) => {
  const cast = i === 0 ? '::text' : ''
  return `    (${sqlEscape(c.nome)}${cast}, ${sqlEscape(c.telefone)}${cast}, ${sqlEscape(c.telNorm)}${cast}, ${sqlEscape(c.endereco)}${cast}, ${sqlEscape(c.observacoes)}${cast})`
})

const osValues = osCandidatos.map((o, i) => {
  const cast = i === 0 ? '::text' : ''
  return `    (${sqlEscape(o.telNorm)}${cast}, ${sqlEscape(o.etapa)}${cast}, ${sqlEscape(o.pago)}${cast}, ${(o.valor_total ?? 0).toFixed(2)}, ${sqlEscape(o.forma_pagamento)}${cast}, ${sqlEscape(o.defeito)}${cast}, ${sqlEscape(o.criado_em)}${cast}, ${sqlEscape('TRELLO-CARD:' + o.cardId)}${cast})`
})

const sql = `-- ============================================================================
-- Importacao de OS do export Trello — board "servicos"
-- Gerado em ${new Date().toISOString().slice(0, 10)} por scripts/importar-os-trello.mjs
-- Fonte: Base de dados clientes Bling/areadetrabalho95498714_20260519_035333/
--
-- Escopo: ${osCandidatos.length} OS ativas (archived pulado).
-- Clientes novos a inserir: ${clientesNovos.length} (telefones que nao matcharam).
-- Pagamentos parseados de comentarios: ${comPagamentoParsed}.
--
-- IDEMPOTENTE: cada OS tem observacoes='TRELLO-CARD:<id>...'; o INSERT abaixo
-- pula se ja existe outra OS com mesmo TRELLO-CARD:<id>. Cliente igual ao
-- sql/11 (anti-join por telefone normalizado).
--
-- ORDEM DE EXECUCAO no SQL Editor:
--   1. Rodar STATEMENT 1 (clientes novos)
--   2. Rodar STATEMENT 2 (OS) — depende dos clientes do passo 1
--   3. Conferir (SELECTs comentados no fim)
-- ============================================================================

-- STATEMENT 1 — Clientes novos (anti-join por telefone)
INSERT INTO cliente (nome, telefone, endereco, observacoes)
WITH novos(nome, telefone, tel_norm, endereco, obs) AS (
  VALUES
${clientesValues.join(',\n')}
)
SELECT n.nome, n.telefone, n.endereco, n.obs
FROM novos n
WHERE NOT EXISTS (
  SELECT 1 FROM cliente c
  WHERE c.deleted_at IS NULL
    AND LENGTH(COALESCE(n.tel_norm, '')) >= 8
    AND regexp_replace(COALESCE(c.telefone, ''), '\\D', '', 'g') = n.tel_norm
);

-- STATEMENT 2 — OS (1 INSERT pra todas, JOIN com cliente pelo telefone normalizado)
INSERT INTO os (
  cliente_id, tipo, etapa, pago, valor_total, valor_pago,
  forma_pagamento, defeito_relatado, criado_em, criado_por, observacoes
)
WITH cards(tel_norm, etapa, pago, valor, forma, defeito, criado_em, marker) AS (
  VALUES
${osValues.join(',\n')}
), dono AS (
  SELECT id FROM usuarios WHERE papel = 'dono' AND ativo = true LIMIT 1
)
SELECT
  c.id                                                AS cliente_id,
  'atendimento'::os_tipo                              AS tipo,
  cards.etapa::os_etapa                               AS etapa,
  cards.pago::os_pagamento_status                     AS pago,
  cards.valor                                         AS valor_total,
  CASE WHEN cards.pago = 'total' THEN cards.valor ELSE 0 END AS valor_pago,
  cards.forma                                         AS forma_pagamento,
  cards.defeito                                       AS defeito_relatado,
  COALESCE(cards.criado_em::timestamptz, NOW())       AS criado_em,
  (SELECT id FROM dono)                               AS criado_por,
  cards.marker                                        AS observacoes
FROM cards
JOIN cliente c
  ON c.deleted_at IS NULL
 AND regexp_replace(COALESCE(c.telefone, ''), '\\D', '', 'g') = cards.tel_norm
WHERE NOT EXISTS (
  SELECT 1 FROM os o
  WHERE o.deleted_at IS NULL
    AND o.observacoes = cards.marker
);

-- Conferencia (rodar separado depois):
-- SELECT COUNT(*) FROM os WHERE observacoes LIKE 'TRELLO-CARD:%';
-- SELECT etapa, COUNT(*) FROM os WHERE observacoes LIKE 'TRELLO-CARD:%' GROUP BY etapa;
-- SELECT COUNT(*) FROM os WHERE deleted_at IS NULL;
`

writeFileSync(OUT_SQL, sql, 'utf8')
console.log(`[trello-os] ✓ ${OUT_SQL}  (${osCandidatos.length} OS, ${(sql.length / 1024).toFixed(1)} KB)`)

// ─── Gera sql/13 — UPDATE pras OS ja inseridas que mudaram de etapa ──────────
const remapCardIds = {}
for (const [lista, { antes, depois }] of Object.entries(REMAP_v1_v2)) {
  remapCardIds[lista] = osCandidatos
    .filter(o => o.lista === lista)
    .map(o => o.cardId)
}

const updateBlocos = []
for (const [lista, { antes, depois }] of Object.entries(REMAP_v1_v2)) {
  const ids = remapCardIds[lista]
  if (!ids.length) continue
  const markers = ids.map(id => `'TRELLO-CARD:${id}'`).join(',\n    ')
  updateBlocos.push(`-- ${lista}: ${antes} → ${depois}  (${ids.length} OS)
UPDATE os
   SET etapa = '${depois}'::os_etapa
 WHERE deleted_at IS NULL
   AND etapa = '${antes}'::os_etapa
   AND observacoes IN (
    ${markers}
   );`)
}

const sql13 = `-- ============================================================================
-- Corrige etapas de OS importadas do Trello que mudaram de mapeamento (v1 → v2)
-- Gerado em ${new Date().toISOString().slice(0, 10)} por scripts/importar-os-trello.mjs
--
-- Por que: na primeira leva do sql/12 o mapeamento de "A RECEBER" era
-- 'recebido', mas o Toni revisou para 'pagamento'. Esse UPDATE corrige as
-- OS que ja foram inseridas com o mapeamento antigo, identificadas pelo tag
-- TRELLO-CARD:<id> nas observacoes. Idempotente — so atualiza se ainda
-- estiver na etapa antiga.
-- ============================================================================

${updateBlocos.join('\n\n')}

-- Conferencia:
-- SELECT etapa, COUNT(*) FROM os WHERE observacoes LIKE 'TRELLO-CARD:%' GROUP BY etapa;
`

const OUT_SQL13 = resolve('sql/13-os-trello-corrigir-etapas.sql')
writeFileSync(OUT_SQL13, sql13, 'utf8')
console.log(`[trello-os] ✓ ${OUT_SQL13}  (${updateBlocos.length} UPDATE blocos)`)

// ─── Gera sql/15 — UPDATE pras OS que mudaram de lista entre 2 exports ──────
// (gerado sempre, mas vazio se nao houver mudancas)
const ATUAL_POR_ID = new Map(osCandidatos.map(o => [o.cardId, o]))
const updateMudancas = []
for (const o of osCandidatos) {
  // Cada OS tem 'etapa' DB (novo mapeamento). UPDATE seguro: muda apenas
  // se a OS no banco ainda tem outra etapa diferente da que o card está agora.
  // O WHERE etapa != atual evita re-update inutil.
  // Agrupar por (etapa nova) pra reduzir tamanho do SQL.
}
const porEtapaNova = new Map()
for (const o of osCandidatos) {
  if (!porEtapaNova.has(o.etapa)) porEtapaNova.set(o.etapa, [])
  porEtapaNova.get(o.etapa).push(o.cardId)
}
const blocosResync = []
for (const [etapa, ids] of porEtapaNova) {
  const markers = ids.map(id => `'TRELLO-CARD:${id}'`).join(',\n    ')
  blocosResync.push(`-- → ${etapa}  (${ids.length} OS)
UPDATE os
   SET etapa = '${etapa}'::os_etapa
 WHERE deleted_at IS NULL
   AND etapa <> '${etapa}'::os_etapa
   AND observacoes IN (
    ${markers}
   );`)
}
const sql15 = `-- ============================================================================
-- Re-sincroniza etapas das OS importadas do Trello com o export atual
-- Gerado em ${new Date().toISOString().slice(0, 10)} por scripts/importar-os-trello.mjs
--
-- Use quando o Toni atualizar o Trello e gerar um export novo: roda sql/12
-- (insere OS novas via anti-join) + roda este sql/15 (atualiza etapa das OS
-- existentes que mudaram de lista no Trello). Idempotente: cada UPDATE
-- so corre se a etapa atual no banco ainda for diferente da do export.
-- ============================================================================

${blocosResync.join('\n\n')}

-- Conferencia:
-- SELECT etapa, COUNT(*) FROM os WHERE observacoes LIKE 'TRELLO-CARD:%' GROUP BY etapa;
`
const OUT_SQL15 = resolve('sql/15-os-trello-resync-etapas.sql')
writeFileSync(OUT_SQL15, sql15, 'utf8')
console.log(`[trello-os] ✓ ${OUT_SQL15}  (${blocosResync.length} etapas)`)

console.log('\nProximo passo no Supabase SQL Editor:')
console.log('  1. sql/12 STATEMENT 1 (clientes novos)         — idempotente')
console.log('  2. sql/12 STATEMENT 2 (OS novas via anti-join) — idempotente')
console.log('  3. sql/15 (re-sync etapa das OS existentes)    — idempotente')
