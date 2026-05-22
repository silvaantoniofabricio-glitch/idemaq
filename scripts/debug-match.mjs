import fs from 'fs'
import path from 'path'

const ROOT = 'C:/Users/Toni-PC/projetos/idemaq'
const nfeData = JSON.parse(fs.readFileSync(path.join(ROOT,'relatorios','itens-extraidos.json'),'utf8'))

const ALVO_DATA = new Date(2024, 11, 24)   // 24/12/2024
const ALVO_VALOR = 633.72

// Mostra arquivos próximos da data
const candidatos = []
const arquivos = new Map()
for (const it of nfeData.itens) {
  if (!arquivos.has(it.arquivo)) {
    arquivos.set(it.arquivo, { data: new Date(it.dataEmissao), itens: [], total: 0, fornecedor: it.fornecedor })
  }
  const a = arquivos.get(it.arquivo)
  a.itens.push(it)
  a.total += it.vProd
}

for (const [arq, info] of arquivos) {
  const diffDias = Math.abs((info.data - ALVO_DATA) / 86400000)
  if (diffDias <= 7) {
    candidatos.push({ arq, ...info, diffDias })
  }
}
candidatos.sort((a,b) => a.diffDias - b.diffDias)

console.log(`Procurando NF-e perto de 24/12/2024 com total ~R$ ${ALVO_VALOR}`)
console.log(`Encontrados ${candidatos.length} candidatos em ±7 dias\n`)

for (const c of candidatos.slice(0, 10)) {
  console.log(`${c.data.toISOString().slice(0,10)} | ${c.diffDias.toFixed(0)}d | ${c.itens.length} itens | Total R$ ${c.total.toFixed(2)} | ${c.fornecedor?.fantasia || c.fornecedor?.razao || '???'}`)
  console.log(`   arq: ${c.arq.slice(0,60)}...`)
  for (const it of c.itens.slice(0, 3)) {
    console.log(`   - ${it.xProd.slice(0,55)} | R$ ${it.vProd.toFixed(2)}`)
  }
  if (c.itens.length > 3) console.log(`   ... +${c.itens.length - 3} mais itens`)
  console.log()
}
