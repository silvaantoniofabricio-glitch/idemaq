import { useState, useEffect } from 'react'
import { supabase } from './supabase'

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
          <h2 style={{ color:'#1a1a1a', marginBottom:'4px' }}>Idemaq</h2>
          <p style={{ color:'#888', fontSize:'13px' }}>Sistema de gestão</p>
        </div>
        <form onSubmit={entrar}>
          <div style={{ marginBottom:'1rem' }}>
            <label style={{ fontSize:'13px', color:'#666', display:'block', marginBottom:'4px' }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box' }}
              placeholder="seu@email.com" required />
          </div>
          <div style={{ marginBottom:'1.5rem' }}>
            <label style={{ fontSize:'13px', color:'#666', display:'block', marginBottom:'4px' }}>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              style={{ width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid #ddd', fontSize:'14px', boxSizing:'border-box' }}
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

function Painel({ user, sair }) {
  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f8', fontFamily:'sans-serif' }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #e0e0e0', padding:'0 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:'52px' }}>
        <span style={{ fontWeight:'600', color:'#1a1a1a', fontSize:'16px' }}>Idemaq</span>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <span style={{ fontSize:'13px', color:'#666' }}>{user.email}</span>
          <button onClick={sair} style={{ padding:'5px 12px', background:'transparent', border:'1px solid #ddd', borderRadius:'6px', cursor:'pointer', fontSize:'12px', color:'#666' }}>Sair</button>
        </div>
      </div>
      <div style={{ padding:'1.5rem' }}>
        <h3 style={{ color:'#1a1a1a', marginBottom:'1rem' }}>Painel principal</h3>
        <p style={{ color:'#666', fontSize:'14px' }}>Em construção — banco de dados conectado</p>
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)

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
  return <Painel user={user} sair={sair} />
}
