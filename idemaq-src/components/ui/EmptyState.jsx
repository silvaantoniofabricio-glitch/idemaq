// idemaq-src/components/ui/EmptyState.jsx
// Estado vazio padrão — ícone + título + descrição + ação opcional.

import React from 'react'

export default function EmptyState({
  T,
  icon = 'ti-inbox',
  title,
  description,
  action,           // botão opcional
  height = '60vh',
  compact = false,
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: compact ? 8 : 12,
      padding: compact ? '1.5rem 1rem' : '2rem 1rem',
      height: compact ? 'auto' : height,
      textAlign: 'center',
      color: T?.textMuted,
    }}>
      <div style={{
        width: compact ? 48 : 60, height: compact ? 48 : 60,
        borderRadius: compact ? 12 : 15,
        background: T?.card,
        border: `1px solid ${T?.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: compact ? 4 : 6,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: compact ? 22 : 30, color: T?.textDim }} aria-hidden="true" />
      </div>
      {title && <h2 style={{ fontSize: compact ? 15 : 18, color: T?.textPrimary, fontWeight: 600, margin: 0 }}>{title}</h2>}
      {description && <p style={{ fontSize: 13, margin: 0, maxWidth: 360 }}>{description}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  )
}
