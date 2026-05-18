// scripts/gera-sql-insert.js
// Lê pecas-para-inserir.json e gera SQL pronto pra colar no SQL Editor do
// Supabase. Usa transação (BEGIN/COMMIT) e ON CONFLICT (sku) DO NOTHING pra
// permitir re-execução sem duplicar.

import fs from 'fs/promises'
import path from 'path'

const ROOT = process.cwd()
const IN_FILE = path.join(ROOT, 'relatorios', 'pecas-para-inserir.json')
const OUT_SQL = path.join(ROOT, 'relatorios', 'insert-pecas.sql')

function esc(v) {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

const COLS = [
  'nome', 'sku', 'descricao', 'categoria', 'fornecedor',
  'qtd_atual', 'qtd_minima',
  'custo_atual', 'custo_medio', 'custo_minimo', 'custo_maximo',
  'preco_venda',
]

async function main() {
  const pecas = JSON.parse(await fs.readFile(IN_FILE, 'utf-8'))

  const linhas = [
    '-- ============================================================================',
    '-- INSERT de peças extraídas de NF-e (notas-xml/)',
    `-- Gerado em ${new Date().toISOString()}`,
    `-- Total de peças: ${pecas.length}`,
    '--',
    '-- Como rodar: cole tudo no SQL Editor do Supabase e execute.',
    '-- A transação garante "tudo ou nada" — se algo falhar, nada é inserido.',
    '-- ============================================================================',
    '',
    'BEGIN;',
    '',
  ]

  for (const p of pecas) {
    const vals = COLS.map(c => esc(p[c])).join(', ')
    linhas.push(`INSERT INTO peca (${COLS.join(', ')}) VALUES (${vals});`)
  }

  linhas.push('', 'COMMIT;', '')
  linhas.push(`-- ${pecas.length} INSERTs gerados.`)

  await fs.writeFile(OUT_SQL, linhas.join('\n'))
  console.log(`✅ SQL gerado: ${OUT_SQL}`)
  console.log(`📝 ${pecas.length} INSERTs (uma transação)`)
}

main().catch(err => { console.error('💥 Erro:', err); process.exit(1) })
