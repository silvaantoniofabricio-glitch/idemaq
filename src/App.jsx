import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const MENUS = [
  { id: 'painel', label: 'Painel', icon: '⊞' },
  { id: 'os', label: 'OS', icon: '📋' },
  { id: 'clientes', label: 'Clientes', icon: '👤' },
  { id: 'logistica', label: 'Logística', icon: '🚚' },
  { id: 'estoque', label: 'Estoque', icon: '📦' },
  { id: 'financeiro', label: 'Financeiro', icon: '💰' },
  { id: 'relatorios', label: 'Relatórios', icon: '📊' },
]

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos')
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f4f8', fontFamily:'sans-serif' }}>
      <div style={{ background:'#fff', padding:'2rem', borderRadius:'12px', width:'320px', border:'1px solid #e0e0e0', boxShadow:'0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'32px', marginBottom:'8px' }}>🔧</div>
          <h2 style={{ color:'#1a1a1a', marginBottom:'4px', fontSize:'20px' }}>Idemaq</h2>
          <p style={{ color:'#888', fontSize:'13px' }}>Sistema de gestão</p>
        </div>
        <form onSubmit={entrar}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:'13px', color:'#666', display:'block', marginBottom:'4px' }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box' }}
              placeholder="seu@email.com" required />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ fontSize:'13px', color:'#666', display:'block', marginBottom:'4px' }}>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box' }}
              placeholder="••••••••" required />
          </div>
          {erro && <p style={{ color:'#e53e3e', fontSize:'13px', marginBottom:'1rem', textAlign:'center' }}>{erro}</p>}
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'10px', background:'#5B9BD5', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', cursor:'pointer', fontWeight:'500' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Layout({ user, sair, children, pagina, setPagina }) {
  const [menuAberto, setMenuAberto] = useState(true)

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:'sans-serif', background:'#f0f4f8' }}>
      <div style={{ width: menuAberto ? '200px' : '52px', background:'#1e293b', transition:'width 0.2s', flexShrink:0, display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 12px', borderBottom:'1px solid #334155', display:'flex', alignItems:'center', justifyContent: menuAberto ? 'space-between' : 'center' }}>
          {menuAberto && <span style={{ color:'#fff', fontWeight:'600', fontSize:'15px' }}>Idemaq</span>}
          <button onClick={() => setMenuAberto(!menuAberto)} style={{ background:'transparent', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'18px', padding:'2px' }}>☰</button>
        </div>
        <nav style={{ flex:1, padding:'8px 0' }}>
          {MENUS.map(m => (
            <button key={m.id} onClick={() => setPagina(m.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', background: pagina === m.id ? '#334155' : 'transparent', border:'none', color: pagina === m.id ? '#fff' : '#94a3b8', cursor:'pointer', fontSize:'13px', textAlign:'left', borderLeft: pagina === m.id ? '3px solid #5B9BD5' : '3px solid transparent' }}>
              <span style={{ fontSize:'16px', flexShrink:0 }}>{m.icon}</span>
              {menuAberto && <span>{m.label}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding:'12px', borderTop:'1px solid #334155' }}>
          <button onClick={sair} style={{ width:'100%', display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', background:'transparent', border:'1px solid #334155', borderRadius:'6px', color:'#94a3b8', cursor:'pointer', fontSize:'12px' }}>
            <span>🚪</span>
            {menuAberto && <span>Sair</span>}
          </button>
        </div>
      </div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'auto' }}>
        <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'0 1.5rem', height:'52px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h1 style={{ fontSize:'16px', fontWeight:'600', color:'#1e293b', margin:0 }}>
            {MENUS.find(m => m.id === pagina)?.label || 'Painel'}
          </h1>
          <span style={{ fontSize:'13px', color:'#64748b' }}>{user.email}</span>
        </div>
        <div style={{ padding:'1.5rem', flex:1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Painel() {
  const cards = [
    { label:'Faturamento mai', valor:'R$ 14.260', cor:'#27500A' },
    { label:'Saldo líquido', valor:'R$ 4.420', cor:'#0C447C' },
    { label:'A receber', valor:'R$ 1.080', cor:'#633806' },
    { label:'OS abertas', valor:'12', cor:'#1e293b' },
  ]

  const alertas = [
    { tipo:'urgente', msg:'Ana Reis · OS #1036 · 2 dias em atraso', tag:'Atrasada' },
    { tipo:'urgente', msg:'João Costa · OS #1037 · 1 dia em atraso', tag:'Atrasada' },
    { tipo:'aviso', msg:'Maria Silva · OS #1033 · vence em 2 dias', tag:'2 dias' },
    { tipo:'info', msg:'Rolamento do cesto · 0 unid. no estoque', tag:'Urgente' },
  ]

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'16px' }}>
        {cards.map((c,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:'10px', padding:'16px', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:'20px', fontWeight:'600', color:c.cor }}>{c.valor}</div>
            <div style={{ fontSize:'12px', color:'#64748b', marginTop:'4px' }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
        <div style={{ background:'#fff', borderRadius:'10px', padding:'16px', border:'1px solid #e2e8f0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
            <span style={{ fontSize:'13px', color:'#64748b' }}>Meta de maio — R$ 20.000</span>
            <span style={{ fontSize:'13px', fontWeight:'600', color:'#5B9BD5' }}>71%</span>
          </div>
          <div style={{ background:'#f1f5f9', borderRadius:'4px', height:'10px', overflow:'hidden' }}>
            <div style={{ width:'71%', height:'100%', background:'#5B9BD5', borderRadius:'4px' }}></div>
          </div>
          <div style={{ fontSize:'12px', color:'#64748b', marginTop:'6px' }}>Faltam R$ 5.740</div>
        </div>
        <div style={{ background:'#fff', borderRadius:'10px', padding:'16px', border:'1px solid #e2e8f0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
            <span style={{ fontSize:'13px', color:'#64748b' }}>Meta diária — 10 dias úteis</span>
            <span style={{ fontSize:'13px', fontWeight:'600', color:'#EF9F27' }}>R$ 574/dia</span>
          </div>
          <div style={{ background:'#f1f5f9', borderRadius:'4px', height:'10px', overflow:'hidden' }}>
            <div style={{ width:'71%', height:'100%', background:'#EF9F27', borderRadius:'4px' }}></div>
          </div>
          <div style={{ fontSize:'12px', color:'#64748b', marginTop:'6px' }}>Seg–Sex · feriados excluídos</div>
        </div>
      </div>
      <div style={{ background:'#fff', borderRadius:'10px', padding:'16px', border:'1px solid #e2e8f0', marginBottom:'16px' }}>
        <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#1e293b', marginBottom:'12px' }}>⚠️ Alertas</h3>
        {alertas.map((a,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom: i < alertas.length-1 ? '1px solid #f1f5f9' : 'none' }}>
            <span style={{ fontSize:'13px', color:'#1e293b' }}>{a.msg}</span>
            <span style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'20px', background: a.tipo==='urgente' ? '#FCEBEB' : a.tipo==='aviso' ? '#FAEEDA' : '#E6F1FB', color: a.tipo==='urgente' ? '#791F1F' : a.tipo==='aviso' ? '#633806' : '#0C447C', whiteSpace:'nowrap', marginLeft:'8px' }}>{a.tag}</span>
          </div>
        ))}
      </div>
      <div style={{ background:'#fff', borderRadius:'10px', padding:'16px', border:'1px solid #e2e8f0' }}>
        <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#1e293b', marginBottom:'12px' }}>📋 Situação das OS</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
          {[['Ag. agendamento','2','#f1f5f9','#64748b'],['Agendado','3','#f1f5f9','#64748b'],['Diagnóstico','2','#FAEEDA','#633806'],['Orçamento','2','#FCEBEB','#791F1F'],['Limpeza','1','#f1f5f9','#64748b'],['Manutenção','1','#f1f5f9','#64748b'],['Finalizado','1','#f1f5f9','#64748b'],['Entregas','2','#E6F1FB','#0C447C']].map(([label,num,bg,cor],i) => (
            <div key={i} style={{ background:bg, borderRadius:'8px', padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:'18px', fontWeight:'600', color:cor }}>{num}</div>
              <div style={{ fontSize:'11px', color:cor, opacity:0.8, marginTop:'2px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmConstrucao({ nome }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'60vh', color:'#64748b' }}>
      <div style={{ fontSize:'48px', marginBottom:'16px' }}>🔨</div>
      <h2 style={{ fontSize:'18px', marginBottom:'8px', color:'#1e293b' }}>{nome}</h2>
      <p style={{ fontSize:'14px' }}>Em construção</p>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [pagina, setPagina] = useState('painel')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function sair() {
    await supabase.auth.signOut()
  }

  if (!user) return <Login />

  const conteudo = {
    painel: <Painel />,
    os: <EmConstrucao nome="Ordens de Serviço" />,
    clientes: <EmConstrucao nome="Clientes" />,
    logistica: <EmConstrucao nome="Logística" />,
    estoque: <EmConstrucao nome="Estoque" />,
    financeiro: <EmConstrucao nome="Financeiro" />,
    relatorios: <EmConstrucao nome="Relatórios" />,
  }

  return (
    <Layout user={user} sair={sair} pagina={pagina} setPagina={setPagina}>
      {conteudo[pagina] || <Painel />}
    </Layout>
  )
}
