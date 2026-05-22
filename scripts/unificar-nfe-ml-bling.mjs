// Unifica NF-e de ML e Bling em pasta única, sem repetir.
// Chave de dedup: 44 dígitos da chave de acesso (parte entre "_" e "-procNFe.xml").
// Em colisão, prefere o arquivo do Bling (mesma NF, formato igual — escolha arbitrária).
//
// Saída:
//   - <Nova pasta>/NOTAS FISCAIS UNIFICADAS/  → XMLs únicos (1 por chave)
//   - <Nova pasta>/unificacao-relatorio.csv   → chave;origem(BLING|ML|AMBOS);arquivo
//   - log no console com totais

import fs from 'node:fs'
import path from 'node:path'

// Caminho absoluto pra não depender do cwd (rodar de qualquer pasta)
const BASE = 'C:/Users/Toni-PC/projetos/idemaq/Base de dados clientes Bling/Nova pasta'
const DIR_BLING = path.join(BASE, 'NOTAS FICAIS BLING')
const DIR_ML    = path.join(BASE, 'NOTAS FISCAIS ML')
const DIR_OUT   = path.join(BASE, 'NOTAS FISCAIS UNIFICADAS')
const CSV_OUT   = path.join(BASE, 'unificacao-relatorio.csv')

function extrairChave(nome) {
  // 2 padrões conhecidos:
  //   ML/Bling A: <id>_<44 dígitos>-procNFe.xml
  //   Bling B  : <44 dígitos>-nfe.xml
  // Bonus: também pega qualquer .xml que tenha 44 dígitos consecutivos em qualquer lugar do nome.
  const m1 = nome.match(/_(\d{44})-procNFe\.xml$/i)
  if (m1) return m1[1]
  const m2 = nome.match(/^(\d{44})-nfe\.xml$/i)
  if (m2) return m2[1]
  // fallback: primeira sequência de exatamente 44 dígitos
  const m3 = nome.match(/(\d{44})/)
  if (m3) return m3[1]
  return null
}

// Ranking de preferência por padrão de nome:
//   procNFe (protocolado, completo) > nfe (NFe pré-protocolo) > qualquer outro
function scorePadrao(nome) {
  if (/-procNFe\.xml$/i.test(nome)) return 2
  if (/-nfe\.xml$/i.test(nome))     return 1
  return 0
}

function mapearPasta(dir) {
  const m = new Map() // chave → nome do arquivo
  const semChave = []
  const outrosTipos = []
  if (!fs.existsSync(dir)) return { mapa: m, semChave, outrosTipos }
  for (const nome of fs.readdirSync(dir)) {
    const chave = extrairChave(nome)
    if (chave) {
      const atual = m.get(chave)
      if (!atual || scorePadrao(nome) > scorePadrao(atual)) {
        m.set(chave, nome)
      }
    } else if (nome.toLowerCase().endsWith('.xml')) {
      semChave.push(nome)
    } else {
      outrosTipos.push(nome)
    }
  }
  return { mapa: m, semChave, outrosTipos }
}

console.log('Mapeando pastas...')
const bling = mapearPasta(DIR_BLING)
const ml    = mapearPasta(DIR_ML)

console.log(`  Bling: ${bling.mapa.size} chaves únicas (${bling.semChave.length} sem chave reconhecida)`)
console.log(`  ML   : ${ml.mapa.size} chaves únicas (${ml.semChave.length} sem chave reconhecida)`)

// Cruzamento
const todasChaves = new Set([...bling.mapa.keys(), ...ml.mapa.keys()])
let soBling = 0, soML = 0, ambos = 0

const linhas = ['chave;origem;arquivo_usado;nome_bling;nome_ml']
const planoCopia = [] // { origem: 'BLING'|'ML', srcDir, srcNome }

for (const chave of todasChaves) {
  const temBling = bling.mapa.has(chave)
  const temML    = ml.mapa.has(chave)
  const nomeBling = bling.mapa.get(chave) || ''
  const nomeML    = ml.mapa.get(chave) || ''
  let origem, srcDir, srcNome
  if (temBling && temML) {
    ambos++
    origem = 'AMBOS'
    srcDir = DIR_BLING
    srcNome = nomeBling  // preferência: Bling
  } else if (temBling) {
    soBling++
    origem = 'BLING'
    srcDir = DIR_BLING
    srcNome = nomeBling
  } else {
    soML++
    origem = 'ML'
    srcDir = DIR_ML
    srcNome = nomeML
  }
  linhas.push(`${chave};${origem};${srcNome};${nomeBling};${nomeML}`)
  planoCopia.push({ origem, srcDir, srcNome })
}

console.log('')
console.log('=== CRUZAMENTO ===')
console.log(`  Total de chaves únicas    : ${todasChaves.size}`)
console.log(`  Duplicadas (em ambas)     : ${ambos}`)
console.log(`  Exclusivas do Bling       : ${soBling}`)
console.log(`  Exclusivas do ML          : ${soML}`)
console.log(`  Soma bruta (Bling + ML)   : ${bling.mapa.size + ml.mapa.size}`)
console.log(`  Economia (notas evitadas) : ${(bling.mapa.size + ml.mapa.size) - todasChaves.size}`)

// Cria pasta unificada (limpa se já existir? — não, só adiciona. Mais seguro.)
if (!fs.existsSync(DIR_OUT)) {
  fs.mkdirSync(DIR_OUT, { recursive: true })
  console.log(`\nCriada pasta: ${DIR_OUT}`)
} else {
  console.log(`\nPasta já existe: ${DIR_OUT}  (adicionando arquivos faltantes)`)
}

let copiados = 0, jaExistiam = 0
for (const p of planoCopia) {
  const destino = path.join(DIR_OUT, p.srcNome)
  if (fs.existsSync(destino)) { jaExistiam++; continue }
  fs.copyFileSync(path.join(p.srcDir, p.srcNome), destino)
  copiados++
}

// === DEDUP DA PASTA DE SAÍDA ===
// Pode existir resíduo de execuções anteriores (mesma chave em 2 nomes — proc
// e nfe). Mantém o de maior score (procNFe > nfe > outro) e apaga o(s) menor(es).
let removidos = 0
const porChaveSaida = new Map() // chave → [nomes]
for (const nome of fs.readdirSync(DIR_OUT)) {
  const k = extrairChave(nome)
  if (!k) continue
  if (!porChaveSaida.has(k)) porChaveSaida.set(k, [])
  porChaveSaida.get(k).push(nome)
}
for (const [chave, nomes] of porChaveSaida) {
  if (nomes.length < 2) continue
  // ordena descrescente por score; remove tudo após o primeiro
  nomes.sort((a, b) => scorePadrao(b) - scorePadrao(a))
  const manter = nomes[0]
  for (const n of nomes.slice(1)) {
    fs.rmSync(path.join(DIR_OUT, n))
    removidos++
  }
  if (process.env.VERBOSE) console.log(`  dedup ${chave}: manteve ${manter}, removeu ${nomes.length - 1}`)
}

fs.writeFileSync(CSV_OUT, linhas.join('\n'), 'utf8')

console.log('')
console.log('=== RESULTADO ===')
console.log(`  Copiados             : ${copiados}`)
console.log(`  Já existiam          : ${jaExistiam}`)
console.log(`  Removidos (dedup)    : ${removidos}`)
console.log(`  Total na pasta final : ${fs.readdirSync(DIR_OUT).length}`)
console.log(`  Relatório CSV        : ${CSV_OUT}`)
