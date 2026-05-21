// idemaq-src/pages/Login.jsx
// Tela de login (Supabase auth). Visual idêntico ao do App.jsx atual.

import React, { useState } from 'react'
import { supabase } from '../supabase'
import { P } from '../theme'
import LogoIdemaq from '../components/ui/LogoIdemaq'

export default function Login({ dark, T }) {
  const [email, setEmail]   = useState('')
  const [senha, setSenha]   = useState('')
  const [erro, setErro]     = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setLoading(true); setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('E-mail ou senha incorretos')
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.bg,
      fontFamily: 'inherit',
      padding: '1rem',
    }}>
      <div className="idemaq-card" style={{
        background: T.card, padding: '2rem',
        borderRadius: 14, width: '100%', maxWidth: 340,
        border: `1px solid ${T.border}`,
        boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          {/* Logo oficial — em light mode, LogoIdemaq tinge o branco "Ide" de azul marinho. */}
          <LogoIdemaq
            dark={dark}
            style={{
              display: 'block',
              height: 60,
              width: 'auto',
              maxWidth: 220,
              margin: '0 auto 10px',
              objectFit: 'contain',
            }}
          />
          <p style={{ color: T.textMuted, fontSize: 14 }}>Sistema de gestão</p>
        </div>
        <form onSubmit={entrar}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: 13, color: T.textSecondary, display: 'block', marginBottom: 5 }}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 13px',
                borderRadius: 9, border: `1px solid ${T.border}`,
                fontSize: 14, boxSizing: 'border-box',
                background: T.bg, color: T.textPrimary, outline: 'none',
              }}
              placeholder="seu@email.com" required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: 13, color: T.textSecondary, display: 'block', marginBottom: 5 }}>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              style={{
                width: '100%', padding: '10px 13px',
                borderRadius: 9, border: `1px solid ${T.border}`,
                fontSize: 14, boxSizing: 'border-box',
                background: T.bg, color: T.textPrimary, outline: 'none',
              }}
              placeholder="••••••••" required />
          </div>
          {erro && <p style={{ color: P.red, fontSize: 13, marginBottom: '1rem', textAlign: 'center' }}>{erro}</p>}
          <button type="submit" disabled={loading}
            style={{
              width: '100%', padding: 11,
              background: `linear-gradient(135deg, ${P.blue}, #3a7bbf)`,
              color: '#fff', border: 'none', borderRadius: 9,
              fontSize: 14, cursor: 'pointer', fontWeight: 600,
            }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
