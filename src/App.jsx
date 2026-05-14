import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

const C = {
  blue:      '#5B9BD5',
  yellow:    '#FFD966',
  red:       '#c04242',
  blueLight: '#B8CCE4',
  green:     '#4ade80',
  bg:        '#0b1220',
  card:      '#111927',
  cardAlt:   '#0d1825',
  border:    '#1e2d3d',
  border2:   '#263245',
  textPrimary:   '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted:     '#475569',
  textDim:       '#334155',
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

function Badge({ children, color, bg, border }) {
  return <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, fontWeight:600, whiteSpace:'nowrap', color, background:bg, border:`1px solid ${border}` }}>{children}</span>
}

function StatusBadge({ tipo }) {
  const map = {
    vencido:  [C.red,    '#1e0f0f', 'Vencido'],
    amanha:   [C.yellow, '#2a2000', 'Amanhã'],
    '2dias':  [C.green,  '#0a1e10', '2 dias'],
    hoje:     [C.yellow, '#2a2000', 'Hoje'],
    esgotado: [C.red,    '#1e0f0f', 'Esgotado'],
    critico:  [C.red,    '#1e0f0f', 'Crítico'],
    baixo:    [C.yellow, '#2a2000', 'Baixo'],
    atrasada: [C.red,    '#1e0f0f', 'Atrasada'],
  }
  const [color, bg, label] = map[tipo] || []
  if (!label) return null
  return <Badge color={color} bg={bg} border={color+'33'}>{label}</Badge>
}

function SecTitle({ icon, children, right }) {
  return (
    <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between', textTransform:'uppercase', letterSpacing:'.5px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}><i className={`ti ${icon}`} style={{ fontSize:14 }} aria-hidden="true" />{children}</div>
      {right}
    </div>
  )
}

function CountBadge({ n, red }) {
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background: red?'#1e0f0f':'#1a2840', color: red?C.red:C.blue }}>{n}</span>
}

// ── Login ──────────────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro]   = useState('')
  const [loading, setLoading] = useState(false)
  async function entrar(e) {
    e.preventDefault(); setLoading(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos')
    setLoading(false)
  }
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:C.bg, fontFamily:'system-ui,sans-serif', padding:'1rem' }}>
      <div style={{ background:C.card, padding:'2rem', borderRadius:14, width:'100%', maxWidth:340, border:`1px solid ${C.border}`, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign:'center', marginBottom:'1.75rem' }}>
          <div style={{ width:52, height:52, background:`linear-gradient(135deg,${C.blue},#3a7bbf)`, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
            <i className="ti ti-tool" style={{ fontSize:24, color:'#fff' }} aria-hidden="true" />
          </div>
          <h2 style={{ color:C.textPrimary, marginBottom:4, fontSize:22, fontWeight:700 }}>Idemaq</h2>
          <p style={{ color:C.textMuted, fontSize:14 }}>Sistema de gestão</p>
        </div>
        <form onSubmit={entrar}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:13, color:C.textSecondary, display:'block', marginBottom:5 }}>E-mail</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:14, boxSizing:'border-box', background:'#0b1220', color:C.textPrimary, outline:'none' }} placeholder="seu@email.com" required />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ fontSize:13, color:C.textSecondary, display:'block', marginBottom:5 }}>Senha</label>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} style={{ width:'100%', padding:'10px 13px', borderRadius:9, border:`1px solid ${C.border}`, fontSize:14, boxSizing:'border-box', background:'#0b1220', color:C.textPrimary, outline:'none' }} placeholder="••••••••" required />
          </div>
          {erro && <p style={{ color:C.red, fontSize:13, marginBottom:'1rem', textAlign:'center' }}>{erro}</p>}
          <button type="submit" disabled={loading} style={{ width:'100%', padding:11, background:`linear-gradient(135deg,${C.blue},#3a7bbf)`, color:'#fff', border:'none', borderRadius:9, fontSize:14, cursor:'pointer', fontWeight:600 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function NavItem({ m, active, onClick, collapsed }) {
  return (
    <button onClick={onClick} title={collapsed ? m.label : undefined}
      style={{ width:'100%', display:'flex', alignItems:'center', gap:collapsed?0:9, padding:collapsed?'9px 0':'9px 10px', justifyContent:collapsed?'center':'flex-start', border:'none', cursor:'pointer', fontSize:13, textAlign:'left', background:active?'#1a3a5c':'transparent', color:active?C.blue:C.textMuted, borderRadius:7, position:'relative', marginBottom:1 }}>
      <i className={`ti ${m.icon}`} style={{ fontSize:16, flexShrink:0, color:active?C.blue:C.textDim }} aria-hidden="true" />
      {!collapsed && <span style={{ whiteSpace:'nowrap' }}>{m.label}</span>}
      {m.badge && <span style={{ position:'absolute', top:collapsed?4:'auto', right:collapsed?4:8, background:C.red, color:'#fff', fontSize:9, fontWeight:700, borderRadius:10, padding:'1px 5px', minWidth:16, textAlign:'center' }}>{m.badge}</span>}
    </button>
  )
}

function Sidebar({ pagina, setPagina, user, sair, collapsed, setCollapsed }) {
  const initials = user?.email?.substring(0,2).toUpperCase() || 'US'
  const w = collapsed ? 56 : 210
  return (
    <div style={{ width:w, minWidth:w, background:C.card, display:'flex', flexDirection:'column', flexShrink:0, borderRight:`1px solid ${C.border}`, transition:'width .2s ease', overflow:'hidden' }}>
      <div style={{ height:56, padding:'0 12px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:collapsed?'center':'space-between', flexShrink:0, gap:8 }}>
        {!collapsed && (
          <div style={{ display:'flex', alignItems:'center', gap:9, overflow:'hidden' }}>
            <div style={{ width:28, height:28, background:`linear-gradient(135deg,${C.blue},#3a7bbf)`, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="ti ti-tool" style={{ fontSize:14, color:'#fff' }} aria-hidden="true" />
            </div>
            <div><div style={{ color:C.textPrimary, fontWeight:700, fontSize:15, letterSpacing:'-.3px', whiteSpace:'nowrap' }}>Idemaq</div><div style={{ color:C.textDim, fontSize:9, letterSpacing:'.5px', textTransform:'uppercase' }}>Gestão</div></div>
          </div>
        )}
        <button onClick={()=>setCollapsed(!collapsed)} style={{ background:'transparent', border:'none', color:C.textMuted, cursor:'pointer', fontSize:18, padding:4, flexShrink:0, lineHeight:1 }} aria-label="Recolher menu">☰</button>
      </div>
      <div style={{ flex:1, padding:'6px 0', overflowY:'auto', overflowX:'hidden' }}>
        {!collapsed && <div style={{ padding:'10px 14px 4px', fontSize:10, color:C.border2, textTransform:'uppercase', letterSpacing:'.6px', fontWeight:600 }}>Principal</div>}
        <div style={{ padding:'0 6px' }}>
          {MENUS.filter(m=>m.section==='principal').map(m=><NavItem key={m.id} m={m} active={pagina===m.id} onClick={()=>setPagina(m.id)} collapsed={collapsed} />)}
        </div>
        {!collapsed && <div style={{ padding:'10px 14px 4px', fontSize:10, color:C.border2, textTransform:'uppercase', letterSpacing:'.6px', fontWeight:600 }}>Operação</div>}
        <div style={{ padding:'0 6px' }}>
          {MENUS.filter(m=>m.section==='operacao').map(m=><NavItem key={m.id} m={m} active={pagina===m.id} onClick={()=>setPagina(m.id)} collapsed={collapsed} />)}
        </div>
      </div>
      <div style={{ padding:collapsed?'10px 6px':'12px', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:9, overflow:'hidden' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${C.blue},#3a7bbf)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff', flexShrink:0 }}>{initials}</div>
        {!collapsed && <>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:12, color:C.textSecondary, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email||'Usuário'}</div>
            <div style={{ fontSize:10, color:C.textMuted }}>Administrador</div>
          </div>
          <button onClick={sair} style={{ background:'transparent', border:'none', color:C.textDim, cursor:'pointer', padding:4, borderRadius:5, flexShrink:0 }} aria-label="Sair"><i className="ti ti-logout" style={{ fontSize:15 }} aria-hidden="true" /></button>
        </>}
      </div>
    </div>
  )
}

// ── Topbar ─────────────────────────────────────────────────────────────────
function Topbar({ pagina }) {
  const label = MENUS.find(m=>m.id===pagina)?.label || 'Painel'
  const hoje  = new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})
  return (
    <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:'0 1.25rem', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16, fontWeight:600, color:C.textPrimary }}>{label}</span>
        <span style={{ fontSize:12, color:C.textDim, background:C.bg, padding:'3px 9px', borderRadius:6, border:`1px solid ${C.border}` }}>{hoje}</span>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <div style={{ width:34, height:34, borderRadius:8, background:'#1a2840', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
          <i className="ti ti-bell" style={{ fontSize:17, color:C.textMuted }} aria-hidden="true" />
          <div style={{ position:'absolute', top:7, right:7, width:7, height:7, borderRadius:'50%', background:C.red, border:`2px solid ${C.card}` }} />
        </div>
        <div style={{ width:34, height:34, borderRadius:8, background:'#1a3a5c', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <i className="ti ti-settings" style={{ fontSize:17, color:C.blue }} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

// ── Topbar Mobile ──────────────────────────────────────────────────────────
function TopbarMobile({ pagina }) {
  const label = MENUS.find(m=>m.id===pagina)?.label || 'Painel'
  return (
    <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:'0 1rem', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:26, height:26, background:`linear-gradient(135deg,${C.blue},#3a7bbf)`, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <i className="ti ti-tool" style={{ fontSize:13, color:'#fff' }} aria-hidden="true" />
        </div>
        <span style={{ fontSize:15, fontWeight:700, color:C.textPrimary }}>Idemaq</span>
        <span style={{ fontSize:12, color:C.textMuted }}>/ {label}</span>
      </div>
      <div style={{ position:'relative' }}>
        <i className="ti ti-bell" style={{ fontSize:20, color:C.textMuted, cursor:'pointer' }} aria-hidden="true" />
        <div style={{ position:'absolute', top:0, right:0, width:7, height:7, borderRadius:'50%', background:C.red, border:`2px solid ${C.card}` }} />
      </div>
    </div>
  )
}

// ── Bottom Nav Mobile ──────────────────────────────────────────────────────
function BottomNav({ pagina, setPagina, sair }) {
  const items = MENUS.filter(m=>MENUS_MOBILE.includes(m.id))
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, background:C.card, borderTop:`1px solid ${C.border}`, display:'flex', zIndex:100, height:60 }}>
      {items.map(m=>(
        <button key={m.id} onClick={()=>setPagina(m.id)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'transparent', border:'none', cursor:'pointer', color:pagina===m.id?C.blue:C.textDim, position:'relative' }}>
          <i className={`ti ${m.icon}`} style={{ fontSize:20 }} aria-hidden="true" />
          <span style={{ fontSize:9, fontWeight:600 }}>{m.label}</span>
          {m.badge && <span style={{ position:'absolute', top:6, right:'calc(50% - 14px)', background:C.red, color:'#fff', fontSize:8, fontWeight:700, borderRadius:10, padding:'1px 4px', minWidth:14, textAlign:'center' }}>{m.badge}</span>}
        </button>
      ))}
      <button onClick={sair} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, background:'transparent', border:'none', cursor:'pointer', color:C.textDim }}>
        <i className="ti ti-logout" style={{ fontSize:20 }} aria-hidden="true" />
        <span style={{ fontSize:9, fontWeight:600 }}>Sair</span>
      </button>
    </div>
  )
}

// ── Painel Desktop ─────────────────────────────────────────────────────────
function Painel() {
  const card = { background:C.card, borderRadius:11, padding:'14px 16px', border:`1px solid ${C.border}` }
  const row2 = { display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10 }
  const row4 = { display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10 }
  const row3 = { display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:10 }

  const metas = [
    { label:'Faturamento — meta R$ 20.000', pct:71, cor:C.blue,   sub:'R$ 14.260 atingido · faltam R$ 5.740' },
    { label:'Meta diária — Seg a Sab · 11 dias restantes', pct:58, cor:C.yellow, sub:'R$ 491/dia necessário · feriados excluídos' },
  ]
  const kpis = [
    { label:'Faturamento mai', valor:'R$ 14.260', cor:C.blue,      icoBg:'#0d2035', ico:'ti-cash',              trend:'+12% vs abr', trendCor:C.green },
    { label:'Saldo líquido',   valor:'R$ 4.420',  cor:C.blueLight, icoBg:'#0d2035', ico:'ti-trending-up',        trend:'+8% vs abr',  trendCor:C.green },
    { label:'A pagar hoje',    valor:'R$ 2.090',  cor:C.red,       icoBg:'#1e0f0f', ico:'ti-receipt',            trend:'2 vencimentos', trendCor:C.red },
    { label:'Máq. na oficina', valor:'18',         cor:C.yellow,    icoBg:'#2a2000', ico:'ti-building-warehouse', trend:'14 em OS · 4 à venda', trendCor:C.textMuted },
  ]
  const chartAnualData = {
    labels:['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    datasets:[
      { label:'Recebido', data:[18000,12000,15000,9000,14260,0,0,0,0,0,0,0], backgroundColor:C.blue, borderRadius:3, stack:'s' },
      { label:'Pago',     data:[-12000,-9000,-11000,-7000,-9840,0,0,0,0,0,0,0], backgroundColor:C.red, borderRadius:3, stack:'s' },
      { type:'line', label:'Saldo', data:[6000,9000,13000,15000,19420,null,null,null,null,null,null,null], borderColor:C.blueLight, borderWidth:1.5, pointBackgroundColor:C.blueLight, pointRadius:3, tension:0.4, fill:false, stack:undefined },
    ]
  }
  const chartMesData = {
    labels:['10/mai','11/mai','12/mai','13/mai','14/mai'],
    datasets:[
      { label:'Recebido', data:[48000,14000,16000,32000,0],    backgroundColor:C.blue, borderRadius:3, stack:'s' },
      { label:'Pago',     data:[-28000,-8000,-10000,-18000,0], backgroundColor:C.red,  borderRadius:3, stack:'s' },
      { type:'line', label:'Saldo', data:[68000,64000,70000,72000,68000], borderColor:C.blueLight, borderWidth:1.5, pointBackgroundColor:C.blueLight, pointRadius:3, tension:0.4, fill:false, stack:undefined },
    ]
  }
  const chartOpts = () => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{ backgroundColor:C.card, titleColor:C.textPrimary, bodyColor:C.textSecondary, borderColor:C.border, borderWidth:1, padding:9 } },
    scales:{
      x:{ stacked:true, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:C.textDim,font:{size:10}}, border:{color:'transparent'} },
      y:{ stacked:true, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:C.textDim,font:{size:10},callback:v=>(v<0?'-R$'+Math.abs(Math.round(v/1000))+'k':'R$'+Math.round(v/1000)+'k')}, border:{color:'transparent'} }
    }
  })
  const osItems = [
    { label:'Ag. agenda',  n:2, bg:'#0f1e2e', border:C.border,       cor:'#64748b' },
    { label:'Agendado',    n:3, bg:'#0f1e2e', border:C.border,       cor:'#64748b' },
    { label:'Diagnóstico', n:2, bg:'#2a2000', border:C.yellow+'22',  cor:C.yellow },
    { label:'Orçamento',   n:2, bg:'#1e0f0f', border:C.red+'22',     cor:C.red },
    { label:'Limpeza',     n:1, bg:'#0f1e2e', border:C.border,       cor:'#64748b' },
    { label:'Manutenção',  n:1, bg:'#0f1e2e', border:C.border,       cor:'#64748b' },
    { label:'Finalizado',  n:1, bg:'#0a1e10', border:C.green+'22',   cor:C.green },
    { label:'Entregas',    n:2, bg:'#0d2035', border:C.blue+'22',    cor:C.blue },
  ]
  const agendamentos = [
    { hr:'08:30', dt:'hoje',   tipo:'urgente', nm:'Ana Reis · Lavadora LG',              svc:'Diagnóstico', tempo:'1h 20min' },
    { hr:'10:00', dt:'hoje',   tipo:'hoje',    nm:'João Costa · Geladeira Consul',        svc:'Manutenção',  tempo:'2h 50min' },
    { hr:'14:00', dt:'hoje',   tipo:'hoje',    nm:'Maria Silva · Fogão Brastemp',         svc:'Limpeza',     tempo:'6h 50min' },
    { hr:'09:00', dt:'amanhã', tipo:'proximo', nm:'Carlos Lima · Micro-ondas Electrolux', svc:'Orçamento',   tempo:'amanhã' },
    { hr:'11:30', dt:'amanhã', tipo:'proximo', nm:'Paula Mendes · Ar cond. Midea',        svc:'Instalação',  tempo:'amanhã' },
  ]
  const calCor = t => t==='urgente'?C.red:t==='hoje'?C.yellow:C.green
  const calBg  = t => t==='urgente'?'#1e0f0f':t==='hoje'?'#2a2000':'#0a1e10'

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
    { nm:'Rolamento do cesto',   pct:100, qtd:0,  qtdCor:C.red },
    { nm:'Resistência 220V',     pct:79,  qtd:1,  qtdCor:C.red },
    { nm:'Dreno sanfonado',      pct:64,  qtd:3,  qtdCor:C.yellow },
    { nm:'Capacitor partida',    pct:50,  qtd:8,  qtdCor:C.textMuted },
    { nm:'Termostato universal', pct:36,  qtd:12, qtdCor:C.textMuted },
  ]

  function AlRow({ msg, sub, dot, badge }) {
    return (
      <div style={{ display:'flex', alignItems:'flex-start', gap:7, padding:'6px 0', borderBottom:`1px solid #131f2e` }}>
        <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, marginTop:5, background:dot }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12, color:C.textSecondary, lineHeight:1.3, fontWeight:500 }}>{msg}</div>
          <div style={{ fontSize:10, color:C.textDim, marginTop:2 }}>{sub}</div>
        </div>
        {badge}
      </div>
    )
  }
  function AlCard({ icon, title, count, countRed, children, footer }) {
    return (
      <div style={{ background:'#0d1825', borderRadius:10, padding:'12px 13px', border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:9, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}><i className={`ti ${icon}`} style={{ fontSize:14 }} aria-hidden="true" />{title}</div>
          <CountBadge n={count} red={countRed} />
        </div>
        {children}
        {footer && <div style={{ marginTop:7, paddingTop:7, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.textDim, display:'flex', gap:12, flexWrap:'wrap' }}>{footer}</div>}
      </div>
    )
  }

  return (
    <div style={{ padding:'1.1rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:10, fontSize:14 }}>
      {/* Metas */}
      <div style={card}>
        <SecTitle icon="ti-target">Metas de maio</SecTitle>
        <div style={row2}>
          {metas.map((m,i) => (
            <div key={i}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
                <span style={{ fontSize:11, color:C.textSecondary }}>{m.label}</span>
                <span style={{ fontSize:13, fontWeight:600, color:m.cor }}>{m.pct}%</span>
              </div>
              <div style={{ background:C.bg, borderRadius:3, height:4, overflow:'hidden' }}>
                <div style={{ width:`${m.pct}%`, height:'100%', borderRadius:3, background:m.cor }} />
              </div>
              <div style={{ fontSize:10, color:C.textDim, marginTop:4 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>
      {/* KPIs */}
      <div style={row4}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:C.card, borderRadius:11, border:`1px solid ${C.border}`, overflow:'hidden' }}>
            <div style={{ height:3, background:k.cor }} />
            <div style={{ padding:'13px 15px' }}>
              <div style={{ width:30, height:30, borderRadius:8, background:k.icoBg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:9 }}>
                <i className={`ti ${k.ico}`} style={{ fontSize:15, color:k.cor }} aria-hidden="true" />
              </div>
              <div style={{ fontSize:20, fontWeight:700, color:k.cor, marginBottom:3, letterSpacing:'-.5px' }}>{k.valor}</div>
              <div style={{ fontSize:11, color:C.textMuted, marginBottom:6 }}>{k.label}</div>
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
                <div style={{ fontSize:11, fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.5px', marginBottom:3, display:'flex', alignItems:'center', gap:5 }}>
                  <i className="ti ti-arrows-exchange" style={{ fontSize:13 }} aria-hidden="true" />{g.title}
                </div>
                <div style={{ fontSize:18, fontWeight:700, color:C.blue, letterSpacing:'-.5px' }}>{g.total}</div>
                <div style={{ fontSize:10, color:C.textDim, marginTop:2 }}>{g.sub}</div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                {[{c:C.blue,l:'Rec.'},{c:C.red,l:'Pago'},{c:C.blueLight,l:'Saldo',line:true}].map((leg,j) => (
                  <span key={j} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:C.textDim }}>
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
          <SecTitle icon="ti-clipboard-list" right={<CountBadge n="14 total" />}>Situação das OS</SecTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:6 }}>
            {osItems.map((os,i) => (
              <div key={i} style={{ borderRadius:8, padding:'9px 6px', textAlign:'center', border:`1px solid ${os.border}`, background:os.bg }}>
                <div style={{ fontSize:17, fontWeight:700, color:os.cor }}>{os.n}</div>
                <div style={{ fontSize:10, marginTop:3, lineHeight:1.3, color:os.cor, opacity:.85 }}>{os.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <SecTitle icon="ti-calendar-event" right={<CountBadge n="5 hoje e amanhã" />}>Próximos agendamentos</SecTitle>
          {agendamentos.map((a,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:9, padding:'7px 0', borderBottom:i<agendamentos.length-1?`1px solid #1a2535`:'none' }}>
              <div style={{ textAlign:'right', minWidth:46 }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.textPrimary }}>{a.hr}</div>
                <div style={{ fontSize:10, color:C.textMuted }}>{a.dt}</div>
              </div>
              <div style={{ width:3, height:34, borderRadius:2, flexShrink:0, background:calCor(a.tipo) }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:C.textSecondary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:500 }}>{a.nm}</div>
                <div style={{ fontSize:10, color:C.textMuted, marginTop:1 }}>{a.svc}</div>
              </div>
              <Badge color={calCor(a.tipo)} bg={calBg(a.tipo)} border={calCor(a.tipo)+'33'}>{a.tempo}</Badge>
            </div>
          ))}
        </div>
      </div>
      {/* Alertas */}
      <div style={card}>
        <SecTitle icon="ti-alert-triangle" right={<CountBadge n="9 ativos" red />}>Alertas da operação</SecTitle>
        <div style={row3}>
          <AlCard icon="ti-arrow-down-circle" title="A receber" count={3} countRed footer={<><span>Vencido: <strong style={{color:C.red}}>R$ 535</strong></span><span>Próx. 2d: <strong style={{color:C.yellow}}>R$ 1.080</strong></span></>}>
            {alertaReceber.map((a,i) => <AlRow key={i} msg={a.msg} sub={a.sub} dot={a.tipo==='vencido'?C.red:a.tipo==='hoje'?C.yellow:C.green} badge={<StatusBadge tipo={a.tipo}/>}/>)}
          </AlCard>
          <AlCard icon="ti-arrow-up-circle" title="A pagar" count={3} countRed footer={<><span>Vencido: <strong style={{color:C.red}}>R$ 890</strong></span><span>Próx. 2d: <strong style={{color:C.yellow}}>R$ 2.090</strong></span></>}>
            {alertaPagar.map((a,i) => <AlRow key={i} msg={a.msg} sub={a.sub} dot={a.tipo==='vencido'?C.red:a.tipo==='amanha'?C.yellow:C.green} badge={<StatusBadge tipo={a.tipo}/>}/>)}
          </AlCard>
          <AlCard icon="ti-clock-exclamation" title="Etapas +24h" count={3} countRed>
            {alertaEtapas.map((a,i) => <AlRow key={i} msg={a.msg} sub={a.sub} dot={a.critico?C.red:C.yellow} badge={<Badge color={a.critico?C.red:C.yellow} bg={a.critico?'#1e0f0f':'#2a2000'} border={(a.critico?C.red:C.yellow)+'33'}>{a.horas}</Badge>}/>)}
          </AlCard>
          <AlCard icon="ti-calendar-x" title="Prazo de conclusão" count={3} countRed>
            {alertaPrazo.map((a,i) => <AlRow key={i} msg={a.msg} sub={a.sub} dot={a.tipo==='atrasada'?C.red:C.yellow} badge={<StatusBadge tipo={a.tipo}/>}/>)}
          </AlCard>
          <AlCard icon="ti-package" title="Estoque crítico" count={3} countRed>
            {alertaEstoque.map((a,i) => <AlRow key={i} msg={a.msg} sub={a.sub} dot={a.tipo==='esgotado'||a.tipo==='critico'?C.red:C.yellow} badge={<StatusBadge tipo={a.tipo}/>}/>)}
          </AlCard>
          <AlCard icon="ti-packages" title="Top 5 peças" count="saídas/mês">
            {top5.map((p,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:i<top5.length-1?`1px solid #131f2e`:'none' }}>
                <span style={{ fontSize:10, color:C.textDim, minWidth:16, fontWeight:600 }}>#{i+1}</span>
                <span style={{ fontSize:11, color:C.textMuted, flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.nm}</span>
                <div style={{ width:46, background:C.bg, borderRadius:2, height:3, overflow:'hidden', flexShrink:0 }}>
                  <div style={{ width:`${p.pct}%`, height:'100%', borderRadius:2, background:p.qtd<=1?C.blue:C.blueLight }} />
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

// ── Painel Mobile ──────────────────────────────────────────────────────────
function PainelMobile() {
  const card = { background:C.card, borderRadius:12, padding:'14px 15px', border:`1px solid ${C.border}` }
  const kpis = [
    { label:'Faturamento mai', valor:'R$ 14.260', cor:C.blue,      ico:'ti-cash' },
    { label:'Saldo líquido',   valor:'R$ 4.420',  cor:C.blueLight, ico:'ti-trending-up' },
    { label:'A pagar hoje',    valor:'R$ 2.090',  cor:C.red,       ico:'ti-receipt' },
    { label:'Máq. na oficina', valor:'18',         cor:C.yellow,    ico:'ti-building-warehouse' },
  ]
  const agendamentos = [
    { hr:'08:30', tipo:'urgente', nm:'Ana Reis · Lavadora LG',              svc:'Diagnóstico', tempo:'1h 20min' },
    { hr:'10:00', tipo:'hoje',    nm:'João Costa · Geladeira Consul',        svc:'Manutenção',  tempo:'2h 50min' },
    { hr:'14:00', tipo:'hoje',    nm:'Maria Silva · Fogão Brastemp',         svc:'Limpeza',     tempo:'6h 50min' },
    { hr:'09:00', tipo:'proximo', nm:'Carlos Lima · Micro-ondas Electrolux', svc:'Orçamento',   tempo:'amanhã' },
  ]
  const calCor = t => t==='urgente'?C.red:t==='hoje'?C.yellow:C.green
  const calBg  = t => t==='urgente'?'#1e0f0f':t==='hoje'?'#2a2000':'#0a1e10'
  const alertas = [
    { dot:C.red,    msg:'OS #1031 · João Costa · R$ 320 vencido',  badge:<Badge color={C.red}    bg="#1e0f0f" border={C.red+'33'}>Vencido</Badge> },
    { dot:C.red,    msg:'OS #1036 · Ana Reis · R$ 215 vencido',    badge:<Badge color={C.red}    bg="#1e0f0f" border={C.red+'33'}>Vencido</Badge> },
    { dot:C.yellow, msg:'Aluguel vence amanhã · R$ 1.200',         badge:<Badge color={C.yellow} bg="#2a2000" border={C.yellow+'33'}>Amanhã</Badge> },
    { dot:C.red,    msg:'OS #1037 · Diagnóstico há 31h',           badge:<Badge color={C.red}    bg="#1e0f0f" border={C.red+'33'}>31h</Badge> },
    { dot:C.red,    msg:'OS #1036 · Ana Reis · 2 dias atrasado',   badge:<Badge color={C.red}    bg="#1e0f0f" border={C.red+'33'}>Atrasada</Badge> },
    { dot:C.red,    msg:'Rolamento do cesto · Esgotado',           badge:<Badge color={C.red}    bg="#1e0f0f" border={C.red+'33'}>Esgotado</Badge> },
  ]
  return (
    <div style={{ padding:'1rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:10, paddingBottom:70 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:C.card, borderRadius:12, border:`1px solid ${C.border}`, overflow:'hidden' }}>
            <div style={{ height:3, background:k.cor }} />
            <div style={{ padding:'12px 13px' }}>
              <i className={`ti ${k.ico}`} style={{ fontSize:18, color:k.cor, marginBottom:6, display:'block' }} aria-hidden="true" />
              <div style={{ fontSize:18, fontWeight:700, color:k.cor, letterSpacing:'-.5px' }}>{k.valor}</div>
              <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={card}>
        <SecTitle icon="ti-calendar-event">Agendamentos de hoje</SecTitle>
        {agendamentos.map((a,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<agendamentos.length-1?`1px solid #1a2535`:'none' }}>
            <div style={{ width:3, height:36, borderRadius:2, flexShrink:0, background:calCor(a.tipo) }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:C.textSecondary, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nm}</div>
              <div style={{ fontSize:11, color:C.textMuted, marginTop:1 }}>{a.hr} · {a.svc}</div>
            </div>
            <Badge color={calCor(a.tipo)} bg={calBg(a.tipo)} border={calCor(a.tipo)+'33'}>{a.tempo}</Badge>
          </div>
        ))}
      </div>
      <div style={card}>
        <SecTitle icon="ti-alert-triangle" right={<CountBadge n="6" red />}>Alertas</SecTitle>
        {alertas.map((a,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:i<alertas.length-1?`1px solid #1a2535`:'none' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:a.dot }} />
            <div style={{ flex:1, fontSize:13, color:C.textSecondary }}>{a.msg}</div>
            {a.badge}
          </div>
        ))}
      </div>
      <div style={card}>
        <SecTitle icon="ti-clipboard-list">Situação das OS</SecTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:6 }}>
          {[
            { label:'Ag.',         n:2, cor:'#64748b', bg:'#0f1e2e' },
            { label:'Diagnóstico', n:2, cor:C.yellow,  bg:'#2a2000' },
            { label:'Orçamento',   n:2, cor:C.red,     bg:'#1e0f0f' },
            { label:'Finalizado',  n:1, cor:C.green,   bg:'#0a1e10' },
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

// ── OS Mobile ──────────────────────────────────────────────────────────────
function OSMobile() {
  const [filtro, setFiltro] = useState('todas')
  const osList = [
    { id:'#1036', cliente:'Ana Reis',     equip:'Lavadora LG',           etapa:'Diagnóstico', prazo:'11/mai', status:'atrasada' },
    { id:'#1037', cliente:'João Costa',   equip:'Geladeira Consul',       etapa:'Diagnóstico', prazo:'14/mai', status:'ok' },
    { id:'#1039', cliente:'Carlos Lima',  equip:'Micro-ondas Electrolux', etapa:'Orçamento',   prazo:'13/mai', status:'hoje' },
    { id:'#1041', cliente:'Paula Mendes', equip:'Ar condicionado Midea',  etapa:'Pré-diag.',   prazo:'15/mai', status:'ok' },
    { id:'#1033', cliente:'Pedro Alves',  equip:'Secadora Brastemp',      etapa:'Manutenção',  prazo:'12/mai', status:'atrasada' },
    { id:'#1042', cliente:'Maria Silva',  equip:'Fogão Brastemp',         etapa:'Limpeza',     prazo:'16/mai', status:'ok' },
  ]
  const filtrados = filtro==='todas' ? osList : osList.filter(o=>o.status===filtro)
  const etapaCor = { 'Diagnóstico':C.yellow,'Orçamento':C.red,'Pré-diag.':C.yellow,'Manutenção':C.blueLight,'Limpeza':C.blueLight,'Finalizado':C.green }
  return (
    <div style={{ padding:'1rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:10, paddingBottom:70 }}>
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
        {[['todas','Todas'],['atrasada','Atrasadas'],['hoje','Vencem hoje'],['ok','Em dia']].map(([v,l]) => (
          <button key={v} onClick={()=>setFiltro(v)} style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filtro===v?C.blue:C.border}`, background:filtro===v?'#1a3a5c':'transparent', color:filtro===v?C.blue:C.textMuted, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', fontWeight:filtro===v?600:400 }}>{l}</button>
        ))}
      </div>
      {filtrados.map((os,i) => (
        <div key={i} style={{ background:C.card, borderRadius:12, padding:'14px 15px', border:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.textPrimary }}>{os.cliente}</div>
              <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{os.equip}</div>
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:C.textDim }}>{os.id}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11, padding:'3px 9px', borderRadius:6, background:(etapaCor[os.etapa]||C.blue)+'22', color:etapaCor[os.etapa]||C.blue, fontWeight:600 }}>{os.etapa}</span>
              <span style={{ fontSize:11, color:C.textMuted }}>· prazo {os.prazo}</span>
            </div>
            {os.status==='atrasada' && <Badge color={C.red}    bg="#1e0f0f" border={C.red+'33'}>Atrasada</Badge>}
            {os.status==='hoje'     && <Badge color={C.yellow} bg="#2a2000" border={C.yellow+'33'}>Hoje</Badge>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Em construção ──────────────────────────────────────────────────────────
function EmConstrucao({ nome }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', color:C.textMuted }}>
      <div style={{ width:60, height:60, borderRadius:15, background:C.card, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
        <i className="ti ti-hammer" style={{ fontSize:30, color:C.textDim }} aria-hidden="true" />
      </div>
      <h2 style={{ fontSize:20, marginBottom:9, color:C.textPrimary, fontWeight:600 }}>{nome}</h2>
      <p style={{ fontSize:14 }}>Em construção</p>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]     = useState(null)
  const [pagina, setPagina] = useState('painel')
  const isMobile = useIsMobile()

  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}}) => setUser(session?.user ?? null))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  async function sair() { await supabase.auth.signOut() }

  if (!user) return <Login />

  if (isMobile) {
    const conteudoMobile = { painel:<PainelMobile/>, os:<OSMobile/>, estoque:<EmConstrucao nome="Estoque"/>, financeiro:<EmConstrucao nome="Financeiro"/> }
    return (
      <div style={{ display:'flex', flexDirection:'column', background:C.bg, width:'100%', height:'100vh', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>
        <TopbarMobile pagina={pagina} />
        {conteudoMobile[pagina] || <PainelMobile/>}
        <BottomNav pagina={pagina} setPagina={setPagina} sair={sair} />
      </div>
    )
  }

  const [collapsed, setCollapsed] = useState(false)
  const conteudoDesktop = { painel:<Painel/>, os:<EmConstrucao nome="Ordens de Serviço"/>, clientes:<EmConstrucao nome="Clientes"/>, logistica:<EmConstrucao nome="Logística"/>, estoque:<EmConstrucao nome="Estoque"/>, financeiro:<EmConstrucao nome="Financeiro"/>, relatorios:<EmConstrucao nome="Relatórios"/> }

  return (
    <div style={{ display:'flex', background:C.bg, width:'100%', height:'100vh', fontFamily:'system-ui,sans-serif', overflow:'hidden' }}>
      <Sidebar pagina={pagina} setPagina={setPagina} user={user} sair={sair} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar pagina={pagina} />
        {conteudoDesktop[pagina] || <Painel/>}
      </div>
    </div>
  )
}
