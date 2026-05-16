// idemaq-src/components/layout/NavItem.jsx
import React from 'react'
import { P } from '../../theme'

export default function NavItem({ m, active, onClick, collapsed, T, dark }) {
  const activeBg  = dark ? '#1a3a5c' : '#e6f1fb'
  const activeClr = dark ? P.blue    : P.blueDark
  const iconClr   = dark ? (active ? P.blue : T.textDim) : (active ? P.blueDark : T.textMuted)
  return (
    <button onClick={onClick} title={collapsed ? m.label : undefined}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        gap: collapsed ? 0 : 9,
        padding: collapsed ? '9px 0' : '9px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        border: 'none', cursor: 'pointer',
        fontSize: 13, textAlign: 'left',
        background: active ? activeBg : 'transparent',
        color: active ? activeClr : T.textMuted,
        borderRadius: 7,
        position: 'relative',
        marginBottom: 1,
        fontFamily: 'inherit',
      }}
    >
      <i className={`ti ${m.icon}`} style={{ fontSize: 16, flexShrink: 0, color: iconClr }} aria-hidden="true" />
      {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{m.label}</span>}
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
