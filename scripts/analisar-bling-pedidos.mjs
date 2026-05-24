// scripts/analisar-bling-pedidos.mjs
// Análise dos pedidos_venda.csv pra entender cobertura, duplicação com Trello,
// matching com clientes e gerar relatório pra decidir como importar.
//
// Pra import direto (depois): scripts/gerar-sql-bling-pedidos.mjs (próximo)
//
// Saída: relatorios/bling-pedidos-analise.json

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const ROOT_BLING = 'C:/Users/Toni-PC/projetos/idemaq/Base de dados clientes Bling/Nova pasta'
const JSON_OUT = 'C:/Users/Toni-PC/projetos/idemaq/relatorios/bling-pedidos-analise.json'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

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
  // Normaliza pra digitos (matching com cliente.telefone fica + robusto)
  return (s || '').replace(/\D/g, '').replace(/^55/, '') // remove DDI 55 se vier
}

function extractTrelloId(url) {
  // https://trello.com/c/Q63Kz9rr/96-diego-pachega → Q63Kz9rr
  const m = String(url || '').match(/trello\.com\/c\/([a-zA-Z0-9]+)/)
  return m ? m[1] : null
}

// ────────── Carga ──────────
const raw = parseCSV(fs.readFileSync(path.join(ROOT_BLING, 'pedidos_venda.csv'), 'utf8'))
console.log(`📥 ${raw.length} linhas (produtos) em pedidos_venda.csv`)

// Agrupa por número de pedido
const pedidosMap = new Map()
for (const r of raw) {
  const num = r['Número pedido']?.trim()
  if (!num) continue
  if (!pedidosMap.has(num)) {
    pedidosMap.set(num, {
      numero: num,
      cliente_nome: r['Nome Comprador'],
      cpf_cnpj: r['CPF/CNPJ Comprador'],
      telefone: r['Telefone Comprador'] || r['Celular Comprador'],
      data: parseDataBR(r['Data']),
      endereco: [r['Endereço Comprador'], r['Número Comprador'], r['Bairro Comprador'], r['Cidade Comprador'], r['UF Comprador'], r['CEP Comprador']].filter(Boolean).join(', '),
      total: parseValor(r['Total Pedido']),
      forma_pagamento: r['Forma Pagamento'],
      observacoes: r['Observações'],
      trello_id: extractTrelloId(r['E-mail Comprador']),
      trello_url: /trello\.com/.test(r['E-mail Comprador']) ? r['E-mail Comprador'] : null,
      itens: [],
    })
  }
  const ped = pedidosMap.get(num)
  ped.itens.push({
    produto: r['Produto'],
    sku: r['SKU'],
    un: r['Un'],
    quantidade: parseValor(r['Quantidade']) || 1,
    valor_unit: parseValor(r['Valor Unitário']),
    valor_total: parseValor(r['Valor Total']),
  })
}

const pedidos = [...pedidosMap.values()]
console.log(`📋 ${pedidos.length} pedidos únicos`)

// ────────── Análise: distribuição ──────────
const distFormas = {}
const distAnos = {}
let comTrello = 0
let semCPF = 0
let semTel = 0
let totalSomado = 0
const semData = []
for (const p of pedidos) {
  distFormas[p.forma_pagamento || '(vazio)'] = (distFormas[p.forma_pagamento || '(vazio)'] || 0) + 1
  const ano = p.data?.slice(0, 4) || '(sem data)'
  distAnos[ano] = (distAnos[ano] || 0) + 1
  if (p.trello_id) comTrello++
  if (!p.cpf_cnpj) semCPF++
  if (!p.telefone) semTel++
  if (p.total) totalSomado += p.total
  if (!p.data) semData.push(p.numero)
}

console.log('Por ano:', distAnos)
console.log('Formas pagamento:', distFormas)
console.log(`Com Trello: ${comTrello}/${pedidos.length}`)
console.log(`Sem CPF: ${semCPF}, sem tel: ${semTel}`)
console.log(`Soma total: R$ ${totalSomado.toFixed(2)}`)

// ────────── Match com banco: clientes via telefone + OS via trello_id ──────────
console.log('\n🔍 Consultando banco pra cruzar matches...')

const tels = [...new Set(pedidos.map(p => normTel(p.telefone)).filter(t => t.length >= 8))]
const trelloIds = [...new Set(pedidos.map(p => p.trello_id).filter(Boolean))]

const cliMatch = new Map()
const osMatch = new Map()

// 1. Match clientes por telefone (batches de 200)
let cliEncontrados = 0
for (let i = 0; i < tels.length; i += 200) {
  const slice = tels.slice(i, i + 200)
  const filtros = slice.map(t => `telefone.ilike.%${t}%`).join(',')
  const r = await supabase.from('cliente').select('id, nome, telefone').or(filtros).is('deleted_at', null).limit(500)
  if (r.error) { console.warn('Cliente match erro:', r.error.message); break }
  for (const c of r.data || []) {
    const tn = normTel(c.telefone)
    if (tn) {
      cliMatch.set(tn, { id: c.id, nome: c.nome, telefone: c.telefone })
      cliEncontrados++
    }
  }
}
console.log(`  Cliente match: ${cliMatch.size} encontrados de ${tels.length} telefones únicos`)

// 2. Match OS por TRELLO-CARD:<id> nas observacoes
let osEncontradas = 0
for (let i = 0; i < trelloIds.length; i += 100) {
  const slice = trelloIds.slice(i, i + 100)
  const filtros = slice.map(id => `observacoes.ilike.%TRELLO-CARD:${id}%`).join(',')
  const r = await supabase.from('os').select('id, numero, observacoes, etapa, valor_total, cliente_id').or(filtros).is('deleted_at', null).limit(500)
  if (r.error) { console.warn('OS match erro:', r.error.message); break }
  for (const o of r.data || []) {
    const m = o.observacoes?.match(/TRELLO-CARD:([a-zA-Z0-9]+)/)
    if (m) {
      osMatch.set(m[1], { id: o.id, numero: o.numero, etapa: o.etapa, valor_total: o.valor_total, cliente_id: o.cliente_id })
      osEncontradas++
    }
  }
}
console.log(`  OS match: ${osMatch.size} OS Trello encontradas de ${trelloIds.length} cards únicos no Bling`)

// 3. Categoriza cada pedido
const buckets = {
  com_os_trello_existente: 0,  // ideal: vai dar UPDATE
  sem_trello: 0,                // INSERT novo, sem link
  trello_sem_match: 0,          // INSERT novo, sem OS pré-existente
  cliente_matched: 0,
  cliente_nao_matched: 0,
}

const pedidoBuckets = pedidos.map(p => {
  const tel = normTel(p.telefone)
  const cli = tel ? cliMatch.get(tel) : null
  const os = p.trello_id ? osMatch.get(p.trello_id) : null

  let categoria
  if (os) { categoria = 'com_os_trello_existente'; buckets.com_os_trello_existente++ }
  else if (!p.trello_id) { categoria = 'sem_trello'; buckets.sem_trello++ }
  else { categoria = 'trello_sem_match'; buckets.trello_sem_match++ }

  if (cli) buckets.cliente_matched++; else buckets.cliente_nao_matched++

  return { ...p, categoria, cliente_match: cli, os_match: os }
})

console.log('\n📊 Buckets:')
console.log(buckets)

// ────────── Saída JSON pra revisão ──────────
const out = {
  meta: { gerado_em: new Date().toISOString(), total_pedidos: pedidos.length, total_itens: raw.length },
  distribuicao: { por_ano: distAnos, formas_pagamento: distFormas, total_somado: totalSomado },
  matching: {
    com_trello: comTrello,
    sem_cpf: semCPF,
    sem_telefone: semTel,
    sem_data: semData.length,
  },
  cruzamento_db: {
    telefones_unicos: tels.length,
    clientes_encontrados: cliMatch.size,
    trello_ids_unicos: trelloIds.length,
    os_trello_encontradas: osMatch.size,
  },
  buckets,
  amostra_com_os_trello: pedidoBuckets.filter(p => p.categoria === 'com_os_trello_existente').slice(0, 8),
  amostra_sem_trello: pedidoBuckets.filter(p => p.categoria === 'sem_trello').slice(0, 8),
  amostra_trello_sem_match: pedidoBuckets.filter(p => p.categoria === 'trello_sem_match').slice(0, 8),
}

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true })
fs.writeFileSync(JSON_OUT, JSON.stringify(out, null, 2))
console.log(`\n📄 Análise salva em: ${JSON_OUT}`)

// também salva os pedidos completos (sem amostragem) num arquivo separado pra uso pelo gerador SQL
fs.writeFileSync('C:/Users/Toni-PC/projetos/idemaq/relatorios/bling-pedidos-tagueados.json', JSON.stringify({ pedidos: pedidoBuckets }, null, 2))
console.log(`📄 Pedidos tagueados (input do gerador SQL): relatorios/bling-pedidos-tagueados.json`)
