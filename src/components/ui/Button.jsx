// src/components/ui/Button.jsx
// Button padrao do Idemaq — Atlassian Design.
// 4 variantes: primary (solid azul), secondary (subtle bg), ghost (outline), danger (vermelho)
// Tamanhos: sm | md (padrao) | lg
// API preservada: iconLeft, iconRight, fullWidth, disabled, size, variant.

import React from 'react'
import { corEtapa } from '../../utils/colors'

const SIZES = {
  sm: { h: 28, px: 10, fs: 12,    ic: 13 },
  md: { h: 32, px: 12, fs: 13.5,  ic: 14 },
  lg: { h: 40, px: 16, fs: 14,    ic: 16 },
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
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    height: sz.h,
    padding: `0 ${sz.px}px`,
    fontSize: sz.fs,
    fontWeight: 500,
    borderRadius: 3,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    transition: 'background .12s, box-shadow .12s, opacity .12s',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
    whiteSpace: 'nowrap',
    border: 'none',
    letterSpacing: '-0.005em',
    WebkitTapHighlightColor: 'transparent',
  }
  let v = {}
  if (variant === 'primary') {
    v = { background: azul, color: '#fff' }
  } else if (variant === 'secondary') {
    v = {
      background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
      color: T?.textPrimary || '#091E42',
      border: `1px solid ${T?.border || '#DFE1E6'}`,
    }
  } else if (variant === 'ghost') {
    v = {
      background: 'transparent',
      color: T?.textMuted || '#6B778C',
      border: `1px solid ${T?.border || '#DFE1E6'}`,
    }
  } else if (variant === 'danger') {
    v = {
      background: vermelho,
      color: '#fff',
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
