import { useState, useEffect } from 'react'
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
  },
  claro: {
    bg:        '#f0f0f2',
    card:      '#ffffff',
    cardAlt:   '#f8f8fa',
    border:    '#e0e0e4',
    border2:   '#d0d0d4',
    sbBg:      '#ffffff',
    topBg:     '#ffffff',
    textPrimary:   '#1a1a1e',
    textSecondary: '#444444',
    textMuted:     '#888888',
    textDim:       '#aaaaaa',
    progBg:    '#e8e8ec',
    osNeutro:  '#ebebed',
    osNeutroT: '#888888',
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
      <div style={{ background:T.card, padding:'2rem', borderRadius:14, width:'100%', maxWidth:340, border:`1px solid ${T.border}`, boxShadow: dark?'0 8px 32px rgba(0,0,0,0.4)':'0 4px 24px rgba(0,0,0,0.08)' }}>
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
function OSMobile({ T, dark }) {
  const [filtro, setFiltro] = useState('todas')
  const cor = (d, c) => dark ? d : c
  const osList = [
    { id:'#1036', cliente:'Ana Reis',     equip:'Lavadora LG',           etapa:'Diagnóstico', prazo:'11/mai', status:'atrasada' },
    { id:'#1037', cliente:'João Costa',   equip:'Geladeira Consul',       etapa:'Diagnóstico', prazo:'14/mai', status:'ok' },
    { id:'#1039', cliente:'Carlos Lima',  equip:'Micro-ondas Electrolux', etapa:'Orçamento',   prazo:'13/mai', status:'hoje' },
    { id:'#1041', cliente:'Paula Mendes', equip:'Ar condicionado Midea',  etapa:'Pré-diag.',   prazo:'15/mai', status:'ok' },
    { id:'#1033', cliente:'Pedro Alves',  equip:'Secadora Brastemp',      etapa:'Manutenção',  prazo:'12/mai', status:'atrasada' },
    { id:'#1042', cliente:'Maria Silva',  equip:'Fogão Brastemp',         etapa:'Limpeza',     prazo:'16/mai', status:'ok' },
  ]
  const filtrados = filtro==='todas' ? osList : osList.filter(o=>o.status===filtro)
  const etapaCor = {
    'Diagnóstico': cor(P.yellow,P.yellowDark),
    'Orçamento':   cor(P.red,P.redDark),
    'Pré-diag.':   cor(P.yellow,P.yellowDark),
    'Manutenção':  cor(P.blueLight,P.blueLightDark),
    'Limpeza':     cor(P.blueLight,P.blueLightDark),
    'Finalizado':  cor(P.green,P.greenDark),
  }
  const etapaBg = {
    'Diagnóstico': cor('#2a2000','#fdf6dc'),
    'Orçamento':   cor('#2a1515','#fde8e8'),
    'Pré-diag.':   cor('#2a2000','#fdf6dc'),
    'Manutenção':  cor('#0d2035','#e6f1fb'),
    'Limpeza':     cor('#0d2035','#e6f1fb'),
    'Finalizado':  cor('#0f2a15','#e8f5ec'),
  }
  const activeClr = dark ? P.blue : P.blueDark
  return (
    <div style={{ padding:'1rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:10, paddingBottom:70 }}>
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
        {[['todas','Todas'],['atrasada','Atrasadas'],['hoje','Vencem hoje'],['ok','Em dia']].map(([v,l]) => (
          <button key={v} onClick={()=>setFiltro(v)} style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${filtro===v?activeClr:T.border}`, background:filtro===v?cor('#1a3a5c','#e6f1fb'):'transparent', color:filtro===v?activeClr:T.textMuted, fontSize:12, cursor:'pointer', whiteSpace:'nowrap', fontWeight:filtro===v?600:400 }}>{l}</button>
        ))}
      </div>
      {filtrados.map((os,i) => (
        <div key={i} style={{ background:T.card, borderRadius:12, padding:'14px 15px', border:`1px solid ${T.border}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:T.textPrimary }}>{os.cliente}</div>
              <div style={{ fontSize:12, color:T.textMuted, marginTop:2 }}>{os.equip}</div>
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:T.textDim }}>{os.id}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:11, padding:'3px 9px', borderRadius:6, background:etapaBg[os.etapa]||(dark?'#0d2035':'#e6f1fb'), color:etapaCor[os.etapa]||(dark?P.blue:P.blueDark), fontWeight:600 }}>{os.etapa}</span>
              <span style={{ fontSize:11, color:T.textMuted }}>· prazo {os.prazo}</span>
            </div>
            {os.status==='atrasada' && <Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Atrasada</Badge>}
            {os.status==='hoje'     && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Hoje</Badge>}
          </div>
        </div>
      ))}
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
      os:         <OSMobile T={T} dark={dark} />,
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
    os:         <EmConstrucao nome="Ordens de Serviço" T={T} />,
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
