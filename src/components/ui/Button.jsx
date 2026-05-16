// idemaq-src/components/ui/Button.jsx
// 4 variantes: primary (gradient azul), secondary (borda), ghost (transparente), danger (vermelho)
// Tamanhos: sm | md (padrão) | lg
// Suporta ícone (string Tabler "ti-...") em iconLeft ou iconRight

import React from 'react'
import { P } from '../../theme'

const SIZES = {
  sm: { h: 28, px: 10, fs: 11.5,  ic: 13 },
  md: { h: 36, px: 14, fs: 12.5,  ic: 15 },
  lg: { h: 44, px: 18, fs: 14,    ic: 17 },
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  T, dark,
  iconLeft, iconRight,
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  style: extraStyle = {},
  ...rest
}) {
  const sz = SIZES[size] || SIZES.md
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    height: sz.h,
    padding: `0 ${sz.px}px`,
    fontSize: sz.fs,
    fontWeight: 600,
    borderRadius: 8,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity .12s, transform .12s, box-shadow .12s, background .12s',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    border: 'none',
  }
  let v = {}
  if (variant === 'primary') {
    v = {
      background: `linear-gradient(135deg, ${P.blue}, #3a7bbf)`,
      color: '#fff',
      boxShadow: '0 1px 2px rgba(91,155,213,0.30), 0 4px 12px rgba(91,155,213,0.15)',
    }
  } else if (variant === 'secondary') {
    v = {
      background: T?.cardAlt || 'transparent',
      color: T?.textPrimary || '#0a0a0d',
      border: `1px solid ${T?.border || '#e5e5e5'}`,
    }
  } else if (variant === 'ghost') {
    v = {
      background: 'transparent',
      color: T?.textMuted || '#6a6a6e',
      border: `1px solid ${T?.border || '#e5e5e5'}`,
    }
  } else if (variant === 'danger') {
    v = {
      background: dark ? '#2a1515' : '#fde8e8',
      color: dark ? P.red : P.redDark,
      border: `1px solid ${(dark ? P.red : P.redDark) + '55'}`,
    }
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...v, ...extraStyle }}
      {...rest}
    >
      {iconLeft && <i className={`ti ${iconLeft}`} style={{ fontSize: sz.ic }} aria-hidden="true" />}
      {children}
      {iconRight && <i className={`ti ${iconRight}`} style={{ fontSize: sz.ic }} aria-hidden="true" />}
    </button>
  )
}
