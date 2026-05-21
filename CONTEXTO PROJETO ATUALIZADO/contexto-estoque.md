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
- ✅ **`PecaDetalheModal` com modo edição inline (19/05/2026 → bug fix Onda 3 em 20/05/2026)**:
  - **Bug em prod**: o botão "Editar peça" estava como **stub** mostrando toast "Módulo 06 chat 1" e não abria nada. Fix Onda 3 (20/05): trocou stub pelo form real que persiste via `usePecas.atualizar`.
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
- ✅ `PecaDetalheModal`: barra estoque mín/atual/máx + custos/preço/margem + **histórico real** (peca_movimentacao, últimos 20) + botão "Ajustar estoque" → `AjusteEstoqueModal`
- ✅ `AjusteEstoqueModal` (20/05/2026): ajuste manual de `qtd_atual` com motivo (contagem/perda/ganho/devolução/outro) + observação + preview do delta (ver §12)
- ✅ `MaquinaDetalheModal`: breakdown de custo Compra/Itens/Serviço + itens da reforma + timeline
- ✅ Flag `mostraValores = isAdmin(user)` esconde preços pra papéis não-dono e oculta o botão "Ajustar estoque" (funcionário não ajusta)

---

## 2. Pendências

1. ~~**Commitar `03-peca-importar-v2.sql`** substituindo `sql/03-peca-importar-bcm.sql`~~ ✅ feito 20/05/2026 (gerado direto pelo script com `modelos_compativeis` como ARRAY literal)
2. ~~**UPDATE peça via modal de detalhe**~~ ✅ feito 19/05/2026
3. ~~**Ajuste manual de estoque**~~ ✅ feito 20/05/2026 (AjusteEstoqueModal + `usePecas.ajustarEstoque`; histórico real depende da tabela `peca_movimentacao` — ver §12)
4. ~~**Baixa automática ao concluir OS**~~ ✅ feito 20/05/2026 (client-side, match por nome ILIKE; ver §9). Idempotência via `peca_movimentacao` fica pra próxima onda.
5. Máquinas: ligar ao Supabase (Módulo 07)
6. Entrada por nota fiscal (futuro): upload PDF/foto/Excel → Claude API lê → revisão → salva
7. Edição de categoria/marca/tipo/referência/modelos compatíveis no modal (chat seguinte — hoje só identificação básica + qtds + preços)
8. ~~Criar tabela `peca_movimentacao`~~ ✅ feito 20/05/2026 (sql/11 + INSERTs no `ajustarEstoque` e `baixarItensDaOS` + histórico real no PecaDetalheModal — ver §12). **Pendente Toni rodar `sql/11-peca-movimentacao.sql` no Supabase SQL Editor** pra ativar (até lá, INSERTs são silenciados com 42P01 e o histórico mostra empty state "habilitar via sql/11").

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
- `ajustarEstoque(pecaId, { qtdNova, motivo, observacao })` ✅ (20/05/2026): UPDATE `qtd_atual` + INSERT em `peca_movimentacao` (tipo=`ajuste_manual`) — ver §12
- `baixarItens(osId)` wrapper sobre `baixarItensDaOS` que dispara refetch após sucesso
- Export named `baixarItensDaOS(osId)` standalone (usado pelo `useOS.js` sem precisar instanciar o hook) — idempotente via flag `os.itens_baixados`; também grava `peca_movimentacao` com `tipo='baixa_os'` por peça baixada
- Helper `logMovimentacao({...})` standalone que silencia 42P01/PGRST205 (compat com bases sem sql/11)
- 2ª query light separada pra KPIs/contagem global (não afetada pelo filtro)
- Trata `modelos_compativeis` como array

---

## 9. Baixa automática ao concluir OS (20/05/2026)

Implementação client-side com **idempotência real via flag no banco**:

- **Schema (`sql/07-os-itens-baixados.sql`)** — ✅ **APLICADO em 20/05/2026** (sessão `geral`):
  - `os.itens_baixados boolean NOT NULL DEFAULT false` — flag de "estoque já debitou"
  - `os_item.peca_id uuid REFERENCES peca(id)` — FK opcional pra peça do catálogo; NULL = item avulso (texto livre), ignorado na baixa
  - Index parcial em `os_item.peca_id WHERE deleted_at IS NULL`
  - Verificador: `node scripts/verificar-sql-07.mjs`

- **`usePecas.js`** — exporta `baixarItensDaOS(osId)` standalone + `usePecas().baixarItens(osId)` wrapper (faz `fetchPecas` no fim). Fluxo:
  1. **Claim atômico**: `UPDATE os SET itens_baixados=true WHERE id=$1 AND itens_baixados=false RETURNING id, numero`. Se nada casou → outro side já baixou → `{ ja_baixado: true }`, sai sem mexer em estoque.
  2. SELECT `os_item` da OS com `peca_id IS NOT NULL` (Onda 4 removeu coluna `tipo`; discriminação peça×serviço agora é só por `peca_id`).
  3. Pra cada item: SELECT da peça pelo id + UPDATE `qtd_atual = max(0, qtd_atual - quantidade)` (nunca negativo; coluna é `quantidade`, não `qtd`).
  4. Retorna `{ ok, ja_baixado, aplicadas, erros, osId, osNumero, motivo? }`
  - Se schema 07 ainda não rodou: detecta `42703` ou `PGRST204`, loga `"rode sql/07..."` e retorna `{ ok:false, motivo:'schema-pendente:sql/07' }` sem quebrar.

- **`useOS.js`** — `updateOS` detecta transição `etapa !== 'concluido' → 'concluido'` e, após o UPDATE bem-sucedido, dispara fire-and-forget `baixarEstoqueAoConcluir(osId, osNumero)` (helper local que chama `baixarItensDaOS` e loga). Best-effort: erros vão pro console, não travam o avanço do Kanban.

**Itens avulsos**: peça digitada manualmente no orçamento (sem vínculo com catálogo) tem `peca_id = NULL` e **não mexe no estoque**. Quando o orçamento ganhar dropdown do catálogo, a baixa passa a ser automática pra esses itens também.

**Garantia e Fabricação**: dão baixa normal — peça saiu do estoque independente de cobrar do cliente ou destinar pra revenda.

**Race / re-conclusão**: a flag `os.itens_baixados` é claim-once. Drag duplicado, 2 dispositivos concorrentes, ou reabrir+concluir de novo: tudo cobre — só roda uma vez por OS na vida.

**Pendentes**:
- ~~Tabela `peca_movimentacao`~~ ✅ feito 20/05/2026 (sql/11; pendente apenas Toni rodar no Supabase — ver §12)
- Dropdown de peças no orçamento (`AcaoOrcamento`) pra preencher `peca_id` automaticamente

Cruza com OS — ver `contexto-os.md`. Detalhe operacional + cuidados em `PENDENCIAS-ROTAS.md`.

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

---

## 12. Ajuste manual de estoque (20/05/2026)

Caso de uso: contagem mensal acha divergência, peça quebrada no manuseio, devolução de cliente, sobra encontrada na prateleira — corrige `qtd_atual` sem precisar abrir OS.

- **Componente**: `src/components/estoque/AjusteEstoqueModal.jsx`
  - Aberto pelo botão "Ajustar estoque" do `PecaDetalheModal` (antes era stub com toast)
  - Mostra qtd atual read-only + Input "Nova quantidade" + Select "Motivo" + Textarea "Observação" + preview `qtdAtual → qtdNova · delta (motivo)`
  - Motivos canônicos: `contagem | perda | ganho | devolucao | outro`
  - Validação: `qtdNova >= 0`, inteiro, diferente da atual (delta=0 não salva)
  - Botão fica `disabled` enquanto `salvando` ou inválido; ESC e click-fora desabilitados durante save

- **Hook**: `usePecas.ajustarEstoque(pecaId, { qtdNova, motivo, observacao })`
  1. SELECT atual da peça (`qtd_atual`) — confere delta contra o banco, não só contra o que a UI tinha
  2. UPDATE `peca SET qtd_atual = nova` (saneado: `max(0, trunc(N))`)
  3. `console.log('[ajusteEstoque]', { pecaId, nome, qtd_antes, qtd_depois, delta, motivo, observacao })` — rastro durante a fase sem histórico real
  4. Refetcha lista; retorna `{ data: dbToUi(row), error }`

- **Visibilidade**: botão "Ajustar estoque" só aparece quando `mostraValores = isAdmin(user)`. Funcionário não ajusta — só vê. RLS no banco reforça (defesa em 3 camadas, igual aos custos do estoque).

- **Histórico real (20/05/2026)**: `sql/11-peca-movimentacao.sql` cria a tabela `peca_movimentacao(id, peca_id, tipo, delta, qtd_antes, qtd_depois, motivo, observacao, os_id?, auditoria padrão)`.
  - `tipo` é CHECK em `'baixa_os' | 'ajuste_manual' | 'entrada_compra' | 'devolucao'`
  - `delta = qtd_depois - qtd_antes` (positivo entrada, negativo saída)
  - `motivo` livre — convenção pra `ajuste_manual`: `contagem | perda | ganho | devolucao | outro`
  - Index `(peca_id, criado_em DESC)` pro lookup do histórico no modal
  - RLS: `SELECT` pra authenticated, `INSERT/UPDATE/DELETE` só pra dono via `is_dono()`
  - Sem trigger AFTER em `peca` — o INSERT acontece no front pra carregar contexto (`os_id`, `motivo`, `observacao`). Quem garante "não duplica" é o claim de `os.itens_baixados` em `baixarItensDaOS` (sql/07)
- **Onde grava** (helper `logMovimentacao` em `usePecas.js`):
  - `ajustarEstoque` → INSERT `tipo='ajuste_manual'` + motivo + observação
  - `baixarItensDaOS` → INSERT `tipo='baixa_os'` por peça baixada + `os_id` preenchido + observação `"OS #${numero}"`
  - Best-effort: se `sql/11` não rodou, detecta 42P01/PGRST205 e ignora — UPDATE em peca continua valendo
- **Histórico no PecaDetalheModal**: hook local `useHistoricoPeca(pecaId)` faz `select id, tipo, delta, qtd_antes, qtd_depois, motivo, observacao, os_id, criado_em from peca_movimentacao where peca_id=$ and deleted_at is null order by criado_em desc limit 20`. Substitui o mock antigo. Render: ícone por tipo + label (com motivo entre parênteses pra ajuste manual) + data + saldo (`qtd_depois`) + observação + delta. Estados: skeleton 3 linhas (loading), empty state suave (`Sem movimentações registradas`), empty state com link pro SQL 11 (schemaPendente=42P01), erro inline (outros erros).
- **Futuro**: `entrada_compra` (entrada por nota fiscal/compra) ainda não grava nada — depende do módulo de NF que vai aterrissar peças no estoque. `devolucao` é o caminho oposto ao `baixa_os` (cliente devolve peça).
