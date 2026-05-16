// idemaq-src/components/ui/Card.jsx
// Card padrão do Idemaq — aplica .idemaq-card pra receber sombra no light mode.
// Use sempre que precisar de um container visual.

import React from 'react'

export default function Card({
  children, T, dark,
  padding = '14px 16px',
  radius = 11,
  hover = false,
  accent,            // cor da borda lateral esquerda (azul, vermelho etc)
  noLeftBorder = false,
  className = '',
  style: extraStyle = {},
  ...rest
}) {
  const styleBase = {
    background: T?.card,
    borderRadius: radius,
    padding,
    border: dark ? `1px solid ${T?.border}` : `1px solid ${T?.border}`,
    boxShadow: T?.shadow,
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

// Card "secundário" (background mais escuro) — útil para sub-cards dentro de outro Card
export function SubCard({ children, T, padding = '12px 14px', radius = 9, style: extraStyle = {}, ...rest }) {
  return (
    <div className="idemaq-card" data-no-left-border="true"
      style={{
        background: T?.cardAlt,
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
