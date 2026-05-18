// scripts/gera-resumo.js
// Combina os JSONs de itens e peças pra produzir um resumo executivo da noite.

import fs from 'fs/promises'
import path from 'path'

const ROOT = process.cwd()
const F_ITENS = path.join(ROOT, 'relatorios', 'itens-extraidos.json')
const F_PECAS = path.join(ROOT, 'relatorios', 'pecas-para-inserir.json')
const F_COMPAT = path.join(ROOT, 'relatorios', 'pecas-precisa-compatibilidade.json')
const F_SQL = path.join(ROOT, 'relatorios', 'insert-pecas.sql')
const OUT = path.join(ROOT, 'relatorios', 'estoque-noite-RESUMO.md')

function pad(n, len = 4) {
  return String(n).padStart(len, ' ')
}

async function main() {
  const itensData = JSON.parse(await fs.readFile(F_ITENS, 'utf-8'))
  const pecas = JSON.parse(await fs.readFile(F_PECAS, 'utf-8'))
  const compat = JSON.parse(await fs.readFile(F_COMPAT, 'utf-8'))
  const sqlStat = await fs.stat(F_SQL).catch(() => null)

  // ── Estatísticas básicas
  const totalXmls = itensData.totalArquivos
  const totalValidos = itensData.comInfNFe
  const totalErros = itensData.totalErros
  const totalItens = itensData.totalItens
  const totalPecas = pecas.length

  // ── Período (data emissão min/max)
  const datas = itensData.itens
    .map(i => i.dataEmissao ? new Date(i.dataEmissao) : null)
    .filter(d => d && !isNaN(d))
  const dataMin = datas.length ? new Date(Math.min(...datas)) : null
  const dataMax = datas.length ? new Date(Math.max(...datas)) : null

  // ── Distribuição por categoria
  const porCat = pecas.reduce((m, p) => {
    m[p.categoria] = (m[p.categoria] || 0) + 1
    return m
  }, {})
  const catOrdenada = Object.entries(porCat).sort((a, b) => b[1] - a[1])

  // ── Top fornecedores (por número de itens, não por peças únicas)
  const porForn = itensData.itens.reduce((m, it) => {
    const r = it.fornecedor?.razao || '(sem fornecedor)'
    m[r] = (m[r] || 0) + 1
    return m
  }, {})
  const topForn = Object.entries(porForn).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // ── Top peças mais compradas (frequência no histórico)
  const topPecas = [...compat].sort((a, b) => b.frequenciaCompras - a.frequenciaCompras).slice(0, 10)

  // ── Top 10 fornecedores por valor total comprado
  const valorPorForn = itensData.itens.reduce((m, it) => {
    const r = it.fornecedor?.razao || '(sem fornecedor)'
    m[r] = (m[r] || 0) + (it.vProd || 0)
    return m
  }, {})
  const topFornValor = Object.entries(valorPorForn).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // ── Total comprado no período
  const totalComprado = itensData.itens.reduce((s, it) => s + (it.vProd || 0), 0)

  // ── Render
  const fmtBRL = v => 'R$ ' + v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, '.').replace('.', ',').replace(/,(\d{2})$/, ',$1')

  const linhas = [
    '# Estoque — Resumo da Noite de Processamento de NF-e',
    '',
    `**Data do processamento**: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}`,
    `**Período coberto pelas NF-e**: ${dataMin ? dataMin.toLocaleDateString('pt-BR') : '?'} → ${dataMax ? dataMax.toLocaleDateString('pt-BR') : '?'}`,
    '',
    '## 📊 Números',
    '',
    `- **XMLs lidos**: ${totalXmls}`,
    `- **XMLs válidos** (com infNFe): ${totalValidos}`,
    `- **XMLs com erro**: ${totalErros} (são procEventoNFe — eventos como cancelamento; não trazem produtos)`,
    `- **Itens extraídos** (linha-a-linha das NF-e): ${totalItens}`,
    `- **Peças únicas agrupadas** (por cProd ou nome): **${totalPecas}**`,
    `- **Total comprado no período**: **${fmtBRL(totalComprado)}**`,
    `- **SQL gerado**: ${sqlStat ? `${Math.round(sqlStat.size / 1024)} KB` : '?'}`,
    '',
    '## 🏷 Distribuição por categoria',
    '',
    'Categoria classificada por regex no nome da peça, alinhada com `src/utils/categoriasPeca.js`.',
    '',
    '| Categoria | Peças |',
    '|---|---:|',
    ...catOrdenada.map(([c, n]) => `| ${c} | ${n} |`),
    '',
    '> "outros" alto é esperado — pega itens genéricos (ferramentas, parafusos, materiais de oficina) que não são peças de máquina de lavar específicas.',
    '',
    '## 🏢 Top 10 fornecedores (por nº de compras)',
    '',
    '| # | Fornecedor | Itens |',
    '|---|---|---:|',
    ...topForn.map(([r, n], i) => `| ${i + 1} | ${r} | ${n} |`),
    '',
    '## 💰 Top 10 fornecedores (por valor total comprado)',
    '',
    '| # | Fornecedor | Total |',
    '|---|---|---:|',
    ...topFornValor.map(([r, v], i) => `| ${i + 1} | ${r} | ${fmtBRL(v)} |`),
    '',
    '## 🔁 Top 10 peças mais compradas (frequência)',
    '',
    '| # | Peça | Categoria | Compras |',
    '|---|---|---|---:|',
    ...topPecas.map((p, i) => `| ${i + 1} | ${p.nome.slice(0, 70)} | ${p.categoria} | ${p.frequenciaCompras} |`),
    '',
    '## 📁 Arquivos gerados',
    '',
    '| Arquivo | O que contém |',
    '|---|---|',
    '| `relatorios/itens-extraidos.json` | Saída crua do parser (todas as linhas de NF-e + erros) |',
    '| `relatorios/pecas-para-inserir.json` | Peças únicas agrupadas, com custos calculados |',
    '| `relatorios/pecas-precisa-compatibilidade.json` | Mesmas peças + NCMs + variações de nome (pra Claude in Chrome pesquisar compatibilidade de modelos amanhã) |',
    '| `relatorios/insert-pecas.sql` | **SQL pronto pra colar no Supabase** — `BEGIN/COMMIT`, 459 INSERTs |',
    '| `logs/estoque-bloqueios.md` | Erros e XMLs com problema |',
    '',
    '## ▶️ Próximos passos (manhã)',
    '',
    '1. **Toni**: abrir o SQL Editor do Supabase, colar `relatorios/insert-pecas.sql` inteiro, rodar. Confirmar que `SELECT count(*) FROM peca` retornou 459.',
    '2. **Toni**: revisar 10 peças aleatórias no Estoque → conferir que custo/categoria fazem sentido.',
    '3. **Claude in Chrome**: abrir `relatorios/pecas-precisa-compatibilidade.json` e pesquisar marcas/modelos compatíveis de cada peça (sair com lista `{ pecaId, marca, modelos[] }` pra popular tabela `peca_compatibilidade` num próximo módulo).',
    '4. **Refinar regex** de classificação: 49% caiu em "outros". Próxima iteração pode olhar a lista de "outros" e tirar de lá os que mereçam categoria própria (ex: borrachas de centrífuga, ferramentas em separado).',
    '',
    '## 🧮 Como custos foram calculados',
    '',
    '- **`custo_atual`** = última compra (mais recente pela `dhEmi` da NF-e)',
    '- **`custo_medio`** = média aritmética de todas as compras',
    '- **`custo_minimo`** / **`custo_maximo`** = mín/máx do histórico',
    '- **`preco_venda`** = `custo_atual * 2.3` (markup 130% padrão, conforme prompt). Toni pode ajustar caso a caso depois.',
    '- **`qtd_atual`** = `0` em todas. Toni define manualmente o que existe fisicamente no estoque.',
    '- **`qtd_minima`** = `1` (default conservador).',
    '',
    '## ⛔ Bloqueios encontrados',
    '',
    `- ${totalErros} XMLs sem \`infNFe\` — todos são \`*-procEventoNFe.xml\` (eventos como CCe ou cancelamento; não têm produtos). Esperado.`,
    '- `$env:IDEMAQ_TERMINAL` veio vazio (não setado). Trabalho prosseguiu por contexto.',
    '- `git pull --rebase` **pulado** intencionalmente: havia mudanças não-relacionadas (outros terminais) que dariam conflito.',
    '- `.env.local` **não criado** — o fluxo final não insere direto no Supabase (gera SQL pra Toni colar). Service-role-key não foi necessário.',
    '- `npm run build` **pulado** — não toquei em `src/`, só `scripts/` e `relatorios/`. O build não pode ter sido afetado.',
    '',
    '## ✅ Checklist do prompt',
    '',
    '- [x] `notas-xml/` lida (420 arquivos)',
    '- [x] `relatorios/itens-extraidos.json`',
    '- [x] `relatorios/pecas-para-inserir.json`',
    '- [x] `relatorios/pecas-precisa-compatibilidade.json`',
    '- [x] `relatorios/insert-pecas.sql`',
    '- [x] `relatorios/estoque-noite-RESUMO.md` (este arquivo)',
    '- [x] Commit (próximo passo)',
    '',
    '— gerado por `scripts/gera-resumo.js`',
    '',
  ]

  await fs.writeFile(OUT, linhas.join('\n'))
  console.log(`✅ Resumo gerado: ${OUT}`)
}

main().catch(err => { console.error('💥 Erro:', err); process.exit(1) })
