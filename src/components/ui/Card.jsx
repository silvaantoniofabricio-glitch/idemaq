// src/components/ui/Card.jsx
// Card padrao do Idemaq — Atlassian Design.
// border 1px + radius 4 + shadow sutil no light (0 1px 1px rgba(9,30,66,.10)).
// API preservada: aceita radius, padding, accent (border-left), hover, etc.

import React from 'react'

export default function Card({
  children, T, dark,
  padding = '14px 16px',
  radius = 4,
  hover = false,
  accent,
  noLeftBorder = false,
  className = '',
  style: extraStyle = {},
  ...rest
}) {
  const styleBase = {
    background: T?.card,
    borderRadius: radius,
    padding,
    border: `1px solid ${T?.border}`,
    boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    transition: 'box-shadow .15s',
  }
  if (accent) {
    styleBase.borderLeft = `3px solid ${accent}`
  }
  return (
    <div
      className={`idemaq-card${hover ? ' idemaq-card-hover' : ''}${className ? ' ' + className : ''}`}
      data-no-left-border={accent || noLeftBorder ? 'true' : undefined}
      style={{ ...styleBase, ...extraStyle }}
      {...rest}
    >
      {children}
    </div>
  )
}

// SubCard — background mais sutil pra sub-cards dentro de outro Card
export function SubCard({ children, T, dark, padding = '12px 14px', radius = 3, style: extraStyle = {}, ...rest }) {
  return (
    <div className="idemaq-card" data-no-left-border="true"
      style={{
        background: dark ? 'rgba(255,255,255,0.025)' : '#F7F8F9',
        borderRadius: radius,
        padding,
        border: `1px solid ${T?.border}`,
        ...extraStyle,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
