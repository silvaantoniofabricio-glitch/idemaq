# Contexto — Financeiro

> Doc vivo do terminal `financeiro`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

🟢 **Real ponta a ponta** (19-20/05/2026 — SQL 01 v2 APLICADO + hook real + 8 lançamentos seed).

**Histórico do bug (resolvido)**: em 19/05 noite, UI mostrava ZERO lançamentos em todos filtros. Causa raiz confirmada via `scripts/probe-financeiro.mjs`:
- A tabela `lancamento_financeiro` JÁ existia em prod com **schema antigo v1** (FK `categoria_id`, `data_vencimento`, `data_pagamento`, enums).
- O hook usa **schema v2** (categoria text livre, `vencimento`/`pago_em`, `taxa_pct`, sem enums).
- SELECT falhava com `42703 column "vencimento" does not exist`.

**Fix aplicado e confirmado (20/05/2026)**: `sql/01-lancamento-financeiro.sql` virou MIGRAÇÃO FORÇADA — DROP CASCADE das 3 tabelas antigas + 4 enums + recriação no schema v2 + SEED de 8 lançamentos (3 a receber, 2 a pagar, 3 caixa). **SQL rodado no Supabase**, UI passou a ler dados reais. `probe-financeiro.mjs` re-rodado confirma schema v2 + 8 linhas. Banner amarelo "Schema parte 2 ainda não aplicado" não aparece mais.

🟢 **`src/utils/financeiro.js` criado (19/05/2026)** — exporta `calcularD1Util()`, `calcularD1UtilISO()`, `ehFeriadoBancario()`, `ehFimDeSemana()`. Pronto pra ser consumido pela integração OS→Financeiro (taxa da maquininha em D+1 útil automática).

### Decisões de negócio confirmadas (20/05/2026)
- ✅ **A Receber**: gerado ao concluir Entrega (receita real, não prevista no orçamento)
- ✅ **Caixa automático**: ao confirmar pagamento na OS, gera entrada no Caixa direto
- ✅ **Pagamento misto**: N lançamentos separados (1 por forma de pagamento)
- ✅ **Taxa da maquininha**: despesa automática em D+1 útil (pula FDS + feriados)

### Refatoração do hook (20/05/2026 noite)

**Schema esperado** da tabela `lancamento_financeiro`:
```
id uuid · tipo text ('receita'|'despesa') · valor numeric
conta_id uuid FK conta_bancaria · categoria text · descricao text
vencimento date · pago_em date|null · taxa_pct numeric
forma_pagamento text · os_id uuid|null · deleted_at timestamptz
```

`categoria` virou **text livre** (não FK pra `categoria_financeira`). Status implícito em `pago_em IS NULL`. `taxa_pct` por lançamento (preparado pra taxa da maquininha).

**`src/hooks/useFinanceiro.js`** ([commit pendente]):
- **Filtros server-side**: `{ tipo?, conta_id?, status?: 'pago'|'aberto', dataInicio?, dataFim? }` → traduzidos pra `.eq/.is/.not/.gte/.lte` no SELECT.
- **Mock embutido** (10 a receber + 8 a pagar + 10 caixa) no MESMO shape do banco — fallback automático quando `SQLSTATE 42P01` (tabela não existe). Sinaliza `tabelaAusente: true`.
- **Join lateral** `conta:conta_id (id, nome, tipo)` evita 2ª round-trip.
- **CRUD**: `criar / darBaixa / excluir`. Em modo demo (tabelaAusente), retornam `{ error: { code: 'OFFLINE' } }` pra UI cair no comportamento in-memory.
- **`darBaixa(id, { pago_em?, forma_pagamento?, taxa_pct?, conta_id? })`** — `pago_em` defaulta pra hoje, taxa pode mudar na baixa.
- **Exporta `CATEGORIAS_SUGESTAO`** (receita/despesa) como autocomplete pros selects da página.

**`src/pages/Financeiro.jsx`** ([commit pendente]):
- Mocks `A_RECEBER_MOCK/A_PAGAR_MOCK/CAIXA_MOCK` REMOVIDOS — agora vem do hook.
- Adapter `adaptarBancoParaUI` atualizado pro novo shape: `vencimento`, `pago_em`, `categoria` text, `taxa_pct`, `forma_enum`.
- Helper `labelForma` (enum → label amigável: `pix` → "PIX", `credito_1x` → "Cartão 1x").
- `useEffect` sincroniza state local SEMPRE (real ou mock) — split por tipo/`pago_em`.
- Lista de contas do dropdown vem dinamicamente de `contasReais` do hook.
- `baixarReceber/baixarPagar`: em real chama `darBaixa({ forma_pagamento, taxa_pct })`; em demo, optimistic local (move item de receber/pagar pro caixa).

### O que está pronto (UI)
- Barra de filtros horizontal: período (5 presets + custom) · chips de status · busca · categoria · conta bancária · Limpar
- **Calendário no filtro**: `<input type="month">` mês específico OU dois `<input type="date">` intervalo livre; presets desativam quando custom selecionado
- KPI strip compacta: Total · Vencidas · Hoje · Pago
- Tabela real com colunas ordenáveis + checkbox por linha + menu ⋯ (Receber/Pagar · Editar · Duplicar · Excluir)
- Bulk action bar flutuante pra recebimento/pagamento em lote
- **Caixa**: saldo running por linha
- Tabs com badge contador
- `LancamentoDetalheModal` (3 tipos: receber/pagar/caixa) com baixa/excluir e **confirmação anti-clique-acidental** ([Voltar] no rodapé)
- Visão geral
- **Banner amarelo discreto** "Schema parte 2 ainda não aplicado" quando `tabelaAusente: true` — some sozinho quando o SQL roda

### O que falta
- ~~Toni rodar `sql/01-lancamento-financeiro.sql`~~ ✅ **feito 20/05/2026** (8 lançamentos seed confirmados)
- ✅ ~~`LancamentoDetalheModal` edição inline~~ — **feito em 20/05/2026** (sessão `geral`). Botão Editar troca body do modal por form pré-preenchido (valor/vencimento/categoria/descrição/conta/forma/taxa). `useFinanceiro.atualizar(id, patch)` exposto pelo hook (whitelist em CAMPOS_EDITAVEIS — não sobrescreve null em campos ausentes). Caixa permanece read-only por regra (Editar só aparece em A Receber/A Pagar).
- ✅ ~~`NovoLancamentoModal` (avulso)~~ — **feito em 20/05/2026** (sessão `geral`).
- ✅ ~~`NovoLancamentoModal` parcelado/recorrente~~ — **feito em 20/05/2026** (sessão `financeiro`). 3 modos via toggle no topo (Avulso/Parcelado/Recorrente):
  - **Parcelado**: 2-12x, intervalo em dias (default 30), valor total dividido por N (resíduo de centavos vai na última parcela). Descrição vira "X — 1/N", "X — 2/N", etc.
  - **Recorrente**: 2-24x, intervalo `mensal` (mesmo dia do mês via `setMonth(+i)`, JS rola se dia inexistente) OU `customizado` em N dias. Valor é por linha, não dividido.
  - **Preview inline** sticky no modal: lista compacta (idx/total · DD/MM · descrição · R$) com scroll + total no header. Atualiza em real-time conforme usuário muda parâmetros.
  - **Persistência**: `Promise.all` de N chamadas `useFinanceiro.criar()`. Toast no fim: "8 parcelas criadas — X" ou "12 lançamentos criados — X". Falha parcial → toast informa "N/M falharam, alguns foram salvos".
  - **Limitação conhecida**: cron-like — intervalo em dias NÃO considera FDS/feriado (diferente de `calcularD1Util` da taxa OS→Financeiro). Banner inline avisa o usuário. Se virar requisito, vira flag opcional depois.
- ✅ ~~`utils/financeiro.js` (`calcularD1Util` + `ehFeriadoBancario`)~~ — **feito** (19/05/2026)
- ✅ ~~**Integração OS → Financeiro**~~ — **plugada em 20/05/2026** (sessão `geral`). `src/utils/osToFinanceiro.js` monta+persiste lançamentos a partir de `{ valor, forma, taxa_pct, parcelasAPrazo }`. Chamado de `AcaoPagamento.handleConfirmar` e `PagamentoTab.handleConfirmarPagamento`. Regra: à vista cria receita pago no Caixa + despesa de taxa em D+1 útil (se taxa>0); a prazo cria N receitas em aberto, 1 por parcela. Lookup de `conta_id` por nome (PIX→Mercado Pago, Cartão/Link→InfinitePay, Dinheiro→Cresol). `FormRecebimento.onConfirmar` ganhou campo `taxa_pct` no payload pra propagar a taxa calculada internamente.

### Diagnóstico (script reutilizável)

`scripts/probe-financeiro.mjs` consulta a base usando a publishable key e mostra qual schema (v1 ou v2) está em vigor. Rodar `node scripts/probe-financeiro.mjs` antes de codar mudanças no financeiro pra evitar surpresa de drift entre código e banco.

---

## 1c. View `vw_lancamentos_validos` + integração no hook (24/05/2026)

✅ Aplicado: criada view que espelha `lancamento_financeiro` (mesmas colunas) mas EXCLUI:
- Lançamentos com `deleted_at IS NOT NULL` (soft-delete normal)
- Lançamentos cujo `id` está em `lancamento_duplicata.id_duplicata` (duplicações marcadas via sql/29-35)

**SQL**: `sql/38-view-lancamentos-validos.sql`. Define `GRANT SELECT TO anon, authenticated` (RLS herda da tabela base via row-level inheritance).

**Hook modificado**: `src/hooks/useFinanceiro.js` lê de `vw_lancamentos_validos` em vez de `lancamento_financeiro`. Fallback automático pra tabela direta se a view não existir (graceful degradation). CRUD continua escrevendo na tabela base — views não aceitam INSERT/UPDATE.

**Impacto na UI**: Painel/DRE/Relatórios passam a mostrar números LÍQUIDOS automaticamente, sem duplicação de:
- Faturas de cartão pagas no Cresol (já lançadas em Bling-PAG)
- PIX pessoais (dízimo, esposa, intra-contas)
- Transferências Cresol1↔Cresol2 do próprio Toni
- Vendas em cartão duplicadas (BLING-REC + InfinitePay)

Total dedup: 719 lançamentos marcados. Receita ~R$ 572k (não 799k bruto), despesa ~R$ 579k (não 765k bruto), em 28 meses (~R$ 20k/mês cada).

## 1b. Importação Bling + Cresol (22/05/2026 madrugada — pendente Toni rodar)

3 SQLs gerados pra importação massiva do histórico financeiro:

- **`sql/20-bling-financeiro-import.sql`** (388 KB) — 680 receitas + 1235 despesas do Bling (contas_receber.csv + contas_pagar.csv). Cobertura: nov/2024 → abr/2026. Total: R$ 213k rec + R$ 203k pag. Conta nova `Caixa Bling` (separada do Cresol pra rastrear). Idempotente via tag `BLING-REC:<id>` ou `BLING-PAG:<id>` em descricao.
- **`sql/21-cresol-ofx-import.sql`** (53 KB) — 362 transações da Cresol conta 358510-7, jan/2024 → mai/2026. Dedupe via FITID. Categorização heurística por MEMO. R$ 99k receitas + R$ 80k despesas. Idempotente via tag `CRESOL-FITID:<id>`.
- **`sql/22-bling-os-import.sql`** (258 KB) — 535 OS retroativas + 1656 os_item. Faz matching DENTRO do SQL (RLS bloqueia probe anon key): JOIN cliente por telefone normalizado + LEFT JOIN os por TRELLO-CARD tag. UPDATE OS Trello existente OU INSERT nova OS retroativa em etapa `concluido`. Idempotente via tag `BLING-PEDIDO:<num>` em observacoes.

Scripts geradores em `scripts/gerar-sql-bling-financeiro.mjs`, `scripts/gerar-sql-ofx-cresol.mjs`, `scripts/gerar-sql-bling-os.mjs`. Re-rodam idempotente — sair com `.json` paralelo em `relatorios/` pra review.

**Instruções completas + reversão**: `relatorios/IMPORTACAO-BLING-CRESOL-README.md`.

## 2. Pendências (ordem)

1. ✅ ~~Rodar `sql/01-lancamento-financeiro.sql` no Supabase~~ — **feito 20/05/2026** (migração v1→v2 forçada + seed de 8 lançamentos)
2. ✅ ~~Criar hook `useFinanceiro`~~ — **feito** (refatorado 20/05/2026 pro schema esperado + filtros server-side + mock fallback)
3. ✅ ~~Ligar `FinanceiroPage` ao hook real~~ — **feito** (commit `12f9857` + refator 20/05/2026)
4. ✅ ~~Criar `src/utils/financeiro.js`~~ — **feito** (19/05/2026): `calcularD1Util`, `calcularD1UtilISO`, `ehFeriadoBancario`, `ehFimDeSemana`
5. ✅ ~~`LancamentoDetalheModal` edição inline~~ — feito 20/05/2026
6. ✅ ~~`NovoLancamentoModal` avulso~~ — feito 20/05/2026
7. ✅ ~~`NovoLancamentoModal` parcelado/recorrente~~ — feito 20/05/2026
8. ✅ ~~Integração OS → Financeiro~~ — feito 20/05/2026

---

## 3. Schema parte 2 — Financeiro (pendente aplicar)

SQL em `sql/01-lancamento-financeiro.sql` (**alinhado com o hook em 19/05/2026** — schema simplificado abaixo).

### Schema atual (sql/01)

O SQL agora bate exatamente com o que o hook consome:
- `categoria` é **text livre** (sem tabela `categoria_financeira`)
- `status` é derivado de `pago_em IS NULL`
- `tipo` text simples (`'receita'|'despesa'`)
- `taxa_pct numeric(6,3)` por lançamento (taxa da maquininha)
- `forma_pagamento` text livre (convenção de enum: `pix/dinheiro/debito/credito_1x/credito_parcelado/link_pagamento/boleto/transferencia/a_prazo`)
- Recorrência/parcelamento fora de escopo — tabela separada futura

O SQL usa `CREATE TABLE IF NOT EXISTS` + `DROP TRIGGER/POLICY IF EXISTS` pra ser idempotente. Pode ser colado direto no SQL Editor do Supabase sem medo de quebrar caso já tenha rodado antes.

### `lancamento_financeiro` (schema esperado pelo hook)
- `id uuid` PK
- `tipo text` ('receita'|'despesa')
- `valor numeric`
- `conta_id uuid` FK conta_bancaria
- `categoria text` (livre — sugestões em `CATEGORIAS_SUGESTAO` do hook)
- `descricao text`
- `vencimento date`
- `pago_em date|null`
- `taxa_pct numeric` (taxa da maquininha por lançamento, default 0)
- `forma_pagamento text` (enum por convenção)
- `os_id uuid|null` FK os
- Soft-delete (`deleted_at timestamptz` + `excluido_por uuid`) + auditoria padrão Idemaq
- Recorrência **fora de escopo do schema simplificado** — quando vier, usar tabela separada `lancamento_recorrencia` (decisão futura)

### `categoria_financeira`
- Receitas: Limpeza, Manutenção, Peças, Venda de máquinas, Taxa diagnóstico, Outros
- Despesas: Funcionários, Peças ML, Tráfego pago, Impostos, Financiamento, Luz/água/internet, Combustível, Ferramentas, Materiais de limpeza

### `conta_bancaria`
- Bancos: Cresol · Bradesco · Mercado Pago
- Cartões: Elo Grafite · Bradesco Visa · Mercado Pago · Bradesco PJ · Cresol · Nubank PJ · Inter

---

## 4. Padrão visual Bling-style (obrigatório)

Decisão do dono: páginas financeiras seguem padrão Bling, não estilo Conta Azul puro.

- **Filtros horizontais** no topo (não em sidebar)
- **KPI strip compacta** (não cards gigantes)
- **Tabela densa** (não cards grandes por linha)
- **Bulk action bar flutuante** quando há checkbox selecionado
- **Menu ⋯** por linha pra ações
- **Caixa com saldo running** por linha (não totais separados)

Aplica-se a: Visão geral, Receber, Pagar, Caixa.

---

### 4.5. Regra do D+1 útil (pula fins de semana E feriados)

**Regra confirmada com as maquininhas:**
- InfinitePay D+1: usa calendário de feriados bancários
- Ton Black D+1: vendas em feriados ou fins de semana são pagas no dia útil subsequente

**Exemplos:**
| Pagamento | Taxa cai |
|---|---|
| Segunda | Terça |
| Sexta | Segunda (pula sáb/dom) |
| Sábado | Segunda |
| Feriado quinta | Sexta (ou segunda se sexta for feriado) |

**Implementado em `src/utils/financeiro.js`** (19/05/2026). API exportada:

```javascript
import { calcularD1Util, calcularD1UtilISO, ehFeriadoBancario, ehFimDeSemana } from '../utils/financeiro'

calcularD1Util(new Date())         // → Date (objeto)
calcularD1UtilISO('2026-05-19')    // → '2026-05-20' (string ISO)
ehFeriadoBancario(new Date())      // → boolean
ehFimDeSemana(new Date())          // → boolean
```

`calcularD1Util` aceita `Date` ou ISO `'YYYY-MM-DD'`, soma +1 dia e itera enquanto for FDS ou feriado bancário (com guarda de 10 iterações). Não muta o input.

Feriados nacionais fixos atualmente cobertos (Lei 14.759/2023 inclusive): 01/01, 21/04, 01/05, 07/09, 12/10, 02/11, 15/11, **20/11 (Consciência Negra)**, 25/12. Feriados móveis (Carnaval, Sexta Santa, Corpus Christi) e municipais (06/11 Naviraí) ainda não — TODO Módulo 09 via tabela `configuracoes`.

**Versão futura (Módulo 09):**
- Ler feriados da tabela `configuracoes`
- Incluir feriados municipais de Naviraí (06/11 Aniversário da cidade)

---

## 5. Lançamentos — 3 tipos

### Avulso
- 1 lançamento individual
- Vence numa data específica
- Pode ser receita ou despesa

### Parcelado
- ID único por compra (`parcela_id`)
- Gera parcelas anteriores E futuras automaticamente
- Editar 1 parcela ≠ editar todas (decisão por parcela ou pelo grupo)

### Recorrente
- Dia configurável (`dia_recorrencia int`)
- Gera próximas mensalidades automaticamente
- Ex: luz/água/internet, salário fixo

---

## 6. Fluxo de baixa

```
Contas a receber → baixa → Caixa
Contas a pagar   → baixa → Caixa
```

- **Caixa = só movimentações confirmadas, sem edição**
- Caixa: só visualizar e excluir (sem editar lançamentos confirmados)
- Pra editar valor/data: tem que estornar a baixa antes

---

## 7. Maquininhas e taxas

### InfinitePay D+1 (padrão da casa)
- PIX: 0%
- Débito: 1,37%
- 1x: 3,15%
- 12x: 12,40%
- **Link 1x: 4,20%** ← sempre usar este pra links de pagamento

### Ton Black D+1
- Débito: 1,36%
- 1x: 3,14%
- 12x: 12,39%
- **Link Ton = 30 dias — NUNCA usar pra Idemaq** (inviável)

### Pagamento misto
- Permitido na mesma OS: PIX + cartão + a prazo
- Total lançado deve bater exatamente com total da OS
- Cartão: selecionar maquininha + modalidade (débito / 1x a 12x) → taxa calculada → valor líquido exibido

---

## 8. Inadimplência

Alertas configuráveis:
- D+1, D+5, D+15
- Depois: 5º e 10º dia útil de cada mês

Cliente inadimplente aparece no Painel (alertas críticos) e em Relatórios (Vendas/DRE).

---

## 9. Meta diária

- Dias úteis restantes (exclui fins de semana + feriados nacionais + municipais configuráveis)
- Naviraí/MS tem feriado municipal **06/11** (Aniversário da cidade) já pré-cadastrado

Cálculo: `(meta_mensal - faturado_no_mes) / dias_uteis_restantes`.

---

## 10. Serviços e preços

| Item | Compra | Venda |
|---|---|---|
| Limpeza | — | R$ 185 |
| Limpeza combinada (cada) | — | R$ 165 |
| Manutenção | — | R$ 185 |
| Taxa diagnóstico | — | R$ 30 |
| Máquina reformada | R$ 150 | R$ 650 |
| Capa | R$ 30 | R$ 85 |

---

## 11. Filtro calendário — regra do dono

- Padrão: mês atual
- Se alterado pelo usuário, retorna ao padrão em **1 hora**
- Subtítulo da página reflete período real

---

## 12. Visibilidade

**Financeiro é admin-only**:
- Menu (Sidebar.jsx + BottomNav.jsx) esconde de funcionário (constante `MENUS_ADMIN_ONLY`)
- Rota `/financeiro` envolvida em `<AdminOnly user={...}>` no `App.jsx` (desktop + mobile) → redireciona pro Painel se funcionário digitar URL na mão
- RLS no banco reforça (defesa em 3 camadas)

---

## 13. Interseções com outras áreas

- **OS**: pagamento da OS gera lançamento em `lancamento_financeiro`. A prazo → vai pra "Contas a receber" automaticamente. Ver `contexto-os.md`
- **Estoque**: custo de peça compõe custo da OS, base do DRE. Ver `contexto-estoque.md`
- **Relatórios**: DRE com IA (Claude API) consome `lancamento_financeiro`. Ver `contexto-relatorios.md`
- **Painel**: KPI de receita do mês + meta diária + alertas de inadimplência. Ver `contexto-painel.md`
- **Geral / cross-area**: schema parte 2 (rodar SQL 01). Ver `contexto-geral.md`

---

## 14. Fechamento maio/2026 + reset histórico (01/06/2026)

Sessão longa que limpou e refez todo o financeiro real maio/2026 + zerou o histórico não confiável.

### Decisão estratégica
Dados pré-maio/2026 eram imports automáticos de Bling/OFX/InfinitePay/TON, com qualidade duvidosa (Cresol aparecia em datas onde Toni ainda nem tinha conta; algumas contas estavam cadastradas erradas).

**Toni decidiu apagar todo lançamento financeiro de jan/2024 → abr/2026** e manter só:
- **Maio/2026**: revisado item a item (38 OS receitas + ~165 despesas)
- **Junho/2026**: 2 receitas a receber (Paula R$ 100, Sueli R$ 240)

### SQLs criados (sessão 01/06/2026)
- `sql/55` Cresol despesas maio (Alessandro 1650, Zion 250, empréstimo PJ 1421,71, Jane máquina 100, pacote 51,99)
- `sql/56` Mercado Pago despesas maio (cria conta MP, Guilherme 1650, Claude/Anthropic, ML, Junta)
- `sql/57` limpa lixo antigo (BLING-PAG sem pago_em + CRESOL1/2 maio)
- `sql/58` taxas faltantes TON Nelci+Hellen + InfinitePay Larissa+Solange
- `sql/59` Nubank despesas maio (cria conta Nubank, FleetNet + Energisa)
- `sql/60` Bradesco PJ despesas maio (cria conta, IOF + Eletro Garrincha + Tarifa MEI)
- `sql/61` migrou conta "Cresol 2 (40990-1)" → "Bradesco PJ" (cadastro errado original)
- `sql/62-66` faturas cartão item por item (Elo Grafite, Visa Bradesco, Inter, MP, Bradesco PJ Elo Mais, Nubank Emp+PF)
- `sql/68` água Sanesul venc 04/05 paga 01/06 (lançada pelo vencimento)
- `sql/69` SOFT-DELETE de tudo em jan/2025 → abr/2026
- `sql/70` SOFT-DELETE de tudo em 2024

### Contas bancárias finais cadastradas
- **Cresol** (138286-1) — aberta há ~2 meses, único Cresol real
- **Bradesco PJ** (40990-1)
- **Mercado Pago** (digital)
- **Nubank** (digital)
- **Inter** (digital)
- **Ton Black** (maquininha)
- **InfinitePay** (maquininha)

(Bradesco PF da 358510-7 não foi cadastrada porque Toni decidiu não rastrear PF nesse sistema)

### Total fechamento maio 2026
- Receitas: R$ 14.763 (40 lançamentos)
- Despesas: R$ 13.458 (145 lançamentos)
- A receber junho: R$ 340 (Paula 100 + Sueli 240)
- Resultado: ≈ R$ 1.305

### Mudanças UI da sessão
- **Novo relatório "Relatório Financeiro" em /relatorios** (`pages/relatorios/RelatorioFinanceiroMensal.jsx` + `useRelatorioFinanceiroMensal` em `useRelatorios.js`) — KPIs, gráficos por categoria/forma/conta, top 10 despesas, fluxo diário, comparativo mês anterior
- **Nova página `/financeiro-pf`** (admin-only) — Controle Financeiro PF separado da empresa. Dados estáticos em `src/data/controleFinanceiroPF.js` (136 itens maio). Dashboard + planilha + análise automática com conselhos
- **Kanban: filtro de 24h virou filtro mensal** (`hooks/useOS.js`) — OS concluída/recusada permanece visível até virar o mês, usa `data_conclusao || criado_em` como fallback (não `atualizado_em` que falseava imports)
- **Financeiro: aba "Visão geral" removida** — default agora abre em "A receber". KPIs do mês foram corrigidos pra filtrar pelo mês de referência (antes somavam o caixa inteiro do histórico).

### Regra: água Sanesul exemplo (não duplicar)
Conta venceu 04/05, paga 01/06 — lançada por **vencimento** (04/05). Quando vier o extrato Cresol junho, NÃO lançar de novo o débito R$ 199,27 de 01/06.

Mesmo princípio vale pra qualquer conta paga em mês diferente do vencimento.

---

## 15. Parcelamentos de cartão PJ — histórico + futuras (03/06/2026)

### O que foi feito
`sql/71-parcelas-anteriores-futuras.sql` — gerado e aplicado em 03/06/2026.

Para cada item parcelado das faturas de maio/2026 (sql/62-67), foram inseridas:
- **Parcelas passadas** (pagas): `pago_em = vencimento` → aparecem como saída de caixa nos meses anteriores
- **Parcelas futuras** (abertas): `pago_em = NULL` → ficam em "A Pagar" no mês correto
- A parcela de **maio** já estava nos sql/62-67 (prefixo `FAT-`); o sql/71 usa prefixo `PARC-` para distinguir

### Resultado (verificado)
| Cartão | Pagas | Futuras |
|---|---|---|
| Bradesco PJ Elo Mais | R$ 107,40 (1) | R$ 965,20 (9) |
| Elo Grafite | R$ 1.367,64 (26) | R$ 3.740,80 (49) |
| Inter | R$ 1.170,08 (6) | R$ 1.604,97 (7) |
| Mercado Pago | R$ 5.565,35 (124) | R$ 3.196,24 (85) |
| Visa Bradesco | R$ 430,59 (7) | R$ 239,61 (4) |
| **Total** | **R$ 8.641,06 (164)** | **R$ 9.746,82 (154)** |

### Regras usadas
- Vencimento de cada parcela = dia fixo do cartão (Elo Grafite=11, Visa=20, Inter=26, Brad.PJ Elo=10, MP=20)
- Valor de cada parcela = mesmo valor da parcela de maio (parcelas iguais — padrão Brasil)
- Parcelas do MP que remontam a 2024 foram inseridas mesmo com período apagado pelo sql/69+70 (reconstrução histórica intencional)
- Nubank: todos os itens eram à vista — sem parcelas anteriores/futuras

### Idempotência
SQL usa `WHERE NOT EXISTS` por `descricao`. Pode ser rerodado sem duplicar.

---

## 16. Página "Meu Contador" (10/07/2026)

Nova página admin-only `/meu-contador` (`src/pages/MeuContador.jsx`) — central fiscal/contábil no padrão Atlassian (mesmos primitivos inline de `Configuracoes.jsx`: `Panel`/`Btn`/`Field`).

**Seções:**
1. **Cartão do contador** — contato editável (nome, escritório, CRC, telefone, email, endereço, obs) + botões Ligar / WhatsApp / E-mail. Empty state quando vazio.
2. **Faturamento acumulado 12 meses (RBT12)** — dado REAL: soma `receita` de `vw_lancamentos_validos` (fallback `lancamento_financeiro`) dos últimos 12 meses vs limite do regime (MEI R$ 81k, Simples R$ 4,8M). Barra de progresso + alerta ≥ 80%.
3. **Obrigações fiscais** — geradas por regime (DAS-MEI/DASN pra MEI; DAS/DEFIS pra Simples) + FGTS/INSS se `tem_funcionarios`. Próximo vencimento calculado, "marcar pago" por competência.
4. **Checklist de documentos** do mês (extratos, NFs, comprovantes, folha, relatório).
5. **Exportar** — copiar resumo do mês (clipboard) + baixar CSV dos lançamentos do mês.
6. **Dados fiscais da empresa** — razão social, CNPJ, regime (select), CNAE, inscrições, abertura, tem_funcionarios.
7. **Links úteis** (Portal do Empreendedor, Simples Nacional, NFS-e Nacional, consulta CNPJ).

**Persistência**: `configuracoes` (chave/valor JSONB) via `useConfiguracoes` — chaves livres: `contador`, `empresa_fiscal`, `fiscal_pago_<YYYY-MM>`, `docs_contador_<YYYY-MM>`. Não precisa de novo SQL — funciona em modo demo (banner amarelo) se `sql/10` ainda não rodou.

**Regime default = MEI** (pista: "Tarifa MEI" nas despesas do sql/60). Tudo editável — card marca "confirme com seu contador".

**Registro (5 lugares)**: App.jsx (import + rota desktop/mobile em `<AdminOnly>`) · AppLayout.ROUTES · osData.MENUS + MENUS_MOBILE_DONO_EXTRA · Sidebar.MENUS_ADMIN_ONLY. Ícone `ti-calculator`, seção `operacao` (Gestão).

---

## 17. Arquivo mensal pro contador + split fiscal Mercadoria × Serviço (13/07/2026)

Toni pediu um arquivo mensal (entradas/saídas do mês anterior) pra declarar com o contador, no formato Excel mais comum (3 abas: Resumo/Entradas/Saídas). Gerado sob demanda via script Node (`xlsx` já é dependência do projeto) — **não** é uma feature da UI, é um processo manual que rodo quando pedido.

**Correção de dado real feita nessa sessão**: 41 lançamentos de receita tinham `categoria = 'Servico'` (sem acento) em vez de `'Manutenção'` — bug do lote de importação Trello (sql/49, 31/05/2026 madrugada). Corrigido via **`sql/139`** (aplicado em prod — 0 linhas restantes). Isso também limpava uma categoria fantasma no Painel/Relatórios/DRE, não só no arquivo do contador.

**Split fiscal Mercadoria × Serviço** (pedido do Toni — Simples Nacional tributa peça/mercadoria no Anexo I ~4%, serviço no Anexo III 6%+ISS; separar reduz imposto):
- Cada receita ligada a uma OS é **rateada** entre Serviço/Peça/Deslocamento proporcional ao valor de cada tipo em `os_item.categoria` (`servico`/`peca`/`desloc`) daquela OS.
- Receita sem item detalhado (OS antiga, lançamento avulso) cai 100% em Serviço (convenção — era o comportamento real do caso "Paula saldo restante").
- **`sql/138-view-lancamento-fiscal-split.sql`** (aplicada em prod 13/07/2026) automatiza esse rateio por lançamento: `vw_lancamento_fiscal_split` expõe `valor_peca`/`valor_desloc`/`valor_servico` por linha, com `valor_servico` calculado por **resíduo** (`valor - peca - desloc`) pra garantir soma exata sem sobra de centavo. Testada com junho/2026: bate com o rateio manual confirmado (`sql/137`, diagnóstico ad-hoc que rodou antes da view existir) a 1 centavo de arredondamento.
- Resultado junho/2026: Mercadoria R$ 4.954,80 · Serviço R$ 12.500,20 (mão de obra R$ 11.510,35 + deslocamento R$ 889,85 + avulso R$ 100).

**Pra gerar o arquivo de um mês**: script temporário (puxa `vw_lancamentos_validos` + `vw_lancamento_fiscal_split`, monta o `.xlsx` via lib `xlsx`, salva em `Arquivos Contador/` — pasta gitignored, tem PII de cliente) e descarta o script depois. Sem UI dedicada ainda — se Toni pedir com frequência, vira o botão sugerido na página Meu Contador (§16).

---

## 18. Categoria de receita "Limpeza" renomeada pra "Higienização" (29/07/2026)

Parte da troca geral de nome do serviço (pedido do Toni, ver `contexto-os.md` §27). `CATEGORIAS_RECEITA` (Financeiro.jsx) e `CATEGORIAS_SUGESTAO.receita` (useFinanceiro.js) agora mostram "Higienização" em vez de "Limpeza".

**Cuidado que tomei aqui por ser dado financeiro**: lançamento antigo continua salvo no banco com `categoria = 'Limpeza'` (decisão do Toni foi só mudar a interface, não migrar dado). Diferente do filtro de serviço da OS (que já usa regex tolerante), o filtro de categoria do Financeiro é comparação exata (`i.categoria === categoria`) — se eu só trocasse o rótulo, selecionar "Higienização" escondia todo o histórico de receita salvo como "Limpeza". Corrigido pra tratar as duas strings como equivalentes só quando "Higienização" está selecionado (linha ~991 de `Financeiro.jsx`). Lançamento NOVO criado por `NovoLancamentoModal` já nasce com `categoria = 'Higienização'`.

---

## 19. Calendário de vencimentos fixos (08/2026)

Levantado do histórico real de mai/jun/jul 2026 na revisão de fechamento. Vive em
`components/painel/CalendarioVencimentos.jsx` (widget do Painel) — **pra editar,
mexer só na lista `VENCIMENTOS_FIXOS` do topo do arquivo.**

| Dia | Compromisso | Dia | Compromisso |
|---|---|---|---|
| 02 | Fatura Nubank PF | 13 | Água (Sanesul) |
| 05 | Salários (Alessandro + Guilherme) | 14 | Contabilidade (Zion) |
| 05 | Pacote de serviços Cresol | 16 | Financiamento Civic |
| 06 | Parcela da casa | 20 | DAS / impostos |
| 07 | Energia | 20 | Faturas Neo Visa · Cresol Master · Mercado Pago |
| 10 | Internet (FleetNet) | 20 | Empréstimo Cresol PJ |
| 10 | Parcela Bradesco Elo Mais *(cancelado, quitando)* | 23 | Fatura Nubank Empresa |
| 11 | Fatura Elo Grafite | 25 | Fatura Inter |

**Dois widgets diferentes no Painel, não confundir:**
- `CalendarioVencimentos` — calendário **fixo**, sem valor, só lembrete. Não gera
  lançamento nem precisa de baixa; repete igual todo mês.
- `ProximosVencimentos` — contas a pagar **reais** (`lancamento_financeiro`,
  `pago_em IS NULL`), com valor, some quando paga.

**Sem valor de propósito**: os valores variam (contabilidade foi R$320→R$250,
salário do Guilherme saiu partido em 2 parcelas em julho) e fatura de cartão só
fecha perto do vencimento.

**Concentrações**: dias 5-7 (salários + casa + energia + tarifa) e dia 20
(quatro faturas + DAS + empréstimo no mesmo dia).

**Oscilações observadas**: Mercado Pago e empréstimo Cresol caíram dia 22 em
junho e dia 20 em julho — provável ajuste por dia útil (20/06 foi sábado). Inter
caiu 26 em maio (dia 25 foi domingo).

---

## 20. Regras firmadas no fechamento mai–jul/2026

**Fatura conta no mês do VENCIMENTO**, não no mês da compra. Confirmado pelo Toni
depois de uma confusão em que faturas ficaram deslocadas um mês. Corrigido em
`sql/169` (criou agosto/2026 no PF).

**Lançamento de cartão vai na conta do CARTÃO, não do banco.** Os scripts antigos
jogavam tudo em contas genéricas ('Bradesco PJ', 'Mercado Pago', 'Nubank'), o que
partia a mesma fatura em duas origens na tela. Corrigido em `sql/171` (Elo
Grafite, Neo Visa, Nubank PF/PJ) e `sql/172` (Mercado Pago). As contas certas já
existiam no seed `sql/01` sem uso.

**Maquininha é Ton, InfinitePay só pra link de pagamento** — `sql/146`,
`osToFinanceiro.js`.

**Natureza do gasto ≠ conta que pagou.** Casos reais: parcela do Civic é PF mas
sai da conta PJ; Carro BV é PJ mas saiu do banco pessoal da Rafa; Anthropic e
FleetNet são PJ mas passaram no cartão pessoal.

**Nomes do mesmo cartão divergem entre PF e PJ** ('Visa Bradesco' × 'Bradesco
Visa', 'Bradesco PJ ELO' × 'Bradesco PJ'). `ROTULO_ORIGEM` em
`ControleFinanceiroPF.jsx` unifica na exibição — a lista de origens agrupa pelo
rótulo, senão o mesmo cartão aparece duas vezes.

**Valor negativo não entra no PJ.** `lancamento_financeiro` tem
`CHECK (valor >= 0)` — estorno/crédito de fatura não pode ser lançado como
negativo (o INSERT falha com 23514 e derruba a transação toda). Isso vale só pro
PJ: o PF é array JS estático e já usa `categoria: 'Estorno'` com valor negativo.
Quando compra e devolução caem na **mesma** fatura, a saída é não lançar nenhuma
das duas — o líquido é zero. Caso real: `sql/183`, ML FrioLar R$ 202,89.

## 21. Fechamento de agosto/2026 — andamento

| Fatura | Venc. | Total | PF | PJ | Status |
|---|---|---|---|---|---|
| Elo Grafite (3558/5900/0615) | 11/08 | R$ 4.698,00 | R$ 3.988,77 (60) | R$ 709,23 (10) | ✅ conferida item a item contra o `.xls`, 70/70 batem |
| Mercado Pago (Visa 5566) | 20/08 | R$ 3.089,70 | R$ 224,97 (7) | R$ 2.661,84 (46) | ✅ `sql/183` aplicado 20/08 |
| eSocial competência 07/2026 | 20/08 | R$ 599,76 | — | R$ 599,76 | ✅ `sql/178` aplicado, PIX Cresol |

Fonte: `REVISAO FECHAMENTO 2026/AGOSTO/FATURAS/`.

Prefixo do PJ segue o do cartão, não o mês do vencimento: a Elo Grafite que vence
em 11/08 está como `FAT-ELO-GRAFITE-JUL:`, enquanto a do Mercado Pago que vence em
20/08 está como `FAT-MP-AGO:`. Conferir o `vencimento` antes de assumir pelo nome.

Pendente de confirmação do Toni (classifiquei como PJ/Peças pelo padrão dos meses
anteriores, mas sem comprovação): ML RankRank R$ 223,00, ML FilipeFlop R$ 78,00 e
MP MeliMais R$ 74,90 (essa em Software, por ser assinatura).
