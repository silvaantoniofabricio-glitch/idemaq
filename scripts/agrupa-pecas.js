// scripts/agrupa-pecas.js
// Lê itens-extraidos.json, agrupa por cProd (ou nome normalizado), classifica
// por keywords (alinhado com src/utils/categoriasPeca.js) e gera:
//   - relatorios/pecas-para-inserir.json
//   - relatorios/pecas-precisa-compatibilidade.json

import fs from 'fs/promises'
import path from 'path'

const ROOT = process.cwd()
const IN_FILE = path.join(ROOT, 'relatorios', 'itens-extraidos.json')
const OUT_PECAS = path.join(ROOT, 'relatorios', 'pecas-para-inserir.json')
const OUT_COMPAT = path.join(ROOT, 'relatorios', 'pecas-precisa-compatibilidade.json')

// ─── Classificação por keywords ─────────────────────────────────────────────
// Categoria IDs espelham src/utils/categoriasPeca.js. Ordem importa — primeira
// regex que matchar ganha. Mais específicas no topo, fallbacks abaixo.
const REGRAS_CATEGORIA = [
  // Sistema de água — específicas
  { regex: /borracha.*porta|gaxeta.*porta|veda[çc][ãa]o.*porta/i, categoria: 'borracha_porta' },
  { regex: /v[áa]lvula|solenoide|entrada[\s\-]?[áa]gua|admiss[ãa]o/i, categoria: 'valvula' },
  { regex: /eletrobomba|bomba\s*(de\s*)?(drenagem|d['á]gua|lavad|escoamento|saida)/i, categoria: 'eletrobomba' },
  { regex: /mangueira/i, categoria: 'mangueira' },
  { regex: /pressostato|sensor\s*(de\s*)?n[íi]vel/i, categoria: 'pressostato' },

  // Motor e transmissão
  { regex: /correia/i, categoria: 'correia' },
  { regex: /polia/i, categoria: 'polia' },
  { regex: /embreagem|cluth/i, categoria: 'embreagem' },
  { regex: /catraca/i, categoria: 'catraca' },
  { regex: /mecanismo|engrenagem/i, categoria: 'mecanismo' },
  { regex: /rolamento|retentor/i, categoria: 'rolamento' },
  { regex: /\bmotor\b/i, categoria: 'motor' },

  // Sistema elétrico
  { regex: /placa\s*(eletr|de\s*controle|de\s*pot[êe]ncia|principal)|m[óo]dulo\s*eletr[óo]nic|interface\s*do\s*usu|painel\s*(eletr|de\s*controle)/i, categoria: 'placa' },
  { regex: /timer|chave\s*seletora|programador/i, categoria: 'timer' },
  { regex: /capacitor/i, categoria: 'capacitor' },
  { regex: /trava\s*(da\s*porta|el[ée]trica)|fechadura\s*da\s*porta/i, categoria: 'trava_porta' },
  { regex: /termostato/i, categoria: 'termostato' },
  { regex: /sensor/i, categoria: 'sensor' },

  // Estrutura
  { regex: /cesto|tambor/i, categoria: 'cesto' },
  { regex: /agitador|batedor/i, categoria: 'agitador' },
  { regex: /suspens[ãa]o|amortecedor|mola(\s*da)?\s*suspens/i, categoria: 'suspensao' },
  { regex: /tirantes?\b/i, categoria: 'tirantes' },
  { regex: /p[ée]\s*nivelador|p[ée]s\s*regul/i, categoria: 'pe_nivelador' },

  // Externo / acabamento
  { regex: /capa\b/i, categoria: 'capa' },
  { regex: /filtro\s*(pluma|fiap|fia|de\s*cest)/i, categoria: 'filtro' },
  { regex: /tampa/i, categoria: 'tampa' },
]

function classificar(nome) {
  if (!nome) return 'outros'
  for (const r of REGRAS_CATEGORIA) {
    if (r.regex.test(nome)) return r.categoria
  }
  return 'outros'
}

function normalizaChaveNome(nome) {
  return (nome || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  const data = JSON.parse(await fs.readFile(IN_FILE, 'utf-8'))
  const itens = data.itens || []

  // Agrupa por cProd; se não houver cProd, usa nome normalizado
  const grupos = new Map()

  for (const it of itens) {
    const chave = it.cProd ? `sku:${it.cProd}` : `nm:${normalizaChaveNome(it.xProd)}`
    if (!chave || chave === 'sku:' || chave === 'nm:') continue

    if (!grupos.has(chave)) {
      grupos.set(chave, {
        chave,
        sku: it.cProd || null,
        nomes: new Map(),       // nome → frequência
        ncms: new Set(),
        fornecedores: new Set(),
        compras: [],
      })
    }
    const g = grupos.get(chave)
    g.nomes.set(it.xProd, (g.nomes.get(it.xProd) || 0) + 1)
    if (it.ncm) g.ncms.add(it.ncm)
    if (it.fornecedor?.razao) g.fornecedores.add(it.fornecedor.razao)
    g.compras.push({
      data: it.dataEmissao,
      qtd: it.qCom,
      custo_unit: it.vUnCom,
      fornecedor: it.fornecedor?.razao,
      arquivo: it.arquivo,
    })
  }

  // Monta saídas finais
  const pecasParaInserir = []
  const precisaCompatibilidade = []

  for (const g of grupos.values()) {
    const custos = g.compras.map(c => c.custo_unit).filter(v => v > 0)
    if (custos.length === 0) continue

    // Nome mais frequente do grupo
    let nomeMaisComum = null, freq = 0
    for (const [n, c] of g.nomes) {
      if (c > freq) { nomeMaisComum = n; freq = c }
    }
    nomeMaisComum = nomeMaisComum || [...g.nomes.keys()][0] || ''

    const categoria = classificar(nomeMaisComum)

    // Compra mais recente
    const compraOrdenada = [...g.compras].sort((a, b) => {
      const da = a.data ? new Date(a.data).getTime() : 0
      const db = b.data ? new Date(b.data).getTime() : 0
      return db - da
    })
    const ultima = compraOrdenada[0]

    const custoAtual = ultima.custo_unit
    const custoMedio = custos.reduce((s, v) => s + v, 0) / custos.length
    const custoMin = Math.min(...custos)
    const custoMax = Math.max(...custos)

    // Quantidade total comprada (histórico) — útil pra qtd_atual default não 0
    // mas seguimos a regra do prompt: qtd_atual=0, Toni define depois
    const variacoesNome = [...g.nomes.keys()]

    const peca = {
      nome: nomeMaisComum.slice(0, 200),
      sku: g.sku,
      descricao: variacoesNome.slice(0, 3).join(' | ').slice(0, 500),
      categoria,
      fornecedor: [...g.fornecedores].join(', ').slice(0, 200),
      qtd_atual: 0,
      qtd_minima: 1,
      custo_atual: Number(custoAtual.toFixed(2)),
      custo_medio: Number(custoMedio.toFixed(2)),
      custo_minimo: Number(custoMin.toFixed(2)),
      custo_maximo: Number(custoMax.toFixed(2)),
      preco_venda: Number((custoAtual * 2.3).toFixed(2)),
    }
    pecasParaInserir.push(peca)

    precisaCompatibilidade.push({
      nome: peca.nome,
      sku: peca.sku,
      categoria: peca.categoria,
      ncms: [...g.ncms],
      fornecedores: [...g.fornecedores],
      frequenciaCompras: g.compras.length,
      qtdTotalComprada: g.compras.reduce((s, c) => s + (c.qtd || 0), 0),
      variacoesNome,
    })
  }

  // Ordena por categoria → nome
  pecasParaInserir.sort((a, b) =>
    (a.categoria || '').localeCompare(b.categoria || '') ||
    (a.nome || '').localeCompare(b.nome || '')
  )
  precisaCompatibilidade.sort((a, b) =>
    (a.categoria || '').localeCompare(b.categoria || '') ||
    (a.nome || '').localeCompare(b.nome || '')
  )

  await fs.writeFile(OUT_PECAS, JSON.stringify(pecasParaInserir, null, 2))
  await fs.writeFile(OUT_COMPAT, JSON.stringify(precisaCompatibilidade, null, 2))

  // Estatísticas
  const porCategoria = pecasParaInserir.reduce((m, p) => {
    m[p.categoria] = (m[p.categoria] || 0) + 1
    return m
  }, {})

  console.log(`✅ ${pecasParaInserir.length} peças únicas (de ${itens.length} itens em ${grupos.size} grupos)`)
  console.log(`📊 Distribuição por categoria:`)
  for (const [c, n] of Object.entries(porCategoria).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${c.padEnd(18)} ${n}`)
  }
  console.log(`📄 ${OUT_PECAS}`)
  console.log(`📄 ${OUT_COMPAT}`)
}

main().catch(err => {
  console.error('💥 Erro:', err)
  process.exit(1)
})
