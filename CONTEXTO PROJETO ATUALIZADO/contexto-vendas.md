# Contexto — Vendas (Histórico de OS)

> Doc vivo do terminal `vendas`. Página `/vendas` **online** desde 21/05/2026.
> Se mudou regra geral / status macro / interseção com outra área, atualizar
> também `CLAUDE.md`.

---

## 1. Status atual

🟢 **Onda 1 entregue (21/05/2026 madrugada — sessão noturna autônoma):**

- `src/pages/Vendas.jsx` — lista flat de todas as OS, KPIs no header (Faturado/OS no período/Ticket médio/A receber), barra de filtros horizontal **padrão Financeiro** (dropdown calendário + chips de tipo/status/pagamento + busca livre), tabela densa ordenável, click abre OSDetalhe via `useOSDetalheModal`
- `src/components/vendas/NovaOSAntigaModal.jsx` — modal pra registrar OS retroativa (cliente autocomplete via debounce + ILIKE, tipo, data, equipamento, valor/desconto/pago, forma, observações). Cria direto em etapa `concluido` + `data_conclusao` preenchida. **2 passos**: INSERT primeiro + UPDATE separado pra setar `criado_em` retroativo (trigger `tg_set_audit` sobrescreve no INSERT).
- `src/utils/osData.js` — `MENUS` ganhou item "Vendas" (`ti-receipt-2`, seção `principal`)
- `Sidebar.jsx` + `BottomNav.jsx` — `vendas` adicionado a `MENUS_ADMIN_ONLY` (defesa em 3 camadas)
- `App.jsx` — rota `/vendas` envolta em `<AdminOnly>` (desktop + mobile)
- `AppLayout.jsx` — `vendas: '/vendas'` no mapa `ROUTES` (link essencial pro menu lateral chamar `navigate`)

### Bug fixes pós-deploy (21/05 manhã):

| Bug | Causa | Fix |
|---|---|---|
| Click no menu "Vendas" não fazia nada | Faltou `vendas: '/vendas'` no mapa `ROUTES` de `AppLayout.jsx` — `setPagina('vendas')` consultava entrada `undefined` e `navigate` virava no-op silencioso | Adicionada a entrada. **Checklist pra páginas novas**: 5 lugares — `MENUS`, `Sidebar.MENUS_ADMIN_ONLY` (se admin-only), `BottomNav.MENUS_ADMIN_ONLY`, **`AppLayout.ROUTES`**, `App.jsx` `<Route>` |
| Erro `cannot add postgres_changes callbacks for realtime:os-changes after subscribe()` ao abrir /vendas | Duas instâncias de `useOS` na mesma página (Vendas chamava direto + `useOSDetalheModal` chamava interno) — ambas criavam `channel('os-changes')` com mesmo nome, Supabase JS proíbe | (1) `useOS` agora gera channel name único por instância (`os-changes-${rnd}`) — defesa em profundidade pra qualquer caso de 2 instâncias. (2) `useOSDetalheModal` aceita prop `buscando` e expõe `osList/osLoading/osRefetch` — Vendas usa só ele, sem chamar `useOS` separado. |

### Refator de filtros (21/05 manhã):

Inicialmente fui com chips de presets inline + 2 inputs date no header. Toni pediu **padrão idêntico ao Financeiro**:
- Botão único `[📅 Mês atual ▾]` com dropdown contendo presets (7d, 30d, mês atual, mês passado, ano, todos) + sessão "Personalizado" com 2 date pickers
- Chips de tipo + status + pagamento ao lado
- Busca livre no fim
- Helpers `PERIODOS`/`labelPeriodo`/`rangeDoPeriodo` copiados do Financeiro (objeto `{id}` ou `{id: 'custom', de, ate}`) — facilita unificar num helper compartilhado se outras páginas adotarem.

**Reuso**: `useOSDetalheModal({ buscando: true })` (bypassa filtro 24h), componentes UI da lib.

**Limitações conhecidas pro Toni testar**:
- Marca `origem_importacao` NÃO implementada ainda (essa coluna entra na Onda 2 junto com importação CSV)
- Não cria lançamento financeiro automático pra OS retroativa paga — Toni cria manualmente via NovoLancamentoModal se quiser. Futuro: checkbox "Criar lançamento de receita pago" no modal.

🔴 **Onda 2 (importação CSV) — ainda pendente** — depende de Toni exportar CSV de exemplo do Bling/Trello pra mapeamento de colunas.

## 1b. Importação retroativa Bling (22/05/2026 madrugada — pendente Toni rodar)

SQL gerado pra criar 535 OS retroativas a partir de `pedidos_venda.csv` do Bling.

- **`sql/22-bling-os-import.sql`** (258 KB, idempotente) — cruza com OS Trello existentes via tag `TRELLO-CARD:<id>` em `observacoes`. Pra OS Trello casada → UPDATE enriquece (valor_total, valor_pago, pago, forma_pagamento, cliente_id, desconto). Pra pedido Bling sem OS Trello → INSERT nova OS retroativa em `etapa=concluido` + `data_conclusao` da data do pedido.
- Match cliente por telefone normalizado (últimos 8-11 dígitos, ignora DDI 55) — JOIN dentro do SQL.
- 1656 `os_item` inseridos junto, todos com `peca_id=NULL` (item avulso, não baixa estoque).
- 21 pedidos sem URL Trello, 516 com URL — 96.6% potencial de cross-link.
- Idempotência via tag `BLING-PEDIDO:<num>` em observacoes. Re-rodar não duplica.
- Limitações: clientes com mesmo telefone podem casar errado; OS criadas sempre em `etapa=concluido` mesmo se forma=a_prazo (a parte "A Receber" vem do lançamento financeiro separado em sql/20).

Script gerador: `scripts/gerar-sql-bling-os.mjs`. Análise prévia: `relatorios/bling-pedidos-analise.json`.

---

## 2. Por que existe

O Kanban (`/os`) esconde OS concluídas/recusadas há > 24h por design — fica focado no fluxo do dia-a-dia. **Sem isso, não há tela pra consultar histórico** (OS de meses passados, garantia que venceu, cruzar lançamento com OS de origem, ver o que cliente já comprou).

Toni também tem ~80% dos dados históricos no **Trello + Bling** que ainda não estão no sistema. Precisa de uma forma de **importar retroativamente** pra usar o sistema como fonte única de verdade.

---

## 3. Decisões de arquitetura

### Nome: **Vendas**

Embora Idemaq tenha 3 tipos de OS (`atendimento`, `fabricacao`, `venda`), o mental model do Toni — e do Bling — é que **toda OS é uma "venda"** (serviço ou produto comprado pelo cliente). Nome contábil claro.

### Lugar: **Página nova `/vendas`** (não aba do Financeiro)

Mantém separação conceitual:
- `/os` (Kanban) → **operação atual** (drag-and-drop, ações rápidas)
- `/vendas` → **consulta histórica** (lista flat, filtros, importação)
- `/financeiro` → **dinheiro** (lançamentos)

Misturar com Financeiro confundiria — Financeiro é dinheiro entrando/saindo; Vendas é serviço/produto vendido.

### Visibilidade: **Admin-only** (defesa em 3 camadas)

Funcionário não vê valores/totais — não precisa do histórico financeiro. Aplicar igual ao Financeiro/Relatórios:
- `Sidebar.jsx` + `BottomNav.jsx`: adicionar `vendas` à `MENUS_ADMIN_ONLY`
- `App.jsx`: envolver `/vendas` em `<AdminOnly user={...}>`
- RLS no banco: já protegido (tabela `os` tem `is_dono()` em ações sensíveis)

---

## 4. Funcionalidades planejadas

### Lista principal (tabela densa, padrão Bling)

- Colunas: **nº · data · cliente · tipo · etapa · valor · forma_pag · status_pag**
- Ordenação por qualquer coluna
- Checkbox por linha + bulk actions (futuro: marcar como concluída em massa, etc)
- Click na linha → abre OSDetalhe via `useOSDetalheModal` (mesmo padrão da Logística — hook já existe em `src/hooks/useOSDetalheModal.js`)

### Filtros (chips + selects, padrão Financeiro)

- **Período**: presets (este mês / mês passado / ano / custom) — reusar helper `computeRange` de `useRelatorios.js`
- **Tipo**: chips Atendimento/Fabricação/Venda
- **Status**: chips Concluídas/Recusadas/Em andamento/Todas
- **Cliente**: autocomplete (debounce 250ms + ILIKE em `cliente.nome/telefone`, padrão NovaOSModal)
- **Pagamento**: chips Pago/Parcial/Não pago

### KPI strip topo

- Total faturado no período (sum `valor_total - desconto` das concluídas)
- Total de OS no período
- Ticket médio (faturado / nº concluídas)
- Pendente de pagamento (sum dos `valor_total - valor_pago` em aberto)

### Ações

- **+ Nova OS antiga** — modal pra registrar OS retroativa:
  - Cliente (autocomplete + criar inline igual NovaOSModal)
  - Tipo
  - Data original (`criado_em`, `data_conclusao`)
  - Valor total + desconto + valor pago + forma de pagamento
  - Descrição/observações
  - Equipamento (marca/modelo/série/defeito)
  - Salvo direto na etapa `concluido` + `data_conclusao` preenchida (não passa por Kanban)
  - Marca `origem_importacao: 'manual-retroativo-YYYY-MM-DD'` (pra distinguir de OS criadas via Kanban no fluxo normal)

- **Importar CSV** (próxima onda — não MVP):
  - Upload CSV do Bling/Trello
  - Mapeamento de colunas (drag-and-drop ou auto-detect por header)
  - Preview com N linhas + cliente matcher (ILIKE em `cliente.nome/telefone`)
  - Clientes não encontrados → opção de criar em massa OU pular
  - Confirma → INSERT em batch com `origem_importacao: 'bling-batch-YYYY-MM-DD'`
  - Dedupe via hash `(cliente_id + criado_em::date + valor_total)` ou comparação de `numero_externo` se houver

---

## 5. Schema (sem mudança no banco — usa `os` existente)

A página `/vendas` é só uma **view diferente** sobre a tabela `os`. Nada de schema novo, exceto talvez 2 colunas opcionais pra distinguir histórico de retroativos:

```sql
-- Pendente — só rodar quando importação CSV entrar
ALTER TABLE os ADD COLUMN IF NOT EXISTS origem_importacao text;
ALTER TABLE os ADD COLUMN IF NOT EXISTS numero_externo text;
COMMENT ON COLUMN os.origem_importacao IS 'NULL pra OS criadas pelo Kanban (fluxo normal). Preenchido pra OS importadas: "manual-retroativo-YYYY-MM-DD" ou "bling-batch-YYYY-MM-DD".';
COMMENT ON COLUMN os.numero_externo IS 'Número original da OS no sistema antigo (Bling/Trello). Preserva ID histórico pra rastreabilidade. NULL pra OS nativas.';
```

Não criar pra MVP — adicionar quando a importação CSV for implementada.

---

## 6. Plano de implementação

### Onda 1 — MVP (1.5-2h)
1. Criar `src/pages/Vendas.jsx` — lista + filtros + KPIs
2. Reusar `useOS` (já existe) — mas SEM o filtro de 24h. Provavelmente vai ser um `useOS(buscando=true)` que já bypassa o filtro.
3. Adicionar item "Vendas" ao `MENUS` em `osData.js` (admin-only)
4. Roteamento em `App.jsx` (desktop + mobile, ambos envoltos em `<AdminOnly>`)
5. Plugar `useOSDetalheModal` pra click abrir OSDetalhe inline
6. Modal "Nova OS antiga" (`src/components/vendas/NovaOSAntigaModal.jsx`)

### Onda 2 — Importação (próxima sessão, ~1-2h)
1. SQL: adicionar colunas `origem_importacao` + `numero_externo` em `os`
2. Página de import (admin-only) — upload CSV + mapeador + preview
3. Cliente matcher + criação em massa de clientes novos
4. Dedupe + batch INSERT
5. Testes com CSV real do Toni (Bling export)

---

## 7. Pré-requisito pra Onda 2

Toni precisa exportar **1 CSV de exemplo** do Bling/Trello pra eu ver:
- Quais colunas existem (nomes em PT)
- Formato de data (DD/MM/YYYY vs ISO)
- Como cliente aparece (nome livre vs CPF/CNPJ vs ID)
- Se há número de OS original

Sem CSV real, faço mapeamento "no escuro" e provavelmente vai errar.

---

## 8. Interseções com outras áreas

- **OS / Kanban (`contexto-os.md`)**: a página `/vendas` reusa `useOSDetalheModal` (criado 20/05) pra abrir OSDetalhe inline.
- **Financeiro (`contexto-financeiro.md`)**: quando Toni registrar uma OS antiga retroativa com `valor_pago > 0`, o ideal seria criar lançamento no Financeiro também. Decisão MVP: **não fazer automático** (importação retroativa pode ser muita coisa). Toni cria manualmente via `NovoLancamentoModal` se quiser.
- **Relatórios (`contexto-relatorios.md`)**: os 7 relatórios já leem da tabela `os`. OS importadas via `/vendas` aparecem automaticamente.
- **Clientes (`contexto-clientes.md`)**: importação CSV vai criar clientes novos quando não houver match. Reusa `criarClientePersist` que já existe.

---

## 9. Decisões pendentes (pra confirmar com Toni amanhã)

1. **OS antigas têm `data_conclusao` ou só `criado_em`?** Bling provavelmente tem só data da emissão. Suficiente — `criado_em` cobre.
2. **Vendas-> Lançamento financeiro retroativo:** criar opcional? Ou Toni cria à parte manualmente? MVP: à parte. Pode ter checkbox "Criar lançamento de receita pago automático" no modal "Nova OS antiga" — futuro.
3. **Histórico de itens (`os_item`):** OS antiga importada tem itens? Provavelmente Bling só tem total. Importar sem itens, deixando `valor_total` direto. Quando Toni quiser detalhar uma OS específica, edita no OSDetalhe.
