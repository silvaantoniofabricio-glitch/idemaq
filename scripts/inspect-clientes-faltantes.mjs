// Inspeciona quem ficou de fora da importacao de clientes Trello.
// Categorias: bucket B (so tel, sem nome), bucket C (sem tel), outros boards.

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = 'Base de dados clientes Bling/areadetrabalho95498714_20260519_035333/boards'

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

const norm = s => String(s || '').replace(/\D/g, '')

function extrairNome(cardName) {
  if (!cardName) return ''
  let n = cardName
    .replace(/[​-‏‪-‮﻿]/g, '')
    .replace(/^[\s'"`]+/, '')
    .trim()
  n = n.replace(/^\+\d{1,3}\s+/, '')
  n = n.replace(/\s*\d{2}\s*\d{4,5}[\s-]?\d{4}\s*$/, '').trim()
  n = n.replace(/\s*\d{10,11}\s*$/, '').trim()
  if (/^\+?[\d\s\-()]+$/.test(n) && n.replace(/\D/g, '').length >= 8) return ''
  if (/^\+?\d{0,3}\s*$/.test(n)) return ''
  return n
}

// ─── 1) Board servicos: bucket B (so tel) e C (sem tel) ──────────────────────
console.log('═══ Board: serviços ═══\n')
const csvServ = readFileSync(resolve(ROOT, 'serviços/serviços.csv'), 'utf8')
const rowsServ = parseCsv(csvServ)
const headerServ = rowsServ[0]
const dataServ = rowsServ.slice(1).filter(r => r.length >= headerServ.length)
const colServ = {}
headerServ.forEach((n, i) => { colServ[n.trim()] = i })

const bucketB = []
const bucketC = []
for (const r of dataServ) {
  const cardName = r[colServ['Card Name']] || ''
  const tel = r[colServ['Telefone']] || ''
  const end = r[colServ['Endereço']] || ''
  const archived = (r[colServ['Archived']] || '').toLowerCase() === 'true'
  const telN = norm(tel)
  if (telN.length < 8) { bucketC.push({ cardName, tel, end, archived }); continue }
  const nome = extrairNome(cardName)
  if (!nome) bucketB.push({ cardName, tel, telN, end, archived })
}

console.log(`Bucket B (só telefone): ${bucketB.length} cards`)
console.log(`  Ativos: ${bucketB.filter(x => !x.archived).length}, archived: ${bucketB.filter(x => x.archived).length}`)
console.log('  Amostra (até 10):')
for (const x of bucketB.slice(0, 10)) {
  console.log(`    ${x.archived ? '[arch]' : '[ativo]'} card="${x.cardName}" | tel="${x.tel}" | end="${(x.end || '').slice(0, 50)}"`)
}

console.log(`\nBucket C (sem telefone válido): ${bucketC.length} cards`)
console.log(`  Ativos: ${bucketC.filter(x => !x.archived).length}, archived: ${bucketC.filter(x => x.archived).length}`)
console.log('  Amostra (até 10):')
for (const x of bucketC.slice(0, 10)) {
  console.log(`    ${x.archived ? '[arch]' : '[ativo]'} card="${(x.cardName || '').slice(0, 50)}" | tel="${x.tel}" | end="${(x.end || '').slice(0, 50)}"`)
}

// ─── 2) Outros boards (CSVs ficam vazios mas tem dados no JSON) ─────────────
console.log('\n═══ Outros boards ═══\n')

for (const board of ['finalizados', 'visitas', 'tarefas']) {
  const jsonPath = resolve(ROOT, `${board}/${board}.json`)
  if (!existsSync(jsonPath)) { console.log(`${board}: JSON nao existe`); continue }
  const j = JSON.parse(readFileSync(jsonPath, 'utf8'))
  const cards = (j.cards || []).filter(c => !c.closed)
  const cardsAll = j.cards || []
  console.log(`Board "${board}": ${cardsAll.length} cards (${cards.length} nao-archived)`)

  // Tenta extrair tel/nome dos custom fields ou name
  const customFields = j.customFields || []
  const fieldTel = customFields.find(f => /tel/i.test(f.name))
  const fieldEnd = customFields.find(f => /endere/i.test(f.name))
  if (fieldTel) console.log(`  Tem custom field "Telefone": ${fieldTel.id}`)

  // Amostra
  console.log('  Amostra de 5 cards (qualquer):')
  for (const c of cardsAll.slice(0, 5)) {
    let tel = ''
    if (fieldTel) {
      const cf = (c.customFieldItems || []).find(x => x.idCustomField === fieldTel.id)
      tel = cf?.value?.text || ''
    }
    console.log(`    ${c.closed ? '[arch]' : '[ativo]'} "${(c.name || '').slice(0, 60)}" tel="${tel}"`)
  }
  console.log()
}

// ─── 3) Cards de revisão (Aguardando/Leeds/etc) ──────────────────────────────
console.log('═══ Cards de revisão (notas-trello) ═══\n')
const revisar = JSON.parse(readFileSync('notas-trello/cards-para-revisar.json', 'utf8'))
let comNome = 0, semNome = 0, comTel = 0, semTel = 0
for (const c of revisar) {
  if (c.nome) comNome++; else semNome++
  if (c.telNorm && c.telNorm.length >= 8) comTel++; else semTel++
}
console.log(`Total: ${revisar.length}`)
console.log(`  Com nome extraído: ${comNome}, sem nome: ${semNome}`)
console.log(`  Com telefone ≥ 8 díg: ${comTel}, sem: ${semTel}`)
console.log('  Candidatos a cadastro (tem nome + tel): ' + revisar.filter(c => c.nome && c.telNorm && c.telNorm.length >= 8).length)
