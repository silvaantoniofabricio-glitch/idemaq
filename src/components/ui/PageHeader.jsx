// idemaq-src/components/ui/PageHeader.jsx
// Header de página: título grande + sub + 4 stats inline + ações à direita.

import React from 'react'
import { corHero } from '../../utils/colors'

export default function PageHeader({
  T, dark,
  title,
  subtitle,
  stats = [],       // [{ label, value, color }]
  actions,          // ReactNode (botões)
  style: extraStyle = {},
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap', marginBottom: 2,
      ...extraStyle,
    }}>
      <div>
        <div style={{
          fontSize: 22, fontWeight: 700,
          color: corHero(dark),
          letterSpacing: '-0.02em', lineHeight: 1,
        }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: T?.textMuted, marginTop: 4 }}>{subtitle}</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 18, fontWeight: 700,
              color: (s.value > 0 || s.value === '—') ? (s.color || T?.textPrimary) : T?.textDim,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>{s.value}</div>
            <div style={{
              fontSize: 10.5, color: T?.textMuted, marginTop: 3,
              textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600,
            }}>{s.label}</div>
          </div>
        ))}
        {actions}
      </div>
    </div>
  )
}
