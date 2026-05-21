// src/components/mobile/MobileEmptyState.jsx
// Estado vazio padrão: ícone circular + título + descrição + CTA opcional.

import React from 'react'

export default function MobileEmptyState({
  T, dark,
  icon = 'ti-circle-check',
  iconColor,
  title,
  description,
  action,           // ReactNode (botão opcional)
}) {
  return (
    <div style={{
      padding: '40px 24px',
      textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: `${iconColor || T?.textMuted}15`,
        color: iconColor || T?.textMuted,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 32 }} aria-hidden="true" />
      </div>
      {title && (
        <div style={{
          fontSize: 15, fontWeight: 700, color: T?.textPrimary,
          marginBottom: 6,
        }}>{title}</div>
      )}
      {description && (
        <div style={{
          fontSize: 12.5, color: T?.textMuted,
          maxWidth: 320, lineHeight: 1.5, marginBottom: action ? 16 : 0,
        }}>{description}</div>
      )}
      {action}
    </div>
  )
}
