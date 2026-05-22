// scripts/cruzar-ml-com-nfe.mjs
// Cruza compras do Mercado Livre (CSVs em RELATORIO OUTRAS LOJAS/COMPRAS ML/CRUZAR DADOS COM NOTAS/)
// com os itens de NF-e extraídos em relatorios/itens-extraidos.json.
// Match: data (±3 dias) + valor (±5%) + bônus por similaridade de nome.
// Saída: 2 CSVs em CRUZAR DADOS COM NOTAS/

import fs from 'fs'
import path from 'path'

const ROOT = 'C:/Users/Toni-PC/projetos/idemaq'
const PASTA_CRUZAR = path.join(ROOT, 'RELATORIO OUTRAS LOJAS', 'COMPRAS ML', 'CRUZAR DADOS COM NOTAS')
const ITENS_NFE = path.join(ROOT, 'relatorios', 'itens-extraidos.json')

// ─── Leitura dos itens de NF-e ────────────────────────────────────────────
const nfeData = JSON.parse(fs.readFileSync(ITENS_NFE, 'utf8'))
const itensNFE = nfeData.itens.map((it, idx) => ({
  idx,
  arquivo: it.arquivo,
  numeroNF: it.numeroNF,
  data: new Date(it.dataEmissao),
  fornCNPJ: it.fornecedor?.cnpj || '',
  fornRazao: it.fornecedor?.razao || '',
  fornFantasia: it.fornecedor?.fantasia || '',
  cProd: it.cProd,
  xProd: it.xProd,
  qCom: it.qCom,
  vUnCom: it.vUnCom,
  vProd: it.vProd,
  ncm: it.ncm,
  cfop: it.cfop,
}))
console.log(`Carregados ${itensNFE.length} itens de NF-e (${nfeData.totalArquivos} XMLs)`)

// ─── Parser de CSV simples (UTF-8 BOM, aspas, vírgulas) ───────────────────
function parseCsv(texto) {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.length > 0)
  const header = parseLine(linhas[0])
  const rows = []
  for (let i = 1; i < linhas.length; i++) {
    const valores = parseLine(linhas[i])
    const obj = {}
    header.forEach((h, j) => { obj[h] = valores[j] || '' })
    rows.push(obj)
  }
  return rows
}
function parseLine(linha) {
  const out = []
  let curr = '', inQuotes = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') {
      if (inQuotes && linha[i+1] === '"') { curr += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (c === ',' && !inQuotes) {
      out.push(curr); curr = ''
    } else {
      curr += c
    }
  }
  out.push(curr)
  return out
}

// ─── Leitura dos CSVs de compras ML ───────────────────────────────────────
// compras_PESSOAL.csv já está na pasta. compras_EMPRESA.xlsx → vamos usar a
// versão CSV da pasta COMPRAS ML (mesma data, mesmo conteúdo)
const compEmpresaCsv = path.join(ROOT, 'RELATORIO OUTRAS LOJAS', 'COMPRAS ML', 'compras_EMPRESA.csv')
const compPessoalCsv = path.join(PASTA_CRUZAR, 'compras_PESSOAL.csv')

const empresa = parseCsv(fs.readFileSync(compEmpresaCsv, 'utf8'))
const pessoal = parseCsv(fs.readFileSync(compPessoalCsv, 'utf8'))
console.log(`Carregados ${empresa.length} compras EMPRESA + ${pessoal.length} PESSOAL`)

// ─── Parsers de data (PT-BR) e valor (R$) ─────────────────────────────────
const MESES = {janeiro:0,fevereiro:1,'março':2,marco:2,abril:3,maio:4,junho:5,julho:6,agosto:7,setembro:8,outubro:9,novembro:10,dezembro:11}
function parseDataPtBr(s) {
  if (!s) return null
  const m = s.toLowerCase().match(/(\d+)\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?/)
  if (!m) return null
  const dia = +m[1], mes = MESES[m[2]], ano = m[3] ? +m[3] : 2025
  if (mes == null) return null
  return new Date(ano, mes, dia)
}
function parseValor(s) {
  if (!s) return null
  const lim = s.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(lim)
  return isNaN(n) ? null : n
}

// ─── Similaridade textual simples (palavras em comum / total únicas) ──────
function tokens(s) {
  return (s || '').toLowerCase()
    .replace(/[áàâã]/g, 'a').replace(/[éê]/g, 'e').replace(/[íî]/g, 'i')
    .replace(/[óôõ]/g, 'o').replace(/[úû]/g, 'u').replace(/[ç]/g, 'c')
    .split(/\W+/)
    .filter(t => t.length >= 3)
}
function sim(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b))
  if (A.size === 0 || B.size === 0) return 0
  let intersec = 0
  for (const t of A) if (B.has(t)) intersec++
  return intersec / Math.max(A.size, B.size)
}

// ─── Matching: pra cada compra ML, melhor NF-e ────────────────────────────
function acharMelhorMatch(compra, categoria) {
  const dataML = parseDataPtBr(compra['Data da Compra'])
  const valorML = parseValor(compra['Valor Total'])
  if (!dataML || !valorML) return null

  let melhor = null
  let melhorScore = 0
  for (const nfe of itensNFE) {
    const diffDias = Math.abs((nfe.data - dataML) / (1000*60*60*24))
    if (diffDias > 7) continue
    const diffVal = Math.abs(nfe.vProd - valorML) / valorML
    if (diffVal > 0.10 && nfe.vProd !== valorML) continue
    const simNome = sim(compra['Item Comprado'], nfe.xProd)
    // score: peso na data próxima + valor exato + nome similar
    const scoreData = 1 - (diffDias / 7)
    const scoreValor = 1 - diffVal
    const scoreNome = simNome
    const score = scoreData * 0.3 + scoreValor * 0.4 + scoreNome * 0.3
    if (score > melhorScore) { melhorScore = score; melhor = { ...nfe, score, diffDias, diffVal, simNome } }
  }
  // Só consideramos match se score >= 0.50 (precisa ter pelo menos data±valor próximos)
  if (melhor && melhorScore >= 0.50) return melhor
  return null
}

console.log('Cruzando compras ML × itens NF-e...')

const linhasML = []
const idsNfeMatched = new Set()

for (const c of empresa) {
  const m = acharMelhorMatch(c, 'EMPRESA')
  if (m) idsNfeMatched.add(m.idx)
  linhasML.push({
    Categoria: 'EMPRESA',
    'Numero da Compra': c['Numero da Compra'],
    'Item ML': c['Item Comprado'],
    'Data ML': c['Data da Compra'],
    'Valor ML': c['Valor Total'],
    Fornecedor: c['Fornecedor'],
    'Cartão': c['Cartão Usado'],
    'Pagto': c['Forma de Pagamento'],
    'Tem NF-e?': m ? 'SIM' : 'NÃO',
    'NF-e nº': m?.numeroNF || '',
    'NF-e Data': m ? m.data.toISOString().slice(0,10) : '',
    'NF-e CNPJ': m?.fornCNPJ || '',
    'NF-e Fornecedor': m?.fornFantasia || m?.fornRazao || '',
    'NF-e Item': m?.xProd || '',
    'NF-e cProd': m?.cProd || '',
    'NF-e Valor': m ? m.vProd.toFixed(2) : '',
    'NF-e Qtd': m?.qCom || '',
    'Score Match': m ? m.score.toFixed(2) : '',
    'Δ dias': m ? m.diffDias.toFixed(0) : '',
    'Δ valor %': m ? (m.diffVal*100).toFixed(1) + '%' : '',
    'Sim. nome': m ? (m.simNome*100).toFixed(0) + '%' : '',
  })
}
for (const c of pessoal) {
  const m = acharMelhorMatch(c, 'PESSOAL')
  if (m) idsNfeMatched.add(m.idx)
  linhasML.push({
    Categoria: 'PESSOAL',
    'Numero da Compra': c['Numero da Compra'],
    'Item ML': c['Item Comprado'],
    'Data ML': c['Data da Compra'],
    'Valor ML': c['Valor Total'],
    Fornecedor: c['Fornecedor'],
    'Cartão': c['Cartão Usado'],
    'Pagto': c['Forma de Pagamento'],
    'Tem NF-e?': m ? 'SIM' : 'NÃO',
    'NF-e nº': m?.numeroNF || '',
    'NF-e Data': m ? m.data.toISOString().slice(0,10) : '',
    'NF-e CNPJ': m?.fornCNPJ || '',
    'NF-e Fornecedor': m?.fornFantasia || m?.fornRazao || '',
    'NF-e Item': m?.xProd || '',
    'NF-e cProd': m?.cProd || '',
    'NF-e Valor': m ? m.vProd.toFixed(2) : '',
    'NF-e Qtd': m?.qCom || '',
    'Score Match': m ? m.score.toFixed(2) : '',
    'Δ dias': m ? m.diffDias.toFixed(0) : '',
    'Δ valor %': m ? (m.diffVal*100).toFixed(1) + '%' : '',
    'Sim. nome': m ? (m.simNome*100).toFixed(0) + '%' : '',
  })
}

// ─── Segunda tabela: pra cada NF-e item, qual compra ML correspondente ──
// Reverse: dado a NF-e, achar a melhor compra ML (mesma lógica)
const todasCompras = [
  ...empresa.map(c => ({ ...c, _cat: 'EMPRESA' })),
  ...pessoal.map(c => ({ ...c, _cat: 'PESSOAL' })),
]
function acharMlPraNfe(nfe) {
  let melhor = null
  let melhorScore = 0
  for (const c of todasCompras) {
    const dataML = parseDataPtBr(c['Data da Compra'])
    const valorML = parseValor(c['Valor Total'])
    if (!dataML || !valorML) continue
    const diffDias = Math.abs((nfe.data - dataML) / (1000*60*60*24))
    if (diffDias > 7) continue
    const diffVal = Math.abs(nfe.vProd - valorML) / valorML
    if (diffVal > 0.10 && nfe.vProd !== valorML) continue
    const simNome = sim(c['Item Comprado'], nfe.xProd)
    const score = (1 - diffDias/7) * 0.3 + (1 - diffVal) * 0.4 + simNome * 0.3
    if (score > melhorScore) { melhorScore = score; melhor = { c, score, diffDias, diffVal, simNome } }
  }
  if (melhor && melhorScore >= 0.50) return melhor
  return null
}

const linhasNFE = []
for (const nfe of itensNFE) {
  const m = acharMlPraNfe(nfe)
  linhasNFE.push({
    'NF-e nº': nfe.numeroNF,
    'NF-e Data': nfe.data.toISOString().slice(0,10),
    'NF-e CNPJ': nfe.fornCNPJ,
    'NF-e Fornecedor': nfe.fornFantasia || nfe.fornRazao,
    'NF-e Item': nfe.xProd,
    'NF-e cProd': nfe.cProd,
    'NF-e Qtd': nfe.qCom,
    'NF-e vUnit': nfe.vUnCom,
    'NF-e Total': nfe.vProd,
    'NF-e NCM': nfe.ncm,
    'NF-e CFOP': nfe.cfop,
    'Arquivo XML': nfe.arquivo,
    'Tem Compra ML?': m ? 'SIM' : 'NÃO',
    'ML Categoria': m?.c._cat || '',
    'ML Numero': m?.c['Numero da Compra'] || '',
    'ML Item': m?.c['Item Comprado'] || '',
    'ML Data': m?.c['Data da Compra'] || '',
    'ML Valor': m?.c['Valor Total'] || '',
    'ML Fornecedor': m?.c['Fornecedor'] || '',
    'ML Cartão': m?.c['Cartão Usado'] || '',
    'Score Match': m ? m.score.toFixed(2) : '',
    'Δ dias': m ? m.diffDias.toFixed(0) : '',
    'Δ valor %': m ? (m.diffVal*100).toFixed(1) + '%' : '',
    'Sim. nome': m ? (m.simNome*100).toFixed(0) + '%' : '',
  })
}

// ─── Geração dos CSVs ─────────────────────────────────────────────────────
function toCsv(rows) {
  if (rows.length === 0) return ''
  const header = Object.keys(rows[0])
  const esc = v => {
    if (v == null) return ''
    const s = String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  return '﻿' + header.join(',') + '\n' + rows.map(r => header.map(h => esc(r[h])).join(',')).join('\n') + '\n'
}

const out1 = path.join(PASTA_CRUZAR, 'CRUZADO_compras_ML_com_NFE.csv')
const out2 = path.join(PASTA_CRUZAR, 'CRUZADO_NFE_com_compras_ML.csv')
fs.writeFileSync(out1, toCsv(linhasML), 'utf8')
fs.writeFileSync(out2, toCsv(linhasNFE), 'utf8')

// ─── Estatísticas ─────────────────────────────────────────────────────────
const mlComNF = linhasML.filter(r => r['Tem NF-e?'] === 'SIM').length
const mlSemNF = linhasML.length - mlComNF
const nfComML = linhasNFE.filter(r => r['Tem Compra ML?'] === 'SIM').length
const nfSemML = linhasNFE.length - nfComML

console.log()
console.log('═══ ESTATÍSTICAS DO CRUZAMENTO ═══')
console.log(`Compras ML : ${linhasML.length}`)
console.log(`  com NF-e : ${mlComNF}  (${(mlComNF/linhasML.length*100).toFixed(1)}%)`)
console.log(`  sem NF-e : ${mlSemNF}  (${(mlSemNF/linhasML.length*100).toFixed(1)}%)`)
console.log()
console.log(`Itens NF-e : ${linhasNFE.length}`)
console.log(`  com compra ML: ${nfComML}  (${(nfComML/linhasNFE.length*100).toFixed(1)}%)`)
console.log(`  sem compra ML: ${nfSemML}  (${(nfSemML/linhasNFE.length*100).toFixed(1)}%)`)
console.log()
console.log(`Saídas:`)
console.log(`  ${out1}`)
console.log(`  ${out2}`)
