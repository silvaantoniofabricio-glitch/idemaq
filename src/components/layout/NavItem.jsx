// idemaq-src/components/layout/NavItem.jsx
import React from 'react'
import { P } from '../../theme'

export default function NavItem({ m, active, onClick, collapsed, T, dark }) {
  const activeBg  = dark ? '#1a3a5c' : '#e6f1fb'
  const activeClr = dark ? P.blue    : P.blueDark
  const iconClr   = dark ? (active ? P.blue : T.textDim) : (active ? P.blueDark : T.textMuted)
  // Padding-left fixo (20px) em ambos estados pra ícone não pular ao expandir/colapsar.
  // Em 56px colapsado: ícone 16px ocupa x=20-36, centro em 28 (= centro visual da barra).
  // Em 210px expandido: ícone fica no MESMO x=20-36; label segue depois.
  return (
    <button onClick={onClick} title={collapsed ? m.label : undefined}
      style={{
        width: '100%', display: 'flex', alignItems: 'center',
        gap: 9,
        padding: '9px 10px 9px 20px',
        justifyContent: 'flex-start',
        border: 'none', cursor: 'pointer',
        fontSize: 13, textAlign: 'left',
        background: active ? activeBg : 'transparent',
        color: active ? activeClr : T.textMuted,
        borderRadius: 7,
        position: 'relative',
        marginBottom: 1,
        fontFamily: 'inherit',
        overflow: 'hidden',
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
