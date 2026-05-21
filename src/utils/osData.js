// idemaq-src/utils/osData.js
// Configurações estruturais do sistema de OS — não muda em runtime.
// Tipos de OS, etapas, zonas, menu, funcionários e mocks de referência.

export const MENUS = [
  { id: 'painel',       label: 'Painel',        icon: 'ti-layout-dashboard', section: 'principal' },
  { id: 'os',           label: 'OS',            icon: 'ti-clipboard-list',   section: 'principal' },
  { id: 'clientes',     label: 'Clientes',      icon: 'ti-user',             section: 'principal' },
  { id: 'vendas',       label: 'Vendas',        icon: 'ti-receipt-2',        section: 'principal' },
  { id: 'logistica',    label: 'Logística',     icon: 'ti-truck',            section: 'operacao' },
  { id: 'estoque',      label: 'Estoque',       icon: 'ti-package',          section: 'operacao' },
  { id: 'financeiro',   label: 'Financeiro',    icon: 'ti-cash',             section: 'operacao' },
  { id: 'relatorios',   label: 'Relatórios',    icon: 'ti-chart-bar',        section: 'operacao' },
  { id: 'configuracoes',label: 'Configurações', icon: 'ti-settings',         section: 'operacao' },
]
export const MENUS_MOBILE = ['painel', 'os', 'estoque', 'financeiro']

// Os 3 tipos de OS, com seus fluxos de etapas.
// adminOnly: true → coluna só visível pro dono (Pagamento, Concluído)
export const TIPOS_OS = {
  atendimento: {
    label: 'Atendimento', icon: 'ti-tool', cor: 'blue',
    descricao: 'Máquina do cliente — fluxo completo',
    etapas: [
      { id:'ag_agendamento', label:'Aguardando ag.',  curto:'Ag. agenda',   cor:'neutro' },
      { id:'agendado',       label:'Agendado',         curto:'Agendado',     cor:'neutro' },
      { id:'recebido',       label:'Recebido',         curto:'Recebido',     cor:'neutro' },
      { id:'diagnostico',    label:'Diagnóstico',      curto:'Diagnóstico',  cor:'yellow', prazo24h:true },
      { id:'orcamento',      label:'Orçamento',        curto:'Orçamento',    cor:'red',    prazo24h:true },
      { id:'oficina',        label:'Em oficina',       curto:'Em oficina',   cor:'blueLight', dual:true },
      { id:'teste_final',    label:'Teste final',      curto:'Teste final',  cor:'blue' },
      { id:'entrega',        label:'Entrega',          curto:'Entrega',      cor:'blue' },
      { id:'pagamento',      label:'Pagamento',        curto:'Pagamento',    cor:'yellow', adminOnly:true },
      { id:'concluido',      label:'Concluído',        curto:'Concluído',    cor:'green',  adminOnly:true },
    ],
    lateral: { id:'recusado', label:'Recusado', curto:'Recusado', cor:'red' }
  },
  fabricacao: {
    label: 'Fabricação', icon: 'ti-building-factory-2', cor: 'yellow',
    descricao: 'Máquina nova para o estoque',
    etapas: [
      { id:'diagnostico',  label:'Diagnóstico',     curto:'Diagnóstico',  cor:'yellow', prazo24h:true },
      { id:'oficina',      label:'Em oficina',      curto:'Em oficina',   cor:'blueLight', dual:true },
      { id:'teste_final',  label:'Teste final',     curto:'Teste final',  cor:'blue' },
      { id:'concluido',    label:'Concluída',       curto:'Concluída',    cor:'green', adminOnly:true },
    ],
  },
  venda: {
    label: 'Venda', icon: 'ti-shopping-cart', cor: 'green',
    descricao: 'Máquina pronta do estoque',
    etapas: [
      { id:'agendamento', label:'Agendamento',  curto:'Agendamento', cor:'neutro' },
      { id:'entregue',    label:'Entregue',     curto:'Entregue',    cor:'blue' },
      { id:'pagamento',   label:'Pagamento',    curto:'Pagamento',   cor:'yellow', adminOnly:true },
      { id:'concluido',   label:'Concluído',    curto:'Concluído',   cor:'green',  adminOnly:true },
    ],
  },
}

// Visão "Todos" — etapas unificadas dos 3 tipos via match
export const ETAPAS_TODOS = [
  { id:'ag_agendamento', label:'Aguardando agendamento', curto:'Ag. agenda',   cor:'neutro',    match:{ atendimento:'ag_agendamento' } },
  { id:'agendamento',    label:'Agendamento',             curto:'Agendamento',  cor:'neutro',    match:{ atendimento:'agendado', venda:'agendamento' } },
  { id:'recebido',       label:'Recebido',                curto:'Recebido',     cor:'neutro',    match:{ atendimento:'recebido' } },
  { id:'diagnostico',    label:'Diagnóstico',             curto:'Diagnóstico',  cor:'yellow', prazo24h:true, match:{ atendimento:'diagnostico', fabricacao:'diagnostico' } },
  { id:'orcamento',      label:'Orçamento',               curto:'Orçamento',    cor:'red',    prazo24h:true, match:{ atendimento:'orcamento' } },
  { id:'oficina',        label:'Em oficina',              curto:'Em oficina',   cor:'blueLight', dual:true, match:{ atendimento:'oficina', fabricacao:'oficina' } },
  { id:'teste_final',    label:'Teste final',             curto:'Teste final',  cor:'blue',  match:{ atendimento:'teste_final', fabricacao:'teste_final' } },
  { id:'entrega',        label:'Entrega',                 curto:'Entrega',      cor:'blue',  match:{ atendimento:'entrega', venda:'entregue' } },
  { id:'pagamento',      label:'Pagamento',               curto:'Pagamento',    cor:'yellow', adminOnly:true, match:{ atendimento:'pagamento', venda:'pagamento' } },
  { id:'concluido',      label:'Concluído',               curto:'Concluído',    cor:'green',  adminOnly:true, match:{ atendimento:'concluido', fabricacao:'concluido', venda:'concluido' } },
]

// Zonas de atividade (Externo/Interno/Financeiro) — agrupam etapas por contexto
export const ZONAS = [
  { id:'externo',    label:'Externo',    icon:'ti-truck-delivery', cor:'blue',   etapas:['ag_agendamento','agendamento','entrega'] },
  { id:'interno',    label:'Interno',    icon:'ti-tool',           cor:'yellow', etapas:['recebido','diagnostico','oficina','teste_final'] },
  { id:'financeiro', label:'Financeiro', icon:'ti-cash-banknote',  cor:'green',  etapas:['orcamento','pagamento','concluido'] },
]

// FUNCIONARIOS / funcPorId — DEPRECATED (Módulo 00c — Lote 1, 19/05/2026).
// Substituído por useUsuarios() (`src/hooks/useUsuarios.js`) que lê a tabela
// `usuarios` real do Supabase. Mantido aqui SÓ porque os arquivos em
// `_legacy/` ainda importam (`desktopKanbanModals.jsx` + `mobileComponents.jsx`
// + `components/os/OSDrawer.jsx`). Quando o legacy for refatorado, deletar.
// Não usar em código novo — receba `usuarios` por prop e resolva o id ali.
export const FUNCIONARIOS = [
  { id:'dono',  nome:'Dono',         apelido:'DN', cor:'#5B9BD5' },
  { id:'func1', nome:'Func1 — Log.', apelido:'F1', cor:'#FFD966' },
  { id:'func2', nome:'Func2 — Of.',  apelido:'F2', cor:'#B8CCE4' },
]
export function funcPorId(id) { return FUNCIONARIOS.find(f => f.id === id) }

// CLIENTES_MOCK — DEPRECATED. A tela de Clientes já lê do Supabase via
// useClientes(); só `_legacy/desktopKanbanModals.jsx` (NovaOSModal) ainda
// usa pro autocomplete do "Cliente" no Passo 2. Deletar quando NovaOSModal
// for refatorada e migrada pro hook real.
export const CLIENTES_MOCK = [
  { id:1, nome:'Ana Reis',         fone:'(67) 9 9911-1010', endereco:'R. das Acácias, 412 — Naviraí/MS' },
  { id:2, nome:'João Costa',       fone:'(67) 9 9922-2020', endereco:'R. Bahia, 87 — Naviraí/MS' },
  { id:3, nome:'Carlos Lima',      fone:'(67) 9 9933-3030', endereco:'R. Goiás, 245 — Naviraí/MS' },
  { id:4, nome:'Paula Mendes',     fone:'(67) 9 9944-4040', endereco:'Av. Cuiabá, 1.020 — Naviraí/MS' },
  { id:5, nome:'Roberto Dias',     fone:'(67) 9 9955-5050', endereco:'R. Paraná, 56 — Naviraí/MS' },
  { id:6, nome:'Maria Silva',      fone:'(67) 9 9810-1111', endereco:'R. Acre, 88 — Naviraí/MS' },
  { id:7, nome:'Pedro Alves',      fone:'(67) 9 9966-6060', endereco:'R. Ceará, 312 — Naviraí/MS' },
  { id:8, nome:'Igor Vasconcelos', fone:'(67) 9 9712-3344', endereco:'R. Maranhão, 199 — Naviraí/MS' },
]

// ESTOQUE_MAQUINAS_MOCK — DEPRECATED. Mantido só pra NovaOSModal de Venda
// (em `_legacy/`) listar máquinas reformadas disponíveis. Será trocado por
// usePecas() filtrado por tipo `maquina` quando NovaOSModal for refatorada.
export const ESTOQUE_MAQUINAS_MOCK = [
  { id:'M-201', descricao:'Lavadora reformada Consul 10kg',  valor:650 },
  { id:'M-203', descricao:'Lavadora reformada LG 11kg',      valor:650 },
  { id:'M-204', descricao:'Lavadora reformada Brastemp 9kg', valor:650 },
]
