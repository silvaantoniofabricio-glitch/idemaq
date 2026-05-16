// idemaq-src/components/layout/Topbar.jsx
// Topbar desktop com label da página + data + botões (sol/lua, sino, settings).

import React from 'react'
import { P } from '../../theme'
import { MENUS } from '../../utils/osData'

export default function Topbar({ pagina, dark, toggleTheme, T }) {
  const label = MENUS.find(m => m.id === pagina)?.label || 'Painel'
  const hoje  = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

  const btnStyle = {
    width: 34, height: 34, borderRadius: 8,
    background: dark ? '#1a2840' : '#f0f0f2',
    border: `1px solid ${T.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontFamily: 'inherit',
  }
  return (
    <div style={{
      background: T.topBg, borderBottom: `1px solid ${T.border}`,
      padding: '0 1.25rem', height: 56,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: T.textPrimary }}>{label}</span>
        <span style={{
          fontSize: 12, color: T.textDim, background: T.bg,
          padding: '3px 9px', borderRadius: 6, border: `1px solid ${T.border}`,
        }}>{hoje}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={toggleTheme} style={btnStyle} aria-label={dark ? 'Modo claro' : 'Modo escuro'}>
          <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 17, color: dark ? P.yellow : T.textMuted }} aria-hidden="true" />
        </button>
        <div style={{ ...btnStyle, position: 'relative' }}>
          <i className="ti ti-bell" style={{ fontSize: 17, color: T.textMuted }} aria-hidden="true" />
          <div style={{
            position: 'absolute', top: 7, right: 7,
            width: 7, height: 7, borderRadius: '50%',
            background: P.red, border: `2px solid ${T.topBg}`,
          }} />
        </div>
        <div style={{ ...btnStyle, background: dark ? '#1a3a5c' : '#e6f1fb' }}>
          <i className="ti ti-settings" style={{ fontSize: 17, color: dark ? P.blue : P.blueDark }} aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
