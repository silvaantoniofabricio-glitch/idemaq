// scripts/gerar-sql-trello-enriquece.mjs
// Enriquece OS Trello sem dados financeiros (valor_total=0) usando comentários do Trello.
// Parseia regex: valor + forma de pagamento + data (explícita ou do comentário).
//
// Casos cobertos:
// - "185 pix" → valor=185 forma=pix data=data_do_comentario
// - "750 PIX VENDA DE MAQUINA" → idem + descricao
// - "100 4/5 pix - mag do pressostato" → valor=100 forma=pix data=4/5/ANO_COMMENT desc=mag do pressostato
// - "650 venda de maquina cartao 12/5" → idem
// - "**535,00** CREDITO" → valor=535 forma=credito
//
// Idempotente via tag TRELLO-COMENT:<comment_id> em descricao do lancamento_financeiro
//          e em observacoes da OS.
//
// Estratégia: parseia o comentário MAIS RECENTE com valor+forma de cada card.

import fs from 'fs'
import path from 'path'

const TRELLO_JSON = 'C:/Users/Toni-PC/projetos/idemaq/Base de dados clientes Bling/TRELLO/areadetrabalho95498714_20260522_064453/boards/serviços/serviços.json'
const SQL_DIR = 'C:/Users/Toni-PC/projetos/idemaq/sql'
const JSON_OUT = 'C:/Users/Toni-PC/projetos/idemaq/relatorios/trello-enriquece.json'

const data = JSON.parse(fs.readFileSync(TRELLO_JSON, 'utf8'))
const cards = data.cards.filter(c => !c.closed)

// Junta comentários por card
const commentsByCard = new Map()
for (const a of data.actions) {
  if (a.type !== 'commentCard') continue
  const cardId = a.data?.card?.id
  if (!cardId) continue
  if (!commentsByCard.has(cardId)) commentsByCard.set(cardId, [])
  commentsByCard.get(cardId).push({
    id: a.id,
    date: a.date,
    text: a.data.text || '',
  })
}

// Regex
const RX_VALOR = /(?:^|\s|\*)([\d]{2,4}(?:[,.]\d{1,2})?)(?=\s|reais?|r\$|\$|$|,|\*)/i
const RX_PAG = /(pix|cr[eé]dito|d[eé]bito|cart[aã]o\s*de\s*cr[eé]dito|cart[aã]o\s*de\s*d[eé]bito|cart[aã]o|dinheiro|esp[eé]cie|prazo|fiado|boleto|transfer[eê]ncia)/i
const RX_DATA = /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/

function normalizeForma(f) {
  if (!f) return null
  const fl = f.toLowerCase().replace(/[éê]/g, 'e').replace(/[ãâá]/g, 'a')
  if (fl.includes('pix')) return 'pix'
  if (fl.includes('dinheiro') || fl.includes('especie')) return 'dinheiro'
  if (fl.includes('debito')) return 'debito'
  if (fl.includes('credito') || fl.includes('cartao')) return 'credito_1x'
  if (fl.includes('prazo') || fl.includes('fiado')) return 'a_prazo'
  if (fl.includes('boleto')) return 'boleto'
  if (fl.includes('transfer')) return 'transferencia'
  return fl.replace(/\s+/g, '_')
}

function parseComment(c) {
  const text = c.text
  const m1 = text.match(RX_VALOR)
  const valor = m1 ? parseFloat(m1[1].replace(',', '.')) : null
  const m2 = text.match(RX_PAG)
  const forma = normalizeForma(m2?.[1])

  // Data explícita: tenta extrair DD/MM, infere ano do comentário
  const commentYear = c.date.slice(0, 4)
  const commentMonth = parseInt(c.date.slice(5, 7))
  let dataPagamento = c.date.slice(0, 10) // default: data do comentário
  const m3 = text.match(RX_DATA)
  if (m3) {
    const dia = m3[1].padStart(2, '0')
    const mes = m3[2].padStart(2, '0')
    const ano = m3[3] ? (m3[3].length === 2 ? '20' + m3[3] : m3[3]) : commentYear
    // Sanidade: ignora datas muito longe (>60d) do comentário
    const explicit = new Date(`${ano}-${mes}-${dia}T00:00:00`)
    const commentDt = new Date(c.date)
    const diffDays = Math.abs((explicit - commentDt) / (1000 * 60 * 60 * 24))
    if (diffDays <= 60 && /^\d{4}-\d{2}-\d{2}$/.test(`${ano}-${mes}-${dia}`)) {
      dataPagamento = `${ano}-${mes}-${dia}`
    }
  }

  // Descrição: remove o valor + forma + data, sobra o serviço
  let desc = text
    .replace(RX_VALOR, '')
    .replace(RX_PAG, '')
    .replace(RX_DATA, '')
    .replace(/\*+/g, '')
    .replace(/^\s*-\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!desc || desc.length < 3) desc = 'Serviço Trello'

  return { id: c.id, text, commentDate: c.date, valor, forma, dataPagamento, descricao: desc }
}

// Pra cada card: encontrar o comentário MAIS RECENTE com valor+forma (geralmente o de pagamento)
const cardsEnriquecer = []
for (const card of cards) {
  const comments = (commentsByCard.get(card.id) || []).sort((a, b) => b.date.localeCompare(a.date))
  const parseados = comments.map(parseComment).filter(p => p.valor && p.forma)
  if (parseados.length === 0) continue

  // Pega o de pagamento (geralmente mais recente OU o primeiro que casa)
  const principal = parseados[0]
  cardsEnriquecer.push({
    trello_id: card.id,
    trello_short: card.shortLink || card.id.slice(0, 8),
    card_name: card.name?.slice(0, 100),
    ...principal,
  })
}

console.log(`📋 ${cards.length} cards Trello (não fechados)`)
console.log(`💬 ${commentsByCard.size} com comentários`)
console.log(`💰 ${cardsEnriquecer.length} cards com comentário parseável (valor+forma)`)

// Stats
const formaDist = {}, somaTotal = cardsEnriquecer.reduce((s, c) => {
  formaDist[c.forma] = (formaDist[c.forma] || 0) + 1
  return s + c.valor
}, 0)
console.log(`💵 Soma: R$ ${somaTotal.toFixed(2)}`)
console.log(`📊 Formas:`, formaDist)

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true })
fs.writeFileSync(JSON_OUT, JSON.stringify({
  total_cards: cards.length,
  cards_enriquecer: cardsEnriquecer.length,
  soma_valor: somaTotal,
  distribuicao_formas: formaDist,
  amostra: cardsEnriquecer.slice(0, 10),
}, null, 2))

// ────────── SQL ──────────
function sqlEscape(s) { return s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'" }

function writeFile(name, content) {
  const p = `${SQL_DIR}/${name}`
  fs.writeFileSync(p, content)
  console.log(`📜 ${name} (${(fs.statSync(p).size/1024).toFixed(1)} KB)`)
}

const BATCH = 100

// ─── 23a: staging + INSERTs ───
const a = []
a.push(`-- sql/23a-trello-enriquece-staging.sql`)
a.push(`-- Cria staging _trello_enrich + popula ${cardsEnriquecer.length} cards parseáveis.`)
a.push(``)
a.push(`DROP TABLE IF EXISTS _trello_enrich;`)
a.push(``)
a.push(`CREATE TABLE _trello_enrich (`)
a.push(`  trello_id text PRIMARY KEY,`)
a.push(`  comment_id text,`)
a.push(`  valor numeric,`)
a.push(`  forma text,`)
a.push(`  data_pagamento date,`)
a.push(`  descricao text`)
a.push(`);`)
a.push(``)
for (let i = 0; i < cardsEnriquecer.length; i += BATCH) {
  const slice = cardsEnriquecer.slice(i, i + BATCH)
  a.push(`INSERT INTO _trello_enrich VALUES`)
  a.push(slice.map(c => `(${sqlEscape(c.trello_id)}, ${sqlEscape(c.id)}, ${c.valor.toFixed(2)}::numeric, ${sqlEscape(c.forma)}, ${sqlEscape(c.dataPagamento)}::date, ${sqlEscape(c.descricao.slice(0, 200))})`).join(',\n'))
  a.push(`;`)
  a.push(``)
}
a.push(`SELECT COUNT(*) AS cards_enrich_staging FROM _trello_enrich;`)
writeFile('23a-trello-enriquece-staging.sql', a.join('\n'))

// ─── 23b: lógica de enriquecimento ───
const b = []
b.push(`-- sql/23b-trello-enriquece-logica.sql`)
b.push(`-- Aplica enriquecimento Trello em 3 passos:`)
b.push(`-- 1. UPDATE OS Trello sem valor → seta valor/pago/forma`)
b.push(`-- 2. INSERT os_item com descrição do comentário`)
b.push(`-- 3. INSERT lancamento_financeiro (receita) — só pra OS Trello SEM Bling enrichment`)
b.push(`-- Idempotente via tag TRELLO-COMENT:<comment_id> em descricao do financeiro.`)
b.push(``)
b.push(`-- 1. UPDATE OS — só pra OS que ainda têm valor_total=0/NULL E têm TRELLO-CARD tag`)
b.push(`UPDATE os o`)
b.push(`SET valor_total = te.valor,`)
b.push(`    valor_pago = te.valor,`)
b.push(`    pago = 'total'::os_pagamento_status,`)
b.push(`    forma_pagamento = COALESCE(o.forma_pagamento, te.forma),`)
b.push(`    data_conclusao = COALESCE(o.data_conclusao, te.data_pagamento::timestamptz),`)
b.push(`    observacoes = CASE`)
b.push(`      WHEN o.observacoes ILIKE '%TRELLO-COMENT:' || te.comment_id || '%' THEN o.observacoes`)
b.push(`      ELSE COALESCE(o.observacoes, '') || E'\\n[TRELLO-COMENT:' || te.comment_id || ']'`)
b.push(`    END`)
b.push(`FROM _trello_enrich te`)
b.push(`WHERE o.observacoes ILIKE '%TRELLO-CARD:' || te.trello_id || '%'`)
b.push(`  AND o.deleted_at IS NULL`)
b.push(`  AND (o.valor_total IS NULL OR o.valor_total = 0)`)
b.push(`  AND o.observacoes NOT ILIKE '%TRELLO-COMENT:' || te.comment_id || '%';`)
b.push(``)
b.push(`-- 2. INSERT os_item — descrição do comentário como serviço`)
b.push(`INSERT INTO os_item (os_id, nome, quantidade, valor_unitario)`)
b.push(`SELECT o.id, te.descricao, 1::numeric, te.valor`)
b.push(`FROM _trello_enrich te`)
b.push(`JOIN os o ON o.observacoes ILIKE '%TRELLO-CARD:' || te.trello_id || '%'`)
b.push(`         AND o.deleted_at IS NULL`)
b.push(`         AND o.observacoes ILIKE '%TRELLO-COMENT:' || te.comment_id || '%'  -- só OS que receberam o UPDATE`)
b.push(`WHERE NOT EXISTS (`)
b.push(`  SELECT 1 FROM os_item oi`)
b.push(`  WHERE oi.os_id = o.id`)
b.push(`    AND oi.nome = te.descricao`)
b.push(`    AND oi.valor_unitario = te.valor`)
b.push(`    AND oi.deleted_at IS NULL`)
b.push(`);`)
b.push(``)
b.push(`-- 3. INSERT lancamento_financeiro — só pra OS sem lançamento Bling`)
b.push(`-- (pra evitar dupla contagem com sql 20)`)
b.push(`INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)`)
b.push(`SELECT`)
b.push(`  'receita',`)
b.push(`  te.valor,`)
b.push(`  'Vendas de serviços',`)
b.push(`  'TRELLO-COMENT:' || te.comment_id || ' ' || COALESCE(te.descricao, ''),`)
b.push(`  te.data_pagamento,`)
b.push(`  te.data_pagamento,`)
b.push(`  te.forma,`)
b.push(`  (SELECT id FROM conta_bancaria WHERE nome = 'Caixa Bling' LIMIT 1)`)
b.push(`FROM _trello_enrich te`)
b.push(`JOIN os o ON o.observacoes ILIKE '%TRELLO-CARD:' || te.trello_id || '%'`)
b.push(`         AND o.deleted_at IS NULL`)
b.push(`         AND o.observacoes ILIKE '%TRELLO-COMENT:' || te.comment_id || '%'`)
b.push(`WHERE NOT EXISTS (`)
b.push(`  SELECT 1 FROM lancamento_financeiro lf`)
b.push(`  WHERE lf.descricao LIKE 'TRELLO-COMENT:' || te.comment_id || '%'`)
b.push(`    AND lf.deleted_at IS NULL`)
b.push(`)`)
b.push(`AND NOT EXISTS (`)
b.push(`  -- não duplica se já tem lançamento Bling pra OS`)
b.push(`  SELECT 1 FROM lancamento_financeiro lf2`)
b.push(`  WHERE lf2.descricao LIKE 'BLING-REC:%'`)
b.push(`    AND lf2.vencimento = te.data_pagamento`)
b.push(`    AND lf2.valor = te.valor`)
b.push(`    AND lf2.deleted_at IS NULL`)
b.push(`);`)
b.push(``)
b.push(`-- Verificação`)
b.push(`SELECT`)
b.push(`  (SELECT COUNT(*) FROM os WHERE observacoes ILIKE '%TRELLO-COMENT:%' AND deleted_at IS NULL) AS os_enriquecidas,`)
b.push(`  (SELECT COUNT(*) FROM lancamento_financeiro WHERE descricao LIKE 'TRELLO-COMENT:%' AND deleted_at IS NULL) AS lancamentos_novos,`)
b.push(`  (SELECT SUM(valor) FROM lancamento_financeiro WHERE descricao LIKE 'TRELLO-COMENT:%' AND deleted_at IS NULL) AS soma_novos,`)
b.push(`  (SELECT COUNT(*) FROM _trello_enrich) AS staging_total;`)
b.push(``)
b.push(`-- Cleanup`)
b.push(`DROP TABLE IF EXISTS _trello_enrich;`)
writeFile('23b-trello-enriquece-logica.sql', b.join('\n'))

console.log(`\n✨ 2 SQLs criados. Rodar NA ORDEM: 23a → 23b`)
