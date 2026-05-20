# Contexto — Painel (do DONO)

> Doc vivo do terminal `painel`. Atualizar ao terminar cada feature da área.
> Se mudou regra geral / status macro / interseção com outra área, atualizar também `CLAUDE.md`.
>
> **IMPORTANTE**: este painel é do DONO (Toni). O painel dos funcionários é separado — ver `contexto-painel-func.md`.

---

## 1. Status atual

✅ **Real ponta a ponta** (Onda 2, 19-20/05/2026 — mocks removidos; `useFinanceiro` ligado e SQL 01 aplicado).
✅ **Meta diária restante** no Hero (20/05/2026): calcula `(meta − faturado) / dias_uteis_restantes` descontando FDS + feriados via `ehFimDeSemana`/`ehFeriadoBancario` de `utils/financeiro.js`. Mostra texto "Pra bater nos X dias úteis que faltam: R$ Y/dia". Quando meta já bateu, troca pra "Meta do mês batida" com ícone troféu.
✅ **Meta vem de `configuracoes`** (Módulo 09, 20/05/2026): `useConfiguracoes().get('meta_mensal', 20000)`. Hardcoded 20000 deixou de existir no Hero.

`src/pages/Painel.jsx` consome `useOS`, `useUsuarios`, `useClientes`, `usePecas` **e `useFinanceiro`**. Faturamento, sparkline 30d, recebido hoje e fluxo de caixa anual agora vêm de `lancamento_financeiro` real (não mais de `os.valor_pago` nem de mocks). Os componentes de `src/components/painel/` são dumb (só recebem props) — não tem mock interno.

**Onda 2 (19/05/2026)**: trocou todos os mocks por hooks reais — `HeroFaturamento` usa `useFinanceiro` real, `PipelineOS`/KPIs usam `useOS`, `AlertasCriticos` cruzam `useOS + usePecas`. Mock fallback de `useFinanceiro` (badge `demo`) só dispara se o SQL 01 não estiver aplicado — em prod, com SQL 01 já rodado, o badge nunca aparece.

### Componentes (`src/components/painel/`)
- `HeroFaturamento` — faturamento do mês + sparkline 30d + progress da meta. Labels de data agora vêm calculados (não mais "abr" hardcoded).
- `KPICard` — 4 cards: OS abertas · OS atrasadas · Faturamento do mês · Ticket médio. Delta vs mês anterior real.
- `PipelineOS` — contagem real por etapa unificada (`ETAPAS_TODOS`), exclui admin-only quando aplicável.
- `AlertasCriticos` — 3 níveis (crítico/atenção/info). Inclui alertas operacionais de OS **e de estoque** (peça esgotada / nível baixo) via `usePecas`.
- `ProximasParadasTimeline` — próximos 7 dias com prazo, ordenadas.
- `HojeSidekick` — recebido hoje + OS abertas + em rota + próximas 3 paradas.

### Fontes de dados (todas reais)
| Sinal                                                           | Hook            |
|-----------------------------------------------------------------|-----------------|
| OS, pipeline, alertas de prazo, KPIs operacionais               | `useOS`         |
| Apelido do dono (saudação)                                      | `useUsuarios`   |
| Total de clientes (saudação)                                    | `useClientes`   |
| Peças no estoque + alertas de estoque (esgotada/baixa)          | `usePecas`      |
| **Faturamento mês/anterior, sparkline 30d, recebido hoje, fluxo anual** | `useFinanceiro` |

### Como o `finAgg` é montado (Painel.jsx)
Único `useMemo` percorre `lancsFin` 1 vez e devolve:
- `recebidoSerie[12]` — soma de `receita` paga por mês (ano corrente)
- `pagoSerie[12]`     — soma de `despesa` paga por mês
- `saldoSerie[12]`    — acumulado líquido até o mês atual (futuros = `null` pra linha cortar)
- `spark30d[30]`      — receita paga nos últimos 30 dias (alinhada em "hoje")
- `faturamentoMes` / `faturamentoAnt` — pega do `recebidoSerie`, com fallback cross-year quando hoje = janeiro
- `recebidoHoje` — receita com `pago_em` = hoje

`pago_em` é `DATE` (string `YYYY-MM-DD`) — usar `parseISODate()` local pra evitar shift de fuso (`new Date("2026-05-19")` cai em UTC e volta 1 dia em Cuiabá).

`dados` (OS-based) continua calculando o lado operacional. `ticketMedio` agora é `finAgg.faturamentoMes / osConcluidasMes`, mantendo a junção dos dois mundos.

### O que ainda é placeholder/mock no Painel
- ~~**Meta de R$ 20.000** — hardcoded.~~ (20/05 — agora vem de `configuracoes` via `useConfiguracoes`; default 20000 enquanto sql/10 não rodar).
- Quando `useFinanceiro` está em modo demo (`tabelaAusente`), os números do Hero/KPI/chart são do mock do hook (badge `demo` no Hero deixa explícito).
- Quando `useConfiguracoes` está em modo demo (sql/10 não aplicado), Painel usa default 20000 silenciosamente — só a página /configuracoes mostra banner amarelo "Modo demo".

---

## 2. Propósito

**Dashboard executivo do dono**. Foco em decisões macro:
- Faturamento do mês vs meta
- Pipeline de OS (quantas em cada zona)
- Alertas críticos (inadimplência, OS atrasada, peça em ponto de pedido)
- Tendências (sparkline de últimos N dias)

Dono **não bate ponto** (relevante pro Módulo Ponto — `contexto-ponto.md`).

---

## 3. Métricas principais

### Faturamento
- Mês atual vs meta (R$ 20.000)
- Meta diária restante (`(meta - faturado) / dias_uteis_restantes`)
- Sparkline dos últimos 30 dias

### Pipeline de OS
- Quantidade por zona (Externo/Interno/Financeiro)
- OS atrasadas (badge vermelha)
- Tempo médio por etapa (vem de `os_historico`)

### Alertas críticos
- Inadimplência (D+1, D+5, D+15)
- OS sem movimentação X dias
- Peça em ponto de pedido (`qtd_atual <= qtd_minima`)
- Cliente sem OS há muito tempo (gatilho de reativação)

### Resumo do dia
- Coletas agendadas hoje
- Entregas agendadas hoje
- OS em oficina hoje

---

## 4. Visibilidade

**Painel é o landing page de TODOS** (dono e funcionários veem o "painel" no menu). Mas:
- **Dono** → vê `Painel.jsx` cheio (este doc)
- **Funcionário** → vê `PainelFuncionarios.jsx` diferente (ainda não implementado — `contexto-painel-func.md`)

Decisão de roteamento depende do `papel` do usuário logado.

A regra de roteamento ainda não está implementada (ambos veem o `Painel.jsx` do dono hoje). Quando `PainelFuncionarios.jsx` existir, o `App.jsx` precisa fazer o switch baseado em `papel`.

---

## 5. Padrão visual

- **Light mode** (estilo Conta Azul): cards com sombra suave em vez de bordas, valores em destaque (R$, totais) em **preto puro e negrito**
- **Dark mode** (padrão desktop): cards com borda sutil, valores em destaque na cor padrão
- Cards sempre via `<Card>` (ativa sombra no light via CSS global)
- Valores R$ com `fontVariantNumeric: 'tabular-nums'`
- Hero usa `corHero(dark)` pra título

---

## 6. Performance

KPIs do Painel são caros (agregações). Estratégias:
- Cache simples no hook (useState + refetch manual)
- Realtime opcional (overkill pro Painel — atualizar só quando voltar pra aba)
- Considerar materialized view no Supabase se ficar lento

---

## 7. Pendências

1. ✅ ~~Trocar mocks por queries reais~~ (19/05 noite — feito)
2. ✅ ~~Conectar fluxo de caixa anual com `lancamento_financeiro`~~ (Onda 1, 19/05 — feito via `useFinanceiro`; 12 meses agregados, modo demo mantido enquanto SQL 01 não rodar)
3. ✅ ~~Roteamento Painel vs PainelFuncionarios~~ — feito via `PainelPorPerfil` em App.jsx (chama `isAdmin(user)`)
4. ✅ ~~Sparkline real dos últimos 30 dias~~ — feito (agora a partir de receitas pagas, não mais de `valor_pago`)
5. ✅ ~~AlertasCriticos consumir dados reais~~ — feito (3 níveis com lógica documentada em painel-noite.md; estoque integrado em 19/05)
6. ✅ ~~Mover meta R$ 20.000 pra `configuracoes` (Módulo 09)~~ — feito 20/05 (sql/10-configuracoes.sql + useConfiguracoes + página /configuracoes admin-only)
7. ✅ ~~Calcular meta diária restante `(meta - faturado) / dias_uteis_restantes`~~ — feito 20/05 (Hero mostra "Pra bater nos X dias úteis: R$ Y/dia"; usa ehFimDeSemana + ehFeriadoBancario)

---

## 8. Interseções com outras áreas

- **OS**: pipeline + atrasadas + tempo médio (lê `os` e `os_historico`). Ver `contexto-os.md`
- **Financeiro**: faturamento do mês, meta diária, inadimplência (lê `lancamento_financeiro`). Ver `contexto-financeiro.md`
- **Estoque**: peças em ponto de pedido. Ver `contexto-estoque.md`
- **Clientes**: alertas de reativação. Ver `contexto-clientes.md`
- **Painel Funcionários**: roteamento por papel. Ver `contexto-painel-func.md`
