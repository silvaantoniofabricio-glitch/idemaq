// Diffa os 2 exports do Trello pra entender o que mudou.
// Antigo: areadetrabalho95498714_20260519_035333/
// Novo:   areadetrabalho95498714_20260521_054331/

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE_ANT = 'Base de dados clientes Bling/areadetrabalho95498714_20260519_035333/boards/serviços'
const BASE_NEW = 'Base de dados clientes Bling/areadetrabalho95498714_20260521_054331/boards/serviços'

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1)
  const rows = []
  let row = [], cur = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else { cur += ch }
    } else {
      if (ch === ',') { row.push(cur); cur = '' }
      else if (ch === '"' && cur === '') { inQuotes = true }
      else if (ch === '\r') { /* skip */ }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else { cur += ch }
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row) }
  return rows
}

function carregarCards(path) {
  const rows = parseCsv(readFileSync(path, 'utf8'))
  const header = rows[0]
  const data = rows.slice(1).filter(r => r.length >= header.length)
  const col = {}
  header.forEach((n, i) => { col[n.trim()] = i })
  const map = new Map()
  for (const r of data) {
    const id = r[col['Card ID']]
    if (!id) continue
    map.set(id, {
      id,
      name: r[col['Card Name']],
      lista: r[col['List Name']],
      archived: (r[col['Archived']] || '').toLowerCase() === 'true',
      tel: r[col['Telefone']],
      lastAct: r[col['Last Activity Date']],
      valor: r[col['Valor']],
      obs: r[col['Obs']],
    })
  }
  return map
}

const antigos = carregarCards(resolve(BASE_ANT, 'serviços.csv'))
const novos   = carregarCards(resolve(BASE_NEW, 'serviços.csv'))

console.log(`Cards no export ANTIGO (19/05): ${antigos.size}`)
console.log(`Cards no export NOVO   (21/05): ${novos.size}`)
console.log('')

// Cards 100% novos (id existe só no novo)
const novosCards = []
for (const [id, c] of novos) if (!antigos.has(id)) novosCards.push(c)
console.log(`Cards 100% NOVOS no export novo: ${novosCards.length}`)
console.log('  Por lista:')
const porLista = new Map()
for (const c of novosCards) porLista.set(c.lista, (porLista.get(c.lista) || 0) + 1)
for (const [l, n] of [...porLista.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(n).padStart(3)} | ${l}${c => c.archived ? ' (archived)' : ''}`)
}
console.log('  Amostra (até 8):')
for (const c of novosCards.slice(0, 8)) {
  console.log(`    [${c.lista}] ${c.archived ? '[arch]' : '[ativo]'} "${(c.name || '').slice(0, 50)}" tel="${c.tel}"`)
}
console.log('')

// Cards que mudaram de lista
const mudaramLista = []
for (const [id, n] of novos) {
  const a = antigos.get(id)
  if (a && a.lista !== n.lista) mudaramLista.push({ id, name: n.name, antes: a.lista, depois: n.lista, archAntes: a.archived, archDepois: n.archived })
}
console.log(`Cards que MUDARAM de lista: ${mudaramLista.length}`)
const trans = new Map()
for (const m of mudaramLista) {
  const k = `${m.antes} → ${m.depois}`
  trans.set(k, (trans.get(k) || 0) + 1)
}
for (const [k, n] of [...trans.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)} | ${k}`)
}
console.log('')

// Cards que ficaram archived (estavam ativos antes, agora archived)
const novoArchived = []
for (const [id, n] of novos) {
  const a = antigos.get(id)
  if (a && !a.archived && n.archived) novoArchived.push({ id, name: n.name, lista: n.lista })
}
console.log(`Cards que viraram ARCHIVED (estavam ativos): ${novoArchived.length}`)

// Cards que sumiram (estavam antes, não estão agora — deletados)
const sumidos = []
for (const [id, a] of antigos) if (!novos.has(id)) sumidos.push(a)
console.log(`Cards que SUMIRAM (estavam antes, não estão agora): ${sumidos.length}`)

console.log('')
console.log('═══ Resumo de impacto na importação ═══')
const novosAtivos = novosCards.filter(c => !c.archived)
console.log(`Cards 100% novos ATIVOS:           ${novosAtivos.length}`)
console.log(`Cards existentes que mudaram lista: ${mudaramLista.length}`)
console.log(`(potencialmente requer UPDATE de etapa nas OS já criadas)`)
