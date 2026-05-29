// src/components/ui/Textarea.jsx
// Textarea — Atlassian Design. Border 1, radius 3, focus halo 33% alpha.

import React from 'react'
import { corEtapa } from '../../utils/colors'

export default function Textarea({
  T, dark,
  label, value, onChange,
  placeholder,
  rows = 3,
  minHeight = 64,
  fullWidth = true,
  disabled = false,
  required = false,
  style: extraStyle = {},
  ...rest
}) {
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  const inner = (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      required={required}
      style={{
        width: fullWidth ? '100%' : 'auto',
        minHeight,
        padding: '8px 10px',
        fontSize: 13,
        color: T?.textPrimary,
        background: dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
        border: `1px solid ${T?.border}`,
        borderRadius: 3,
        outline: 'none',
        fontFamily: 'inherit',
        letterSpacing: '-0.005em',
        lineHeight: 1.45,
        resize: 'vertical',
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
