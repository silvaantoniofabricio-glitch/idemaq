// idemaq-src/App.jsx
// Entry point refatorado.
// Compõe AppLayout + Routes. Usa react-router-dom para navegar entre páginas.
// Tema gerenciado via useTheme() — não precisa passar dark/T pela árvore inteira.

import React, { useState, useEffect, Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { erro: null } }
  static getDerivedStateFromError(err) { return { erro: err } }
  render() {
    if (this.state.erro) {
      const T = this.props.T || {}
      return (
        <div style={{ padding: '2rem', color: T.textPrimary || '#f1f5f9', background: T.bg || '#161618', minHeight: '100vh', fontFamily: 'system-ui' }}>
          <h2 style={{ marginBottom: '1rem' }}>Erro ao carregar</h2>
          <pre style={{ background: T.card || '#222', padding: '1rem', borderRadius: 8, overflow: 'auto', fontSize: 12, color: '#ff6b6b' }}>
            {this.state.erro?.message}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
import { supabase } from './supabase'
import { useTheme, useIsMobile } from './theme'

import AppLayout from './components/layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'

import Login        from './pages/Login'
import Painel       from './pages/Painel'
import Kanban       from './pages/Kanban'
import Clientes     from './pages/Clientes'
import Logistica    from './pages/Logistica'
import Estoque      from './pages/Estoque'
import Financeiro   from './pages/Financeiro'
import EmConstrucao from './pages/EmConstrucao'

// Mobile (legacy — futuro: pages/mobile/Painel.jsx, OSMobile.jsx refatoradas)
import PainelMobile from './pages/mobile/PainelMobile'
import OSMobile, { PullToRefresh } from './pages/mobile/OSMobile'

export default function App() {
  const { T, dark, toggleTheme, isMobile } = useTheme()
  const [user, setUser] = useState(null)

  // Classe no <html> para o global.css aplicar sombra no light
  useEffect(() => {
    const html = document.documentElement
    if (dark) html.classList.remove('idemaq-theme-claro')
    else html.classList.add('idemaq-theme-claro')
  }, [dark])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  async function sair() { await supabase.auth.signOut() }

  if (!user) return <Login dark={dark} T={T} />

  return (
    <ToastProvider T={T} dark={dark}>
      <BrowserRouter>
        <AppLayout T={T} dark={dark} toggleTheme={toggleTheme} user={user} sair={sair} isMobile={isMobile}>
          <ErrorBoundary T={T}>
            {isMobile
              ? <RoutesMobile T={T} dark={dark} user={user} />
              : <RoutesDesktop T={T} dark={dark} user={user} />}
          </ErrorBoundary>
        </AppLayout>
      </BrowserRouter>
    </ToastProvider>
  )
}

function RoutesDesktop({ T, dark, user }) {
  return (
    <Routes>
      <Route path="/"            element={<Painel T={T} dark={dark} />} />
      <Route path="/os"          element={<Kanban T={T} dark={dark} user={user} />} />
      <Route path="/clientes"    element={<Clientes T={T} dark={dark} />} />
      <Route path="/logistica"   element={<Logistica T={T} dark={dark} />} />
      <Route path="/estoque"     element={<Estoque T={T} dark={dark} />} />
      <Route path="/financeiro"  element={<Financeiro T={T} dark={dark} />} />
      <Route path="/relatorios"  element={<EmConstrucao nome="Relatórios"  T={T} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RoutesMobile({ T, dark, user }) {
  // Mobile usa PullToRefresh embrulhando o conteúdo
  return (
    <PullToRefresh T={T} dark={dark} onRefresh={() => Promise.resolve()}>
      <Routes>
        <Route path="/"            element={<PainelMobile T={T} dark={dark} />} />
        <Route path="/os"          element={<OSMobile T={T} dark={dark} user={user} />} />
        <Route path="/estoque"     element={<EmConstrucao nome="Estoque"    T={T} />} />
        <Route path="/financeiro"  element={<EmConstrucao nome="Financeiro" T={T} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PullToRefresh>
  )
}
