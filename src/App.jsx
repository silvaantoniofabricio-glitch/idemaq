import { useState } from 'react'
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
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f5f5f5', fontFamily:'sans-serif' }}>
      <div style={{ background:'#fff', padding:'2rem', borderRadius:'12px', width:'320px', border:'1px solid #e0e0e0' }}>
        <h2 style={{ textAlign:'center', marginBottom:'1.5rem', color:'#1a1a1a' }}>Idemaq</h2>
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

function Dashboard({ user, sair }) {
  return (
    <div style={{ padding:'2rem', fontFamily:'sans-serif' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
        <h1 style={{ color:'#1a1a1a' }}>Idemaq</h1>
        <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
          <span style={{ fontSize:'14px', color:'#666' }}>{user.email}</span>
          <button onClick={sair} style={{ padding:'6px 14px', background:'transparent', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer', fontSize:'13px' }}>Sair</button>
        </div>
      </div>
      <p style={{ color:'#666' }}>Sistema em construção — banco de dados conectado.</p>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)

  supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null)
  })

  async function sair() {
    await supabase.auth.signOut()
  }

  if (!user) return <Login />
  return <Dashboard user={user} sair={sair} />
}