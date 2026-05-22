// Normaliza os 3 CSVs em RELATORIO OUTRAS LOJAS:
//   pecas_lavadora_BCM-LIMPO.csv     (10 col + Loja)
//   pecas_lavadoras_dufrio-LIMPO.csv (6 col + Loja)
//   samatec_lavadoras-LIMPO.csv      (7 col + Loja)
// + CONSOLIDADO-LIMPO.csv com schema unificado das 3 lojas.

import fs from 'node:fs'
import path from 'node:path'

const DIR = 'C:/Users/Toni-PC/projetos/idemaq/RELATORIO OUTRAS LOJAS'

// ---------- CSV parser tolerante (BOM + CRLF + quoted "") ----------
function parseCSV(text, sep) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === sep) { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') { /* skip */ }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''))
}

function toCSV(rows, sep = ';') {
  return rows.map(r => r.map(v => {
    v = String(v ?? '')
    if (v.includes(sep) || v.includes('"') || v.includes('\n') || v.includes('\r'))
      return '"' + v.replace(/"/g, '""') + '"'
    return v
  }).join(sep)).join('\r\n') + '\r\n'
}

const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim()

function titleCase(s) {
  return s.split(' ').map(w => w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join(' ')
}

function precoBRLtoNumero(s) {
  if (!s) return ''
  const m = String(s).match(/[\d.,]+/)
  if (!m) return ''
  return Number(m[0].replace(/\./g, '').replace(',', '.'))
}

// truncar descricao na primeira frase ate ~250 chars
function descCurta(s, max = 250) {
  s = clean(s)
  if (!s) return ''
  if (s.length <= max) return s
  // tenta cortar na primeira frase
  const fim = s.search(/[.!?]\s/)
  if (fim > 0 && fim < max) return s.slice(0, fim + 1)
  // senao corta na ultima palavra antes do limite
  const cortado = s.slice(0, max)
  const ult = cortado.lastIndexOf(' ')
  return (ult > 50 ? cortado.slice(0, ult) : cortado) + '...'
}

// extracao de modelos compativeis em texto livre (DUFRIO)
function extrairModelosLivre(desc) {
  if (!desc) return ''
  // padrao 1: explicito "Modelos Compativeis: A / B / C"
  let m = desc.match(/Modelos?\s*Compat[ií]veis\s*:\s*([^|.]+)/i)
  if (m) return clean(m[1])
  // padrao 2: "Compativel com modelos X e Y"
  m = desc.match(/Compat[ií]vel\s+com\s+(?:modelos?\s+|lavadoras?\s+)?([A-Z0-9][A-Z0-9\/\s,\-]+?)(?:[.,]|\s+(?:[a-z]|esta|essa|este|esse))/)
  if (m) {
    const lista = clean(m[1])
    // descarta se for so 1-2 chars (provavel falso positivo)
    if (lista.length >= 3) return lista
  }
  return ''
}

// BCM: monta nome a partir das colunas estruturadas (sem usar o slug que da nome feio)
function nomeBCM(categoria, marca, tipo, ref, modelo) {
  const partes = []
  if (tipo) partes.push(titleCase(clean(tipo)))
  else if (categoria) partes.push(titleCase(clean(categoria)))
  if (marca) partes.push(clean(marca))
  const codigo = modelo || ref
  if (codigo) partes.push(clean(codigo))
  return partes.join(' - ') || 'Sem nome'
}

// ============================================================
// BCM
// ============================================================
const bcmNovas = []
{
  const orig = path.join(DIR, 'pecas_lavadora_BCM.csv')
  const out = path.join(DIR, 'pecas_lavadora_BCM-LIMPO.csv')
  const rows = parseCSV(fs.readFileSync(orig, 'utf8'), ';')
  const novoHeader = ['Loja', 'Nome Produto', 'Categoria', 'Marca', 'Tipo', 'Referencia', 'Modelo', 'Modelos Compativeis', 'Codigo Comercial', 'Descricao', 'URL']
  bcmNovas.push(novoHeader)
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 10) continue
    const [_nomeRuim, categoria, marca, tipo, ref, modelo, compat, codCom, desc, url] = r
    bcmNovas.push([
      'BCM',
      nomeBCM(categoria, marca, tipo, ref, modelo),
      clean(categoria),
      clean(marca),
      clean(tipo),
      clean(ref),
      clean(modelo),
      clean(compat),
      clean(codCom),
      clean(desc),
      clean(url),
    ])
  }
  fs.writeFileSync(out, '﻿' + toCSV(bcmNovas, ';'), 'utf8')
  console.log(`BCM     -> ${bcmNovas.length - 1} linhas`)
}

// ============================================================
// DUFRIO
// ============================================================
const dufrioNovas = []
{
  const orig = path.join(DIR, 'pecas_lavadoras_dufrio.csv')
  const out = path.join(DIR, 'pecas_lavadoras_dufrio-LIMPO.csv')
  const rows = parseCSV(fs.readFileSync(orig, 'utf8'), ';')
  const novoHeader = ['Loja', 'Nome Produto', 'SKU', 'Modelos Compativeis', 'Descricao Curta', 'URL']
  dufrioNovas.push(novoHeader)
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 4) continue
    const [nome, sku, url, descCompleta] = r
    const primeiroParag = descCompleta.split('|')[0]
    dufrioNovas.push([
      'DUFRIO',
      clean(nome),
      clean(sku),
      extrairModelosLivre(descCompleta),
      descCurta(primeiroParag),
      clean(url),
    ])
  }
  fs.writeFileSync(out, '﻿' + toCSV(dufrioNovas, ';'), 'utf8')
  console.log(`DUFRIO  -> ${dufrioNovas.length - 1} linhas`)
}

// ============================================================
// SAMATEC
// ============================================================
const samatecNovas = []
{
  const orig = path.join(DIR, 'samatec_lavadoras.csv')
  const out = path.join(DIR, 'samatec_lavadoras-LIMPO.csv')
  const rows = parseCSV(fs.readFileSync(orig, 'utf8'), ',')
  const novoHeader = ['Loja', 'Referencia', 'Nome Produto', 'Categoria', 'Modelos Compativeis', 'Descricao', 'Preco', 'URL']
  samatecNovas.push(novoHeader)
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (r.length < 7) continue
    const [ref, nome, cat, compat, desc, preco, url] = r
    // remove boilerplate
    let descLimpa = clean(desc)
    if (/ENCONTRE\s+TODA\s+A\s+LINHA/i.test(descLimpa)) descLimpa = ''
    samatecNovas.push([
      'SAMATEC',
      clean(ref),
      clean(nome),
      clean(cat),
      clean(compat),
      descCurta(descLimpa),
      precoBRLtoNumero(preco),
      clean(url),
    ])
  }
  fs.writeFileSync(out, '﻿' + toCSV(samatecNovas, ';'), 'utf8')
  console.log(`SAMATEC -> ${samatecNovas.length - 1} linhas`)
}

// ============================================================
// CONSOLIDADO (schema unificado das 3)
// Loja | Categoria | Marca | Nome Produto | Referencia | Modelos Compativeis | Preco | Descricao Curta | URL
// ============================================================
{
  const out = path.join(DIR, 'CONSOLIDADO-LIMPO.csv')
  const header = ['Loja', 'Categoria', 'Marca', 'Nome Produto', 'Referencia', 'Modelos Compativeis', 'Preco', 'Descricao Curta', 'URL']
  const linhas = [header]

  // BCM: col idx (com Loja=0): 1=Nome 2=Cat 3=Marca 5=Ref 6=Modelo 7=Compat 9=Desc 10=URL
  // Preferimos Modelo (codigo do fabricante, universal) sobre Referencia (SKU interno da loja)
  for (let i = 1; i < bcmNovas.length; i++) {
    const r = bcmNovas[i]
    linhas.push(['BCM', r[2], r[3], r[1], r[6] || r[5], r[7], '', descCurta(r[9]), r[10]])
  }
  // DUFRIO: 1=Nome 2=SKU 3=Compat 4=DescCurta 5=URL (categoria/marca nao tem)
  for (let i = 1; i < dufrioNovas.length; i++) {
    const r = dufrioNovas[i]
    linhas.push(['DUFRIO', '', '', r[1], r[2], r[3], '', r[4], r[5]])
  }
  // SAMATEC: 1=Ref 2=Nome 3=Cat 4=Compat 5=Desc 6=Preco 7=URL
  for (let i = 1; i < samatecNovas.length; i++) {
    const r = samatecNovas[i]
    linhas.push(['SAMATEC', r[3], '', r[2], r[1], r[4], r[6], r[5], r[7]])
  }
  fs.writeFileSync(out, '﻿' + toCSV(linhas, ';'), 'utf8')
  console.log(`CONSOL  -> ${linhas.length - 1} linhas (3 lojas)`)
}

console.log('\nOK. Originais preservados.')
