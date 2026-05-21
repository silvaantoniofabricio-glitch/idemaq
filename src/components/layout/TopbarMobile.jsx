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
      background: T.card,
      borderBottom: `1px solid ${T.border}`,
      padding: '0 12px',
      height: 42,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 50,
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      {/* Centro: logo */}
      <LogoIdemaq
        dark={dark}
        style={{
          height: 22, width: 'auto', maxWidth: 100,
          objectFit: 'contain', display: 'block',
        }}
      />

      {/* Direita: botão de tema */}
      <button onClick={toggleTheme}
        aria-label={dark ? 'Modo claro' : 'Modo escuro'}
        style={{
          position: 'absolute', right: 10,
          width: 30, height: 30, borderRadius: 7,
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: dark ? P.yellow : T.textMuted,
          fontFamily: 'inherit',
        }}>
        <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 16 }} aria-hidden="true" />
      </button>
    </header>
  )
}
