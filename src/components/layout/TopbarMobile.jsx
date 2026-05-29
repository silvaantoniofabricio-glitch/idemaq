// idemaq-src/components/layout/TopbarMobile.jsx
// iOS HIG navigation bar:
//   - 44px · glass blur · safe-area-inset-top
//   - Esquerda: símbolo IdeMaq
//   - Centro: título da seção atual (do MENUS)
//   - Direita: toggle de tema

import React from 'react'
import { P } from '../../theme'
import { MENUS } from '../../utils/osData'
import LogoIdemaq from '../ui/LogoIdemaq'

export default function TopbarMobile({
  pagina, dark, toggleTheme, T,
  daltonismo, toggleDaltonismo,
}) {
  const menu = MENUS.find(m => m.id === pagina)
  const titulo = menu?.label ?? 'IdeMaq'

  return (
    <header style={{
      background: dark ? 'rgba(22,22,26,0.92)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
      paddingLeft: 12,
      paddingRight: 12,
      height: 44,
      paddingTop: 'env(safe-area-inset-top, 0px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxSizing: 'border-box',
    }}>

      {/* Esquerda: símbolo da marca */}
      <LogoIdemaq
        dark={dark}
        variant="symbol"
        style={{ height: 26, width: 'auto', maxWidth: 28, objectFit: 'contain', display: 'block', flexShrink: 0 }}
      />

      {/* Centro: título da página */}
      <span style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 15,
        fontWeight: 600,
        color: T.textPrimary,
        whiteSpace: 'nowrap',
        letterSpacing: '-0.01em',
        pointerEvents: 'none',
      }}>
        {titulo}
      </span>

      {/* Direita: toggle daltonismo + toggle tema */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {/* Daltonismo */}
        <button
          onClick={toggleDaltonismo}
          aria-label={daltonismo ? 'Desativar modo daltonismo' : 'Ativar modo daltonismo'}
          title={daltonismo ? 'Daltonismo: ligado' : 'Daltonismo: desligado'}
          style={{
            width: 32, height: 32, borderRadius: 16,
            background: daltonismo
              ? (dark ? 'rgba(91,155,213,0.18)' : 'rgba(91,155,213,0.12)')
              : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
            border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: daltonismo ? P.blue : T.textMuted,
            position: 'relative',
          }}>
          <i className="ti ti-eye"
             style={{ fontSize: 15 }}
             aria-hidden="true" />
          {!daltonismo && (
            <span style={{
              position: 'absolute', top: 6, left: 6, right: 6, bottom: 6,
              borderTop: `1.5px solid ${T.textMuted}`,
              transform: 'rotate(-45deg)',
              pointerEvents: 'none',
              transformOrigin: 'center',
            }} aria-hidden="true" />
          )}
        </button>

        {/* Tema */}
        <button
          onClick={toggleTheme}
          aria-label={dark ? 'Modo claro' : 'Modo escuro'}
          style={{
            width: 32, height: 32, borderRadius: 16,
            background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
            border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: dark ? P.yellow : T.textMuted,
          }}>
          <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`}
             style={{ fontSize: 15 }}
             aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
