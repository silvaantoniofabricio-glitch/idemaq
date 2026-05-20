# CLAUDE.md — Sistema de Gestão IdeMaq

> Arquivo lido automaticamente pelo Claude Code em toda sessão deste projeto.
> Aqui mora **só o que toda sessão precisa saber**: regras de ouro, arquitetura, anti-patterns, índice dos contextos por área.
> **Detalhe vivo da área que você está mexendo está em `CONTEXTO PROJETO ATUALIZADO/contexto-<area>.md`** — leia esse arquivo no início da sessão baseado em `$env:IDEMAQ_TERMINAL`.

---

## 1. Início de toda sessão — checklist

1. Rode `echo $env:IDEMAQ_TERMINAL` pra saber em qual terminal você está
2. Leia `CONTEXTO PROJETO ATUALIZADO/contexto-<area>.md` correspondente
3. Antes de mexer em arquivos compartilhados (App.jsx, osData.js, theme.js, índices), checar `git status` pra não conflitar com outra sessão em paralelo

---

## 2. Índice de contextos (mãe → filhos)

Cada terminal tem env var `IDEMAQ_TERMINAL` + um doc dedicado em `CONTEXTO PROJETO ATUALIZADO/`. Leia o seu antes de codar.

| Terminal | Área | Arquivo | Foco |
|---|---|---|---|
| `os` | OS Idemaq | `contexto-os.md` | Kanban, OSDetalhe, 10 ações, regras de fluxo |
| `clientes` | Clientes Idemaq | `contexto-clientes.md` | CRUD cliente, importação Bling, schema real |
| `estoque` | Estoque Idemaq | `contexto-estoque.md` | Peças (BCM), máquinas, baixa automática |
| `financeiro` | Financeiro Idemaq | `contexto-financeiro.md` | Lançamentos, contas, taxas, schema parte 2 |
| `logistica` | Logística Idemaq | `contexto-logistica.md` | Rotas, Maps Places, fotos coleta/entrega |
| `painel` | Painel Idemaq | `contexto-painel.md` | Dashboard executivo (DONO) |
| `painel_func` | Painel Funcionários | `contexto-painel-func.md` | Painel operacional (funcionário — não implementado) |
| `relatorios` | Relatórios Idemaq | `contexto-relatorios.md` | 6 relatórios + 2 com Claude API |
| `ponto` | Ponto Idemaq | `contexto-ponto.md` | Relógio de ponto (especificação completa em `idemaq-modulo-ponto-CLAUDE-CODE.md`) |
| `geral` | Geral Idemaq | _(só este CLAUDE.md)_ | Coringa cross-area, sem foco fixo |

**Terminal `geral`**: não tem `contexto-geral.md` próprio — este CLAUDE.md já é "o geral". Usar pra tarefas cross-area (schema parte 2, infra, refactors trans-módulo, atualização dos próprios docs). Antes de mexer em arquivo de uma página específica, prefira abrir o terminal dedicado da área.

**Padrão pra criar terminal novo**: atalho `.lnk` em `TERMINAIS/` com `cmd /c start "" wt.exe --title "<Nome>" -d "...idemaq" powershell -NoExit -Command "$env:IDEMAQ_TERMINAL = '<area>'; ...banner...; claude"`. Atualizar esta tabela + criar `contexto-<nova-area>.md` + memória `project_terminais_dedicados` ao criar.

---

## 3. Regra de atualização dos contextos (importante)

**Toda feature termina com 2 atualizações:**

1. **`contexto-<sua-area>.md`** — SEMPRE. Detalhe completo da mudança fica aqui.

2. **CLAUDE.md** — **SÓ SE**:
   - Mudou regra de ouro / arquitetura / anti-pattern
   - Status macro da área mudou (mock → pronto, etc — atualize a seção 11)
   - Decisão afeta outra área (deixe ponteiro nos contextos relevantes)
   - Adicionou/removeu terminal

**Se a feature toca 2+ áreas**: atualiza cada `contexto-<x>.md` afetado. Adiciona 1 linha no CLAUDE.md só se for interseção estrutural.

---

## 4. Contexto do projeto

- **Empresa**: IDEMAQ Assistência Técnica LTDA (Naviraí/MS · 12 anos · ~50 OS/mês · meta R$ 20.000/mês)
- **Segmento**: manutenção e limpeza de máquinas de lavar; também faz fabricação (refurbish) e venda
- **Dono**: Toni — **daltônico Deutan**, não técnico. Prefere interfaces visuais e simples.
- **Equipe**: Toni (dono/admin) · Alessandro (logística) · Guilherme (oficina)
- **Stack**: React + Vite + Supabase (PostgreSQL) + Vercel · Tabler Icons · Chart.js · react-router-dom
- **Produção**: https://idemaq.vercel.app
- **GitHub**: https://github.com/silvaantoniofabricio-glitch/idemaq
- **Supabase**: https://yfbbruxqfzgetapbvrgd.supabase.co (sa-east-1)
- **Deploy**: automático ao `git push origin main` (~30s)
- **Workflow**: Toni trabalha com **múltiplos terminais Claude Code em paralelo** (atalhos `.lnk` em `TERMINAIS/`).

---

## 5. Arquitetura de pastas

```
src/
├── theme.js                  ← TEMAS dark/claro + paleta Deutan (P) + useTheme()
├── supabase.js               ← cliente Supabase (NÃO mexer)
├── main.jsx                  ← entry Vite (importa global.css + App)
├── App.jsx                   ← composição: ToastProvider + BrowserRouter + AppLayout
│
├── styles/global.css         ← .idemaq-card, animações, scrollbar, Inter+Tabler via @import
│
├── utils/
│   ├── fmt.js                ← fmtBRL, fmtPrazoCurto, fmtDataHora
│   ├── colors.js             ← corEtapa, bgEtapa, corHero, dividerColor
│   ├── osHelpers.js          ← regras: podeMoverOS, calcStatusPrazo, estaPagaTotal, isAdmin
│   ├── osPatch.js            ← normalizePatchOS (UI→DB) + whitelist + COLUNAS_SAFE
│   ├── osData.js             ← TIPOS_OS, ETAPAS_TODOS, ZONAS, MENUS, FUNCIONARIOS, mocks
│   └── categoriasPeca.js     ← lista canônica de categorias (espelha AcaoDiagnostico)
│
├── hooks/
│   ├── useOS.js              ← consulta + mutação + Realtime + updateOS — NÃO mexer
│   ├── useOSItens.js         ← itens da OS
│   ├── useOSHistorico.js     ← histórico de etapas
│   ├── useClientes.js        ← CRUD de cliente + criarClientePersist standalone
│   ├── useFinanceiro.js      ← lançamentos (ainda mock)
│   ├── usePecas.js           ← CRUD de peça com filtros server-side
│   └── useUsuarios.js        ← lista de usuários — NÃO mexer
│
├── components/
│   ├── ui/                   ← biblioteca de primitivos (Card, Button, Badge…)
│   ├── layout/               ← Sidebar, Topbar, BottomNav, AppLayout
│   ├── kanban/               ← KanbanBoard, KanbanColumn, KanbanCard, filtros
│   ├── painel/               ← Hero, KPICard, Pipeline, AlertasCriticos (do DONO)
│   ├── osDetalhe/            ← Modal OS (10 Ações + Tabs + Header + RelatorioDiagnostico)
│   ├── os/                   ← OSDrawer lateral (legado, não usado)
│   ├── clientes/             ← ClienteDetalheModal
│   ├── estoque/              ← PecaDetalheModal · MaquinaDetalheModal · NovaPecaModal
│   └── financeiro/           ← LancamentoDetalheModal
│
├── pages/                    ← 1 arquivo por rota
│   └── mobile/               ← versões mobile (re-exports do _legacy hoje)
│
└── _legacy/                  ← NÃO MEXER sem aprovação
    ├── desktopKanbanModals.jsx   ← NovaOSModal + OSDetalhe verbatim
    └── mobileComponents.jsx      ← PainelMobile + OSMobile + PullToRefresh + BottomSheet
```

### `_legacy/` — regra absoluta
~1300 linhas extraídas verbatim do App.jsx monolítico. Funcionam, mas não estão refatorados. **Nunca mexa em arquivos de `_legacy/` sem aprovação explícita do dono.**

---

## 6. Regras de ouro (não-negociáveis)

1. **Paleta Deutan obrigatória**. Cores válidas: `#5B9BD5` azul · `#FFD966` amarelo · `#FF6B6B`/`#c04242` vermelho · `#B8CCE4` azul claro · verde só com indicador adicional (ícone+texto). Nunca usar vermelho/verde puros sem reforço de forma.
2. **Nunca cor hardcoded** em componentes. Use `T.textPrimary`, `T.card`, `T.border` (tokens) OU `P.blue`, `P.yellow` (paleta) OU `corEtapa('blue', dark)` (helpers semânticos).
3. **Tema via prop**: passe `T` e `dark` por prop. Em top-level (página inteira) use `useTheme()` do `theme.js`.
4. **Cards sempre via `<Card>`** — ele aplica `className="idemaq-card"` automaticamente, o que ativa sombra no light mode via CSS global.
5. **Ícones sempre Tabler** — `<i className="ti ti-nome">`. **Nunca emoji.**
6. **Filtros/abas/chips**: ativo = azul (`corEtapa('blue', dark)`), inativo = cinza neutro (`T.textMuted` + `T.border`). **Nunca usar cor própria do tipo nos filtros.**
7. **Dark padrão no desktop, light padrão no mobile** — o `useTheme()` faz isso sozinho.
8. **Light mode estilo Conta Azul**: cards com sombra suave (não bordas), valores em destaque em **preto puro e negrito**, não cinza. O CSS global cuida quando você usa `<Card>`.
9. **Tipografia tabular para números**: sempre `fontVariantNumeric: 'tabular-nums'` em valores R$ e contagens.
10. **Filtrar `deleted_at IS NULL`** em toda consulta Supabase (soft-delete).

---

## 7. Componentes UI disponíveis (`@/components/ui`)

- **`Card`** — container padrão com `idemaq-card`. Props: `T`, `dark`, `padding`, `radius`, `accent` (borda lateral colorida), `hover`.
- **`SubCard`** — card secundário (background `cardAlt`). Usar dentro de outro Card.
- **`Button`** — 4 variantes: `primary` (gradient azul) · `secondary` · `ghost` · `danger`. Tamanhos `sm`/`md`/`lg`. Props `iconLeft`/`iconRight`.
- **`Badge`** — variantes semânticas (`azul`/`amarelo`/`vermelho`/`verde`/`neutro`) ou cores livres.
- **`StatusBadge`** — status pré-definidos: `vencido`, `hoje`, `amanha`, `2dias`, `esgotado`, `critico`, `baixo`, `atrasada`, `pago`.
- **`CountBadge`** — numérico pequeno (azul ou vermelho).
- **`Modal`** + **`ModalHeader`** — overlay padrão (ESC + click-fora fecham). Mobile: bottom sheet.
- **`Tabs`** — segmented control (`segmented` ou `underline`). Padrão "ativo = azul".
- **`ChipToggle`** — chip filtro on/off (sempre azul ativo).
- **`Input`**, **`Select`**, **`Textarea`** — form fields com label opcional + ícone. Foco em azul.
- **`EmptyState`** — ícone + título + descrição + ação opcional. Use em listas vazias.
- **`PageHeader`** — título grande + subtítulo + stats inline + ações à direita. Use no topo de toda página.
- **`SectionHeader`** + **`SectionAction`** — cabeçalho de seção (label uppercase) dentro de Card.
- **`Sparkline`** — mini gráfico inline SVG (área + linha).
- **`DeltaPill`** — pill ↗ +12% verde / ↘ -3% vermelho.
- **`ToastProvider`** + **`useToast()`** — `notify('ok'|'erro'|'info', 'mensagem')`. Some em 3.2s.

---

## 8. Anti-patterns (o que NÃO fazer)

- ❌ **Não crie variações de Card/Button/Badge** — se faltar uma variante, peça aprovação primeiro pra adicionar ao componente base.
- ❌ **Não use styled-components, Tailwind, CSS Modules, emotion**. Padrão é `style={{}}` inline + `className="idemaq-card"` + `global.css`.
- ❌ **Não use emoji como ícone** — sempre Tabler (`ti ti-nome`).
- ❌ **Não recrie `useTheme`** nem `TEMAS` nem `P` — sempre importe de `theme.js`.
- ❌ **Não mexa em `_legacy/`** sem aprovação explícita.
- ❌ **Não adicione dependências** (`npm i ...`) sem aprovação.
- ❌ **Não faça "limpezas" ou "melhorias" não pedidas**. Edite só o que foi pedido.
- ❌ **Não use cor hardcoded** (`#fff`, `#000`, `red`, etc.). Sempre via `T.*`, `P.*` ou helpers.
- ❌ **Não duplique lógica** que já está em `utils/osHelpers.js`.
- ❌ **Não use `<select>`/`<input>`/`<button>` cru** quando há `<Select>`/`<Input>`/`<Button>` na lib.

---

## 9. Regras de negócio universais (toda tela precisa saber)

- **"Itens", não "peças"** — máquina, capa, mangueira, qualquer coisa é "item".
- **Link de pagamento = InfinitePay D+1** (Ton Black tem link de 30 dias — inviável, não usar).
- **Coluna "Concluído" = mês do calendário** (não 30 dias corridos). Busca escapa o filtro.
- **Garantia = OS NOVA** com `garantia: true` e `os_origem_id` apontando pra OS original. Valor padrão R$ 0. 90 dias padrão.
- **Sem responsável fixo por OS** — cada etapa tem seu próprio responsável (lido de `os_historico`).
- **3 usuários**: Toni (`dono`, admin total) · Alessandro (`logistica`) · Guilherme (`oficina`).
- **OS some do Kanban 24h após concluída** — visível via busca, relatórios, ficha do cliente.
- **Drag-and-drop**: 1 etapa por vez (frente ou trás). `Concluído` não volta por drag. Use `podeMoverOS()` antes de mover.
- **Filtrar `deleted_at IS NULL`** em toda consulta de tabela principal.
- **Datas no banco em UTC** (`timestamptz`); converter pra `America/Cuiaba` na UI quando precisar.
- **Auditoria automática**: NÃO preencher `criado_em`/`criado_por`/`atualizado_em` no front — trigger do banco faz isso.

---

## 10. Visibilidade por papel (defesa em 3 camadas)

Camada de UI baseada em `isAdmin(user)` de `utils/osHelpers.js`. **Menu esconde · Rota bloqueia · RLS no banco reforça.**

- **Menu** (`Sidebar.jsx` + `BottomNav.jsx`): filtram `MENUS` removendo `financeiro` e `relatorios` pra funcionário. Constante `MENUS_ADMIN_ONLY = ['financeiro', 'relatorios']` no topo de cada arquivo.
- **Rotas** (`App.jsx`): componente `<AdminOnly user={...}>` envolve `/financeiro` e `/relatorios` (desktop + mobile). Funcionário digita URL na mão → redireciona pro Painel.
- **Estoque** (`pages/Estoque.jsx` + `PecaDetalheModal` + `MaquinaDetalheModal`): prop `mostraValores = isAdmin(user)` esconde Custo, Lucro/Margem, Valor em peças, Capital parado, Composição do custo, Custo un./Total. Funcionário vê só **Qtd · Venda · Status**.
- **Etapas Pagamento e Concluído do Kanban** só visíveis pro dono (RLS no banco também bloqueia).
- Rodapé da Sidebar mostra "Administrador" pro dono e "Funcionário" pros demais.

---

## 11. Status macro (semáforo — detalhe em cada `contexto-<area>.md`)

| Área | Status | Próximo passo macro |
|---|---|---|
| Painel (dono) | ✅ Real (Onda 1) | Mover meta R$ 20k pra `configuracoes` (Mod. 09); badge `demo` some quando SQL 01 rodar |
| Painel Funcionários | ✅ Implementado — botão de ponto presente, ajustes pontuais | Trocar mocks (`_mocks.js`) por queries reais quando schema `ponto_registro` subir |
| Kanban (OS) | ✅ Real + Realtime | — |
| OSDetalhe + 10 Ações | ✅ Schema parte 2 plugado | Aplicar SQL 05 no Supabase (Toni) + foto pro Storage privado |
| Clientes | 🟢 Real (782) | ClienteDetalheModal listar OS + commit do v3 |
| Logística | 🟢 Real (hook + Places) | Aplicar `sql/06-rota.sql` + setar `VITE_GOOGLE_MAPS_KEY` |
| Estoque | 🟢 Real (680) | UPDATE via modal + baixa automática |
| Financeiro | 🟡 Mock Bling-style | Rodar SQL 01 + ligar `useFinanceiro` real |
| Relatórios | 🟢 4 reais (Geral/Operacional/Estoque/Vendas) | DRE + Funcionários com Claude API |
| Ponto | 🔴 Não implementado | Ler spec + criar schema + componentes |
| Schema parte 2 | 🟡 Parcial | SQL 01 pendente; SQL 05 (checklist_etapa + falha_teste) **plugado no front 19/05 — falta Toni aplicar no Supabase SQL Editor** |

---

## 12. Convenções de código

- Arquivos: **PascalCase** para componentes (`Card.jsx`, `Painel.jsx`); **camelCase** para utils (`osHelpers.js`, `fmt.js`).
- Imports relativos: `../components/ui`, `../utils/colors`. Se alias `@/` estiver configurado no `vite.config.js`, pode usar.
- **Sempre validar sintaxe** antes de entregar — não mande JSX quebrado.
- Quando em dúvida sobre **regra de negócio**: **pergunte ao dono, nunca assuma.**

### Padrão de conexão com Supabase
```js
import { supabase } from '../supabase'

const { data, error } = await supabase
  .from('cliente')
  .select('*')
  .is('deleted_at', null)
  .order('nome');
```

---

## 13. Comunicação com o dono

- Toni **não é técnico** — explique de forma visual e simples.
- **Antes de mudanças não-triviais**: descreva o plano em 3-5 linhas e espere "ok" antes de aplicar.
- **Nunca crie funcionalidade não pedida.** Mil "nãos" por um "sim".
- **Modo de entrega padrão**: arquivo completo pra copiar e colar (e fazer `git push`).
- **Modo alternativo** (só quando ele pedir): blocos `LOCALIZAR / SUBSTITUIR POR` em `.md`, para mudanças pequenas e cirúrgicas.
- Quando achar que pode haver melhoria não pedida: **sugira marcando como "sugestão"**, não aplique.

---

## 14. Checklist antes de entregar código

- [ ] Usei `T.*` / `P.*` / helpers em vez de cor hardcoded?
- [ ] Usei `<Card>` em todo container visual?
- [ ] Ícones todos Tabler (`ti ti-nome`)?
- [ ] Filtros ativos = azul, inativos = cinza neutro?
- [ ] Valores R$ com `fontVariantNumeric: 'tabular-nums'`?
- [ ] Não criei variante nova de componente base?
- [ ] Não toquei em `_legacy/`?
- [ ] Sintaxe JSX válida (parênteses, tags fechadas)?
- [ ] Consulta Supabase filtra `deleted_at IS NULL`?
- [ ] Comportamento de drag-and-drop usa `podeMoverOS()`?
- [ ] **Atualizei `contexto-<minha-area>.md`?** (sempre)
- [ ] **Mudei status macro / regra / interseção? Atualizei CLAUDE.md?** (condicional)

Se algum item falhou, **não entregue ainda** — corrija primeiro.
