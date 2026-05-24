// scripts/gerar-sql-bling-os.mjs
// Gera SQL idempotente pra importar pedidos_venda.csv como OS retroativas.
// Matching feito DENTRO do SQL (RLS bloqueia probe externo).
//
// Estratégia: 3 partes
// 1. Cria staging tables + popula (em statements separados — cada um é um INSERT batch)
// 2. UPDATE OS Trello existentes (enriquece) + INSERT novas OS retroativas + INSERT os_item
// 3. Cleanup das staging tables + SELECT de verificação
//
// Idempotência: tag BLING-PEDIDO:<num> em os.observacoes

import fs from 'fs'
import path from 'path'

const ROOT_BLING = 'C:/Users/Toni-PC/projetos/idemaq/Base de dados clientes Bling/Nova pasta'
const SQL_DIR = 'C:/Users/Toni-PC/projetos/idemaq/sql'
const JSON_OUT = 'C:/Users/Toni-PC/projetos/idemaq/relatorios/bling-os-import.json'

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

function parseDataBR(s) {
  if (!s) return null
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

function parseValor(s) {
  if (!s) return null
  const cleaned = String(s).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function normTel(s) {
  const d = (s || '').replace(/\D/g, '').replace(/^55/, '')
  return d.length >= 8 ? d : null
}

function extractTrelloId(url) {
  const m = String(url || '').match(/trello\.com\/c\/([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

function sqlEscape(s) { return s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'" }

function mapTipoOS(produto) {
  const p = (produto || '').toLowerCase()
  if (/m[áa]quina|maquina.*lavar/i.test(p) && /revis|reform|vend/i.test(p)) return 'venda'
  return 'atendimento'
}

function mapFormaPagamento(f) {
  if (!f) return null
  const fl = f.toLowerCase().trim()
  if (fl === 'pix') return 'pix'
  if (fl === 'dinheiro') return 'dinheiro'
  if (fl.includes('credito') || fl.includes('crédito')) return 'credito_1x'
  if (fl.includes('debito') || fl.includes('débito')) return 'debito'
  if (fl.includes('conta a receber')) return 'a_prazo'
  return null
}

// ────────── Carrega ──────────
const raw = parseCSV(fs.readFileSync(path.join(ROOT_BLING, 'pedidos_venda.csv'), 'utf8'))
const pedidos = new Map()
for (const r of raw) {
  const num = r['Número pedido']?.trim()
  if (!num) continue
  if (!pedidos.has(num)) {
    pedidos.set(num, {
      numero: num,
      cliente_nome: r['Nome Comprador']?.trim() || null,
      cpf_cnpj: r['CPF/CNPJ Comprador']?.trim() || null,
      telefone: normTel(r['Telefone Comprador'] || r['Celular Comprador']),
      data: parseDataBR(r['Data']),
      endereco: [r['Endereço Comprador'], r['Número Comprador'], r['Bairro Comprador'], r['Cidade Comprador'], r['UF Comprador'], r['CEP Comprador']].filter(Boolean).join(', ') || null,
      total: parseValor(r['Total Pedido']),
      desconto: parseValor(r['Valor Desconto Pedido']) || 0,
      forma_pagamento: mapFormaPagamento(r['Forma Pagamento']),
      observacoes: r['Observações']?.trim() || null,
      trello_id: extractTrelloId(r['E-mail Comprador']),
      itens: [],
    })
  }
  const ped = pedidos.get(num)
  if (mapTipoOS(r['Produto']) === 'venda') ped.tipo_provisorio = 'venda'
  ped.itens.push({
    nome: r['Produto']?.trim() || '(item)',
    sku: r['SKU']?.trim() || null,
    quantidade: parseValor(r['Quantidade']) || 1,
    valor_unit: parseValor(r['Valor Unitário']) || 0,
  })
}

const lista = [...pedidos.values()].map(p => ({ ...p, tipo: p.tipo_provisorio || 'atendimento' }))
const validos = lista.filter(p => p.data && p.cliente_nome)

const itensFlat = []
for (const p of validos) {
  for (const item of p.itens) {
    itensFlat.push({ pedido_numero: p.numero, ...item })
  }
}

console.log(`📋 ${lista.length} pedidos (${raw.length} linhas-produto)`)
console.log(`✅ Válidos: ${validos.length}, itens: ${itensFlat.length}`)

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true })
fs.writeFileSync(JSON_OUT, JSON.stringify({
  total_pedidos: lista.length,
  validos: validos.length,
  amostra: validos.slice(0, 3),
}, null, 2))

// ────────── Gera SQL — 4 arquivos pequenos (Supabase trunca >100KB) ──────────
const BATCH = 100

function writeFile(name, content) {
  const p = `${SQL_DIR}/${name}`
  fs.writeFileSync(p, content)
  console.log(`📜 ${name} (${(fs.statSync(p).size/1024).toFixed(1)} KB)`)
}

// ─── 22a-pedidos: 22a1 (schema+metade) + 22a2 (metade) ───
const halfPedidos = Math.ceil(validos.length / 2)

const a1 = []
a1.push(`-- sql/22a1-bling-os-staging-pedidos-1.sql`)
a1.push(`-- PARTE 1/6: cria _bling_pedido + popula 1ª metade (${halfPedidos} de ${validos.length}).`)
a1.push(``)
a1.push(`DROP TABLE IF EXISTS _bling_match;`)
a1.push(`DROP TABLE IF EXISTS _bling_item;`)
a1.push(`DROP TABLE IF EXISTS _bling_pedido;`)
a1.push(``)
a1.push(`CREATE TABLE _bling_pedido (`)
a1.push(`  numero text PRIMARY KEY,`)
a1.push(`  cliente_nome text, telefone text, endereco text,`)
a1.push(`  data date, total numeric, desconto numeric,`)
a1.push(`  forma_pagamento text, observacoes text, trello_id text, tipo text`)
a1.push(`);`)
a1.push(``)
for (let i = 0; i < halfPedidos; i += BATCH) {
  const slice = validos.slice(i, Math.min(i + BATCH, halfPedidos))
  a1.push(`INSERT INTO _bling_pedido VALUES`)
  a1.push(slice.map(p => `(${sqlEscape(p.numero)}, ${sqlEscape(p.cliente_nome)}, ${sqlEscape(p.telefone)}, ${sqlEscape(p.endereco)}, ${sqlEscape(p.data)}::date, ${(p.total ?? 0).toFixed(2)}::numeric, ${(p.desconto ?? 0).toFixed(2)}::numeric, ${sqlEscape(p.forma_pagamento)}, ${sqlEscape(p.observacoes)}, ${sqlEscape(p.trello_id)}, ${sqlEscape(p.tipo)})`).join(',\n'))
  a1.push(`;`)
  a1.push(``)
}
a1.push(`SELECT COUNT(*) AS pedidos_inseridos_parte1 FROM _bling_pedido;`)
writeFile('22a1-bling-os-staging-pedidos-1.sql', a1.join('\n'))

const a2 = []
a2.push(`-- sql/22a2-bling-os-staging-pedidos-2.sql`)
a2.push(`-- PARTE 2/6: popula 2ª metade dos pedidos (${validos.length - halfPedidos} restantes).`)
a2.push(`-- Pré-req: 22a1 rodado.`)
a2.push(``)
for (let i = halfPedidos; i < validos.length; i += BATCH) {
  const slice = validos.slice(i, i + BATCH)
  a2.push(`INSERT INTO _bling_pedido VALUES`)
  a2.push(slice.map(p => `(${sqlEscape(p.numero)}, ${sqlEscape(p.cliente_nome)}, ${sqlEscape(p.telefone)}, ${sqlEscape(p.endereco)}, ${sqlEscape(p.data)}::date, ${(p.total ?? 0).toFixed(2)}::numeric, ${(p.desconto ?? 0).toFixed(2)}::numeric, ${sqlEscape(p.forma_pagamento)}, ${sqlEscape(p.observacoes)}, ${sqlEscape(p.trello_id)}, ${sqlEscape(p.tipo)})`).join(',\n'))
  a2.push(`;`)
  a2.push(``)
}
a2.push(`SELECT COUNT(*) AS pedidos_total FROM _bling_pedido;`)
writeFile('22a2-bling-os-staging-pedidos-2.sql', a2.join('\n'))

// ─── 22b-itens: 22b1 (schema+metade) + 22b2 (metade) ───
const halfItens = Math.ceil(itensFlat.length / 2)

const b1 = []
b1.push(`-- sql/22b1-bling-os-staging-itens-1.sql`)
b1.push(`-- PARTE 3/6: cria _bling_item + popula 1ª metade (${halfItens} de ${itensFlat.length}).`)
b1.push(`-- Pré-req: 22a1, 22a2 rodados.`)
b1.push(``)
b1.push(`CREATE TABLE _bling_item (`)
b1.push(`  pedido_numero text REFERENCES _bling_pedido(numero),`)
b1.push(`  nome text, sku text, quantidade numeric, valor_unit numeric`)
b1.push(`);`)
b1.push(``)
for (let i = 0; i < halfItens; i += BATCH) {
  const slice = itensFlat.slice(i, Math.min(i + BATCH, halfItens))
  b1.push(`INSERT INTO _bling_item VALUES`)
  b1.push(slice.map(it => `(${sqlEscape(it.pedido_numero)}, ${sqlEscape(it.nome)}, ${sqlEscape(it.sku)}, ${it.quantidade.toFixed(3)}::numeric, ${it.valor_unit.toFixed(2)}::numeric)`).join(',\n'))
  b1.push(`;`)
  b1.push(``)
}
b1.push(`SELECT COUNT(*) AS itens_inseridos_parte1 FROM _bling_item;`)
writeFile('22b1-bling-os-staging-itens-1.sql', b1.join('\n'))

const b2 = []
b2.push(`-- sql/22b2-bling-os-staging-itens-2.sql`)
b2.push(`-- PARTE 4/6: popula 2ª metade dos itens (${itensFlat.length - halfItens} restantes).`)
b2.push(`-- Pré-req: 22a1, 22a2, 22b1 rodados.`)
b2.push(``)
for (let i = halfItens; i < itensFlat.length; i += BATCH) {
  const slice = itensFlat.slice(i, i + BATCH)
  b2.push(`INSERT INTO _bling_item VALUES`)
  b2.push(slice.map(it => `(${sqlEscape(it.pedido_numero)}, ${sqlEscape(it.nome)}, ${sqlEscape(it.sku)}, ${it.quantidade.toFixed(3)}::numeric, ${it.valor_unit.toFixed(2)}::numeric)`).join(',\n'))
  b2.push(`;`)
  b2.push(``)
}
b2.push(`SELECT COUNT(*) AS itens_total FROM _bling_item;`)
writeFile('22b2-bling-os-staging-itens-2.sql', b2.join('\n'))

// ─── 22c: lógica (match + update + insert + insert itens + verify) ───
const c = []
c.push(`-- sql/22c-bling-os-import-logica.sql`)
c.push(`-- PARTE 5/6: match cliente+OS Trello, UPDATE OS existentes, INSERT novas OS, INSERT os_item.`)
c.push(`-- Pré-req: 22a1, 22a2, 22b1, 22b2 rodados.`)
c.push(``)
c.push(`-- 1. Match cliente (telefone) e OS Trello (observacoes)`)
c.push(`DROP TABLE IF EXISTS _bling_match;`)
c.push(`CREATE TABLE _bling_match AS`)
c.push(`SELECT`)
c.push(`  bp.numero AS pedido_numero,`)
c.push(`  bp.trello_id,`)
c.push(`  c.id AS cliente_id,`)
c.push(`  os.id AS os_existente_id,`)
c.push(`  os.numero AS os_existente_numero`)
c.push(`FROM _bling_pedido bp`)
c.push(`LEFT JOIN LATERAL (`)
c.push(`  SELECT id FROM cliente`)
c.push(`  WHERE deleted_at IS NULL`)
c.push(`    AND bp.telefone IS NOT NULL`)
c.push(`    AND regexp_replace(telefone, '[^0-9]', '', 'g') LIKE '%' || bp.telefone`)
c.push(`  LIMIT 1`)
c.push(`) c ON TRUE`)
c.push(`LEFT JOIN LATERAL (`)
c.push(`  SELECT id, numero FROM os`)
c.push(`  WHERE deleted_at IS NULL`)
c.push(`    AND bp.trello_id IS NOT NULL`)
c.push(`    AND observacoes ILIKE '%TRELLO-CARD:' || bp.trello_id || '%'`)
c.push(`  LIMIT 1`)
c.push(`) os ON TRUE;`)
c.push(``)
c.push(`SELECT COUNT(*) AS match_total, COUNT(cliente_id) AS com_cliente, COUNT(os_existente_id) AS com_os_trello FROM _bling_match;`)
c.push(``)
c.push(`-- 2. UPDATE OS Trello existentes (enriquece com dados Bling)`)
c.push(`UPDATE os o`)
c.push(`SET valor_total = COALESCE(NULLIF(o.valor_total, 0), bp.total),`)
c.push(`    valor_pago = CASE WHEN bp.forma_pagamento != 'a_prazo' THEN bp.total ELSE COALESCE(o.valor_pago, 0) END,`)
c.push(`    pago = CASE WHEN bp.forma_pagamento != 'a_prazo' THEN 'total'::os_pagamento_status ELSE COALESCE(o.pago, 'nao'::os_pagamento_status) END,`)
c.push(`    forma_pagamento = COALESCE(o.forma_pagamento, bp.forma_pagamento),`)
c.push(`    desconto = COALESCE(NULLIF(o.desconto, 0), bp.desconto),`)
c.push(`    cliente_id = COALESCE(o.cliente_id, m.cliente_id),`)
c.push(`    observacoes = CASE`)
c.push(`      WHEN o.observacoes ILIKE '%BLING-PEDIDO:%' THEN o.observacoes`)
c.push(`      ELSE COALESCE(o.observacoes, '') || E'\\n[BLING-PEDIDO:' || bp.numero || ']'`)
c.push(`    END`)
c.push(`FROM _bling_pedido bp`)
c.push(`JOIN _bling_match m ON m.pedido_numero = bp.numero`)
c.push(`WHERE m.os_existente_id = o.id`)
c.push(`  AND (o.observacoes IS NULL OR o.observacoes NOT ILIKE '%BLING-PEDIDO:' || bp.numero || '%');`)
c.push(``)
c.push(`-- 3. INSERT OS retroativas (pedidos Bling sem OS Trello)`)
c.push(`INSERT INTO os (cliente_id, tipo, etapa, valor_total, desconto, valor_pago, pago, forma_pagamento, observacoes, criado_em, data_conclusao)`)
c.push(`SELECT`)
c.push(`  m.cliente_id,`)
c.push(`  bp.tipo::os_tipo,`)
c.push(`  'concluido'::os_etapa,`)
c.push(`  bp.total,`)
c.push(`  bp.desconto,`)
c.push(`  CASE WHEN bp.forma_pagamento != 'a_prazo' THEN bp.total ELSE 0 END,`)
c.push(`  CASE WHEN bp.forma_pagamento != 'a_prazo' THEN 'total'::os_pagamento_status ELSE 'nao'::os_pagamento_status END,`)
c.push(`  bp.forma_pagamento,`)
c.push(`  COALESCE(bp.observacoes || E'\\n', '') || '[BLING-PEDIDO:' || bp.numero || ']' ||`)
c.push(`    CASE WHEN bp.trello_id IS NOT NULL THEN E'\\n[TRELLO-CARD:' || bp.trello_id || ']' ELSE '' END,`)
c.push(`  bp.data::timestamptz,`)
c.push(`  bp.data::timestamptz`)
c.push(`FROM _bling_pedido bp`)
c.push(`JOIN _bling_match m ON m.pedido_numero = bp.numero`)
c.push(`WHERE m.os_existente_id IS NULL`)
c.push(`  AND NOT EXISTS (`)
c.push(`    SELECT 1 FROM os o2`)
c.push(`    WHERE o2.observacoes ILIKE '%BLING-PEDIDO:' || bp.numero || '%'`)
c.push(`      AND o2.deleted_at IS NULL`)
c.push(`  );`)
c.push(``)
c.push(`-- 4. INSERT os_item — produtos de cada pedido`)
c.push(`INSERT INTO os_item (os_id, nome, quantidade, valor_unitario)`)
c.push(`SELECT`)
c.push(`  o.id,`)
c.push(`  bi.nome,`)
c.push(`  bi.quantidade,`)
c.push(`  bi.valor_unit`)
c.push(`FROM _bling_item bi`)
c.push(`JOIN os o ON o.observacoes ILIKE '%BLING-PEDIDO:' || bi.pedido_numero || '%'`)
c.push(`           AND o.deleted_at IS NULL`)
c.push(`WHERE NOT EXISTS (`)
c.push(`  SELECT 1 FROM os_item oi`)
c.push(`  WHERE oi.os_id = o.id`)
c.push(`    AND oi.nome = bi.nome`)
c.push(`    AND oi.valor_unitario = bi.valor_unit`)
c.push(`    AND oi.deleted_at IS NULL`)
c.push(`);`)
c.push(``)
c.push(`-- 5. Verificação`)
c.push(`SELECT`)
c.push(`  (SELECT COUNT(*) FROM os WHERE observacoes ILIKE '%BLING-PEDIDO:%' AND deleted_at IS NULL) AS os_com_tag_bling,`)
c.push(`  (SELECT COUNT(*) FROM os WHERE observacoes ILIKE '%BLING-PEDIDO:%' AND observacoes ILIKE '%TRELLO-CARD:%' AND deleted_at IS NULL) AS os_bling_e_trello,`)
c.push(`  (SELECT COUNT(*) FROM os_item oi JOIN os o ON o.id=oi.os_id WHERE o.observacoes ILIKE '%BLING-PEDIDO:%' AND oi.deleted_at IS NULL) AS itens_importados,`)
c.push(`  (SELECT SUM(valor_total) FROM os WHERE observacoes ILIKE '%BLING-PEDIDO:%' AND deleted_at IS NULL) AS soma_valores,`)
c.push(`  (SELECT COUNT(*) FROM _bling_match WHERE cliente_id IS NULL) AS pedidos_sem_cliente_match;`)
writeFile('22c-bling-os-import-logica.sql', c.join('\n'))

// ─── 22d: cleanup ───
const d = []
d.push(`-- sql/22d-bling-os-cleanup.sql`)
d.push(`-- PARTE 6/6: dropa as staging tables. Os dados em os/os_item ficam permanentes.`)
d.push(``)
d.push(`DROP TABLE IF EXISTS _bling_match;`)
d.push(`DROP TABLE IF EXISTS _bling_item;`)
d.push(`DROP TABLE IF EXISTS _bling_pedido;`)
d.push(``)
d.push(`SELECT 'Staging tables dropadas. Importação Bling concluída.' AS status;`)
writeFile('22d-bling-os-cleanup.sql', d.join('\n'))

// Deleta o antigo monolítico se existir
const oldFile = `${SQL_DIR}/22-bling-os-import.sql`
if (fs.existsSync(oldFile)) {
  fs.unlinkSync(oldFile)
  console.log(`🗑️  Removido: 22-bling-os-import.sql (substituído por 22a-d)`)
}

console.log(`\n✨ 6 SQLs criados. Rodar NA ORDEM: 22a1 → 22a2 → 22b1 → 22b2 → 22c → 22d`)
