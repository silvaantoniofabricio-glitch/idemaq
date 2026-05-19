# CLAUDE.md — Sistema de Gestão IdeMaq

> Arquivo lido automaticamente pelo Claude Code em toda sessão deste projeto.
> Se você vai criar/editar código aqui, **leia este arquivo inteiro antes de fazer qualquer coisa**.

---

## 1. Contexto do projeto

> **Workflow**: Toni trabalha com **múltiplos terminais Claude Code em paralelo** (atalhos `.lnk` em `TERMINAIS/` na raiz do projeto, 1 por feature — movidos do Desktop em 18/05/2026). Antes de mexer em arquivos compartilhados (App.jsx, osData.js, theme.js, índices), checar `git status` pra evitar conflito com outra sessão em curso. Os 5 docs canônicos vivem em `CONTEXTO PROJETO ATUALIZADO/` — atualizar lá ao fim de cada bloco relevante.
>
> **Terminais dedicados** (identificar via env var `IDEMAQ_TERMINAL` no início da sessão — rode `echo $env:IDEMAQ_TERMINAL` na primeira oportunidade pra saber em qual terminal está):
> - `painel` → "Painel Idemaq" · foco em `src/pages/Painel.jsx` e `src/components/painel/*` (Hero, KPICard, Pipeline, AlertasCriticos, etc.) — **painel do DONO (Toni)**: dashboard executivo, métricas, alertas críticos.
> - `painel_func` → "Painel Funcionarios Idemaq" · **painel diferente, pros funcionários** (Alessandro logística, Guilherme oficina). **Feature nova, ainda não implementada** — quando começar, criar `src/pages/PainelFuncionarios.jsx` + componentes próprios em `src/components/painelFuncionarios/` (não reusar `painel/` que é do dono). Foco em visão operacional do dia: tarefas atribuídas, OS em andamento por papel, próximas paradas (pra Alessandro), checklist de oficina (pra Guilherme), meta diária pessoal.
> - `os` → "OS Idemaq" · foco em `src/components/osDetalhe/` (modal + 10 Ações por etapa), `src/components/kanban/`, `src/pages/Kanban.jsx`, regras de fluxo de OS.
> - `clientes` → "Clientes Idemaq" · foco em `src/pages/Clientes.jsx`, `src/components/clientes/ClienteDetalheModal.jsx`, e cadastro completo via `NovoClienteModalCompleto` (em `_legacy/desktopKanbanModals.jsx` — só ler/referenciar). Priorizar listagem, busca, ficha e histórico de OS por cliente.
> - `logistica` → "Logistica Idemaq" · foco em `src/pages/Logistica.jsx`, futura integração Google Maps Places, tabela `rota` (Schema parte 2). Priorizar paradas do dia, otimização de rota, marcar parada concluída.
> - `estoque` → "Estoque Idemaq" · foco em `src/pages/Estoque.jsx` (Peças + Máquinas em tabs). Priorizar CRUD de peças, máquinas, baixa automática, alerta de estoque mínimo. Quando o Módulo 06 do plano avançar, também `src/components/estoque/*`.
> - `financeiro` → "Financeiro Idemaq" · foco em `src/pages/Financeiro.jsx`, futura tabela `lancamento_financeiro` (Schema parte 2). Priorizar contas a receber, a pagar, caixa, lançamentos avulsos/parcelados/recorrentes, inadimplência, meta diária.
> - `relatorios` → "Relatorios Idemaq" · foco em `src/pages/Relatorios.jsx`, 6 relatórios (Geral/Operacional/Estoque/Vendas/DRE/Funcionários) e integração Claude API pros 2 com IA (DRE e Funcionários).
> - `ponto` → "Ponto Idemaq" · foco em **Módulo Relógio de Ponto**. **Especificação completa em `CONTEXTO PROJETO ATUALIZADO/idemaq-modulo-ponto-CLAUDE-CODE.md`** (17 seções, ~22KB) — ler ANTES de codar. Resumo: 2 tabelas novas (`ponto_registro` + `jornada_funcionario`), RLS por usuário, geolocalização obrigatória (sem selfie), painel diferente pros funcionários (substitui financeiro que eles não veem), relatório só pro dono em Relatórios → Relógio de Ponto, banco de horas, falta automática. Dono NÃO bate ponto. Componentes em `src/components/ponto/*` + `src/components/paineis/PainelFuncionario.jsx`.
> - **Padrão pra criar novos**: atalho `.lnk` em `TERMINAIS/` com `cmd /c start "" wt.exe --title "<Nome>" -d "...idemaq" powershell -NoExit -Command "$env:IDEMAQ_TERMINAL = '<area>'; ...banner...; claude"`. Atualizar esta tabela + memória `project_terminais_dedicados` ao criar.

- **Empresa**: IDEMAQ Assistência Técnica LTDA (Naviraí/MS · 12 anos · ~50 OS/mês · meta R$ 20.000/mês)
- **Segmento**: manutenção e limpeza de máquinas de lavar; também faz fabricação (refurbish) e venda
- **Dono**: Toni — **daltônico Deutan**, não técnico. Prefere interfaces visuais e simples.
- **Equipe**: Toni (dono/admin) · Alessandro (logística) · Guilherme (oficina)
- **Stack**: React + Vite + Supabase (PostgreSQL) + Vercel · Tabler Icons · Chart.js · react-router-dom
- **Produção**: https://idemaq.vercel.app
- **GitHub**: https://github.com/silvaantoniofabricio-glitch/idemaq
- **Deploy**: automático ao `git push origin main` (~30s)

---

## 2. Arquitetura de pastas

```
src/
├── theme.js                  ← TEMAS dark/claro + paleta Deutan (P) + useTheme()
├── supabase.js               ← cliente Supabase (NÃO mexer)
├── main.jsx                  ← entry Vite (importa global.css + App)
├── App.jsx                   ← composição: ToastProvider + BrowserRouter + AppLayout
│
├── styles/
│   └── global.css            ← .idemaq-card, animações, scrollbar, Inter+Tabler via @import
│
├── utils/
│   ├── fmt.js                ← fmtBRL, fmtPrazoCurto, fmtDataHora
│   ├── colors.js             ← corEtapa, bgEtapa, corHero, dividerColor
│   ├── osHelpers.js          ← regras: podeMoverOS, calcStatusPrazo, estaPagaTotal, isAdmin
│   └── osData.js             ← TIPOS_OS, ETAPAS_TODOS, ZONAS, MENUS, FUNCIONARIOS, mocks
│
├── hooks/
│   ├── useOS.js              ← consulta + mutação de OS (Supabase) — NÃO mexer
│   └── useUsuarios.js        ← lista de usuários — NÃO mexer
│
├── components/
│   ├── ui/                   ← biblioteca de primitivos (Card, Button, Badge…)
│   ├── layout/               ← Sidebar, Topbar, BottomNav, AppLayout (com router)
│   ├── kanban/               ← KanbanBoard, KanbanColumn, KanbanCard, filtros
│   ├── painel/               ← Hero, KPICard, Pipeline, AlertasCriticos, etc.
│   ├── osDetalhe/            ← Modal central de detalhe da OS (em uso no Kanban)
│   │   ├── OSDetalhe.jsx     ← modal 780px · 3 abas (Etapa/Resumo/Pagamento)
│   │   ├── Header.jsx        ← badges, OS#, cliente, timeline, abas
│   │   ├── Footer.jsx        ← Voltar / Avançar etapa
│   │   ├── HistoricoPanel.jsx ← painel sobreposto cronológico
│   │   ├── Timeline.jsx      ← timeline horizontal das etapas
│   │   ├── FormRecebimento.jsx ← PIX/Cartão/Misto/A prazo (usado em PagamentoTab)
│   │   ├── RelatorioDiagnostico.jsx ← bloco compartilhado por AcaoOrcamento e AcaoOficina
│   │   │                              (defeito + causa + chips troca/man + helper
│   │   │                               itensMarcadosDoDiag + map ITENS_DIAG)
│   │   ├── tabs/             ← EtapaTab · ResumoTab · PagamentoTab · _PlaceholderTab
│   │   └── acoes/            ← 1 componente por etapa, registrado em EtapaTab.MAP
│   │                            (Agendamento/Recebido/Diagnostico/Orcamento/Oficina/
│   │                             Teste/Entrega/Pagamento/Concluido/Recusada + BlocoAcao)
│   ├── os/                   ← OSDrawer lateral (legado, não usado no Kanban atual)
│   ├── clientes/             ← ClienteDetalheModal (ficha completa do cliente)
│   ├── estoque/              ← PecaDetalheModal · MaquinaDetalheModal · NovaPecaModal
│   └── financeiro/           ← LancamentoDetalheModal (modal único receber/pagar/caixa)
│
├── pages/
│   ├── Painel.jsx            ← Painel principal (usa components/painel/*)
│   ├── Kanban.jsx            ← OS desktop (usa components/kanban/* + osDetalhe/)
│   ├── Clientes.jsx          ← listagem + busca + cadastro (mocks)
│   ├── Logistica.jsx         ← paradas do dia + placeholder de mapa (mocks)
│   ├── Estoque.jsx           ← Peças + Máquinas em tabs + modal de detalhe (mocks)
│   ├── Financeiro.jsx        ← Visão/Receber/Pagar/Caixa — layout Bling-style (mocks)
│   ├── Relatorios.jsx        ← hub + 6 relatórios com KPI/Sparkline (mocks)
│   ├── Login.jsx             ← tela de login
│   ├── EmConstrucao.jsx      ← placeholder para rotas ainda vazias
│   └── mobile/               ← versões mobile (atualmente re-exports do _legacy)
│
└── _legacy/                  ← componentes herdados não-refatorados
    ├── desktopKanbanModals.jsx   ← NovaOSModal + OSDetalhe (verbatim do App.jsx antigo)
    └── mobileComponents.jsx      ← PainelMobile + OSMobile + PullToRefresh + BottomSheet
```

### `_legacy/` — regra absoluta

`_legacy/` contém ~1300 linhas extraídas verbatim do App.jsx monolítico. **Funcionam, mas não estão refatorados.** **Nunca mexa em arquivos de `_legacy/` sem aprovação explícita do dono.** Se precisar alterar visual de NovaOSModal/OSDetalhe/OSMobile/PainelMobile, abra uma sessão dedicada com o dono.

---

## 3. Regras de ouro (não-negociáveis)

1. **Paleta Deutan obrigatória**. Cores válidas: `#5B9BD5` azul · `#FFD966` amarelo · `#FF6B6B`/`#c04242` vermelho · `#B8CCE4` azul claro · verde só com indicador adicional (ícone+texto). Nunca usar vermelho/verde puros sem reforço de forma.
2. **Nunca cor hardcoded** em componentes. Use `T.textPrimary`, `T.card`, `T.border` (tokens) OU `P.blue`, `P.yellow` (paleta) OU `corEtapa('blue', dark)` (helpers semânticos).
3. **Tema via prop**: passe `T` e `dark` por prop. Em top-level (página inteira) use `useTheme()` do `theme.js`.
4. **Cards sempre via `<Card>`** — ele aplica `className="idemaq-card"` automaticamente, o que ativa sombra no light mode via CSS global.
5. **Ícones sempre Tabler** — `<i className="ti ti-nome">`. **Nunca emoji.**
6. **Filtros/abas/chips**: ativo = azul (`corEtapa('blue', dark)`), inativo = cinza neutro (`T.textMuted` + `T.border`). **Nunca usar cor própria do tipo nos filtros.**
7. **Dark padrão no desktop, light padrão no mobile** — o `useTheme()` faz isso sozinho.
8. **Light mode estilo Conta Azul**: cards com sombra suave (não bordas), valores em destaque (R$, totais) em **preto puro e negrito**, não cinza. O CSS global cuida disso quando você usa `<Card>`.
9. **Tipografia tabular para números**: sempre `fontVariantNumeric: 'tabular-nums'` em valores R$ e contagens.
10. **Filtrar `deleted_at IS NULL`** em toda consulta Supabase (soft-delete).

---

## 4. Como criar uma tela nova

### Passo a passo

1. Criar `src/pages/MinhaPagina.jsx` (PascalCase).
2. Importar primitivos da biblioteca (`@/components/ui`).
3. Adicionar rota em `src/App.jsx` (dentro do `<RoutesDesktop>` e `<RoutesMobile>` se aplicável).
4. Adicionar item em `src/utils/osData.js` no array `MENUS` (a Sidebar lê de lá).
5. Visual deve "sair pronto" — não decida cor, padrão ou layout. Use os componentes como bloquinhos.

### Componentes UI disponíveis (`@/components/ui`)

- **`Card`** — container padrão com `idemaq-card`. Props: `T`, `dark`, `padding`, `radius`, `accent` (borda lateral colorida), `hover`.
- **`SubCard`** — card secundário (background `cardAlt`). Usar dentro de outro Card.
- **`Button`** — 4 variantes: `primary` (gradient azul) · `secondary` · `ghost` · `danger`. Tamanhos `sm`/`md`/`lg`. Props `iconLeft`/`iconRight`.
- **`Badge`** — variantes semânticas (`azul`/`amarelo`/`vermelho`/`verde`/`neutro`) ou cores livres.
- **`StatusBadge`** — para status pré-definidos: `vencido`, `hoje`, `amanha`, `2dias`, `esgotado`, `critico`, `baixo`, `atrasada`, `pago`.
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

### Adicionar AÇÃO numa etapa da OS

O modal `OSDetalhe` tem 3 abas (Etapa / Resumo / Pagamento). A aba **Etapa** delega pra um componente em `components/osDetalhe/acoes/` baseado em `os.etapa`. Pra adicionar etapa nova ou enriquecer ação existente:

1. Criar `components/osDetalhe/acoes/AcaoMinhaEtapa.jsx` recebendo `{ T, dark, os, onMoverOS, onUpdateOS, setAba }`
2. Usar `<BlocoAcao T={T} dark={dark} icon="ti-..." etapa="Nome" descricao="...">` como wrapper (mantém o visual "FAZER AGORA · ETAPA")
3. Exportar de `acoes/index.js`
4. Registrar em `tabs/EtapaTab.MAP[etapa_id]`
5. Pra avançar a OS: `onMoverOS(os.numero, proximaEtapaId)` (id unificado de `ETAPAS_TODOS`). Pra salvar campos: `onUpdateOS(os.numero, { campo: valor })`.

### Status atual das telas (18/05/2026)

| Tela / Componente | Estado | Próximo passo |
|---|---|---|
| Painel | ✅ Refatorado | — |
| Kanban (OS) | ✅ UI pronta | Persistir drag-and-drop (Módulo 00c) |
| OSDetalhe + 10 Ações | ✅ **Header redesenhado** (foto 72x72 + nome cliente big + contato + equipamento); Diagnostico (checklist 2x2), Orcamento (editor + PDF + WhatsApp), Oficina (3 etapas sincronizadas + bloqueio cruzado + banner falhas do teste), **Teste (checklist 4 testes × OK/Defeito/Barulho + Acabamento condicional polimento/limpeza/enceramento se há limpeza no orçamento)**, **Entrega (2 fases: aguardando agendar → agendada com WhatsApp pro cliente)**, Concluido (resumo final + botão OS de garantia), Recusada (3 decisões), Pagamento (FormRecebimento real). **Resumo Tab completa**: banners contextuais, mini-cards de prazo, RelatorioDiagnostico compartilhado (defeito+causa+chips), orçamento admin-only, histórico recente, observações. | Save real no Supabase (Módulo 03) |
| Clientes | 🟡 Mock visual | Conectar à tabela `cliente` |
| Logística | 🟡 Mock visual | Google Maps Places API + tabela `rota` |
| Estoque | 🟡 Mock + NovaPecaModal (validação + preview de margem) + gate `mostraValores = isAdmin(user)` end-to-end + **filtro por categoria** (chips horizontais espelhando o checklist do diagnóstico — válvula/eletrobomba/trava da porta/etc., agrupados em 6 grupos em `utils/categoriasPeca.js`) + badge da categoria inline na linha da peça | Conectar a `peca` e `maquina`, baixa automática |
| Financeiro | 🟡 Mock reformulado **Bling-style** (filtros período/status/categoria/conta · KPI strip · tabela ordenável + checkbox + menu ⋯ · bulk action bar · caixa com saldo running) + **`LancamentoDetalheModal`** (3 tipos: receber/pagar/caixa) com baixa/excluir e **confirmação anti-clique-acidental** ([Voltar] no rodapé) | Tabela `lancamento_financeiro` (Schema parte 2) + edição real |
| Relatórios | 🟡 Mock visual + 2 com badge IA + **calendário no filtro** (`<input type="month">` mês específico OU dois `<input type="date">` intervalo livre; presets desativam quando custom selecionado; subtítulo da página reflete período real) | Queries reais + Claude API |

### Visibilidade por papel (18/05/2026)

Camada de UI baseada em `isAdmin(user)` de `utils/osHelpers.js`. **Defesa em 3 camadas** — menu esconde, rota bloqueia, RLS no banco (Módulo 03) reforça.

- **Menu** (`Sidebar.jsx` e `BottomNav.jsx`): filtram `MENUS` removendo `financeiro` e `relatorios` pra funcionário. Constante `MENUS_ADMIN_ONLY = ['financeiro', 'relatorios']` no topo de cada arquivo — adicionar IDs aqui pra esconder mais.
- **Rotas** (`App.jsx`): componente `<AdminOnly user={...}>` envolve `/financeiro` e `/relatorios` (desktop + mobile). Se funcionário digitar URL na mão, redireciona pro Painel.
- **Estoque** (`pages/Estoque.jsx` + `PecaDetalheModal` + `MaquinaDetalheModal`): prop `mostraValores = isAdmin(user)` esconde Custo, Lucro/Margem, Valor em peças, Capital parado, Composição do custo, Custo un./Total da tabela de itens. Funcionário vê só **Qtd · Venda · Status**.
- Rodapé da Sidebar mostra "Administrador" pro dono e "Funcionário" pros demais.

### Regras específicas da etapa "Em oficina" (AcaoOficina)

- **Card de Limpeza** só ativo se orçamento tem item com `/limpeza/i` no nome
- **Card de Manutenção** só ativo se orçamento tem qualquer item NÃO-limpeza
- Cada lado tem 3 etapas: **Desmontagem · Limpeza/Serviço · Montagem**
- **Desmontagem e Montagem são sincronizadas** entre os dois cards (mesma máquina física) — marcar num lado marca no outro. Ícone `ti-arrows-left-right` "↔" indica visualmente.
- **Serviço da Manutenção** = checklist dos itens marcados no Diagnóstico (peça troca, peça manutenção). Se diagnóstico vazio, mostra aviso pra completar.
- **Segurança cruzada da Montagem** (anti-erro do técnico): pra montar, o serviço do outro lado precisa estar 100% concluído. Mensagem: "Aguardando Limpeza" ou "Aguardando Manutenção".
- Estados sincronizam com `os.limpeza` / `os.manutencao` (`pendente`/`andamento`/`concluido`) e `os.oficina_execucao` (jsonb com todos os checks).
- **Falhas do Teste**: se a OS volta do `Teste final` com falhas (campo `os.teste_falhas`), aparece banner vermelho no topo do AcaoOficina listando cada falha pra técnico saber o que corrigir.

### Categorias de peça (Estoque)

Lista canônica em `src/utils/categoriasPeca.js` — espelha o checklist do AcaoDiagnostico pra técnico encontrar peças do tipo certo. 6 grupos: motor, água, elétrico, estrutura, externo (capa/filtro/tampa — não estão no diag), outros. Ao adicionar categoria, refletir também em `RelatorioDiagnostico.jsx` (`ITENS_DIAG`) e `AcaoDiagnostico.jsx` (`GRUPOS`). Cadastro de peça (`NovaPecaModal`) tem campo obrigatório de categoria com `<optgroup>` por grupo. SKU e quantidades agora são opcionais (default 0, qtdMaxima auto = min × 3).

### Header do OSDetalhe (18/05/2026)

Linha 2 do header redesenhada — foto da máquina + bloco info estruturado:

- **Foto 72x72** à esquerda. Lê de `os.pre_diagnostico.foto` (base64 do AcaoRecebido). Click numa foto existente → abre `FotoAmpliadaModal` (overlay rgba(0,0,0,0.85), Esc/click-fora fecham). Click no placeholder vazio → abre input file pra escolher imagem (mesma lógica do AcaoRecebido). Salva via `onUpdateOS`.
- **Bloco info** à direita (3 linhas):
  1. Nome cliente grande (17px, fonte 700) — clique abre toast "Cadastro do cliente em breve" (TODO trocar por modal quando `FormClienteEdit` for criado)
  2. Contato 11.5px cinza — `ti-phone` + telefone (click WhatsApp) · `ti-map-pin` + endereço (click Maps). Chunks individuais clicáveis.
  3. Equipamento 12px — `ti-device-washing-machine` azul + Marca·Modelo (strong) + (série) cinza + · defeito. Click abre toast (TODO `FormEquipamentoEdit`).
- Timeline com `border-top` separando do bloco novo.

### Tabs do OSDetalhe

- **Etapa**: delega pra `acoes/AcaoXxx.jsx` baseado em `os.etapa` (10 Ações registradas em `EtapaTab.MAP`)
- **Resumo**: contexto do caso (não duplica Cliente/Equipamento que já vivem no Header). Usa `RelatorioDiagnostico` compartilhado pro bloco de diagnóstico. Orçamento admin-only.
- **Pagamento**: itens + recebimento (FormRecebimento real)

### Etapas com formulário estruturado

**Recebido (Pré-diagnóstico)**: 4 testes × OK/Defeito/Barulho + textarea obs + **foto da coleta** (input file → base64 → preview com botão trocar/remover, salva em `os.pre_diagnostico.foto`).

**Teste final**: MESMO checklist do Recebido (4 testes × OK/Defeito/Barulho) + **Acabamento condicional** (3 toggles: Polimento · Limpeza final · Enceramento) que aparece SÓ se orçamento tem limpeza. Aprovar só libera com todos os testes OK E (se aplicável) todo acabamento marcado. Falhas (defeito/barulho) geram `os.teste_falhas` automaticamente.

**Entrega**: 2 fases — (1) Aguardando agendar entrega com form data/hora/responsável/obs salvando em `os.entrega_data` etc; (2) Entrega agendada com card resumo + botão WhatsApp pro cliente + botão Confirmar entrega (vai pra Pagamento ou direto Concluído se já paga) + Reagendar.

### Exemplo completo: tela de Clientes

```jsx
// src/pages/Clientes.jsx
import React, { useState } from 'react'
import { supabase } from '../supabase'
import { useTheme, P } from '../theme'
import { corEtapa, corHero } from '../utils/colors'
import { fmtPrazoCurto } from '../utils/fmt'
import {
  Card, Button, Badge, Modal, ModalHeader,
  Input, EmptyState, PageHeader, SectionHeader,
  useToast,
} from '../components/ui'

export default function Clientes() {
  const { T, dark } = useTheme()
  const notify = useToast()
  const [busca, setBusca] = useState('')
  const [modalNovo, setModalNovo] = useState(false)
  const [clientes, setClientes] = useState([
    { id: 1, nome: 'Ana Reis',    fone: '(67) 9 9911-1010', cidade: 'Naviraí/MS', osCount: 3, ultimaOS: '2026-05-10' },
    { id: 2, nome: 'João Costa',  fone: '(67) 9 9922-2020', cidade: 'Naviraí/MS', osCount: 5, ultimaOS: '2026-05-12' },
    { id: 3, nome: 'Carlos Lima', fone: '(67) 9 9933-3030', cidade: 'Naviraí/MS', osCount: 1, ultimaOS: '2026-05-08' },
  ])

  const filtrados = clientes.filter(c =>
    !busca.trim() ||
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.fone.includes(busca)
  )

  return (
    <div style={{
      padding: '20px 24px 32px', overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Clientes"
        subtitle={`${clientes.length} cadastrados`}
        stats={[
          { label: 'Ativos',       value: clientes.length, color: corEtapa('blue', dark) },
          { label: 'OS no mês',    value: 9 },
          { label: 'Inadimplentes', value: 0, color: corEtapa('red', dark) },
        ]}
        actions={
          <Button variant="primary" iconLeft="ti-plus" onClick={() => setModalNovo(true)}>
            Novo cliente
          </Button>
        }
      />

      <Card T={T} dark={dark}>
        <Input T={T} dark={dark}
          value={busca} onChange={setBusca}
          icon="ti-search"
          placeholder="Buscar por nome ou telefone…"
        />
      </Card>

      {filtrados.length === 0 ? (
        <EmptyState T={T}
          icon="ti-user-off"
          title="Nenhum cliente encontrado"
          description={busca ? `Sem resultados para "${busca}"` : 'Cadastre o primeiro cliente.'}
          action={!busca && <Button variant="primary" iconLeft="ti-plus" onClick={() => setModalNovo(true)}>Cadastrar</Button>}
        />
      ) : (
        <Card T={T} dark={dark} padding={0}>
          <SectionHeader T={T} dark={dark} icon="ti-users" mb={0}
            action={<span style={{ fontSize: 11, color: T.textMuted }}>{filtrados.length} de {clientes.length}</span>}
          >Lista</SectionHeader>
          {filtrados.map((c, i) => (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto',
              gap: 14, alignItems: 'center',
              padding: '12px 16px',
              borderTop: i === 0 ? `1px solid ${T.border}` : `1px solid ${T.border}`,
              cursor: 'pointer',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: corHero(dark) }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{c.fone} · {c.cidade}</div>
              </div>
              <Badge variant="azul" dark={dark}>{c.osCount} OS</Badge>
              <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                Última: {fmtPrazoCurto(c.ultimaOS)}
              </span>
              <Button variant="ghost" size="sm" iconRight="ti-chevron-right">Abrir</Button>
            </div>
          ))}
        </Card>
      )}

      {modalNovo && (
        <Modal T={T} dark={dark} onClose={() => setModalNovo(false)} maxWidth={480}>
          <ModalHeader T={T} title="Novo cliente" icon="ti-user-plus" onClose={() => setModalNovo(false)} />
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input T={T} dark={dark} label="Nome completo" placeholder="Ex: Maria Silva" required />
            <Input T={T} dark={dark} label="Telefone" placeholder="(67) 9 0000-0000" icon="ti-phone" required />
            <Input T={T} dark={dark} label="Endereço" placeholder="Rua, número, bairro" icon="ti-map-pin" />
          </div>
          <div style={{
            padding: 14, borderTop: `1px solid ${T.border}`,
            display: 'flex', gap: 8, justifyContent: 'flex-end',
          }}>
            <Button variant="secondary" T={T} dark={dark} onClick={() => setModalNovo(false)}>Cancelar</Button>
            <Button variant="primary" iconLeft="ti-check" onClick={() => {
              notify('ok', 'Cliente cadastrado')
              setModalNovo(false)
            }}>Salvar</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

Para adicionar essa página:

```jsx
// src/App.jsx — dentro de <RoutesDesktop>
<Route path="/clientes" element={<Clientes />} />
```

```js
// src/utils/osData.js — em MENUS
{ id: 'clientes', label: 'Clientes', icon: 'ti-user', section: 'principal' },
```

---

## 5. Anti-patterns (o que NÃO fazer)

- ❌ **Não crie variações de Card/Button/Badge** — se faltar uma variante, peça aprovação primeiro pra adicionar ao componente base.
- ❌ **Não use styled-components, Tailwind, CSS Modules, emotion**. O padrão é `style={{}}` inline + `className="idemaq-card"` + `global.css`. Mantém zero dependência de CSS-in-JS.
- ❌ **Não use emoji como ícone** — sempre Tabler (`ti ti-nome`).
- ❌ **Não recrie `useTheme`** nem `TEMAS` nem `P` — sempre importe de `theme.js`.
- ❌ **Não mexa em `_legacy/`** sem aprovação explícita.
- ❌ **Não adicione dependências** (`npm i ...`) sem aprovação. O dono confirma antes.
- ❌ **Não faça "limpezas" ou "melhorias" não pedidas**. Edite só o que foi pedido.
- ❌ **Não use cor hardcoded** (`#fff`, `#000`, `red`, etc.). Sempre via `T.*`, `P.*` ou helpers.
- ❌ **Não duplique lógica** que já está em `utils/osHelpers.js` (regras de OS, cálculo de prazo, etc.).
- ❌ **Não use `<select>`/`<input>`/`<button>` cru** quando há `<Select>`/`<Input>`/`<Button>` na lib.

---

## 6. Regras de negócio que toda tela precisa saber

- **"Itens", não "peças"** — máquina, capa, mangueira, qualquer coisa é "item".
- **Link de pagamento = InfinitePay D+1** (Ton Black tem link de 30 dias — inviável, não usar).
- **Coluna "Concluído" = mês do calendário** (não 30 dias corridos). Busca escapa o filtro.
- **Garantia = OS NOVA** com `garantia: true` e `os_origem_id` apontando pra OS original. Valor padrão R$ 0. 90 dias padrão.
- **Sem responsável fixo por OS** — cada etapa tem seu próprio responsável (lido de `os_historico`).
- **3 usuários**: Toni (`dono`, admin total) · Alessandro (`logistica`) · Guilherme (`oficina`).
- **OS some do Kanban 24h após concluída** — visível via busca, relatórios, ficha do cliente.
- **Etapas Pagamento e Concluído** só visíveis pro dono (RLS no banco já bloqueia).
- **Funcionários não veem valores financeiros**: em qualquer tela que mostre custo/lucro/margem/capital, gateie via `mostraValores = isAdmin(user)` (de `utils/osHelpers.js`) — esconda colunas, blocos, breakdowns. Funcionário enxerga só quantidade + preço de venda. RLS protege os dados no banco, mas a UI também precisa mascarar pra não confundir/expor números sensíveis ao Alessandro/Guilherme. Já aplicado em `Estoque.jsx` + `PecaDetalheModal` + `MaquinaDetalheModal`.
- **Drag-and-drop**: 1 etapa por vez (frente ou trás). `Concluído` não volta por drag. Use `podeMoverOS()` antes de mover.
- **Filtrar `deleted_at IS NULL`** em toda consulta de tabela principal.
- **Datas no banco em UTC** (`timestamptz`); converter pra `America/Cuiaba` na UI quando precisar.

---

## 7. Convenções de código

- Arquivos: **PascalCase** para componentes (`Card.jsx`, `Painel.jsx`); **camelCase** para utils (`osHelpers.js`, `fmt.js`).
- Imports relativos: `../components/ui`, `../utils/colors`. (Se o alias `@/` estiver configurado no `vite.config.js`, pode usar `@/components/ui` — confirme antes.)
- **Sempre validar sintaxe** antes de entregar — não mande JSX quebrado.
- Auditoria automática: NÃO preencher `criado_em`/`criado_por`/`atualizado_em` no front — trigger do banco faz isso.
- Quando em dúvida sobre **regra de negócio**: **pergunte ao dono, nunca assuma.**

---

## 8. Comunicação com o dono

- Toni **não é técnico** — explique de forma visual e simples.
- **Antes de mudanças não-triviais**: descreva o plano em 3-5 linhas e espere "ok" antes de aplicar.
- **Nunca crie funcionalidade não pedida.** Mil "nãos" por um "sim".
- **Modo de entrega padrão**: arquivo completo pra copiar e colar (e fazer `git push`).
- **Modo alternativo** (só quando ele pedir): blocos `LOCALIZAR / SUBSTITUIR POR` em `.md`, para mudanças pequenas e cirúrgicas.
- Quando achar que pode haver melhoria não pedida: **sugira marcando como "sugestão"**, não aplique.

---

## 9. Checklist antes de entregar código

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

Se algum item falhou, **não entregue ainda** — corrija primeiro.
