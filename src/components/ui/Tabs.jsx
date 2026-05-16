// idemaq-src/components/ui/Tabs.jsx
// Tabs / Segmented Control. Padrão "ativo = azul, inativo = cinza".
// 2 variantes: 'segmented' (background com indicador deslizante implícito) e 'underline' (linha azul embaixo).

import React from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa } from '../../utils/colors'

export default function Tabs({
  T, dark,
  options,            // [{ id, label, icon?, badge? }]
  value, onChange,
  variant = 'segmented',
  fullWidth = false,
  style: extraStyle = {},
}) {
  const azul = corEtapa('blue', dark)
  const azulBg = bgEtapa('blue', dark)

  if (variant === 'underline') {
    return (
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${T?.border}`,
        gap: 0,
        ...extraStyle,
      }}>
        {options.map(o => {
          const ativo = value === o.id
          return (
            <button key={o.id} onClick={() => onChange?.(o.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${ativo ? azul : 'transparent'}`,
              color: ativo ? azul : T?.textMuted,
              fontSize: 12.5,
              fontWeight: ativo ? 600 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: -1,
            }}>
              {o.icon && <i className={`ti ${o.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
              {o.label}
              {o.badge != null && <BadgeInline n={o.badge} ativo={ativo} T={T} dark={dark} />}
            </button>
          )
        })}
      </div>
    )
  }

  // segmented
  return (
    <div style={{
      display: 'flex', gap: 6,
      background: T?.card, padding: 4,
      borderRadius: 10,
      border: `1px solid ${T?.border}`,
      boxShadow: T?.shadow,
      width: fullWidth ? '100%' : 'auto',
      ...extraStyle,
    }}>
      {options.map(o => {
        const ativo = value === o.id
        return (
          <button key={o.id} onClick={() => onChange?.(o.id)} style={{
            flex: fullWidth ? 1 : 'initial',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '8px 12px',
            borderRadius: 7,
            border: 'none',
            background: ativo ? azulBg : 'transparent',
            color: ativo ? azul : T?.textMuted,
            fontSize: 12.5,
            fontWeight: ativo ? 700 : 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background .15s, color .15s',
          }}>
            {o.icon && <i className={`ti ${o.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
            {o.label}
            {o.badge != null && <BadgeInline n={o.badge} ativo={ativo} T={T} dark={dark} />}
          </button>
        )
      })}
    </div>
  )
}

function BadgeInline({ n, ativo, T, dark }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700,
      padding: '1px 7px', borderRadius: 10,
      background: ativo ? (dark ? P.blue : P.blueDark) : T?.cardAlt,
      color: ativo ? (dark ? '#0b1220' : '#fff') : T?.textMuted,
      minWidth: 18, textAlign: 'center',
      fontVariantNumeric: 'tabular-nums',
    }}>{n}</span>
  )
}

// ChipToggle — botão "chip" único (filtro on/off). Padrão azul quando ativo.
export function ChipToggle({ T, dark, ativo, onClick, icon, children, cor = 'blue', style: extraStyle = {} }) {
  const azul = corEtapa(cor, dark)
  const azulBg = bgEtapa(cor, dark)
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 10px',
      borderRadius: 14,
      background: ativo ? azulBg : 'transparent',
      border: `1px solid ${ativo ? azul + '55' : T?.border}`,
      color: ativo ? azul : T?.textMuted,
      fontSize: 11.5,
      fontWeight: ativo ? 600 : 500,
      cursor: 'pointer',
      fontFamily: 'inherit',
      transition: 'all .12s',
      ...extraStyle,
    }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 12 }} aria-hidden="true" />}
      {children}
    </button>
  )
}
