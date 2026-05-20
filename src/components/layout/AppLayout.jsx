// idemaq-src/components/layout/AppLayout.jsx
// Desktop: Sidebar (overlay hover-expand) + área de conteúdo (sem topbar).
// Mobile:  TopbarMobile + área + BottomNav.
//
// Cada página tem seu próprio PageHeader, então não duplicamos o título no topo.

import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopbarMobile from './TopbarMobile'
import BottomNav from './BottomNav'

// Mapa pagina-id → rota
const ROUTES = {
  painel:        '/',
  os:            '/os',
  clientes:      '/clientes',
  logistica:     '/logistica',
  estoque:       '/estoque',
  financeiro:    '/financeiro',
  relatorios:    '/relatorios',
  configuracoes: '/configuracoes',
}
// Reverso para inferir pagina ativa pela URL
function pageFromPath(pathname) {
  for (const [id, route] of Object.entries(ROUTES)) {
    if (route === pathname) return id
  }
  const seg = pathname.replace(/^\//, '').split('/')[0]
  return seg || 'painel'
}

export default function AppLayout({
  T, dark, toggleTheme,
  user, sair,
  isMobile = false,
  children,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const pagina = pageFromPath(location.pathname)

  const setPagina = (id) => {
    const route = ROUTES[id]
    if (route) navigate(route)
  }

  if (isMobile) {
    return (
      <div className="app-mobile-root idemaq-app-root" style={{
        display: 'flex', flexDirection: 'column',
        background: T.bg, width: '100%',
        fontFamily: 'inherit', overflow: 'hidden',
      }}>
        <TopbarMobile pagina={pagina} dark={dark} toggleTheme={toggleTheme} T={T} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {children}
        </div>
        <BottomNav pagina={pagina} setPagina={setPagina} sair={sair} user={user} T={T} dark={dark} />
      </div>
    )
  }

  return (
    <div className="idemaq-app-root" style={{
      display: 'flex',
      background: T.bg, width: '100%',
      fontFamily: 'inherit', overflow: 'hidden',
    }}>
      <Sidebar pagina={pagina} setPagina={setPagina} user={user} sair={sair}
        T={T} dark={dark} toggleTheme={toggleTheme} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
