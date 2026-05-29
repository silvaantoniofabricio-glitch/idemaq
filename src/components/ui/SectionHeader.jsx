// src/components/ui/SectionHeader.jsx
// Cabecalho de secao dentro de um Card — Atlassian Design.
// Label uppercase 600 + icone subtle + action opcional a direita.

import React from 'react'
import { corEtapa } from '../../utils/colors'

export default function SectionHeader({ T, dark, icon, children, action, sm = false, mb }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: mb != null ? mb : (sm ? 10 : 14),
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 700, color: T?.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        {icon && (
          <i className={`ti ${icon}`}
             style={{ fontSize: 13, color: T?.textMuted }}
             aria-hidden="true" />
        )}
        {children}
      </div>
      {action}
    </div>
  )
}

// SectionAction — link "Ver mais →" usado dentro do action do SectionHeader
export function SectionAction({ children, dark, onClick }) {
  const azul = corEtapa('blue', dark)
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 12, fontWeight: 500, color: azul,
      background: 'transparent', border: 'none', cursor: 'pointer',
      padding: '4px 6px', borderRadius: 3, fontFamily: 'inherit',
      letterSpacing: '-0.005em',
      WebkitTapHighlightColor: 'transparent',
    }}>
      {children}
      <i className="ti ti-arrow-right" style={{ fontSize: 12 }} aria-hidden="true" />
    </button>
  )
}
