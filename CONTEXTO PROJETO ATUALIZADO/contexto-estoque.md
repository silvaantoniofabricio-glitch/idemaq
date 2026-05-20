# Contexto — Estoque (Peças + Máquinas)

> Doc vivo do terminal `estoque`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

### Peças
- ✅ **Front 100% ligado ao Supabase (19/05/2026 noite)** via `usePecas({ categoria, busca })`
- ✅ **Filtros server-side**: `.eq('categoria')` + `.or('nome.ilike, sku.ilike, referencia.ilike')`
- ✅ Debounce 300ms
- ✅ Skeleton de 8 linhas no loading
- ✅ 2ª query light alimenta KPIs e contagem por categoria (refletem o snapshot global mesmo quando filtrado)
- ✅ NovaPecaModal salva via INSERT real com loading/erro inline
- ✅ **`PecaDetalheModal` com modo edição inline (19/05/2026)**:
  - Botão "Editar peça" alterna pra formulário (nome/SKU/fornecedor/qtds/custo/venda)
  - "Salvar" chama `salvarEdicaoPeca` em `Estoque.jsx` → `usePecas.atualizar` → UPDATE no Supabase
  - Patch enxuto: só envia campos que mudaram (`diffPatch`)
  - Estado da peça aberta atualiza pós-save (reflete fresh data sem fechar modal)
  - Loading "Salvando…" no botão + erro inline via toast
  - **Validações**: nome obrigatório, qtds ≥ 0, qtdMaxima ≥ qtdMinima, preços ≥ 0
  - **Visibilidade**: se `!mostraValores` (funcionário), campos de custo somem e não vão no patch
  - ESC/click-outside desabilitados em modo edição (evita perder digitação)
- ✅ PecaDetalheModal mostra "Especificação técnica" (marca/tipo/referência/modelo/modelos_compativeis) só quando preenchida
- ✅ **`modelos_compativeis` é `text[]` nativo no banco e no front**:
  - Hook envia/recebe array
  - NovaPecaModal converte CSV→array via `split(/[,/\n;]/)` com preview ao vivo dos chips
  - PecaDetalheModal renderiza array como chips coloridos com contador
- ✅ **Badge da categoria** cicla 4 cores Deutan (`#5B9BD5/#FFD966/#FF6B6B/#B8CCE4`) via hash determinístico do id — mesma paleta nos chips do filtro
- ✅ SELECT inclui `custo_medio`
- ✅ Catálogo base: **680 peças BCM** com `fornecedor = NULL` e `descricao = NULL`
- ✅ Nível "Catálogo" (badge cinza) p/ `qtd_minima=0` evita 680 peças BCM aparecerem como esgotadas

### Máquinas
- 🟡 Schema existe (`tabela maquina`), sem dados reais
- 🟡 UI mock (Módulo 07 do roadmap)

### Modais
- ✅ `PecaDetalheModal`: barra estoque mín/atual/máx + custos/preço/margem + histórico de movimentações
- ✅ `MaquinaDetalheModal`: breakdown de custo Compra/Itens/Serviço + itens da reforma + timeline
- ✅ Flag `mostraValores = isAdmin(user)` esconde preços pra papéis não-dono

---

## 2. Pendências

1. ~~**Commitar `03-peca-importar-v2.sql`** substituindo `sql/03-peca-importar-bcm.sql`~~ ✅ feito 20/05/2026 (gerado direto pelo script com `modelos_compativeis` como ARRAY literal)
2. ~~**UPDATE peça via modal de detalhe**~~ ✅ feito 19/05/2026
3. Ajuste manual de estoque (botão "Ajustar estoque" ainda toast)
4. **Baixa automática ao concluir OS** — sai na **Onda 2** junto com OS. TODO comentado em `PecaDetalheModal.jsx` + detalhe em `PENDENCIAS-ROTAS.md`. Cruza com OS (ver `contexto-os.md`)
5. Máquinas: ligar ao Supabase (Módulo 07)
6. Entrada por nota fiscal (futuro): upload PDF/foto/Excel → Claude API lê → revisão → salva
7. Edição de categoria/marca/tipo/referência/modelos compatíveis no modal (chat seguinte — hoje só identificação básica + qtds + preços)

---

## 3. Schema da tabela `peca`

### Identificação
- `id uuid` PK
- `sku` text (opcional — default 0)
- `nome` text
- `referencia` text
- `categoria` text (ver lista canônica abaixo)
- `marca`, `tipo`, `modelo` text
- `modelos_compativeis` **text[]** (ARRAY — convertido em 19/05/2026 via ALTER TABLE)
- `descricao` text (NULL nas 680 BCM)
- `fornecedor` text (NULL nas 680 BCM = catálogo base sem vínculo)

### Estoque
- `qtd_atual`, `qtd_minima`, `qtd_maxima` int
- `qtdMaxima` auto = `qtd_minima × 3` quando não informado
- Quantidades opcionais (default 0) no NovaPecaModal

### Financeiro
- `custo_minimo`, `custo_medio`, `custo_maximo`, `custo_atual` numeric
- `preco_venda` numeric
- % lucro derivado (calculado, não armazenado)

### Sistema
- Soft-delete: `deleted_at`, `excluido_por`
- Auditoria: `criado_em/por`, `atualizado_em/por`
- Índice `idx_peca_estoque_baixo` (alerta ao atingir mínimo)

---

## 4. Categorias de peça (lista canônica)

Lista em `src/utils/categoriasPeca.js` — **espelha o checklist do AcaoDiagnostico** pra técnico encontrar peças do tipo certo.

### 6 grupos
- **motor**
- **água**
- **elétrico**
- **estrutura**
- **externo** (capa/filtro/tampa — não estão no diagnóstico)
- **outros**

**Ao adicionar categoria**, refletir em 3 lugares:
1. `src/utils/categoriasPeca.js` (canonical)
2. `src/components/osDetalhe/RelatorioDiagnostico.jsx` (mapa `ITENS_DIAG`)
3. `src/components/osDetalhe/acoes/AcaoDiagnostico.jsx` (constante `GRUPOS`)

### Cadastro
- `NovaPecaModal` tem campo obrigatório de categoria com `<optgroup>` por grupo
- SKU e quantidades opcionais (default 0)

---

## 5. Importação BCM (histórico)

**680 peças** do catálogo BCM importadas em 19/05/2026 noite. Schema base:
- 5 colunas novas adicionadas (marca/tipo/referência/modelo/modelos_compativeis)
- 41 categorias originais consolidadas em 36 finais
- `fornecedor = NULL` (catálogo base, sem vínculo; preenchido na 1ª compra real)
- `descricao = NULL` (nome já descreve)
- `modelos_compativeis` como ARRAY (`text[]`) desde o INSERT

**SQLs versionados (v2, 20/05/2026)** — substituíram a versão "v1 + ALTER manual" que rodou na prática em 19/05:
- `sql/02-peca-add-colunas.sql` — cria `modelos_compativeis` direto como `text[]`. Inclui comentário com `ALTER COLUMN ... USING string_to_array(...)` caso alguém precise migrar uma base que ainda tenha como `text`.
- `sql/03-peca-importar-bcm.sql` — 680 INSERTs com `modelos_compativeis` em literal de array Postgres (`'{"M1","M2",...}'`) em vez de string CSV; `fornecedor` e `descricao` agora NULL.
- Gerados por `scripts/gerar-sql-importar-bcm.mjs` a partir de `RELATORIO OUTRAS LOJAS/pecas_lavadora_BCM-LIMPO.csv`. Pra regerar: `node scripts/gerar-sql-importar-bcm.mjs`.

---

## 6. Schema da tabela `maquina`

- `id uuid` PK
- `cliente_id uuid` FK (NULL = máquina do estoque, sem dono ainda)
- `estado` enum `maquina_estado`: `do_cliente | disponivel | em_revisao | vendida`
- Custos: `custo_compra`, `custo_itens`, `custo_servico` (somam pro custo total)
- Soft-delete + auditoria

**Custo total** = `custo_compra` + `custo_itens` + `custo_servico` (calculado).

Máquina entra no estoque com custo total ao concluir OS de Fabricação.

---

## 7. Visibilidade por papel — Estoque

`mostraValores = isAdmin(user)` esconde do funcionário:
- Custo
- Lucro/Margem
- Valor em peças
- Capital parado
- Composição do custo
- Custo un./Total da tabela de itens

**Funcionário vê só**: Qtd · Venda · Status.

Aplicado em: `pages/Estoque.jsx` + `PecaDetalheModal` + `MaquinaDetalheModal`.

RLS no banco também protege os dados sensíveis (defesa em camadas).

---

## 8. Hook `usePecas`

`usePecas({ categoria, busca })` em `src/hooks/usePecas.js`.

- Aceita filtros como argumentos → fetch server-side
- Debounce 300ms (no consumer)
- Mapeia snake_case ↔ camelCase via `dbToUi`/`uiToDb`
- CRUD: `criar` ✅, `atualizar` ✅ (consumido pelo `PecaDetalheModal`), `excluir` (soft) ✅
- `atualizar(id, patch)` aceita patch parcial em camelCase, retorna `{ data, error }` com a linha atualizada
- 2ª query light separada pra KPIs/contagem global (não afetada pelo filtro)
- Trata `modelos_compativeis` como array

---

## 9. Baixa automática ao concluir OS (pendente)

Lógica futura:
1. OS chega em `Concluído`
2. Itens com `tipo = item` (não serviço/taxa) → decrementa `qtd_atual` da peça
3. Registrar movimentação no histórico
4. Disparar alerta se `qtd_atual <= qtd_minima`

Cruza com OS — ver `contexto-os.md`. Detalhe operacional + cuidados de idempotência em `PENDENCIAS-ROTAS.md`. TODO comentado em `src/components/estoque/PecaDetalheModal.jsx` (perto da definição de `sectionLabel`).

---

## 10. Entrada por nota fiscal (futuro)

Upload PDF/foto/Excel/CSV/texto → Claude API lê → revisão manual → salva.

Cruza com Relatórios IA — ver `contexto-relatorios.md`.

---

## 11. Interseções com outras áreas

- **OS**: categorias de peça espelham `ITENS_DIAG` no diagnóstico. Baixa automática ao concluir OS. Ver `contexto-os.md`
- **Financeiro**: custo de peça vai compor custo da OS, base do DRE. Ver `contexto-financeiro.md`
- **Relatórios**: relatório de Estoque (consumo, ponto de pedido). Ver `contexto-relatorios.md`
- **Geral / cross-area**: import scripts ficam em `scripts/`. SQL em `sql/`. Ver `contexto-geral.md`
