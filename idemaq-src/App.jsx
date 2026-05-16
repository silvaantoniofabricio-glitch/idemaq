// idemaq-src/App.jsx
// Entry point refatorado.
// Compõe AppLayout + Routes. Usa react-router-dom para navegar entre páginas.
// Tema gerenciado via useTheme() — não precisa passar dark/T pela árvore inteira.

import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase'
import { useTheme, useIsMobile } from './theme'

import AppLayout from './components/layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'

import Login        from './pages/Login'
import Painel       from './pages/Painel'
import Kanban       from './pages/Kanban'
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
          {isMobile
            ? <RoutesMobile T={T} dark={dark} user={user} />
            : <RoutesDesktop T={T} dark={dark} user={user} />}
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
      <Route path="/clientes"    element={<EmConstrucao nome="Clientes"    T={T} />} />
      <Route path="/logistica"   element={<EmConstrucao nome="Logística"   T={T} />} />
      <Route path="/estoque"     element={<EmConstrucao nome="Estoque"     T={T} />} />
      <Route path="/financeiro"  element={<EmConstrucao nome="Financeiro"  T={T} />} />
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
