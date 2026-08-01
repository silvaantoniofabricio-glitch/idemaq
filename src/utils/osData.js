// idemaq-src/utils/osData.js
// Configurações estruturais do sistema de OS — não muda em runtime.
// Tipos de OS, etapas, zonas, menu, funcionários e mocks de referência.

export const MENUS = [
  { id: 'painel',        label: 'Painel',        icon: 'ti-layout-dashboard', section: 'principal' },
  { id: 'os',            label: 'OS',            icon: 'ti-clipboard-list',   section: 'principal' },
  { id: 'logistica',     label: 'Logística',     icon: 'ti-truck',            section: 'principal' },
  { id: 'clientes',      label: 'Clientes',      icon: 'ti-user',             section: 'principal' },
  { id: 'estoque',       label: 'Estoque',       icon: 'ti-package',          section: 'principal' },
  { id: 'vendas',        label: 'Vendas',        icon: 'ti-receipt-2',        section: 'principal' },
  { id: 'financeiro',    label: 'Financeiro',    icon: 'ti-cash',             section: 'operacao' },
  { id: 'relatorios',    label: 'Relatórios',    icon: 'ti-chart-bar',        section: 'operacao' },
  { id: 'meu-relatorio', label: 'Relatório',     icon: 'ti-chart-bar',        section: 'operacao' },
  { id: 'financeiro-pf', label: 'Financeiro PF', icon: 'ti-user-dollar',      section: 'operacao' },
  { id: 'meu-contador',  label: 'Meu Contador',  icon: 'ti-calculator',       section: 'operacao' },
  { id: 'configuracoes', label: 'Configurações', icon: 'ti-settings',         section: 'operacao' },
]
// Bottom Nav mobile — 4 slots fixos por papel + botão "Mais" (5º slot) que
// abre um bottom sheet com os EXTRAS (resto das páginas + Sair).
// Antes a barra mostrava 5 páginas, o que escondia 4 páginas importantes do
// dono (Clientes, Logística, Relatórios, Configurações). Agora todas ficam
// acessíveis via "Mais" (21/05/2026 noite).
export const MENUS_MOBILE_DONO       = ['painel', 'os', 'logistica', 'clientes']
export const MENUS_MOBILE_DONO_EXTRA = ['estoque', 'vendas', 'financeiro', 'financeiro-pf', 'meu-contador', 'relatorios', 'configuracoes']
export const MENUS_MOBILE_FUNC       = ['painel', 'os', 'logistica', 'estoque']
export const MENUS_MOBILE_FUNC_EXTRA = ['meu-relatorio']
// Compat — antigos consumidores podem ler isso (BottomNav escolhe por papel)
export const MENUS_MOBILE = MENUS_MOBILE_DONO

// Os 3 tipos de OS, com seus fluxos de etapas.
// adminOnly: true → coluna só visível pro dono (Concluído).
// "Pagamento" foi liberado pro funcionário em 21/05/2026 — eles precisam ver
// o financeiro da OS pra cobrar e dar baixa do recebimento.
export const TIPOS_OS = {
  atendimento: {
    label: 'Atendimento', icon: 'ti-tool', cor: 'blue',
    descricao: 'Máquina do cliente — fluxo completo',
    etapas: [
      { id:'ag_agendamento', label:'Agenda',           curto:'Agenda',       cor:'neutro' },
      { id:'agendado',       label:'Coleta',           curto:'Coleta',       cor:'neutro' },
      // Avaliação + Diagnóstico UNIFICADOS na etapa 'diagnostico' (06/07/2026).
      // DB 'recebido' aposentado — dbEtapaToUI mapeia recebido→diagnostico.
      { id:'diagnostico',    label:'Diagnóstico',      curto:'Diagnóstico',  cor:'yellow', prazo24h:true },
      { id:'orcamento',      label:'Orçamento',        curto:'Orçamento',    cor:'red',    prazo24h:true },
      { id:'oficina',        label:'Conserto',         curto:'Conserto',     cor:'blueLight', dual:true },
      { id:'teste_final',    label:'Teste',            curto:'Teste',        cor:'blue' },
      { id:'entrega',        label:'Entrega',          curto:'Entrega',      cor:'blue' },
      { id:'pagamento',      label:'A receber',        curto:'A receber',    cor:'yellow' },
      { id:'concluido',      label:'Concluído',        curto:'Concluído',    cor:'green',  adminOnly:true },
    ],
    lateral: { id:'recusado', label:'Recusado', curto:'Recusado', cor:'red' }
  },
  // Fabricação tem 2 origens:
  //  1. Conversão de OS recusada em que o Toni negocia comprar a máquina do
  //     cliente (AcaoRecusada.jsx) — máquina já foi diagnosticada/orçada
  //     como atendimento, então a OS derivada nasce direto em 'oficina'
  //     (cliente_id: null), pulando Agenda/Coleta/Diagnóstico/Orçamento.
  //  2. Cliente liga já com intenção de vender a máquina — Toni negocia um
  //     valor, precisa ir buscar, e ela passa pelo fluxo completo (esse é
  //     o caminho normal do botão "Nova OS" pra Fabricação).
  // O fluxo cobre as 2: quem nasce em 'oficina' pula as etapas de trás sem
  // problema (podeMoverOS só valida a posição relativa, não exige visitar
  // etapa anterior).
  fabricacao: {
    label: 'Fabricação', icon: 'ti-building-factory-2', cor: 'yellow',
    descricao: 'Compra de máquina pro estoque',
    etapas: [
      { id:'ag_agendamento', label:'Agenda',        curto:'Agenda',       cor:'neutro' },
      { id:'agendado',       label:'Coleta',        curto:'Coleta',       cor:'neutro' },
      { id:'diagnostico',    label:'Diagnóstico',   curto:'Diagnóstico',  cor:'yellow', prazo24h:true },
      { id:'orcamento',      label:'Orçamento',     curto:'Orçamento',    cor:'red',    prazo24h:true },
      { id:'oficina',        label:'Conserto',      curto:'Conserto',     cor:'blueLight', dual:true },
      { id:'teste_final',    label:'Teste',         curto:'Teste',        cor:'blue' },
      { id:'concluido',      label:'Concluído',     curto:'Concluído',    cor:'green', adminOnly:true },
    ],
  },
  venda: {
    label: 'Venda', icon: 'ti-shopping-cart', cor: 'green',
    descricao: 'Venda de item(ns) do estoque',
    etapas: [
      { id:'orcamento',   label:'Orçamento',    curto:'Orçamento',   cor:'red' },
      { id:'entregue',    label:'Entrega',      curto:'Entrega',     cor:'blue' },
      { id:'pagamento',   label:'A receber',    curto:'A receber',   cor:'yellow' },
      { id:'concluido',   label:'Concluído',    curto:'Concluído',   cor:'green',  adminOnly:true },
    ],
  },
  // Visita: serviço feito na casa do cliente. Sem Coleta e sem Entrega (a
  // máquina nunca sai da residência). Reaproveita a etapa 'oficina' (id interno)
  // pro Conserto feito no local — assim herda o checklist Limpeza/Manutenção.
  visita: {
    label: 'Visita', icon: 'ti-home-cog', cor: 'blue',
    descricao: 'Serviço feito na casa do cliente',
    etapas: [
      { id:'ag_agendamento', label:'Agenda',      curto:'Agenda',       cor:'neutro' },
      { id:'diagnostico',    label:'Diagnóstico', curto:'Diagnóstico',  cor:'yellow', prazo24h:true },
      { id:'orcamento',      label:'Orçamento',   curto:'Orçamento',    cor:'red',    prazo24h:true },
      { id:'oficina',        label:'Conserto',    curto:'Conserto',     cor:'blueLight', dual:true },
      { id:'teste_final',    label:'Teste',       curto:'Teste',        cor:'blue' },
      { id:'pagamento',      label:'A receber',   curto:'A receber',    cor:'yellow' },
      { id:'concluido',      label:'Concluído',   curto:'Concluído',    cor:'green',  adminOnly:true },
    ],
    lateral: { id:'recusado', label:'Recusado', curto:'Recusado', cor:'red' }
  },
}

// Visão "Todos" — etapas unificadas dos 3 tipos via match
export const ETAPAS_TODOS = [
  { id:'ag_agendamento', label:'Agenda',                  curto:'Agenda',       cor:'neutro',    match:{ atendimento:'ag_agendamento', fabricacao:'ag_agendamento', visita:'ag_agendamento' } },
  { id:'agendamento',    label:'Coleta',                  curto:'Coleta',       cor:'neutro',    match:{ atendimento:'agendado', fabricacao:'agendado' } },
  { id:'diagnostico',    label:'Diagnóstico',             curto:'Diagnóstico',  cor:'yellow', prazo24h:true, match:{ atendimento:'diagnostico', fabricacao:'diagnostico', visita:'diagnostico' } },
  { id:'orcamento',      label:'Orçamento',               curto:'Orçamento',    cor:'red',    prazo24h:true, match:{ atendimento:'orcamento', fabricacao:'orcamento', visita:'orcamento', venda:'orcamento' } },
  { id:'oficina',        label:'Conserto',                curto:'Conserto',     cor:'blueLight', dual:true, match:{ atendimento:'oficina', fabricacao:'oficina', visita:'oficina' } },
  { id:'teste_final',    label:'Teste',                   curto:'Teste',        cor:'blue',  match:{ atendimento:'teste_final', fabricacao:'teste_final', visita:'teste_final' } },
  { id:'entrega',        label:'Entrega',                 curto:'Entrega',      cor:'blue',  match:{ atendimento:'entrega', venda:'entregue' } },
  { id:'pagamento',      label:'A receber',               curto:'A receber',    cor:'yellow', match:{ atendimento:'pagamento', venda:'pagamento', visita:'pagamento' } },
  { id:'concluido',      label:'Concluído',               curto:'Concluído',    cor:'green',  adminOnly:true, match:{ atendimento:'concluido', fabricacao:'concluido', venda:'concluido', visita:'concluido' } },
  { id:'recusado',       label:'Recusado',                curto:'Recusado',     cor:'red',                   match:{ atendimento:'recusado' } },
]

// Zonas de atividade (Externo/Interno/Financeiro) — agrupam etapas por contexto
export const ZONAS = [
  { id:'externo',    label:'Externo',    icon:'ti-truck-delivery', cor:'blue',   etapas:['ag_agendamento','agendamento','entrega'] },
  { id:'interno',    label:'Interno',    icon:'ti-tool',           cor:'yellow', etapas:['diagnostico','oficina','teste_final'] },
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
