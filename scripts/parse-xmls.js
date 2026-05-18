// scripts/parse-xmls.js
// Lê todos os XMLs em notas-xml/, extrai itens (cProd, xProd, NCM, qCom, vUnCom,
// emitente, data emissão) e salva em relatorios/itens-extraidos.json.
// Robusto a estruturas variadas de NF-e e XMLs malformados.

import fs from 'fs/promises'
import path from 'path'
import { XMLParser } from 'fast-xml-parser'

const ROOT = process.cwd()
const XML_DIR = path.join(ROOT, 'notas-xml')
const OUT_DIR = path.join(ROOT, 'relatorios')
const LOG_DIR = path.join(ROOT, 'logs')
const OUT_FILE = path.join(OUT_DIR, 'itens-extraidos.json')
const LOG_FILE = path.join(LOG_DIR, 'estoque-bloqueios.md')

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: true,
  trimValues: true,
})

function pickInfNFe(parsed) {
  // Tenta caminhos comuns: nfeProc > NFe, NFe direto
  return (
    parsed?.nfeProc?.NFe?.infNFe ||
    parsed?.NFe?.infNFe ||
    parsed?.nfeProc?.NFe?.[0]?.infNFe ||
    null
  )
}

function asArray(v) {
  if (v === undefined || v === null) return []
  return Array.isArray(v) ? v : [v]
}

function num(v) {
  if (v === undefined || v === null || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.mkdir(LOG_DIR, { recursive: true })

  const all = await fs.readdir(XML_DIR)
  const files = all.filter(f => f.toLowerCase().endsWith('.xml'))
  console.log(`📁 ${files.length} XMLs encontrados em ${XML_DIR}`)

  const itens = []
  const erros = []
  let processados = 0
  let comInfNFe = 0

  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(XML_DIR, file), 'utf-8')
      const parsed = parser.parse(content)
      const infNFe = pickInfNFe(parsed)

      if (!infNFe) {
        erros.push({ file, motivo: 'estrutura infNFe não encontrada' })
        continue
      }
      comInfNFe++

      const emit = infNFe.emit || {}
      const fornecedor = {
        cnpj: emit.CNPJ ? String(emit.CNPJ) : null,
        razao: emit.xNome || null,
        fantasia: emit.xFant || null,
      }

      const ide = infNFe.ide || {}
      const dataEmissao = ide.dhEmi || ide.dEmi || null
      const numeroNF = ide.nNF ? String(ide.nNF) : null

      const dets = asArray(infNFe.det)
      for (const det of dets) {
        const prod = det?.prod
        if (!prod) continue
        itens.push({
          arquivo: file,
          numeroNF,
          dataEmissao,
          fornecedor,
          cProd: String(prod.cProd ?? '').trim(),
          cEAN: String(prod.cEAN ?? '').trim(),
          xProd: String(prod.xProd ?? '').trim(),
          ncm: String(prod.NCM ?? '').trim(),
          cfop: String(prod.CFOP ?? '').trim(),
          uCom: String(prod.uCom ?? '').trim(),
          qCom: num(prod.qCom),
          vUnCom: num(prod.vUnCom),
          vProd: num(prod.vProd),
        })
      }
    } catch (err) {
      erros.push({ file, motivo: err.message })
    } finally {
      processados++
      if (processados % 50 === 0) {
        console.log(`  ... ${processados}/${files.length} (itens: ${itens.length}, erros: ${erros.length})`)
      }
    }
  }

  await fs.writeFile(
    OUT_FILE,
    JSON.stringify(
      { totalArquivos: files.length, comInfNFe, totalItens: itens.length, totalErros: erros.length, itens, erros },
      null,
      2,
    ),
  )

  console.log('')
  console.log(`✅ ${itens.length} itens extraídos de ${comInfNFe} XMLs válidos (${files.length} totais)`)
  console.log(`⚠️  ${erros.length} XMLs com problema`)
  console.log(`📄 ${OUT_FILE}`)

  // Documenta erros em log se houver muitos
  if (erros.length > 0) {
    const top = erros.slice(0, 10)
    const linhas = [
      `## parse-xmls.js — ${erros.length} XMLs com erro`,
      '',
      ...top.map(e => `- \`${e.file}\` → ${e.motivo}`),
      '',
      erros.length > 10 ? `_... +${erros.length - 10} outros (ver itens-extraidos.json → erros[])_` : '',
      '',
    ]
    await fs.appendFile(LOG_FILE, linhas.join('\n'))
  }
}

main().catch(err => {
  console.error('💥 Erro fatal:', err)
  process.exit(1)
})
