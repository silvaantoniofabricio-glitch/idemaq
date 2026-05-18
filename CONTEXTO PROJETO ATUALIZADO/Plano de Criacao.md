# 🚀 PLANO DE CRIAÇÃO DO SISTEMA IDEMAQ

> Documento executável do projeto Idemaq — mapa completo dos 13 módulos.
> Versão 2.1 · Atualizado em 15/05/2026 — Módulo 00b (parte 1) concluído ✅
> Companheiro do arquivo [[00 - Instruções Mestras]]
>
> **🔄 Novidade da v2.1**: o Módulo 00b (Schema do banco) **parte 1 foi aplicada com sucesso no Supabase**. 8 tabelas criadas (`usuarios`, `cliente`, `maquina`, `peca`, `os`, `os_item`, `os_historico`, `pre_diagnostico`) com soft-delete, auditoria automática, RLS por papel, UUID + número visível, UTC, e 2 buckets de Storage. Agora o próximo passo é o **Módulo 00c** — migração dos mocks pro Supabase real.
>
> **Histórico**: v1.0 (plano inicial) → v2.0 (revisão pós-código) → v2.1 (Módulo 00b parte 1 aplicado)

---

## 📑 SUMÁRIO

1. [Introdução](#1-introdução)
2. [Visão geral — mapa do sistema](#2-visão-geral--mapa-do-sistema)
3. [Princípios de execução](#3-princípios-de-execução)
4. [**Módulo 00b — Schema do banco** (NOVO)](#módulo-00b--schema-do-banco-de-dados)
5. [**Módulo 00c — Migração Mock → Supabase** (NOVO)](#módulo-00c--migração-mock--supabase)
6. [Módulo 01 — Kanban de OS](#módulo-01--kanban-de-os)
7. [Módulo 02 — Formulário Nova OS](#módulo-02--formulário-nova-os)
8. [Módulo 03 — Fluxo completo da OS](#módulo-03--fluxo-completo-da-os)
9. [Módulo 04 — Clientes](#módulo-04--clientes)
10. [Módulo 05 — Logística](#módulo-05--logística-google-maps)
11. [Módulo 06 — Estoque](#módulo-06--estoque)
12. [Módulo 07 — Financeiro completo](#módulo-07--financeiro-completo)
13. [Módulo 08 — Relatórios com IA](#módulo-08--relatórios-com-ia)
14. [Módulo 09 — Configurações](#módulo-09--configurações)
15. [Módulo 10 — Automações n8n + Z-API](#módulo-10--automações-n8n--z-api)
16. [Módulo 11 — Agente de reativação](#módulo-11--agente-de-reativação)
17. [Dependências entre módulos](#15-dependências-entre-módulos)
18. [Riscos e pontos de atenção](#16-riscos-e-pontos-de-atenção)
19. [Checklist consolidado de decisões pendentes](#17-checklist-consolidado-de-decisões-pendentes)

---

## 1. INTRODUÇÃO

### 🎯 Objetivo
Este plano é o mapa executável para construir o sistema Idemaq do **zero ao 100%**. Ele organiza tudo que já foi decidido nas [[00 - Instruções Mestras]] em uma **sequência prática de execução** e aponta o que ainda **precisa ser decidido** antes de cada módulo entrar em código.

### 📖 Como usar este documento entre os chats
1. Antes de abrir um chat novo de código, **leia a seção do módulo** que vai trabalhar
2. Confira o **checklist de decisões pendentes** daquele módulo — se tiver dúvidas em aberto, **responda primeiro**, depois codifica
3. Use a seção "Sequência de execução" como roteiro do chat
4. Ao terminar um módulo, marque como ✅ no [Mapa](#2-visão-geral--mapa-do-sistema) e atualize o documento

### 🔑 Legenda de status e símbolos

| Símbolo | Significado |
|---|---|
| ✅ | Pronto / decidido |
| 🚧 | Em andamento |
| ⏳ | Próximo da fila |
| 📅 | Planejado (futuro) |
| ❓ | Decisão pendente |
| ⚠️ | Atenção / risco |
| 💡 | Sugestão (não aplicar sem aprovação) |
| 🔗 | Depende de outro módulo |

---

## 2. VISÃO GERAL — MAPA DO SISTEMA

### Tabela mestra dos módulos

| # | Módulo | Status | Depende de | Estima (chats) | Prioridade |
|---|---|---|---|---|---|
| 00 | Painel principal | ✅ Pronto | — | — | — |
| **00b** | **Schema do banco (parte 1)** | ✅ **Concluído 15/05/2026** | — | ~~1–2~~ feito | 🔴 Crítica |
| **00c** | **Migração Mock → Supabase** | ⏳ **Próximo** | 00b ✅ | **3–5** | 🔴 **Crítica** |
| 01 | Kanban de OS | 🚧 UI pronta, falta gravar | 00c | 1–2 | 🔴 Alta |
| 02 | Formulário Nova OS | 🚧 UI pronta, falta salvar | 00c | 1–2 | 🔴 Alta |
| 03 | Fluxo completo da OS | 🚧 **TODAS as 10 Ações implementadas** visualmente (17-18/05/2026) — Diagnostico/Orcamento/Oficina/Teste/Entrega/Pagamento/Concluido/Recusada/Recebido/Agendamento. Falta save real no Supabase + OS de garantia funcional + conversão Recusada→Fabricação | 00c, 01, 02 | 2–4 | 🔴 Alta |
| 04 | Clientes | 🟡 UI mock pronta (17/05/2026) | 00c, 03 | 1–2 | 🟡 Média |
| 05 | Logística (Maps) | 🟡 UI mock + Maps via link público (17/05/2026) | 03, 04 | 2–4 | 🟡 Média |
| 06 | Estoque | 🟡 UI mock + modais detalhe Peça/Máquina (17/05/2026) | 00c, 03 | 2–4 | 🟡 Média |
| 07 | Financeiro completo | 🟡 UI mock reformulada Bling-style (17/05/2026), precisa schema parte 2 | 03, 06 | 4–6 | 🟡 Média |
| 08 | Relatórios com IA | 🟡 UI mock pronta com 6 relatórios (17/05/2026) | 03, 06, 07 | 3–5 | 🟢 Baixa |
| 09 | Configurações | 📅 (precisa schema parte 2) | (todos) | 1–2 | 🟢 Baixa |
| 10 | Automações n8n + Z-API | 📅 (precisa schema parte 2) | 03, 04 | 4–6 | 🟢 Baixa |
| 11 | Agente de reativação | 📅 (precisa schema parte 2) | 03, 04, 10 | 2–3 | 🟢 Baixa |

**Total estimado restante**: 28–43 chats (sem contar 00b que já foi feito).

### ✅ O que foi conquistado no Módulo 00b (parte 1)

Aplicado no Supabase em 15/05/2026:

| Decisão pendente | Resposta aplicada |
|---|---|
| `historico` jsonb ou tabela separada? | ✅ Tabela `os_historico` separada (com trigger automático) |
| `os.numero` PK ou UUID? | ✅ UUID interno + `numero` (bigint sequencial) visível |
| Soft-delete ou hard? | ✅ Soft-delete em tudo (`deleted_at` + `excluido_por`) |
| Timezone? | ✅ UTC no banco + fuso `America/Cuiaba` na app |
| Auditoria? | ✅ `criado_em/por` + `atualizado_em/por` via trigger automático |
| RLS? | ✅ Tabela `usuarios` com enum `papel` + funções helper |
| Storage de fotos? | ✅ 2 buckets: `idemaq-publico` + `idemaq-privado` |

**Resultado**: 8 tabelas (`usuarios`, `cliente`, `maquina`, `peca`, `os`, `os_item`, `os_historico`, `pre_diagnostico`), 23 índices, RLS policies, 5 enums, 2 buckets Storage.

**Schema parte 2 (pendente)**: `checklist_etapa`, `falha_teste`, `retorno_garantia`, `lancamento_financeiro`, `rota`, `configuracoes`, `webhook_log`, `reativacao_*` — serão criadas conforme os módulos forem desenhados (estratégia "meio-termo").

### 🔎 O que mudou da v2.0 pra v2.1

- ✅ Módulo 00b (parte 1) **aplicado com sucesso** — todas as 7 decisões fundacionais respondidas e implementadas
- 🎯 Módulo 00c agora é o **próximo a fazer**
- 👥 Usuários documentados com nomes reais: **Toni** (dono), **Alessandro** (logística), **Guilherme** (oficina)
- 🗄 Schema dividido em parte 1 (feita) e parte 2 (pendente, ligada aos módulos futuros)

### 📅 Linha do tempo visual

```
[FASE 0 — Backend (fundação invisível)]
   ↓
   ✅ 00b Schema parte 1 (8 tabelas) — APLICADO 15/05/2026
   ⏳ 00c Migração Mock → Supabase ← PRÓXIMO
   📅 00b parte 2 (tabelas restantes, conforme módulos forem desenhados)
   ↓
[FASE 1 — Núcleo operacional] 🔴 Alta prioridade (UI já pronta, plugar ações)
   ↓
   01 Kanban → 02 Nova OS → 03 Fluxo OS
   ↓
[FASE 2 — Cadastros e operação] 🟡 Média prioridade
   ↓
   04 Clientes → 05 Logística → 06 Estoque → 07 Financeiro
   ↓
[FASE 3 — Inteligência e automação] 🟢 Baixa prioridade
   ↓
   08 Relatórios IA → 09 Configurações → 10 Automações → 11 Reativação
```

> 💡 **Estado atual**: a fundação do banco está pronta para os módulos 01-03. O próximo bloco crítico (00c) é trocar os mocks por queries reais no `App.jsx` — depois disso o sistema **passa a funcionar de verdade** (dados persistem, equipe compartilha realidade).

---

## 3. PRINCÍPIOS DE EXECUÇÃO

### 🎨 Visual e acessibilidade — sempre
- Paleta Deutan obrigatória: `#5B9BD5` · `#FFD966` · `#FF6B6B` · `#B8CCE4`
- Nunca usar vermelho/verde puros sem indicador de forma/texto
- Dark = desktop · Light = mobile
- Cores nunca hardcoded — sempre via prop `T`
- Ícones sempre Tabler Icons (`ti ti-nome`)

### 📦 Entrega de código — 2 modos
- **Modo padrão**: arquivo `App.jsx` completo → dono copia → `git push`
- **Modo instruções**: arquivo `.md` com blocos LOCALIZAR/SUBSTITUIR (só em mudanças pequenas, 1–3 pontos)

### ✔️ Definição de "pronto" universal
Um módulo só é considerado pronto quando:
1. ✅ Funciona no desktop **e** no mobile
2. ✅ Respeita dark e light mode corretamente
3. ✅ Respeita controle de acesso por papel (dono / Func1 / Func2)
4. ✅ Sem erros no console
5. ✅ Foi testado pelo dono em produção (https://idemaq.vercel.app)
6. ✅ Sem cores hardcoded — tudo via `T`
7. ✅ Estado persistido corretamente no Supabase

### 🚫 O que NÃO fazer
- Criar funcionalidades sem autorização explícita
- Aplicar "pequenas melhorias" não pedidas
- Mudar regra de negócio sem perguntar
- Mandar fragmentos de código sem contexto

---

# MÓDULO 00b — SCHEMA DO BANCO DE DADOS

> Status: ✅ **PARTE 1 CONCLUÍDA EM 15/05/2026** · Prioridade: 🔴 Crítica · ~~Estima: 1–2 chats~~ — feito
> 🔗 Depende de: nada · 🚫 Bloqueia: ~~todos os módulos seguintes~~ → Liberou Módulos 00c, 01, 02, 03

### ✅ O QUE FOI FEITO (parte 1 — aplicada no Supabase)

**8 tabelas criadas:**
- `usuarios` — FK para `auth.users` com enum `papel` (dono / logistica / oficina)
- `cliente` — clientes da Idemaq
- `maquina` — máquinas (do cliente, estoque, vendida)
- `peca` — peças de estoque
- `os` — ordens de serviço (UUID + número sequencial visível)
- `os_item` — itens de cada OS
- `os_historico` — mudanças de etapa (inserção automática via trigger)
- `pre_diagnostico` — dados do recebimento

**Decisões fundacionais aplicadas:**

| Decisão | Resposta |
|---|---|
| Histórico como jsonb ou tabela separada? | ✅ Tabela `os_historico` separada (com trigger automático que insere quando `os.etapa` muda) |
| `os.numero` PK ou UUID? | ✅ UUID interno (`gen_random_uuid()`) + `numero bigint UNIQUE` sequencial gerado por trigger |
| Soft-delete? | ✅ Em todas as tabelas principais: `deleted_at timestamptz` + `excluido_por uuid`. Hard-delete só pra `os_historico` (CASCADE) |
| Timezone? | ✅ `timestamptz` em UTC no banco. Front converte pra `America/Cuiaba` (-04:00, sem horário de verão) na exibição |
| Auditoria? | ✅ Trigger `tg_set_audit()` preenche automaticamente `criado_em/por` + `atualizado_em/por` via `auth.uid()`. Front não precisa preencher manualmente |
| RLS? | ✅ Tabela `usuarios` com enum `papel`. Funções helper `papel_atual()` e `is_dono()` usadas nas policies |
| Storage de fotos? | ✅ 2 buckets: `idemaq-publico` (URL direta) e `idemaq-privado` (URL assinada). Estrutura hierárquica por entidade |

**Infraestrutura completa:**
- 23 índices criados
- RLS policies por papel (dono / logistica / oficina)
- 5 enums (`papel`, `os_tipo`, `os_etapa`, `os_pagamento_status`, `maquina_estado`)
- 2 buckets de Storage configurados
- Usuários reais cadastrados: Toni (dono), Alessandro (logística), Guilherme (oficina)

### 📅 O QUE FALTA (parte 2 — sob demanda)

Estas tabelas serão criadas conforme os módulos forem desenhados (estratégia "meio-termo"):

| Tabela | Módulo que vai precisar |
|---|---|
| `checklist_etapa` | Módulo 03 (Fluxo OS) — quando definir checklists das etapas |
| `falha_teste` | Módulo 03 — quando implementar etapa Teste final |
| `retorno_garantia` | Módulo 03 — refinamento de garantia |
| `lancamento_financeiro` | Módulo 07 (Financeiro completo) |
| `ponto_registro` + `jornada_funcionario` | **Módulo Ponto (NOVO 17/05/2026)** — spec completa em `CONTEXTO PROJETO ATUALIZADO/idemaq-modulo-ponto-CLAUDE-CODE.md` |
| `rota` | Módulo 05 (Logística) |
| `configuracoes` | Módulo 09 (Configurações) |
| `webhook_log` | Módulo 10 (Automações) |
| `reativacao_campanha`, `reativacao_envio` | Módulo 11 (Agente de reativação) |

### 📚 Como aplicar SQL novo no Supabase (referência rápida)
1. Painel Supabase → SQL Editor → New query
2. Cola o SQL dentro de `BEGIN; ... COMMIT;` (rollback automático em erro)
3. `Run` ou `Ctrl+Enter`
4. Alternativa: usar Claude in Chrome (extensão) que automatiza o processo

---

# MÓDULO 00c — MIGRAÇÃO MOCK → SUPABASE

> Status: ⏳ **PRÓXIMO A FAZER** · Prioridade: 🔴 Crítica · Estima: 3–5 chats
> 🔗 Depende de: [Módulo 00b](#módulo-00b--schema-do-banco-de-dados) ✅ concluído

### 📌 O que é
Trocar todos os dados fakes do `App.jsx` (`OS_MOCK`, `OS_ITENS_MOCK`, `CLIENTES_MOCK`, `ESTOQUE_MAQUINAS_MOCK`, `FUNCIONARIOS`) por **queries reais ao Supabase**. Depois deste módulo, o sistema realmente funciona como sistema — dados ficam salvos, todos os dispositivos enxergam a mesma realidade.

### ✅ O que já está pronto pra esse módulo
- Schema completo das 8 tabelas necessárias (Módulo 00b ✅)
- Cliente Supabase configurado em `src/supabase.js`
- Auth funcionando (login na linha 610 do App.jsx)
- Tabela `usuarios` com `papel` (substitui a constante `FUNCIONARIOS` do mock)
- Auditoria automática via trigger (front não precisa preencher `criado_em/por`)
- Soft-delete configurado (todas as queries filtram `deleted_at IS NULL`)
- Pull-to-refresh mobile já tem hook `onRefresh` pronto

### 📦 Arquivos que vão mexer
- `src/App.jsx` (3.181 linhas — vários pontos)
- Possivelmente criar `src/hooks/useOS.js`, `src/hooks/useClientes.js`, etc. (refatoração leve)
- `src/supabase.js` pode ganhar helpers

### 🔄 Sequência de execução

**Chat 1 — Buscar OS do Supabase**
1. Criar hook `useOS()` que faz `SELECT` na tabela `os` + `JOIN` com `cliente` e `os_item`
2. Sempre filtrar `WHERE deleted_at IS NULL` (soft-delete)
3. Converter `timestamptz` UTC pra `America/Cuiaba` na exibição
4. Substituir `OS_MOCK` no componente `OS` (Kanban desktop) e `OSMobile`
5. Tratar estado de loading e erro
6. **Entrega**: Kanban lendo do Supabase

**Chat 2 — Salvar mudanças de etapa (drag-and-drop)**
1. Quando `moverOS()` é chamado, fazer `UPDATE` na tabela `os` (`etapa`)
2. Trigger no banco cria automaticamente registro em `os_historico` — front não precisa fazer
3. Optimistic update (atualiza UI antes de confirmar no banco, reverte se falhar)
4. **Entrega**: drag-and-drop persistente

**Chat 3 — Buscar e salvar clientes**
1. Substituir `CLIENTES_MOCK` por queries reais
2. Implementar `INSERT` cliente novo (no Nova OS e na futura tela de Clientes)
3. Busca por nome/telefone direto no Supabase
4. **Entrega**: clientes vindos do banco

**Chat 4 — Salvar Nova OS de verdade**
1. Trocar o `alert()` do botão "Criar OS" por `INSERT` real
2. Inserir OS + itens em transação
3. Trigger atribui o `numero` sequencial automaticamente
4. Tratar 3 fluxos: Atendimento, Fabricação, Venda
5. **Entrega**: criação de OS real

**Chat 5 — Refresh real + funcionários + polimento**
1. Substituir constante `FUNCIONARIOS` por query na tabela `usuarios`
2. Plugar `onRefresh` do `PullToRefresh` pra refetchar de verdade
3. Substituir `OS_ITENS_MOCK`, `ESTOQUE_MAQUINAS_MOCK` por queries
4. Toggle "aguardando peça" persistente
5. Testes de regressão no Kanban completo
6. **Entrega**: zero mocks no código

### ❓ Decisões pendentes
- [ ] **Estratégia de cache/refetch**: react-query? SWR? `useState` puro com refetch manual?
- [ ] **Optimistic updates** ou aguarda confirmação do banco antes de atualizar UI?
- [ ] **Realtime** (Supabase Realtime): quero que Alessandro veja Kanban atualizar quando Guilherme mover algo? Ou refresh manual está bom?
- [ ] **Como tratar erro de rede**: toast vermelho + reverter? Retry automático?
- [ ] **Quanto tempo cache antes de refetch**: 30s? 1min? Só por pull-to-refresh manual?
- [ ] **Loading state**: skeleton de cards ou spinner central?

### ⏱ Estimativa: **3–5 chats**

### ✔ Definição de pronto
- [ ] `OS_MOCK`, `OS_ITENS_MOCK`, `CLIENTES_MOCK`, `ESTOQUE_MAQUINAS_MOCK`, `FUNCIONARIOS` **deletados** do código
- [ ] Drag-and-drop persistente
- [ ] Nova OS cria registro real no Supabase
- [ ] Pull-to-refresh refetcha dados
- [ ] Apelidos reais (Toni, Alessandro, Guilherme) aparecem no histórico
- [ ] Erros tratados sem quebrar a UI
- [ ] Dois dispositivos diferentes veem os mesmos dados

---

# MÓDULO 01 — KANBAN DE OS

> Status: 🚧 **UI 100% pronta — falta gravar mudanças no Supabase** · Prioridade: 🔴 Alta · Estima: 1–2 chats
> 🔗 Depende de: [Módulo 00c](#módulo-00c--migração-mock--supabase)

### 📌 O que é
Tela principal de operação. **Já está implementada e funcional** no `App.jsx` (linhas 1826-2290 do desktop, 1144-1620 do mobile). O que falta é simplesmente persistir as mudanças no Supabase em vez de só atualizar `useState` local.

### ✅ O que JÁ ESTÁ FEITO (no código)
- ✅ 4 abas no topo: Todos · Externo · Interno · Financeiro
- ✅ 11 colunas na aba Todos com cores e zonas
- ✅ Filtros: tipo (Atendimento/Fabricação/Venda), responsável, prazo, aguard. peça, recusadas
- ✅ Filtros sempre azul quando ativos (decisão visual respeitada)
- ✅ 3 estados de pagamento no card (sem badge / parcial amarela / total verde)
- ✅ **Drag-and-drop nativo HTML5** (sem biblioteca externa)
- ✅ Regras de bloqueio com `podeMoverOS()` (linha 263) + toast vermelho/verde
- ✅ Auto-redirect: OS paga em Pagamento → pula pra Concluído
- ✅ Coluna Concluído: mês corrente do calendário
- ✅ Busca escapa o filtro de mês
- ✅ Avatar do responsável NÃO aparece no card
- ✅ Badge "🛡 Garantia" com vínculo `os_origem_id`
- ✅ Colunas Pagamento e Concluído ocultas para Func1/Func2 (`adminOnly`)
- ✅ Ordenação por coluna conforme regras (`ordenarColuna`, linha 312)
- ✅ Mobile: 2 modos ("painel" grid + "coluna" 1 por vez com swipe lateral)
- ✅ BottomSheet de filtros mobile
- ✅ Indicadores visuais de urgência por etapa (vencidas, paradas +24h, hoje/amanhã, ag. peça)
- ✅ Pull-to-refresh mobile (visual pronto)

### ❌ O que FALTA fazer
Tudo abaixo depende do Módulo 00c estar terminado:

1. **Persistir movimento de etapa** — hoje `setOsList` atualiza estado local, precisa fazer `UPDATE` no Supabase
2. **Persistir toggle "aguardando peça"** — mesmo caso
3. **Plugar refresh real** no `PullToRefresh` (hoje só re-mounta o componente)
4. **OS some 24h após concluída** — regra ainda não implementada
5. **Eventualmente**: realtime updates (opcional, depende da decisão no Módulo 00c)

### 🔄 Sequência de execução

**Chat 1 — Persistência + auto-arquivamento**
1. `moverOS()` faz `UPDATE` no Supabase + insere em `os_historico`
2. `toggleAgPecaOS()` faz `UPDATE` no campo `aguardando_peca`
3. Implementar regra "OS some 24h após concluída"
4. Plugar `onRefresh` real
5. **Entrega**: Kanban totalmente persistente

**Chat 2 — Polimento e casos extremos (se necessário)**
1. Tratamento de erro de rede (reverter mudança visual + toast)
2. Loading states
3. Realtime updates (se decidido no Módulo 00c)
4. Possível otimização de query (paginação ou limite por coluna)

### ❓ Decisões pendentes (do que SOBROU da v1.0)

Das 8 perguntas originais, **7 já estão respondidas no código**. Só sobrou 1:

- [ ] **Limite/paginação por coluna**: hoje é scroll vertical infinito. Vale a pena paginar se a coluna passar de X cards? (provavelmente só vira problema depois de meses de uso, podemos deixar pra depois)

### ⏱ Estimativa: **1–2 chats**

### ✔ Definição de pronto
- [ ] Drag-and-drop persiste no Supabase
- [ ] Histórico (`os_historico`) é inserido a cada movimento
- [ ] Toggle "aguardando peça" persiste
- [ ] Pull-to-refresh refetcha dados de verdade
- [ ] OS some do Kanban 24h após Concluído
- [ ] Erros tratados (mostrar toast, reverter UI)

---

# MÓDULO 02 — FORMULÁRIO NOVA OS

> Status: 🚧 **UI 100% pronta — falta salvar no Supabase** · Prioridade: 🔴 Alta · Estima: 1–2 chats
> 🔗 Depende de: [Módulo 00c](#módulo-00c--migração-mock--supabase)

### 📌 O que é
Modal de criação de OS. **Já está implementado** no `App.jsx` (linhas 2291-2627). Tem 2 passos: escolha do tipo + formulário específico. Cobre os 3 tipos (Atendimento, Fabricação, Venda) com campos diferentes.

### ✅ O que JÁ ESTÁ FEITO (no código)
- ✅ Modal com 2 passos (escolha tipo → formulário)
- ✅ 3 cards visuais na escolha (Atendimento azul, Fabricação amarelo, Venda verde)
- ✅ Formulário de Atendimento: cliente (busca + criar inline), endereço, equipamento, defeito, data/hora coleta, responsável, observações
- ✅ Formulário de Fabricação: descrição, estado inicial, custo base, responsável
- ✅ Formulário de Venda: cliente, seleção de máquina do estoque, endereço, data/hora entrega
- ✅ Busca de cliente com autocomplete (mock)
- ✅ Botão "+ Cadastrar novo cliente" inline
- ✅ Versão mobile (full-screen no bottom)
- ✅ Validação de campos obrigatórios (botão "Criar OS" desabilita se faltar campo)
- ✅ Cancelar / Voltar / Próximo / Criar

### ❌ O que FALTA fazer
- **Salvar de verdade no Supabase** — hoje o botão "Criar OS" só dá `alert()` e fecha (linha 2326)
- **Autocomplete de endereço via Google Places** — campos existem mas não validam contra Google Maps ainda
- **Upload de foto da coleta** — não tem upload no formulário ainda (foto está mockada como contagem)
- **Inserir entrada inicial no `os_historico`** ao criar
- **Atribuir número de OS automaticamente** (hoje os números são fixos no mock)

### 🔄 Sequência de execução

**Chat 1 — Save real dos 3 fluxos**
1. Função `salvarOS()` faz `INSERT` na tabela `os` + insere registro inicial em `os_historico`
2. Se cliente é novo, fazer `INSERT` na `cliente` primeiro
3. Atribuir `numero` automático (próximo da sequência)
4. Tratar os 3 fluxos: Atendimento, Fabricação, Venda
5. Refresh do Kanban após salvar
6. **Entrega**: criação real de OS funcionando

**Chat 2 — Upload de foto + Google Places (se decidido)**
1. Componente de upload (Supabase Storage)
2. Compressão da imagem antes de enviar
3. Integração mínima Google Places no campo endereço (autocomplete)
4. Validações finais
5. **Entrega**: formulário completo

### ❓ Decisões pendentes

- [ ] **Numeração da OS**: sequencial único? Prefixo por tipo (A001 / F001 / V001)?
- [ ] **Cliente novo inline**: form rápido (nome + tel) é suficiente, ou exige endereço completo na hora?
- [ ] **Quando criar a `maquina`** no Atendimento: na hora da OS ou só ao registrar pré-diagnóstico?
- [ ] **Storage de fotos**: Supabase Storage com qual limite por OS?
- [ ] **Compressão de foto**: comprime no client antes de subir (ex: max 1080px, 80% qualidade)?
- [ ] **OS sem cliente identificado** (chega na oficina sem aviso): permitir "cliente avulso"?
- [ ] **Campos obrigatórios mínimos**: cliente é obrigatório sempre, mas e endereço? Equipamento?
- [ ] **Estoque na OS de Venda**: ao escolher máquina, ela já fica "reservada" ou só ao concluir?

### ⏱ Estimativa: **1–2 chats**

### ✔ Definição de pronto
- [ ] 3 tipos de OS persistem no Supabase
- [ ] Numeração automática funcionando
- [ ] Cliente novo é inserido corretamente
- [ ] Upload de foto funciona (Atendimento)
- [ ] Endereço com autocomplete Google Places
- [ ] OS criada aparece automaticamente no Kanban
- [ ] Tratamento de erro (banco indisponível, validação falhou)

---

# MÓDULO 03 — FLUXO COMPLETO DA OS

> Status: 🚧 **OS Detalhe pronta (read-only) — falta implementar ações de cada etapa** · Prioridade: 🔴 Alta · Estima: 4–6 chats
> 🔗 Depende de: [Módulo 00c](#módulo-00c--migração-mock--supabase), [Módulo 01 Kanban](#módulo-01--kanban-de-os), [Módulo 02 Nova OS](#módulo-02--formulário-nova-os)

### 📌 O que é
O coração operacional do sistema. A **tela de detalhe da OS** já existe (linhas 2648-3050 do `App.jsx`) mas é **read-only** — mostra os dados mas as ações de cada etapa ainda não fazem nada. Este módulo implementa todas as ações que fazem o trabalho real acontecer.

### ✅ O que JÁ ESTÁ FEITO (na UI da OS Detalhe)
- ✅ Modal de detalhe com header colorido por tipo
- ✅ 2 abas: Detalhe e Histórico
- ✅ Badges no topo: garantia, pago/parcial, aguardando peça, prazo
- ✅ **Timeline horizontal** com 11 etapas marcadas conforme o histórico
- ✅ Cada etapa concluída mostra o funcionário responsável (badge com apelido)
- ✅ Banner azul: "OS em garantia" (clicável, abre OS de origem)
- ✅ Banner verde: "Garantia ativa — faltam X dias" em OS Concluído
- ✅ Bloco "Em oficina" com Limpeza + Manutenção lado a lado
- ✅ Toggle "Aguardando peça" funciona (visualmente)
- ✅ Cards de Cliente e Equipamento
- ✅ Bloco "Última ação registrada" com responsável e etapa
- ✅ Tabela de itens com subtotal, desconto, total e pagamento
- ✅ 3 mini-cards: aberta em, prazo, dias na OS
- ✅ Observações
- ✅ Aba Histórico completa com timeline vertical e bolas coloridas

### ✅ Implementado em 17/05/2026
- ✅ **AcaoDiagnostico** — checklist técnico 2×2 colapsável (motor/água/elétrico/estrutura), busca de componente, marca "man" e/ou "troca" por item, campo Causa obrigatório
- ✅ **AcaoOrcamento** — editor completo dentro da aba Etapa:
  - Bloco RelatorioDiagnostico (defeito do cliente + causa do técnico + chips dos itens marcados troca/man)
  - Atalhos rápidos: Limpeza R$185, Manutenção R$185, Limpeza combinada R$165, Taxa diag R$30, Capa R$85 (1 clique adiciona, 2 cliques incrementa qtd)
  - Editor de itens (tipo + nome + qtd + valor + remover)
  - Desconto bidirecional R$ ↔ %
  - Resumo (subtotal · desconto · total)
  - 4 ações: **Gerar PDF** (window.print HTML formatado), **Enviar ao cliente** (WhatsApp wa.me com texto pré-formatado), **Aprovar** (avança Em oficina), **Recusar** (vai pra Recusado)
- ✅ **AcaoOficina** — 3 etapas por lado com sincronização:
  - Limpeza: Desmontagem ↔ · Limpeza · Montagem ↔
  - Manutenção: Desmontagem ↔ · Serviço (checklist do diagnóstico) · Montagem ↔
  - Cards só ativam se orçamento tem o tipo (limpeza vs manutenção)
  - Desmontagem/Montagem sincronizadas entre os 2 lados (mesma máquina física)
  - Segurança cruzada: Montagem bloqueada se serviço do outro lado incompleto
    ("Aguardando Limpeza" / "Aguardando Manutenção")
  - Aguardando peça por item de troca + toggle global
- ✅ **AcaoPagamento + FormRecebimento** — recebimento real:
  - PIX (gerar QR), Cartão (todas as bandeiras), Misto (PIX+Cartão), A prazo (calendário de parcelas), Dinheiro
  - Pagamento adiantado em qualquer etapa, redireciona Entrega→Concluído se total pago
- ✅ **AcaoRecebido (Pré-diagnóstico)** — 4 testes (Entrada água/Saída água/Agitação/Centrifugação) × OK/Defeito/Barulho + textarea de observações. Salva em `os.pre_diagnostico`. Avança pra Diagnóstico.
- ✅ **AcaoTeste (Teste final)** — checklist estruturado igual ao AcaoRecebido: 4 testes (Entrada água, Saída água, Agitação, Centrifugação) × OK/Defeito/Barulho + **Acabamento condicional** (3 toggles polimento/limpeza final/enceramento) que aparece SÓ se há item /limpeza/i no orçamento. Aprovar só libera com todos testes OK E (se aplicável) todo acabamento. Falhas viram `os.teste_falhas` auto → banner vermelho no AcaoOficina ao voltar.
- ✅ **AcaoEntrega** — 2 fases tipo "Aguardando agendamento ↔ Agendado" da coleta: (1) Aguardando agendar entrega com form data/hora/responsável/obs salvando em `os.entrega_data` etc; (2) Entrega agendada com card resumo + botão WhatsApp pra avisar cliente + Confirmar entrega + Reagendar. **Detecta se já está paga** (`estaPagaTotal`): vai DIRETO pra Concluído (verde) ou pra Pagamento (amarelo).
- ✅ **AcaoConcluido** — resumo final (cliente, equipamento, qtd itens, tempo total em dias, total R$), card de garantia ativa com dias restantes, botão "Abrir OS de garantia" (placeholder funcional) + botão Reabrir OS.
- ✅ **AcaoRecusada** — 3 decisões: Converter em Fabricação (disabled, placeholder Módulo 03), Cobrar taxa diagnóstico R$ 30 → Pagamento, Devolver máquina → Entrega.
- ✅ **Header OSDetalhe redesenhado (18/05)** — foto 72x72 da máquina (`os.pre_diagnostico.foto`, click abre FotoAmpliadaModal ou input file) + nome cliente big 17px + contato pequeno (WhatsApp/Maps clicáveis) + equipamento com marca/modelo/série/defeito.
- ✅ **Aba Resumo completa (18/05)** — banners contextuais (garantia/recusada), 3 mini-cards (aberta em/prazo/dias na OS), RelatorioDiagnostico compartilhado (unificado com Orçamento e Oficina), bloco Orçamento admin-only (itens + Total/Pago/Saldo + badge status), histórico recente das últimas 3 mudanças, observações.

### ❌ O que ainda FALTA fazer
- ❌ **Save real no Supabase** — hoje tudo é mock local + OS_ITENS_MOCK / onUpdateOS
- ❌ **Link InfinitePay real** (hoje é placeholder no FormRecebimento)
- ❌ **OS de garantia** — abrir nova OS com `garantia: true` e `os_origem_id` pré-preenchido (botão existe, falta o fluxo real)
- ❌ **Conversão de Recusada pra Fabricação** — fluxo de criar OS de fabricação herdando dados
- ❌ **Foto da coleta** (Storage Supabase) — placeholder no AcaoRecebido
- ❌ **Baixa automática no estoque** ao usar peças (precisa Módulo 06 conectado)
- ❌ **Entrada automática no estoque** ao concluir Fabricação

### 📦 Estrutura de dados que mexe
- `os` (atualiza etapa, status, valores, etc.)
- `os_item` (CRUD)
- `os_historico` (insere a cada ação)
- `pre_diagnostico` (NOVA — criar no Módulo 00b)
- `checklist_etapa` (NOVA — criar no Módulo 00b)
- `falha_teste` (NOVA — criar no Módulo 00b)
- `lancamento_financeiro` (gerado no pagamento)
- `peca` (baixa automática ao usar)
- `maquina` (entrada ao concluir Fabricação)

### 🔄 Sequência de execução

**Chat 1 — Etapas Recebido + Diagnóstico**
1. Formulário de pré-diagnóstico (campos: estado, observações da coleta, foto)
2. Formulário de diagnóstico técnico
3. Persistir e avançar etapa

**Chat 2 — Orçamento editável**
1. Adicionar/remover/editar itens no orçamento
2. Busca no estoque pra adicionar itens
3. Desconto bidirecional R$ ↔ %
4. Botões "Aprovar" (→ Em oficina) / "Recusar" (→ Recusado)

**Chat 3 — Oficina (Limpeza + Manutenção) + Teste final**
1. Checklists editáveis de Limpeza e Manutenção
2. Montagem ativa só quando ambos concluídos
3. Tela de Teste final com checklist
4. Registro de falhas (volta pra Em oficina, identificando módulo)

**Chat 4 — Entrega + Pagamento**
1. Confirmar entrega + upload de foto opcional
2. Registrar pagamento (PIX/Débito/Crédito 1x-12x/Misto/Parcelado)
3. Cálculo de taxas (InfinitePay/Ton)
4. Gerar link de pagamento (manual ou API — ❓ decidir)
5. Lançamentos financeiros automáticos

**Chat 5 — Conclusão + Garantia + Casos especiais**
1. Conclusão automática quando pagamento total
2. Botão "Abrir OS de garantia" (cria OS nova vinculada)
3. Conversão Recusada → Fabricação
4. Recusada → Entrega → Pagamento com decisão de cobrar taxa
5. Reabertura de Concluída (ação explícita)

**Chat 6 — Hooks de estoque + polimento**
1. Baixa automática de peças ao concluir OS
2. Entrada automática de máquina ao concluir Fabricação
3. Cálculo de custo total da máquina fabricada
4. Polimento e testes

### ❓ O que ainda falta decidir

- [ ] **Checklists das etapas**: itens fixos no código ou configuráveis em Configurações?
- [ ] **Reabertura de OS Concluído**: como é "ação explícita"? Botão dentro do detalhe com confirmação?
- [ ] **Link de pagamento**: gerado manualmente pelo dono e colado, ou integração com API InfinitePay?
- [ ] **Notificação ao cliente**: WhatsApp em qual etapa? (agendamento confirmado, orçamento pronto, entrega marcada, garantia abrindo...)
- [ ] **Anexos durante o fluxo**: pode anexar foto/vídeo em qualquer etapa, ou só em coleta/entrega?
- [ ] **Edição de OS já em andamento**: pode editar cliente/máquina depois da OS aberta?
- [ ] **OS com múltiplas máquinas** (cliente trás 2 máquinas): 1 OS por máquina ou 1 OS com 2 máquinas?
- [ ] **Falha no teste final**: volta pra "Em oficina" geral, ou registra qual módulo falhou (limpeza/manutenção) e volta pra ele?
- [ ] **Pagamento parcelado**: dono registra recebido OU sistema acompanha vencimentos automaticamente?
- [ ] **Lançamento financeiro**: só ao confirmar pagamento (receita confirmada) ou ao gerar orçamento aprovado (receita prevista)?
- [ ] **Quando a peça sai do estoque**: ao adicionar no orçamento ou ao concluir a OS?
- [ ] **Quem pode alterar valor**: só dono ou Func1 também?

### ⏱ Estimativa: **4 a 6 chats** (caiu de 5–8 porque a UI da OS Detalhe já existe)

### ✔ Definição de pronto
- [ ] Todas as 11 etapas funcionam end-to-end
- [ ] Histórico cronológico completo registrado
- [ ] Orçamento editável até pagamento
- [ ] Estoque baixa corretamente
- [ ] Lançamentos financeiros gerados automaticamente
- [ ] Garantia abre OS nova vinculada
- [ ] Fluxos de Fabricação e Venda funcionando
- [ ] Mobile + controle de acesso

---

# MÓDULO 04 — CLIENTES

> Status: 📅 · Prioridade: 🟡 Média · Estima: 2–3 chats
> 🔗 Depende de: [Módulo 03 Fluxo OS](#módulo-03--fluxo-completo-da-os)

### 📌 O que é
Cadastro e gestão de clientes. Lista com busca, ficha completa de cada cliente, histórico de OS, contatos e dados pra reativação.

### ✅ O que já está decidido
- Tabela `cliente` já criada
- Endereços validados via Google Maps Places
- Cliente pode ser criado de dentro da Nova OS (form inline)
- Comprador de máquina do estoque vira cliente cadastrado
- Dados pra agente de reativação (Módulo 11)

### 📦 Estrutura de dados
- Tabela `cliente`: nome, telefone, email, endereço, lat/lng, observações, data_cadastro
- Relacionamentos: OS, máquinas, lançamentos financeiros

### 🎨 Telas/componentes
1. `<ClientesListaPage>` — lista paginada com busca e filtros
2. `<ClienteCard>` — card mobile / linha desktop
3. `<ClienteDetalhePage>` — ficha completa
4. `<ClienteHistoricoOS>` — timeline de OS do cliente
5. `<ClienteMaquinas>` — máquinas do cliente
6. `<NovoClienteModal>` — modal de cadastro
7. `<EnderecoAutocomplete>` — Google Places (compartilhado com Nova OS)

### 🔄 Sequência de execução

**Chat 1 — Lista + cadastro + edição**
1. `<ClientesListaPage>` com busca
2. CRUD básico (criar, editar, soft-delete)
3. Autocomplete de endereço

**Chat 2 — Ficha completa + histórico**
1. `<ClienteDetalhePage>` com tabs
2. Histórico de OS
3. Máquinas do cliente
4. Total gasto, ticket médio, última visita

**Chat 3 — Polimento + relatórios básicos**
1. Filtros (sem visita há X dias, ticket alto, etc.)
2. Export CSV
3. Mobile

### ❓ O que ainda falta decidir
- [ ] **Aceita cliente sem endereço completo**? (ex: só nome + telefone)
- [ ] **Dedup por telefone**: bloqueia cadastro duplicado ou avisa?
- [ ] **Soft-delete ou hard-delete**: cliente nunca é apagado de verdade?
- [ ] **Tags/segmentação**: precisa de tags ("residencial", "comercial", "lavanderia")?
- [ ] **Aniversário do cliente**: campo opcional pra mensagens automáticas?
- [ ] **Como vincular OS antiga (de antes do sistema)**: importação CSV? Cadastro manual?

### ⏱ Estimativa: **2 a 3 chats**

### ✔ Definição de pronto
- [ ] CRUD completo
- [ ] Busca rápida funcionando
- [ ] Ficha com histórico de OS
- [ ] Endereço validado via Google Places
- [ ] Mobile

---

# MÓDULO 05 — LOGÍSTICA (Google Maps)

> Status: 📅 · Prioridade: 🟡 Média · Estima: 3–5 chats
> 🔗 Depende de: [Módulo 03 OS](#módulo-03--fluxo-completo-da-os), [Módulo 04 Clientes](#módulo-04--clientes)

### 📌 O que é
Tela com mapa interativo mostrando todas as coletas e entregas do dia/semana, com rota otimizada. Ajuda Func1 a planejar o trajeto e o dono a entender a distribuição geográfica.

### ✅ O que já está decidido
- Tabela `rota` já criada
- Endereços validados via Google Maps Places API
- Visível para: Dono + Func1 (logística)
- Foto obrigatória na coleta

### 📦 Estrutura de dados
- Tabela `rota`: data, funcionario, lista de paradas, otimização, status
- OS com `coleta_data`, `entrega_data`, `coleta_lat/lng`, `entrega_lat/lng`

### 🎨 Telas/componentes
1. `<LogisticaPage>` — mapa principal + lista lateral
2. `<MapaGoogle>` — mapa com pins de coleta (azul) e entrega (verde)
3. `<ListaParadas>` — lista lateral com ordem otimizada
4. `<FiltroData>` — dia/semana
5. `<RotaOtimizada>` — chamada à API de rotas do Google

### 🔄 Sequência de execução

**Chat 1 — Mapa básico + pins**
1. Integração Google Maps (chave de API)
2. Renderizar pins de OS do dia
3. Cores: coleta azul, entrega verde (cuidar acessibilidade — usar ícones diferentes também!)

**Chat 2 — Otimização de rota**
1. Calcular rota otimizada
2. Lista lateral com ordem
3. Tempo total estimado

**Chat 3 — Filtros + controles**
1. Filtro por data/semana/funcionário
2. Marcar parada como concluída
3. Persistir rota na tabela `rota`

**Chat 4–5 — Mobile + polimento**
1. Otimização pra uso no celular do Func1 (em movimento)
2. Atalho "Abrir no Google Maps" pra navegar
3. Foto da coleta direto na parada

### ❓ O que ainda falta decidir
- [ ] **Chave da Google Maps API**: já tem? Cota?
- [ ] **Otimização de rota**: API do Google (paga por chamada) ou algoritmo simples local?
- [ ] **Func1 pode reordenar manualmente** a rota otimizada?
- [ ] **Coleta + entrega na mesma rota**: misturadas por proximidade ou separadas (coletas de manhã, entregas de tarde)?
- [ ] **Notificação ao cliente**: "Estamos chegando em X min" via Z-API?
- [ ] **Histórico de rotas**: guarda quanto tempo cada rota levou pra análise futura?

### ⏱ Estimativa: **3 a 5 chats**

### ✔ Definição de pronto
- [ ] Mapa renderiza coletas e entregas do dia
- [ ] Rota otimizada calculada
- [ ] Func1 consegue marcar paradas como concluídas
- [ ] Mobile (uso em movimento)
- [ ] Foto da coleta acessível direto da parada

---

# MÓDULO 06 — ESTOQUE

> Status: 📅 · Prioridade: 🟡 Média · Estima: 3–5 chats
> 🔗 Depende de: [Módulo 03 OS](#módulo-03--fluxo-completo-da-os)

### 📌 O que é
Gestão de itens (peças e máquinas). Lista, entrada (manual ou por nota fiscal via IA), baixa automática quando usados em OS, alertas de estoque mínimo.

### ✅ O que já está decidido
- Tabela `peca` e `maquina` já criadas
- Peças: qtd atual/mín/máx, custo mín/médio/máx/atual, preço de venda, % lucro bidirecional
- Máquinas: estados (disponível, em revisão, vendida), custo total = valor pago + itens + serviços
- Baixa automática ao usar em OS
- Alerta ao atingir mínimo
- Entrada por nota fiscal: PDF/foto/Excel/CSV/texto → IA lê (Claude API) → revisão → salva

### 📦 Estrutura de dados
- `peca`: nome, sku, qtd, custos, preço, fornecedor, localização física
- `maquina`: modelo, marca, capacidade, estado, custo total, preço de venda
- Movimentações: entrada manual, entrada NF, baixa OS, ajuste manual

### 🎨 Telas/componentes
1. `<EstoquePage>` — lista de peças/máquinas
2. `<PecaCard>` / `<MaquinaCard>` — card com indicador visual de estoque (cor + ícone)
3. `<PecaDetalhe>` — ficha com histórico de movimentações
4. `<EntradaManualModal>` — entrada manual de itens
5. `<EntradaNFModal>` — upload + leitura por IA + revisão
6. `<AlertaEstoqueMinimo>` — badge/banner quando atinge mínimo

### 🔄 Sequência de execução

**Chat 1 — Lista + CRUD básico**
1. `<EstoquePage>` com lista paginada
2. CRUD de peças
3. CRUD de máquinas
4. Cálculo bidirecional preço ↔ % lucro

**Chat 2 — Entrada manual + histórico**
1. `<EntradaManualModal>` com itens em lote
2. Histórico de movimentações
3. Alerta de estoque mínimo

**Chat 3 — Entrada por nota fiscal (IA)**
1. Upload de PDF/foto/Excel/CSV
2. Integração Claude API pra extrair itens
3. Tela de revisão antes de salvar
4. **Atenção**: é o módulo que mais usa Claude API — controlar custos

**Chat 4 — Baixa automática + integração com OS**
1. Hook na conclusão de OS pra baixar peças
2. Hook na conclusão de Fabricação pra entrar máquina no estoque
3. Custo total da máquina calculado automaticamente

**Chat 5 — Polimento + mobile**
1. Filtros (por categoria, por fornecedor, por estoque baixo)
2. Export
3. Mobile

### ❓ O que ainda falta decidir
- [ ] **Categorização de peças**: precisa de categorias/subcategorias?
- [ ] **Localização física**: precisa rastrear onde a peça está fisicamente (prateleira X, caixa Y)?
- [ ] **Fornecedores**: cadastro separado ou só campo texto na peça?
- [ ] **Múltiplas unidades**: peças contam por unidade, par, conjunto?
- [ ] **Custo médio**: como recalcula com entradas a preços diferentes? (média móvel, FIFO, último custo)
- [ ] **IA pra leitura de NF**: validar o que ela retorna como? Edição livre antes de salvar?
- [ ] **Máquinas no estoque**: cada máquina é um registro único (com nº de série) ou agrupadas por modelo com qtd?

### ⏱ Estimativa: **3 a 5 chats**

### ✔ Definição de pronto
- [ ] CRUD de peças e máquinas
- [ ] Entrada manual + por nota fiscal
- [ ] Baixa automática ao usar em OS
- [ ] Alerta de estoque mínimo
- [ ] Mobile

---

# MÓDULO 07 — FINANCEIRO COMPLETO

> Status: 🟡 Em andamento (UI · sem persistência) · Prioridade: 🟡 Média · Estima: 5–7 chats
> 🔗 Depende de: [Módulo 03 OS](#módulo-03--fluxo-completo-da-os), [Módulo 06 Estoque](#módulo-06--estoque)

### 📌 O que é
Controle financeiro completo: contas a receber, contas a pagar, caixa, lançamentos avulsos/parcelados/recorrentes, alertas de inadimplência, meta diária.

### ✅ O que JÁ ESTÁ FEITO (no código, 18/05/2026)
- `<FinanceiroPage>` reformulada **estilo Bling**: filtros horizontais (período/status/categoria/conta), KPI strip, tabela ordenável com checkbox + menu ⋯, bulk action bar, caixa com saldo running.
- **`LancamentoDetalheModal`** (`src/components/financeiro/LancamentoDetalheModal.jsx`) — modal único adaptativo aos 3 tipos:
  - `receber` → footer `[Excluir] [Editar] [Baixar recebimento]`
  - `pagar`   → footer `[Excluir] [Editar] [Confirmar pagamento]`
  - `caixa`   → footer `[Excluir] [Fechar]` (read-only por regra de negócio)
- **Baixa real (in-memory)**: clicar em Baixar/Pagar remove o item de A Receber/A Pagar e gera entrada no Caixa com data de hoje. Excluir remove da lista. Toda lista é clicável e abre o modal.
- **Confirmação anti-clique-acidental**: ações destrutivas/concluintes (Baixar, Pagar, Excluir) trocam o rodapé pra um painel colorido com `[← Voltar] [✓ Sim, confirmar]` — protege o caixa de inclusões/exclusões por engano. Estado `pendente` reseta ao trocar de item (`useEffect` no `lancamento?.id`).
- **Visibilidade por papel**: `<AdminOnly>` em `App.jsx` redireciona funcionário tentando acessar `/financeiro` ou `/relatorios` pro Painel; menu (`Sidebar` + `BottomNav`) escondem os itens via `MENUS_ADMIN_ONLY = ['financeiro', 'relatorios']`.

### ✅ O que já está decidido
- Tabela `lancamento_financeiro` já criada
- 3 tipos de lançamento: avulso, parcelado (ID único), recorrente (dia configurável)
- Fluxo: Receber → baixa → vai pro Caixa
- Caixa = só movimentações confirmadas, sem edição (só visualizar e excluir)
- Categorias de receita: Limpeza, Manutenção, Peças, Venda de máquinas, Taxa diagnóstico, Outros
- Categorias de despesa: Funcionários, Peças ML, Tráfego pago, Impostos, Financiamento, Utilidades, Combustível, Ferramentas, Materiais limpeza
- Inadimplência: alertas D+1, D+5, D+15, depois 5º e 10º dia útil de cada mês
- Meta diária: dias úteis restantes, exclui FDS + feriados nacionais + municipais
- Bancos: Cresol, Bradesco, Mercado Pago
- Cartões: Elo Grafite, Bradesco Visa, MP, Bradesco PJ, Cresol, Nubank PJ, Inter
- Taxas das maquininhas já tabeladas (InfinitePay/Ton)
- Pagamento misto permitido

### 📦 Estrutura de dados
- `lancamento_financeiro`: tipo (receita/despesa), categoria, valor, data, status (previsto/pago), parcela_id, recorrencia_id, banco/cartao, os_id (se aplicável)
- Conceitos: a receber, a pagar, caixa (subviews da mesma tabela)

### 🎨 Telas/componentes
1. `<FinanceiroPage>` — dashboard com resumo
2. `<AReceberPage>` — lista de contas a receber
3. `<APagarPage>` — lista de contas a pagar
4. `<CaixaPage>` — movimentações confirmadas
5. `<NovoLancamentoModal>` — avulso / parcelado / recorrente
6. `<BaixaLancamentoModal>` — registrar recebimento/pagamento
7. `<AlertaInadimplencia>` — banner / lista de OS atrasadas
8. `<MetaDiariaWidget>` — quanto falta hoje, R$/dia
9. `<FiltroCalendario>` — padrão mês atual, volta em 1h

### 🔄 Sequência de execução

**Chat 1 — Estrutura + a receber**
1. `<FinanceiroPage>` com tabs
2. `<AReceberPage>` listando OS com pagamento pendente
3. `<BaixaLancamentoModal>` pra registrar recebimento

**Chat 2 — A pagar + caixa**
1. `<APagarPage>` com despesas previstas
2. `<CaixaPage>` (read-only, só visualiza + exclui)
3. Fluxo: previsto → pago → caixa

**Chat 3 — Novo lançamento (3 tipos)**
1. `<NovoLancamentoModal>` avulso
2. Parcelado (ID único, gera todas as parcelas)
3. Recorrente (dia configurável)

**Chat 4 — Inadimplência + meta diária**
1. `<AlertaInadimplencia>` com regras D+1/D+5/D+15
2. Notificações
3. `<MetaDiariaWidget>` no dashboard

**Chat 5 — Filtros + maquininhas**
1. `<FiltroCalendario>` com auto-reset em 1h
2. Cálculo de taxas por forma de pagamento
3. Vínculo lançamento → banco/cartão

**Chat 6 — Pagamento misto + integração com OS**
1. Múltiplas formas de pagamento na mesma OS
2. Gerar lançamentos automaticamente do pagamento da OS
3. Integração com Módulo 03

**Chat 7 — Polimento + mobile**
1. Exportações
2. Indicadores visuais
3. Mobile

### ❓ O que ainda falta decidir
- [ ] **Edição de lançamento previsto**: pode editar valor e data, ou só excluir e criar de novo?
- [ ] **Caixa "sem edição"**: nem o dono edita? Ou dono pode editar com confirmação?
- [ ] **Conciliação bancária**: precisa? Importar OFX/CSV do banco?
- [ ] **Reembolsos**: como tratar? Lançamento negativo? Tipo separado?
- [ ] **DRE em tempo real ou só no relatório**: dashboard mostra DRE simplificado?
- [ ] **Despesas com cartão**: lançam pela data da compra ou da fatura?
- [ ] **Funcionários (folha)**: lançamento automático todo dia X ou manual?
- [ ] **Centros de custo**: precisa separar despesas por área (oficina, logística, comercial)?

### ⏱ Estimativa: **5 a 7 chats**

### ✔ Definição de pronto
- [ ] A receber, a pagar e caixa funcionando
- [ ] 3 tipos de lançamento (avulso, parcelado, recorrente)
- [ ] Inadimplência com alertas D+1/5/15/mensal
- [ ] Meta diária calculando corretamente
- [ ] Integração com OS (pagamento gera lançamento)
- [ ] Mobile

---

# MÓDULO 08 — RELATÓRIOS COM IA

> Status: 📅 · Prioridade: 🟢 Baixa · Estima: 4–6 chats
> 🔗 Depende de: [Módulo 03](#módulo-03--fluxo-completo-da-os), [Módulo 06](#módulo-06--estoque), [Módulo 07](#módulo-07--financeiro-completo)

### 📌 O que é
Relatórios para gestão: Geral, OS operacional, Estoque, Vendas, Financeiro (DRE) e Funcionários (desempenho). Com camada de IA que **interpreta** os números e dá insights ("vendas caíram 15% comparado ao mês passado, principalmente nos serviços de limpeza combinada — pode estar relacionado a X").

### ✅ O que já está decidido
- 6 relatórios planejados: Geral, OS, Estoque, Vendas, Financeiro (DRE + IA), Funcionários (IA)
- Paleta Deutan obrigatória em todos os gráficos
- IA financeira via Claude API

### 📦 Estrutura de dados
- Lê de todas as tabelas
- Cache de relatórios pesados (Supabase materialized views?)

### 🎨 Telas/componentes
1. `<RelatoriosHub>` — menu com os 6 relatórios
2. `<RelatorioGeral>` — visão de tudo
3. `<RelatorioOS>` — tempos médios por etapa, gargalos, retrabalho
4. `<RelatorioEstoque>` — giro, peças paradas, custo médio, projeção
5. `<RelatorioVendas>` — funil de OS, ticket médio, conversão de orçamentos
6. `<RelatorioFinanceiroDRE>` — DRE + análise IA
7. `<RelatorioFuncionarios>` — performance por funcionário + análise IA
8. `<GraficoBase>` — wrapper Chart.js já com paleta Deutan
9. `<InsightIA>` — bloco de texto gerado pela Claude API

### 🔄 Sequência de execução

**Chat 1 — Hub + Relatório Geral**
1. `<RelatoriosHub>` com 6 cards
2. `<RelatorioGeral>` com KPIs principais
3. `<GraficoBase>` configurado com paleta Deutan

**Chat 2 — OS operacional + Estoque**
1. Tempos médios, gargalos, retrabalho
2. Giro de estoque, peças paradas

**Chat 3 — Vendas + DRE**
1. Funil de OS, conversão de orçamentos
2. DRE completo do período

**Chat 4 — IA financeira**
1. Integração Claude API
2. Insights textuais sobre DRE
3. Comparações período a período

**Chat 5 — IA de funcionários**
1. Performance por funcionário
2. Análise IA de pontos fortes/fracos
3. Sugestões

**Chat 6 — Polimento + export**
1. PDF / Excel
2. Filtros avançados
3. Mobile (versão simplificada)

### ❓ O que ainda falta decidir
- [ ] **Periodicidade padrão**: mensal, trimestral, anual?
- [ ] **Comparação com período anterior**: automática sempre?
- [ ] **IA: prompt e custos**: chamada por relatório aberto (caro) ou cache diário?
- [ ] **Acesso aos relatórios**: só dono ou Func1 vê alguns?
- [ ] **Export**: PDF, Excel, CSV, ou todos?
- [ ] **Funcionários: critérios de "performance"**: tempo médio por etapa? Volume? Retrabalho?
- [ ] **Mobile vale a pena ou só desktop**?

### ⏱ Estimativa: **4 a 6 chats**

### ✔ Definição de pronto
- [ ] 6 relatórios funcionais
- [ ] Paleta Deutan em todos os gráficos
- [ ] DRE com análise IA
- [ ] Export PDF/Excel
- [ ] Controle de acesso por papel

---

# MÓDULO 09 — CONFIGURAÇÕES

> Status: 📅 · Prioridade: 🟢 Baixa · Estima: 1–2 chats
> 🔗 Depende de: (acompanha desenvolvimento de todos)

### 📌 O que é
Tela de configurações gerais: empresa, usuários, feriados municipais, parâmetros de OS (garantia padrão, prazo de arquivamento), integrações (chaves de API), preferências visuais.

### ✅ O que já está decidido
- Feriados municipais Naviraí/MS: 06/11 + configuráveis manualmente
- Garantia padrão 90 dias (configurável por OS, mas padrão na config)
- OS some do Kanban 24h após concluída (configurável)
- Filtro calendário volta ao padrão em 1h (configurável?)

### 📦 Estrutura de dados
- Tabela `configuracoes` (criar)
- Chaves-valor simples ou JSON com estrutura

### 🎨 Telas/componentes
1. `<ConfiguracoesPage>` — tabs por categoria
2. `<ConfigEmpresa>` — dados da empresa
3. `<ConfigUsuarios>` — usuários e papéis
4. `<ConfigFeriados>` — calendário de feriados
5. `<ConfigParametrosOS>` — garantia padrão, arquivamento, etc.
6. `<ConfigIntegracoes>` — chaves de API (mascaradas)
7. `<ConfigVisual>` — preferências (já tem o toggle dark/light, expandir)

### 🔄 Sequência de execução

**Chat 1 — Estrutura + configurações essenciais**
1. `<ConfiguracoesPage>` com tabs
2. Dados da empresa, feriados, parâmetros OS
3. Persistir em tabela `configuracoes`

**Chat 2 — Usuários + integrações**
1. CRUD de usuários (com cuidado pra não quebrar autenticação)
2. Chaves de API (Google Maps, Claude, Z-API)
3. Polimento

### ❓ O que ainda falta decidir
- [ ] **Estrutura da tabela**: 1 linha por config (chave-valor) ou 1 linha com JSON gigante?
- [ ] **Quem pode mexer**: só dono ou Func1 também pode mudar alguns parâmetros?
- [ ] **Audit log**: precisa registrar quem mudou o quê?
- [ ] **Chaves de API**: armazenar criptografado ou em variável de ambiente Vercel?

### ⏱ Estimativa: **1 a 2 chats**

### ✔ Definição de pronto
- [ ] Configurações principais editáveis
- [ ] Feriados configuráveis
- [ ] Parâmetros respeitados pelo resto do sistema
- [ ] Mobile (versão simplificada)

---

# MÓDULO 10 — AUTOMAÇÕES n8n + Z-API

> Status: 📅 · Prioridade: 🟢 Baixa · Estima: 4–6 chats
> 🔗 Depende de: [Módulo 03 OS](#módulo-03--fluxo-completo-da-os), [Módulo 04 Clientes](#módulo-04--clientes)

### 📌 O que é
Automações via n8n Cloud que se conectam ao sistema Idemaq por webhooks. Principal uso: **WhatsApp via Z-API** — criar OS pelo zap, notificar cliente sobre etapas, receber pagamento confirmado, etc.

### ✅ O que já está decidido
- n8n Cloud + Z-API
- Webhooks bidirecionais (n8n → Idemaq e Idemaq → n8n)
- Z-API pra WhatsApp
- Casos de uso planejados: criação de OS pelo WhatsApp, criação de clientes, notificações

### 📦 Estrutura de dados
- Tabela `webhook_log` (criar) — registra todas as automações disparadas
- Endpoints REST no Supabase Edge Functions

### 🎨 Telas/componentes
- **Não tem tela principal** (rodam em background)
- `<AutomacoesPage>` — lista de automações ativas, logs, status
- `<WebhookLogTable>` — histórico de execuções

### 🔄 Sequência de execução

**Chat 1 — Estrutura + webhooks de saída**
1. Endpoints Edge Functions
2. Triggers no Supabase pra disparar eventos
3. `webhook_log`

**Chat 2 — Notificações via Z-API**
1. Notificação de agendamento confirmado
2. Notificação de orçamento pronto
3. Notificação de entrega marcada

**Chat 3 — Recepção de mensagens (Z-API → n8n → Idemaq)**
1. Cliente manda zap → n8n processa → cria OS
2. Estrutura de comandos / linguagem natural simples

**Chat 4 — Tela de automações**
1. Lista de automações ativas
2. Logs com erros
3. Toggle on/off por automação

**Chat 5–6 — Mais casos de uso + polimento**

### ❓ O que ainda falta decidir
- [ ] **Quais notificações exatamente** ao cliente? (lista completa)
- [ ] **Cliente cria OS pelo zap**: estrutura de comando ou conversa livre com IA?
- [ ] **Quem responde no WhatsApp**: bot (Z-API) ou humano (Func1)?
- [ ] **Horário das notificações**: respeita horário comercial?
- [ ] **Custos da Z-API**: já tem conta? Plano?
- [ ] **Templates aprovados WhatsApp Business** ou Z-API não exige?

### ⏱ Estimativa: **4 a 6 chats**

### ✔ Definição de pronto
- [ ] Notificações ao cliente nas etapas decididas
- [ ] Cliente consegue criar OS pelo WhatsApp
- [ ] Logs visíveis e auditáveis
- [ ] Liga/desliga por automação
- [ ] Erros tratados (não trava se Z-API cair)

---

# MÓDULO 11 — AGENTE DE REATIVAÇÃO

> Status: 📅 · Prioridade: 🟢 Baixa · Estima: 2–3 chats
> 🔗 Depende de: [Módulo 03](#módulo-03--fluxo-completo-da-os), [Módulo 04](#módulo-04--clientes), [Módulo 10](#módulo-10--automações-n8n--z-api)

### 📌 O que é
Agente automatizado que identifica clientes inativos (sem visita há X meses) e dispara campanhas de reativação personalizadas via WhatsApp.

### ✅ O que já está decidido
- Roda em cima dos dados de clientes e OS
- Notificação via Z-API/WhatsApp
- Usa IA (Claude API) pra personalizar mensagens

### 📦 Estrutura de dados
- Tabela `reativacao_campanha` (criar)
- Tabela `reativacao_envio` (1 por cliente atingido)
- Lê: `cliente`, `os` (última data)

### 🎨 Telas/componentes
1. `<ReativacaoPage>` — dashboard de campanhas
2. `<NovaCampanha>` — configurar critérios e mensagem
3. `<RelatorioCampanha>` — resultado (quantos responderam, quantos viraram OS)

### 🔄 Sequência de execução

**Chat 1 — Estrutura + identificação**
1. Query: clientes sem OS há X meses
2. Filtros (ticket médio, tipo de serviço, etc.)
3. Tela de visualização

**Chat 2 — Disparo de campanha**
1. Mensagem personalizada com IA
2. Disparo via n8n + Z-API
3. Log de envio

**Chat 3 — Acompanhamento + métricas**
1. Quem respondeu
2. Quem virou OS
3. ROI da campanha

### ❓ O que ainda falta decidir
- [ ] **"Inativo" = quantos meses**? 6? 12? Por tipo de serviço (manutenção vs. limpeza)?
- [ ] **Frequência das campanhas**: 1x/mês? Quando atingir massa crítica?
- [ ] **Cliente pode dar opt-out**: como respeitar isso?
- [ ] **Mensagem com IA**: 100% gerada ou template + 1 frase personalizada?
- [ ] **Cupom de desconto** na mensagem: implementação técnica?
- [ ] **LGPD**: como tratar comunicação não solicitada?

### ⏱ Estimativa: **2 a 3 chats**

### ✔ Definição de pronto
- [ ] Identifica clientes inativos
- [ ] Dispara campanhas com mensagem personalizada
- [ ] Mede resultado (taxa de resposta, conversão)
- [ ] Respeita opt-out

---

## 15. DEPENDÊNCIAS ENTRE MÓDULOS

```
[FASE 0 — Backend invisível]
00b SCHEMA ─→ 00c MIGRAÇÃO MOCK→SUPABASE
                         │
                         ↓
[FASE 1 — Núcleo (UI já existe)]
                                ┌─→ 04 CLIENTES ─┐
00 Painel ─→ 01 KANBAN ─→ 02 NOVA OS ─→ 03 FLUXO OS ─┼─→ 05 LOGÍSTICA ─┤
                                ├─→ 06 ESTOQUE ──┼─→ 07 FINANCEIRO ─→ 08 RELATÓRIOS
                                │                │
                                └────────────────┴─→ 09 CONFIGURAÇÕES (paralelo)

                                                  10 AUTOMAÇÕES n8n+Z-API
                                                  │
                                                  └─→ 11 REATIVAÇÃO
```

**Caminho crítico atualizado**: **00b → 00c → 01 → 02 → 03** (sem isso, nada do sistema funciona de verdade). Depois disso, vários módulos podem rodar em paralelo se houver tempo.

---

## 16. RISCOS E PONTOS DE ATENÇÃO

### ⚠️ Riscos técnicos
| Risco | Impacto | Mitigação |
|---|---|---|
| Drag-and-drop quebrar no mobile | Alto (kanban é a tela mais usada) | Testar cedo no mobile real, ter fallback (botões avançar/voltar) |
| Custos da Claude API explodirem | Médio (IA financeira + leitura NF + reativação) | Cache, limites por dia, escolher modelo mais barato pra tarefas simples |
| Google Maps API exceder cota | Médio | Acompanhar uso, considerar fallback (input manual de endereço) |
| Z-API com instabilidade | Baixo–Médio | Retry, log de erros, não bloquear sistema se cair |
| Dados de produção sem backup | Crítico | Configurar backup automático no Supabase desde já |
| Mudança de schema afetando dados existentes | Alto | Sempre fazer migrations versionadas, testar em staging primeiro |

### ⚠️ Riscos de produto
| Risco | Impacto | Mitigação |
|---|---|---|
| Funcionários resistirem ao sistema novo | Crítico | Treinamento, manter WhatsApp como entrada paralela no começo |
| Sistema muito complexo pro dono não-técnico | Crítico | Validar cada tela com ele antes de avançar, manter visual simples |
| Decidir errado uma regra de negócio | Médio | Sempre perguntar antes de assumir, marcar sugestões como sugestões |
| Acumular dívida técnica em "vou refazer depois" | Médio | Não fazer "limpezas" não pedidas, mas refatorar quando módulo correlato for tocado |
| Mobile ficar como secundário | Alto (Func1 e Func2 usam celular) | Testar mobile em cada chat, não deixar pro final |

### ⚠️ Pontos de atenção operacionais
- **Acessibilidade Deutan**: nunca esquecer — toda PR que tem cor passa por essa checagem
- **Modo padrão de entrega** (`App.jsx` completo) é seguro mas pode crescer demais — em algum ponto vamos precisar separar em múltiplos arquivos
- **Histórico cronológico** (campo `historico` na OS) precisa ser **append-only** — nunca editar entrada antiga
- **OS de garantia** é fácil de criar errado — sempre validar `garantia: true` + `os_origem_id` + `valor: 0` por padrão
- **Filtros do Kanban azul-quando-ativo** é uma decisão visual já fechada — não mudar pra cor do tipo

---

## 17. CHECKLIST CONSOLIDADO DE DECISÕES PENDENTES

> **Todas as perguntas em aberto, agrupadas por módulo. Responda com calma fora dos chats de código — quanto mais decidido antes, mais rápido andamos.**

### 🟦 Módulo 00b — Schema do banco
✅ **PARTE 1 CONCLUÍDA** — todas as 7 decisões respondidas e aplicadas no Supabase em 15/05/2026.

Pendente apenas a **parte 2** (tabelas que dependem de módulos futuros):
- `checklist_etapa`, `falha_teste`, `retorno_garantia` (Módulo 03)
- `lancamento_financeiro` (Módulo 07)
- `rota` (Módulo 05)
- `configuracoes` (Módulo 09)
- `webhook_log` (Módulo 10)
- `reativacao_*` (Módulo 11)

### 🟦 Módulo 00c — Migração Mock → Supabase ⏳ PRÓXIMO
- [ ] Estratégia de cache/refetch (react-query, SWR, useState)
- [ ] Optimistic updates ou aguardar confirmação
- [ ] Realtime (Supabase Realtime) ou refresh manual
- [ ] Como tratar erro de rede (toast + reverter, retry)
- [ ] Tempo de cache antes de refetch
- [ ] Loading state: skeleton ou spinner

### 🟦 Módulo 01 — Kanban
- [ ] Limite/paginação por coluna (provavelmente deixar pra depois)

> ✅ **7 das 8 perguntas originais do Kanban já estão respondidas no código** — biblioteca drag-and-drop (HTML5 nativo), mobile (2 modos), info no card, ordem dos cards, "aguardando peça", recusadas (toggle), click no card (modal).

### 🟦 Módulo 02 — Nova OS
- [ ] Numeração da OS (sequencial / prefixo por tipo)
- [ ] Cliente novo inline ou redireciona
- [ ] Quando criar a máquina
- [ ] Storage de fotos (limite por OS)
- [ ] Compressão de foto
- [ ] OS de garantia: mesmo modal ou botão separado
- [ ] Campos obrigatórios mínimos
- [ ] Cliente avulso (sem cadastro)
- [ ] Reserva de máquina na OS de Venda

### 🟦 Módulo 03 — Fluxo OS
- [ ] Checklists das etapas: fixos ou configuráveis
- [ ] Reabertura de Concluído: como funciona
- [ ] Link de pagamento: manual ou API
- [ ] Notificações WhatsApp em quais etapas
- [ ] Anexos durante o fluxo (qualquer etapa?)
- [ ] Editar OS já em andamento
- [ ] OS com múltiplas máquinas
- [ ] Falha no teste: volta pra geral ou específico
- [ ] Parcelado: manual ou automático acompanhar
- [ ] Lançamento financeiro: orçamento aprovado ou pagamento
- [ ] Peça sai do estoque: orçamento ou conclusão
- [ ] Quem altera valor: só dono ou Func1 também

### 🟦 Módulo 04 — Clientes
- [ ] Aceita cliente sem endereço completo
- [ ] Dedup por telefone
- [ ] Soft-delete ou hard-delete
- [ ] Tags/segmentação
- [ ] Aniversário do cliente
- [ ] Importação de clientes antigos

### 🟦 Módulo 05 — Logística
- [ ] Chave Google Maps API (já tem?)
- [ ] Otimização: Google API ou local
- [ ] Reordenar manualmente rota
- [ ] Coleta + entrega misturadas ou separadas
- [ ] Notificação "estamos chegando"
- [ ] Histórico de rotas

### 🟦 Módulo 06 — Estoque
- [ ] Categorização de peças
- [ ] Localização física
- [ ] Cadastro separado de fornecedores
- [ ] Múltiplas unidades (par, conjunto)
- [ ] Cálculo de custo médio
- [ ] IA pra NF: nível de validação
- [ ] Máquinas: 1 por unidade ou agrupadas

### 🟦 Módulo 07 — Financeiro
- [ ] Edição de lançamento previsto
- [ ] Caixa: dono pode editar com confirmação?
- [ ] Conciliação bancária
- [ ] Tratamento de reembolsos
- [ ] DRE em tempo real ou só relatório
- [ ] Despesas cartão: data compra ou fatura
- [ ] Folha automática ou manual
- [ ] Centros de custo

### 🟦 Módulo 08 — Relatórios IA
- [ ] Periodicidade padrão
- [ ] Comparação com período anterior
- [ ] IA: custos e cache
- [ ] Acesso por papel
- [ ] Formatos de export
- [ ] Critérios de "performance" de funcionário
- [ ] Mobile vale a pena

### 🟦 Módulo 09 — Configurações
- [ ] Estrutura da tabela (chave-valor ou JSON)
- [ ] Quem pode mexer
- [ ] Audit log
- [ ] Chaves de API: criptografadas ou env Vercel

### 🟦 Módulo 10 — Automações
- [ ] Lista completa de notificações
- [ ] Comandos ou conversa livre com IA
- [ ] Bot ou humano responde
- [ ] Horário comercial
- [ ] Custos Z-API
- [ ] Templates aprovados WhatsApp

### 🟦 Módulo 11 — Reativação
- [ ] Quantos meses = inativo
- [ ] Frequência das campanhas
- [ ] Mecanismo de opt-out
- [ ] Mensagem 100% IA ou template + IA
- [ ] Cupom de desconto: implementação
- [ ] LGPD

---

## 📌 PRÓXIMOS PASSOS IMEDIATOS

1. ✅ Você lê este plano v2.1 e confere o que mudou
2. ✅ **Módulo 00b parte 1 já aplicado** — 8 tabelas + auditoria + RLS + Storage no Supabase
3. ⏳ **Responder as 6 decisões pendentes do Módulo 00c** (Migração Mock → Supabase) com calma — algumas são simples (loading state), outras impactam arquitetura (react-query vs useState, realtime ou não)
4. ⏳ **Abrir um chat novo dedicado ao Módulo 00c**, anexando: instruções mestras + este plano + `App.jsx` atual
5. ⏳ Seguir a "Sequência de execução" do Módulo 00c (5 chats previstos)
6. ⏳ Depois disso o sistema **passa a funcionar de verdade** — Toni, Alessandro e Guilherme compartilham dados reais entre dispositivos
7. ⏳ Aí os Módulos 01, 02 e 03 ficam muito mais rápidos (UI já pronta, agora com banco real)

> 💡 **Dica**: o Módulo 00c é grande (3–5 chats), mas cada um é bem delimitado. Dá pra fazer um chat por dia/semana sem perder o fio. Cada chat entrega algo que **já funciona em produção**.

---

## 🗂 NAVEGAÇÃO NO OBSIDIAN

Sugestões de links pra criar entre arquivos do vault:
- `[[00 - Instruções Mestras]]` — referência principal (já atualizada com decisões do 00b)
- `[[Decisões respondidas]]` — arquivo separado pra você ir guardando respostas
- `[[Schema do banco]]` — opcional, documentar o schema final aplicado
- `[[Log de chats]]` — opcional, anotações de cada sessão de código

Tags úteis: `#idemaq` `#plano` `#módulo-00c` `#migração` `#supabase` `#pendente` `#decisão` `#sugestão`

---

*Fim do documento — versão 2.1 · 15/05/2026*

*Histórico: v1.0 (plano inicial) → v2.0 (revisão pós-código real) → v2.1 (Módulo 00b parte 1 aplicado com sucesso no Supabase)*
