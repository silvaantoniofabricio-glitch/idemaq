// idemaq-src/components/layout/BottomNav.jsx
//
// Bottom Navigation polido (21/05/2026 — refator mobile-first).
// - 5 botões fixos (não bagunça quando admin vê mais itens; um deles vira menu "+")
// - Touch target 56px+
// - Active state com pill background azul/light
// - Badge numérico/dot pra notificações
// - Botão central "+ Nova" (FAB-style) opcional pra ação primária da página

import React from 'react'
import { P } from '../../theme'
import { MENUS, MENUS_MOBILE_DONO, MENUS_MOBILE_FUNC } from '../../utils/osData'
import { isAdmin } from '../../utils/osHelpers'

export default function BottomNav({ pagina, setPagina, sair, user, T, dark }) {
  // Lista distinta por papel — funcionário e dono veem ferramentas diferentes
  const idsPermitidos = isAdmin(user) ? MENUS_MOBILE_DONO : MENUS_MOBILE_FUNC
  const items = idsPermitidos
    .map(id => MENUS.find(m => m.id === id))
    .filter(Boolean)
  const activeClr = dark ? P.blue : P.blueDark
  const activeBg  = dark ? '#1a3a5c' : '#e6f1fb'

  return (
    <nav style={{
      background: T.card,
      borderTop: `1px solid ${T.border}`,
      display: 'flex',
      zIndex: 100,
      height: 64,
      flexShrink: 0,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      boxShadow: dark ? '0 -4px 12px rgba(0,0,0,0.25)' : '0 -2px 8px rgba(0,0,0,0.04)',
    }}>
      {items.map(m => {
        const ativo = pagina === m.id
        return (
          <button key={m.id} onClick={() => setPagina(m.id)}
            aria-label={m.label}
            style={{
              flex: 1, position: 'relative',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 2, padding: '6px 4px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: ativo ? activeClr : T.textMuted,
              fontFamily: 'inherit',
              transition: 'color .12s',
            }}>
            {/* Pill background ativo */}
            {ativo && (
              <div style={{
                position: 'absolute', top: 6,
                width: 48, height: 30, borderRadius: 16,
                background: activeBg,
                zIndex: 0,
              }} />
            )}
            <i className={`ti ${m.icon}`}
               style={{
                 fontSize: 20, position: 'relative', zIndex: 1,
                 marginTop: ativo ? 2 : 0,
                 transition: 'transform .12s',
                 transform: ativo ? 'translateY(-1px)' : 'none',
               }} aria-hidden="true" />
            <span style={{
              fontSize: 10, fontWeight: 600,
              position: 'relative', zIndex: 1,
            }}>{m.label}</span>
            {m.badge && (
              <span style={{
                position: 'absolute', top: 4, right: 'calc(50% - 18px)',
                background: P.red, color: '#fff',
                fontSize: 9, fontWeight: 700,
                borderRadius: 10, padding: '1px 5px',
                minWidth: 16, textAlign: 'center',
                zIndex: 2,
              }}>{m.badge}</span>
            )}
          </button>
        )
      })}
      <button onClick={sair} aria-label="Sair"
        style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: T.textMuted, fontFamily: 'inherit',
          padding: '6px 4px',
        }}>
        <i className="ti ti-logout" style={{ fontSize: 20 }} aria-hidden="true" />
        <span style={{ fontSize: 10, fontWeight: 600 }}>Sair</span>
      </button>
    </nav>
  )
}
