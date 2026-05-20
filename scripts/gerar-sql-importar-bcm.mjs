// Gera 2 SQLs (v2 — modelos_compativeis como text[] desde a criacao):
//   sql/02-peca-add-colunas.sql        ALTER TABLE peca ADD marca/tipo/referencia/modelo/modelos_compativeis(text[])
//   sql/03-peca-importar-bcm.sql       UPDATE soft-delete 459 antigas + INSERT 680 do BCM
//
// Diferenca pro v1 (rodado em 19/05/2026 e depois corrigido na mao via ALTER TABLE):
//   - 02 ja cria modelos_compativeis como text[]
//   - 03 envia modelos_compativeis como ARRAY literal ('{...}') em vez de string
//
// Mapeamento BCM -> peca:
//   peca.nome                = BCM.Nome Produto (reconstruido do tipo+marca+modelo)
//   peca.categoria           = BCM.Categoria (mapeada pras canonicas do projeto)
//   peca.marca               = BCM.Marca
//   peca.tipo                = BCM.Tipo
//   peca.referencia          = BCM.Referencia (SKU interno do BCM / codigo original)
//   peca.modelo              = BCM.Modelo (codigo do fabricante)
//   peca.modelos_compativeis = BCM.Modelos Compativeis (split em array por , / ; \n)
//   peca.descricao           = NULL (catalogo base, sem descricao propria)
//   peca.fornecedor          = NULL (catalogo base, sem vinculo de fornecedor — definido na 1a compra real)
//   peca.sku                 = BCM.Referencia || id-da-url
//   peca.qtd_atual           = 0
//   peca.qtd_minima          = 0
//   peca.custo_*             = NULL
//   peca.preco_venda         = NULL

import fs from 'node:fs'
import path from 'node:path'

const DIR_CSV = 'C:/Users/Toni-PC/projetos/idemaq/RELATORIO OUTRAS LOJAS'
const DIR_SQL = 'C:/Users/Toni-PC/projetos/idemaq/sql'

// ---------- CSV parser ----------
function parseCSV(text, sep) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else inQuotes = false }
      else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === sep) { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') {}
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''))
}

const sqlStr = s => s === '' || s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'"
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim()

// Converte string CSV de modelos compativeis em literal de array Postgres (text[]).
// Aceita separadores , / ; \n. Vazio -> NULL.
// Cada item vai entre aspas duplas (com escape) dentro do '{...}'.
function sqlArrayCompat(s) {
  const items = String(s ?? '')
    .split(/[,/\n;]/)
    .map(x => x.trim())
    .filter(Boolean)
  if (!items.length) return 'NULL'
  const inner = items
    .map(x => '"' + x.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"')
    .join(',')
  return "'{" + inner.replace(/'/g, "''") + "}'"
}

// Mapa BCM (plural/slug) -> categoria canonica do projeto (categoriasPeca.js).
// Todas as categorias BCM agora tem destino especifico (zero "outros").
const MAPA_CATEGORIA = {
  'agitadores': 'agitador',
  'atuadores-e-embreagens': 'atuador_embreagem',
  'banda-do-freio': 'banda_freio',
  'botao': 'botao',
  'capa-lavadora': 'capa',
  'capacitor': 'capacitor',
  'chaves-seletoras': 'chave_seletora',
  'chicotes-lavadora': 'chicote',
  'cj-braco-injetor': 'braco_injetor',
  'correias-lavadoras': 'correia',
  'eixos-e-mecanismos': 'mecanismo',
  'eletrobombas': 'eletrobomba',
  'espalhador': 'espalhador',
  'filtro-de-fiapos': 'filtro',
  'interruptores': 'interruptor',
  'mangueiras-lavadora': 'mangueira',
  'microchave': 'microchave',
  'molas-e-dobradicas-lavadoras': 'molas_dobradicas',
  'motor-ventilador': 'motor',
  'painel-decorativo': 'painel_decorativo',
  'paineis': 'painel',
  'pe-nivelador-lavadora': 'pe_nivelador',
  'pecas': 'outros',
  'pecas-tanquinho': 'tanquinho',
  'placas-para-lavadora': 'placa',
  'polias': 'polia',
  'pressostatos': 'pressostato',
  'puxadores': 'puxador',
  'recipiente': 'recipiente',
  'rele': 'rele',
  'retentores': 'retentor',
  'rolamentos': 'rolamento',
  'sensores-lavadora': 'sensor',
  'suportes': 'suporte',
  'tampas': 'tampa',
  'transmissao': 'mecanismo',
  'valvulas-lavadoras': 'valvula',
}

// extrai numero final do slug da URL (id interno BCM)
function idFromURL(url) {
  if (!url) return ''
  const m = url.match(/-(\d+)\.html?$/i)
  return m ? m[1] : ''
}

// ============================================================
// gera ALTER TABLE
// ============================================================
const sqlAlter = `-- ============================================================================
-- Schema: adiciona 5 colunas em 'peca' pra estrutura BCM (v2)
-- Geraco em ${new Date().toISOString().slice(0, 10)}
-- modelos_compativeis ja entra como text[] (ARRAY) — front trata como array.
-- Se a coluna ja existir como text e voce quiser migrar, rode na mao:
--   ALTER TABLE peca
--     ALTER COLUMN modelos_compativeis TYPE text[]
--     USING string_to_array(regexp_replace(modelos_compativeis, '\\s*[,/\\n;]\\s*', '|', 'g'), '|');
-- ============================================================================

BEGIN;

ALTER TABLE peca
  ADD COLUMN IF NOT EXISTS marca               text,
  ADD COLUMN IF NOT EXISTS tipo                text,
  ADD COLUMN IF NOT EXISTS referencia          text,
  ADD COLUMN IF NOT EXISTS modelo              text,
  ADD COLUMN IF NOT EXISTS modelos_compativeis text[];

-- indices uteis pra busca (modelo costuma ser codigo de fabricante pesquisado)
CREATE INDEX IF NOT EXISTS peca_modelo_idx     ON peca (modelo)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS peca_referencia_idx ON peca (referencia) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS peca_marca_idx      ON peca (marca)      WHERE deleted_at IS NULL;

COMMIT;
`
fs.mkdirSync(DIR_SQL, { recursive: true })
fs.writeFileSync(path.join(DIR_SQL, '02-peca-add-colunas.sql'), sqlAlter, 'utf8')
console.log('Gerado: sql/02-peca-add-colunas.sql')

// ============================================================
// gera IMPORTACAO
// ============================================================
const rows = parseCSV(fs.readFileSync(path.join(DIR_CSV, 'pecas_lavadora_BCM-LIMPO.csv'), 'utf8'), ';')

// header esperado: Loja, Nome Produto, Categoria, Marca, Tipo, Referencia, Modelo, Modelos Compativeis, Codigo Comercial, Descricao, URL
const inserts = []
const skusUsados = new Set()
let semCategoria = 0

for (let i = 1; i < rows.length; i++) {
  const r = rows[i]
  if (r.length < 11) continue
  const [_loja, nome, catBcm, marca, tipo, ref, modelo, compat, _codCom, desc, url] = r

  // mapeia categoria
  const catCanon = MAPA_CATEGORIA[catBcm.trim()] || 'outros'
  if (catCanon === 'outros' && !MAPA_CATEGORIA[catBcm.trim()]) semCategoria++

  // sku: prefere Referencia BCM; senao id da URL; senao slug+i
  let sku = clean(ref) || idFromURL(url) || `BCM-${String(i).padStart(4, '0')}`
  // garante unicidade adicionando sufixo se ja usado
  let skuFinal = sku
  let n = 2
  while (skusUsados.has(skuFinal)) { skuFinal = `${sku}-${n}`; n++ }
  skusUsados.add(skuFinal)

  inserts.push(
    `INSERT INTO peca (nome, sku, descricao, categoria, marca, tipo, referencia, modelo, modelos_compativeis, fornecedor, qtd_atual, qtd_minima) VALUES (` +
    [
      sqlStr(clean(nome)),
      sqlStr(skuFinal),
      'NULL',
      sqlStr(catCanon),
      sqlStr(clean(marca)),
      sqlStr(clean(tipo)),
      sqlStr(clean(ref)),
      sqlStr(clean(modelo)),
      sqlArrayCompat(compat),
      'NULL',
      '0',
      '0',
    ].join(', ') + ');'
  )
}

const sqlImport = `-- ============================================================================
-- Importacao do catalogo BCM (680 pecas) como estoque base — v2
-- ATENCAO: Faz soft-delete de TODAS as pecas atuais (deleted_at = now())
-- Pra reverter (antes da proxima limpeza): rode antes do passo 1
--   SELECT max(criado_em) FROM peca;
-- e depois UPDATE peca SET deleted_at = NULL WHERE criado_em <= '<aquele timestamp>';
--
-- Pre-requisito: rodar 02-peca-add-colunas.sql ANTES (cria modelos_compativeis text[]).
-- Diferencas pro v1:
--   - modelos_compativeis entra como ARRAY literal ('{...}'), nao string
--   - fornecedor = NULL (catalogo base; definido na 1a compra real)
--   - descricao = NULL (nome ja descreve)
-- Geraco em ${new Date().toISOString().slice(0, 10)}
-- ${inserts.length} inserts | ${semCategoria} categorias BCM caem em 'outros' (sem mapeamento)
-- ============================================================================

BEGIN;

-- 1) soft-delete das pecas atuais (preservadas no banco, so escondidas)
UPDATE peca SET deleted_at = now() WHERE deleted_at IS NULL;

-- 2) importa 680 pecas do BCM
${inserts.join('\n')}

COMMIT;
`
fs.writeFileSync(path.join(DIR_SQL, '03-peca-importar-bcm.sql'), sqlImport, 'utf8')
console.log(`Gerado: sql/03-peca-importar-bcm.sql (${inserts.length} INSERTs)`)
console.log(`\nResumo:`)
console.log(`  Pecas: ${inserts.length}`)
console.log(`  SKUs unicos: ${skusUsados.size}`)
console.log(`  Categorias BCM nao mapeadas (caem em 'outros'): ${semCategoria}`)
