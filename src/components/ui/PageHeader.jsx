// src/components/ui/PageHeader.jsx
// Header de pagina — Atlassian Design.
// Titulo h1 22px bold + subtitle muted + stats inline (cor por valor) + actions.

import React from 'react'

export default function PageHeader({
  T, dark,
  title,
  subtitle,
  stats = [],
  actions,
  style: extraStyle = {},
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 14, flexWrap: 'wrap',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif',
      ...extraStyle,
    }}>
      {/* Esquerda: titulo + subtitle + stats inline */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', minWidth: 0,
      }}>
        <h1 style={{
          fontSize: 22, fontWeight: 700,
          color: T?.textPrimary,
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
          margin: 0,
          whiteSpace: 'nowrap',
        }}>{title}</h1>

        {(subtitle || stats.length > 0) && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {subtitle && (
              <span style={{
                fontSize: 12.5, color: T?.textMuted,
                letterSpacing: '-0.005em',
              }}>{subtitle}</span>
            )}
            {stats.map((s, i) => {
              const cor = (Number(s.value) > 0 || s.value === '—')
                ? (s.color || T?.textPrimary)
                : T?.textDim
              return (
                <React.Fragment key={`${s.label}-${i}`}>
                  {(i > 0 || subtitle) && (
                    <span style={{ color: T?.textDim, fontSize: 10 }}>·</span>
                  )}
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, fontSize: 12 }}>
                    <span style={{
                      fontWeight: 700, color: cor,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.005em',
                    }}>{s.value}</span>
                    <span style={{ color: T?.textMuted }}>{s.label}</span>
                  </span>
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* Direita: actions */}
      {actions && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
