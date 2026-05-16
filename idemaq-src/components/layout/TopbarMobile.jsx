// idemaq-src/components/layout/TopbarMobile.jsx
import React from 'react'
import { P } from '../../theme'
import { MENUS } from '../../utils/osData'

export default function TopbarMobile({ pagina, dark, toggleTheme, T }) {
  const label = MENUS.find(m => m.id === pagina)?.label || 'Painel'
  return (
    <div style={{
      background: T.topBg, borderBottom: `1px solid ${T.border}`,
      padding: '0 1rem', height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{
          width: 26, height: 26, background: `linear-gradient(135deg,${P.blue},#3a7bbf)`,
          borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-tool" style={{ fontSize: 13, color: '#fff' }} aria-hidden="true" />
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>Idemaq</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>/ {label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={toggleTheme} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }} aria-label={dark ? 'Modo claro' : 'Modo escuro'}>
          <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} style={{ fontSize: 18, color: dark ? P.yellow : T.textMuted }} aria-hidden="true" />
        </button>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-bell" style={{ fontSize: 20, color: T.textMuted, cursor: 'pointer' }} aria-hidden="true" />
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 7, height: 7, borderRadius: '50%',
            background: P.red, border: `2px solid ${T.topBg}`,
          }} />
        </div>
      </div>
    </div>
  )
}
