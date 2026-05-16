// idemaq-src/components/ui/DeltaPill.jsx
// Pill de variação percentual: ↗ +12% (verde) / ↘ -3% (vermelho) / — neutro.

import React from 'react'
import { corEtapa, bgEtapa } from '../../utils/colors'

export default function DeltaPill({ value, dark, lbl, neutral }) {
  const pos = value > 0
  const isZero = value === 0 || value == null
  const cor = isZero || neutral
    ? corEtapa('muted', dark)
    : pos ? corEtapa('green', dark) : corEtapa('red', dark)
  const bg = isZero || neutral
    ? (dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
    : pos ? bgEtapa('green', dark) : bgEtapa('red', dark)
  const icon = isZero || neutral ? 'ti-minus' : pos ? 'ti-trending-up' : 'ti-trending-down'

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 11, fontWeight: 600,
      color: cor, background: bg,
      padding: '2px 7px 2px 6px',
      borderRadius: 6,
      letterSpacing: '0.01em',
      fontVariantNumeric: 'tabular-nums',
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
      {value != null && (isZero ? '0' : (pos ? '+' : '') + value + '%')}
      {lbl && <span style={{ opacity: 0.8, fontWeight: 500 }}>{lbl}</span>}
    </span>
  )
}
