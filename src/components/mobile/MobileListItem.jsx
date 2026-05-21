// src/components/mobile/MobileListItem.jsx
// Linha de lista padronizada pra mobile.
//
// Layout: [ícone/badge] [título + subtítulo] [meta direita + chevron]
//
// - Touch target mínimo 56px de altura
// - Ripple/highlight no toque
// - Separador inferior (border-bottom)
// - Opcional: foto/avatar à esquerda, ação à direita (botão)

import React from 'react'

export default function MobileListItem({
  T, dark,
  onClick,
  icon,                // ti-* ou null
  iconColor,           // string (hex/rgba)
  iconBg,              // background do círculo
  avatar,              // string (URL) → renderiza como <img>
  badge,               // string curta (ex: "#247") em chip no canto do ícone
  title,
  subtitle,
  meta,                // ReactNode no canto direito (data, valor, badge)
  rightChevron = true, // mostra > pra indicar clicável
  rightAction,         // ReactNode (botão) — substitui chevron
  hover = true,
  compact = false,     // padding menor (pra listas densas)
}) {
  const padV = compact ? '10px' : '13px'
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center',
        gap: 12,
        padding: `${padV} 14px`,
        borderBottom: `1px solid ${T?.border}`,
        cursor: onClick ? 'pointer' : 'default',
        background: 'transparent',
        transition: 'background .12s',
        minHeight: 56, // touch target
      }}
      onTouchStart={hover && onClick ? (e) => e.currentTarget.style.background = T?.cardAlt : undefined}
      onTouchEnd={hover && onClick ? (e) => e.currentTarget.style.background = 'transparent' : undefined}
    >
      {/* Ícone ou avatar */}
      {(icon || avatar) && (
        <div style={{
          width: compact ? 32 : 40,
          height: compact ? 32 : 40,
          borderRadius: 10,
          background: iconBg || T?.cardAlt,
          color: iconColor || T?.textMuted,
          display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontSize: compact ? 14 : 17,
          fontWeight: 700,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {avatar
            ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : icon ? <i className={`ti ${icon}`} aria-hidden="true" /> : null}
          {badge && (
            <span style={{
              position: 'absolute', bottom: -2, right: -2,
              background: iconColor || T?.textSecondary,
              color: '#fff',
              fontSize: 8.5, fontWeight: 700,
              padding: '1px 4px', borderRadius: 6,
              border: `1.5px solid ${T?.card || '#fff'}`,
            }}>{badge}</span>
          )}
        </div>
      )}

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 600, color: T?.textPrimary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 11.5, color: T?.textMuted, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Meta + chevron */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0,
      }}>
        {meta && (
          <div style={{ fontSize: 11.5, color: T?.textMuted, textAlign: 'right' }}>
            {meta}
          </div>
        )}
        {rightAction || (
          rightChevron && onClick && (
            <i className="ti ti-chevron-right" style={{ fontSize: 16, color: T?.textDim }} aria-hidden="true" />
          )
        )}
      </div>
    </div>
  )
}
