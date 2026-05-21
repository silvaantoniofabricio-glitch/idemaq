// src/components/mobile/MobileSearchBar.jsx
// Barra de busca sticky no topo, padrão iOS/Android.

import React from 'react'

export default function MobileSearchBar({
  T, dark,
  value, onChange,
  placeholder = 'Buscar…',
  rightAction,         // ReactNode opcional (botão filtro/etc) à direita
  sticky = false,
  autoFocus = false,
}) {
  return (
    <div style={{
      padding: '8px 14px',
      background: T?.bg,
      position: sticky ? 'sticky' : 'static',
      top: 0, zIndex: 4,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <div style={{
        flex: 1, position: 'relative',
        display: 'flex', alignItems: 'center',
      }}>
        <i className="ti ti-search" aria-hidden="true"
          style={{
            position: 'absolute', left: 12,
            fontSize: 16, color: T?.textDim,
            pointerEvents: 'none',
          }} />
        <input
          type="search"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: '100%',
            padding: '11px 14px 11px 38px',
            borderRadius: 10,
            border: `1px solid ${T?.border}`,
            background: T?.cardAlt,
            color: T?.textPrimary,
            fontSize: 14, outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        {value && (
          <button onClick={() => onChange?.('')}
            aria-label="Limpar"
            style={{
              position: 'absolute', right: 8,
              width: 24, height: 24, borderRadius: 12,
              background: T?.border, color: T?.card,
              border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}>
            <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" />
          </button>
        )}
      </div>
      {rightAction}
    </div>
  )
}
