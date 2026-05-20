# Contexto — Relatórios

> Doc vivo do terminal `relatorios`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

🟢 **4 relatórios com dados reais** (Geral, OS Operacional, Estoque, Vendas)
🟡 **2 relatórios em mock** (DRE e Funcionários): código IA pronto (edge function + hook + UI) mas **botão "Gerar análise" gateado por `IA_DEPLOYED=false`** — ativa quando o deploy da edge function for feito. Antes do flip, o `supabase.functions.invoke` trava ~25-30s no timeout.

### O que está pronto
- Hub com 6 cards de entrada + badge **IA** nos 2 com Claude
- **Calendário no filtro**: `<input type="month">` mês específico OU dois `<input type="date">` intervalo; presets desativam quando custom selecionado; subtítulo da página reflete período real
- **Hook `useRelatorios.js`** com 4 sub-hooks lazy (`useRelatorioGeral`, `useRelatorioOperacional`, `useRelatorioEstoque`, `useRelatorioVendas`) + helper `computeRange(periodo, mesEsp, dataIni, dataFim) → { iniIso, fimIso, label }`
- **Loading/erro padronizados** dentro do `Relatorios.jsx` (`RelatorioLoading` / `RelatorioErro`)
- **EmptyState** quando não há dados no período (cobre todas as seções)
- **Edge function `supabase/functions/relatorio-ia/index.ts`** — recebe `{ tipo, dados }`, chama Claude API (`claude-opus-4-7`) com prompt caching `ephemeral` no system + instrução por tipo, retorna `{ markdown, modelo, usage }`. CORS aberto. Lê `ANTHROPIC_API_KEY` dos secrets do Supabase.
- **Hook `src/hooks/useRelatorioIA.js`** — invoca a edge function via `supabase.functions.invoke('relatorio-ia', { body })`. Expõe `{ markdown, loading, error, usage, gerar(tipo, dados), resetar() }`.
- **`InsightIA` reformulado** — botão **"Gerar análise agora"** dispara `gerar(...)`; renderiza loading, erro (com "tentar de novo") e o markdown retornado. Renderer Markdown inline (não adiciona dependência) cobre `## h2`, `### h3`, listas `-`/`*`, **negrito**, `código`.
- **Plugado** em `RelatorioFinanceiro` (tipo `'dre'`) e `RelatorioFuncionarios` (tipo `'funcionarios'`).

### O que falta
- **Deploy da edge function**: `supabase functions deploy relatorio-ia --no-verify-jwt` + `supabase secrets set ANTHROPIC_API_KEY=...` (código pronto, mas a function ainda não foi deployada — Toni roda quando quiser ativar)
- Trocar dados mock dos 2 relatórios IA por queries reais (DRE precisa do schema parte 2 / `lancamento_financeiro`; Funcionários precisa de agregação de `os_historico`)
- Exportação (PDF/Excel)
- Sparkline de delta vs período anterior (decidi não calcular agora — só sparkline 12m absoluto no Geral)

---

## 2. Os 6 relatórios

| # | Relatório | IA? | Fonte de dados | Status |
|---|---|---|---|---|
| 1 | Geral | Não | `os` + agregados 12m | ✅ real |
| 2 | OS Operacional | Não | `os`, `os_historico` | ✅ real |
| 3 | Estoque | Não | `peca`, `os_item` (consumo) | ✅ real |
| 4 | Vendas | Não | `os`, `os_item`, `os_historico` | ✅ real |
| 5 | DRE | **Sim** | `lancamento_financeiro` (schema parte 2) | 🟡 mock (TODO[ia] no código) |
| 6 | Funcionários | **Sim** | `os_historico` + `usuarios` | 🟡 mock (TODO[ia] no código) |

> ⚠️ Conferir os números reais contra Supabase via SQL editor — em ambiente de produção podem aparecer divergências (ex: OS antigas migradas sem `data_conclusao` preenchido).

---

## 3. O que cada hook agrega

### `useRelatorioGeral({ iniIso, fimIso })`
- Faturamento (soma `valor_total - desconto` das OS `etapa='concluido'` no período)
- OS concluídas + OS abertas no período
- Ticket médio (faturamento / concluídas)
- Distribuição por tipo (atendimento/fabricacao/venda) — sobre as abertas
- **Sparkline 12m fixo** (Faturamento e OS) — sempre últimos 12 meses do calendário, independente do filtro

### `useRelatorioOperacional({ iniIso, fimIso })`
- Lead time médio = média de (`data_conclusao - criado_em`) das concluídas no período
- OS concluídas, recusadas, garantia (retrabalho) no período
- % retrabalho = OS garantia / OS abertas
- Tempo médio por etapa: agrega `os_historico.duracao_segundos` por `etapa_de`
- Gargalos: top 3 etapas (Crítico/Atenção/OK)

### `useRelatorioEstoque({ iniIso, fimIso })`
- Snapshot atual: total de itens (soma `qtd_atual`), valor parado (`qtd × custo`), SKUs ativos, peças em estoque baixo (`qtd_atual ≤ qtd_minima > 0`)
- **Consumo no período** vem de `os_item` com `peca_id IS NOT NULL` no `criado_em` (Onda 4 — antes era `tipo='peca'`, coluna removida):
  - Top 5 peças mais usadas (group by `nome`, soma `quantidade`)
  - Peças paradas: `qtd_atual > 0` AND não aparecem em `os_item` do período (ordenado por capital parado)
- Giro médio não calculado (sem histórico de movimentação)

### `useRelatorioVendas({ iniIso, fimIso })`
- Conversão orçamento = (OS que passaram por etapa pós-orçamento) / (OS que chegaram em orçamento)
- Ticket médio + faturamento (das concluídas no período abertas no período)
- Máquinas vendidas + receita máquinas (`tipo='venda'` AND `etapa='concluido'`)
- Funil: count de OS por etapa alcançada (combina `os_historico.etapa_para` + etapa atual)
- Top 6 itens mais vendidos (peça/serviço) — soma `quantidade` em `os_item` (peça = `peca_id IS NOT NULL`, serviço = `peca_id IS NULL`)

---

## 4. Integração Claude API (DRE + Funcionários)

Padrão: front agrega dados → invoca edge function → função chama Claude → renderiza markdown.

### Arquitetura

```
RelatorioFinanceiro / RelatorioFuncionarios
        │  monta `dadosIA` (JSON com os números agregados)
        ▼
useRelatorioIA().gerar(tipo, dados)
        │  supabase.functions.invoke('relatorio-ia', { body: { tipo, dados } })
        ▼
supabase/functions/relatorio-ia/index.ts  (Deno, edge)
        │  POST https://api.anthropic.com/v1/messages
        │  model: claude-opus-4-7
        │  system: [SYSTEM_BASE, PROMPTS[tipo]]  ← ambos com cache_control: ephemeral
        │  messages: [{ role: 'user', content: 'Dados (JSON):\n```json\n...\n```' }]
        ▼
{ markdown, modelo, usage } → front renderiza via <MarkdownView />
```

### Caching
- **System base + instrução por `tipo`** ambos com `cache_control: { type: 'ephemeral' }` (TTL 5min). O dado do usuário (JSON dos números) muda a cada chamada, mas o "skeleton" do prompt fica cacheado.

### Modelo
- **`claude-opus-4-7`** — escolha do Toni pra ter análise mais profunda (Opus, custo maior). Constante `MODEL` no topo do `index.ts` se quiser trocar pra Sonnet.

### Tipos suportados (`PROMPTS` no `index.ts`)
- `'dre'` → estrutura: Resumo · O que puxou pra cima · O que puxou pra baixo · Ações sugeridas
- `'funcionarios'` → Visão geral · Destaques individuais · Gargalos · Ações sugeridas

Pra adicionar um novo tipo: só estender `PROMPTS` no `index.ts` e chamar `gerar('novo-tipo', dados)` no front.

### Por que não chamar Claude direto do front
A chave Anthropic vaza no bundle. Edge function (Supabase) ou serverless equivalente é obrigatório.

### Deploy / secrets
```bash
supabase functions deploy relatorio-ia --no-verify-jwt
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```
`--no-verify-jwt` porque é chamada de cliente normal (a `anon key` do supabase-js já vai no header automaticamente).

### Onde está marcado no código
- `supabase/functions/relatorio-ia/index.ts` — edge function (Deno)
- `src/hooks/useRelatorioIA.js` — hook que invoca a function
- `src/pages/Relatorios.jsx` → `RelatorioFinanceiro` e `RelatorioFuncionarios` montam `dadosIA` e passam pro `InsightIA` (que tem o botão "Gerar análise agora")
- `MarkdownView` + `parseMarkdown` + `renderInline` em `Relatorios.jsx` — renderer minimalista, evita dependência externa

---

## 5. Filtro de período (padrão dos relatórios)

- 4 presets: Mês · Trimestre · Semestre · Ano (rolantes a partir de hoje, exceto "Mês" = mês corrente desde dia 1)
- Custom: `<input type="month">` OU intervalo `<input type="date">` × 2
- Presets desativam quando custom selecionado
- Subtítulo da página reflete período real
- Padrão: mês atual

`computeRange()` (em `useRelatorios.js`) centraliza a tradução pra `{ iniIso, fimIso }` consumido pelos hooks. Mudou a UI? Mexa só lá.

---

## 6. Visibilidade

**Relatórios é admin-only**:
- Menu (Sidebar.jsx + BottomNav.jsx) esconde de funcionário (constante `MENUS_ADMIN_ONLY`)
- Rota `/relatorios` envolvida em `<AdminOnly user={...}>` no `App.jsx`
- RLS no banco reforça

**Exceção**: o relatório "Relógio de Ponto" do Módulo Ponto **também aparece pro dono em Relatórios → Relógio de Ponto**. Ver `contexto-ponto.md`.

---

## 7. Padrão visual

- Hub: 6 cards grandes em grid
- Cada card: ícone + nome + descrição curta + (badge IA se aplicável)
- Cards com `<Card>` (sombra suave no light)
- Cores: ativo = azul, sem cor própria por relatório

Dentro de cada relatório:
- PageHeader com título + subtítulo (período) + filtros
- KPI strip no topo
- Sparkline ou gráfico principal
- Tabela densa
- Botão de exportar (PDF/Excel) — ainda placeholder

---

## 8. Performance

Hoje todos os 4 hooks fazem fetch direto do Supabase e agregam no JS:
- `os` < 100 linhas hoje, agregação em JS é trivial.
- `peca` 680 linhas → idem.
- `os_item` cresce com tempo, mas com filtro de período é controlado.
- `os_historico` é a que mais pode pesar — filtramos por `data` no período.

Estratégias se ficar pesado:
- **Materialized views** no Supabase pros agregados mensais (Geral 12m)
- **Cache no front** com TTL curto (5 min) — useSWR ou cache manual
- **RPC functions** no Postgres pra agregação no DB (mais rápido que `select *` + JS)
- Paginação se a tabela final ficar > 100 linhas

---

## 9. Pendências (ordem)

1. ~~Esperar Financeiro real~~ → ainda depende de schema parte 2 + dados em `lancamento_financeiro`
2. ~~Implementar Relatório Geral~~ ✅
3. ~~OS Operacional~~ ✅
4. ~~Estoque~~ ✅
5. ~~Vendas~~ ✅
6. **DRE com IA** — depende de Financeiro real + edge function Claude
7. **Funcionários com IA** — depende de `os_historico` ter volume + edge function Claude
8. Exportação PDF/Excel
9. Relógio de Ponto (módulo Ponto entregar primeiro)

---

## 10. Interseções com outras áreas

- **OS**: OS Operacional + Vendas leem `os` e `os_historico`. Ver `contexto-os.md`
- **Estoque**: relatório de Estoque lê `peca` (snapshot) e `os_item` (consumo). Ver `contexto-estoque.md`
- **Financeiro**: DRE lê `lancamento_financeiro` (pendente schema parte 2). Ver `contexto-financeiro.md`
- **Ponto**: relatório de Relógio de Ponto. Ver `contexto-ponto.md`
- **Geral / cross-area**: configuração de Claude API + edge function. Ver `CLAUDE.md` seção geral.

---

## 11. Bugs corrigidos (fix anterior)

### #1 — Regressão dos 4 reais em prod (mostravam "dados de exemplo")
**Causa**: `src/hooks/useRelatorios.js` **nunca foi versionado** (estava untracked). Localmente o `Relatorios.jsx` importava o hook e funcionava, mas no Vercel o arquivo não existia → build falhava → prod ficou servindo o último build bom (o anterior ao `fca1484`), que ainda tinha os 4 cards com valores mock hardcoded.

**Fix**: `git add src/hooks/useRelatorios.js` + commit. Vercel rebuildou e os 4 voltaram a puxar do Supabase.

**Lição**: depois de criar arquivo novo na pasta `hooks/`, sempre `git status` antes de fechar a feature. O `npm run build` local não pega esse caso porque o arquivo existe na máquina.

### #2 — DRE "Inteligente" travando 20-30s
**Causa**: o botão "Gerar análise agora" chamava `supabase.functions.invoke('relatorio-ia', ...)` numa edge function que **ainda não foi deployada**. O SDK do Supabase espera o timeout completo (~25-30s) antes de devolver erro.

**Fix**: gatear o botão atrás da constante `IA_DEPLOYED` (linha ~52 de `Relatorios.jsx`). Enquanto `false`, o `onGerar` não é passado pro `InsightIA` → botão some, UI mostra "Em breve". Quando a edge function for deployada, flipar pra `true` e o botão volta sem outra mudança de código.

```js
// src/pages/Relatorios.jsx
const IA_DEPLOYED = false  // ← flipar depois do deploy
```

### #3 — Estoque e Vendas voltaram a quebrar em prod (Onda 4, 20/05/2026)
**Causa**: schema de `os_item` mudou desde que `useRelatorios.js` foi escrito:
- Coluna `qtd` foi renomeada pra `quantidade`
- Coluna `tipo` foi removida (era enum `'peca'|'servico'`)

`useRelatorioEstoque` e `useRelatorioVendas` selecionavam `qtd, tipo` → PostgREST devolvia `42703 column "qtd" does not exist` → hook caía pra erro → cards exibiam "Erro ao carregar".

**Fix**: trocar em `src/hooks/useRelatorios.js`:
- `qtd` → `quantidade` em todas as agregações (soma, média, top N)
- Filtro `.eq('tipo', 'peca')` → derivar via `peca_id IS NOT NULL` (item com FK = peça; sem FK = serviço/avulso)

Estoque e Vendas voltaram a puxar números reais. Geral e Operacional não tocavam `os_item`, ficaram OK o tempo todo.

---

## 12. Decisões nesta rodada

1. **Hooks lazy por relatório** em vez de um único agregador — só carrega o que abrir, evita queries inúteis quando o usuário navega.
2. **Sem deltas (% vs anterior)** — pra evitar fetch dobrado em cada KPI. Sparkline 12m absoluto cobre a leitura de tendência.
3. **Agregação no JS, não no Postgres** — mais simples e suficiente pro volume atual; quando passar de ~2k OS, migrar pra RPC.
4. **Conversão orçamento + funil**: combinam `os_historico.etapa_para` (etapas que a OS já passou) + etapa atual (caso a OS não tenha histórico salvo ainda). Evita undercount.
5. **Peças paradas**: definição local = sem aparição em `os_item` no período escolhido. Não usa "dias sem giro" porque não temos timestamp da última saída por SKU.
6. **IA disparada por botão, não automática** — economiza tokens. Cada chamada custa caro com Opus, então o usuário pede sob demanda em vez de rodar a cada abertura.
7. **Renderer Markdown inline** (`parseMarkdown` + `renderInline` em `Relatorios.jsx`) em vez de adicionar `react-markdown`. Cobre `## h2`, listas, **negrito** e `código` — suficiente pro estilo dos prompts. Mantém a regra "sem `npm i` sem aprovação".
8. **Modelo único `claude-opus-4-7`** (Toni pediu Opus pra análises mais profundas). Caro, mas só dispara via botão. Trocar pra Sonnet é mudança de 1 linha (constante `MODEL` no `index.ts`).
9. **Cache duplo no system** — `SYSTEM_BASE` (persona) + `PROMPTS[tipo]` (estrutura), ambos com `cache_control: ephemeral`. Só o JSON do usuário não é cacheado.
