// idemaq-src/components/layout/TopbarMobile.jsx
//
// Topbar mobile polido (21/05/2026 — refator mobile-first).
// - Logo + título da página atual em forma de breadcrumb compacto
// - Botão de tema + bell (notificações futuras)
// - Sticky no topo, sombra suave ao scroll (CSS pode adicionar via .scrolled class)

import React from 'react'
import { P } from '../../theme'
import { MENUS } from '../../utils/osData'
import LogoIdemaq from '../ui/LogoIdemaq'

export default function TopbarMobile({ pagina, dark, toggleTheme, T }) {
  return (
    <header style={{
      background: dark ? 'rgba(22,22,26,0.92)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      padding: '0 12px',
      height: 34,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 50,
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      {/* Centro: logo */}
      <LogoIdemaq
        dark={dark}
        style={{
          height: 17, width: 'auto', maxWidth: 90,
          objectFit: 'contain', display: 'block',
        }}
      />

      {/* Direita: botão de tema */}
      <button onClick={toggleTheme}
        aria-label={dark ? 'Modo claro' : 'Modo escuro'}
        style={{
          position: 'absolute', right: 10,
          width: 26, height: 26, borderRadius: 6,
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: dark ? P.yellow : T.textMuted,
          fontFamily: 'inherit',
        }}>
        <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 14 }} aria-hidden="true" />
      </button>
    </header>
  )
}
