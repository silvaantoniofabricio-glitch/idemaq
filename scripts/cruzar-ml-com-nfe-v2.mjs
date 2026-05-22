// scripts/cruzar-ml-com-nfe-v2.mjs
// Cruzamento melhorado: agrupa ML por pedido + NF-e por arquivo.
// Match em 2 níveis:
// 1. Pedido ML ↔ Arquivo NF-e: data (±7d) + soma total bate
// 2. Dentro do par casado: item ML ↔ item NF-e por similaridade de nome

import fs from 'fs'
import path from 'path'

const ROOT = 'C:/Users/Toni-PC/projetos/idemaq'
const PASTA_CRUZAR = path.join(ROOT, 'RELATORIO OUTRAS LOJAS', 'COMPRAS ML', 'CRUZAR DADOS COM NOTAS')
const ITENS_NFE = path.join(ROOT, 'relatorios', 'itens-extraidos.json')

// ─── Util ─────────────────────────────────────────────────────────────────
function parseCsv(texto) {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.length > 0)
  const header = parseLine(linhas[0])
  return linhas.slice(1).map(l => {
    const v = parseLine(l)
    const obj = {}
    header.forEach((h, j) => { obj[h] = v[j] || '' })
    return obj
  })
}
function parseLine(linha) {
  const out = []
  let curr = '', inQ = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (c === '"') { if (inQ && linha[i+1] === '"') { curr += '"'; i++ } else inQ = !inQ }
    else if (c === ',' && !inQ) { out.push(curr); curr = '' }
    else curr += c
  }
  out.push(curr); return out
}

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
function tokens(s) {
  return (s || '').toLowerCase()
    .replace(/[áàâã]/g, 'a').replace(/[éê]/g, 'e').replace(/[íî]/g, 'i')
    .replace(/[óôõ]/g, 'o').replace(/[úû]/g, 'u').replace(/[ç]/g, 'c')
    .split(/\W+/).filter(t => t.length >= 3)
}
function sim(a, b) {
  const A = new Set(tokens(a)), B = new Set(tokens(b))
  if (A.size === 0 || B.size === 0) return 0
  let n = 0
  for (const t of A) if (B.has(t)) n++
  return n / Math.max(A.size, B.size)
}

// ─── Carrega NF-e e agrupa por arquivo ────────────────────────────────────
const nfeData = JSON.parse(fs.readFileSync(ITENS_NFE, 'utf8'))
const arquivosNFE = new Map()
nfeData.itens.forEach((it, idx) => {
  if (!arquivosNFE.has(it.arquivo)) {
    arquivosNFE.set(it.arquivo, {
      arquivo: it.arquivo,
      numeroNF: it.numeroNF,
      data: new Date(it.dataEmissao),
      fornCNPJ: it.fornecedor?.cnpj || '',
      fornRazao: it.fornecedor?.razao || '',
      fornFantasia: it.fornecedor?.fantasia || '',
      itens: [],
      total: 0,
    })
  }
  const a = arquivosNFE.get(it.arquivo)
  a.itens.push({ idx, ...it })
  a.total += it.vProd
})
const notas = [...arquivosNFE.values()]
console.log(`NF-e: ${nfeData.itens.length} itens em ${notas.length} arquivos`)

// ─── Carrega compras ML e agrupa por pedido ───────────────────────────────
const compEmpresa = parseCsv(fs.readFileSync(path.join(ROOT, 'RELATORIO OUTRAS LOJAS', 'COMPRAS ML', 'compras_EMPRESA.csv'), 'utf8'))
const compPessoal = parseCsv(fs.readFileSync(path.join(ROOT, 'RELATORIO OUTRAS LOJAS', 'COMPRAS ML', 'compras_PESSOAL.csv'), 'utf8'))
console.log(`ML: ${compEmpresa.length} EMPRESA + ${compPessoal.length} PESSOAL`)

function agruparPedidos(rows, categoria) {
  const map = new Map()
  for (const r of rows) {
    const num = (r['Numero da Compra'] || '').trim()
    if (!num) continue
    if (!map.has(num)) {
      map.set(num, {
        numero: num,
        categoria,
        data: parseDataPtBr(r['Data da Compra']),
        valorTotal: parseValor(r['Valor Total']),
        fornecedor: r['Fornecedor'],
        cartao: r['Cartão Usado'],
        pagto: r['Forma de Pagamento'],
        itens: [],
      })
    }
    map.get(num).itens.push(r)
  }
  return [...map.values()]
}
const pedidosEmpresa = agruparPedidos(compEmpresa, 'EMPRESA')
const pedidosPessoal = agruparPedidos(compPessoal, 'PESSOAL')
console.log(`Pedidos ML: ${pedidosEmpresa.length} EMPRESA + ${pedidosPessoal.length} PESSOAL`)
const todosPedidos = [...pedidosEmpresa, ...pedidosPessoal]

// ─── Matching pedido ↔ arquivo NF-e ───────────────────────────────────────
// Match aceito se: data ±7d E (soma_NF ≈ valor_ML OU itens_NF ≈ itens_ML)
function matchPedidoNota(pedido) {
  if (!pedido.data || !pedido.valorTotal) return null
  let melhor = null
  let melhorScore = 0
  for (const nota of notas) {
    const diffDias = Math.abs((nota.data - pedido.data) / 86400000)
    if (diffDias > 7) continue
    // Soma da NF-e bate com total do pedido ML? (tolerância 5%)
    const diffVal = Math.abs(nota.total - pedido.valorTotal) / pedido.valorTotal
    // OU: item único e bate por valor?
    const itemUnicoMatch = nota.itens.some(it => Math.abs(it.vProd - pedido.valorTotal) / pedido.valorTotal < 0.05)
    if (diffVal > 0.05 && !itemUnicoMatch) continue
    // Score por nome: melhor similaridade entre qualquer item do pedido e qualquer item da nota
    let melhorNome = 0
    for (const itML of pedido.itens) {
      for (const itNF of nota.itens) {
        const s = sim(itML['Item Comprado'], itNF.xProd)
        if (s > melhorNome) melhorNome = s
      }
    }
    const scoreData = 1 - (diffDias / 7)
    const scoreValor = 1 - Math.min(diffVal, 1)
    const score = scoreData * 0.25 + scoreValor * 0.45 + melhorNome * 0.30
    if (score > melhorScore) {
      melhorScore = score
      melhor = { nota, score, diffDias, diffVal, melhorNome }
    }
  }
  return (melhor && melhorScore >= 0.50) ? melhor : null
}

// ─── Roda matching pra todos os pedidos ───────────────────────────────────
const matches = new Map()           // pedido.numero -> matchInfo
const arquivosCasados = new Set()   // arquivos NFE já casados
for (const ped of todosPedidos) {
  const m = matchPedidoNota(ped)
  if (m) {
    matches.set(ped.numero, m)
    arquivosCasados.add(m.nota.arquivo)
  }
}
console.log(`\nMatches pedido↔nota: ${matches.size} de ${todosPedidos.length} pedidos`)

// ─── Pra cada item ML, acha o item NF-e correspondente (dentro do match) ─
function matchItemDoPedido(itemML, matchInfo) {
  if (!matchInfo) return null
  const nf = matchInfo.nota
  let melhor = null, melhorSim = 0
  for (const itNF of nf.itens) {
    const s = sim(itemML['Item Comprado'], itNF.xProd)
    if (s > melhorSim) { melhorSim = s; melhor = itNF }
  }
  return melhor ? { ...melhor, simNome: melhorSim } : null
}

// ─── Constrói as linhas de saída ──────────────────────────────────────────
function linhaML(c, categoria, matchInfo, itemMatch) {
  const m = matchInfo
  const i = itemMatch
  return {
    Categoria: categoria,
    'Numero da Compra': c['Numero da Compra'],
    'Item ML': c['Item Comprado'],
    'Data ML': c['Data da Compra'],
    'Valor Pedido ML': c['Valor Total'],
    'Fornecedor ML': c['Fornecedor'],
    'Cartão': c['Cartão Usado'],
    'Pagto': c['Forma de Pagamento'],
    'Tem NF-e?': m ? 'SIM' : 'NÃO',
    'NF-e nº': m?.nota.numeroNF || '',
    'NF-e Data': m ? m.nota.data.toISOString().slice(0,10) : '',
    'NF-e Total Nota': m ? m.nota.total.toFixed(2) : '',
    'NF-e CNPJ': m?.nota.fornCNPJ || '',
    'NF-e Fornecedor': m?.nota.fornFantasia || m?.nota.fornRazao || '',
    'NF-e Item Casado': i?.xProd || '',
    'NF-e cProd': i?.cProd || '',
    'NF-e Qtd Item': i?.qCom || '',
    'NF-e vUnit Item': i?.vUnCom || '',
    'NF-e Total Item': i?.vProd?.toFixed(2) || '',
    'Score Pedido↔Nota': m ? m.score.toFixed(2) : '',
    'Δ dias': m ? m.diffDias.toFixed(0) : '',
    'Δ valor %': m ? (m.diffVal*100).toFixed(1) + '%' : '',
    'Sim. nome item': i ? (i.simNome*100).toFixed(0) + '%' : '',
    'Arquivo XML': m?.nota.arquivo || '',
  }
}

const linhasEmpresa = []
for (const ped of pedidosEmpresa) {
  const m = matches.get(ped.numero)
  for (const c of ped.itens) {
    const itM = matchItemDoPedido(c, m)
    linhasEmpresa.push(linhaML(c, 'EMPRESA', m, itM))
  }
}
const linhasPessoal = []
for (const ped of pedidosPessoal) {
  const m = matches.get(ped.numero)
  for (const c of ped.itens) {
    const itM = matchItemDoPedido(c, m)
    linhasPessoal.push(linhaML(c, 'PESSOAL', m, itM))
  }
}

// ─── Perspectiva NFE: pra cada item NFE, identifica origem ────────────────
const idsItensCasados = new Set()
// Marca itens NFE que foram identificados como casados com algum item ML
for (const ped of todosPedidos) {
  const m = matches.get(ped.numero)
  if (!m) continue
  for (const c of ped.itens) {
    const itM = matchItemDoPedido(c, m)
    if (itM) idsItensCasados.add(itM.idx)
  }
}

function linhaNFE(nfe, pedidoCasado) {
  return {
    'NF-e nº': nfe.numeroNF,
    'NF-e Data': new Date(nfe.dataEmissao).toISOString().slice(0,10),
    'NF-e CNPJ': nfe.fornecedor?.cnpj || '',
    'NF-e Fornecedor': nfe.fornecedor?.fantasia || nfe.fornecedor?.razao || '',
    'NF-e Item': nfe.xProd,
    'NF-e cProd': nfe.cProd,
    'NF-e Qtd': nfe.qCom,
    'NF-e vUnit': nfe.vUnCom,
    'NF-e Total': nfe.vProd,
    'NF-e NCM': nfe.ncm,
    'NF-e CFOP': nfe.cfop,
    'Arquivo XML': nfe.arquivo,
    'Tem Compra ML?': pedidoCasado ? 'SIM' : 'NÃO',
    'ML Categoria': pedidoCasado?.categoria || '',
    'ML Numero': pedidoCasado?.numero || '',
    'ML Data': pedidoCasado?.itens[0]?.['Data da Compra'] || '',
    'ML Total Pedido': pedidoCasado?.itens[0]?.['Valor Total'] || '',
    'ML Fornecedor': pedidoCasado?.fornecedor || '',
    'ML Cartão': pedidoCasado?.cartao || '',
  }
}

// Pra cada item NFE, descobre se faz parte de um arquivo casado
const nfeParaPedido = new Map()  // arquivo → pedido
for (const [num, m] of matches) {
  const ped = todosPedidos.find(p => p.numero === num)
  nfeParaPedido.set(m.nota.arquivo, ped)
}

const linhasNFE_EMP = []
const linhasNFE_PES = []
const linhasNFE_SEM = []
for (const it of nfeData.itens) {
  const ped = nfeParaPedido.get(it.arquivo)
  const linha = linhaNFE(it, ped)
  if (ped?.categoria === 'EMPRESA') linhasNFE_EMP.push(linha)
  else if (ped?.categoria === 'PESSOAL') linhasNFE_PES.push(linha)
  else linhasNFE_SEM.push(linha)
}

// ─── Saída CSV ───────────────────────────────────────────────────────────
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

fs.writeFileSync(path.join(PASTA_CRUZAR, 'CRUZADO_EMPRESA_com_NFE.csv'),     toCsv(linhasEmpresa), 'utf8')
fs.writeFileSync(path.join(PASTA_CRUZAR, 'CRUZADO_PESSOAL_com_NFE.csv'),     toCsv(linhasPessoal), 'utf8')
fs.writeFileSync(path.join(PASTA_CRUZAR, 'CRUZADO_NFE_origem_EMPRESA.csv'),  toCsv(linhasNFE_EMP), 'utf8')
fs.writeFileSync(path.join(PASTA_CRUZAR, 'CRUZADO_NFE_origem_PESSOAL.csv'),  toCsv(linhasNFE_PES), 'utf8')
fs.writeFileSync(path.join(PASTA_CRUZAR, 'CRUZADO_NFE_sem_match_ML.csv'),    toCsv(linhasNFE_SEM), 'utf8')

// ─── Estatísticas ────────────────────────────────────────────────────────
const empComNF = linhasEmpresa.filter(r => r['Tem NF-e?']==='SIM').length
const pesComNF = linhasPessoal.filter(r => r['Tem NF-e?']==='SIM').length
console.log()
console.log('═══ CRUZAMENTO V2 (agrupando por pedido) ═══')
console.log(`EMPRESA: ${linhasEmpresa.length} compras (${pedidosEmpresa.length} pedidos)`)
console.log(`  com NF-e : ${empComNF}  sem NF-e: ${linhasEmpresa.length - empComNF}`)
console.log(`PESSOAL: ${linhasPessoal.length} compras (${pedidosPessoal.length} pedidos)`)
console.log(`  com NF-e : ${pesComNF}  sem NF-e: ${linhasPessoal.length - pesComNF}`)
console.log()
console.log(`NF-e origem EMPRESA: ${linhasNFE_EMP.length} itens`)
console.log(`NF-e origem PESSOAL: ${linhasNFE_PES.length} itens`)
console.log(`NF-e sem match ML  : ${linhasNFE_SEM.length} itens`)
