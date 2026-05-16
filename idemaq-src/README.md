# Idemaq — biblioteca de componentes refatorada

Arquivos prontos pra colar em `src/`. Visual e comportamento 100% idênticos ao App.jsx monolítico atual.

## 📁 Estrutura

```
src/
├── theme.js                    ← tokens dark/claro + paleta Deutan + useTheme()
├── supabase.js                 ← (manter o seu, já existe)
├── styles/
│   └── global.css              ← .idemaq-card, animações, scrollbar, Inter+Tabler
├── utils/
│   ├── fmt.js                  ← fmtBRL, fmtPrazoCurto
│   ├── colors.js               ← corEtapa, bgEtapa, corHero, dividerColor
│   ├── osHelpers.js            ← regras de negócio (podeMoverOS, calcStatusPrazo etc)
│   └── osData.js               ← TIPOS_OS, ETAPAS_TODOS, ZONAS, MENUS, mocks
├── components/
│   ├── ui/                     ← biblioteca de UI primitives
│   │   ├── Card.jsx
│   │   ├── Button.jsx
│   │   ├── Badge.jsx
│   │   ├── Modal.jsx
│   │   ├── Tabs.jsx
│   │   ├── Toast.jsx
│   │   ├── Input.jsx
│   │   ├── Select.jsx
│   │   ├── Textarea.jsx
│   │   ├── EmptyState.jsx
│   │   ├── PageHeader.jsx
│   │   ├── SectionHeader.jsx
│   │   ├── Sparkline.jsx
│   │   ├── DeltaPill.jsx
│   │   └── index.js
│   ├── layout/                 ← Sidebar, Topbar, AppLayout (com react-router)
│   │   ├── Sidebar.jsx
│   │   ├── Topbar.jsx
│   │   ├── TopbarMobile.jsx
│   │   ├── BottomNav.jsx
│   │   ├── NavItem.jsx
│   │   └── AppLayout.jsx
│   ├── kanban/                 ← KanbanBoard, KanbanColumn, KanbanCard, filtros
│   │   ├── KanbanBoard.jsx
│   │   ├── KanbanColumn.jsx
│   │   ├── KanbanCard.jsx
│   │   ├── KanbanFilters.jsx
│   │   ├── KanbanSkeleton.jsx
│   │   └── SubStatus.jsx
│   └── painel/                 ← widgets do Painel
│       ├── HeroFaturamento.jsx
│       ├── HojeSidekick.jsx
│       ├── KPICard.jsx
│       ├── PipelineOS.jsx
│       ├── AlertasCriticos.jsx
│       └── ProximasParadasTimeline.jsx
├── pages/
│   ├── Painel.jsx              ← usa componentes do design system
│   ├── Kanban.jsx              ← desktop OS — usa KanbanColumn da lib
│   ├── Login.jsx
│   ├── EmConstrucao.jsx
│   └── mobile/
│       ├── PainelMobile.jsx    ← re-export do _legacy
│       └── OSMobile.jsx        ← re-export do _legacy
├── _legacy/                    ← componentes pendentes de refatoração
│   ├── desktopKanbanModals.jsx ← NovaOSModal + OSDetalhe + helpers
│   └── mobileComponents.jsx    ← PainelMobile + OSMobile + PullToRefresh + BottomSheet + OSCardMobile
├── hooks/                      ← (manter os seus, já existem: useOS, useUsuarios)
├── App.jsx                     ← novo entry, react-router-dom
└── main.jsx                    ← novo entry point Vite
```

## 🚀 Como aplicar

1. **Backup do App.jsx atual** — `cp src/App.jsx src/App.legacy.jsx`
2. **Instalar router** (se ainda não estiver) — `npm i react-router-dom`
3. **Copiar a pasta `idemaq-src/` em cima de `src/`**, preservando `src/supabase.js` e `src/hooks/` que já existem.
4. **Verificar que `src/main.jsx` foi substituído** — agora ele importa `./styles/global.css` em vez do antigo `./index.css` (você pode deletar ou esvaziar o antigo).
5. **Remover `src/index.css`** (ou esvaziar) — tudo agora em `src/styles/global.css`.
6. **Rodar `npm run dev`** — visual deve estar idêntico ao anterior.
7. **`git add . && git commit -m "Refactor: componentes modulares" && git push`** — Vercel publica.

## 🧱 Como usar a biblioteca em telas novas

Exemplo de uma tela nova (Clientes):

```jsx
import { useTheme } from '@/theme'
import {
  Card, Button, Badge, Input, EmptyState, PageHeader,
} from '@/components/ui'

export default function Clientes() {
  const { T, dark } = useTheme()
  return (
    <div style={{ padding: '20px 24px', flex: 1, overflow: 'auto' }}>
      <PageHeader T={T} dark={dark}
        title="Clientes"
        subtitle="12 cadastrados"
        stats={[
          { label: 'Ativos', value: 8, color: '#5B9BD5' },
          { label: 'Hoje',   value: 2 },
        ]}
        actions={<Button variant="primary" iconLeft="ti-plus">Novo cliente</Button>}
      />

      <Card T={T} dark={dark} style={{ marginTop: 14 }}>
        <Input T={T} dark={dark} label="Buscar" icon="ti-search" placeholder="Nome ou telefone…" />
      </Card>

      <EmptyState T={T} icon="ti-users" title="Sem clientes" description="Cadastre o primeiro." />
    </div>
  )
}
```

Padrões a manter sempre:
- **Tema via prop** (`T`, `dark`) ou via `useTheme()` em componentes top-level
- **Nunca cor hardcoded** — usar `T.*` (tokens) ou `P.*` (paleta) ou `corEtapa()/bgEtapa()`
- **Filtros ativos sempre azul** — `<ChipToggle ativo cor="blue" />` (default)
- **Cards visuais** — `<Card>` (recebe className `idemaq-card` automaticamente)
- **Ícones** — sempre Tabler (`ti ti-nome`)

## 📋 Decisões que tomei

1. **Tema via prop, não Context** — mantém o padrão atual (`T`, `dark` por prop). Os componentes top-level usam `useTheme()` pra pegar os valores.
2. **Roteamento por URL com `react-router-dom`** — substitui o `useState('painel')` antigo. URLs: `/`, `/os`, `/clientes` etc. Sidebar agora navega via `useNavigate`.
3. **`_legacy/` pra componentes complexos não-refatorados** — NovaOSModal, OSDetalhe, OSMobile, PainelMobile e seus auxiliares (~1300 linhas) ficaram **verbatim** num só arquivo cada. Funcionam idênticos, mas pendem refatoração futura.
4. **`global.css` aplica `.idemaq-card` via classe no `<html>`** (`idemaq-theme-claro`) — antes era injetado por `useEffect` no App.jsx. Resultado é o mesmo, mas SSR-safe e sem JS extra.
5. **Inter e Tabler Icons via `@import`** em `global.css` — antes eram carregados em outro lugar; consolidei.
6. **`utils/osData.js` separado de `utils/osHelpers.js`** — dados estáticos (TIPOS_OS, mocks) vs funções (calcStatusPrazo etc). Mais fácil de versionar.
7. **`_fontPainel`, `useInterFont()` removidos** — fonte agora vem do `global.css`, então qualquer componente herda automaticamente.

## ⚠️ Notas finais

- Os hooks `useOS` e `useUsuarios` em `src/hooks/` continuam onde estavam, não foram tocados.
- `src/supabase.js` não foi tocado.
- Os componentes em `_legacy/` ainda usam o estilo "tudo inline + prop drilling de T/dark". Refatorar cada um em sessões dedicadas com o Claude Code mantém o risco baixo.
- Se algo quebrar: o backup `src/App.legacy.jsx` é o fallback imediato.
