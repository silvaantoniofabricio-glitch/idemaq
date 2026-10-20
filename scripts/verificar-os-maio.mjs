import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { parse } from 'path'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

// Lê o CSV
const csv = readFileSync('C:/Users/Toni-PC/projetos/idemaq/FECHAMENTO MAIO/RECEBEDOR MAIO 2026 - COMPLETO.csv', 'utf8')
const linhas = csv.trim().split('\n').slice(1)

// Extrai telefones do CSV
function extrairTelefone(str) {
  const m = str.match(/(\d{2}\s*\d{4,5}[-\s]?\d{4})/)
  if (!m) return null
  return m[1].replace(/\D/g, '')
}

const entradas = linhas.map(l => {
  const cols = l.split(';').map(c => c.replace(/^"|"$/g, ''))
  return { data: cols[0], cliente: cols[1], valor: cols[2], pagamento: cols[5], obs: cols[8] }
})

// Busca OS de maio/2026 no sistema
const { data: osData, error } = await supabase
  .from('os')
  .select('id, etapa, valor_total, criado_em, cliente:cliente_id(nome, telefone)')
  .gte('criado_em', '2026-05-01')
  .lte('criado_em', '2026-05-31T23:59:59')
  .is('deleted_at', null)
  .order('criado_em')

if (error) { console.error('Erro:', error.message); process.exit(1) }

console.log(`OS em maio no sistema: ${osData.length}`)
console.log(`Entradas no CSV: ${entradas.length}`)
console.log('\n=== OS encontradas no sistema (maio 2026) ===')
osData.forEach(os => {
  const tel = os.cliente?.telefone || ''
  const nome = os.cliente?.nome || 'sem cliente'
  console.log(`${os.criado_em?.substring(0,10)} | ${os.etapa} | R$ ${os.valor_total} | ${nome} | ${tel}`)
})
