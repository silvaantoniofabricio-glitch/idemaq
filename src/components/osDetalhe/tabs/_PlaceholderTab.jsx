// src/components/osDetalhe/tabs/_PlaceholderTab.jsx
// Placeholder visual padrão das abas enquanto o conteúdo do PR2/PR3 não chega.

import React from 'react'
import { P } from '../../../theme'
import { corEtapa } from '../../../utils/colors'

export default function PlaceholderTab({ T, dark, icon, titulo, descricao }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      padding: '28px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: dark ? '#0d2035' : '#e6f1fb',
        border: `1px solid ${azul}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 26, color: azul }} aria-hidden="true" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>{titulo}</div>
      <div style={{
        fontSize: 12, color: T.textMuted, lineHeight: 1.55,
        maxWidth: 480,
      }}>{descricao}</div>
      <div style={{
        marginTop: 8,
        fontSize: 10.5, color: T.textDim,
        textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600,
      }}>shell pronto — conteúdo nos próximos commits</div>
    </div>
  )
}
