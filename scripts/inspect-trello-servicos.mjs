// Inspeciona o board serviços do Trello — mostra contagem por lista,
// status de archived, valor, pagamento, datas. Só lê, não modifica nada.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CSV_PATH = resolve(
  'Base de dados clientes Bling/areadetrabalho95498714_20260519_035333/boards/serviços/serviços.csv'
)

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

const raw = readFileSync(CSV_PATH, 'utf8')
const rows = parseCsv(raw)
const header = rows[0]
const data = rows.slice(1).filter(r => r.length >= header.length)
const col = {}
header.forEach((n, i) => { col[n.trim()] = i })

console.log(`Total cards: ${data.length}\n`)

// 1) Por lista
const porLista = new Map()
const porListaArchived = new Map()
for (const r of data) {
  const lista = r[col['List Name']] || '(sem lista)'
  const archived = (r[col['Archived']] || '').toLowerCase() === 'true'
  porLista.set(lista, (porLista.get(lista) || 0) + 1)
  if (archived) porListaArchived.set(lista, (porListaArchived.get(lista) || 0) + 1)
}

console.log('─── Cards por lista ───')
const listas = Array.from(porLista.entries()).sort((a, b) => b[1] - a[1])
for (const [lista, qtd] of listas) {
  const arch = porListaArchived.get(lista) || 0
  const ativos = qtd - arch
  console.log(`  ${String(qtd).padStart(4)} cards | ${String(ativos).padStart(4)} ativos + ${String(arch).padStart(4)} archived | ${lista}`)
}

// 2) Archived total
const totalArch = data.filter(r => (r[col['Archived']] || '').toLowerCase() === 'true').length
console.log(`\nTotal archived: ${totalArch}  ·  ativos: ${data.length - totalArch}`)

// 3) Valor preenchido?
const comValor = data.filter(r => (r[col['Valor']] || '').trim()).length
const comPagto = data.filter(r => (r[col['Pagamento']] || '').trim()).length
const comDataEntrada = data.filter(r => (r[col['Data de Entrada']] || '').trim()).length
const comDataSaida = data.filter(r => (r[col['Data de Saída']] || '').trim()).length
const comObs = data.filter(r => (r[col['Obs']] || '').trim()).length
const comServicos = data.filter(r => (r[col['Serviços']] || '').trim()).length
const comTelefone = data.filter(r => (r[col['Telefone']] || '').replace(/\D/g, '').length >= 8).length
const comEndereco = data.filter(r => (r[col['Endereço']] || '').trim()).length

console.log('\n─── Preenchimento dos custom fields ───')
console.log(`  Telefone (≥ 8 díg) : ${String(comTelefone).padStart(4)} / ${data.length} (${(comTelefone / data.length * 100).toFixed(0)}%)`)
console.log(`  Endereço           : ${String(comEndereco).padStart(4)} / ${data.length} (${(comEndereco / data.length * 100).toFixed(0)}%)`)
console.log(`  Valor              : ${String(comValor).padStart(4)} / ${data.length} (${(comValor / data.length * 100).toFixed(0)}%)`)
console.log(`  Pagamento          : ${String(comPagto).padStart(4)} / ${data.length} (${(comPagto / data.length * 100).toFixed(0)}%)`)
console.log(`  Data de Entrada    : ${String(comDataEntrada).padStart(4)} / ${data.length} (${(comDataEntrada / data.length * 100).toFixed(0)}%)`)
console.log(`  Data de Saída      : ${String(comDataSaida).padStart(4)} / ${data.length} (${(comDataSaida / data.length * 100).toFixed(0)}%)`)
console.log(`  Obs                : ${String(comObs).padStart(4)} / ${data.length} (${(comObs / data.length * 100).toFixed(0)}%)`)
console.log(`  Serviços           : ${String(comServicos).padStart(4)} / ${data.length} (${(comServicos / data.length * 100).toFixed(0)}%)`)

// 4) Exemplos de valor/pagamento/serviços (pra entender formato)
console.log('\n─── Amostra de cards com Valor preenchido (até 5) ───')
let n = 0
for (const r of data) {
  if (!(r[col['Valor']] || '').trim()) continue
  if (n++ >= 5) break
  console.log(`  [${r[col['List Name']]}] ${r[col['Card Name']]} | Valor="${r[col['Valor']]}" | Pgto="${r[col['Pagamento']]}" | Serv="${r[col['Serviços']]}"`)
}

console.log('\n─── Amostra de cards com Serviços preenchido (até 3) ───')
n = 0
for (const r of data) {
  const s = (r[col['Serviços']] || '').trim()
  if (!s) continue
  if (n++ >= 3) break
  console.log(`  [${r[col['List Name']]}] ${r[col['Card Name']]} | Serv="${s.slice(0, 100)}${s.length > 100 ? '…' : ''}"`)
}

console.log('\n─── Amostra de cards com Obs preenchido (até 5) ───')
n = 0
for (const r of data) {
  const o = (r[col['Obs']] || '').trim()
  if (!o) continue
  if (n++ >= 5) break
  console.log(`  [${r[col['List Name']]}] ${r[col['Card Name']]} | Obs="${o.slice(0, 80)}"`)
}
