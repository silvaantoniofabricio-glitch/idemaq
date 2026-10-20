# Handoff: Module Header Component

## Overview
Componente de cabeçalho padronizado para todos os módulos do ERP.
Substitui os 8 headers inconsistentes por um único padrão com 2 linhas fixas e 6 zonas de conteúdo.

## Sobre os arquivos de design
Os arquivos `.dc.html` neste pacote são **referências de design criadas em HTML** — protótipos que mostram aparência e comportamento pretendidos, não código de produção para copiar diretamente. A tarefa é **recriar esses designs no ambiente existente do codebase** (React, Vue, etc.) usando os padrões e bibliotecas já estabelecidos.

## Fidelidade
**Alta fidelidade (hifi):** Os protótipos têm cores finais, tipografia, espaçamento e interações. O desenvolvedor deve recriar a UI pixel a pixel usando as bibliotecas e padrões do codebase.

---

## Anatomia do Header

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Ícone] [Título]  |  métrica · métrica · ● alerta        [CTA]    │  ← Linha 1 (52px)
├─────────────────────────────────────────────────────────────────────┤
│  [Aba] [Aba] [Aba]  |  [Busca]  [Filtro▾]  [Filtro▾]              │  ← Linha 2 (36px)
└─────────────────────────────────────────────────────────────────────┘
```

### Zonas

| Zona | Linha | Posição | Conteúdo |
|------|-------|---------|----------|
| A | 1 | Esquerda | Ícone do módulo (28×28px) + Título (bold) |
| B | 1 | Centro-esquerda | Métricas-chave (máx. 4) + alertas em laranja |
| C | 1 | Direita | Ações secundárias (ghost button com ícone + label) |
| D | 1 | Direita | CTA primário (azul, "+ Verbo Substantivo") |
| E | 2 | Esquerda | Abas de navegação (sublinhado azul = ativa) |
| F | 2 | Direita do divisor | Busca + dropdowns de filtro |

---

## Regras Fixas

### ✅ Obrigatório
- Sempre **2 linhas** — nunca 1 ou 3
- Aba ativa = **apenas sublinhado azul** (nunca pill preenchido)
- CTA sempre no **canto superior direito**
- Filtros sempre **após a divisória vertical** na linha 2
- Alertas sempre com **ponto laranja ●** antes do texto
- Botões de ação secundária sempre com **ícone + label** (nunca icon-only)

### ❌ Proibido
- Filtros de dados na zona de abas (linha 2, lado esquerdo)
- Pill preenchido para indicar aba ativa
- Botões icon-only sem label ou tooltip
- Filtros de data/período no canto superior direito (zona D)
- 3ª linha de conteúdo

---

## Módulos e Configurações

### 1. Ordens de Serviço
```js
{
  icon: <OS_ICON>,
  title: "Ordens de serviço",
  stats: [
    { text: "62 ativas" },
    { text: "30 este mês" },
    { text: "2 garantia", alert: true }
  ],
  tabs: [
    { label: "Todas", count: 30 },
    { label: "Externo", count: 8 },
    { label: "Interno", count: 6 },
    { label: "Financeiro", count: 16 }
  ],
  filters: [
    { type: "search", placeholder: "Buscar OS..." },
    { type: "dropdown", label: "Prazo" },
    { type: "dropdown", label: "Tipo" },
    { type: "dropdown", label: "Categoria" },
    { type: "dropdown", label: "Status" }
  ],
  primaryAction: { label: "+ Criar OS" }
}
```

### 2. Logística
```js
{
  icon: <LOGISTICS_ICON>,
  title: "Logística",
  stats: [
    { text: "5 OS" },
    { text: "5 sem rota", alert: true }
  ],
  tabs: [
    { label: "Agenda" },
    { label: "Coleta", count: 1 },
    { label: "Entrega", count: 4 },
    { label: "A receber" }
  ],
  filters: [
    { type: "dropdown", label: "Hoje / Atrasadas", active: true },
    { type: "dropdown", label: "Período" },
    { type: "dropdown", label: "Motorista" },
    { type: "search", placeholder: "Buscar OS..." }
  ],
  secondaryActions: [{ icon: <EXTERNAL_ICON>, label: "Abrir mapa" }],
  primaryAction: { label: "+ Nova rota" }
}
```

### 3. Financeiro
```js
{
  icon: <FINANCE_ICON>,
  title: "Financeiro",
  stats: [
    { text: "R$ 11.670", suffix: "saldo", valueColor: true },
    { text: "R$ 3.180 a receber", color: "green" },
    { text: "R$ 9.920 a pagar", color: "red" },
    { text: "1 vencida", alert: true }
  ],
  tabs: [
    { label: "Caixa" },
    { label: "A receber", count: 10 },
    { label: "A pagar", count: 165 }
  ],
  filters: [
    { type: "dropdown", label: "Mês atual", active: true },
    { type: "dropdown", label: "Tipo" },
    { type: "dropdown", label: "Conta" },
    { type: "search", placeholder: "Buscar movimentação..." }
  ],
  primaryAction: { label: "+ Novo lançamento" }
}
```

### 4. Vendas
```js
{
  icon: <SALES_ICON>,
  title: "Vendas",
  stats: [
    { text: "R$ 8.740", suffix: "faturado", valueColor: true },
    { text: "58 OS" },
    { text: "R$ 257 ticket médio" },
    { text: "R$ 3.180 a receber", alert: true }
  ],
  tabs: [
    { label: "Todas" },
    { label: "Orçamentos" },
    { label: "Aprovadas" },
    { label: "Concluídas" }
  ],
  filters: [
    { type: "dropdown", label: "Mês atual", active: true },
    { type: "dropdown", label: "Tipo" },
    { type: "dropdown", label: "Status" },
    { type: "dropdown", label: "Pagto" },
    { type: "search", placeholder: "Cliente, nº OS, equipamento..." }
  ],
  primaryAction: { label: "+ Nova OS" }
}
```

### 5. Estoque
```js
{
  icon: <STOCK_ICON>,
  title: "Estoque",
  stats: [
    { text: "43 referências" },
    { text: "427 itens" },
    { text: "R$ 4.126", suffix: "em itens", valueColor: true }
  ],
  tabs: [
    { label: "Itens" },
    { label: "Máquinas" }
  ],
  filters: [
    { type: "search", placeholder: "Buscar por nome, SKU..." },
    { type: "dropdown", label: "Categoria" },
    { type: "dropdown", label: "Fornecedor" },
    { type: "dropdown", label: "Estoque" }
  ],
  secondaryActions: [
    { icon: <IMPORT_ICON>, label: "Importar" },
    { icon: <EXPORT_ICON>, label: "Exportar" }
  ],
  primaryAction: { label: "+ Novo item" }
}
```

### 6. Relatórios
```js
{
  icon: <REPORTS_ICON>,
  title: "Relatórios",
  stats: [
    { text: "8 relatórios" },
    { text: "2 com IA", color: "purple" }
  ],
  tabs: [
    { label: "Fin. Mensal" },
    { label: "Geral" },
    { label: "Operacional" },
    { label: "Estoque" },
    { label: "Vendas" },
    { label: "DRE" },
    { label: "Funcionários" },
    { label: "Ponto" }
  ],
  filters: [
    { type: "dropdown", label: "Mês atual", active: true }
  ],
  secondaryActions: [{ icon: <EXPORT_ICON>, label: "Exportar" }]
  // Sem primaryAction — módulo consultivo
}
```

### 7. Clientes
```js
{
  icon: <CLIENTS_ICON>,
  title: "Clientes",
  stats: [
    { text: "1.000 cadastrados" }
  ],
  tabs: [
    { label: "Todos", count: 1000 },
    { label: "Ativos", count: 840 },
    { label: "Inativos", count: 160 }
  ],
  filters: [
    { type: "search", placeholder: "Buscar por nome, telefone ou endereço..." },
    { type: "dropdown", label: "Cidade" },
    { type: "dropdown", label: "Tipo" },
    { type: "pagination", text: "1–30 de 1.000" }
  ],
  primaryAction: { label: "+ Novo cliente" }
}
```

### 8. Financeiro PF
```js
{
  icon: <HOME_ICON>,
  title: "Financeiro PF",
  stats: [
    { text: "R$ 13.905", suffix: "gasto real", valueColor: true },
    { text: "182 lançamentos" }
  ],
  tabs: [
    { label: "Dashboard" },
    { label: "Planilha" },
    { label: "Análise" }
  ],
  filters: [
    { type: "dropdown", label: "Maio / 2026", active: true },
    { type: "dropdown", label: "Perfil: Total (casal)" }
  ],
  primaryAction: { label: "+ Novo lançamento" }
}
```

---

## Design Tokens

```css
/* Estrutura */
--header-height-row1: 52px;
--header-height-row2: 36px;
--header-bg: #141416;
--header-border: #222226;
--header-row-divider: #1e1e22;
--header-padding-x: 20px;

/* Tipografia */
--header-title-size: 14px;
--header-title-weight: 700;
--header-title-color: #ffffff;

--header-stat-size: 12px;
--header-stat-weight: 400;
--header-stat-color: #666666;
--header-stat-value-color: #aaaaaa;
--header-stat-value-weight: 500;

--header-alert-color: #f97316;
--header-alert-dot-size: 5px;

--header-sep-color: #2a2a30;

/* Abas */
--tab-size: 12.5px;
--tab-weight: 500;
--tab-color-default: #555555;
--tab-color-hover: #aaaaaa;
--tab-color-active: #ffffff;
--tab-indicator-color: #2563eb;
--tab-indicator-height: 2px;
--tab-count-bg: #1e1e24;
--tab-count-color: #444444;
--tab-count-bg-active: rgba(59, 130, 246, 0.15);
--tab-count-color-active: #3b82f6;

/* Filtros */
--filter-divider-color: #222226;
--filter-height: 22px;
--filter-bg: #1a1a1e;
--filter-border: #26262c;
--filter-border-hover: #38383f;
--filter-color: #777777;
--filter-color-hover: #aaaaaa;
--filter-active-bg: #0f1e3a;
--filter-active-border: #2563eb;
--filter-active-color: #60a5fa;
--filter-radius: 4px;
--filter-font-size: 11px;

/* Botões */
--btn-height: 28px;
--btn-radius: 5px;
--btn-font-size: 12px;
--btn-font-weight: 600;

--btn-primary-bg: #1d4ed8;
--btn-primary-bg-hover: #1e40af;
--btn-primary-color: #ffffff;

--btn-secondary-bg: transparent;
--btn-secondary-border: #2e2e34;
--btn-secondary-border-hover: #44444c;
--btn-secondary-color: #999999;
--btn-secondary-color-hover: #cccccc;
```

---

## Interações & Comportamento

### Abas
- Click na aba → `activeTab` state muda → underline azul move para aba clicada
- Conteúdo da página abaixo do header re-renderiza com base na aba ativa
- **Nunca** usar transição de pill preenchido — apenas `border-bottom` muda

### Filtros dropdown
- Click abre popover com opções
- Filtro ativo: borda azul `#2563eb`, fundo `#0f1e3a`, texto `#60a5fa`
- Filtro inativo: borda `#26262c`, fundo `#1a1a1e`, texto `#777`
- Ao selecionar uma opção, o label do dropdown atualiza com o valor escolhido + chevron

### Busca
- Input com ícone de lupa à esquerda (posição absoluta, `left: 7px`)
- Focus: `border-color: #2563eb`
- Placeholder: `#444`

### Métricas (Linha 1)
- Valores monetários importantes: `color: #aaa; font-weight: 500`
- Sufixos descritivos ("saldo", "faturado"): `color: #444; font-size: 10px`
- Alertas: ponto laranja `●` + texto `color: #f97316`
- Separador entre métricas: `·` com `color: #333`
- Separador entre título e métricas: linha vertical `1px #2a2a30`

---

## Arquivos de Referência

- `Headers Redesenhados.dc.html` — protótipo interativo com todos os 8 módulos
- `Header Analysis.dc.html` — análise comparativa antes/depois com anatomia anotada
- `module-header.css` — todos os tokens + estilos do componente prontos para usar
- `module-header.js` — componente vanilla JS configurável

---

## Assets

Todos os ícones dos módulos são SVGs inline (14×14px). Ver arquivo `module-header.js` para os SVGs de cada módulo. Ícones de UI (busca, chevron, importar, exportar) também são SVGs inline minimalistas.
