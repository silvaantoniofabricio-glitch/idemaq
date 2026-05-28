// idemaq-src/components/layout/NavItem.jsx
// Item de navegação — Apple HIG: pill inset, hover sutil, peso 600 quando ativo.

import React, { useState } from 'react'
import { P } from '../../theme'

export default function NavItem({ m, active, onClick, collapsed, T, dark }) {
  const [hov, setHov] = useState(false)

  const activeBg  = dark ? '#1a3a5c' : '#e6f1fb'
  const activeClr = dark ? P.blue    : P.blueDark
  const iconClr   = dark ? (active ? P.blue : T.textDim) : (active ? P.blueDark : T.textMuted)
  const hoverBg   = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.045)'

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={collapsed ? m.label : undefined}
      style={{
        width: 'calc(100% - 8px)',
        margin: '1px 4px',
        display: 'flex', alignItems: 'center',
        gap: 9,
        padding: collapsed ? '9px 0' : '8px 10px 8px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        border: 'none', cursor: 'pointer',
        fontSize: 13, textAlign: 'left',
        background: active ? activeBg : (hov ? hoverBg : 'transparent'),
        color: active ? activeClr : T.textMuted,
        borderRadius: 8,
        position: 'relative',
        fontFamily: 'inherit',
        overflow: 'hidden',
        transition: 'background .1s',
      }}
    >
      <i className={`ti ${m.icon}`}
         style={{ fontSize: 16, flexShrink: 0, color: iconClr, transition: 'color .1s' }}
         aria-hidden="true" />
      {!collapsed && (
        <span style={{ whiteSpace: 'nowrap', fontWeight: active ? 600 : 500 }}>
          {m.label}
        </span>
      )}
      {m.badge && (
        <span style={{
          position: 'absolute',
          top: collapsed ? 4 : 'auto', right: collapsed ? 4 : 8,
          background: P.red, color: '#fff',
          fontSize: 9, fontWeight: 700,
          borderRadius: 10, padding: '1px 5px',
          minWidth: 16, textAlign: 'center',
        }}>{m.badge}</span>
      )}
    </button>
  )
}
