import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import { Chart as ChartJS, registerables } from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(...registerables)

// ─── Temas ─────────────────────────────────────────────────────────────────
const TEMAS = {
  escuro: {
    bg:        '#161618',
    card:      '#222225',
    cardAlt:   '#1a1a1d',
    border:    '#2e2e32',
    border2:   '#3a3a3e',
    sbBg:      '#1c1c1f',
    topBg:     '#1c1c1f',
    textPrimary:   '#f1f5f9',
    textSecondary: '#aaaaaa',
    textMuted:     '#666666',
    textDim:       '#444446',
    progBg:    '#111113',
    osNeutro:  '#2a2a2c',
    osNeutroT: '#888888',
    shadow:    'none',
    shadowHover: 'none',
  },
  claro: {
    bg:        '#ececef',
    card:      '#ffffff',
    cardAlt:   '#f7f7f9',
    border:    '#eaeaee',
    border2:   '#dcdce0',
    sbBg:      '#ffffff',
    topBg:     '#ffffff',
    textPrimary:   '#0a0a0d',
    textSecondary: '#3a3a3e',
    textMuted:     '#6a6a6e',
    textDim:       '#8a8a8e',
    progBg:    '#e8e8ec',
    osNeutro:  '#ebebed',
    osNeutroT: '#6a6a6e',
    shadow:    '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
    shadowHover: '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.06)',
  }
}

// ─── Paleta acessível Deutan ───────────────────────────────────────────────
const P = {
  blue:      '#5B9BD5',
  yellow:    '#FFD966',
  red:       '#c04242',
  blueLight: '#B8CCE4',
  green:     '#4ade80',
  blueDark:      '#1a6aaa',
  yellowDark:    '#b8860b',
  redDark:       '#c04242',
  blueLightDark: '#4a7ea8',
  greenDark:     '#1a7a3a',
}

const MENUS = [
  { id:'painel',     label:'Painel',    icon:'ti-layout-dashboard', section:'principal', badge:5 },
  { id:'os',         label:'OS',         icon:'ti-clipboard-list',  section:'principal', badge:5 },
  { id:'clientes',   label:'Clientes',   icon:'ti-user',            section:'principal' },
  { id:'logistica',  label:'Logística',  icon:'ti-truck',           section:'operacao' },
  { id:'estoque',    label:'Estoque',    icon:'ti-package',         section:'operacao',  badge:2 },
  { id:'financeiro', label:'Financeiro', icon:'ti-cash',            section:'operacao' },
  { id:'relatorios', label:'Relatórios', icon:'ti-chart-bar',       section:'operacao' },
]
const MENUS_MOBILE = ['painel','os','estoque','financeiro']

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ─── Componentes utilitários ───────────────────────────────────────────────
function Badge({ children, color, bg, border }) {
  return <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, fontWeight:600, whiteSpace:'nowrap', color, background:bg, border:`1px solid ${border}` }}>{children}</span>
}

function StatusBadge({ tipo, dark }) {
  const escuro = {
    vencido:  [P.red,      '#2a1515', P.red+'33',      'Vencido'],
    amanha:   [P.yellow,   '#2a2000', P.yellow+'33',   'Amanhã'],
    '2dias':  [P.green,    '#0f2a15', P.green+'33',    '2 dias'],
    hoje:     [P.yellow,   '#2a2000', P.yellow+'33',   'Hoje'],
    esgotado: [P.red,      '#2a1515', P.red+'33',      'Esgotado'],
    critico:  [P.red,      '#2a1515', P.red+'33',      'Crítico'],
    baixo:    [P.yellow,   '#2a2000', P.yellow+'33',   'Baixo'],
    atrasada: [P.red,      '#2a1515', P.red+'33',      'Atrasada'],
  }
  const claro = {
    vencido:  [P.redDark,       '#fde8e8', P.redDark+'33',       'Vencido'],
    amanha:   [P.yellowDark,    '#fdf6dc', P.yellowDark+'33',    'Amanhã'],
    '2dias':  [P.greenDark,     '#e8f5ec', P.greenDark+'33',     '2 dias'],
    hoje:     [P.yellowDark,    '#fdf6dc', P.yellowDark+'33',    'Hoje'],
    esgotado: [P.redDark,       '#fde8e8', P.redDark+'33',       'Esgotado'],
    critico:  [P.redDark,       '#fde8e8', P.redDark+'33',       'Crítico'],
    baixo:    [P.yellowDark,    '#fdf6dc', P.yellowDark+'33',    'Baixo'],
    atrasada: [P.redDark,       '#fde8e8', P.redDark+'33',       'Atrasada'],
  }
  const map = dark ? escuro : claro
  const [color, bg, border, label] = map[tipo] || []
  if (!label) return null
  return <Badge color={color} bg={bg} border={border}>{label}</Badge>
}

function SecTitle({ icon, children, right, T }) {
  return (
    <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between', textTransform:'uppercase', letterSpacing:'.5px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}><i className={`ti ${icon}`} style={{ fontSize:14 }} aria-hidden="true" />{children}</div>
      {right}
    </div>
  )
}

function CountBadge({ n, red, T, dark }) {
  const redBg  = dark ? '#2a1515' : '#fde8e8'
  const redClr = dark ? P.red     : P.redDark
  const defBg  = dark ? '#1a3a5c' : '#e6f1fb'
  const defClr = dark ? P.blue    : P.blueDark
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background:red?redBg:defBg, color:red?redClr:defClr }}>{n}</span>
}

// ─── Configuração dos 3 tipos de OS ───────────────────────────────────────
// adminOnly:true → coluna visível apenas para o dono (Pagamento, Concluído)
const TIPOS_OS = {
  atendimento: {
    label: 'Atendimento',
    icon: 'ti-tool',
    cor: 'blue',
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
    label: 'Fabricação',
    icon: 'ti-building-factory-2',
    cor: 'yellow',
    descricao: 'Máquina nova para o estoque',
    etapas: [
      { id:'diagnostico',  label:'Diagnóstico',     curto:'Diagnóstico',  cor:'yellow', prazo24h:true },
      { id:'oficina',      label:'Em oficina',      curto:'Em oficina',   cor:'blueLight', dual:true },
      { id:'teste_final',  label:'Teste final',     curto:'Teste final',  cor:'blue' },
      { id:'concluido',    label:'Concluída',       curto:'Concluída',    cor:'green',  adminOnly:true },
    ]
  },
  venda: {
    label: 'Venda',
    icon: 'ti-shopping-cart',
    cor: 'green',
    descricao: 'Máquina pronta do estoque',
    etapas: [
      { id:'agendamento', label:'Agendamento',  curto:'Agendamento', cor:'neutro' },
      { id:'entregue',    label:'Entregue',     curto:'Entregue',    cor:'blue' },
      { id:'pagamento',   label:'Pagamento',    curto:'Pagamento',   cor:'yellow', adminOnly:true },
      { id:'concluido',   label:'Concluído',    curto:'Concluído',   cor:'green',  adminOnly:true },
    ]
  }
}

// ─── Visão "Todos" — agrupa etapas equivalentes dos 3 tipos ───────────────
// Cada coluna pega OS de diferentes tipos cuja etapa esteja no `match`
const ETAPAS_TODOS = [
  { id:'ag_agendamento', label:'Aguardando agendamento', curto:'Ag. agenda',   cor:'neutro', match: { atendimento:'ag_agendamento' } },
  { id:'agendamento',    label:'Agendamento',             curto:'Agendamento',  cor:'neutro', match: { atendimento:'agendado', venda:'agendamento' } },
  { id:'recebido',       label:'Recebido',                curto:'Recebido',     cor:'neutro', match: { atendimento:'recebido' } },
  { id:'diagnostico',    label:'Diagnóstico',             curto:'Diagnóstico',  cor:'yellow', prazo24h:true, match: { atendimento:'diagnostico', fabricacao:'diagnostico' } },
  { id:'orcamento',      label:'Orçamento',               curto:'Orçamento',    cor:'red',    prazo24h:true, match: { atendimento:'orcamento' } },
  { id:'oficina',        label:'Em oficina',              curto:'Em oficina',   cor:'blueLight', dual:true, match: { atendimento:'oficina', fabricacao:'oficina' } },
  { id:'teste_final',    label:'Teste final',             curto:'Teste final',  cor:'blue',  match: { atendimento:'teste_final', fabricacao:'teste_final' } },
  { id:'entrega',        label:'Entrega',                 curto:'Entrega',      cor:'blue',  match: { atendimento:'entrega', venda:'entregue' } },
  { id:'pagamento',      label:'Pagamento',               curto:'Pagamento',    cor:'yellow', adminOnly:true, match: { atendimento:'pagamento', venda:'pagamento' } },
  { id:'concluido',      label:'Concluído',               curto:'Concluído',    cor:'green',  adminOnly:true, match: { atendimento:'concluido', fabricacao:'concluido', venda:'concluido' } },
]

// Zonas de atividade — agrupam etapas por contexto do trabalho
const ZONAS = [
  { id:'externo',    label:'Externo',    icon:'ti-truck-delivery', cor:'blue',   etapas:['ag_agendamento','agendamento','entrega'] },
  { id:'interno',    label:'Interno',    icon:'ti-tool',           cor:'yellow', etapas:['recebido','diagnostico','oficina','teste_final'] },
  { id:'financeiro', label:'Financeiro', icon:'ti-cash-banknote',  cor:'green',  etapas:['orcamento','pagamento','concluido'] },
]

// Cor de etapa traduzida para hex (respeita modo dark/claro)
function corEtapa(nome, dark) {
  const map = {
    blue:      dark ? P.blue       : P.blueDark,
    yellow:    dark ? P.yellow     : P.yellowDark,
    red:       dark ? P.red        : P.redDark,
    blueLight: dark ? P.blueLight  : P.blueLightDark,
    green:     dark ? P.green      : P.greenDark,
    neutro:    dark ? '#888888'    : '#888888',
  }
  return map[nome] || map.neutro
}
function bgEtapa(nome, dark) {
  const map = {
    blue:      dark ? '#0d2035' : '#e6f1fb',
    yellow:    dark ? '#2a2000' : '#fdf6dc',
    red:       dark ? '#2a1515' : '#fde8e8',
    blueLight: dark ? '#0d2035' : '#e6f1fb',
    green:     dark ? '#0f2a15' : '#e8f5ec',
    neutro:    dark ? '#2a2a2c' : '#ebebed',
  }
  return map[nome] || map.neutro
}

// Funcionários (mock — depois lê do Supabase auth)
const FUNCIONARIOS = [
  { id:'dono',  nome:'Dono',         apelido:'DN', cor:'#5B9BD5' },
  { id:'func1', nome:'Func1 — Log.', apelido:'F1', cor:'#FFD966' },
  { id:'func2', nome:'Func2 — Of.',  apelido:'F2', cor:'#B8CCE4' },
]

// Identifica o papel do usuário logado pelo email
function getRole(user) {
  const e = (user?.email || '').toLowerCase()
  if (e === 'empresaidemaq@gmail.com') return 'dono'
  if (e === 'func1@idemaq.com') return 'func1'
  if (e === 'func2@idemaq.com') return 'func2'
  return 'dono' // fallback durante desenvolvimento
}
function isAdmin(user) { return getRole(user) === 'dono' }

// Responsável atual = quem fez o último check no histórico
function responsavelAtual(os) {
  if (os.historico && os.historico.length > 0) {
    return os.historico[os.historico.length - 1].funcionario
  }
  return null
}
function funcPorId(id) { return FUNCIONARIOS.find(f => f.id === id) }

// Pagamento — total a pagar (valor − desconto)
function totalAPagar(os) { return (os.valor || 0) - (os.desconto || 0) }
function estaPagaTotal(os) {
  if (os.pago === 'total') return true
  if ((os.valor_pago || 0) >= totalAPagar(os) && totalAPagar(os) > 0) return true
  return false
}
function estaPagaParcial(os) {
  return os.pago === 'parcial' || ((os.valor_pago || 0) > 0 && (os.valor_pago || 0) < totalAPagar(os))
}

// Regras de movimentação entre etapas (drag-and-drop ou botões manuais)
// Retorna { ok: bool, motivo?: string, alvo?: string } — alvo pode redirecionar
function podeMoverOS(os, etapaAlvo) {
  if (os.etapa === etapaAlvo) return { ok:false, motivo:'OS já está nesta etapa' }
  if (os.etapa === 'concluido') return { ok:false, motivo:'OS concluída não pode ser movida — reabra se necessário' }
  if (os.etapa === 'recusado' && etapaAlvo !== 'diagnostico') {
    return { ok:false, motivo:'De Recusado só é possível voltar para Diagnóstico ou converter em Fabricação' }
  }

  const config = TIPOS_OS[os.tipo]
  const idxAtual = config.etapas.findIndex(e => e.id === os.etapa)
  const idxAlvo  = config.etapas.findIndex(e => e.id === etapaAlvo)
  if (idxAlvo === -1) return { ok:false, motivo:`Etapa "${etapaAlvo}" não existe no fluxo de ${config.label}` }

  // Pular etapas (mais de 1 pra frente ou trás) — bloqueado
  if (Math.abs(idxAlvo - idxAtual) > 1) {
    return { ok:false, motivo:'Não é possível pular etapas. Avance ou volte uma de cada vez.' }
  }

  // Regra: Teste final só libera quando limpeza E manutenção concluídas
  if (etapaAlvo === 'teste_final' && os.etapa === 'oficina') {
    if (os.limpeza !== 'concluido' || os.manutencao !== 'concluido') {
      return { ok:false, motivo:'Limpeza e manutenção precisam estar concluídas antes do teste final' }
    }
  }

  // Regra: Pagamento confirmado pula direto pra Concluído
  if (etapaAlvo === 'pagamento' && estaPagaTotal(os)) {
    return { ok:true, alvo:'concluido', motivo:'OS já está paga — indo direto para Concluído' }
  }

  // Regra: Concluído só pode vir de Pagamento (atend/venda) OU já pago de Entrega/Entregue
  if (etapaAlvo === 'concluido') {
    const veioDePagamento = os.etapa === 'pagamento'
    const veioDeEntregaPaga = (os.etapa === 'entrega' || os.etapa === 'entregue') && estaPagaTotal(os)
    const veioDeTesteFinalFab = os.tipo === 'fabricacao' && os.etapa === 'teste_final'
    if (!veioDePagamento && !veioDeEntregaPaga && !veioDeTesteFinalFab) {
      return { ok:false, motivo:'Só é possível concluir uma OS paga + entregue (ou após Teste final no caso de Fabricação)' }
    }
  }

  return { ok:true }
}

// Ordenação por coluna conforme regras combinadas
function ordenarColuna(etapaId, lista) {
  const arr = [...lista]
  switch (etapaId) {
    case 'ag_agendamento':
      // mais antigo no topo
      return arr.sort((a,b) => new Date(a.abertura) - new Date(b.abertura))
    case 'agendado':
    case 'agendamento':
      // próxima data primeiro
      return arr.sort((a,b) => new Date(a.prazo) - new Date(b.prazo))
    case 'recebido':
    case 'diagnostico':
    case 'orcamento':
      // mais tempo parado no topo (horasNaEtapa desc, fallback prazo asc)
      return arr.sort((a,b) => (b.horasNaEtapa||0) - (a.horasNaEtapa||0) || new Date(a.prazo) - new Date(b.prazo))
    case 'oficina':
    case 'teste_final':
    case 'entrega':
    case 'entregue':
      // prazo mais próximo no topo
      return arr.sort((a,b) => new Date(a.prazo) - new Date(b.prazo))
    case 'pagamento':
      // MAIS RECENTE primeiro (preferência do dono — antigas já foram cobradas)
      return arr.sort((a,b) => {
        const dataA = (a.historico||[]).find(h=>h.etapa==='entrega'||h.etapa==='entregue')?.data || a.abertura
        const dataB = (b.historico||[]).find(h=>h.etapa==='entrega'||h.etapa==='entregue')?.data || b.abertura
        return new Date(dataB) - new Date(dataA)
      })
    case 'concluido':
      // mais recente no topo
      return arr.sort((a,b) => {
        const dataA = (a.historico||[]).find(h=>h.etapa==='concluido')?.data || a.abertura
        const dataB = (b.historico||[]).find(h=>h.etapa==='concluido')?.data || b.abertura
        return new Date(dataB) - new Date(dataA)
      })
    default:
      return arr
  }
}

// Janela: OS concluída este MÊS DO CALENDÁRIO (não 30d corridos)
function dentroMesCorrente(os) {
  if (os.etapa !== 'concluido') return true
  const reg = (os.historico||[]).find(h => h.etapa === 'concluido')
  if (!reg) return true
  const d = new Date(reg.data)
  const hoje = new Date()
  return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth()
}

// Garantia válida: até 90 dias após entrega da OS origem
function dentroGarantia(osOrigem) {
  if (!osOrigem) return false
  const dias = osOrigem.garantia_dias || 90
  const reg = (osOrigem.historico||[]).find(h => h.etapa === 'entrega' || h.etapa === 'entregue')
  if (!reg) return false
  const entregaData = new Date(reg.data)
  const limite = new Date(entregaData.getTime() + dias*86400000)
  return new Date() <= limite
}
function osPorNumero(numero, base) {
  return (base || OS_MOCK).find(o => o.numero === numero)
}

// ─── Dados mock de OS (substituir por fetch do Supabase depois) ───────────
// Campos: marca/modelo/serie separados; historico = [{etapa, funcionario, data}]
// aguardando_peca: true → badge laranja no card (toggle manual em "Em oficina")
const OS_MOCK = [
  // ATENDIMENTO
  { numero:1036, tipo:'atendimento', cliente:'Ana Reis',     fone:'(67) 9 9911-1010', equipamento:'Lavadora LG 12kg', marca:'LG', modelo:'WD1485ATS', serie:'4AB12345', defeito:'Não centrifuga, faz ruído alto',          etapa:'oficina',       limpeza:'concluido', manutencao:'em_andamento', aguardando_peca:true, abertura:'2026-05-10', prazo:'2026-05-11', endereco:'R. das Acácias, 412 — Naviraí/MS', valor:380, desconto:0, fotos:2, observacoes:'Cliente urgente — viagem dia 15. Peça em falta: rolamento do cesto.', historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-09 14:20'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-09 14:25'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-10 09:15'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-05-10 11:40'},
      {etapa:'orcamento',      funcionario:'dono',  data:'2026-05-10 15:10'},
    ] },
  { numero:1037, tipo:'atendimento', cliente:'João Costa',   fone:'(67) 9 9922-2020', equipamento:'Geladeira Consul Frost Free', marca:'Consul', modelo:'CRM45HK', serie:'CN78901234', defeito:'Não gela na parte de baixo',              etapa:'diagnostico',   abertura:'2026-05-12', prazo:'2026-05-14', endereco:'R. Bahia, 87 — Naviraí/MS', valor:0, desconto:0, fotos:1, horasNaEtapa:31, pago:'parcial', valor_pago:150, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-11 10:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-11 10:05'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-12 08:30'},
    ] },
  { numero:1039, tipo:'atendimento', cliente:'Carlos Lima',  fone:'(67) 9 9933-3030', equipamento:'Micro-ondas Electrolux 32L',  marca:'Electrolux', modelo:'MEF41', serie:'EL55432109', defeito:'Não esquenta, prato gira normal',         etapa:'orcamento',     abertura:'2026-05-11', prazo:'2026-05-13', endereco:'R. Goiás, 245 — Naviraí/MS', valor:215, desconto:0, fotos:2, horasNaEtapa:18, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-10 11:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-10 11:08'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-11 09:50'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-05-11 14:20'},
    ] },
  { numero:1041, tipo:'atendimento', cliente:'Paula Mendes', fone:'(67) 9 9944-4040', equipamento:'Ar cond. Midea 12000 BTU', marca:'Midea', modelo:'MSEA12CR', serie:'MD20011223',    defeito:'Vazamento de água, não gela',             etapa:'agendado',      abertura:'2026-05-13', prazo:'2026-05-15', endereco:'Av. Cuiabá, 1.020 — Naviraí/MS', valor:0, desconto:0, fotos:0, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-13 08:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-13 08:12'},
    ] },
  { numero:1043, tipo:'atendimento', cliente:'Roberto Dias', fone:'(67) 9 9955-5050', equipamento:'Lavadora Brastemp 11kg', marca:'Brastemp', modelo:'BWK11AB', serie:'BR99001122',      defeito:'Não enche de água',                       etapa:'ag_agendamento',abertura:'2026-05-13', prazo:'2026-05-17', endereco:'R. Paraná, 56 — Naviraí/MS',     valor:0, desconto:0, fotos:0, historico:[] },
  { numero:1033, tipo:'atendimento', cliente:'Pedro Alves',  fone:'(67) 9 9966-6060', equipamento:'Secadora Brastemp 10kg', marca:'Brastemp', modelo:'BSE10AB', serie:'BR11220033',      defeito:'Aquece pouco, demora muito',              etapa:'oficina',       limpeza:'em_andamento', manutencao:'aguardando', abertura:'2026-05-08', prazo:'2026-05-12', endereco:'R. Ceará, 312 — Naviraí/MS', valor:480, desconto:30, fotos:3, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-07 16:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-07 16:05'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-08 09:00'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-05-08 13:30'},
      {etapa:'orcamento',      funcionario:'dono',  data:'2026-05-08 17:00'},
    ] },
  { numero:1045, tipo:'atendimento', cliente:'Lúcia Ramos',  fone:'(67) 9 9977-7070', equipamento:'Geladeira Electrolux', marca:'Electrolux', modelo:'IF55B', serie:'EL77665544',        defeito:'Faz barulho intermitente',                etapa:'teste_final',   abertura:'2026-05-09', prazo:'2026-05-14', endereco:'R. Minas Gerais, 78 — Naviraí/MS', valor:520, desconto:0, fotos:2, pago:'total', valor_pago:520, forma_pagamento:'PIX', historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-08 10:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-08 10:05'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-09 08:40'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-05-09 11:20'},
      {etapa:'orcamento',      funcionario:'dono',  data:'2026-05-09 14:50'},
      {etapa:'oficina',        funcionario:'func2', data:'2026-05-12 18:00'},
    ] },
  { numero:1046, tipo:'atendimento', cliente:'Marcos Souza', fone:'(67) 9 9988-8080', equipamento:'Lavadora Consul 10kg', marca:'Consul', modelo:'CWE10', serie:'CN44556677',           defeito:'Centrifugação fraca',                     etapa:'entrega',       abertura:'2026-05-07', prazo:'2026-05-14', endereco:'R. Sergipe, 145 — Naviraí/MS', valor:295, desconto:15, fotos:1, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-06 09:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-06 09:08'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-07 10:15'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-05-07 14:00'},
      {etapa:'orcamento',      funcionario:'dono',  data:'2026-05-08 11:00'},
      {etapa:'oficina',        funcionario:'func2', data:'2026-05-11 17:30'},
      {etapa:'teste_final',    funcionario:'func2', data:'2026-05-12 10:00'},
    ] },
  { numero:1042, tipo:'atendimento', cliente:'Bianca Souza', fone:'(67) 9 9810-2030', equipamento:'Lavadora LG 14kg',  marca:'LG', modelo:'WD14W', serie:'4LG33445566',                 defeito:'Entregue, aguardando confirmação do pagamento',  etapa:'pagamento',     abertura:'2026-05-06', prazo:'2026-05-13', endereco:'R. Rondônia, 50 — Naviraí/MS', valor:340, desconto:0, fotos:2, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-05 10:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-05 10:05'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-06 09:00'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-05-06 13:00'},
      {etapa:'orcamento',      funcionario:'dono',  data:'2026-05-07 09:00'},
      {etapa:'oficina',        funcionario:'func2', data:'2026-05-10 17:00'},
      {etapa:'teste_final',    funcionario:'func2', data:'2026-05-11 11:00'},
      {etapa:'entrega',        funcionario:'func1', data:'2026-05-12 16:30'},
    ] },
  { numero:1047, tipo:'atendimento', cliente:'Beatriz Souza',fone:'(67) 9 9999-9090', equipamento:'Lava e seca Samsung', marca:'Samsung', modelo:'WD11M44', serie:'SM77889911',         defeito:'Display piscando, não liga',              etapa:'pagamento',     abertura:'2026-05-06', prazo:'2026-05-14', endereco:'R. Alagoas, 39 — Naviraí/MS', valor:640, desconto:40, fotos:2, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-05 14:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-05 14:08'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-06 09:30'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-05-06 14:00'},
      {etapa:'orcamento',      funcionario:'dono',  data:'2026-05-07 10:00'},
      {etapa:'oficina',        funcionario:'func2', data:'2026-05-10 18:00'},
      {etapa:'teste_final',    funcionario:'func2', data:'2026-05-11 12:00'},
      {etapa:'entrega',        funcionario:'func1', data:'2026-05-13 10:00'},
    ] },
  { numero:1029, tipo:'atendimento', cliente:'Marta Lopes',  fone:'(67) 9 9810-1020', equipamento:'Lavadora LG 9kg', marca:'LG', modelo:'WM9', serie:'4LG10203040',                    defeito:'Concluída — limpeza e troca de rolamento',etapa:'concluido',     abertura:'2026-04-30', prazo:'2026-05-08', endereco:'R. Pará, 22 — Naviraí/MS', valor:420, desconto:0, fotos:3, pago:'total', valor_pago:420, forma_pagamento:'Débito', garantia_dias:90, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-04-29 09:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-04-29 09:05'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-04-30 09:30'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-04-30 13:00'},
      {etapa:'orcamento',      funcionario:'dono',  data:'2026-05-01 10:00'},
      {etapa:'oficina',        funcionario:'func2', data:'2026-05-04 17:00'},
      {etapa:'teste_final',    funcionario:'func2', data:'2026-05-05 11:00'},
      {etapa:'entrega',        funcionario:'func1', data:'2026-05-06 14:00'},
      {etapa:'pagamento',      funcionario:'dono',  data:'2026-05-07 16:00'},
      {etapa:'concluido',      funcionario:'dono',  data:'2026-05-08 09:00'},
    ] },
  { numero:1028, tipo:'atendimento', cliente:'Felipe Costa', fone:'(67) 9 9811-1121', equipamento:'Micro-ondas Panasonic', marca:'Panasonic', modelo:'NN-ST67H', serie:'PN66554433',   defeito:'Cliente recusou orçamento',               etapa:'recusado',      abertura:'2026-05-04', prazo:'2026-05-09', endereco:'R. Espírito Santo, 8 — Naviraí/MS', valor:30, desconto:0, fotos:1, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-03 10:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-03 10:08'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-04 09:00'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-05-04 13:00'},
      {etapa:'orcamento',      funcionario:'dono',  data:'2026-05-05 09:00'},
    ] },

  // GARANTIA — OS nova ligada à OS original
  { numero:1048, tipo:'atendimento', cliente:'Marta Lopes',  fone:'(67) 9 9810-1020', equipamento:'Lavadora LG 9kg', marca:'LG', modelo:'WM9', serie:'4LG10203040', defeito:'Cliente reporta ruído voltou — possível defeito reincidente do rolamento', etapa:'recebido', abertura:'2026-05-13', prazo:'2026-05-16', endereco:'R. Pará, 22 — Naviraí/MS', valor:0, desconto:0, fotos:1, garantia:true, os_origem_id:1029, observacoes:'OS em garantia da #1029 — não cobrar mão de obra. Peças saem do estoque a preço de custo.', historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-05-13 09:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-05-13 09:10'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-05-13 14:20'},
    ] },

  // OS concluída em MÊS ANTERIOR — deve sumir do kanban mas aparecer na busca
  { numero:1015, tipo:'atendimento', cliente:'Antonio Reis', fone:'(67) 9 9700-1234', equipamento:'Lavadora Brastemp 8kg', marca:'Brastemp', modelo:'BWG08', serie:'BR55667788', defeito:'Manutenção concluída em abril', etapa:'concluido', abertura:'2026-04-15', prazo:'2026-04-22', endereco:'R. Sergipe, 401 — Naviraí/MS', valor:295, desconto:0, fotos:2, pago:'total', valor_pago:295, forma_pagamento:'PIX', garantia_dias:90, historico:[
      {etapa:'ag_agendamento', funcionario:'func1', data:'2026-04-14 09:00'},
      {etapa:'agendado',       funcionario:'func1', data:'2026-04-14 09:10'},
      {etapa:'recebido',       funcionario:'func1', data:'2026-04-15 09:00'},
      {etapa:'diagnostico',    funcionario:'func2', data:'2026-04-15 13:00'},
      {etapa:'orcamento',      funcionario:'dono',  data:'2026-04-16 09:00'},
      {etapa:'oficina',        funcionario:'func2', data:'2026-04-18 17:00'},
      {etapa:'teste_final',    funcionario:'func2', data:'2026-04-19 11:00'},
      {etapa:'entrega',        funcionario:'func1', data:'2026-04-20 14:00'},
      {etapa:'pagamento',      funcionario:'dono',  data:'2026-04-21 16:00'},
      {etapa:'concluido',      funcionario:'dono',  data:'2026-04-22 09:00'},
    ] },

  // FABRICAÇÃO
  { numero:2008, tipo:'fabricacao', cliente:'— Estoque', equipamento:'Lavadora reformada — base p/ revenda', marca:'Brastemp', modelo:'BWK11 (recond.)', serie:'INT-2008', defeito:'Estrutura ok, trocar rolamento, polia, capa', etapa:'oficina',     limpeza:'concluido', manutencao:'em_andamento', abertura:'2026-05-09', prazo:'2026-05-15', valor:150, custoFab:285, fotos:4, historico:[
      {etapa:'diagnostico', funcionario:'func2', data:'2026-05-09 09:00'},
    ] },
  { numero:2009, tipo:'fabricacao', cliente:'— Estoque', equipamento:'Lavadora reformada — base p/ revenda', marca:'Panasonic', modelo:'NA-F140 (recond.)', serie:'INT-2009', defeito:'Conversão da OS #1028 recusada', etapa:'diagnostico', abertura:'2026-05-12', prazo:'2026-05-18', valor:150, custoFab:150, fotos:1, historico:[] },
  { numero:2007, tipo:'fabricacao', cliente:'— Estoque', equipamento:'Lavadora reformada Brastemp 9kg', marca:'Brastemp', modelo:'BWK09 (recond.)', serie:'INT-2007', defeito:'Pronta para vender', etapa:'concluido', abertura:'2026-05-02', prazo:'2026-05-10', valor:650, custoFab:340, fotos:5, historico:[
      {etapa:'diagnostico', funcionario:'func2', data:'2026-05-02 09:00'},
      {etapa:'oficina',     funcionario:'func2', data:'2026-05-05 17:00'},
      {etapa:'teste_final', funcionario:'func2', data:'2026-05-08 11:00'},
      {etapa:'concluido',   funcionario:'dono',  data:'2026-05-10 09:00'},
    ] },

  // VENDA
  { numero:3004, tipo:'venda', cliente:'Igor Vasconcelos', fone:'(67) 9 9712-3344', equipamento:'Lavadora reformada Brastemp 9kg', marca:'Brastemp', modelo:'BWK09 (recond.)', serie:'M-204', defeito:'Venda — máquina #M-204', etapa:'agendamento', abertura:'2026-05-13', prazo:'2026-05-15', endereco:'R. Maranhão, 199 — Naviraí/MS', valor:650, desconto:0, fotos:0, historico:[] },
  { numero:3003, tipo:'venda', cliente:'Sandra Pinheiro',  fone:'(67) 9 9713-4455', equipamento:'Lavadora reformada Consul 10kg', marca:'Consul', modelo:'CWE10 (recond.)', serie:'M-201',   defeito:'Venda — máquina #M-201', etapa:'pagamento',   abertura:'2026-05-10', prazo:'2026-05-13', endereco:'R. Bahia, 410 — Naviraí/MS', valor:650, desconto:0, fotos:0, historico:[
      {etapa:'agendamento', funcionario:'func1', data:'2026-05-10 09:00'},
      {etapa:'entregue',    funcionario:'func1', data:'2026-05-12 15:00'},
    ] },
]

// Itens (peças) mock — vincular pela OS no detalhe
const OS_ITENS_MOCK = {
  1036: [
    { nome:'Rolamento do cesto', qtd:1, valor:95,  tipo:'item' },
    { nome:'Limpeza completa',   qtd:1, valor:185, tipo:'servico' },
    { nome:'Mão de obra',        qtd:1, valor:100, tipo:'servico' },
  ],
  1039: [
    { nome:'Diagnóstico',        qtd:1, valor:30,  tipo:'servico' },
    { nome:'Magnetron 220V',     qtd:1, valor:185, tipo:'item' },
  ],
  1033: [
    { nome:'Resistência 220V',   qtd:1, valor:135, tipo:'item' },
    { nome:'Limpeza combinada',  qtd:1, valor:165, tipo:'servico' },
    { nome:'Manutenção',         qtd:1, valor:185, tipo:'servico' },
  ],
  1045: [
    { nome:'Termostato',         qtd:1, valor:75,  tipo:'item' },
    { nome:'Limpeza completa',   qtd:1, valor:185, tipo:'servico' },
    { nome:'Mão de obra',        qtd:1, valor:260, tipo:'servico' },
  ],
  1046: [
    { nome:'Capacitor partida',  qtd:1, valor:45,  tipo:'item' },
    { nome:'Manutenção',         qtd:1, valor:185, tipo:'servico' },
    { nome:'Limpeza combinada',  qtd:1, valor:65,  tipo:'servico' },
  ],
  1047: [
    { nome:'Placa eletrônica',   qtd:1, valor:280, tipo:'item' },
    { nome:'Manutenção',         qtd:1, valor:185, tipo:'servico' },
    { nome:'Limpeza completa',   qtd:1, valor:175, tipo:'servico' },
  ],
  1029: [
    { nome:'Rolamento do cesto', qtd:1, valor:95,  tipo:'item' },
    { nome:'Limpeza combinada',  qtd:1, valor:165, tipo:'servico' },
    { nome:'Manutenção',         qtd:1, valor:160, tipo:'servico' },
  ],
  1028: [
    { nome:'Taxa de diagnóstico',qtd:1, valor:30,  tipo:'servico' },
  ],
  1048: [
    { nome:'Rolamento do cesto (garantia)', qtd:1, valor:0, custo:95, tipo:'item' },
    { nome:'Mão de obra (garantia)', qtd:1, valor:0, custo:0, tipo:'servico' },
  ],
  1015: [
    { nome:'Acoplamento',        qtd:1, valor:75,  tipo:'item' },
    { nome:'Limpeza completa',   qtd:1, valor:185, tipo:'servico' },
    { nome:'Mão de obra',        qtd:1, valor:35,  tipo:'servico' },
  ],
  2008: [
    { nome:'Rolamento do cesto', qtd:1, valor:95,  tipo:'item' },
    { nome:'Polia do motor',     qtd:1, valor:55,  tipo:'item' },
    { nome:'Capa universal',     qtd:1, valor:30,  tipo:'item' },
    { nome:'Compra base',        qtd:1, valor:150, tipo:'item' },
  ],
}

// Clientes mock (para busca no formulário Nova OS)
const CLIENTES_MOCK = [
  { id:1, nome:'Ana Reis',        fone:'(67) 9 9911-1010', endereco:'R. das Acácias, 412 — Naviraí/MS' },
  { id:2, nome:'João Costa',      fone:'(67) 9 9922-2020', endereco:'R. Bahia, 87 — Naviraí/MS' },
  { id:3, nome:'Carlos Lima',     fone:'(67) 9 9933-3030', endereco:'R. Goiás, 245 — Naviraí/MS' },
  { id:4, nome:'Paula Mendes',    fone:'(67) 9 9944-4040', endereco:'Av. Cuiabá, 1.020 — Naviraí/MS' },
  { id:5, nome:'Roberto Dias',    fone:'(67) 9 9955-5050', endereco:'R. Paraná, 56 — Naviraí/MS' },
  { id:6, nome:'Maria Silva',     fone:'(67) 9 9810-1111', endereco:'R. Acre, 88 — Naviraí/MS' },
  { id:7, nome:'Pedro Alves',     fone:'(67) 9 9966-6060', endereco:'R. Ceará, 312 — Naviraí/MS' },
  { id:8, nome:'Igor Vasconcelos',fone:'(67) 9 9712-3344', endereco:'R. Maranhão, 199 — Naviraí/MS' },
]

// Máquinas do estoque disponíveis para venda (mock)
const ESTOQUE_MAQUINAS_MOCK = [
  { id:'M-201', descricao:'Lavadora reformada Consul 10kg', valor:650 },
  { id:'M-203', descricao:'Lavadora reformada LG 11kg',     valor:650 },
  { id:'M-204', descricao:'Lavadora reformada Brastemp 9kg',valor:650 },
]

// Status do prazo da OS
function calcStatusPrazo(prazoIso, etapaId) {
  if (etapaId === 'concluido' || etapaId === 'recusado') return 'ok'
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const prazo = new Date(prazoIso); prazo.setHours(0,0,0,0)
  const diff = Math.round((prazo - hoje)/86400000)
  if (diff < 0)  return 'vencido'
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanha'
  return 'ok'
}
function diasPrazo(prazoIso) {
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const prazo = new Date(prazoIso); prazo.setHours(0,0,0,0)
  return Math.round((prazo - hoje)/86400000)
}
function fmtPrazoCurto(prazoIso) {
  const d = new Date(prazoIso)
  return d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }).replace('.','')
}

// ─── Login ─────────────────────────────────────────────────────────────────
function Login({ dark, T }) {
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(e) {
    e.preventDefault(); setLoading(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos')
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:T.bg, fontFamily:'system-ui,sans-serif', padding:'1rem' }}>
      <div className="idemaq-card" style={{ background:T.card, padding:'2rem', borderRadius:14, width:'100%', maxWidth:340, border:`1px solid ${T.border}`, boxShadow: dark?'0 8px 32px rgba(0,0,0,0.4)':'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign:'center', marginBottom:'1.75rem' }}>
          <div style={{ width:52, height:52, background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <i className="ti ti-tool" style={{ fontSize:24, color:'#fff' }} aria-hidden="true" />
          </div>
          <h2 style={{ color:T.textPrimary, marginBottom:4, fontSize:22, fontWeight:700 }}>Idemaq</h2>
          <p style={{ color:T.textMuted, fontSize:14 }}>Sistema de gestão</p>
        </div>
        <form onSubmit={entrar}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:13, color:T.textSecondary, display:'block', marginBottom:5 }}>E-mail</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1px solid ${T.border}`, fontSize:14, boxSizing:'border-box', background:T.bg, color:T.textPrimary, outline:'none' }}
              placeholder="seu@email.com" required />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ fontSize:13, color:T.textSecondary, display:'block', marginBottom:5 }}>Senha</label>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)}
              style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1px solid ${T.border}`, fontSize:14, boxSizing:'border-box', background:T.bg, color:T.textPrimary, outline:'none' }}
              placeholder="••••••••" required />
          </div>
          {erro && <p style={{ color:P.red, fontSize:13, marginBottom:'1rem', textAlign:'center' }}>{erro}</p>}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:11, background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, color:'#fff', border:'none', borderRadius:9, fontSize:14, cursor:'pointer', fontWeight:600 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── NavItem ───────────────────────────────────────────────────────────────
function NavItem({ m, active, onClick, collapsed, T, dark }) {
  const activeBg  = dark ? '#1a3a5c' : '#e6f1fb'
  const activeClr = dark ? P.blue    : P.blueDark
  const iconClr   = dark ? (active ? P.blue : T.textDim) : (active ? P.blueDark : T.textMuted)
  return (
    <button onClick={onClick} title={collapsed ? m.label : undefined}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:collapsed?0:9, padding:collapsed?'9px 0':'9px 10px', justifyContent:collapsed?'center':'flex-start', border:'none', cursor:'pointer', fontSize:13, textAlign:'left', background:active?activeBg:'transparent', color:active?activeClr:T.textMuted, borderRadius:7, position:'relative', marginBottom:1 }}>
      <i className={`ti ${m.icon}`} style={{ fontSize:16, flexShrink:0, color:iconClr }} aria-hidden="true" />
      {!collapsed && <span style={{ whiteSpace:'nowrap' }}>{m.label}</span>}
      {m.badge && <span style={{ position:'absolute', top:collapsed?4:'auto', right:collapsed?4:8, background:P.red, color:'#fff', fontSize:9, fontWeight:700, borderRadius:10, padding:'1px 5px', minWidth:16, textAlign:'center' }}>{m.badge}</span>}
    </button>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────
function Sidebar({ pagina, setPagina, user, sair, collapsed, setCollapsed, T, dark }) {
  const initials = user?.email?.substring(0,2).toUpperCase() || 'US'
  const w = collapsed ? 56 : 210
  return (
    <div style={{ width:w, minWidth:w, background:T.sbBg, display:'flex', flexDirection:'column', flexShrink:0, borderRight:`1px solid ${T.border}`, transition:'width .2s ease', overflow:'hidden' }}>
      <div style={{ height:56, padding:'0 12px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:collapsed?'center':'space-between', flexShrink:0, gap:8 }}>
        {!collapsed && (
          <div style={{ display:'flex', alignItems:'center', gap:9, overflow:'hidden' }}>
            <div style={{ width:28, height:28, background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="ti ti-tool" style={{ fontSize:14, color:'#fff' }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ color:T.textPrimary, fontWeight:700, fontSize:15, letterSpacing:'-.3px', whiteSpace:'nowrap' }}>Idemaq</div>
              <div style={{ color:T.textDim, fontSize:9, letterSpacing:'.5px', textTransform:'uppercase' }}>Gestão</div>
            </div>
          </div>
        )}
        <button onClick={()=>setCollapsed(!collapsed)} style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', fontSize:18, padding:4, flexShrink:0, lineHeight:1 }} aria-label="Recolher menu">☰</button>
      </div>

      <div style={{ flex:1, padding:'6px 0', overflowY:'auto', overflowX:'hidden' }}>
        {!collapsed && <div style={{ padding:'10px 14px 4px', fontSize:10, color:T.textDim, textTransform:'uppercase', letterSpacing:'.6px', fontWeight:600 }}>Principal</div>}
        <div style={{ padding:'0 6px' }}>
          {MENUS.filter(m=>m.section==='principal').map(m=><NavItem key={m.id} m={m} active={pagina===m.id} onClick={()=>setPagina(m.id)} collapsed={collapsed} T={T} dark={dark} />)}
        </div>
        {!collapsed && <div style={{ padding:'10px 14px 4px', fontSize:10, color:T.textDim, textTransform:'uppercase', letterSpacing:'.6px', fontWeight:600 }}>Operação</div>}
        <div style={{ padding:'0 6px' }}>
          {MENUS.filter(m=>m.section==='operacao').map(m=><NavItem key={m.id} m={m} active={pagina===m.id} onClick={()=>setPagina(m.id)} collapsed={collapsed} T={T} dark={dark} />)}
        </div>
      </div>

      <div style={{ padding:collapsed?'10px 6px':'12px', borderTop:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:9, overflow:'hidden' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>{initials}</div>
        {!collapsed && <>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:12, color:T.textSecondary, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email||'Usuário'}</div>
            <div style={{ fontSize:10, color:T.textMuted }}>Administrador</div>
          </div>
          <button onClick={sair} style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:4, borderRadius:5, flexShrink:0 }} aria-label="Sair">
            <i className="ti ti-logout" style={{ fontSize:15 }} aria-hidden="true" />
          </button>
        </>}
      </div>
    </div>
  )
}

// ─── Topbar ────────────────────────────────────────────────────────────────
function Topbar({ pagina, dark, toggleDark, T }) {
  const label = MENUS.find(m=>m.id===pagina)?.label || 'Painel'
  const hoje  = new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})
  const btnStyle = { width:34, height:34, borderRadius:8, background: dark?'#1a2840':'#f0f0f2', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }
  return (
    <div style={{ background:T.topBg, borderBottom:`1px solid ${T.border}`, padding:'0 1.25rem', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16, fontWeight:600, color:T.textPrimary }}>{label}</span>
        <span style={{ fontSize:12, color:T.textDim, background:T.bg, padding:'3px 9px', borderRadius:6, border:`1px solid ${T.border}` }}>{hoje}</span>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={toggleDark} style={btnStyle} aria-label={dark?'Modo claro':'Modo escuro'}>
          <i className={`ti ${dark?'ti-sun':'ti-moon'}`} style={{ fontSize:17, color: dark?P.yellow:T.textMuted }} aria-hidden="true" />
        </button>
        <div style={{ ...btnStyle, position:'relative' }}>
          <i className="ti ti-bell" style={{ fontSize:17, color:T.textMuted }} aria-hidden="true" />
          <div style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:P.red, border:`2px solid ${T.topBg}` }} />
        </div>
        <div style={{ ...btnStyle, background: dark?'#1a3a5c':'#e6f1fb' }}>
          <i className="ti ti-settings" style={{ fontSize:17, color: dark?P.blue:P.blueDark }} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

// ─── Topbar Mobile ─────────────────────────────────────────────────────────
function TopbarMobile({ pagina, dark, toggleDark, T }) {
  const label = MENUS.find(m=>m.id===pagina)?.label || 'Painel'
  return (
    <div style={{ background:T.topBg, borderBottom:`1px solid ${T.border}`, padding:'0 1rem', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:26, height:26, background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-tool" style={{ fontSize:13, color:'#fff' }} aria-hidden="true" />
        </div>
        <span style={{ fontSize:15, fontWeight:700, color:T.textPrimary }}>Idemaq</span>
        <span style={{ fontSize:12, color:T.textMuted }}>/ {label}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={toggleDark} style={{ background:'transparent', border:'none', cursor:'pointer', padding:4 }} aria-label={dark?'Modo claro':'Modo escuro'}>
          <i className={`ti ${dark?'ti-sun':'ti-moon'}`} style={{ fontSize:18, color: dark?P.yellow:T.textMuted }} aria-hidden="true" />
        </button>
        <div style={{ position:'relative' }}>
          <i className="ti ti-bell" style={{ fontSize:20, color:T.textMuted, cursor:'pointer' }} aria-hidden="true" />
          <div style={{ position:'absolute', top:0, right:0, width:7, height:7, borderRadius:'50%', background:P.red, border:`2px solid ${T.topBg}` }} />
        </div>
      </div>
    </div>
  )
}

// ─── Bottom Nav Mobile ─────────────────────────────────────────────────────
function BottomNav({ pagina, setPagina, sair, T, dark }) {
  const items = MENUS.filter(m=>MENUS_MOBILE.includes(m.id))
  const activeClr = dark ? P.blue : P.blueDark
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, background:T.card, borderTop:`1px solid ${T.border}`, display:'flex', zIndex:100, height:60 }}>
      {items.map(m=>(
        <button key={m.id} onClick={()=>setPagina(m.id)}
          style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'transparent', border:'none', cursor:'pointer', color:pagina===m.id?activeClr:T.textMuted, position:'relative' }}>
          <i className={`ti ${m.icon}`} style={{ fontSize:20 }} aria-hidden="true" />
          <span style={{ fontSize:9, fontWeight:600 }}>{m.label}</span>
          {m.badge && <span style={{ position:'absolute', top:6, right:'calc(50% - 14px)', background:P.red, color:'#fff', fontSize:8, fontWeight:700, borderRadius:10, padding:'1px 4px', minWidth:14, textAlign:'center' }}>{m.badge}</span>}
        </button>
      ))}
      <button onClick={sair} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'transparent', border:'none', cursor:'pointer', color:T.textMuted }}>
        <i className="ti ti-logout" style={{ fontSize:20 }} aria-hidden="true" />
        <span style={{ fontSize:9, fontWeight:600 }}>Sair</span>
      </button>
    </div>
  )
}

// ─── Painel Desktop ────────────────────────────────────────────────────────
function Painel({ T, dark }) {
  const cor = (d, c) => dark ? d : c

  const metas = [
    { label:'Faturamento — meta R$ 20.000', pct:71, cor:cor(P.blue,P.blueDark), sub:'R$ 14.260 atingido · faltam R$ 5.740' },
    { label:'Meta diária — Seg a Sab · 11 dias restantes', pct:58, cor:cor(P.yellow,P.yellowDark), sub:'R$ 491/dia necessário · feriados excluídos' },
  ]

  const kpis = [
    { label:'Faturamento mai', valor:'R$ 14.260', cor:cor(P.blue,P.blueDark),           icoBg:cor('#0d2035','#e6f1fb'), ico:'ti-cash',              trend:'+12% vs abr',       trendCor:cor(P.green,P.greenDark) },
    { label:'Saldo líquido',   valor:'R$ 4.420',  cor:cor(P.blueLight,P.blueLightDark), icoBg:cor('#0d2035','#e6f1fb'), ico:'ti-trending-up',        trend:'+8% vs abr',        trendCor:cor(P.green,P.greenDark) },
    { label:'A pagar hoje',    valor:'R$ 2.090',  cor:cor(P.red,P.redDark),             icoBg:cor('#2a1515','#fde8e8'), ico:'ti-receipt',            trend:'2 vencimentos',     trendCor:cor(P.red,P.redDark) },
    { label:'Máq. na oficina', valor:'18',         cor:cor(P.yellow,P.yellowDark),       icoBg:cor('#2a2000','#fdf6dc'), ico:'ti-building-warehouse', trend:'14 em OS · 4 à venda', trendCor:T.textMuted },
  ]

  const chartAnualData = {
    labels:['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    datasets:[
      { label:'Recebido', data:[18000,12000,15000,9000,14260,0,0,0,0,0,0,0], backgroundColor:cor(P.blue,P.blueDark), borderRadius:3, stack:'s' },
      { label:'Pago',     data:[-12000,-9000,-11000,-7000,-9840,0,0,0,0,0,0,0], backgroundColor:cor(P.red,P.redDark), borderRadius:3, stack:'s' },
      { type:'line', label:'Saldo', data:[6000,9000,13000,15000,19420,null,null,null,null,null,null,null], borderColor:cor(P.blueLight,P.blueLightDark), borderWidth:1.5, pointBackgroundColor:cor(P.blueLight,P.blueLightDark), pointRadius:3, tension:0.4, fill:false, stack:undefined },
    ]
  }
  const chartMesData = {
    labels:['10/mai','11/mai','12/mai','13/mai','14/mai'],
    datasets:[
      { label:'Recebido', data:[48000,14000,16000,32000,0],    backgroundColor:cor(P.blue,P.blueDark), borderRadius:3, stack:'s' },
      { label:'Pago',     data:[-28000,-8000,-10000,-18000,0], backgroundColor:cor(P.red,P.redDark),  borderRadius:3, stack:'s' },
      { type:'line', label:'Saldo', data:[68000,64000,70000,72000,68000], borderColor:cor(P.blueLight,P.blueLightDark), borderWidth:1.5, pointBackgroundColor:cor(P.blueLight,P.blueLightDark), pointRadius:3, tension:0.4, fill:false, stack:undefined },
    ]
  }

  const gridColor = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const tickColor = T.textDim
  const chartOpts = () => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{ backgroundColor:T.card, titleColor:T.textPrimary, bodyColor:T.textSecondary, borderColor:T.border, borderWidth:1, padding:9 } },
    scales:{
      x:{ stacked:true, grid:{color:gridColor}, ticks:{color:tickColor,font:{size:10}}, border:{color:'transparent'} },
      y:{ stacked:true, grid:{color:gridColor}, ticks:{color:tickColor,font:{size:10},callback:v=>(v<0?'-R$'+Math.abs(Math.round(v/1000))+'k':'R$'+Math.round(v/1000)+'k')}, border:{color:'transparent'} }
    }
  })

  const osItems = [
    { label:'Ag. agenda',  n:2, bg:T.osNeutro,                      border:T.border,                                      c:T.osNeutroT },
    { label:'Agendado',    n:3, bg:T.osNeutro,                       border:T.border,                                      c:T.osNeutroT },
    { label:'Diagnóstico', n:2, bg:cor('#2a2000','#fdf6dc'),         border:cor(P.yellow+'22',P.yellowDark+'33'),           c:cor(P.yellow,P.yellowDark) },
    { label:'Orçamento',   n:2, bg:cor('#2a1515','#fde8e8'),         border:cor(P.red+'22',P.redDark+'33'),                 c:cor(P.red,P.redDark) },
    { label:'Limpeza',     n:1, bg:T.osNeutro,                       border:T.border,                                      c:T.osNeutroT },
    { label:'Manutenção',  n:1, bg:T.osNeutro,                       border:T.border,                                      c:T.osNeutroT },
    { label:'Finalizado',  n:1, bg:cor('#0f2a15','#e8f5ec'),         border:cor(P.green+'22',P.greenDark+'33'),             c:cor(P.green,P.greenDark) },
    { label:'Entregas',    n:2, bg:cor('#0d2035','#e6f1fb'),         border:cor(P.blue+'22',P.blueDark+'33'),               c:cor(P.blue,P.blueDark) },
  ]

  const agendamentos = [
    { hr:'08:30', dt:'hoje',   tipo:'urgente', nm:'Ana Reis · Lavadora LG',              svc:'Diagnóstico', tempo:'1h 20min' },
    { hr:'10:00', dt:'hoje',   tipo:'hoje',    nm:'João Costa · Geladeira Consul',        svc:'Manutenção',  tempo:'2h 50min' },
    { hr:'14:00', dt:'hoje',   tipo:'hoje',    nm:'Maria Silva · Fogão Brastemp',         svc:'Limpeza',     tempo:'6h 50min' },
    { hr:'09:00', dt:'amanhã', tipo:'proximo', nm:'Carlos Lima · Micro-ondas Electrolux', svc:'Orçamento',   tempo:'amanhã' },
    { hr:'11:30', dt:'amanhã', tipo:'proximo', nm:'Paula Mendes · Ar cond. Midea',        svc:'Instalação',  tempo:'amanhã' },
  ]
  const calCor = t => t==='urgente'?cor(P.red,P.redDark):t==='hoje'?cor(P.yellow,P.yellowDark):cor(P.green,P.greenDark)
  const calBg  = t => t==='urgente'?cor('#2a1515','#fde8e8'):t==='hoje'?cor('#2a2000','#fdf6dc'):cor('#0f2a15','#e8f5ec')

  const alertaReceber = [
    { msg:'OS #1031 · João Costa',  sub:'Venceu há 3 dias · R$ 320,00', tipo:'vencido' },
    { msg:'OS #1028 · Ana Reis',    sub:'Venceu há 5 dias · R$ 215,00', tipo:'vencido' },
    { msg:'OS #1036 · Maria Silva', sub:'Vence hoje · R$ 480,00',        tipo:'hoje' },
  ]
  const alertaPagar = [
    { msg:'Fornecedor Peças ABC', sub:'Venceu ontem · R$ 890,00',    tipo:'vencido' },
    { msg:'Aluguel',              sub:'Vence amanhã · R$ 1.200,00',  tipo:'amanha' },
    { msg:'Energia elétrica',     sub:'Vence em 2 dias · R$ 380,00', tipo:'2dias' },
  ]
  const alertaEtapas = [
    { msg:'OS #1037 · João Costa',   sub:'Diagnóstico há 31h', horas:'31h', critico:true },
    { msg:'OS #1034 · Paula Mendes', sub:'Orçamento há 26h',   horas:'26h', critico:true },
    { msg:'OS #1041 · Carlos Lima',  sub:'Pré-diag. há 22h',   horas:'22h', critico:false },
  ]
  const alertaPrazo = [
    { msg:'OS #1036 · Ana Reis · Lavadora LG',    sub:'Prazo era 11/mai · 2 dias atrasado', tipo:'atrasada' },
    { msg:'OS #1033 · Pedro Alves · Secadora',    sub:'Prazo era 12/mai · 1 dia atrasado',  tipo:'atrasada' },
    { msg:'OS #1039 · Carlos Lima · Micro-ondas', sub:'Prazo hoje às 18h · faltam 5h',      tipo:'hoje' },
  ]
  const alertaEstoque = [
    { msg:'Rolamento do cesto', sub:'0 unid. · 14 saídas/mês', tipo:'esgotado' },
    { msg:'Resistência 220V',   sub:'1 unid. · 11 saídas/mês', tipo:'critico' },
    { msg:'Dreno sanfonado',    sub:'3 unid. · 9 saídas/mês',  tipo:'baixo' },
  ]
  const top5 = [
    { nm:'Rolamento do cesto',   pct:100, qtd:0,  qtdCor:cor(P.red,P.redDark) },
    { nm:'Resistência 220V',     pct:79,  qtd:1,  qtdCor:cor(P.red,P.redDark) },
    { nm:'Dreno sanfonado',      pct:64,  qtd:3,  qtdCor:cor(P.yellow,P.yellowDark) },
    { nm:'Capacitor partida',    pct:50,  qtd:8,  qtdCor:T.textMuted },
    { nm:'Termostato universal', pct:36,  qtd:12, qtdCor:T.textMuted },
  ]

  const sepColor = dark ? '#1e1e20' : '#f0f0f2'

  function AlRow({ msg, sub, dot, badge }) {
    return (
      <div style={{ display:'flex', alignItems:'flex-start', gap:7, padding:'6px 0', borderBottom:`1px solid ${sepColor}` }}>
        <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, marginTop:5, background:dot }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, color:T.textSecondary, lineHeight:1.3, fontWeight:500 }}>{msg}</div>
          <div style={{ fontSize:10, color:T.textDim, marginTop:2 }}>{sub}</div>
        </div>
        {badge}
      </div>
    )
  }

  function AlCard({ icon, title, count, countRed, children, footer }) {
    return (
      <div style={{ background:T.cardAlt, borderRadius:10, padding:'12px 13px', border:`1px solid ${T.border}` }}>
        <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:9, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}><i className={`ti ${icon}`} style={{ fontSize:14 }} aria-hidden="true" />{title}</div>
          <CountBadge n={count} red={countRed} T={T} dark={dark} />
        </div>
        {children}
        {footer && <div style={{ marginTop:7, paddingTop:7, borderTop:`1px solid ${T.border}`, fontSize:11, color:T.textDim, display:'flex', gap:12, flexWrap:'wrap' }}>{footer}</div>}
      </div>
    )
  }

  const card = { background:T.card, borderRadius:11, padding:'14px 16px', border:`1px solid ${T.border}` }
  const row2 = { display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10 }
  const row4 = { display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10 }
  const row3 = { display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10 }

  return (
    <div style={{ padding:'1.1rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:10, fontSize:14 }}>

      {/* Metas */}
      <div style={card}>
        <SecTitle icon="ti-target" T={T}>Metas de maio</SecTitle>
        <div style={row2}>
          {metas.map((m,i) => (
            <div key={i}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
                <span style={{ fontSize:11, color:T.textSecondary }}>{m.label}</span>
                <span style={{ fontSize:13, fontWeight:600, color:m.cor }}>{m.pct}%</span>
              </div>
              <div style={{ background:T.progBg, borderRadius:3, height:4, overflow:'hidden' }}>
                <div style={{ width:`${m.pct}%`, height:'100%', borderRadius:3, background:m.cor }} />
              </div>
              <div style={{ fontSize:10, color:T.textDim, marginTop:4 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={row4}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:T.card, borderRadius:11, border:`1px solid ${T.border}`, overflow:'hidden' }}>
            <div style={{ height:3, background:k.cor }} />
            <div style={{ padding:'13px 15px' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:k.icoBg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:9 }}>
                <i className={`ti ${k.ico}`} style={{ fontSize:15, color:k.cor }} aria-hidden="true" />
              </div>
              <div style={{ fontSize:20, fontWeight:700, color:k.cor, marginBottom:3, letterSpacing:'-.5px' }}>{k.valor}</div>
              <div style={{ fontSize:11, color:T.textMuted, marginBottom:6 }}>{k.label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:k.trendCor }}>
                <i className="ti ti-minus" style={{ fontSize:11 }} aria-hidden="true" /><span>{k.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={row2}>
        {[
          { title:'Fluxo de caixa anual',  total:'R$ 68.260', sub:'recebido em 2025 até mai', data:chartAnualData },
          { title:'Fluxo de caixa — maio', total:'R$ 19.420', sub:'saldo acumulado em maio',  data:chartMesData },
        ].map((g,i) => (
          <div key={i} style={card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:T.textMuted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3, display:'flex', alignItems:'center', gap:5 }}>
                  <i className="ti ti-arrows-exchange" style={{ fontSize:13 }} aria-hidden="true" />{g.title}
                </div>
                <div style={{ fontSize:18, fontWeight:700, color:cor(P.blue,P.blueDark), letterSpacing:'-.5px' }}>{g.total}</div>
                <div style={{ fontSize:10, color:T.textDim, marginTop:2 }}>{g.sub}</div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                {[{c:cor(P.blue,P.blueDark),l:'Rec.'},{c:cor(P.red,P.redDark),l:'Pago'},{c:cor(P.blueLight,P.blueLightDark),l:'Saldo',line:true}].map((leg,j) => (
                  <span key={j} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:T.textDim }}>
                    {leg.line?<span style={{ width:10, height:2, background:leg.c, display:'inline-block' }}/>:<span style={{ width:8, height:8, borderRadius:2, background:leg.c, display:'inline-block' }}/>}
                    {leg.l}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ position:'relative', width:'100%', height:150 }}>
              <Bar data={g.data} options={chartOpts()} />
            </div>
          </div>
        ))}
      </div>

      {/* OS + Agendamentos */}
      <div style={row2}>
        <div style={card}>
          <SecTitle icon="ti-clipboard-list" T={T} right={<CountBadge n="14 total" T={T} dark={dark} />}>Situação das OS</SecTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:6 }}>
            {osItems.map((os,i) => (
              <div key={i} style={{ borderRadius:8, padding:'9px 6px', textAlign:'center', border:`1px solid ${os.border}`, background:os.bg }}>
                <div style={{ fontSize:17, fontWeight:700, color:os.c }}>{os.n}</div>
                <div style={{ fontSize:10, marginTop:3, lineHeight:1.3, color:os.c, opacity:.85 }}>{os.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <SecTitle icon="ti-calendar-event" T={T} right={<CountBadge n="5 hoje e amanhã" T={T} dark={dark} />}>Próximos agendamentos</SecTitle>
          {agendamentos.map((a,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 0', borderBottom:i<agendamentos.length-1?`1px solid ${sepColor}`:'none' }}>
              <div style={{ textAlign:'right', minWidth:46 }}>
                <div style={{ fontSize:12, fontWeight:600, color:T.textPrimary }}>{a.hr}</div>
                <div style={{ fontSize:10, color:T.textMuted }}>{a.dt}</div>
              </div>
              <div style={{ width:3, height:34, borderRadius:2, flexShrink:0, background:calCor(a.tipo) }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:T.textSecondary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:500 }}>{a.nm}</div>
                <div style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>{a.svc}</div>
              </div>
              <Badge color={calCor(a.tipo)} bg={calBg(a.tipo)} border={calCor(a.tipo)+'33'}>{a.tempo}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas */}
      <div style={card}>
        <SecTitle icon="ti-alert-triangle" T={T} right={<CountBadge n="9 ativos" red T={T} dark={dark} />}>Alertas da operação</SecTitle>
        <div style={row3}>
          <AlCard icon="ti-arrow-down-circle" title="A receber" count={3} countRed footer={<><span>Vencido: <strong style={{color:cor(P.red,P.redDark)}}>R$ 535</strong></span><span>Próx. 2d: <strong style={{color:cor(P.yellow,P.yellowDark)}}>R$ 1.080</strong></span></>}>
            {alertaReceber.map((a,i)=><AlRow key={i} msg={a.msg} sub={a.sub} dot={a.tipo==='vencido'?cor(P.red,P.redDark):a.tipo==='hoje'?cor(P.yellow,P.yellowDark):cor(P.green,P.greenDark)} badge={<StatusBadge tipo={a.tipo} dark={dark}/>}/>)}
          </AlCard>
          <AlCard icon="ti-arrow-up-circle" title="A pagar" count={3} countRed footer={<><span>Vencido: <strong style={{color:cor(P.red,P.redDark)}}>R$ 890</strong></span><span>Próx. 2d: <strong style={{color:cor(P.yellow,P.yellowDark)}}>R$ 2.090</strong></span></>}>
            {alertaPagar.map((a,i)=><AlRow key={i} msg={a.msg} sub={a.sub} dot={a.tipo==='vencido'?cor(P.red,P.redDark):a.tipo==='amanha'?cor(P.yellow,P.yellowDark):cor(P.green,P.greenDark)} badge={<StatusBadge tipo={a.tipo} dark={dark}/>}/>)}
          </AlCard>
          <AlCard icon="ti-clock-exclamation" title="Etapas +24h" count={3} countRed>
            {alertaEtapas.map((a,i)=><AlRow key={i} msg={a.msg} sub={a.sub} dot={a.critico?cor(P.red,P.redDark):cor(P.yellow,P.yellowDark)} badge={<Badge color={a.critico?cor(P.red,P.redDark):cor(P.yellow,P.yellowDark)} bg={a.critico?cor('#2a1515','#fde8e8'):cor('#2a2000','#fdf6dc')} border={(a.critico?cor(P.red,P.redDark):cor(P.yellow,P.yellowDark))+'33'}>{a.horas}</Badge>}/>)}
          </AlCard>
          <AlCard icon="ti-calendar-x" title="Prazo de conclusão" count={3} countRed>
            {alertaPrazo.map((a,i)=><AlRow key={i} msg={a.msg} sub={a.sub} dot={a.tipo==='atrasada'?cor(P.red,P.redDark):cor(P.yellow,P.yellowDark)} badge={<StatusBadge tipo={a.tipo} dark={dark}/>}/>)}
          </AlCard>
          <AlCard icon="ti-package" title="Estoque crítico" count={3} countRed>
            {alertaEstoque.map((a,i)=><AlRow key={i} msg={a.msg} sub={a.sub} dot={a.tipo==='esgotado'||a.tipo==='critico'?cor(P.red,P.redDark):cor(P.yellow,P.yellowDark)} badge={<StatusBadge tipo={a.tipo} dark={dark}/>}/>)}
          </AlCard>
          <AlCard icon="ti-packages" title="Top 5 peças" count="saídas/mês">
            {top5.map((p,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:i<top5.length-1?`1px solid ${sepColor}`:'none' }}>
                <span style={{ fontSize:10, color:T.textDim, minWidth:16, fontWeight:600 }}>#{i+1}</span>
                <span style={{ fontSize:11, color:T.textMuted, flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.nm}</span>
                <div style={{ width:46, background:T.progBg, borderRadius:2, height:3, overflow:'hidden', flexShrink:0 }}>
                  <div style={{ width:`${p.pct}%`, height:'100%', borderRadius:2, background:cor(P.blue,P.blueDark) }} />
                </div>
                <span style={{ fontSize:11, minWidth:32, textAlign:'right', flexShrink:0, fontWeight:600, color:p.qtdCor }}>{p.qtd} un</span>
              </div>
            ))}
          </AlCard>
        </div>
      </div>
    </div>
  )
}

// ─── Painel Mobile ─────────────────────────────────────────────────────────
function PainelMobile({ T, dark }) {
  const cor = (d, c) => dark ? d : c
  const kpis = [
    { label:'Faturamento mai', valor:'R$ 14.260', cor:cor(P.blue,P.blueDark),           ico:'ti-cash' },
    { label:'Saldo líquido',   valor:'R$ 4.420',  cor:cor(P.blueLight,P.blueLightDark), ico:'ti-trending-up' },
    { label:'A pagar hoje',    valor:'R$ 2.090',  cor:cor(P.red,P.redDark),             ico:'ti-receipt' },
    { label:'Máq. na oficina', valor:'18',         cor:cor(P.yellow,P.yellowDark),       ico:'ti-building-warehouse' },
  ]
  const agendamentos = [
    { hr:'08:30', tipo:'urgente', nm:'Ana Reis · Lavadora LG',              svc:'Diagnóstico', tempo:'1h 20min' },
    { hr:'10:00', tipo:'hoje',    nm:'João Costa · Geladeira Consul',        svc:'Manutenção',  tempo:'2h 50min' },
    { hr:'14:00', tipo:'hoje',    nm:'Maria Silva · Fogão Brastemp',         svc:'Limpeza',     tempo:'6h 50min' },
    { hr:'09:00', tipo:'proximo', nm:'Carlos Lima · Micro-ondas Electrolux', svc:'Orçamento',   tempo:'amanhã' },
  ]
  const calCor = t => t==='urgente'?cor(P.red,P.redDark):t==='hoje'?cor(P.yellow,P.yellowDark):cor(P.green,P.greenDark)
  const calBg  = t => t==='urgente'?cor('#2a1515','#fde8e8'):t==='hoje'?cor('#2a2000','#fdf6dc'):cor('#0f2a15','#e8f5ec')
  const alertas = [
    { dot:cor(P.red,P.redDark),       msg:'OS #1031 · João Costa · R$ 320 vencido',  badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Vencido</Badge> },
    { dot:cor(P.red,P.redDark),       msg:'OS #1036 · Ana Reis · R$ 215 vencido',    badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Vencido</Badge> },
    { dot:cor(P.yellow,P.yellowDark), msg:'Aluguel vence amanhã · R$ 1.200',         badge:<Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Amanhã</Badge> },
    { dot:cor(P.red,P.redDark),       msg:'OS #1037 · Diagnóstico há 31h',           badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>31h</Badge> },
    { dot:cor(P.red,P.redDark),       msg:'OS #1036 · Ana Reis · 2 dias atrasado',   badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Atrasada</Badge> },
    { dot:cor(P.red,P.redDark),       msg:'Rolamento do cesto · Esgotado',           badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Esgotado</Badge> },
  ]
  const sep = dark ? '#1e1e20' : '#f0f0f2'
  const card = { background:T.card, borderRadius:12, padding:'14px 15px', border:`1px solid ${T.border}` }

  return (
    <div style={{ padding:'1rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:10, paddingBottom:70 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:T.card, borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
            <div style={{ height:3, background:k.cor }} />
            <div style={{ padding:'12px 13px' }}>
              <i className={`ti ${k.ico}`} style={{ fontSize:18, color:k.cor, marginBottom:6, display:'block' }} aria-hidden="true" />
              <div style={{ fontSize:18, fontWeight:700, color:k.cor, letterSpacing:'-.5px' }}>{k.valor}</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={card}>
        <SecTitle icon="ti-calendar-event" T={T}>Agendamentos de hoje</SecTitle>
        {agendamentos.map((a,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<agendamentos.length-1?`1px solid ${sep}`:'none' }}>
            <div style={{ width:3, height:36, borderRadius:2, flexShrink:0, background:calCor(a.tipo) }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:T.textSecondary, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nm}</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>{a.hr} · {a.svc}</div>
            </div>
            <Badge color={calCor(a.tipo)} bg={calBg(a.tipo)} border={calCor(a.tipo)+'33'}>{a.tempo}</Badge>
          </div>
        ))}
      </div>
      <div style={card}>
        <SecTitle icon="ti-alert-triangle" T={T} right={<CountBadge n="6" red T={T} dark={dark} />}>Alertas</SecTitle>
        {alertas.map((a,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:i<alertas.length-1?`1px solid ${sep}`:'none' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:a.dot }} />
            <div style={{ flex:1, fontSize:13, color:T.textSecondary }}>{a.msg}</div>
            {a.badge}
          </div>
        ))}
      </div>
      <div style={card}>
        <SecTitle icon="ti-clipboard-list" T={T}>Situação das OS</SecTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:6 }}>
          {[
            { label:'Ag.',         n:2, cor:T.osNeutroT,                  bg:T.osNeutro },
            { label:'Diagnóstico', n:2, cor:cor(P.yellow,P.yellowDark),   bg:cor('#2a2000','#fdf6dc') },
            { label:'Orçamento',   n:2, cor:cor(P.red,P.redDark),         bg:cor('#2a1515','#fde8e8') },
            { label:'Finalizado',  n:1, cor:cor(P.green,P.greenDark),     bg:cor('#0f2a15','#e8f5ec') },
          ].map((os,i) => (
            <div key={i} style={{ borderRadius:8, padding:'9px 6px', textAlign:'center', background:os.bg }}>
              <div style={{ fontSize:18, fontWeight:700, color:os.cor }}>{os.n}</div>
              <div style={{ fontSize:10, marginTop:2, color:os.cor, opacity:.85 }}>{os.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── OS Mobile ─────────────────────────────────────────────────────────────
// Reescrito do zero com referência Trello: 2 modos (Painel + Coluna) + swipe lateral.
// Totalmente isolado do OS desktop. Compartilha apenas mocks/helpers/configs.
function OSMobile({ T, dark, user }) {
  const cor = (d, c) => dark ? d : c
  const admin = isAdmin(user)

  // ── Modo de visualização: 'coluna' (1 etapa por vez + swipe) ou 'painel' (visão geral)
  const [modo, setModo] = useState('coluna')
  const [colIdx, setColIdx] = useState(0)

  // ── Filtros
  const [zona, setZona] = useState('todos')
  const [tiposAtivos, setTiposAtivos] = useState(() => new Set(Object.keys(TIPOS_OS)))
  function toggleTipo(id) {
    setTiposAtivos(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  const [filtro, setFiltro]             = useState('todas')
  const [funcionario, setFuncionario]   = useState('todos')
  const [verAgPeca, setVerAgPeca]       = useState(false)
  const [verRecusados, setVerRecusados] = useState(false)
  const [busca, setBusca]               = useState('')

  // ── Modais e sheets
  const [modalNova, setModalNova] = useState(false)
  const [detalhe, setDetalhe]     = useState(null)
  const [sheet, setSheet]         = useState(null)
  const [verRecusadasList, setVerRecusadasList] = useState(false)

  // ── Etapas visíveis (filtra por zona + permissão admin)
  const zonaCfg = ZONAS.find(z => z.id === zona)
  const etapasZona = zona === 'todos'
    ? ETAPAS_TODOS
    : ETAPAS_TODOS.filter(e => zonaCfg.etapas.includes(e.id))
  const etapasVisiveis = etapasZona.filter(e => admin || !e.adminOnly)

  // ── Universo base (sem filtrar por etapa)
  const buscando = busca.trim().length > 0
  const universoBase = OS_MOCK
    .filter(o => tiposAtivos.has(o.tipo))
    .filter(o => admin || (o.etapa !== 'pagamento' && o.etapa !== 'concluido'))
    .filter(o => !verAgPeca ? true : !!o.aguardando_peca)
    .filter(o => {
      if (funcionario === 'todos') return true
      const resp = responsavelAtual(o)
      return resp === funcionario || (o.historico||[]).some(h => h.funcionario === funcionario)
    })
    .filter(o => {
      const s = calcStatusPrazo(o.prazo, o.etapa)
      if (filtro === 'todas')    return true
      if (filtro === 'vencido')  return s === 'vencido'
      if (filtro === 'hoje')     return s === 'hoje' || s === 'amanha'
      if (filtro === 'ok')       return s === 'ok'
      return true
    })
    .filter(o => !buscando ||
      o.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      String(o.numero).includes(busca) ||
      (o.equipamento||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.marca||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.modelo||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.serie||'').toLowerCase().includes(busca.toLowerCase()))

  // ── Distribuir por etapa (visão unificada via match)
  const porEtapa = {}
  etapasVisiveis.forEach(e => porEtapa[e.id] = [])
  universoBase.forEach(o => {
    if (o.etapa === 'recusado') return
    const ec = etapasVisiveis.find(e => e.match && e.match[o.tipo] === o.etapa)
    if (ec) porEtapa[ec.id].push(o)
  })
  // Concluído: só mês corrente (busca escapa)
  if (porEtapa['concluido'] && !buscando) {
    porEtapa['concluido'] = porEtapa['concluido'].filter(dentroMesCorrente)
  }
  // Sort por prazo dentro de cada coluna
  Object.keys(porEtapa).forEach(k => {
    porEtapa[k].sort((a,b) => new Date(a.prazo) - new Date(b.prazo))
  })

  // ── Recusadas (separadas)
  const recusadasList = (verRecusados && (zona === 'todos' || zona === 'financeiro'))
    ? universoBase.filter(o => o.etapa === 'recusado')
    : []

  // ── Etapa atual no modo coluna (clampada)
  const totalCols = etapasVisiveis.length + (recusadasList.length > 0 ? 1 : 0)
  const colIdxClamp = Math.max(0, Math.min(colIdx, totalCols - 1))
  const olharRecusadas = recusadasList.length > 0 && colIdxClamp === etapasVisiveis.length
  const etapaAtual = olharRecusadas ? null : etapasVisiveis[colIdxClamp]
  const osDaColuna = olharRecusadas
    ? recusadasList
    : (etapaAtual ? (porEtapa[etapaAtual.id] || []) : [])

  // ── Swipe lateral
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const touchEndX   = useRef(null)
  const touchEndY   = useRef(null)
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchEndX.current = null
    touchEndY.current = null
  }
  function onTouchMove(e) {
    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY
  }
  function onTouchEnd() {
    if (touchStartX.current == null || touchEndX.current == null) return
    const dx = touchEndX.current - touchStartX.current
    const dy = touchEndY.current - touchStartY.current
    // Só conta swipe horizontal: dx > 60px e maior que dy (não confundir com scroll vertical)
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) {
      touchStartX.current = null; touchEndX.current = null
      return
    }
    if (dx > 0 && colIdxClamp > 0) setColIdx(colIdxClamp - 1)
    if (dx < 0 && colIdxClamp < totalCols - 1) setColIdx(colIdxClamp + 1)
    touchStartX.current = null
    touchEndX.current = null
  }

  // ── Helpers visuais
  const azul = cor(P.blue, P.blueDark)
  const azulBg = cor('#0d2035', '#e6f1fb')

  // ── Estados de filtros para badges
  const zonaAtiva   = zona !== 'todos'
  const tiposAtivo  = tiposAtivos.size !== Object.keys(TIPOS_OS).length
  const prazoAtivo  = filtro !== 'todas'
  const respAtivo   = funcionario !== 'todos'
  const totalFiltrosAtivos = (zonaAtiva?1:0) + (tiposAtivo?1:0) + (prazoAtivo?1:0) + (respAtivo?1:0) + (verAgPeca?1:0) + (verRecusados?1:0)

  // ── Cor da etapa atual (modo coluna)
  const corEtapaAtual = olharRecusadas
    ? cor(P.red, P.redDark)
    : (etapaAtual ? corEtapa(etapaAtual.cor, dark) : T.textMuted)

  return (
    <>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:T.bg }}>

        {/* ─── TOPO FIXO: busca + nova ─── */}
        <div style={{ padding:'.85rem 1rem 0', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, position:'relative' }}>
              <i className="ti ti-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textDim }} aria-hidden="true" />
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar OS, cliente, modelo…"
                style={{ width:'100%', padding:'10px 10px 10px 32px', borderRadius:9, border:`1px solid ${T.border}`, background:T.card, color:T.textPrimary, fontSize:13, outline:'none', boxSizing:'border-box', boxShadow: dark ? 'none' : T.shadow }} />
            </div>
            <button onClick={()=>setModalNova(true)}
              style={{ padding:'0 14px', borderRadius:9, border:'none', cursor:'pointer', background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, color:'#fff', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
              <i className="ti ti-plus" style={{ fontSize:15 }} aria-hidden="true" /> Nova
            </button>
          </div>

          {/* Switch de modo + botão de Filtros */}
          <div style={{ display:'flex', gap:8, alignItems:'stretch' }}>
            <div style={{ display:'flex', gap:0, background:T.card, padding:3, borderRadius:9, border:`1px solid ${T.border}`, boxShadow: dark ? 'none' : T.shadow }}>
              <button onClick={()=>setModo('painel')}
                style={{ padding:'8px 12px', borderRadius:6, border:'none', cursor:'pointer', background: modo==='painel' ? azulBg : 'transparent', color: modo==='painel' ? azul : T.textMuted, fontSize:12, fontWeight: modo==='painel' ? 700 : 500, display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-layout-grid" style={{ fontSize:14 }} aria-hidden="true" /> Painel
              </button>
              <button onClick={()=>setModo('coluna')}
                style={{ padding:'8px 12px', borderRadius:6, border:'none', cursor:'pointer', background: modo==='coluna' ? azulBg : 'transparent', color: modo==='coluna' ? azul : T.textMuted, fontSize:12, fontWeight: modo==='coluna' ? 700 : 500, display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-list-details" style={{ fontSize:14 }} aria-hidden="true" /> Lista
              </button>
            </div>
            <button onClick={()=>setSheet('filtros')}
              style={{ flex:1, padding:'9px 12px', borderRadius:9, border:`1px solid ${totalFiltrosAtivos>0?azul:T.border}`, background: totalFiltrosAtivos>0?azulBg:T.card, color: totalFiltrosAtivos>0?azul:T.textSecondary, fontSize:12.5, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, position:'relative', boxShadow: !dark && totalFiltrosAtivos===0 ? T.shadow : 'none' }}>
              <i className="ti ti-filter" style={{ fontSize:14 }} aria-hidden="true" />
              Filtros
              {totalFiltrosAtivos > 0 && (
                <span style={{ background:azul, color:dark?'#0b1220':'#fff', fontSize:10, fontWeight:800, borderRadius:10, minWidth:18, height:18, padding:'0 5px', display:'flex', alignItems:'center', justifyContent:'center' }}>{totalFiltrosAtivos}</span>
              )}
            </button>
          </div>
        </div>

        {/* ─── MODO PAINEL: grid 2 colunas com cards-resumo ─── */}
        {modo === 'painel' && (
          <div style={{ flex:1, overflowY:'auto', padding:'12px 1rem 80px' }}>
            <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginBottom:10, paddingLeft:2 }}>
              Toque numa etapa para ver as OS
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {etapasVisiveis.map((e, i) => {
                const list = porEtapa[e.id] || []
                const etapaC = corEtapa(e.cor, dark)
                const etapaBgC = bgEtapa(e.cor, dark)
                return (
                  <button key={e.id} onClick={()=>{ setColIdx(i); setModo('coluna') }}
                    style={{ background:T.card, border:`1px solid ${T.border}`, borderTop:`4px solid ${etapaC}`, borderRadius:12, padding:'14px 12px', cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:4, minHeight:104, boxShadow: dark ? 'none' : T.shadow }}>
                    <div style={{ fontSize:11.5, color:T.textMuted, fontWeight:600, lineHeight:1.2, minHeight:28 }}>{e.label}</div>
                    <div style={{ fontSize:32, fontWeight:800, color: list.length > 0 ? T.textPrimary : T.textDim, lineHeight:1, marginTop:4 }}>{list.length}</div>
                    <div style={{ fontSize:10.5, color: list.length > 0 ? etapaC : T.textDim, fontWeight:600, marginTop:4, padding:'2px 7px', background: list.length > 0 ? etapaBgC : 'transparent', borderRadius:4, alignSelf:'flex-start' }}>
                      {list.length === 0 ? 'Vazio' : list.length === 1 ? '1 OS' : `${list.length} OSs`}
                    </div>
                  </button>
                )
              })}
              {recusadasList.length > 0 && (
                <button onClick={()=>{ setColIdx(etapasVisiveis.length); setModo('coluna') }}
                  style={{ background:T.card, border:`1px solid ${T.border}`, borderTop:`4px solid ${cor(P.red,P.redDark)}`, borderRadius:12, padding:'14px 12px', cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:4, minHeight:104, boxShadow: dark ? 'none' : T.shadow }}>
                  <div style={{ fontSize:11.5, color:T.textMuted, fontWeight:600, minHeight:28 }}>Recusadas</div>
                  <div style={{ fontSize:32, fontWeight:800, color:T.textPrimary, lineHeight:1, marginTop:4 }}>{recusadasList.length}</div>
                  <div style={{ fontSize:10.5, color:cor(P.red,P.redDark), fontWeight:600, marginTop:4, padding:'2px 7px', background:cor('#2a1515','#fde8e8'), borderRadius:4, alignSelf:'flex-start' }}>
                    {recusadasList.length === 1 ? '1 OS' : `${recusadasList.length} OSs`}
                  </div>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── MODO COLUNA: 1 etapa por vez + swipe lateral ─── */}
        {modo === 'coluna' && totalCols > 0 && (
          <>
            {/* Header da coluna ativa */}
            <div style={{ padding:'12px 1rem 6px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexShrink:0 }}>
              <button onClick={()=>setColIdx(Math.max(0, colIdxClamp - 1))} disabled={colIdxClamp===0} aria-label="Coluna anterior"
                style={{ width:38, height:38, borderRadius:9, border:`1px solid ${T.border}`, background:T.card, color: colIdxClamp===0 ? T.textDim : T.textPrimary, cursor: colIdxClamp===0?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: colIdxClamp===0 ? .35 : 1, flexShrink:0, boxShadow: dark ? 'none' : T.shadow }}>
                <i className="ti ti-chevron-left" style={{ fontSize:18 }} aria-hidden="true" />
              </button>

              <div style={{ flex:1, textAlign:'center', minWidth:0 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'3px 10px', borderRadius:14, background: olharRecusadas ? cor('#2a1515','#fde8e8') : (etapaAtual ? bgEtapa(etapaAtual.cor, dark) : T.cardAlt) }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:corEtapaAtual, flexShrink:0 }} />
                  <span style={{ fontSize:14, fontWeight:700, color: corEtapaAtual, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {olharRecusadas ? 'Recusadas' : etapaAtual.label}
                  </span>
                </div>
                <div style={{ fontSize:11, color:T.textMuted, marginTop:3 }}>
                  {osDaColuna.length} {osDaColuna.length===1?'OS':'OSs'} · {colIdxClamp+1} de {totalCols}
                </div>
              </div>

              <button onClick={()=>setColIdx(Math.min(totalCols-1, colIdxClamp + 1))} disabled={colIdxClamp===totalCols-1} aria-label="Próxima coluna"
                style={{ width:38, height:38, borderRadius:9, border:`1px solid ${T.border}`, background:T.card, color: colIdxClamp===totalCols-1 ? T.textDim : T.textPrimary, cursor: colIdxClamp===totalCols-1?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: colIdxClamp===totalCols-1 ? .35 : 1, flexShrink:0, boxShadow: dark ? 'none' : T.shadow }}>
                <i className="ti ti-chevron-right" style={{ fontSize:18 }} aria-hidden="true" />
              </button>
            </div>

            {/* Pontos indicadores */}
            <div style={{ display:'flex', gap:4, justifyContent:'center', alignItems:'center', padding:'0 1rem 8px', flexWrap:'wrap', flexShrink:0 }}>
              {Array.from({ length: totalCols }).map((_, i) => (
                <button key={i} onClick={()=>setColIdx(i)} aria-label={`Ir para coluna ${i+1}`}
                  style={{ width: i===colIdxClamp?22:6, height:6, borderRadius:3, border:'none', cursor:'pointer', padding:0, background: i===colIdxClamp ? azul : T.border, transition:'width .25s, background .25s' }} />
              ))}
            </div>

            {/* Lista da coluna ativa (com swipe) */}
            <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
              style={{ flex:1, overflowY:'auto', padding:'4px 1rem 80px', display:'flex', flexDirection:'column', gap:10 }}>
              {osDaColuna.length === 0 ? (
                <div style={{ background:T.card, border:`1px dashed ${T.border}`, borderRadius:12, padding:'2.5rem 1rem', textAlign:'center', color:T.textMuted, fontSize:13, marginTop:30 }}>
                  <i className="ti ti-clipboard-off" style={{ fontSize:38, display:'block', marginBottom:10, color:T.textDim }} aria-hidden="true" />
                  Nenhuma OS em<br/>
                  <strong style={{ color:T.textSecondary }}>{olharRecusadas ? 'Recusadas' : etapaAtual.label}</strong>
                  <div style={{ marginTop:14, fontSize:11, color:T.textDim }}>
                    <i className="ti ti-hand-finger" style={{ fontSize:14, marginRight:4 }} aria-hidden="true" />
                    Arraste para o lado para trocar de coluna
                  </div>
                </div>
              ) : (
                osDaColuna.map(os => <OSCardMobile key={os.numero} os={os} T={T} dark={dark} onClick={()=>setDetalhe(os)} />)
              )}
            </div>
          </>
        )}

        {modo === 'coluna' && totalCols === 0 && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', color:T.textMuted, fontSize:13, textAlign:'center' }}>
            <div>
              <i className="ti ti-filter-off" style={{ fontSize:38, display:'block', marginBottom:10, color:T.textDim }} aria-hidden="true" />
              Nenhuma coluna disponível com os filtros atuais
            </div>
          </div>
        )}

      </div>

      {/* ─── BOTTOM SHEET de filtros (todos em um) ─── */}
      {sheet === 'filtros' && (
        <BottomSheet T={T} dark={dark} onClose={()=>setSheet(null)} titulo="Filtros" icon="ti-filter"
          subtitulo="Configure como ver suas OS">

          {/* ZONA */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginBottom:4 }}>Zona</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {[{id:'todos',label:'Todos',icon:'ti-layout-kanban'}, ...ZONAS.map(z=>({id:z.id,label:z.label,icon:z.icon}))].map(opt => {
              const ativo = opt.id === zona
              return (
                <button key={opt.id} onClick={()=>{ setZona(opt.id); setColIdx(0) }}
                  style={{ flex:'1 1 calc(50% - 3px)', padding:'11px 12px', borderRadius:9, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:T.cardAlt, color:ativo?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:7, textAlign:'left', fontSize:13, fontWeight:ativo?700:500 }}>
                  <i className={`ti ${opt.icon}`} style={{ fontSize:15 }} aria-hidden="true" />
                  <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>{opt.label}</span>
                  {ativo && <i className="ti ti-check" style={{ fontSize:14, marginLeft:'auto' }} aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          {/* TIPOS */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginTop:12, marginBottom:4 }}>Tipos de OS</div>
          {Object.entries(TIPOS_OS).map(([id, cfg]) => {
            const ativo = tiposAtivos.has(id)
            return (
              <button key={id} onClick={()=>toggleTipo(id)}
                style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:T.cardAlt, color:ativo?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:11, textAlign:'left', fontSize:13.5, fontWeight:ativo?700:500 }}>
                <i className={`ti ${cfg.icon}`} style={{ fontSize:18 }} aria-hidden="true" />
                <span style={{ flex:1 }}>{cfg.label}</span>
                <div style={{ width:36, height:22, borderRadius:11, background:ativo?azul:T.border, position:'relative', flexShrink:0, transition:'background .15s' }}>
                  <div style={{ position:'absolute', top:2, left:ativo?16:2, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transition:'left .15s' }} />
                </div>
              </button>
            )
          })}

          {/* PRAZO */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginTop:12, marginBottom:4 }}>Prazo</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {[['todas','Todos','ti-list'],['vencido','Atrasadas','ti-alert-triangle'],['hoje','Hoje/amanhã','ti-calendar-event'],['ok','Em dia','ti-circle-check']].map(([v,l,ico]) => {
              const ativo = filtro === v
              return (
                <button key={v} onClick={()=>setFiltro(v)}
                  style={{ flex:'1 1 calc(50% - 3px)', padding:'11px 12px', borderRadius:9, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:T.cardAlt, color:ativo?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:7, textAlign:'left', fontSize:13, fontWeight:ativo?700:500 }}>
                  <i className={`ti ${ico}`} style={{ fontSize:15 }} aria-hidden="true" />
                  <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>{l}</span>
                </button>
              )
            })}
          </div>

          {/* RESPONSÁVEL */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginTop:12, marginBottom:4 }}>Responsável</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {[{id:'todos',nome:'Todos'}, ...FUNCIONARIOS].map(f => {
              const ativo = funcionario === f.id
              return (
                <button key={f.id} onClick={()=>setFuncionario(f.id)}
                  style={{ flex:'1 1 calc(50% - 3px)', padding:'11px 12px', borderRadius:9, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:T.cardAlt, color:ativo?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:ativo?700:500 }}>
                  {f.id !== 'todos' && f.cor
                    ? <span style={{ width:20, height:20, borderRadius:'50%', background:f.cor+'33', color:f.cor, fontSize:9.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{f.apelido}</span>
                    : <i className="ti ti-users" style={{ fontSize:15 }} aria-hidden="true" />}
                  <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>{f.id==='todos' ? 'Todos' : (f.nome.split(' ')[0])}</span>
                </button>
              )
            })}
          </div>

          {/* OUTROS */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginTop:12, marginBottom:4 }}>Outros</div>
          <button onClick={()=>setVerAgPeca(v=>!v)}
            style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1px solid ${verAgPeca?azul:T.border}`, background:verAgPeca?azulBg:T.cardAlt, color:verAgPeca?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:11, fontSize:13.5, fontWeight:verAgPeca?700:500 }}>
            <i className="ti ti-package" style={{ fontSize:18 }} aria-hidden="true" />
            <span style={{ flex:1, textAlign:'left' }}>Aguardando peça</span>
            <div style={{ width:36, height:22, borderRadius:11, background:verAgPeca?azul:T.border, position:'relative', flexShrink:0, transition:'background .15s' }}>
              <div style={{ position:'absolute', top:2, left:verAgPeca?16:2, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transition:'left .15s' }} />
            </div>
          </button>
          {(zona === 'todos' || zona === 'financeiro') && (
            <button onClick={()=>setVerRecusados(v=>!v)}
              style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1px solid ${verRecusados?azul:T.border}`, background:verRecusados?azulBg:T.cardAlt, color:verRecusados?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:11, fontSize:13.5, fontWeight:verRecusados?700:500 }}>
              <i className="ti ti-eye" style={{ fontSize:18 }} aria-hidden="true" />
              <span style={{ flex:1, textAlign:'left' }}>Mostrar recusadas</span>
              <div style={{ width:36, height:22, borderRadius:11, background:verRecusados?azul:T.border, position:'relative', flexShrink:0, transition:'background .15s' }}>
                <div style={{ position:'absolute', top:2, left:verRecusados?16:2, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transition:'left .15s' }} />
              </div>
            </button>
          )}

          {/* LIMPAR */}
          {totalFiltrosAtivos > 0 && (
            <button onClick={()=>{ setZona('todos'); setTiposAtivos(new Set(Object.keys(TIPOS_OS))); setFiltro('todas'); setFuncionario('todos'); setVerAgPeca(false); setVerRecusados(false); setColIdx(0) }}
              style={{ width:'100%', padding:'12px', marginTop:12, borderRadius:10, border:`1px solid ${T.border}`, background:T.cardAlt, color:T.textPrimary, cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <i className="ti ti-x" style={{ fontSize:14 }} aria-hidden="true" />
              Limpar todos os filtros
            </button>
          )}
        </BottomSheet>
      )}

      {modalNova && <NovaOSModal T={T} dark={dark} onClose={()=>setModalNova(false)} tipoInicial="atendimento" mobile />}
      {detalhe && <OSDetalhe T={T} dark={dark} os={detalhe} user={user} onClose={()=>setDetalhe(null)} mobile />}
    </>
  )
}

// ─── Bottom sheet reutilizável para filtros mobile ─────────────────────────
function BottomSheet({ T, dark, onClose, titulo, subtitulo, icon, children }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(2px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:T.card, borderRadius:'16px 16px 0 0', width:'100%', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 -8px 32px rgba(0,0,0,.4)', border:`1px solid ${T.border}`, borderBottom:'none', overflow:'hidden', paddingBottom:'env(safe-area-inset-bottom, 0px)' }}>
        {/* Grip */}
        <div style={{ display:'flex', justifyContent:'center', padding:'8px 0 0' }}>
          <div style={{ width:40, height:4, borderRadius:2, background:T.border }} />
        </div>
        {/* Header */}
        <div style={{ padding:'10px 18px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            {icon && <i className={`ti ${icon}`} style={{ fontSize:20, color:T.textSecondary }} aria-hidden="true" />}
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary }}>{titulo}</div>
              {subtitulo && <div style={{ fontSize:11.5, color:T.textMuted, marginTop:2 }}>{subtitulo}</div>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:6, borderRadius:6, fontSize:0, lineHeight:0, flexShrink:0 }}>
            <i className="ti ti-x" style={{ fontSize:22 }} aria-hidden="true" />
          </button>
        </div>
        {/* Conteúdo */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px 18px', display:'flex', flexDirection:'column', gap:8 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function OSCardMobile({ os, T, dark, onClick }) {
  const cor = (d, c) => dark ? d : c
  const tipoCfg = TIPOS_OS[os.tipo]
  const tipoCor = corEtapa(tipoCfg.cor, dark)
  const etapa = tipoCfg.etapas.find(e => e.id === os.etapa)
                || (tipoCfg.lateral && os.etapa === 'recusado' && tipoCfg.lateral)
  const etapaC = corEtapa(etapa?.cor || 'neutro', dark)
  const etapaBgC = bgEtapa(etapa?.cor || 'neutro', dark)
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' · ')
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)

  const baseStyle = dark
    ? { background:T.card, border:`1px solid ${T.border}`, borderLeft:`3px solid ${tipoCor}` }
    : { background:T.card, border:'none', borderLeft:`3px solid ${tipoCor}`, boxShadow:T.shadow }

  return (
    <div onClick={onClick}
      style={{ ...baseStyle, borderRadius:12, padding:'12px 14px', cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <i className={`ti ${tipoCfg.icon}`} style={{ fontSize:12, color:tipoCor }} aria-hidden="true" title={tipoCfg.label} />
          <span style={{ fontSize:12, fontWeight:700, color:T.textMuted }}>#{os.numero}</span>
          {os.garantia && (
            <span style={{ padding:'1px 6px', borderRadius:8, background:cor('#0d2035','#e6f1fb'), color:cor(P.blue,P.blueDark), fontSize:9, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-shield-check" style={{ fontSize:10 }} aria-hidden="true" />Garantia
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {pagoTotal && <Badge color={cor(P.green,P.greenDark)} bg={cor('#0f2a15','#e8f5ec')} border={cor(P.green,P.greenDark)+'33'}>✓ Pago</Badge>}
          {pagoParcial && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>R$ {(os.valor_pago||0)}/{totalAPagar(os)}</Badge>}
          {os.aguardando_peca && <Badge color={'#ff9800'} bg={cor('#3a2200','#fff4e0')} border={'#ff980044'}>peça</Badge>}
          {status==='vencido' && <Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>{Math.abs(dias)}d</Badge>}
          {status==='hoje'    && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Hoje</Badge>}
          {status==='amanha'  && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Amanhã</Badge>}
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6, marginBottom:3 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth:0, flex:1 }}>{os.cliente}</div>
        {os.fone && <div style={{ fontSize:11, color:T.textMuted, whiteSpace:'nowrap' }}>{os.fone}</div>}
      </div>

      {endResumido && (
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:T.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:6 }}>
          <i className="ti ti-map-pin" style={{ fontSize:11, color:T.textDim, flexShrink:0 }} aria-hidden="true" />
          <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{endResumido}</span>
        </div>
      )}

      <div style={{ padding:'6px 8px', background:T.cardAlt, borderRadius:6, marginBottom:8 }}>
        <div style={{ fontSize:11.5, color:T.textPrimary, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{linhaEquip || os.equipamento}</div>
        {os.serie && <div style={{ fontSize:10, color:T.textDim, marginTop:1, fontFamily:'ui-monospace, monospace' }}>S/N: {os.serie}</div>}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
          <span style={{ fontSize:11, padding:'3px 9px', borderRadius:6, background:etapaBgC, color:etapaC, fontWeight:600, whiteSpace:'nowrap' }}>{etapa?.curto || os.etapa}</span>
          <span style={{ fontSize:11, color:T.textMuted, whiteSpace:'nowrap' }}>· {fmtPrazoCurto(os.prazo)}</span>
        </div>
        {os.valor > 0 && <span style={{ fontSize:11.5, color:T.textPrimary, fontWeight:700 }}>R$ {(os.valor - (os.desconto||0)).toLocaleString('pt-BR')}</span>}
      </div>
    </div>
  )
}

// ─── OS — Kanban Desktop ───────────────────────────────────────────────────
function OS({ T, dark, user }) {
  const cor = (d, c) => dark ? d : c
  const role = getRole(user)
  const admin = isAdmin(user)
  const [zona, setZona]   = useState('todos')
  // Tipos ativos por padrão: TODOS. Mínimo: 1 (proteção no toggle).
  const [tiposAtivos, setTiposAtivos] = useState(() => new Set(Object.keys(TIPOS_OS)))
  function toggleTipo(id) {
    setTiposAtivos(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev // não permitir desativar o último
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  const [busca, setBusca] = useState('')
  const [funcionario, setFuncionario] = useState('todos')
  const [statusF, setStatusF]         = useState('todos')
  const [verRecusados, setVerRecusados] = useState(false)
  const [verAgPeca, setVerAgPeca]       = useState(false)
  const [modalNova, setModalNova] = useState(false)
  const [detalhe, setDetalhe]     = useState(null)
  // Estado mutável das OS (permite drag-and-drop e toggle aguardando peça)
  const [osList, setOsList] = useState(OS_MOCK)
  // Drag-and-drop
  const [arrastando, setArrastando] = useState(null) // {numero, etapa}
  const [colunaHover, setColunaHover] = useState(null) // etapaId destino
  const [toast, setToast] = useState(null) // {tipo:'ok'|'erro', msg}

  function notify(tipo, msg) {
    setToast({ tipo, msg })
    clearTimeout(notify._t)
    notify._t = setTimeout(()=>setToast(null), 3200)
  }

  // Mover OS — usa podeMoverOS e atualiza estado + histórico
  function moverOS(numero, etapaAlvo) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    // SEMPRE visão unificada — etapaAlvo é um ID de ETAPAS_TODOS — traduz pra etapa do tipo da OS
    let alvoReal = etapaAlvo
    const etapaUnif = ETAPAS_TODOS.find(e => e.id === etapaAlvo)
    alvoReal = etapaUnif?.match?.[os.tipo]
    if (!alvoReal) {
      notify('erro', `Esta coluna não aceita OS de ${TIPOS_OS[os.tipo].label}`)
      return
    }
    const r = podeMoverOS(os, alvoReal)
    if (!r.ok) { notify('erro', r.motivo); return }
    const etapaFinal = r.alvo || alvoReal // pode ser redirecionado (ex: pagamento → concluido se pago)
    const respLogado = role
    const agora = new Date().toISOString().slice(0,16).replace('T',' ')
    setOsList(prev => prev.map(o => {
      if (o.numero !== numero) return o
      return {
        ...o,
        etapa: etapaFinal,
        historico: [...(o.historico||[]), { etapa: etapaFinal, funcionario: respLogado, data: agora }]
      }
    }))
    const labelFinal = TIPOS_OS[os.tipo].etapas.find(e => e.id === etapaFinal)?.label || etapaFinal
    if (r.alvo) notify('ok', `OS #${numero} já estava paga — foi direto para ${labelFinal}`)
    else        notify('ok', `OS #${numero} movida para ${labelFinal}`)
  }
  function toggleAgPecaOS(numero) {
    setOsList(prev => prev.map(o => o.numero === numero ? {...o, aguardando_peca: !o.aguardando_peca} : o))
  }

  // Zona define quais colunas aparecem. 'todos' = todas as colunas de ETAPAS_TODOS.
  const zonaCfg = ZONAS.find(z => z.id === zona)
  const etapasAtivas = zona === 'todos'
    ? ETAPAS_TODOS
    : ETAPAS_TODOS.filter(e => zonaCfg.etapas.includes(e.id))
  const etapasVisiveis = etapasAtivas.filter(e => admin || !e.adminOnly)

  const corPaleta = zona === 'todos' ? 'blue' : zonaCfg.cor
  const tipoCor = corEtapa(corPaleta, dark)
  const tipoBg  = bgEtapa(corPaleta, dark)

  // Universo: sempre TODAS as OS, filtradas pelos tipos ativos (toggle)
  const todasUniverso = osList.filter(o => tiposAtivos.has(o.tipo))
  const buscando = busca.trim().length > 0

  const osFiltradas = todasUniverso
    .filter(o => verRecusados ? true : o.etapa !== 'recusado')
    .filter(o => !verAgPeca ? true : !!o.aguardando_peca)
    .filter(o => {
      if (funcionario === 'todos') return true
      const resp = responsavelAtual(o)
      return resp === funcionario || (o.historico||[]).some(h => h.funcionario === funcionario)
    })
    .filter(o => {
      if (statusF === 'todos') return true
      const s = calcStatusPrazo(o.prazo, o.etapa)
      if (statusF === 'vencido') return s === 'vencido'
      if (statusF === 'hoje')    return s === 'hoje' || s === 'amanha'
      if (statusF === 'ok')      return s === 'ok'
      return true
    })
    // Filtro mês corrente em Concluído (escapado pela busca)
    .filter(o => buscando ? true : dentroMesCorrente(o))
    .filter(o => !buscando ||
      o.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      String(o.numero).includes(busca) ||
      (o.equipamento||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.marca||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.modelo||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.serie||'').toLowerCase().includes(busca.toLowerCase()))

  // Distribuir por coluna — SEMPRE via match (visão unificada)
  const porEtapa = {}
  etapasVisiveis.forEach(e => porEtapa[e.id] = [])
  osFiltradas.forEach(os => {
    if (os.etapa === 'recusado') return
    const ec = etapasVisiveis.find(e => e.match && e.match[os.tipo] === os.etapa)
    if (ec) porEtapa[ec.id].push(os)
  })
  // Aplicar ordenação por coluna
  Object.keys(porEtapa).forEach(k => { porEtapa[k] = ordenarColuna(k, porEtapa[k]) })

  const totalKanban = Object.values(porEtapa).reduce((s,arr)=>s+arr.length, 0)
  const totalRecusados = todasUniverso.filter(o => o.etapa === 'recusado').length
  const totalAgPeca    = todasUniverso.filter(o => !!o.aguardando_peca).length

  const abas = [
    { id:'todos', label:'Todos', icon:'ti-layout-kanban', cor:'blue' },
    ...ZONAS.map(z => ({ id:z.id, label:z.label, icon:z.icon, cor:z.cor }))
  ]

  // Scroll horizontal com wheel
  const kanbanRef = useRef(null)
  function handleWheel(e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault()
      kanbanRef.current.scrollLeft += e.deltaY
    }
  }

  // OS aberta no detalhe — pega a versão atualizada do estado
  const osDetalheAtual = detalhe ? osList.find(o => o.numero === detalhe.numero) || detalhe : null

  return (
    <>
      <div style={{ padding:'1rem 1.1rem 1.1rem', display:'flex', flexDirection:'column', gap:10, flex:1, minHeight:0, overflow:'hidden', position:'relative' }}>

        {/* Cor padrão dos filtros ativos — sempre azul */}
        {(() => null)()}

        {/* Seletor de aba (zona) + Nova OS */}
        <div style={{ display:'flex', gap:10, alignItems:'stretch' }}>
          <div style={{ display:'flex', gap:6, background:T.card, padding:4, borderRadius:10, border:`1px solid ${T.border}`, flex:1 }}>
            {abas.map(a => {
              const ativo = a.id === zona
              const azul = cor(P.blue, P.blueDark)
              const azulBg = cor('#0d2035', '#e6f1fb')
              // Contagem: OS dos tipos ativos cuja etapa cai nesta zona (exceto concluído e recusado)
              const zonaA = ZONAS.find(z => z.id === a.id)
              const etapasZona = a.id === 'todos' ? ETAPAS_TODOS : ETAPAS_TODOS.filter(e => zonaA.etapas.includes(e.id))
              const n = osList.filter(o => {
                if (!tiposAtivos.has(o.tipo)) return false
                if (o.etapa === 'concluido' || o.etapa === 'recusado') return false
                return etapasZona.some(e => e.match && e.match[o.tipo] === o.etapa)
              }).length
              return (
                <button key={a.id} onClick={()=>setZona(a.id)}
                  style={{ flex:1, padding:'10px 14px', borderRadius:7, border:'none', cursor:'pointer', background:ativo?azulBg:'transparent', color:ativo?azul:T.textMuted, fontSize:13, fontWeight:ativo?700:500, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background .15s' }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize:16 }} aria-hidden="true" />
                  <span>{a.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:10, background:ativo?azul:T.cardAlt, color:ativo?(dark?'#0b1220':'#ffffff'):T.textMuted, minWidth:18, textAlign:'center' }}>{n}</span>
                </button>
              )
            })}
          </div>
          <button onClick={()=>setModalNova(true)}
            style={{ padding:'0 18px', borderRadius:10, border:'none', cursor:'pointer', background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, color:'#fff', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap', boxShadow:dark?'0 2px 8px rgba(91,155,213,.15)':'0 2px 6px rgba(0,0,0,.1)' }}>
            <i className="ti ti-plus" style={{ fontSize:16 }} aria-hidden="true" />
            Nova OS
          </button>
        </div>

        {/* Filtros */}
        <div style={{ background:T.card, borderRadius:10, border:`1px solid ${T.border}`, padding:'10px 12px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:220, maxWidth:340 }}>
            <i className="ti ti-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textDim }} aria-hidden="true" />
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar nº, cliente, marca, modelo ou nº série…"
              style={{ width:'100%', padding:'8px 10px 8px 32px', borderRadius:7, border:`1px solid ${T.border}`, background:T.bg, color:T.textPrimary, fontSize:12.5, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <span style={{ fontSize:11, color:T.textMuted, alignSelf:'center', marginRight:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px' }}>Resp.</span>
            {[['todos','Todos'], ...FUNCIONARIOS.map(f=>[f.id, f.apelido])].map(([v,l]) => {
              const ativo = funcionario === v
              const azul = cor(P.blue, P.blueDark)
              const azulBg = cor('#0d2035', '#e6f1fb')
              return (
                <button key={v} onClick={()=>setFuncionario(v)}
                  style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:'transparent', color:ativo?azul:T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:ativo?600:500 }}>{l}</button>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <span style={{ fontSize:11, color:T.textMuted, alignSelf:'center', marginRight:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px' }}>Prazo</span>
            {[['todos','Todos'],['vencido','Vencidas'],['hoje','Hoje/amanhã'],['ok','Em dia']].map(([v,l]) => {
              const ativo = statusF === v
              const azul = cor(P.blue, P.blueDark)
              const azulBg = cor('#0d2035', '#e6f1fb')
              return (
                <button key={v} onClick={()=>setStatusF(v)}
                  style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:'transparent', color:ativo?azul:T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:ativo?600:500 }}>{l}</button>
              )
            })}
          </div>
          <button onClick={()=>setVerAgPeca(v=>!v)}
            style={{ padding:'5px 11px', borderRadius:6, border:`1px solid ${verAgPeca?cor(P.blue,P.blueDark):T.border}`, background:verAgPeca?cor('#0d2035','#e6f1fb'):'transparent', color:verAgPeca?cor(P.blue,P.blueDark):T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
            <i className={`ti ${verAgPeca?'ti-package':'ti-package-off'}`} style={{ fontSize:13 }} aria-hidden="true" />
            Aguard. peça ({totalAgPeca})
          </button>
          {(zona === 'todos' || zona === 'financeiro') && (
            <button onClick={()=>setVerRecusados(v=>!v)}
              style={{ padding:'5px 11px', borderRadius:6, border:`1px solid ${verRecusados?cor(P.blue,P.blueDark):T.border}`, background:verRecusados?cor('#0d2035','#e6f1fb'):'transparent', color:verRecusados?cor(P.blue,P.blueDark):T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              <i className={`ti ${verRecusados?'ti-eye':'ti-eye-off'}`} style={{ fontSize:13 }} aria-hidden="true" />
              Recusadas ({totalRecusados})
            </button>
          )}
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            <span style={{ fontSize:11, color:T.textMuted, marginRight:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px' }}>Tipos</span>
            {Object.entries(TIPOS_OS).map(([id, cfg]) => {
              const ativo = tiposAtivos.has(id)
              const azul = cor(P.blue, P.blueDark)
              const azulBg = cor('#0d2035', '#e6f1fb')
              return (
                <button key={id} onClick={()=>toggleTipo(id)}
                  style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:'transparent', color:ativo?azul:T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:ativo?600:500, display:'flex', alignItems:'center', gap:5 }}
                  title={ativo ? `Ocultar ${cfg.label}` : `Mostrar ${cfg.label}`}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize:13 }} aria-hidden="true" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
          <span style={{ marginLeft:'auto', fontSize:11, color:T.textDim, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
            {buscando && <span style={{ padding:'1px 7px', borderRadius:8, background:cor('#0d2035','#e6f1fb'), color:cor(P.blue,P.blueDark), fontSize:10, fontWeight:700 }}>Busca ativa — vendo histórico completo</span>}
            {totalKanban} OS {!admin && '· você não vê Pagamento e Concluído'}
          </span>
        </div>

        {/* Kanban com scroll horizontal + drag-and-drop */}
        <div ref={kanbanRef} onWheel={handleWheel}
          style={{ flex:1, minHeight:0, overflowX:'auto', overflowY:'hidden', display:'flex', gap:10, paddingBottom:6 }}>
          {etapasVisiveis.map(etapa => (
            <KanbanCol key={etapa.id} etapa={etapa} osList={porEtapa[etapa.id]||[]} T={T} dark={dark} tipoCor={tipoCor}
              modoTodos={true} onCardClick={setDetalhe}
              arrastando={arrastando} colunaHover={colunaHover}
              onDragStart={(numero, etapaOrigem)=>setArrastando({numero, etapa:etapaOrigem})}
              onDragEnd={()=>{ setArrastando(null); setColunaHover(null) }}
              onDragOverCol={(etapaId)=>setColunaHover(etapaId)}
              onDropCol={(etapaId)=>{ if(arrastando) moverOS(arrastando.numero, etapaId); setArrastando(null); setColunaHover(null) }}
              concluidoMesAtual={etapa.id==='concluido' && !buscando}
            />
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position:'absolute', bottom:18, left:'50%', transform:'translateX(-50%)', padding:'10px 16px', borderRadius:9, background: toast.tipo==='ok'?cor('#0f2a15','#e8f5ec'):cor('#2a1515','#fde8e8'), color: toast.tipo==='ok'?cor(P.green,P.greenDark):cor(P.red,P.redDark), border:`1px solid ${toast.tipo==='ok'?cor(P.green,P.greenDark):cor(P.red,P.redDark)}55`, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, boxShadow:'0 6px 20px rgba(0,0,0,.25)', zIndex:50, maxWidth:480 }}>
            <i className={`ti ${toast.tipo==='ok'?'ti-circle-check':'ti-alert-triangle'}`} style={{ fontSize:18 }} aria-hidden="true" />
            <span>{toast.msg}</span>
          </div>
        )}
      </div>

      {modalNova && <NovaOSModal T={T} dark={dark} onClose={()=>setModalNova(false)} tipoInicial="atendimento" />}
      {osDetalheAtual && <OSDetalhe T={T} dark={dark} os={osDetalheAtual} user={user} osBase={osList}
        onClose={()=>setDetalhe(null)}
        onToggleAgPeca={()=>toggleAgPecaOS(osDetalheAtual.numero)}
        onAbrirOS={(num)=>{ const o = osList.find(x=>x.numero===num); if(o) setDetalhe(o) }} />}
    </>
  )
}

function KanbanCol({ etapa, osList, T, dark, tipoCor, modoTodos, onCardClick, arrastando, colunaHover, onDragStart, onDragEnd, onDragOverCol, onDropCol, concluidoMesAtual }) {
  const cor = (d, c) => dark ? d : c
  const c  = corEtapa(etapa.cor, dark)
  const bg = bgEtapa(etapa.cor, dark)
  const isHover = colunaHover === etapa.id && arrastando
  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOverCol?.(etapa.id) }}
      onDragLeave={e => { if (colunaHover === etapa.id) onDragOverCol?.(null) }}
      onDrop={e => { e.preventDefault(); onDropCol?.(etapa.id) }}
      style={{ minWidth:284, maxWidth:284, flexShrink:0, background: isHover ? bg : T.cardAlt, borderRadius:11, border:`2px ${isHover?'dashed':'solid'} ${isHover?c:T.border}`, display:'flex', flexDirection:'column', maxHeight:'100%', transition:'background .15s, border-color .15s' }}>
      <div style={{ padding:'10px 12px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:c, flexShrink:0 }} />
          <span style={{ fontSize:12, fontWeight:600, color:T.textSecondary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{etapa.label}</span>
          {etapa.prazo24h && <i className="ti ti-clock-exclamation" style={{ fontSize:13, color:cor(P.yellow,P.yellowDark) }} aria-hidden="true" title="Prazo de 24h" />}
          {etapa.adminOnly && <i className="ti ti-lock" style={{ fontSize:11, color:T.textDim }} aria-hidden="true" title="Só o dono vê" />}
          {concluidoMesAtual && <i className="ti ti-calendar-stats" style={{ fontSize:11, color:T.textDim }} aria-hidden="true" title="Mês corrente — use a busca para ver concluídas anteriores" />}
        </div>
        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:10, background:osList.length>0?bg:T.bg, color:osList.length>0?c:T.textDim, minWidth:22, textAlign:'center' }}>{osList.length}</span>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:8, display:'flex', flexDirection:'column', gap:8 }}>
        {osList.length === 0 && (
          <div style={{ padding:'1.2rem .5rem', textAlign:'center', color:T.textDim, fontSize:11, fontStyle:'italic' }}>
            {isHover ? 'Solte aqui' : 'vazio'}
          </div>
        )}
        {osList.map(os => <KanbanCard key={os.numero} os={os} T={T} dark={dark} tipoCor={tipoCor} modoTodos={modoTodos}
          onClick={()=>onCardClick(os)}
          onDragStart={()=>onDragStart?.(os.numero, etapa.id)}
          onDragEnd={onDragEnd} />)}
      </div>
    </div>
  )
}

function KanbanCard({ os, T, dark, tipoCor, modoTodos, onClick, onDragStart, onDragEnd }) {
  const cor = (d, c) => dark ? d : c
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const tipoCfg = TIPOS_OS[os.tipo]
  const corLinha = modoTodos ? corEtapa(tipoCfg.cor, dark) : tipoCor
  const dual = os.etapa === 'oficina'
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)

  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' · ')

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(os.numero))
    onDragStart?.()
  }

  // Estilo: dark usa borda, light usa sombra (estilo Conta Azul)
  const baseStyle = dark
    ? { background:T.card, border:`1px solid ${T.border}`, borderLeft:`3px solid ${corLinha}` }
    : { background:T.card, border:'none', borderLeft:`3px solid ${corLinha}`, boxShadow:T.shadow }

  return (
    <div onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      style={{ ...baseStyle, borderRadius:9, padding:'11px 12px', cursor:'grab', transition:'box-shadow .15s, border-color .15s, transform .15s' }}
      onMouseEnter={e=>{
        if (dark) { e.currentTarget.style.borderColor = '#3a3a3e'; e.currentTarget.style.borderLeftColor = corLinha }
        else { e.currentTarget.style.boxShadow = T.shadowHover; e.currentTarget.style.transform = 'translateY(-1px)' }
      }}
      onMouseLeave={e=>{
        if (dark) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.borderLeftColor = corLinha }
        else { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.transform = 'translateY(0)' }
      }}
      onMouseDown={e=>{ e.currentTarget.style.cursor = 'grabbing' }}
      onMouseUp={e=>{ e.currentTarget.style.cursor = 'grab' }}>

      {/* Header: nº OS + tipo + status do prazo */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          {modoTodos && <i className={`ti ${tipoCfg.icon}`} style={{ fontSize:12, color:corEtapa(tipoCfg.cor, dark) }} aria-hidden="true" title={tipoCfg.label} />}
          <span style={{ fontSize:11.5, fontWeight:700, color:T.textMuted }}>#{os.numero}</span>
          {os.garantia && (
            <span title={`Garantia da OS #${os.os_origem_id}`} style={{ padding:'1px 6px', borderRadius:8, background:cor('#0d2035','#e6f1fb'), color:cor(P.blue,P.blueDark), fontSize:9.5, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-shield-check" style={{ fontSize:10 }} aria-hidden="true" />Garantia
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {pagoTotal && (
            <Badge color={cor(P.green,P.greenDark)} bg={cor('#0f2a15','#e8f5ec')} border={cor(P.green,P.greenDark)+'33'}>
              <i className="ti ti-check" style={{ fontSize:10, marginRight:2 }} aria-hidden="true" />Pago
            </Badge>
          )}
          {pagoParcial && (
            <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>
              R$ {(os.valor_pago||0).toLocaleString('pt-BR')}/{(totalAPagar(os)).toLocaleString('pt-BR')}
            </Badge>
          )}
          {os.aguardando_peca && (
            <Badge color={'#ff9800'} bg={cor('#3a2200','#fff4e0')} border={'#ff980044'}>
              <i className="ti ti-package" style={{ fontSize:10, marginRight:3 }} aria-hidden="true" />peça
            </Badge>
          )}
          {status==='vencido' && <Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>{Math.abs(dias)}d</Badge>}
          {status==='hoje'    && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Hoje</Badge>}
          {status==='amanha'  && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Amanhã</Badge>}
          {status==='ok' && os.etapa!=='concluido' && os.etapa!=='recusado' && (
            <Badge color={cor(P.green,P.greenDark)} bg={cor('#0f2a15','#e8f5ec')} border={cor(P.green,P.greenDark)+'33'}>{dias}d</Badge>
          )}
        </div>
      </div>

      {/* Cliente + telefone */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6, marginBottom:3 }}>
        <div style={{ fontSize:13, fontWeight:700, color:T.textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth:0, flex:1 }}>{os.cliente}</div>
        {os.fone && <div style={{ fontSize:11, color:T.textMuted, whiteSpace:'nowrap' }}>{os.fone}</div>}
      </div>

      {/* Endereço resumido */}
      {endResumido && (
        <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:7, fontSize:11.5, color:T.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          <i className="ti ti-map-pin" style={{ fontSize:11, color:T.textDim, flexShrink:0 }} aria-hidden="true" />
          <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{endResumido}</span>
        </div>
      )}

      {/* Marca · modelo · S/N */}
      <div style={{ padding:'6px 8px', background:T.cardAlt, borderRadius:6, marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:T.textPrimary, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          <i className="ti ti-device-mobile-cog" style={{ fontSize:11, color:T.textDim, flexShrink:0 }} aria-hidden="true" />
          <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{linhaEquip || os.equipamento}</span>
        </div>
        {os.serie && (
          <div style={{ fontSize:10.5, color:T.textDim, marginTop:2, fontFamily:'ui-monospace, SFMono-Regular, monospace' }}>S/N: {os.serie}</div>
        )}
      </div>

      {/* Dual status */}
      {dual && (
        <div style={{ display:'flex', gap:4, marginBottom:8 }}>
          <SubStatus label="Limp." status={os.limpeza} T={T} dark={dark} />
          <SubStatus label="Manut." status={os.manutencao} T={T} dark={dark} />
        </div>
      )}

      {/* Rodapé (sem avatar — info de responsável fica só no histórico) */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <i className="ti ti-calendar" style={{ fontSize:11, color:T.textDim }} aria-hidden="true" />
          <span style={{ fontSize:11, color:T.textMuted }}>{fmtPrazoCurto(os.prazo)}</span>
        </div>
        {os.valor > 0 && <span style={{ fontSize:11.5, color:T.textPrimary, fontWeight:700 }}>R$ {(os.valor - (os.desconto||0)).toLocaleString('pt-BR')}</span>}
      </div>

      {os.horasNaEtapa && os.horasNaEtapa > 24 && (
        <div style={{ marginTop:7, padding:'4px 7px', borderRadius:5, background:cor('#2a1515','#fde8e8'), color:cor(P.red,P.redDark), fontSize:10, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize:11 }} aria-hidden="true" />
          {os.horasNaEtapa}h nesta etapa
        </div>
      )}
    </div>
  )
}

function SubStatus({ label, status, T, dark }) {
  const cor = (d, c) => dark ? d : c
  const map = {
    concluido:    { c:cor(P.green, P.greenDark),   bg:cor('#0f2a15','#e8f5ec'), ico:'ti-check'      },
    em_andamento: { c:cor(P.yellow, P.yellowDark), bg:cor('#2a2000','#fdf6dc'), ico:'ti-loader-2'  },
    aguardando:   { c:T.textMuted,                 bg:T.bg,                     ico:'ti-clock'     },
  }
  const m = map[status] || map.aguardando
  return (
    <div style={{ flex:1, padding:'3px 6px', borderRadius:4, background:m.bg, color:m.c, fontSize:10, fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
      <i className={`ti ${m.ico}`} style={{ fontSize:11 }} aria-hidden="true" />
      {label}
    </div>
  )
}

// ─── Modal Nova OS ─────────────────────────────────────────────────────────
function NovaOSModal({ T, dark, onClose, tipoInicial, mobile }) {
  const cor = (d, c) => dark ? d : c
  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState(tipoInicial || 'atendimento')
  const [form, setForm] = useState({
    cliente:'', clienteId:null, fone:'', endereco:'',
    equipamento:'', defeito:'',
    data:'', hora:'', responsavel:'func1',
    maquinaEstoque:'', valor:'',
    observacoes:''
  })
  const [buscaCli, setBuscaCli] = useState('')
  const [novoCli, setNovoCli] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const clientesFiltrados = buscaCli
    ? CLIENTES_MOCK.filter(c => c.nome.toLowerCase().includes(buscaCli.toLowerCase()) || c.fone.includes(buscaCli)).slice(0, 5)
    : []

  function escolherCliente(c) {
    update('cliente', c.nome); update('clienteId', c.id); update('fone', c.fone); update('endereco', c.endereco)
    setBuscaCli(''); setNovoCli(false)
  }

  function salvar() {
    // Mock: apenas fecha. Aqui depois entra o insert no Supabase.
    alert(`OS de ${TIPOS_OS[tipo].label} criada com sucesso!\n\nCliente: ${form.cliente || '— Estoque'}\nEquipamento: ${form.equipamento}`)
    onClose()
  }

  const corTipo = corEtapa(TIPOS_OS[tipo].cor, dark)
  const inputStyle = { width:'100%', padding:'9px 11px', borderRadius:7, border:`1px solid ${T.border}`, background:T.bg, color:T.textPrimary, fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }
  const labelStyle = { fontSize:11, color:T.textMuted, display:'block', marginBottom:5, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px' }

  const podeAvancar = step === 1 ? true :
    tipo === 'atendimento' ? (form.cliente && form.equipamento && form.defeito) :
    tipo === 'fabricacao'  ? (form.equipamento) :
    tipo === 'venda'       ? (form.cliente && form.maquinaEstoque) : false

  return (
    <ModalBase T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={680}>
      <div style={{ padding:'14px 18px 12px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:9, background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="ti ti-clipboard-plus" style={{ fontSize:17, color:'#fff' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary }}>Nova ordem de serviço</div>
            <div style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>Passo {step} de 2 — {step===1?'Escolha o tipo':TIPOS_OS[tipo].label}</div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fechar"
          style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:6, borderRadius:6, fontSize:0, lineHeight:0 }}>
          <i className="ti ti-x" style={{ fontSize:20 }} aria-hidden="true" />
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px 18px' }}>

        {step === 1 && (
          <>
            <div style={{ fontSize:12.5, color:T.textSecondary, marginBottom:14, lineHeight:1.4 }}>
              Selecione qual o tipo de OS você quer abrir. Cada tipo tem um fluxo próprio e pede informações diferentes.
            </div>
            <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(3, 1fr)', gap:10 }}>
              {Object.entries(TIPOS_OS).map(([id, cfg]) => {
                const ativo = id === tipo
                const c = corEtapa(cfg.cor, dark)
                const bg = bgEtapa(cfg.cor, dark)
                return (
                  <button key={id} onClick={()=>setTipo(id)}
                    style={{ padding:'18px 14px', borderRadius:11, border:`2px solid ${ativo?c:T.border}`, background:ativo?bg:T.card, cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:6, transition:'border-color .15s, background .15s' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:c+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <i className={`ti ${cfg.icon}`} style={{ fontSize:19, color:c }} aria-hidden="true" />
                      </div>
                      {ativo && <i className="ti ti-circle-check-filled" style={{ fontSize:20, color:c }} aria-hidden="true" />}
                    </div>
                    <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary, marginTop:3 }}>{cfg.label}</div>
                    <div style={{ fontSize:12, color:T.textMuted, lineHeight:1.4 }}>{cfg.descricao}</div>
                    <div style={{ fontSize:10.5, color:T.textDim, marginTop:5, paddingTop:8, borderTop:`1px solid ${T.border}` }}>{cfg.etapas.length} etapas no fluxo</div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 2 && tipo === 'atendimento' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <FormSecao titulo="Cliente" icon="ti-user" T={T}>
              {!form.cliente && !novoCli && (
                <div style={{ position:'relative' }}>
                  <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar cliente por nome ou telefone…" style={inputStyle} autoFocus />
                  {clientesFiltrados.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:T.card, border:`1px solid ${T.border}`, borderRadius:7, maxHeight:220, overflowY:'auto', zIndex:10, boxShadow:dark?'0 8px 24px rgba(0,0,0,.4)':'0 4px 16px rgba(0,0,0,.1)' }}>
                      {clientesFiltrados.map(c => (
                        <div key={c.id} onClick={()=>escolherCliente(c)}
                          style={{ padding:'8px 11px', cursor:'pointer', borderBottom:`1px solid ${T.border}`, fontSize:12.5 }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.cardAlt}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ color:T.textPrimary, fontWeight:600 }}>{c.nome}</div>
                          <div style={{ color:T.textMuted, fontSize:11, marginTop:2 }}>{c.fone} · {c.endereco}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop:8, fontSize:11.5, color:T.textMuted }}>
                    Não achou? <button onClick={()=>{setNovoCli(true); setBuscaCli('')}} style={{ background:'transparent', border:'none', color:cor(P.blue,P.blueDark), cursor:'pointer', fontSize:11.5, fontWeight:600, padding:0 }}>+ Cadastrar novo cliente</button>
                  </div>
                </div>
              )}
              {(form.cliente || novoCli) && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'2fr 1fr', gap:10 }}>
                    <div>
                      <label style={labelStyle}>Nome completo</label>
                      <input value={form.cliente} onChange={e=>update('cliente', e.target.value)} style={inputStyle} placeholder="Ex: Maria da Silva" />
                    </div>
                    <div>
                      <label style={labelStyle}>Telefone</label>
                      <input value={form.fone} onChange={e=>update('fone', e.target.value)} style={inputStyle} placeholder="(67) 9 9999-9999" />
                    </div>
                  </div>
                  <div style={{ marginTop:10 }}>
                    <label style={labelStyle}>Endereço (será validado pelo Google Maps)</label>
                    <div style={{ position:'relative' }}>
                      <i className="ti ti-map-pin" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textDim }} aria-hidden="true" />
                      <input value={form.endereco} onChange={e=>update('endereco', e.target.value)} style={{...inputStyle, paddingLeft:32}} placeholder="Rua, número, bairro — Naviraí/MS" />
                    </div>
                  </div>
                  {form.clienteId && (
                    <button onClick={()=>{ update('cliente',''); update('clienteId',null); update('fone',''); update('endereco',''); setNovoCli(false) }}
                      style={{ marginTop:8, background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', fontSize:11, padding:0 }}>← Trocar cliente</button>
                  )}
                </>
              )}
            </FormSecao>

            <FormSecao titulo="Equipamento e defeito relatado" icon="ti-tool" T={T}>
              <label style={labelStyle}>Equipamento (marca + modelo)</label>
              <input value={form.equipamento} onChange={e=>update('equipamento', e.target.value)} style={inputStyle} placeholder="Ex: Lavadora Brastemp 11kg BWK11" />
              <label style={{...labelStyle, marginTop:10}}>Defeito relatado pelo cliente</label>
              <textarea value={form.defeito} onChange={e=>update('defeito', e.target.value)} style={{...inputStyle, minHeight:64, resize:'vertical'}} placeholder="Descreva o que o cliente reportou…" />
            </FormSecao>

            <FormSecao titulo="Agendamento da coleta" icon="ti-calendar-event" T={T}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={labelStyle}>Data</label>
                  <input type="date" value={form.data} onChange={e=>update('data', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={form.hora} onChange={e=>update('hora', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
              </div>
              <div style={{ marginTop:8, fontSize:11, color:T.textDim, fontStyle:'italic' }}>
                Sem data marcada? A OS abre como <strong style={{color:T.textMuted, fontStyle:'normal'}}>Aguardando agendamento</strong>.
              </div>
            </FormSecao>

            <FormSecao titulo="Responsável pela coleta" icon="ti-user-cog" T={T}>
              <div style={{ display:'flex', gap:7 }}>
                {FUNCIONARIOS.map(f => (
                  <button key={f.id} onClick={()=>update('responsavel', f.id)}
                    style={{ flex:1, padding:'9px 8px', borderRadius:7, border:`1px solid ${form.responsavel===f.id?f.cor:T.border}`, background:form.responsavel===f.id?(f.cor+'22'):T.bg, color:form.responsavel===f.id?(dark?f.cor:'#000'):T.textMuted, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontWeight:form.responsavel===f.id?600:500 }}>
                    <span style={{ width:20, height:20, borderRadius:'50%', background:f.cor+'33', color:f.cor, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{f.apelido}</span>
                    {f.nome}
                  </button>
                ))}
              </div>
            </FormSecao>

            <FormSecao titulo="Observações" icon="ti-notes" T={T} opcional>
              <textarea value={form.observacoes} onChange={e=>update('observacoes', e.target.value)} style={{...inputStyle, minHeight:56, resize:'vertical'}} placeholder="Qualquer informação extra que ajude a equipe…" />
            </FormSecao>
          </div>
        )}

        {step === 2 && tipo === 'fabricacao' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:bgEtapa('yellow', dark), border:`1px solid ${corEtapa('yellow', dark)}44`, borderRadius:8, padding:'10px 12px', fontSize:12, color:T.textSecondary, lineHeight:1.5 }}>
              <i className="ti ti-info-circle" style={{ fontSize:14, color:corEtapa('yellow', dark), marginRight:6, verticalAlign:'middle' }} aria-hidden="true" />
              <strong style={{color:T.textPrimary}}>Fabricação:</strong> máquina nova para o estoque. Os itens usados saem do estoque automaticamente ao concluir e a máquina entra como produto pronto, com o custo total calculado.
            </div>

            <FormSecao titulo="Máquina a fabricar" icon="ti-building-factory-2" T={T}>
              <label style={labelStyle}>Descrição</label>
              <input value={form.equipamento} onChange={e=>update('equipamento', e.target.value)} style={inputStyle} placeholder="Ex: Lavadora reformada Brastemp 11kg" />
              <label style={{...labelStyle, marginTop:10}}>Estado inicial / itens a trocar</label>
              <textarea value={form.defeito} onChange={e=>update('defeito', e.target.value)} style={{...inputStyle, minHeight:64, resize:'vertical'}} placeholder="Ex: Estrutura ok, trocar rolamento, polia e colocar capa nova" />
              <label style={{...labelStyle, marginTop:10}}>Custo inicial da máquina base (R$)</label>
              <input type="number" value={form.valor} onChange={e=>update('valor', e.target.value)} style={inputStyle} placeholder="150,00" />
            </FormSecao>

            <FormSecao titulo="Responsável pela fabricação" icon="ti-user-cog" T={T}>
              <div style={{ display:'flex', gap:7 }}>
                {FUNCIONARIOS.map(f => (
                  <button key={f.id} onClick={()=>update('responsavel', f.id)}
                    style={{ flex:1, padding:'9px 8px', borderRadius:7, border:`1px solid ${form.responsavel===f.id?f.cor:T.border}`, background:form.responsavel===f.id?(f.cor+'22'):T.bg, color:form.responsavel===f.id?(dark?f.cor:'#000'):T.textMuted, fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontWeight:form.responsavel===f.id?600:500 }}>
                    <span style={{ width:20, height:20, borderRadius:'50%', background:f.cor+'33', color:f.cor, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{f.apelido}</span>
                    {f.nome}
                  </button>
                ))}
              </div>
            </FormSecao>
          </div>
        )}

        {step === 2 && tipo === 'venda' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:bgEtapa('green', dark), border:`1px solid ${corEtapa('green', dark)}44`, borderRadius:8, padding:'10px 12px', fontSize:12, color:T.textSecondary, lineHeight:1.5 }}>
              <i className="ti ti-info-circle" style={{ fontSize:14, color:corEtapa('green', dark), marginRight:6, verticalAlign:'middle' }} aria-hidden="true" />
              <strong style={{color:T.textPrimary}}>Venda:</strong> máquina pronta do estoque. O comprador vira cliente cadastrado automaticamente.
            </div>

            <FormSecao titulo="Cliente comprador" icon="ti-user" T={T}>
              {!form.cliente && !novoCli && (
                <div style={{ position:'relative' }}>
                  <input value={buscaCli} onChange={e=>setBuscaCli(e.target.value)} placeholder="Buscar cliente por nome ou telefone…" style={inputStyle} autoFocus />
                  {clientesFiltrados.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4, background:T.card, border:`1px solid ${T.border}`, borderRadius:7, maxHeight:220, overflowY:'auto', zIndex:10 }}>
                      {clientesFiltrados.map(c => (
                        <div key={c.id} onClick={()=>escolherCliente(c)} style={{ padding:'8px 11px', cursor:'pointer', borderBottom:`1px solid ${T.border}`, fontSize:12.5 }}
                          onMouseEnter={e=>e.currentTarget.style.background=T.cardAlt}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <div style={{ color:T.textPrimary, fontWeight:600 }}>{c.nome}</div>
                          <div style={{ color:T.textMuted, fontSize:11 }}>{c.fone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop:8, fontSize:11.5, color:T.textMuted }}>
                    Cliente novo? <button onClick={()=>setNovoCli(true)} style={{ background:'transparent', border:'none', color:cor(P.blue,P.blueDark), cursor:'pointer', fontSize:11.5, fontWeight:600, padding:0 }}>+ Cadastrar agora</button>
                  </div>
                </div>
              )}
              {(form.cliente || novoCli) && (
                <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'2fr 1fr', gap:10 }}>
                  <div>
                    <label style={labelStyle}>Nome</label>
                    <input value={form.cliente} onChange={e=>update('cliente', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Telefone</label>
                    <input value={form.fone} onChange={e=>update('fone', e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}
            </FormSecao>

            <FormSecao titulo="Máquina do estoque" icon="ti-package" T={T}>
              <label style={labelStyle}>Selecione a máquina</label>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {ESTOQUE_MAQUINAS_MOCK.map(m => {
                  const sel = form.maquinaEstoque === m.id
                  return (
                    <button key={m.id} onClick={()=>{ update('maquinaEstoque', m.id); update('equipamento', m.descricao); update('valor', m.valor) }}
                      style={{ padding:'10px 12px', borderRadius:7, border:`1px solid ${sel?corEtapa('green',dark):T.border}`, background:sel?bgEtapa('green',dark):T.bg, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', textAlign:'left' }}>
                      <div>
                        <div style={{ fontSize:12.5, fontWeight:600, color:T.textPrimary }}>{m.descricao}</div>
                        <div style={{ fontSize:10.5, color:T.textMuted, marginTop:2 }}>#{m.id}</div>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:sel?corEtapa('green',dark):T.textSecondary }}>R$ {m.valor.toLocaleString('pt-BR')}</div>
                    </button>
                  )
                })}
              </div>
            </FormSecao>

            <FormSecao titulo="Endereço e agendamento da entrega" icon="ti-truck-delivery" T={T}>
              <label style={labelStyle}>Endereço (Google Maps)</label>
              <div style={{ position:'relative' }}>
                <i className="ti ti-map-pin" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textDim }} aria-hidden="true" />
                <input value={form.endereco} onChange={e=>update('endereco', e.target.value)} style={{...inputStyle, paddingLeft:32}} placeholder="Endereço de entrega" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
                <div>
                  <label style={labelStyle}>Data</label>
                  <input type="date" value={form.data} onChange={e=>update('data', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
                <div>
                  <label style={labelStyle}>Hora</label>
                  <input type="time" value={form.hora} onChange={e=>update('hora', e.target.value)} style={{...inputStyle, colorScheme: dark?'dark':'light'}} />
                </div>
              </div>
            </FormSecao>
          </div>
        )}
      </div>

      <div style={{ padding:'12px 18px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'space-between', gap:10, background:T.cardAlt, flexShrink:0 }}>
        <button onClick={onClose}
          style={{ padding:'9px 16px', borderRadius:7, border:`1px solid ${T.border}`, background:'transparent', color:T.textSecondary, fontSize:13, cursor:'pointer', fontWeight:500 }}>
          Cancelar
        </button>
        <div style={{ display:'flex', gap:8 }}>
          {step > 1 && (
            <button onClick={()=>setStep(s => s-1)}
              style={{ padding:'9px 16px', borderRadius:7, border:`1px solid ${T.border}`, background:T.bg, color:T.textSecondary, fontSize:13, cursor:'pointer', fontWeight:500, display:'flex', alignItems:'center', gap:5 }}>
              <i className="ti ti-arrow-left" style={{ fontSize:14 }} aria-hidden="true" /> Voltar
            </button>
          )}
          {step === 1 && (
            <button onClick={()=>setStep(2)}
              style={{ padding:'9px 18px', borderRadius:7, border:'none', background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, color:'#fff', fontSize:13, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
              Próximo <i className="ti ti-arrow-right" style={{ fontSize:14 }} aria-hidden="true" />
            </button>
          )}
          {step === 2 && (
            <button onClick={salvar} disabled={!podeAvancar}
              style={{ padding:'9px 18px', borderRadius:7, border:'none', background: podeAvancar?`linear-gradient(135deg,${P.blue},#3a7bbf)`:T.cardAlt, color: podeAvancar?'#fff':T.textDim, fontSize:13, cursor: podeAvancar?'pointer':'not-allowed', fontWeight:600, display:'flex', alignItems:'center', gap:6, opacity: podeAvancar?1:.7 }}>
              <i className="ti ti-check" style={{ fontSize:14 }} aria-hidden="true" /> Criar OS
            </button>
          )}
        </div>
      </div>
    </ModalBase>
  )
}

function FormSecao({ titulo, icon, T, children, opcional }) {
  return (
    <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
      <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
        <i className={`ti ${icon}`} style={{ fontSize:14 }} aria-hidden="true" />
        {titulo}
        {opcional && <span style={{ fontSize:9.5, padding:'1px 6px', borderRadius:8, background:T.bg, color:T.textDim, fontWeight:500, textTransform:'none', letterSpacing:'normal' }}>opcional</span>}
      </div>
      {children}
    </div>
  )
}

// ─── Modal base reutilizável ───────────────────────────────────────────────
function ModalBase({ T, dark, onClose, children, maxWidth=720, mobile }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', backdropFilter:'blur(2px)', zIndex:200, display:'flex', alignItems: mobile?'flex-end':'center', justifyContent:'center', padding: mobile?0:'1rem' }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:T.card, borderRadius: mobile?'16px 16px 0 0':14, width:'100%', maxWidth: mobile?'100%':maxWidth, maxHeight: mobile?'92vh':'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,.5)', border:`1px solid ${T.border}`, overflow:'hidden' }}>
        {children}
      </div>
    </div>
  )
}

// ─── OS Detalhe (somente leitura nesta etapa) ──────────────────────────────
function OSDetalhe({ T, dark, os: osInicial, user, osBase, onClose, onToggleAgPeca, onAbrirOS, mobile }) {
  const cor = (d, c) => dark ? d : c
  // Estado local: usado se props de callback não vierem (caso mobile não controlar)
  const [osLocal, setOsLocal] = useState(osInicial)
  const os = osInicial // sempre usa o que vem (atualizado pelo pai)
  const [aba, setAba] = useState('detalhe')
  const admin = isAdmin(user)
  const config = TIPOS_OS[os.tipo]
  const etapaAtual = config.etapas.findIndex(e => e.id === os.etapa)
  const isRecusado = os.etapa === 'recusado'
  const tipoCor = corEtapa(config.cor, dark)
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const respId = responsavelAtual(os)
  const func = funcPorId(respId)
  const itens = OS_ITENS_MOCK[os.numero] || []
  const subtotal = itens.reduce((s,i) => s + i.valor*i.qtd, 0)
  const totalLiq = subtotal - (os.desconto || 0)
  const valorPago = os.valor_pago || 0
  const aPagar = Math.max(0, totalLiq - valorPago)
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)

  // OS de origem (se for garantia)
  const osOrigem = os.garantia && osBase ? osBase.find(o => o.numero === os.os_origem_id) : null
  // Garantia disponível para esta OS (se for original concluída)
  const garantiaValida = os.etapa === 'concluido' ? dentroGarantia(os) : false
  const diasGarantiaRest = (() => {
    if (!garantiaValida) return 0
    const dias = os.garantia_dias || 90
    const reg = (os.historico||[]).find(h => h.etapa === 'entrega' || h.etapa === 'entregue')
    if (!reg) return 0
    const limite = new Date(new Date(reg.data).getTime() + dias*86400000)
    return Math.max(0, Math.round((limite - new Date()) / 86400000))
  })()

  function toggleAgPeca() {
    if (onToggleAgPeca) onToggleAgPeca()
    else setOsLocal(o => ({ ...o, aguardando_peca: !o.aguardando_peca }))
  }

  const historico = (os.historico || []).slice()

  return (
    <ModalBase T={T} dark={dark} onClose={onClose} mobile={mobile} maxWidth={780}>
      {/* Header */}
      <div style={{ padding:'14px 18px 12px', borderBottom:`1px solid ${T.border}`, background:tipoCor+'08' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
              <span style={{ padding:'3px 9px', borderRadius:6, background:tipoCor+'22', color:tipoCor, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5, textTransform:'uppercase', letterSpacing:'.3px' }}>
                <i className={`ti ${config.icon}`} style={{ fontSize:13 }} aria-hidden="true" />
                {config.label}
              </span>
              <span style={{ fontSize:16, fontWeight:700, color:T.textPrimary }}>OS #{os.numero}</span>
              {os.garantia && (
                <Badge color={cor(P.blue,P.blueDark)} bg={cor('#0d2035','#e6f1fb')} border={cor(P.blue,P.blueDark)+'33'}>
                  <i className="ti ti-shield-check" style={{ fontSize:11, marginRight:3 }} aria-hidden="true" />Garantia
                </Badge>
              )}
              {pagoTotal && (
                <Badge color={cor(P.green,P.greenDark)} bg={cor('#0f2a15','#e8f5ec')} border={cor(P.green,P.greenDark)+'33'}>
                  <i className="ti ti-check" style={{ fontSize:11, marginRight:3 }} aria-hidden="true" />Pago
                </Badge>
              )}
              {pagoParcial && (
                <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>
                  Parcial: R$ {valorPago.toLocaleString('pt-BR')}/{totalLiq.toLocaleString('pt-BR')}
                </Badge>
              )}
              {os.aguardando_peca && (
                <Badge color={'#ff9800'} bg={cor('#3a2200','#fff4e0')} border={'#ff980044'}>
                  <i className="ti ti-package" style={{ fontSize:11, marginRight:3 }} aria-hidden="true" />Aguardando peça
                </Badge>
              )}
              {isRecusado && <Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Recusada</Badge>}
              {!isRecusado && status==='vencido' && <Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>{Math.abs(dias)}d atraso</Badge>}
              {status==='hoje'   && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Vence hoje</Badge>}
              {status==='amanha' && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Vence amanhã</Badge>}
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:T.textPrimary, marginBottom:2 }}>{os.cliente}</div>
            <div style={{ fontSize:12.5, color:T.textMuted }}>{[os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:6, borderRadius:6, fontSize:0, lineHeight:0, flexShrink:0 }}>
            <i className="ti ti-x" style={{ fontSize:22 }} aria-hidden="true" />
          </button>
        </div>

        {/* Abas Detalhe / Histórico */}
        <div style={{ display:'flex', gap:4, marginTop:11 }}>
          <button onClick={()=>setAba('detalhe')}
            style={{ padding:'6px 12px', borderRadius:6, border:'none', background:aba==='detalhe'?T.card:'transparent', color:aba==='detalhe'?T.textPrimary:T.textMuted, fontSize:12, fontWeight:aba==='detalhe'?700:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, borderBottom:`2px solid ${aba==='detalhe'?tipoCor:'transparent'}` }}>
            <i className="ti ti-info-circle" style={{ fontSize:13 }} aria-hidden="true" />
            Detalhe
          </button>
          <button onClick={()=>setAba('historico')}
            style={{ padding:'6px 12px', borderRadius:6, border:'none', background:aba==='historico'?T.card:'transparent', color:aba==='historico'?T.textPrimary:T.textMuted, fontSize:12, fontWeight:aba==='historico'?700:500, cursor:'pointer', display:'flex', alignItems:'center', gap:5, borderBottom:`2px solid ${aba==='historico'?tipoCor:'transparent'}` }}>
            <i className="ti ti-history" style={{ fontSize:13 }} aria-hidden="true" />
            Histórico ({historico.length})
          </button>
        </div>
      </div>

      {/* Conteúdo scrollável */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 18px', display:'flex', flexDirection:'column', gap:12 }}>

        {aba === 'detalhe' && (
          <>
            {/* Aviso: OS em garantia → mostra OS origem */}
            {os.garantia && osOrigem && (
              <div onClick={()=>onAbrirOS?.(osOrigem.numero)}
                style={{ padding:'10px 14px', borderRadius:9, background:bgEtapa('blue', dark), border:`1px solid ${corEtapa('blue', dark)}55`, fontSize:12, color:T.textSecondary, display:'flex', alignItems:'center', gap:10, cursor: onAbrirOS?'pointer':'default' }}>
                <i className="ti ti-shield-check" style={{ fontSize:20, color:corEtapa('blue', dark), flexShrink:0 }} aria-hidden="true" />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:T.textPrimary, marginBottom:2 }}>OS em garantia</div>
                  <div style={{ lineHeight:1.4 }}>Referente à OS #<strong style={{color:corEtapa('blue', dark)}}>{osOrigem.numero}</strong> de {osOrigem.cliente} ({osOrigem.equipamento}). Mão de obra não cobrada — peças saem do estoque a preço de custo.</div>
                </div>
                {onAbrirOS && <i className="ti ti-chevron-right" style={{ fontSize:18, color:T.textDim }} aria-hidden="true" />}
              </div>
            )}

            {/* OS concluída original com garantia ainda válida */}
            {!os.garantia && os.etapa === 'concluido' && garantiaValida && (
              <div style={{ padding:'10px 14px', borderRadius:9, background:bgEtapa('green', dark), border:`1px solid ${corEtapa('green', dark)}55`, fontSize:12, color:T.textSecondary, display:'flex', alignItems:'center', gap:10 }}>
                <i className="ti ti-shield-check" style={{ fontSize:20, color:corEtapa('green', dark), flexShrink:0 }} aria-hidden="true" />
                <div>
                  <div style={{ fontWeight:700, color:T.textPrimary, marginBottom:2 }}>Garantia ativa</div>
                  <div>Faltam <strong style={{color:corEtapa('green', dark)}}>{diasGarantiaRest} dia(s)</strong> de garantia. Se houver retorno, abra uma nova OS marcando "Garantia" e referenciando esta.</div>
                </div>
              </div>
            )}            {/* Timeline do fluxo */}
            {!isRecusado && (
              <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
                  <i className="ti ti-route" style={{ fontSize:14 }} aria-hidden="true" />
                  Fluxo da OS — etapa atual: <strong style={{color:tipoCor}}>{config.etapas[etapaAtual]?.label}</strong>
                </div>
                <div style={{ display:'flex', gap:3, overflowX:'auto', paddingBottom:4 }}>
                  {config.etapas.map((e, i) => {
                    if (e.adminOnly && !admin) return null
                    const passou = i < etapaAtual
                    const atual  = i === etapaAtual
                    const corE = atual ? corEtapa(e.cor, dark) : (passou ? cor(P.green, P.greenDark) : T.textDim)
                    const bgE  = atual ? bgEtapa(e.cor, dark) : (passou ? cor('#0f2a15','#e8f5ec') : T.bg)
                    const reg = historico.find(h => h.etapa === e.id)
                    const f = reg && funcPorId(reg.funcionario)
                    return (
                      <div key={e.id} style={{ flex:'1 0 auto', minWidth:88, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', background:bgE, color:corE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, border:`1.5px solid ${atual?corE:'transparent'}` }}>
                          {passou ? <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" /> : (atual ? <div style={{width:7,height:7,borderRadius:'50%',background:corE}} /> : i+1)}
                        </div>
                        <span style={{ fontSize:10, color:corE, textAlign:'center', lineHeight:1.25, fontWeight:atual?700:500, maxWidth:88 }}>{e.curto}</span>
                        {f && (
                          <span title={`Feito por ${f.nome}`} style={{ fontSize:8.5, color:f.cor, fontWeight:700, padding:'1px 5px', borderRadius:8, background:f.cor+'22', border:`1px solid ${f.cor}33` }}>
                            {f.apelido}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Limpeza + Manutenção paralelos */}
            {os.etapa === 'oficina' && (
              <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <i className="ti ti-tool" style={{ fontSize:14 }} aria-hidden="true" />
                    Em oficina — limpeza e manutenção simultâneas
                  </div>
                  <button onClick={toggleAgPeca}
                    style={{ padding:'5px 11px', borderRadius:6, border:`1px solid ${os.aguardando_peca?'#ff9800':T.border}`, background:os.aguardando_peca?cor('#3a2200','#fff4e0'):T.bg, color:os.aguardando_peca?'#ff9800':T.textMuted, fontSize:11, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5, textTransform:'none', letterSpacing:'normal' }}>
                    <i className={`ti ${os.aguardando_peca?'ti-package':'ti-package-off'}`} style={{ fontSize:13 }} aria-hidden="true" />
                    {os.aguardando_peca ? 'Aguardando peça (clique p/ desmarcar)' : 'Marcar como aguardando peça'}
                  </button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:10 }}>
                  <SubBox label="Limpeza" status={os.limpeza} icon="ti-droplet" T={T} dark={dark} />
                  <SubBox label="Manutenção" status={os.manutencao} icon="ti-tool" T={T} dark={dark} />
                </div>
                <div style={{ fontSize:11, color:T.textDim, marginTop:8, fontStyle:'italic' }}>
                  <i className="ti ti-info-circle" style={{ fontSize:12, marginRight:4, verticalAlign:'middle' }} aria-hidden="true" />
                  Próxima etapa (Teste final) só libera quando ambas estiverem concluídas.
                </div>
              </div>
            )}

            {/* Cliente e equipamento */}
            <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr':'1fr 1fr', gap:10 }}>
              <DetCard icon="ti-user" titulo="Cliente" T={T}>
                <Linha label="Nome" valor={os.cliente} T={T} />
                {os.fone && <Linha label="Telefone" valor={os.fone} T={T} />}
                {os.endereco && <Linha label="Endereço" valor={os.endereco} T={T} multi />}
              </DetCard>
              <DetCard icon="ti-device-mobile-cog" titulo="Equipamento" T={T}>
                {os.marca && <Linha label="Marca" valor={os.marca} T={T} />}
                {os.modelo && <Linha label="Modelo" valor={os.modelo} T={T} />}
                {os.serie && <Linha label="Nº de série" valor={os.serie} T={T} mono />}
                <Linha label="Descrição" valor={os.equipamento} T={T} multi />
                <Linha label="Defeito relatado" valor={os.defeito} T={T} multi />
                <Linha label="Fotos" valor={`${os.fotos || 0} foto(s) anexada(s)`} T={T} />
              </DetCard>
            </div>

            {/* Responsabilidade atual */}
            {func && (
              <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'10px 14px', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width:34, height:34, borderRadius:'50%', background:func.cor+'33', color:func.cor, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', border:`1.5px solid ${func.cor}55` }}>{func.apelido}</span>
                  <div>
                    <div style={{ fontSize:10.5, color:T.textDim, fontWeight:500, textTransform:'uppercase', letterSpacing:'.3px' }}>Última ação registrada</div>
                    <div style={{ fontSize:13, color:T.textPrimary, fontWeight:600 }}>{func.nome}</div>
                  </div>
                </div>
                <div style={{ textAlign:'right', fontSize:11, color:T.textMuted }}>
                  <div>na etapa</div>
                  <div style={{ color:T.textPrimary, fontWeight:600, marginTop:1 }}>{config.etapas[etapaAtual-1]?.label || config.etapas[0]?.label}</div>
                </div>
              </div>
            )}

            {/* Itens e financeiro */}
            {itens.length > 0 && (
              <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
                  <i className="ti ti-list-details" style={{ fontSize:14 }} aria-hidden="true" />
                  Itens da OS
                  <span style={{ fontSize:10, padding:'1px 6px', borderRadius:8, background:T.bg, color:T.textDim, fontWeight:500, textTransform:'none', letterSpacing:'normal' }}>{itens.length} {itens.length===1?'item':'itens'}</span>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {itens.map((it, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', background:T.bg, borderRadius:6, fontSize:12.5 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:9, minWidth:0, flex:1 }}>
                        <i className={`ti ${it.tipo==='servico'?'ti-tool':'ti-package'}`} style={{ fontSize:14, color:it.tipo==='servico'?cor(P.blueLight,P.blueLightDark):cor(P.blue,P.blueDark) }} aria-hidden="true" />
                        <span style={{ color:T.textPrimary, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{it.nome}</span>
                        <span style={{ color:T.textDim, fontSize:11 }}>×{it.qtd}</span>
                      </div>
                      <span style={{ color:T.textSecondary, fontWeight:600, whiteSpace:'nowrap' }}>R$ {(it.valor*it.qtd).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${T.border}`, display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.textMuted }}>
                    <span>Subtotal</span><span>R$ {subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  </div>
                  {(os.desconto || 0) > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:cor(P.green,P.greenDark) }}>
                      <span>Desconto</span><span>− R$ {os.desconto.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:T.textPrimary, fontWeight:700, marginTop:2 }}>
                    <span>Total</span><span style={{ color:tipoCor }}>R$ {totalLiq.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                  </div>
                  {/* Pagamento */}
                  {(pagoTotal || pagoParcial) && (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:cor(P.green,P.greenDark), marginTop:5, paddingTop:6, borderTop:`1px dashed ${T.border}` }}>
                        <span><i className="ti ti-cash-banknote" style={{ fontSize:13, marginRight:5, verticalAlign:'middle' }} aria-hidden="true" />Pago{os.forma_pagamento?` (${os.forma_pagamento})`:''}</span>
                        <span>R$ {valorPago.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                      </div>
                      {pagoParcial && (
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:cor(P.yellow,P.yellowDark), fontWeight:600 }}>
                          <span>A receber</span><span>R$ {aPagar.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Datas */}
            <div style={{ display:'grid', gridTemplateColumns: mobile?'1fr 1fr':'1fr 1fr 1fr', gap:10 }}>
              <DetMini icon="ti-calendar-plus" label="Aberta em" valor={new Date(os.abertura).toLocaleDateString('pt-BR')} T={T} />
              <DetMini icon="ti-calendar-check" label="Prazo" valor={new Date(os.prazo).toLocaleDateString('pt-BR')} T={T} cor={status==='vencido'?cor(P.red,P.redDark):status==='hoje'||status==='amanha'?cor(P.yellow,P.yellowDark):cor(P.green,P.greenDark)} />
              <DetMini icon="ti-clock-hour-4" label="Dias na OS" valor={Math.max(1, Math.round((Date.now() - new Date(os.abertura))/86400000)) + ' dia(s)'} T={T} />
            </div>

            {/* Observações */}
            {os.observacoes && (
              <DetCard icon="ti-notes" titulo="Observações" T={T}>
                <div style={{ fontSize:12.5, color:T.textSecondary, lineHeight:1.5, whiteSpace:'pre-wrap' }}>{os.observacoes}</div>
              </DetCard>
            )}

            {/* Aviso */}
            <div style={{ padding:'10px 12px', borderRadius:8, background:bgEtapa('blue', dark), border:`1px dashed ${corEtapa('blue', dark)}55`, fontSize:11.5, color:T.textSecondary, display:'flex', alignItems:'center', gap:8 }}>
              <i className="ti ti-info-circle" style={{ fontSize:15, color:corEtapa('blue', dark), flexShrink:0 }} aria-hidden="true" />
              <span>Você já pode <strong style={{color:T.textPrimary}}>arrastar o card</strong> no kanban para avançar/voltar uma etapa (com regras de bloqueio) e marcar <strong style={{color:T.textPrimary}}>"Aguardando peça"</strong>. As ações de cada etapa (check de coleta, diagnóstico, orçamento editável, baixa de pagamento) chegam na <strong style={{color:T.textPrimary}}>Entrega 2</strong>.</span>
            </div>
          </>
        )}

        {aba === 'historico' && (
          <div style={{ background:T.cardAlt, borderRadius:9, padding:'14px 16px', border:`1px solid ${T.border}` }}>
            <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
              <i className="ti ti-history" style={{ fontSize:14 }} aria-hidden="true" />
              Histórico completo de movimentações
            </div>
            {historico.length === 0 ? (
              <div style={{ textAlign:'center', padding:'2rem 1rem', color:T.textDim, fontSize:13 }}>
                <i className="ti ti-clipboard-off" style={{ fontSize:32, display:'block', marginBottom:8 }} aria-hidden="true" />
                Nenhuma movimentação registrada ainda.
              </div>
            ) : (
              <div style={{ position:'relative' }}>
                {historico.map((h, i) => {
                  const e = config.etapas.find(et => et.id === h.etapa) || { label: h.etapa, cor:'neutro' }
                  const f = funcPorId(h.funcionario)
                  const corE = corEtapa(e.cor, dark)
                  const isLast = i === historico.length - 1
                  return (
                    <div key={i} style={{ display:'flex', gap:12, position:'relative', paddingBottom: isLast ? 0 : 14 }}>
                      {/* Linha vertical conectora */}
                      {!isLast && <div style={{ position:'absolute', left:13, top:28, bottom:0, width:2, background:T.border }} />}
                      {/* Bola colorida da etapa */}
                      <div style={{ width:28, height:28, borderRadius:'50%', background:bgEtapa(e.cor, dark), color:corE, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, border:`1.5px solid ${corE}44`, zIndex:1 }}>
                        <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" />
                      </div>
                      <div style={{ flex:1, paddingTop:2 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>{e.label}</span>
                          {f && (
                            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                              <span style={{ width:18, height:18, borderRadius:'50%', background:f.cor+'33', color:f.cor, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{f.apelido}</span>
                              <span style={{ fontSize:11.5, color:T.textSecondary, fontWeight:600 }}>{f.nome}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize:11, color:T.textMuted }}>
                          <i className="ti ti-clock" style={{ fontSize:11, marginRight:4, verticalAlign:'middle' }} aria-hidden="true" />
                          {h.data}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalBase>
  )
}

function DetCard({ icon, titulo, children, T }) {
  return (
    <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'12px 14px', border:`1px solid ${T.border}` }}>
      <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:10, display:'flex', alignItems:'center', gap:6, textTransform:'uppercase', letterSpacing:'.4px' }}>
        <i className={`ti ${icon}`} style={{ fontSize:14 }} aria-hidden="true" />
        {titulo}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:7 }}>{children}</div>
    </div>
  )
}
function Linha({ label, valor, T, multi, chipCor, mono }) {
  return (
    <div style={{ display:'flex', flexDirection: multi?'column':'row', justifyContent:'space-between', gap:multi?3:8, alignItems: multi?'flex-start':'flex-start' }}>
      <span style={{ fontSize:11, color:T.textDim, flexShrink:0, fontWeight:500 }}>{label}</span>
      <span style={{ fontSize:12.5, color:T.textPrimary, textAlign: multi?'left':'right', wordBreak:'break-word', lineHeight:1.4, display:'flex', alignItems:'center', gap:6, fontFamily: mono?'ui-monospace, SFMono-Regular, monospace':'inherit' }}>
        {chipCor && <span style={{ width:8, height:8, borderRadius:'50%', background:chipCor, flexShrink:0 }} />}
        {valor || '—'}
      </span>
    </div>
  )
}
function DetMini({ icon, label, valor, T, cor }) {
  return (
    <div className="idemaq-card" style={{ background:T.cardAlt, borderRadius:9, padding:'11px 13px', border:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:10 }}>
      <i className={`ti ${icon}`} style={{ fontSize:18, color:cor||T.textMuted }} aria-hidden="true" />
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:10, color:T.textDim, marginBottom:2, fontWeight:500, textTransform:'uppercase', letterSpacing:'.3px' }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:600, color:cor||T.textPrimary }}>{valor}</div>
      </div>
    </div>
  )
}
function SubBox({ label, status, icon, T, dark }) {
  const cor = (d, c) => dark ? d : c
  const map = {
    concluido:    { c:cor(P.green, P.greenDark),   bg:cor('#0f2a15','#e8f5ec'), txt:'Concluída' },
    em_andamento: { c:cor(P.yellow, P.yellowDark), bg:cor('#2a2000','#fdf6dc'), txt:'Em andamento' },
    aguardando:   { c:T.textMuted,                 bg:T.bg,                     txt:'Aguardando' },
  }
  const m = map[status] || map.aguardando
  return (
    <div style={{ background:m.bg, border:`1px solid ${m.c}33`, borderRadius:8, padding:'11px 13px', display:'flex', alignItems:'center', gap:10 }}>
      <i className={`ti ${icon}`} style={{ fontSize:20, color:m.c }} aria-hidden="true" />
      <div>
        <div style={{ fontSize:11, color:T.textMuted, marginBottom:1, fontWeight:500 }}>{label}</div>
        <div style={{ fontSize:13, fontWeight:700, color:m.c }}>{m.txt}</div>
      </div>
    </div>
  )
}

// ─── Em construção ─────────────────────────────────────────────────────────
function EmConstrucao({ nome, T }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', color:T.textMuted }}>
      <div style={{ width:60, height:60, borderRadius:15, background:T.card, border:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
        <i className="ti ti-hammer" style={{ fontSize:30, color:T.textDim }} aria-hidden="true" />
      </div>
      <h2 style={{ fontSize:20, marginBottom:9, color:T.textPrimary, fontWeight:600 }}>{nome}</h2>
      <p style={{ fontSize:14 }}>Em construção</p>
    </div>
  )
}

// ─── App principal ─────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]         = useState(null)
  const [pagina, setPagina]     = useState('painel')
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('idemaq_tema')
    if (saved !== null) return saved === 'escuro'
    return !isMobile
  })

  function toggleDark() {
    const novo = !dark
    setDark(novo)
    localStorage.setItem('idemaq_tema', novo ? 'escuro' : 'claro')
  }

  const T = TEMAS[dark ? 'escuro' : 'claro']

  useEffect(() => {
    document.body.style.background = T.bg
  }, [dark])

  // CSS global do estilo Conta Azul no light mode
  useEffect(() => {
    const styleId = 'idemaq-card-shadow'
    let el = document.getElementById(styleId)
    if (!el) {
      el = document.createElement('style')
      el.id = styleId
      document.head.appendChild(el)
    }
    if (dark) {
      el.textContent = '' // no dark mode usamos borders normais
    } else {
      el.textContent = `
        /* Estilo "Conta Azul" no light mode: cards com sombra suave em vez de bordas */
        .idemaq-card {
          border-top: none !important;
          border-right: none !important;
          border-bottom: none !important;
          box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
          transition: box-shadow .15s, transform .15s, border-color .15s;
        }
        .idemaq-card:not([data-no-left-border]) {
          border-left: none !important;
        }
        .idemaq-card.idemaq-card-hover:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.06);
          transform: translateY(-1px);
        }
      `
    }
  }, [dark])

  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}}) => setUser(session?.user ?? null))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  async function sair() { await supabase.auth.signOut() }

  if (!user) return <Login dark={dark} T={T} />

  if (isMobile) {
    const conteudoMobile = {
      painel:     <PainelMobile T={T} dark={dark} />,
      os:         <OSMobile T={T} dark={dark} user={user} />,
      estoque:    <EmConstrucao nome="Estoque" T={T} />,
      financeiro: <EmConstrucao nome="Financeiro" T={T} />,
    }
    return (
      <div style={{ display:'flex', flexDirection:'column', background:T.bg, width:'100%', height:'100vh', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>
        <TopbarMobile pagina={pagina} dark={dark} toggleDark={toggleDark} T={T} />
        {conteudoMobile[pagina] || <PainelMobile T={T} dark={dark} />}
        <BottomNav pagina={pagina} setPagina={setPagina} sair={sair} T={T} dark={dark} />
      </div>
    )
  }

  const conteudoDesktop = {
    painel:     <Painel T={T} dark={dark} />,
    os:         <OS T={T} dark={dark} user={user} />,
    clientes:   <EmConstrucao nome="Clientes" T={T} />,
    logistica:  <EmConstrucao nome="Logística" T={T} />,
    estoque:    <EmConstrucao nome="Estoque" T={T} />,
    financeiro: <EmConstrucao nome="Financeiro" T={T} />,
    relatorios: <EmConstrucao nome="Relatórios" T={T} />,
  }

  return (
    <div style={{ display:'flex', background:T.bg, width:'100%', height:'100vh', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>
      <Sidebar pagina={pagina} setPagina={setPagina} user={user} sair={sair} collapsed={collapsed} setCollapsed={setCollapsed} T={T} dark={dark} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar pagina={pagina} dark={dark} toggleDark={toggleDark} T={T} />
        {conteudoDesktop[pagina] || <Painel T={T} dark={dark} />}
      </div>
    </div>
  )
}
