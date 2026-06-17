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
import { isAdmin, getRole } from './utils/osHelpers'

import AppLayout from './components/layout/AppLayout'
import { ToastProvider } from './components/ui/Toast'
import { useAutoReload } from './hooks/useAutoReload'
import AtualizacaoBanner from './components/ui/AtualizacaoBanner'
import { RefreshProvider } from './contexts/RefreshContext'

import Login        from './pages/Login'
import Painel       from './pages/Painel'
import Kanban       from './pages/Kanban'
import Clientes     from './pages/Clientes'
import Logistica    from './pages/Logistica'
import Estoque      from './pages/Estoque'
import Financeiro    from './pages/Financeiro'
import Relatorios    from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import Vendas        from './pages/Vendas'
import ControleFinanceiroPF from './pages/ControleFinanceiroPF'
import MeuRelatorio  from './pages/MeuRelatorio'
import PainelFuncionario from './components/paineis/PainelFuncionario'
import EmConstrucao from './pages/EmConstrucao'

// Mobile (legacy — futuro: pages/mobile/Painel.jsx, OSMobile.jsx refatoradas)
import PainelMobile from './pages/mobile/PainelMobile'
import OSMobile from './pages/mobile/OSMobile'
import EstoqueMobile from './pages/mobile/EstoqueMobile'
import FinanceiroMobile from './pages/mobile/FinanceiroMobile'
import VendasMobile from './pages/mobile/VendasMobile'

export default function App() {
  const { T, dark, toggleTheme, daltonismo, toggleDaltonismo, isMobile } = useTheme()
  const [authUser, setAuthUser] = useState(null)
  // Auto-reload temporariamente desligado (suspeita de causar problema
  // no celular do user). hasUpdate fica false eternamente.
  const hasUpdate = false
  const reload = () => window.location.reload()
  // Registro do auth user na tabela `usuarios` (papel, apelido, uuid).
  // Antes o papel era inferido por email hardcoded — quando o Toni trocou os
  // emails dos funcionários no Auth, eles caíam no fallback "dono" e ganhavam
  // acesso total. Agora lemos `usuarios` por email e enriquecemos o user com
  // o papel real. Ausência = sem permissão (defensivo).
  const [usuarioRow, setUsuarioRow] = useState(null)

  // Classe no <html> para o global.css aplicar sombra no light
  useEffect(() => {
    const html = document.documentElement
    if (dark) html.classList.remove('idemaq-theme-claro')
    else html.classList.add('idemaq-theme-claro')
  }, [dark])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAuthUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setAuthUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  // Busca o registro na tabela `usuarios` correspondente ao email autenticado.
  // Case-insensitive (ilike) — emails do Auth costumam vir lowercase mas a
  // tabela pode ter qualquer capitalização.
  useEffect(() => {
    if (!authUser?.email) { setUsuarioRow(null); return }
    let cancelado = false
    supabase
      .from('usuarios')
      .select('id, apelido, papel, email')
      .ilike('email', authUser.email)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) console.warn('[app] erro buscando usuário:', error.message)
        setUsuarioRow(data || null)
      })
    return () => { cancelado = true }
  }, [authUser?.email])

  // User enriquecido propagado pra árvore: adiciona papel/apelido/usuarioId.
  // getRole/isAdmin usam user.papel; o resto do app continua recebendo o mesmo
  // shape do auth (id, email, etc).
  const user = authUser
    ? {
        ...authUser,
        papel: usuarioRow?.papel || null,
        apelido: usuarioRow?.apelido || null,
        usuarioId: usuarioRow?.id || null,
      }
    : null

  async function sair() { await supabase.auth.signOut() }

  if (!authUser) return <Login dark={dark} T={T} />

  return (
    <ToastProvider T={T} dark={dark}>
      {hasUpdate && <AtualizacaoBanner onReload={reload} />}
      <RefreshProvider>
        <BrowserRouter>
          <AppLayout T={T} dark={dark} toggleTheme={toggleTheme}
            daltonismo={daltonismo} toggleDaltonismo={toggleDaltonismo}
            user={user} sair={sair} isMobile={isMobile}>
            <ErrorBoundary T={T}>
              {isMobile
                ? <RoutesMobile T={T} dark={dark} user={user} />
                : <RoutesDesktop T={T} dark={dark} user={user} />}
            </ErrorBoundary>
          </AppLayout>
        </BrowserRouter>
      </RefreshProvider>
    </ToastProvider>
  )
}

// Painel renderizado conforme papel do usuário logado:
//   - Dono (Toni)         → Painel executivo com financeiro
//   - Func (Alessandro/Guilherme) → PainelFuncionario sem financeiro + card de ponto
function PainelPorPerfil({ T, dark, user, isMobile }) {
  if (isAdmin(user)) {
    return isMobile
      ? <PainelMobile T={T} dark={dark} user={user} />
      : <Painel T={T} dark={dark} />
  }
  return <PainelFuncionario T={T} dark={dark} user={user} />
}

// Bloqueia o acesso direto via URL às páginas adminOnly — redireciona pro Painel.
// A Sidebar/BottomNav já escondem o link, mas digitar a URL na mão burlava.
function AdminOnly({ user, children }) {
  if (!isAdmin(user)) return <Navigate to="/" replace />
  return children
}

function RoutesDesktop({ T, dark, user }) {
  return (
    <Routes>
      <Route path="/"            element={<PainelPorPerfil T={T} dark={dark} user={user} />} />
      <Route path="/os"          element={<Kanban T={T} dark={dark} user={user} />} />
      <Route path="/clientes"    element={<Clientes T={T} dark={dark} />} />
      <Route path="/logistica"   element={<Logistica T={T} dark={dark} />} />
      <Route path="/estoque"     element={<Estoque T={T} dark={dark} user={user} />} />
      <Route path="/financeiro"    element={<AdminOnly user={user}><Financeiro T={T} dark={dark} /></AdminOnly>} />
      <Route path="/vendas"        element={<AdminOnly user={user}><Vendas T={T} dark={dark} user={user} /></AdminOnly>} />
      <Route path="/relatorios"    element={<AdminOnly user={user}><Relatorios T={T} dark={dark} /></AdminOnly>} />
      <Route path="/configuracoes" element={<AdminOnly user={user}><Configuracoes T={T} dark={dark} /></AdminOnly>} />
      <Route path="/financeiro-pf" element={<AdminOnly user={user}><ControleFinanceiroPF T={T} dark={dark} /></AdminOnly>} />
      <Route path="/meu-relatorio" element={<MeuRelatorio user={user} />} />
      <Route path="/painel-func"   element={<PainelFuncionario T={T} dark={dark} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function RoutesMobile({ T, dark, user }) {
  // PullToRefresh removido em 21/05/2026 a pedido do Toni — UX de puxar pra
  // atualizar foi considerada confusa em prod. Realtime do Supabase + botões
  // explícitos de refresh em telas críticas cobrem o caso.
  return (
    <Routes>
      <Route path="/"            element={<PainelPorPerfil T={T} dark={dark} user={user} isMobile />} />
      <Route path="/os"          element={<OSMobile T={T} dark={dark} user={user} />} />
      <Route path="/clientes"    element={<Clientes T={T} dark={dark} />} />
      <Route path="/logistica"   element={<Logistica T={T} dark={dark} />} />
      <Route path="/estoque"     element={<EstoqueMobile T={T} dark={dark} user={user} />} />
      <Route path="/financeiro"    element={<AdminOnly user={user}><FinanceiroMobile T={T} dark={dark} /></AdminOnly>} />
      <Route path="/vendas"        element={<AdminOnly user={user}><VendasMobile T={T} dark={dark} user={user} /></AdminOnly>} />
      <Route path="/relatorios"    element={<AdminOnly user={user}><Relatorios T={T} dark={dark} /></AdminOnly>} />
      <Route path="/configuracoes" element={<AdminOnly user={user}><Configuracoes T={T} dark={dark} /></AdminOnly>} />
      <Route path="/financeiro-pf" element={<AdminOnly user={user}><ControleFinanceiroPF T={T} dark={dark} /></AdminOnly>} />
      <Route path="/meu-relatorio" element={<MeuRelatorio user={user} />} />
      <Route path="/painel-func"   element={<PainelFuncionario T={T} dark={dark} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
