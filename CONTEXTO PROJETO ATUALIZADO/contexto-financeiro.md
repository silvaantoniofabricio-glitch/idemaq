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
