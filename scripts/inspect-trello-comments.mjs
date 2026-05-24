// Inspeciona estrutura dos comentários do Trello pra entender o que parsear.
import fs from 'fs'
import path from 'path'

const TRELLO_JSON = 'C:/Users/Toni-PC/projetos/idemaq/Base de dados clientes Bling/TRELLO/areadetrabalho95498714_20260522_064453/boards/serviços/serviços.json'

const data = JSON.parse(fs.readFileSync(TRELLO_JSON, 'utf8'))
const cards = data.cards.filter(c => !c.closed)
console.log(`Total cards: ${cards.length}`)

// Lists (etapas)
const lists = Object.fromEntries(data.lists.map(l => [l.id, l.name]))
console.log('Lists:', Object.values(lists))

// Actions: pega comentários (commentCard) e movimentações (updateCard com listAfter)
const commentsByCard = new Map()
const movesByCard = new Map()
for (const a of data.actions) {
  const cardId = a.data?.card?.id
  if (!cardId) continue
  if (a.type === 'commentCard') {
    if (!commentsByCard.has(cardId)) commentsByCard.set(cardId, [])
    commentsByCard.get(cardId).push({
      date: a.date,
      text: a.data.text || '',
    })
  }
  if (a.type === 'updateCard' && a.data.listBefore && a.data.listAfter) {
    if (!movesByCard.has(cardId)) movesByCard.set(cardId, [])
    movesByCard.get(cardId).push({
      date: a.date,
      from: a.data.listBefore.name,
      to: a.data.listAfter.name,
    })
  }
}

console.log(`Cards com comentários: ${commentsByCard.size}`)
console.log(`Cards com movimentações: ${movesByCard.size}`)

// Regex de extração de valor + forma + data
const RX_VALOR = /(?:^|\s|\*)([\d]{2,4}(?:[,.]\d{1,2})?)\s*(?:reais?|r\$|\$)?/i
const RX_PAG = /(pix|d[eé]bito|cr[eé]dito|d[eé]bito\s*na\s*maquina|cart[aã]o|dinheiro|esp[eé]cie|prazo|fiado|boleto|transfer[eê]ncia)/i
const RX_DATA = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/

function parseComment(text, commentDate) {
  const valor = text.match(RX_VALOR)?.[1]
  const pag = text.match(RX_PAG)?.[1]
  const dataMatch = text.match(RX_DATA)

  return {
    text,
    commentDate,
    valor: valor ? parseFloat(valor.replace(',', '.')) : null,
    forma: pag?.toLowerCase().replace(/[éê]/g, 'e').replace(/[ãa]/g, 'a'),
    dataExplicit: dataMatch ? `${dataMatch[1]}/${dataMatch[2]}` : null,
  }
}

// Análise: quantos comentários parseáveis (valor + forma)
let totalComments = 0, comValor = 0, comForma = 0, comAmbos = 0
const exemplosOK = [], exemplosFalha = []
for (const [cardId, comments] of commentsByCard.entries()) {
  for (const c of comments) {
    totalComments++
    const p = parseComment(c.text, c.date)
    if (p.valor) comValor++
    if (p.forma) comForma++
    if (p.valor && p.forma) {
      comAmbos++
      if (exemplosOK.length < 10) exemplosOK.push({ cardId, ...p })
    } else if (!p.valor && !p.forma) {
      if (exemplosFalha.length < 10) exemplosFalha.push({ cardId, text: c.text.slice(0, 80) })
    }
  }
}

console.log(`\nTotal comentários: ${totalComments}`)
console.log(`Com valor: ${comValor} (${(comValor/totalComments*100).toFixed(1)}%)`)
console.log(`Com forma: ${comForma}`)
console.log(`Com ambos (parseáveis): ${comAmbos} (${(comAmbos/totalComments*100).toFixed(1)}%)`)
console.log('\nExemplos OK:')
exemplosOK.forEach(e => console.log(`  ${e.valor} ${e.forma} ${e.dataExplicit || ''} - ${e.text.slice(0, 60)}`))
console.log('\nExemplos sem extração:')
exemplosFalha.forEach(e => console.log(`  ${e.text}`))

// Salva pra inspecionar
fs.writeFileSync('C:/Users/Toni-PC/projetos/idemaq/relatorios/trello-comments-analise.json', JSON.stringify({
  total_cards: cards.length,
  cards_com_comentarios: commentsByCard.size,
  total_comentarios: totalComments,
  parseaveis: comAmbos,
  exemplos_ok: exemplosOK,
  exemplos_falha: exemplosFalha,
  lists: Object.values(lists),
}, null, 2))
