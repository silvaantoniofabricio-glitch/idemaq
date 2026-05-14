import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  LineController, BarController,
  PointElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, LineController, BarController, PointElement, Title, Tooltip, Legend, Filler)

// ─── Paleta acessível Deutan ───────────────────────────────────────────────
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
  { id: 'painel',     label: 'Painel',     icon: 'ti-layout-dashboard', section: 'principal',  badge: 5 },
  { id: 'os',         label: 'OS',          icon: 'ti-clipboard-list',   section: 'principal',  badge: 5 },
  { id: 'clientes',   label: 'Clientes',    icon: 'ti-user',             section: 'principal' },
  { id: 'logistica',  label: 'Logística',   icon: 'ti-truck',            section: 'operacao' },
  { id: 'estoque',    label: 'Estoque',     icon: 'ti-package',          section: 'operacao',   badge: 2 },
  { id: 'financeiro', label: 'Financeiro',  icon: 'ti-cash',             section: 'operacao' },
  { id: 'relatorios', label: 'Relatórios',  icon: 'ti-chart-bar',        section: 'operacao' },
]

// ─── Estilos inline globais ────────────────────────────────────────────────
const S = {
  app:     { display:'flex', background:C.bg, width:'100%', minHeight:'100vh', fontFamily:'system-ui,sans-serif', fontSize:13 },
  // Sidebar
  sb:      { width:200, background:C.card, display:'flex', flexDirection:'column', flexShrink:0, borderRight:`1px solid ${C.border}` },
  sbHd:    { padding:'14px 14px 11px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:9 },
  sbIc:    { width:28, height:28, background:`linear-gradient(135deg,${C.blue},#3a7bbf)`, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  sbNm:    { color:C.textPrimary, fontWeight:700, fontSize:14, letterSpacing:'-.3px' },
  sbSub:   { color:C.textDim, fontSize:9, letterSpacing:'.5px', textTransform:'uppercase', marginTop:1 },
  navSec:  { padding:'10px 14px 4px', fontSize:9, color:C.border2, textTransform:'uppercase', letterSpacing:'.6px', fontWeight:600 },
  navWrap: { padding:'0 8px' },
  ni:      (active) => ({ width:'100%', display:'flex', alignItems:'center', gap:9, padding:'8px 10px', border:'none', cursor:'pointer', fontSize:12, textAlign:'left', background: active ? '#1a3a5c' : 'transparent', color: active ? C.blue : C.textMuted, borderRadius:7, position:'relative', marginBottom:1 }),
  niBadge: { position:'absolute', right:8, background:C.red, color:'#fff', fontSize:9, fontWeight:700, borderRadius:10, padding:'1px 5px', minWidth:16, textAlign:'center' },
  sbUser:  { padding:'12px 14px', borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:9 },
  sbAv:    { width:32, height:32, borderRadius:'50%', background:`linear-gradient(135deg,${C.blue},#3a7bbf)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 },
  // Topbar
  topbar:  { background:C.card, borderBottom:`1px solid ${C.border}`, padding:'0 1.25rem', height:48, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  tbDate:  { fontSize:11, color:C.textDim, background:C.bg, padding:'3px 8px', borderRadius:5, border:`1px solid ${C.border}` },
  tbBtn:   { width:30, height:30, borderRadius:7, background:'#1a2840', border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' },
  // Content
  content: { padding:'1rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:9 },
  card:    { background:C.card, borderRadius:10, padding:'13px 14px', border:`1px solid ${C.border}` },
  cardAlt: { background:C.cardAlt, borderRadius:9, padding:'11px 12px', border:`1px solid ${C.border}` },
  row:     (cols) => ({ display:'grid', gridTemplateColumns: cols || '1fr', gap:9 }),
  secT:    { fontSize:10, fontWeight:600, color:C.textMuted, marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', textTransform:'uppercase', letterSpacing:'.5px' },
  secTL:   { display:'flex', alignItems:'center', gap:5 },
}

// ─── Componentes utilitários ───────────────────────────────────────────────
function Badge({ children, color, bg, border }) {
  return (
    <span style={{ fontSize:9, padding:'2px 7px', borderRadius:20, fontWeight:600, whiteSpace:'nowrap', color, background:bg, border:`1px solid ${border}` }}>
      {children}
    </span>
  )
}

function StatusBadge({ tipo }) {
  if (tipo === 'vencido')  return <Badge color={C.red}       bg="#1e0f0f"  border={C.red+'33'}>Vencido</Badge>
  if (tipo === 'amanha')   return <Badge color={C.yellow}    bg="#2a2000"  border={C.yellow+'33'}>Amanhã</Badge>
  if (tipo === '2dias')    return <Badge color={C.green}     bg="#0a1e10"  border={C.green+'33'}>2 dias</Badge>
  if (tipo === 'hoje')     return <Badge color={C.yellow}    bg="#2a2000"  border={C.yellow+'33'}>Hoje</Badge>
  if (tipo === 'esgotado') return <Badge color={C.red}       bg="#1e0f0f"  border={C.red+'33'}>Esgotado</Badge>
  if (tipo === 'critico')  return <Badge color={C.red}       bg="#1e0f0f"  border={C.red+'33'}>Crítico</Badge>
  if (tipo === 'baixo')    return <Badge color={C.yellow}    bg="#2a2000"  border={C.yellow+'33'}>Baixo</Badge>
  if (tipo === 'atrasada') return <Badge color={C.red}       bg="#1e0f0f"  border={C.red+'33'}>Atrasada</Badge>
  return null
}

function SecTitle({ icon, children, right }) {
  return (
    <div style={S.secT}>
      <div style={S.secTL}>
        <i className={`ti ${icon}`} style={{ fontSize:13 }} aria-hidden="true" />
        {children}
      </div>
      {right}
    </div>
  )
}

function CountBadge({ n, red }) {
  return (
    <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:10, background: red ? '#1e0f0f' : '#1a2840', color: red ? C.red : C.blue }}>
      {n}
    </span>
  )
}

// ─── Login ─────────────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro]   = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setLoading(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos')
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:C.bg, fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:C.card, padding:'2rem', borderRadius:12, width:320, border:`1px solid ${C.border}`, boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ width:48, height:48, background:`linear-gradient(135deg,${C.blue},#3a7bbf)`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px' }}>
            <i className="ti ti-tool" style={{ fontSize:22, color:'#fff' }} aria-hidden="true" />
          </div>
          <h2 style={{ color:C.textPrimary, marginBottom:4, fontSize:20, fontWeight:700 }}>Idemaq</h2>
          <p style={{ color:C.textMuted, fontSize:13 }}>Sistema de gestão</p>
        </div>
        <form onSubmit={entrar}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:12, color:C.textSecondary, display:'block', marginBottom:4 }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', background:'#0b1220', color:C.textPrimary, outline:'none' }}
              placeholder="seu@email.com" required />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ fontSize:12, color:C.textSecondary, display:'block', marginBottom:4 }}>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontSize:13, boxSizing:'border-box', background:'#0b1220', color:C.textPrimary, outline:'none' }}
              placeholder="••••••••" required />
          </div>
          {erro && <p style={{ color:C.red, fontSize:12, marginBottom:'1rem', textAlign:'center' }}>{erro}</p>}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:10, background:`linear-gradient(135deg,${C.blue},#3a7bbf)`, color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer', fontWeight:600 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────
function Sidebar({ pagina, setPagina, user, sair }) {
  const initials = user?.email?.substring(0,2).toUpperCase() || 'US'
  return (
    <div style={S.sb}>
      <div style={S.sbHd}>
        <div style={S.sbIc}><i className="ti ti-tool" style={{ fontSize:14, color:'#fff' }} aria-hidden="true" /></div>
        <div><div style={S.sbNm}>Idemaq</div><div style={S.sbSub}>Gestão</div></div>
      </div>

      <div style={S.navSec}>Principal</div>
      <div style={S.navWrap}>
        {MENUS.filter(m => m.section === 'principal').map(m => (
          <button key={m.id} onClick={() => setPagina(m.id)} style={S.ni(pagina === m.id)}>
            <i className={`ti ${m.icon}`} style={{ fontSize:15, flexShrink:0, color: pagina === m.id ? C.blue : C.textDim }} aria-hidden="true" />
            <span>{m.label}</span>
            {m.badge && <span style={S.niBadge}>{m.badge}</span>}
          </button>
        ))}
      </div>

      <div style={S.navSec}>Operação</div>
      <div style={S.navWrap}>
        {MENUS.filter(m => m.section === 'operacao').map(m => (
          <button key={m.id} onClick={() => setPagina(m.id)} style={S.ni(pagina === m.id)}>
            <i className={`ti ${m.icon}`} style={{ fontSize:15, flexShrink:0, color: pagina === m.id ? C.blue : C.textDim }} aria-hidden="true" />
            <span>{m.label}</span>
            {m.badge && <span style={S.niBadge}>{m.badge}</span>}
          </button>
        ))}
      </div>

      <div style={{ flex:1 }} />

      <div style={S.sbUser}>
        <div style={S.sbAv}>{initials}</div>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:12, color:C.textSecondary, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email || 'Usuário'}</div>
          <div style={{ fontSize:10, color:C.textMuted }}>Administrador</div>
        </div>
        <button onClick={sair} style={{ background:'transparent', border:'none', color:C.textDim, cursor:'pointer', padding:4, borderRadius:5, flexShrink:0 }} aria-label="Sair">
          <i className="ti ti-logout" style={{ fontSize:14 }} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// ─── Topbar ────────────────────────────────────────────────────────────────
function Topbar({ pagina, user }) {
  const label = MENUS.find(m => m.id === pagina)?.label || 'Painel'
  const hoje  = new Date().toLocaleDateString('pt-BR', { weekday:'short', day:'2-digit', month:'short', year:'numeric' })
  return (
    <div style={S.topbar}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:14, fontWeight:600, color:C.textPrimary }}>{label}</span>
        <span style={S.tbDate}>{hoje}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={S.tbBtn} aria-label="Notificações">
          <i className="ti ti-bell" style={{ fontSize:15, color:C.textMuted }} aria-hidden="true" />
          <div style={{ position:'absolute', top:6, right:6, width:6, height:6, borderRadius:'50%', background:C.red, border:`1.5px solid ${C.card}` }} />
        </div>
        <div style={{ ...S.tbBtn, background:'#1a3a5c' }} aria-label="Configurações">
          <i className="ti ti-settings" style={{ fontSize:15, color:C.blue }} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

// ─── Painel ────────────────────────────────────────────────────────────────
function Painel() {

  // ── Metas
  const metas = [
    { label:'Faturamento — meta R$ 20.000', valor:'R$ 14.260', pct:71, cor:C.blue, sub:'R$ 14.260 atingido · faltam R$ 5.740' },
    { label:'Meta diária — Seg a Sab · 11 dias restantes', valor:'R$ 491/dia', pct:58, cor:C.yellow, sub:'R$ 491/dia necessário · feriados excluídos' },
  ]

  // ── KPIs
  const kpis = [
    { label:'Faturamento mai', valor:'R$ 14.260', cor:C.blue,      bg:'#0d2035', icoBg:'#0d2035', ico:'ti-cash',               trend:'+12% vs abr', trendCor:C.green },
    { label:'Saldo líquido',   valor:'R$ 4.420',  cor:C.blueLight, bg:'#0d2035', icoBg:'#0d2035', ico:'ti-trending-up',         trend:'+8% vs abr',  trendCor:C.green },
    { label:'A pagar hoje',    valor:'R$ 2.090',  cor:C.red,       bg:'#1e0f0f', icoBg:'#1e0f0f', ico:'ti-receipt',             trend:'2 vencimentos', trendCor:C.red },
    { label:'Máq. na oficina', valor:'18',         cor:C.yellow,    bg:'#2a2000', icoBg:'#2a2000', ico:'ti-building-warehouse',  trend:'14 em OS · 4 à venda', trendCor:C.textMuted },
  ]

  // ── Gráfico anual
  const chartAnualData = {
    labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    datasets: [
      { label:'Recebido', data:[18000,12000,15000,9000,14260,0,0,0,0,0,0,0], backgroundColor:C.blue,   borderRadius:3, stack:'s' },
      { label:'Pago',     data:[-12000,-9000,-11000,-7000,-9840,0,0,0,0,0,0,0], backgroundColor:C.red, borderRadius:3, stack:'s' },
      { type:'line', label:'Saldo', data:[6000,9000,13000,15000,19420,null,null,null,null,null,null,null], borderColor:C.blueLight, borderWidth:1.5, pointBackgroundColor:C.blueLight, pointRadius:3, tension:0.4, fill:false, stack:undefined },
    ]
  }

  const chartMesData = {
    labels: ['10/mai','11/mai','12/mai','13/mai','14/mai'],
    datasets: [
      { label:'Recebido', data:[48000,14000,16000,32000,0],       backgroundColor:C.blue, borderRadius:3, stack:'s' },
      { label:'Pago',     data:[-28000,-8000,-10000,-18000,0],    backgroundColor:C.red,  borderRadius:3, stack:'s' },
      { type:'line', label:'Saldo', data:[68000,64000,70000,72000,68000], borderColor:C.blueLight, borderWidth:1.5, pointBackgroundColor:C.blueLight, pointRadius:3, tension:0.4, fill:false, stack:undefined },
    ]
  }

  const chartOpts = (stacked=true) => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{display:false}, tooltip:{ backgroundColor:C.card, titleColor:C.textPrimary, bodyColor:C.textSecondary, borderColor:C.border, borderWidth:1, padding:8, titleFont:{size:11}, bodyFont:{size:10} } },
    scales:{
      x:{ stacked, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:C.textDim,font:{size:9}}, border:{color:'transparent'} },
      y:{ stacked, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:C.textDim,font:{size:9},callback:v=>(v<0?'-R$'+Math.abs(Math.round(v/1000))+'k':'R$'+Math.round(v/1000)+'k')}, border:{color:'transparent'} }
    }
  })

  // ── OS
  const osItems = [
    { label:'Ag. agenda', n:2, bg:'#0f1e2e', border:C.border,         cor:'#64748b' },
    { label:'Agendado',   n:3, bg:'#0f1e2e', border:C.border,         cor:'#64748b' },
    { label:'Diagnóstico',n:2, bg:'#2a2000', border:C.yellow+'22',    cor:C.yellow },
    { label:'Orçamento',  n:2, bg:'#1e0f0f', border:C.red+'22',       cor:C.red },
    { label:'Limpeza',    n:1, bg:'#0f1e2e', border:C.border,         cor:'#64748b' },
    { label:'Manutenção', n:1, bg:'#0f1e2e', border:C.border,         cor:'#64748b' },
    { label:'Finalizado', n:1, bg:'#0a1e10', border:C.green+'22',     cor:C.green },
    { label:'Entregas',   n:2, bg:'#0d2035', border:C.blue+'22',      cor:C.blue },
  ]

  // ── Agendamentos
  function calCor(tipo) {
    if (tipo==='urgente') return C.red
    if (tipo==='hoje')    return C.yellow
    return C.green
  }
  function calBg(tipo) {
    if (tipo==='urgente') return '#1e0f0f'
    if (tipo==='hoje')    return '#2a2000'
    return '#0a1e10'
  }
  const agendamentos = [
    { hr:'08:30', dt:'hoje',   tipo:'urgente', nm:'Ana Reis · Lavadora LG',           svc:'Diagnóstico', tempo:'1h 20min' },
    { hr:'10:00', dt:'hoje',   tipo:'hoje',    nm:'João Costa · Geladeira Consul',     svc:'Manutenção',  tempo:'2h 50min' },
    { hr:'14:00', dt:'hoje',   tipo:'hoje',    nm:'Maria Silva · Fogão Brastemp',      svc:'Limpeza',     tempo:'6h 50min' },
    { hr:'09:00', dt:'amanhã', tipo:'proximo', nm:'Carlos Lima · Micro-ondas Electrolux', svc:'Orçamento', tempo:'amanhã' },
    { hr:'11:30', dt:'amanhã', tipo:'proximo', nm:'Paula Mendes · Ar cond. Midea',     svc:'Instalação',  tempo:'amanhã' },
  ]

  // ── Alertas
  const alertaReceber = [
    { msg:'OS #1031 · João Costa',  sub:'Venceu há 3 dias · R$ 320,00', tipo:'vencido' },
    { msg:'OS #1028 · Ana Reis',    sub:'Venceu há 5 dias · R$ 215,00', tipo:'vencido' },
    { msg:'OS #1036 · Maria Silva', sub:'Vence hoje · R$ 480,00',        tipo:'hoje' },
  ]
  const alertaPagar = [
    { msg:'Fornecedor Peças ABC',  sub:'Venceu ontem · R$ 890,00',        tipo:'vencido' },
    { msg:'Aluguel',               sub:'Vence amanhã · R$ 1.200,00',      tipo:'amanha' },
    { msg:'Energia elétrica',      sub:'Vence em 2 dias · R$ 380,00',     tipo:'2dias' },
  ]
  const alertaEtapas = [
    { msg:'OS #1037 · João Costa',  sub:'Diagnóstico há 31h', horas:'31h', critico:true },
    { msg:'OS #1034 · Paula Mendes',sub:'Orçamento há 26h',   horas:'26h', critico:true },
    { msg:'OS #1041 · Carlos Lima', sub:'Pré-diag. há 22h',   horas:'22h', critico:false },
  ]
  const alertaPrazo = [
    { msg:'OS #1036 · Ana Reis · Lavadora LG',     sub:'Prazo era 11/mai · 2 dias atrasado', tipo:'atrasada' },
    { msg:'OS #1033 · Pedro Alves · Secadora',     sub:'Prazo era 12/mai · 1 dia atrasado',  tipo:'atrasada' },
    { msg:'OS #1039 · Carlos Lima · Micro-ondas',  sub:'Prazo hoje às 18h · faltam 5h',      tipo:'hoje' },
  ]
  const alertaEstoque = [
    { msg:'Rolamento do cesto',  sub:'0 unid. · 14 saídas/mês',  tipo:'esgotado' },
    { msg:'Resistência 220V',    sub:'1 unid. · 11 saídas/mês',  tipo:'critico' },
    { msg:'Dreno sanfonado',     sub:'3 unid. · 9 saídas/mês',   tipo:'baixo' },
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
      <div style={{ display:'flex', alignItems:'flex-start', gap:6, padding:'5px 0', borderBottom:`1px solid #131f2e` }}>
        <div style={{ width:5, height:5, borderRadius:'50%', flexShrink:0, marginTop:5, background:dot }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:11, color:C.textSecondary, lineHeight:1.3, fontWeight:500 }}>{msg}</div>
          <div style={{ fontSize:9, color:C.textDim, marginTop:1 }}>{sub}</div>
        </div>
        {badge}
      </div>
    )
  }

  function AlCard({ icon, title, count, countRed, children, footer }) {
    return (
      <div style={{ background:'#0d1825', borderRadius:9, padding:'11px 12px', border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:10, fontWeight:600, color:C.textMuted, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
            <i className={`ti ${icon}`} style={{ fontSize:13 }} aria-hidden="true" />
            {title}
          </div>
          <CountBadge n={count} red={countRed} />
        </div>
        <div style={{ borderBottom:'none' }}>
          {children}
        </div>
        {footer && <div style={{ marginTop:6, paddingTop:6, borderTop:`1px solid ${C.border}`, fontSize:10, color:C.textDim, display:'flex', gap:10, flexWrap:'wrap' }}>{footer}</div>}
      </div>
    )
  }

  return (
    <div style={S.content}>

      {/* Linha 1 — Metas */}
      <div style={S.card}>
        <SecTitle icon="ti-target">Metas de maio</SecTitle>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {metas.map((m,i) => (
            <div key={i}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
                <span style={{ fontSize:10, color:C.textSecondary }}>{m.label}</span>
                <span style={{ fontSize:12, fontWeight:600, color:m.cor }}>{m.pct}%</span>
              </div>
              <div style={{ background:C.bg, borderRadius:3, height:4, overflow:'hidden' }}>
                <div style={{ width:`${m.pct}%`, height:'100%', borderRadius:3, background:m.cor }} />
              </div>
              <div style={{ fontSize:9, color:C.textDim, marginTop:4 }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Linha 2 — KPIs */}
      <div style={S.row('repeat(4,minmax(0,1fr))')}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:C.card, borderRadius:10, border:`1px solid ${C.border}`, overflow:'hidden' }}>
            <div style={{ height:3, background:k.cor }} />
            <div style={{ padding:'12px 14px' }}>
              <div style={{ width:28, height:28, borderRadius:7, background:k.icoBg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <i className={`ti ${k.ico}`} style={{ fontSize:13, color:k.cor }} aria-hidden="true" />
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:k.cor, marginBottom:2, letterSpacing:'-.5px' }}>{k.valor}</div>
              <div style={{ fontSize:10, color:C.textMuted, marginBottom:5 }}>{k.label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:k.trendCor }}>
                <i className="ti ti-minus" style={{ fontSize:10 }} aria-hidden="true" />
                <span>{k.trend}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Linha 3 — Gráficos */}
      <div style={S.row('repeat(2,minmax(0,1fr))')}>
        {[
          { title:'Fluxo de caixa anual', total:'R$ 68.260', sub:'recebido em 2025 até mai', data:chartAnualData },
          { title:'Fluxo de caixa — maio', total:'R$ 19.420', sub:'saldo acumulado em maio', data:chartMesData },
        ].map((g,i) => (
          <div key={i} style={S.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div>
                <div style={{ ...S.secT, marginBottom:2 }}>
                  <div style={S.secTL}>
                    <i className="ti ti-arrows-exchange" style={{ fontSize:13 }} aria-hidden="true" />
                    {g.title}
                  </div>
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:C.blue, letterSpacing:'-.5px' }}>{g.total}</div>
                <div style={{ fontSize:9, color:C.textDim, marginTop:1 }}>{g.sub}</div>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                {[{c:C.blue,l:'Rec.'},{c:C.red,l:'Pago'},{c:C.blueLight,l:'Saldo',line:true}].map((leg,j) => (
                  <span key={j} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:C.textDim }}>
                    {leg.line
                      ? <span style={{ width:10, height:2, background:leg.c, display:'inline-block' }} />
                      : <span style={{ width:7, height:7, borderRadius:1, background:leg.c, display:'inline-block' }} />}
                    {leg.l}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ position:'relative', width:'100%', height:140 }}>
              <Bar data={g.data} options={chartOpts()} />
            </div>
          </div>
        ))}
      </div>

      {/* Linha 4 — OS + Agendamentos */}
      <div style={S.row('repeat(2,minmax(0,1fr))')}>
        <div style={S.card}>
          <SecTitle icon="ti-clipboard-list" right={<CountBadge n="14 total" />}>Situação das OS</SecTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:5 }}>
            {osItems.map((os,i) => (
              <div key={i} style={{ borderRadius:7, padding:'8px 6px', textAlign:'center', border:`1px solid ${os.border}`, background:os.bg }}>
                <div style={{ fontSize:15, fontWeight:700, color:os.cor }}>{os.n}</div>
                <div style={{ fontSize:9, marginTop:2, lineHeight:1.3, color:os.cor, opacity:.85 }}>{os.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <SecTitle icon="ti-calendar-event" right={<CountBadge n="5 hoje e amanhã" />}>Próximos agendamentos</SecTitle>
          {agendamentos.map((a,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom: i<agendamentos.length-1 ? `1px solid #1a2535` : 'none' }}>
              <div style={{ textAlign:'right', minWidth:44 }}>
                <div style={{ fontSize:11, fontWeight:600, color:C.textPrimary }}>{a.hr}</div>
                <div style={{ fontSize:9, color:C.textMuted }}>{a.dt}</div>
              </div>
              <div style={{ width:3, height:32, borderRadius:2, flexShrink:0, background:calCor(a.tipo) }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color:C.textSecondary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:500 }}>{a.nm}</div>
                <div style={{ fontSize:9, color:C.textMuted, marginTop:1 }}>{a.svc}</div>
              </div>
              <Badge color={calCor(a.tipo)} bg={calBg(a.tipo)} border={calCor(a.tipo)+'33'}>{a.tempo}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Linha 5 — Alertas 3x2 */}
      <div style={S.card}>
        <SecTitle icon="ti-alert-triangle" right={<CountBadge n="9 ativos" red />}>Alertas da operação</SecTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8 }}>

          <AlCard icon="ti-arrow-down-circle" title="A receber" count={3} countRed
            footer={<><span>Vencido: <strong style={{color:C.red}}>R$ 535</strong></span><span>Próx. 2d: <strong style={{color:C.yellow}}>R$ 1.080</strong></span></>}>
            {alertaReceber.map((a,i) => {
              const dotCor = a.tipo==='vencido' ? C.red : a.tipo==='hoje' ? C.yellow : C.green
              return <AlRow key={i} msg={a.msg} sub={a.sub} dot={dotCor} badge={<StatusBadge tipo={a.tipo} />} />
            })}
          </AlCard>

          <AlCard icon="ti-arrow-up-circle" title="A pagar" count={3} countRed
            footer={<><span>Vencido: <strong style={{color:C.red}}>R$ 890</strong></span><span>Próx. 2d: <strong style={{color:C.yellow}}>R$ 2.090</strong></span></>}>
            {alertaPagar.map((a,i) => {
              const dotCor = a.tipo==='vencido' ? C.red : a.tipo==='amanha' ? C.yellow : C.green
              return <AlRow key={i} msg={a.msg} sub={a.sub} dot={dotCor} badge={<StatusBadge tipo={a.tipo} />} />
            })}
          </AlCard>

          <AlCard icon="ti-clock-exclamation" title="Etapas +24h" count={3} countRed>
            {alertaEtapas.map((a,i) => (
              <AlRow key={i} msg={a.msg} sub={a.sub}
                dot={a.critico ? C.red : C.yellow}
                badge={<Badge color={a.critico?C.red:C.yellow} bg={a.critico?'#1e0f0f':'#2a2000'} border={(a.critico?C.red:C.yellow)+'33'}>{a.horas}</Badge>} />
            ))}
          </AlCard>

          <AlCard icon="ti-calendar-x" title="Prazo de conclusão" count={3} countRed>
            {alertaPrazo.map((a,i) => {
              const dotCor = a.tipo==='atrasada' ? C.red : C.yellow
              return <AlRow key={i} msg={a.msg} sub={a.sub} dot={dotCor} badge={<StatusBadge tipo={a.tipo} />} />
            })}
          </AlCard>

          <AlCard icon="ti-package" title="Estoque crítico" count={3} countRed>
            {alertaEstoque.map((a,i) => {
              const dotCor = a.tipo==='esgotado'||a.tipo==='critico' ? C.red : C.yellow
              return <AlRow key={i} msg={a.msg} sub={a.sub} dot={dotCor} badge={<StatusBadge tipo={a.tipo} />} />
            })}
          </AlCard>

          <AlCard icon="ti-packages" title="Top 5 peças" count="saídas/mês">
            {top5.map((p,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 0', borderBottom: i<top5.length-1 ? `1px solid #131f2e` : 'none' }}>
                <span style={{ fontSize:9, color:C.textDim, minWidth:14, fontWeight:600 }}>#{i+1}</span>
                <span style={{ fontSize:10, color:C.textMuted, flex:1, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.nm}</span>
                <div style={{ width:44, background:C.bg, borderRadius:2, height:3, overflow:'hidden', flexShrink:0 }}>
                  <div style={{ width:`${p.pct}%`, height:'100%', borderRadius:2, background: p.qtd<=1 ? C.blue : C.blueLight }} />
                </div>
                <span style={{ fontSize:10, minWidth:30, textAlign:'right', flexShrink:0, fontWeight:600, color:p.qtdCor }}>{p.qtd} un</span>
              </div>
            ))}
          </AlCard>

        </div>
      </div>

    </div>
  )
}

// ─── Em construção ─────────────────────────────────────────────────────────
function EmConstrucao({ nome }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', color:C.textMuted }}>
      <div style={{ width:56, height:56, borderRadius:14, background:C.card, border:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        <i className="ti ti-hammer" style={{ fontSize:28, color:C.textDim }} aria-hidden="true" />
      </div>
      <h2 style={{ fontSize:18, marginBottom:8, color:C.textPrimary, fontWeight:600 }}>{nome}</h2>
      <p style={{ fontSize:13 }}>Em construção</p>
    </div>
  )
}

// ─── Layout ────────────────────────────────────────────────────────────────
function Layout({ user, sair, children, pagina, setPagina }) {
  return (
    <div style={S.app}>
      <Sidebar pagina={pagina} setPagina={setPagina} user={user} sair={sair} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>
        <Topbar pagina={pagina} user={user} />
        {children}
      </div>
    </div>
  )
}

// ─── App principal ─────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]     = useState(null)
  const [pagina, setPagina] = useState('painel')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  async function sair() { await supabase.auth.signOut() }

  if (!user) return <Login />

  const conteudo = {
    painel:     <Painel />,
    os:         <EmConstrucao nome="Ordens de Serviço" />,
    clientes:   <EmConstrucao nome="Clientes" />,
    logistica:  <EmConstrucao nome="Logística" />,
    estoque:    <EmConstrucao nome="Estoque" />,
    financeiro: <EmConstrucao nome="Financeiro" />,
    relatorios: <EmConstrucao nome="Relatórios" />,
  }

  return (
    <Layout user={user} sair={sair} pagina={pagina} setPagina={setPagina}>
      {conteudo[pagina] || <Painel />}
    </Layout>
  )
}
