// idemaq-src/components/ui/Textarea.jsx
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
        padding: '9px 12px',
        fontSize: 12.5,
        color: T?.textPrimary,
        background: T?.card,
        border: `1px solid ${T?.border}`,
        borderRadius: 8,
        outline: 'none',
        fontFamily: 'inherit',
        boxShadow: T?.shadow,
        resize: 'vertical',
        ...extraStyle,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = azul; e.currentTarget.style.boxShadow = `0 0 0 3px ${azul}22` }}
      onBlur={(e) => { e.currentTarget.style.borderColor = T?.border; e.currentTarget.style.boxShadow = T?.shadow }}
      {...rest}
    />
  )

  if (!label) return inner
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: fullWidth ? '100%' : 'auto' }}>
      <span style={{ fontSize: 12, color: T?.textSecondary, fontWeight: 500 }}>{label}{required && <span style={{ color: corEtapa('red', dark), marginLeft: 3 }}>*</span>}</span>
      {inner}
    </label>
  )
}
