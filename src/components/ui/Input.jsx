// src/components/ui/Input.jsx
// Input padrao do Idemaq — Atlassian Design.
// Border 1px, radius 3, focus border azul + box-shadow halo 22% alpha.

import React from 'react'
import { corEtapa } from '../../utils/colors'

export default function Input({
  T, dark,
  label,
  value, onChange,
  placeholder,
  type = 'text',
  icon,
  iconRight,
  size = 'md',
  fullWidth = true,
  disabled = false,
  required = false,
  style: extraStyle = {},
  ...rest
}) {
  const sz = size === 'sm' ? { h: 28, px: 10, fs: 12,   ic: 13 }
           : size === 'lg' ? { h: 40, px: 12, fs: 14,   ic: 16 }
           :                  { h: 32, px: 10, fs: 13,  ic: 14 }
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  const inner = (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      {icon && (
        <i className={`ti ${icon}`} style={{
          position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: sz.ic, color: T?.textMuted, pointerEvents: 'none',
        }} aria-hidden="true" />
      )}
      {iconRight && (
        <i className={`ti ${iconRight}`} style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: sz.ic, color: T?.textMuted, pointerEvents: 'none',
        }} aria-hidden="true" />
      )}
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        style={{
          width: '100%',
          height: sz.h,
          padding: `0 ${iconRight ? sz.px + 18 : sz.px}px 0 ${icon ? sz.px + 18 : sz.px}px`,
          fontSize: sz.fs,
          color: T?.textPrimary,
          background: dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
          border: `1px solid ${T?.border}`,
          borderRadius: 3,
          outline: 'none',
          fontFamily: 'inherit',
          letterSpacing: '-0.005em',
          transition: 'border-color .12s, box-shadow .12s',
          ...extraStyle,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = azul
          e.currentTarget.style.boxShadow = `0 0 0 2px ${azul}33`
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = T?.border
          e.currentTarget.style.boxShadow = 'none'
        }}
        {...rest}
      />
    </div>
  )

  if (!label) return inner
  return (
    <label style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      width: fullWidth ? '100%' : 'auto',
    }}>
      <span style={{
        fontSize: 11, color: T?.textMuted, fontWeight: 600,
        letterSpacing: '-0.005em',
      }}>
        {label}
        {required && <span style={{ color: vermelho, marginLeft: 3 }}>*</span>}
      </span>
      {inner}
    </label>
  )
}
