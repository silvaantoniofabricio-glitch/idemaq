// scripts/cruzar-ml-com-nfe-v3.mjs
// Cruzamento V3 — descoberta: 1 pedido ML pode espalhar em N NF-e (1 por vendedor).
// Não usa valor (ML só tem total do pedido). Match por: nome do item + data ±7d.
// Cada NF-e item só pode casar com UMA compra ML (1:1).

import fs from 'fs'
import path from 'path'

const ROOT = 'C:/Users/Toni-PC/projetos/idemaq'
const PASTA = path.join(ROOT, 'RELATORIO OUTRAS LOJAS', 'COMPRAS ML', 'CRUZAR DADOS COM NOTAS')

// ─── Util ─────────────────────────────────────────────────────────────────
function parseCsv(t) {
  const ls = t.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.length)
  const h = parseLine(ls[0])
  return ls.slice(1).map(l => {
    const v = parseLine(l); const o = {}; h.forEach((k, j) => o[k] = v[j] || ''); return o
  })
}
function parseLine(l) {
  const o = []; let c = '', q = false
  for (let i = 0; i < l.length; i++) {
    const ch = l[i]
    if (ch === '"') { if (q && l[i+1] === '"') { c += '"'; i++ } else q = !q }
    else if (ch === ',' && !q) { o.push(c); c = '' } else c += ch
  }
  o.push(c); return o
}
const MESES = {janeiro:0,fevereiro:1,'março':2,marco:2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11}
function parseDataPtBr(s) {
  if (!s) return null
  const m = s.toLowerCase().match(/(\d+)\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?/)
  if (!m) return null
  const dia = +m[1], mes = MESES[m[2]], ano = m[3] ? +m[3] : 2025
  return mes != null ? new Date(ano, mes, dia) : null
}
function parseValor(s) {
  if (!s) return null
  const l = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(l); return isNaN(n) ? null : n
}
function tokens(s) {
  return (s || '').toLowerCase()
    .replace(/[áàâã]/g,'a').replace(/[éê]/g,'e').replace(/[íî]/g,'i')
    .replace(/[óôõ]/g,'o').replace(/[úû]/g,'u').replace(/[ç]/g,'c')
    .split(/\W+/).filter(t => t.length >= 3)
}
function sim(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b))
  if (!A.size || !B.size) return 0
  let n = 0; for (const t of A) if (B.has(t)) n++
  return n / Math.max(A.size, B.size)
}

// ─── Carrega ──────────────────────────────────────────────────────────────
const nfeData = JSON.parse(fs.readFileSync(path.join(ROOT, 'relatorios', 'itens-extraidos.json'), 'utf8'))
const empresa = parseCsv(fs.readFileSync(path.join(ROOT, 'RELATORIO OUTRAS LOJAS', 'COMPRAS ML', 'compras_EMPRESA.csv'), 'utf8'))
const pessoal = parseCsv(fs.readFileSync(path.join(ROOT, 'RELATORIO OUTRAS LOJAS', 'COMPRAS ML', 'compras_PESSOAL.csv'), 'utf8'))
console.log(`NF-e: ${nfeData.itens.length} itens · ML: ${empresa.length} EMP + ${pessoal.length} PES`)

// ─── Compras ML com data + idx ────────────────────────────────────────────
const compras = []
for (const r of empresa) {
  compras.push({
    cat: 'EMPRESA', num: r['Numero da Compra'], item: r['Item Comprado'],
    dataStr: r['Data da Compra'], data: parseDataPtBr(r['Data da Compra']),
    valorPedido: parseValor(r['Valor Total']), fornecedor: r['Fornecedor'],
    cartao: r['Cartão Usado'], pagto: r['Forma de Pagamento'],
    raw: r,
  })
}
for (const r of pessoal) {
  compras.push({
    cat: 'PESSOAL', num: r['Numero da Compra'], item: r['Item Comprado'],
    dataStr: r['Data da Compra'], data: parseDataPtBr(r['Data da Compra']),
    valorPedido: parseValor(r['Valor Total']), fornecedor: r['Fornecedor'],
    cartao: r['Cartão Usado'], pagto: r['Forma de Pagamento'],
    raw: r,
  })
}

// ─── Itens NF-e indexados ────────────────────────────────────────────────
const itensNFE = nfeData.itens.map((it, idx) => ({
  idx, ...it, data: new Date(it.dataEmissao),
  casado: false,  // marcado quando achar um match
}))

// ─── Match: pra cada compra ML, melhor NF-e ───────────────────────────────
// Critério: data ±7d + similaridade nome ≥ 0.35 (peso forte no nome)
// Cada NF-e item só pode ser casado UMA vez (greedy by best score)

function calcScore(c, nfe) {
  if (!c.data) return 0
  const diffDias = Math.abs((nfe.data - c.data) / 86400000)
  if (diffDias > 14) return 0    // janela ampla pq às vezes ML data ≠ NF emissão
  const s = sim(c.item, nfe.xProd)
  if (s < 0.25) return 0          // similaridade mínima
  const scoreData = Math.max(0, 1 - diffDias / 14)
  return s * 0.75 + scoreData * 0.25
}

// Ordena compras de forma a casar primeiro as mais "específicas" (nomes mais longos = mais info)
const ordemCompras = compras.map((c, i) => ({c, i, len: tokens(c.item).length}))
  .sort((a, b) => b.len - a.len)
  .map(x => x.i)

const matches = new Array(compras.length).fill(null)

for (const i of ordemCompras) {
  const c = compras[i]
  if (!c.data) continue
  let melhor = null, melhorScore = 0
  for (const nfe of itensNFE) {
    if (nfe.casado) continue
    const s = calcScore(c, nfe)
    if (s > melhorScore) { melhorScore = s; melhor = nfe }
  }
  if (melhor && melhorScore >= 0.40) {
    melhor.casado = true
    const diffDias = Math.abs((melhor.data - c.data) / 86400000)
    const simNome = sim(c.item, melhor.xProd)
    matches[i] = { nfe: melhor, score: melhorScore, diffDias, simNome }
  }
}

// ─── Constrói saídas ─────────────────────────────────────────────────────
function linhaML(c, m) {
  const n = m?.nfe
  return {
    Categoria: c.cat, 'Numero da Compra': c.num, 'Item ML': c.item,
    'Data ML': c.dataStr, 'Valor Pedido ML': c.raw['Valor Total'],
    'Fornecedor ML': c.fornecedor, 'Cartão': c.cartao, 'Pagto': c.pagto,
    'Tem NF-e?': m ? 'SIM' : 'NÃO',
    'NF-e nº': n?.numeroNF || '',
    'NF-e Data': n ? n.data.toISOString().slice(0,10) : '',
    'NF-e CNPJ': n?.fornecedor?.cnpj || '',
    'NF-e Fornecedor': n?.fornecedor?.fantasia || n?.fornecedor?.razao || '',
    'NF-e Item': n?.xProd || '',
    'NF-e cProd': n?.cProd || '',
    'NF-e Qtd': n?.qCom || '',
    'NF-e vUnit': n?.vUnCom?.toFixed(2) || '',
    'NF-e Total Item': n?.vProd?.toFixed(2) || '',
    'NF-e NCM': n?.ncm || '',
    'NF-e CFOP': n?.cfop || '',
    'Score': m ? m.score.toFixed(2) : '',
    'Δ dias': m ? m.diffDias.toFixed(0) : '',
    'Sim. nome': m ? (m.simNome*100).toFixed(0)+'%' : '',
    'Arquivo XML': n?.arquivo || '',
  }
}

const linhasEmp = []
const linhasPes = []
for (let i = 0; i < compras.length; i++) {
  const c = compras[i]
  const linha = linhaML(c, matches[i])
  if (c.cat === 'EMPRESA') linhasEmp.push(linha)
  else linhasPes.push(linha)
}

// ─── Perspectiva NF-e ────────────────────────────────────────────────────
// idx NFE → compra ML que casou (se houver)
const idxParaCompra = new Map()
for (let i = 0; i < matches.length; i++) {
  if (matches[i]) idxParaCompra.set(matches[i].nfe.idx, compras[i])
}

function linhaNFE(it, c) {
  return {
    'NF-e nº': it.numeroNF,
    'NF-e Data': new Date(it.dataEmissao).toISOString().slice(0,10),
    'NF-e CNPJ': it.fornecedor?.cnpj || '',
    'NF-e Fornecedor': it.fornecedor?.fantasia || it.fornecedor?.razao || '',
    'NF-e Item': it.xProd,
    'NF-e cProd': it.cProd,
    'NF-e Qtd': it.qCom,
    'NF-e vUnit': it.vUnCom,
    'NF-e Total': it.vProd,
    'NF-e NCM': it.ncm,
    'NF-e CFOP': it.cfop,
    'Arquivo XML': it.arquivo,
    'Tem Compra ML?': c ? 'SIM' : 'NÃO',
    'ML Categoria': c?.cat || '',
    'ML Numero': c?.num || '',
    'ML Item': c?.item || '',
    'ML Data': c?.dataStr || '',
    'ML Valor Pedido': c?.raw?.['Valor Total'] || '',
    'ML Fornecedor': c?.fornecedor || '',
  }
}

const linhasNfEmp = []
const linhasNfPes = []
const linhasNfSem = []
for (const it of itensNFE) {
  const c = idxParaCompra.get(it.idx)
  const linha = linhaNFE(it, c)
  if (c?.cat === 'EMPRESA') linhasNfEmp.push(linha)
  else if (c?.cat === 'PESSOAL') linhasNfPes.push(linha)
  else linhasNfSem.push(linha)
}

function toCsv(rows) {
  if (!rows.length) return ''
  const h = Object.keys(rows[0])
  const esc = v => {
    if (v == null) return ''
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + h.join(',') + '\n' + rows.map(r => h.map(k => esc(r[k])).join(',')).join('\n') + '\n'
}

fs.writeFileSync(path.join(PASTA, 'CRUZADO_EMPRESA_com_NFE.csv'),    toCsv(linhasEmp), 'utf8')
fs.writeFileSync(path.join(PASTA, 'CRUZADO_PESSOAL_com_NFE.csv'),    toCsv(linhasPes), 'utf8')
fs.writeFileSync(path.join(PASTA, 'CRUZADO_NFE_origem_EMPRESA.csv'), toCsv(linhasNfEmp), 'utf8')
fs.writeFileSync(path.join(PASTA, 'CRUZADO_NFE_origem_PESSOAL.csv'), toCsv(linhasNfPes), 'utf8')
fs.writeFileSync(path.join(PASTA, 'CRUZADO_NFE_sem_match_ML.csv'),   toCsv(linhasNfSem), 'utf8')

const empCom = linhasEmp.filter(r => r['Tem NF-e?']==='SIM').length
const pesCom = linhasPes.filter(r => r['Tem NF-e?']==='SIM').length
console.log()
console.log('═══ CRUZAMENTO V3 — match por nome+data (sem valor) ═══')
console.log(`EMPRESA: ${linhasEmp.length} compras · com NF-e: ${empCom} (${(empCom/linhasEmp.length*100).toFixed(0)}%) · sem: ${linhasEmp.length - empCom}`)
console.log(`PESSOAL: ${linhasPes.length} compras · com NF-e: ${pesCom} (${(pesCom/linhasPes.length*100).toFixed(0)}%) · sem: ${linhasPes.length - pesCom}`)
console.log()
console.log(`NF-e origem EMPRESA: ${linhasNfEmp.length}`)
console.log(`NF-e origem PESSOAL: ${linhasNfPes.length}`)
console.log(`NF-e sem match ML  : ${linhasNfSem.length}`)
