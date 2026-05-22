# Contexto — Relatórios

> Doc vivo do terminal `relatorios`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.

---

## 1. Status atual

🟢 **7 relatórios com dados reais** (Geral, OS Operacional, Estoque, Vendas, **DRE**, **Funcionários**, **Ponto** — Ponto adicionado em 20/05/2026 noite ligado a `jornada_funcionario`).
🟡 **Botão "Gerar análise IA" ainda gateado por `IA_DEPLOYED=false`** nos 2 relatórios com Claude (DRE, Funcionários) — ativa quando o deploy da edge function for feito. Os números/tabelas/KPIs já vêm reais; só falta o resumo gerado por IA. Antes do flip, o `supabase.functions.invoke` trava ~25-30s no timeout.

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
- ~~Trocar dados mock dos 2 relatórios IA por queries reais~~ ✅ **feito 20/05/2026 noite** (ver seção 3)
- Exportação (PDF/Excel)
- Sparkline de delta vs período anterior (decidi não calcular agora — só sparkline 12m absoluto no Geral)

---

## 2. Os 7 relatórios

| # | Relatório | IA? | Fonte de dados | Status |
|---|---|---|---|---|
| 1 | Geral | Não | `os` + agregados 12m | ✅ real |
| 2 | OS Operacional | Não | `os`, `os_historico` | ✅ real |
| 3 | Estoque | Não | `peca`, `os_item` (consumo) | ✅ real |
| 4 | Vendas | Não | `os`, `os_item`, `os_historico` | ✅ real |
| 5 | DRE | **Sim** | `lancamento_financeiro` (schema parte 2) | ✅ real (botão IA gateado por `IA_DEPLOYED`) |
| 6 | Funcionários | **Sim** | `os_historico` + `usuarios` + `os` | ✅ real (botão IA gateado por `IA_DEPLOYED`) |
| 7 | Ponto | Não | `jornada_funcionario` + `usuarios` | ✅ real (adicionado 20/05/2026 noite) |

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

### `useRelatorioDRE({ iniIso, fimIso })` — adicionado 20/05/2026
- **Regime de caixa**: filtra `pago_em` BETWEEN ini AND fim (NÃO `vencimento`). Lançamentos abertos (pago_em IS NULL) NÃO entram no DRE — eles ficam em A Receber/A Pagar do módulo Financeiro.
- Receitas: SUM(valor) WHERE `tipo='receita'` (group by `categoria` text livre — entrega `receitasDetalhe[{categoria, valor}]` ordenado decrescente)
- Despesas: SUM(valor) WHERE `tipo='despesa'` (idem `despesasDetalhe`)
- Lucro: receitas − despesas
- Margem: round(lucro / receitas × 100); 0 quando receitas=0
- `totalLancamentos` pra detectar período vazio e gatear UI/botão IA
- Filtra `deleted_at IS NULL`

### `useRelatorioFuncionarios({ iniIso, fimIso })` — adicionado 20/05/2026
- 2 queries:
  1. `os_historico` no período (com `funcionario_id NOT NULL`) + join `usuarios:funcionario_id (id, apelido, papel)`
  2. `os` concluídas no período (id, valor_total, desconto, data_conclusao) — pra ticket médio
- Por funcionário agrega:
  - `etapasFeitas` (count das linhas de histórico dele)
  - `tempoMedioSegs` (avg de `duracao_segundos` quando > 0)
  - `osTotal` (distintos `os_id` que ele tocou)
  - `osFinalizadas` (interseção de `osTotal` com OS concluídas no período)
  - `faturamento` + `ticketMedio` (valor_total − desconto das OS finalizadas dele)
  - `etapaMaisDemorada` (gargalo individual — etapa onde ele mais demora em média)
- Agregados globais: `totalEtapas`, `totalOSAtendidas`, `totalFuncionarios`
- Ordenado por `etapasFeitas` decrescente
- **Sem soft-delete em `os_historico`** (tabela append-only) — não filtrar `deleted_at` aí

### `useRelatorioPonto({ iniIso, fimIso, funcionarioId? })` — adicionado 20/05/2026
- Lê de `jornada_funcionario` (agregado diário, 1 linha por funcionário/dia) + join `funcionario:funcionario_id (id, apelido, papel)`
- Filtra `dia` BETWEEN `iniIso.slice(0,10)` AND `fimIso.slice(0,10)` (coluna `date`, não timestamptz — precisa de YYYY-MM-DD)
- `funcionarioId` opcional restringe a um único funcionário (drill-down futuro)
- Por funcionário agrega:
  - `totalHorasMin` (soma de `total_horas_trabalhadas` em minutos via `intervalToMinutes`)
  - `saldoHorasMin` (soma de `saldo_horas` — pode ser negativo)
  - `faltas` (count `status='falta'`) + `faltasJustificadas`
  - `diasComputados`
- Globais: `totalHoras` (string formatada), `totalFaltas`, `totalDias`, `totalFuncionarios`, `topPerformer` (1ª linha após ordenação por horas DESC)
- Filtra `deleted_at IS NULL`
- **Utility `intervalToMinutes`** suporta os 3 shapes que PostgREST devolve pra `interval`: string `"HH:MM:SS"` ou `"N day(s) HH:MM:SS"` (com sinal), objeto `{ days, hours, minutes, seconds }`, ou número. Lida com saldo negativo (banco de horas).
- **Utility `fmtHorasMin(min)`** formata minutos → "Xh Ymin" (com sinal se negativo).

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
6. ~~**DRE com IA**~~ ✅ **dados reais ligados** (20/05) — só falta `IA_DEPLOYED=true` + deploy da edge function pra liberar o botão
7. ~~**Funcionários com IA**~~ ✅ **dados reais ligados** (20/05) — idem
8. Exportação PDF/Excel
9. ~~Relógio de Ponto~~ ✅ **dados reais ligados em 20/05/2026 noite** (`useRelatorioPonto` + `src/pages/relatorios/RelatorioPonto.jsx`). Continua dependendo do cronjob de falta automática e do funcionário efetivamente bater ponto pra encher a tabela `jornada_funcionario`.
10. **Deploy edge function `relatorio-ia`** + flip de `IA_DEPLOYED` pra true em `src/pages/Relatorios.jsx` (linha ~50)

---

## 10. Interseções com outras áreas

- **OS**: OS Operacional + Vendas leem `os` e `os_historico`. Ver `contexto-os.md`
- **Estoque**: relatório de Estoque lê `peca` (snapshot) e `os_item` (consumo). Ver `contexto-estoque.md`
- **Financeiro**: DRE lê `lancamento_financeiro` (pendente schema parte 2). Ver `contexto-financeiro.md`
- **Ponto**: relatório de Relógio de Ponto. Ver `contexto-ponto.md`
- **Geral / cross-area**: configuração de Claude API + edge function. Ver `CLAUDE.md` seção geral.

---

## 11. Decisões nesta rodada

1. **Hooks lazy por relatório** em vez de um único agregador — só carrega o que abrir, evita queries inúteis quando o usuário navega.
2. **Sem deltas (% vs anterior)** — pra evitar fetch dobrado em cada KPI. Sparkline 12m absoluto cobre a leitura de tendência.
3. **Agregação no JS, não no Postgres** — mais simples e suficiente pro volume atual; quando passar de ~2k OS, migrar pra RPC.
4. **Conversão orçamento + funil**: combinam `os_historico.etapa_para` (etapas que a OS já passou) + etapa atual (caso a OS não tenha histórico salvo ainda). Evita undercount.
5. **Peças paradas**: definição local = sem aparição em `os_item` no período escolhido. Não usa "dias sem giro" porque não temos timestamp da última saída por SKU.
6. **IA disparada por botão, não automática** — economiza tokens. Cada chamada custa caro com Opus, então o usuário pede sob demanda em vez de rodar a cada abertura.
7. **Renderer Markdown inline** (`parseMarkdown` + `renderInline` em `Relatorios.jsx`) em vez de adicionar `react-markdown`. Cobre `## h2`, listas, **negrito** e `código` — suficiente pro estilo dos prompts. Mantém a regra "sem `npm i` sem aprovação".
8. **Modelo único `claude-opus-4-7`** (Toni pediu Opus pra análises mais profundas). Caro, mas só dispara via botão. Trocar pra Sonnet é mudança de 1 linha (constante `MODEL` no `index.ts`).
9. **Cache duplo no system** — `SYSTEM_BASE` (persona) + `PROMPTS[tipo]` (estrutura), ambos com `cache_control: ephemeral`. Só o JSON do usuário não é cacheado.
10. **DRE em regime de caixa, não competência** (20/05/2026) — filtro por `pago_em` BETWEEN ini AND fim. Razão: o módulo Financeiro já mostra contas a receber/pagar separadamente; misturar competência no DRE confundiria o dono. Lucro = caixa que efetivamente entrou menos caixa que efetivamente saiu.
11. **Funcionários sem "Score"** (20/05/2026) — removi a coluna `pontuacao` (era arbitrária no mock). As 6 colunas reais (Pessoa · Etapas · OS · Finalizadas · Tempo médio · Ticket médio) já dão leitura de performance sem precisar inventar fórmula. Gargalo individual aparece como subtítulo abaixo do nome ("gargalo: <etapa> (<tempo>)").
12. **Slot `ponto` desacoplado de `RelatorioPontoDono`** (20/05/2026 noite) — o componente do terminal `ponto` (dashboard de 6 abas em `src/components/ponto/RelatorioPontoDono.jsx`) usa 100% mocks de `_mocks.js`. Pra não mostrar números fictícios pro dono na rota `/relatorios`, troquei o slot por `src/pages/relatorios/RelatorioPonto.jsx` — slim, mesmo padrão visual dos outros 6 (KPI strip + tabela densa), 100% dados reais. O `RelatorioPontoDono` permanece no repo, mas só será usado depois quando o módulo Ponto plugar seus mocks em dados reais. Não deletei — só removi do roteamento de `/relatorios`.
13. **`RelatorioPonto` em arquivo próprio** (20/05/2026 noite) — quebrei o padrão "tudo inline em `Relatorios.jsx`" porque o componente do Ponto + utilities (parser de interval) cresceria demais inline. Criada pasta `src/pages/relatorios/` pra futuros relatórios maiores. Os 6 originais continuam inline em `Relatorios.jsx` (sem refator — não pedido).
