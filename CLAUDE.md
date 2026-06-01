# CLAUDE.md — Sistema de Gestão IdeMaq

> Arquivo lido automaticamente em toda sessão. Aqui mora **só o que toda sessão precisa saber**.
> Detalhe vivo por área: `CONTEXTO PROJETO ATUALIZADO/contexto-<area>.md` — leia o seu baseado em `$env:IDEMAQ_TERMINAL`.

---

## 1. Início de sessão

1. `echo $env:IDEMAQ_TERMINAL` — descubra em qual terminal está
2. `git pull origin main` — puxa o que outros terminais enviaram
3. Leia `CONTEXTO PROJETO ATUALIZADO/contexto-<area>.md` correspondente
4. Antes de mexer em arquivos compartilhados (App.jsx, osData.js, theme.js), checar `git status`

## 1b. Fim de tarefa

1. Atualizar `contexto-<sua-area>.md` com o que mudou
2. Atualizar `CLAUDE.md` **só se** mudou regra de ouro / arquitetura / status macro (§11) / terminal
3. `git status --short` — revisar `??` untracked. Arquivo novo em `src/` importado por outro **entra no commit**
4. `git add <arquivos>` explícito (nunca `git add -A`)
5. Se criou arquivo novo importado: `npm run build` antes de push (evita quebrar Vercel)
6. `git commit -m "<tipo>(<area>): <descrição>"` → `git push origin main`

> **Por que o passo 3 é regra:** em 19/05, `osPatch.js` ficou untracked 1 dia → 8 builds do Vercel falharam com "Module not found" enquanto 7 terminais trabalhavam no vazio.

---

## 2. Índice de contextos

| Terminal | Área | Arquivo |
|---|---|---|
| `os` | OS / Kanban | `contexto-os.md` |
| `clientes` | Clientes | `contexto-clientes.md` |
| `estoque` | Estoque | `contexto-estoque.md` |
| `financeiro` | Financeiro | `contexto-financeiro.md` |
| `logistica` | Logística | `contexto-logistica.md` |
| `painel` | Painel (dono) | `contexto-painel.md` |
| `painel_func` | Painel Funcionários | `contexto-painel-func.md` |
| `relatorios` | Relatórios | `contexto-relatorios.md` |
| `vendas` | Vendas (histórico OS) | `contexto-vendas.md` |
| `ponto` | Ponto | `contexto-ponto.md` |
| `geral` | Cross-area | _(só este CLAUDE.md)_ |
| _(qualquer)_ | Construindo UI | `contexto-ui.md` |

**Terminal `geral`**: para tarefas cross-area. Antes de mexer em página específica, prefira o terminal dedicado.

**Criar terminal novo**: atalho `.lnk` em `TERMINAIS/` → atualizar tabela acima + criar `contexto-<area>.md`.

---

## 3. Regra de atualização dos contextos

- **`contexto-<sua-area>.md`** — SEMPRE ao fim de toda feature.
- **CLAUDE.md** — só se mudou regra de ouro / arquitetura / status macro / terminal / interseção estrutural.
- Feature toca 2+ áreas: atualiza cada `contexto-<x>.md` afetado.

---

## 4. Contexto do projeto

- **Empresa**: IDEMAQ Assistência Técnica LTDA (Naviraí/MS · 12 anos · ~50 OS/mês · meta R$ 20.000/mês)
- **Segmento**: manutenção e limpeza de máquinas de lavar; fabricação (refurbish) e venda
- **Dono**: Toni — **daltônico Deutan**, não técnico. Prefere interfaces visuais e simples.
- **Equipe**: Toni (dono/admin) · Alessandro (logística) · Guilherme (oficina)
- **Stack**: React + Vite + Supabase (PostgreSQL) + Vercel · Tabler Icons · Chart.js
- **Produção**: https://idemaq.vercel.app · **GitHub**: https://github.com/silvaantoniofabricio-glitch/idemaq
- **Supabase**: https://yfbbruxqfzgetapbvrgd.supabase.co (sa-east-1) · **Deploy**: automático ao push (~30s)
- **Workflow**: múltiplos terminais Claude Code em paralelo (atalhos `.lnk` em `TERMINAIS/`)

---

## 5. Arquitetura de pastas

```
src/
├── theme.js          ← TEMAS dark/claro + paleta Deutan (P) + useTheme()
├── supabase.js       ← cliente Supabase (NÃO mexer)
├── App.jsx           ← ToastProvider + BrowserRouter + AppLayout
├── styles/global.css ← .idemaq-card, animações, scrollbar
├── utils/
│   ├── fmt.js        ← fmtBRL, fmtPrazoCurto, fmtDataHora
│   ├── colors.js     ← corEtapa, bgEtapa, corHero, dividerColor
│   ├── osHelpers.js  ← podeMoverOS, calcStatusPrazo, estaPagaTotal, isAdmin
│   ├── osPatch.js    ← normalizePatchOS (UI→DB) + whitelist + COLUNAS_SAFE
│   ├── osData.js     ← TIPOS_OS, ETAPAS_TODOS, ZONAS, MENUS, FUNCIONARIOS
│   └── categoriasPeca.js
├── hooks/
│   ├── useOS.js           ← consulta + mutação + Realtime + updateOS — NÃO mexer
│   ├── useOSItens.js / useOSHistorico.js / useClientes.js
│   ├── useFinanceiro.js / usePecas.js / useUsuarios.js — NÃO mexer
├── components/
│   ├── ui/        ← biblioteca de primitivos — ver contexto-ui.md
│   ├── layout/    ← Sidebar, Topbar, BottomNav, AppLayout
│   ├── kanban/    ← KanbanBoard, KanbanColumn, KanbanCard
│   ├── painel/    ← Hero, KPICard, Pipeline, AlertasCriticos
│   ├── osDetalhe/ ← Modal OS (10 Ações + Tabs + Header)
│   ├── clientes/ · estoque/ · financeiro/
├── pages/         ← 1 arquivo por rota
│   └── mobile/
└── _legacy/       ← NÃO MEXER sem aprovação (NovaOSModal + OSDetalhe + PainelMobile)
```

---

## 6. Regras de ouro (não-negociáveis)

1. **Paleta Deutan obrigatória**: `#5B9BD5` azul · `#FFD966` amarelo · `#FF6B6B`/`#c04242` vermelho · `#B8CCE4` azul claro · verde só com indicador adicional.
2. **Nunca cor hardcoded** — use `T.textPrimary`/`T.card`/`T.border` (tokens) ou `P.blue`/`P.yellow` (paleta) ou `corEtapa()` (helpers).
3. **Tema via prop** (`T`, `dark`). Em página top-level: `useTheme()` de `theme.js`.
4. **Cards sempre via `<Card>`** — ativa sombra no light mode automaticamente.
5. **Ícones sempre Tabler** — `<i className="ti ti-nome">`. Nunca emoji.
6. **Filtros/abas/chips**: ativo = azul, inativo = cinza neutro. Nunca cor própria do tipo.
7. **Dark padrão desktop, light padrão mobile** — `useTheme()` cuida disso.
8. **Light mode estilo Conta Azul**: sombra suave, valores em preto puro negrito.
9. **Tipografia tabular**: `fontVariantNumeric: 'tabular-nums'` em valores R$ e contagens.
10. **Filtrar `deleted_at IS NULL`** em toda consulta Supabase.

---

## 7. Componentes UI

Ver `CONTEXTO PROJETO ATUALIZADO/contexto-ui.md` para lista completa com props e regras de uso.

---

## 8. Anti-patterns

- ❌ Não mexa em `_legacy/` sem aprovação explícita
- ❌ Não adicione dependências (`npm i`) sem aprovação
- ❌ Não faça limpezas ou melhorias não pedidas
- ❌ Não use cor hardcoded nem emoji como ícone
- ❌ Não recrie `useTheme`/`TEMAS`/`P` — importe de `theme.js`
- ❌ Não duplique lógica que já está em `osHelpers.js`
- ❌ Não dependa SÓ do Realtime — sempre **optimistic update** + rollback em erro

---

## 9. Regras de negócio universais

- **"Itens", não "peças"** — máquina, capa, mangueira, qualquer coisa é "item"
- **Link de pagamento = InfinitePay D+1** (Ton Black inviável)
- **Coluna "Concluído" = mês do calendário** (não 30 dias corridos)
- **Garantia = OS nova** com `garantia: true` + `os_origem_id`. Valor R$ 0. 90 dias padrão.
- **Sem responsável fixo** — cada etapa tem responsável lido de `os_historico`
- **3 usuários**: Toni (`dono`) · Alessandro (`logistica`) · Guilherme (`oficina`)
- **OS concluída/recusada some do Kanban ao virar o mês** (fechamento mensal) — visível via busca/relatórios/cliente
- **Drag-and-drop**: 1 etapa por vez. `Concluído` não volta. Use `podeMoverOS()`.
- **Datas UTC no banco** (`timestamptz`) — converter pra `America/Cuiaba` na UI
- **Auditoria automática** — não preencher `criado_em`/`atualizado_em` no front (trigger faz)

---

## 10. Visibilidade por papel (3 camadas)

`isAdmin(user)` de `osHelpers.js`. **Menu esconde · Rota bloqueia · RLS reforça.**

- **Menu**: `MENUS_ADMIN_ONLY = ['financeiro', 'relatorios']` em `Sidebar.jsx` + `BottomNav.jsx`
- **Rotas**: `<AdminOnly>` envolve `/financeiro` e `/relatorios` em `App.jsx`
- **Estoque**: `mostraValores = isAdmin(user)` esconde Custo/Margem/Capital. Funcionário vê só Qtd · Venda · Status
- **Etapas Pagamento e Concluído**: só dono (RLS também bloqueia)

---

## 11. Status macro

| Área | Status | Próximo passo |
|---|---|---|
| Kanban (OS) + OSDetalhe | ✅ Real + Realtime + 10 Ações + fotos | — |
| Painel dono + func | ✅ Real + meta diária + `configuracoes` | — |
| Clientes | ✅ Real (782) + modal lista OS | — |
| Logística | ✅ Mapa real + sidebar OS + OSDetalhe inline | — |
| Vendas | ✅ `/vendas` com lista + KPIs + Nova OS retroativa | Onda 2: importação CSV |
| Estoque | ✅ Real (680) + ajuste manual + histórico | — |
| Financeiro | ✅ Real + avulso/parcelado/recorrente + edição | — |
| Relatórios | ✅ 7 reais + DRE ligado ao Supabase | Deploy edge function `relatorio-ia` |
| Configurações | ✅ tabela chave/valor + `useConfiguracoes` | — |
| Ponto | ✅ Schema + hook + componentes | Funcionários começarem a bater |
| Schema parte 2 | ✅ sql/01–11 todos aplicados | — |
| Edge function `relatorio-ia` | ✅ Código pronto (`docs/deploy-edge-function-ia.md`) | Toni fazer deploy |
| Google Maps Places | ✅ Guia em `docs/setup-google-maps.md` | Toni criar API key no Vercel |

---

## 12. Convenções de código

- **PascalCase** para componentes; **camelCase** para utils
- Sempre validar sintaxe JSX antes de entregar
- Quando em dúvida sobre regra de negócio: **pergunte ao dono, nunca assuma**
- Supabase: sempre `.is('deleted_at', null)` em toda query

```js
import { supabase } from '../supabase'
const { data, error } = await supabase.from('cliente').select('*').is('deleted_at', null).order('nome')
```

---

## 13. Comunicação com o dono

- Toni não é técnico — explique de forma visual e simples
- Antes de mudanças não-triviais: descreva o plano em 3-5 linhas e espere "ok"
- Nunca crie funcionalidade não pedida. Sugestão? Marque como "sugestão", não aplique.
- Entrega padrão: arquivo completo pra copiar e colar

---

## 14. Checklist antes de entregar

- [ ] Cores via `T.*` / `P.*` / helpers (nunca hardcoded)?
- [ ] Containers via `<Card>`? Ícones via Tabler?
- [ ] Filtros ativos = azul, inativos = cinza?
- [ ] `fontVariantNumeric: 'tabular-nums'` em valores R$?
- [ ] Não toquei em `_legacy/`? Não criei variante nova de componente?
- [ ] JSX válido? Supabase filtra `deleted_at IS NULL`?
- [ ] Atualizei `contexto-<minha-area>.md`?
