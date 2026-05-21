// idemaq-src/components/layout/TopbarMobile.jsx
//
// Topbar mobile polido (21/05/2026 — refator mobile-first).
// - Logo + título da página atual em forma de breadcrumb compacto
// - Botão de tema + bell (notificações futuras)
// - Sticky no topo, sombra suave ao scroll (CSS pode adicionar via .scrolled class)

import React from 'react'
import { P } from '../../theme'
import { MENUS } from '../../utils/osData'

export default function TopbarMobile({ pagina, dark, toggleTheme, T }) {
  const menu = MENUS.find(m => m.id === pagina) || MENUS[0]
  return (
    <header style={{
      background: T.card,
      borderBottom: `1px solid ${T.border}`,
      padding: '0 14px',
      height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
      position: 'sticky', top: 0, zIndex: 50,
      paddingTop: 'env(safe-area-inset-top, 0px)',
    }}>
      {/* Esquerda: logo + página atual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        <div style={{
          width: 30, height: 30,
          background: `linear-gradient(135deg, ${P.blue}, #3a7bbf)`,
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(91, 155, 213, 0.35)',
        }}>
          <i className="ti ti-tool" style={{ fontSize: 14, color: '#fff' }} aria-hidden="true" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{
            fontSize: 15, fontWeight: 700, color: T.textPrimary,
            letterSpacing: '-.01em',
          }}>Idemaq</span>
          <i className={`ti ${menu.icon}`} style={{ fontSize: 14, color: T.textDim }} aria-hidden="true" />
          <span style={{
            fontSize: 12.5, color: T.textSecondary, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{menu.label}</span>
        </div>
      </div>

      {/* Direita: ações */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button onClick={toggleTheme}
          aria-label={dark ? 'Modo claro' : 'Modo escuro'}
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: dark ? P.yellow : T.textMuted,
            fontFamily: 'inherit',
          }}>
          <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 18 }} aria-hidden="true" />
        </button>
        <button
          aria-label="Notificações"
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: T.textMuted, position: 'relative',
            fontFamily: 'inherit',
          }}>
          <i className="ti ti-bell" style={{ fontSize: 19 }} aria-hidden="true" />
          {/* Dot vermelho — depois plugar contador real */}
          <span style={{
            position: 'absolute', top: 8, right: 8,
            width: 7, height: 7, borderRadius: '50%',
            background: P.red, border: `2px solid ${T.card}`,
          }} />
        </button>
      </div>
    </header>
  )
}
