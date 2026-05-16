// idemaq-src/components/ui/Select.jsx
import React from 'react'
import { corEtapa } from '../../utils/colors'

export default function Select({
  T, dark,
  label, value, onChange,
  options = [],     // [{ value, label }] OU [string]
  placeholder,
  size = 'md',
  fullWidth = true,
  disabled = false,
  style: extraStyle = {},
  ...rest
}) {
  const sz = size === 'sm' ? { h: 28, px: 10, fs: 11.5 }
           : size === 'lg' ? { h: 44, px: 14, fs: 14 }
           :                  { h: 34, px: 12, fs: 12.5 }
  const azul = corEtapa('blue', dark)
  const opts = options.map(o => typeof o === 'object' ? o : { value: o, label: o })

  const inner = (
    <select
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      style={{
        width: fullWidth ? '100%' : 'auto',
        height: sz.h,
        padding: `0 ${sz.px}px`,
        fontSize: sz.fs,
        color: T?.textPrimary,
        background: T?.card,
        border: `1px solid ${T?.border}`,
        borderRadius: 8,
        outline: 'none',
        fontFamily: 'inherit',
        boxShadow: T?.shadow,
        cursor: 'pointer',
        ...extraStyle,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = azul }}
      onBlur={(e) => { e.currentTarget.style.borderColor = T?.border }}
      {...rest}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )

  if (!label) return inner
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: fullWidth ? '100%' : 'auto' }}>
      <span style={{ fontSize: 12, color: T?.textSecondary, fontWeight: 500 }}>{label}</span>
      {inner}
    </label>
  )
}
