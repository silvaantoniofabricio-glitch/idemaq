// idemaq-src/components/ui/Input.jsx
// Input de texto com label opcional + ícone opcional + foco em azul.

import React from 'react'
import { P } from '../../theme'
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
  const sz = size === 'sm' ? { h: 28, px: 10, fs: 11.5, ic: 13 }
           : size === 'lg' ? { h: 44, px: 14, fs: 14,   ic: 17 }
           :                  { h: 34, px: 12, fs: 12.5, ic: 14 }
  const azul = corEtapa('blue', dark)

  const inner = (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      {icon && (
        <i className={`ti ${icon}`} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: sz.ic, color: T?.textDim, pointerEvents: 'none',
        }} aria-hidden="true" />
      )}
      {iconRight && (
        <i className={`ti ${iconRight}`} style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: sz.ic, color: T?.textDim, pointerEvents: 'none',
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
          background: T?.card,
          border: `1px solid ${T?.border}`,
          borderRadius: 8,
          outline: 'none',
          fontFamily: 'inherit',
          boxShadow: T?.shadow,
          transition: 'border-color .12s, box-shadow .12s',
          ...extraStyle,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = azul
          e.currentTarget.style.boxShadow = `0 0 0 3px ${azul}22`
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = T?.border
          e.currentTarget.style.boxShadow = T?.shadow
        }}
        {...rest}
      />
    </div>
  )

  if (!label) return inner
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: fullWidth ? '100%' : 'auto' }}>
      <span style={{ fontSize: 12, color: T?.textSecondary, fontWeight: 500 }}>{label}{required && <span style={{ color: corEtapa('red', dark), marginLeft: 3 }}>*</span>}</span>
      {inner}
    </label>
  )
}
