/**
 * ModuleHeader — Componente vanilla JS
 * ERP System — Padronização de Headers
 *
 * Uso:
 *   const header = new ModuleHeader('#app', CONFIGS.ordens);
 *   header.setActiveTab(2);
 *   header.setStats([...]);
 *
 * Ou via HTML:
 *   <div data-module-header="ordens"></div>
 *   ModuleHeader.autoInit();
 */

/* ── Ícones SVG por módulo ─────────────────────────────────── */
const MODULE_ICONS = {
  ordens: {
    bg: '#1d3a6e',
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="2" stroke="#4a90e2" stroke-width="1.3"/>
      <path d="M4 5h6M4 7.5h4" stroke="#4a90e2" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`
  },
  logistica: {
    bg: '#0f3a2e',
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 5h8v6H1zM9 7l3 1.5v2.5H9z" stroke="#10b981" stroke-width="1.3" stroke-linejoin="round"/>
      <circle cx="3.5" cy="11.5" r="1" fill="#10b981"/>
      <circle cx="10.5" cy="11.5" r="1" fill="#10b981"/>
    </svg>`
  },
  financeiro: {
    bg: '#3a2900',
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="#f59e0b" stroke-width="1.3"/>
      <path d="M4 7h6M7 5v4" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`
  },
  vendas: {
    bg: '#2a1a4a',
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 10l3-3 3 2 4-5" stroke="#8b5cf6" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  },
  estoque: {
    bg: '#0a2e38',
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L13 4v6L7 13 1 10V4z" stroke="#06b6d4" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M7 1v12M1 4l6 3 6-3" stroke="#06b6d4" stroke-width="1.1" stroke-linejoin="round"/>
    </svg>`
  },
  relatorios: {
    bg: '#2a1a30',
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="5" width="3" height="8" rx=".8" fill="#ec4899" opacity=".8"/>
      <rect x="5.5" y="2" width="3" height="11" rx=".8" fill="#ec4899"/>
      <rect x="10" y="7" width="3" height="6" rx=".8" fill="#ec4899" opacity=".6"/>
    </svg>`
  },
  clientes: {
    bg: '#0a2e28',
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="5" cy="4.5" r="2.5" stroke="#14b8a6" stroke-width="1.3"/>
      <path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#14b8a6" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M9.5 3a2 2 0 010 3M11 11c0-1.7-1-3.1-2.5-3.7" stroke="#14b8a6" stroke-width="1.2" stroke-linecap="round"/>
    </svg>`
  },
  financeiroPF: {
    bg: '#3a2200',
    svg: `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 11V5l5-4 5 4v6H9V8H5v3z" stroke="#f59e0b" stroke-width="1.3" stroke-linejoin="round"/>
    </svg>`
  }
};

/* ── Ícones de UI ───────────────────────────────────────────── */
const UI_ICONS = {
  search: `<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <circle cx="4.5" cy="4.5" r="3.5" stroke="currentColor" stroke-width="1.2"/>
    <path d="M7.5 7.5l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,
  chevron: `<svg width="9" height="9" viewBox="0 0 9 9" fill="none">
    <path d="M2 3.5l2.5 2.5L7 3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  import: `<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M5.5 1v7M2 5l3.5 3.5L9 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M1 10h9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,
  export: `<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M5.5 8V1M2 4.5L5.5 1 9 4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M1 10h9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,
  external: `<svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M2 9l7-7M9 9V2H2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`
};

/* ── Configurações dos 8 módulos ────────────────────────────── */
const CONFIGS = {

  ordens: {
    moduleKey: 'ordens',
    title: 'Ordens de serviço',
    stats: [
      { text: '62 ativas' },
      { text: '30 este mês' },
      { text: '2 garantia', alert: true }
    ],
    tabs: [
      { label: 'Todas', count: 30 },
      { label: 'Externo', count: 8 },
      { label: 'Interno', count: 6 },
      { label: 'Financeiro', count: 16 }
    ],
    defaultTab: 0,
    filters: [
      { type: 'search', placeholder: 'Buscar OS...' },
      { type: 'dropdown', label: 'Prazo' },
      { type: 'dropdown', label: 'Tipo' },
      { type: 'dropdown', label: 'Categoria' },
      { type: 'dropdown', label: 'Status' }
    ],
    primaryAction: { label: '+ Criar OS', onClick: null }
  },

  logistica: {
    moduleKey: 'logistica',
    title: 'Logística',
    stats: [
      { text: '5 OS' },
      { text: '5 sem rota', alert: true }
    ],
    tabs: [
      { label: 'Agenda' },
      { label: 'Coleta', count: 1 },
      { label: 'Entrega', count: 4 },
      { label: 'A receber' }
    ],
    defaultTab: 2,
    filters: [
      { type: 'dropdown', label: 'Hoje / Atrasadas', active: true },
      { type: 'dropdown', label: 'Período' },
      { type: 'dropdown', label: 'Motorista' },
      { type: 'search', placeholder: 'Buscar OS...' }
    ],
    secondaryActions: [
      { icon: 'external', label: 'Abrir mapa', onClick: null }
    ],
    primaryAction: { label: '+ Nova rota', onClick: null }
  },

  financeiro: {
    moduleKey: 'financeiro',
    title: 'Financeiro',
    stats: [
      { text: 'R$ 11.670', suffix: 'saldo', valueHighlight: true },
      { text: 'R$ 3.180 a receber', color: 'green' },
      { text: 'R$ 9.920 a pagar', color: 'red' },
      { text: '1 vencida', alert: true }
    ],
    tabs: [
      { label: 'Caixa' },
      { label: 'A receber', count: 10 },
      { label: 'A pagar', count: 165 }
    ],
    defaultTab: 0,
    filters: [
      { type: 'dropdown', label: 'Mês atual', active: true },
      { type: 'dropdown', label: 'Tipo' },
      { type: 'dropdown', label: 'Conta' },
      { type: 'search', placeholder: 'Buscar movimentação...' }
    ],
    primaryAction: { label: '+ Novo lançamento', onClick: null }
  },

  vendas: {
    moduleKey: 'vendas',
    title: 'Vendas',
    stats: [
      { text: 'R$ 8.740', suffix: 'faturado', valueHighlight: true },
      { text: '58 OS' },
      { text: 'R$ 257 ticket médio' },
      { text: 'R$ 3.180 a receber', alert: true }
    ],
    tabs: [
      { label: 'Todas' },
      { label: 'Orçamentos' },
      { label: 'Aprovadas' },
      { label: 'Concluídas' }
    ],
    defaultTab: 0,
    filters: [
      { type: 'dropdown', label: 'Mês atual', active: true },
      { type: 'dropdown', label: 'Tipo' },
      { type: 'dropdown', label: 'Status' },
      { type: 'dropdown', label: 'Pagto' },
      { type: 'search', placeholder: 'Cliente, nº OS, equipamento...' }
    ],
    primaryAction: { label: '+ Nova OS', onClick: null }
  },

  estoque: {
    moduleKey: 'estoque',
    title: 'Estoque',
    stats: [
      { text: '43 referências' },
      { text: '427 itens' },
      { text: 'R$ 4.126', suffix: 'em itens', valueHighlight: true }
    ],
    tabs: [
      { label: 'Itens' },
      { label: 'Máquinas' }
    ],
    defaultTab: 0,
    filters: [
      { type: 'search', placeholder: 'Buscar por nome, SKU...' },
      { type: 'dropdown', label: 'Categoria' },
      { type: 'dropdown', label: 'Fornecedor' },
      { type: 'dropdown', label: 'Estoque' }
    ],
    secondaryActions: [
      { icon: 'import', label: 'Importar', onClick: null },
      { icon: 'export', label: 'Exportar', onClick: null }
    ],
    primaryAction: { label: '+ Novo item', onClick: null }
  },

  relatorios: {
    moduleKey: 'relatorios',
    title: 'Relatórios',
    stats: [
      { text: '8 relatórios' },
      { text: '2 com IA', color: 'purple' }
    ],
    tabs: [
      { label: 'Fin. Mensal' },
      { label: 'Geral' },
      { label: 'Operacional' },
      { label: 'Estoque' },
      { label: 'Vendas' },
      { label: 'DRE' },
      { label: 'Funcionários' },
      { label: 'Ponto' }
    ],
    defaultTab: 0,
    filters: [
      { type: 'dropdown', label: 'Mês atual', active: true }
    ],
    secondaryActions: [
      { icon: 'export', label: 'Exportar', onClick: null }
    ]
    // Sem primaryAction — módulo consultivo
  },

  clientes: {
    moduleKey: 'clientes',
    title: 'Clientes',
    stats: [
      { text: '1.000 cadastrados' }
    ],
    tabs: [
      { label: 'Todos', count: 1000 },
      { label: 'Ativos', count: 840 },
      { label: 'Inativos', count: 160 }
    ],
    defaultTab: 0,
    filters: [
      { type: 'search', placeholder: 'Buscar por nome, telefone ou endereço...' },
      { type: 'dropdown', label: 'Cidade' },
      { type: 'dropdown', label: 'Tipo' },
      { type: 'pagination', text: '1–30 de 1.000' }
    ],
    primaryAction: { label: '+ Novo cliente', onClick: null }
  },

  financeiroPF: {
    moduleKey: 'financeiroPF',
    title: 'Financeiro PF',
    stats: [
      { text: 'R$ 13.905', suffix: 'gasto real', valueHighlight: true },
      { text: '182 lançamentos' }
    ],
    tabs: [
      { label: 'Dashboard' },
      { label: 'Planilha' },
      { label: 'Análise' }
    ],
    defaultTab: 0,
    filters: [
      { type: 'dropdown', label: 'Maio / 2026', active: true },
      { type: 'dropdown', label: 'Perfil: Total (casal)' }
    ],
    primaryAction: { label: '+ Novo lançamento', onClick: null }
  }
};

/* ── Classe ModuleHeader ────────────────────────────────────── */
class ModuleHeader {
  /**
   * @param {string|HTMLElement} container  Seletor CSS ou elemento DOM
   * @param {object}             config     Configuração do módulo (ver CONFIGS)
   * @param {object}             [options]  Opções extras
   * @param {function}           [options.onTabChange]  Callback (tabIndex, tabLabel)
   */
  constructor(container, config, options = {}) {
    this.el = typeof container === 'string'
      ? document.querySelector(container)
      : container;

    if (!this.el) throw new Error(`ModuleHeader: container "${container}" não encontrado`);

    this.config      = { ...config };
    this.options     = options;
    this.activeTab   = config.defaultTab ?? 0;

    this._render();
    this._bindEvents();
  }

  /* ── Render ──────────────────────────────────────────────── */
  _render() {
    this.el.innerHTML = '';
    this.el.classList.add('module-header');
    this.el.appendChild(this._buildRow1());
    this.el.appendChild(this._buildRow2());
  }

  _buildRow1() {
    const row = document.createElement('div');
    row.className = 'module-header__row1';

    // Identidade: ícone + título + métricas
    const identity = document.createElement('div');
    identity.className = 'module-header__identity';

    const iconInfo = MODULE_ICONS[this.config.moduleKey] || { bg: '#222', svg: '' };
    const icon = document.createElement('div');
    icon.className = 'module-header__icon';
    icon.style.background = iconInfo.bg;
    icon.innerHTML = iconInfo.svg;
    identity.appendChild(icon);

    const title = document.createElement('span');
    title.className = 'module-header__title';
    title.textContent = this.config.title;
    identity.appendChild(title);

    if (this.config.stats && this.config.stats.length > 0) {
      const sep = document.createElement('div');
      sep.className = 'module-header__vsep';
      identity.appendChild(sep);

      const statsEl = document.createElement('div');
      statsEl.className = 'module-header__stats';

      this.config.stats.forEach((stat, i) => {
        if (i > 0) {
          const dot = document.createElement('span');
          dot.className = 'module-header__stat-sep';
          dot.textContent = '·';
          statsEl.appendChild(dot);
        }

        const s = document.createElement('span');
        if (stat.alert) {
          s.className = 'module-header__stat module-header__stat--alert';
          s.textContent = stat.text;
        } else if (stat.color) {
          s.className = `module-header__stat module-header__stat--${stat.color}`;
          s.textContent = stat.text;
        } else if (stat.valueHighlight) {
          s.className = 'module-header__stat';
          const val = document.createElement('span');
          val.className = 'module-header__stat--value';
          val.textContent = stat.text;
          s.appendChild(val);
          if (stat.suffix) {
            const suf = document.createElement('span');
            suf.className = 'module-header__stat-suffix';
            suf.textContent = stat.suffix;
            s.appendChild(suf);
          }
        } else {
          s.className = 'module-header__stat';
          s.textContent = stat.text;
          if (stat.suffix) {
            const suf = document.createElement('span');
            suf.className = 'module-header__stat-suffix';
            suf.textContent = stat.suffix;
            s.appendChild(suf);
          }
        }
        statsEl.appendChild(s);
      });

      identity.appendChild(statsEl);
    }

    row.appendChild(identity);

    // Ações direitas
    const actions = document.createElement('div');
    actions.className = 'module-header__actions';

    (this.config.secondaryActions || []).forEach(action => {
      const btn = document.createElement('button');
      btn.className = 'mh-btn-secondary';
      if (action.icon && UI_ICONS[action.icon]) {
        btn.innerHTML = UI_ICONS[action.icon];
      }
      const label = document.createElement('span');
      label.textContent = action.label;
      btn.appendChild(label);
      if (action.onClick) btn.addEventListener('click', action.onClick);
      actions.appendChild(btn);
    });

    if (this.config.primaryAction) {
      const cta = document.createElement('button');
      cta.className = 'mh-btn-primary';
      cta.textContent = this.config.primaryAction.label;
      if (this.config.primaryAction.onClick) {
        cta.addEventListener('click', this.config.primaryAction.onClick);
      }
      actions.appendChild(cta);
    }

    row.appendChild(actions);
    return row;
  }

  _buildRow2() {
    const row = document.createElement('div');
    row.className = 'module-header__row2';

    // Abas
    const tabsZone = document.createElement('div');
    tabsZone.className = 'module-header__tabs';
    this._tabElements = [];

    (this.config.tabs || []).forEach((tab, i) => {
      const t = document.createElement('button');
      t.className = 'mh-tab' + (i === this.activeTab ? ' is-active' : '');
      t.dataset.tabIndex = i;

      const labelEl = document.createElement('span');
      labelEl.textContent = tab.label;
      t.appendChild(labelEl);

      if (tab.count !== undefined) {
        const count = document.createElement('span');
        count.className = 'mh-tab__count';
        count.textContent = tab.count;
        t.appendChild(count);
      }

      this._tabElements.push(t);
      tabsZone.appendChild(t);
    });

    row.appendChild(tabsZone);

    // Divisória
    const divider = document.createElement('div');
    divider.className = 'module-header__filter-divider';
    row.appendChild(divider);

    // Filtros
    const filtersZone = document.createElement('div');
    filtersZone.className = 'module-header__filters';

    (this.config.filters || []).forEach(filter => {
      if (filter.type === 'search') {
        const wrap = document.createElement('div');
        wrap.className = 'mh-filter-search';
        wrap.innerHTML = `<span class="mh-filter-search__icon" style="color:#444">${UI_ICONS.search}</span>`;
        const input = document.createElement('input');
        input.className = 'mh-filter-search__input';
        input.placeholder = filter.placeholder || 'Buscar...';
        if (filter.minWidth) input.style.minWidth = filter.minWidth;
        wrap.appendChild(input);
        filtersZone.appendChild(wrap);

      } else if (filter.type === 'dropdown') {
        const btn = document.createElement('div');
        btn.className = 'mh-filter-dropdown' + (filter.active ? ' is-active' : '');
        btn.innerHTML = `${filter.label} <span class="mh-filter-dropdown__chevron">${UI_ICONS.chevron}</span>`;
        filtersZone.appendChild(btn);

      } else if (filter.type === 'pagination') {
        const p = document.createElement('span');
        p.className = 'mh-filter-pagination';
        p.textContent = filter.text;
        filtersZone.appendChild(p);
      }
    });

    row.appendChild(filtersZone);
    return row;
  }

  /* ── Eventos ─────────────────────────────────────────────── */
  _bindEvents() {
    const tabsZone = this.el.querySelector('.module-header__tabs');
    if (!tabsZone) return;

    tabsZone.addEventListener('click', (e) => {
      const tab = e.target.closest('.mh-tab');
      if (!tab) return;
      const idx = parseInt(tab.dataset.tabIndex, 10);
      this.setActiveTab(idx);
    });
  }

  /* ── API Pública ─────────────────────────────────────────── */

  /** Muda a aba ativa */
  setActiveTab(index) {
    this.activeTab = index;
    this._tabElements.forEach((t, i) => {
      t.classList.toggle('is-active', i === index);
    });
    const tab = this.config.tabs[index];
    if (this.options.onTabChange && tab) {
      this.options.onTabChange(index, tab.label);
    }
  }

  /** Atualiza as métricas da Linha 1 e re-renderiza */
  setStats(stats) {
    this.config.stats = stats;
    this._render();
    this._bindEvents();
  }

  /** Atualiza o count de uma aba específica */
  setTabCount(tabIndex, count) {
    const tab = this.config.tabs[tabIndex];
    if (!tab) return;
    tab.count = count;
    const el = this._tabElements[tabIndex];
    if (!el) return;
    let countEl = el.querySelector('.mh-tab__count');
    if (!countEl) {
      countEl = document.createElement('span');
      countEl.className = 'mh-tab__count';
      el.appendChild(countEl);
    }
    countEl.textContent = count;
  }

  /** Destrói e limpa o componente */
  destroy() {
    this.el.innerHTML = '';
    this.el.classList.remove('module-header');
  }

  /* ── Auto-inicialização via atributo HTML ─────────────────── */
  /**
   * Busca todos os [data-module-header="chave"] no DOM e inicializa.
   * Ex: <div data-module-header="ordens"></div>
   */
  static autoInit(options = {}) {
    document.querySelectorAll('[data-module-header]').forEach(el => {
      const key = el.dataset.moduleHeader;
      const config = CONFIGS[key];
      if (!config) {
        console.warn(`ModuleHeader: config "${key}" não encontrada em CONFIGS`);
        return;
      }
      new ModuleHeader(el, config, options[key] || {});
    });
  }
}

/* ── Exporta para uso em módulos ES ou global ───────────────── */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ModuleHeader, CONFIGS, MODULE_ICONS, UI_ICONS };
} else {
  window.ModuleHeader = ModuleHeader;
  window.MODULE_HEADER_CONFIGS = CONFIGS;
}
