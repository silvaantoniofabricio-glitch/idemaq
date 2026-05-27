// src/components/_shared/HIGPrimitives.jsx
// Primitivos visuais Apple HIG compartilhados entre todas as etapas.
// Substitui as varias copias locais de SubBloco/Card por uma versao unica.

import React from 'react'
import { TI, PALETA } from './PrimitivasMobile'
import { higType, HIG_SPACE, HIG_RADIUS, HIG_COLOR, HIG_FONT, HIG_FONT_MONO } from '../../theme-hig'

// ─── HIG Section ──────────────────────────────────────────────────────────
// Section header uppercase fora do card + inset grouped card embaixo.
// Compatibilidade: aceita as mesmas props que o antigo SubBloco
// (icon, label, color, action, children) — icon/color ficam ignorados pra
// alinhar com o estilo HIG (que usa so o header de texto cinza).
export function HIGSubBloco({ T, dark, label, action, children, footer, icon, color }) {
  return (
    <section>
      {(label || action) && (
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
          minHeight: 18,
        }}>
          <span style={{
            ...higType('footnote'),
            color: T.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>{label}</span>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{
        background: T.card,
        borderRadius: HIG_RADIUS.card,
        overflow: 'hidden',
        fontFamily: HIG_FONT,
      }}>
        <div style={{ padding: HIG_SPACE.md }}>{children}</div>
      </div>
      {footer && (
        <div style={{
          ...higType('footnote'),
          color: T.textMuted,
          padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px 0`,
        }}>{footer}</div>
      )}
    </section>
  )
}

// ─── HIG Bordered Prominent Button (CTA principal) ────────────────────────
export function HIGFilledButton({ T, dark, icon, children, disabled, onClick, danger, style, ...rest }) {
  return (
    <button onClick={onClick} disabled={disabled} {...rest}
      style={{
        minHeight: 50, padding: '0 16px',
        borderRadius: 12, border: 'none',
        background: danger ? HIG_COLOR.red : HIG_COLOR.tintIdemaq,
        color: '#FFFFFF',
        ...higType('headline'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        WebkitTapHighlightColor: 'transparent',
        fontFamily: HIG_FONT,
        width: '100%',
        ...style,
      }}>
      {icon && <TI name={icon} size={18} />}
      {children}
    </button>
  )
}

// ─── HIG Tinted Button (secundario) ───────────────────────────────────────
export function HIGTintedButton({ T, dark, icon, children, disabled, onClick, style, ...rest }) {
  return (
    <button onClick={onClick} disabled={disabled} {...rest}
      style={{
        minHeight: 44, padding: '0 16px',
        borderRadius: 10, border: 'none',
        background: dark ? 'rgba(91,155,213,0.18)' : 'rgba(91,155,213,0.15)',
        color: HIG_COLOR.tintIdemaq,
        ...higType('headline'),
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        WebkitTapHighlightColor: 'transparent',
        fontFamily: HIG_FONT,
        ...style,
      }}>
      {icon && <TI name={icon} size={16} />}
      {children}
    </button>
  )
}

// ─── HIG Plain Button (so texto azul) ─────────────────────────────────────
export function HIGPlainButton({ T, dark, children, onClick, ...rest }) {
  return (
    <button onClick={onClick} {...rest}
      style={{
        minHeight: 44, padding: '0 8px',
        border: 'none', background: 'transparent',
        color: HIG_COLOR.tintIdemaq,
        ...higType('body'),
        cursor: 'pointer', fontFamily: HIG_FONT,
        display: 'inline-flex', alignItems: 'center', gap: 4,
        WebkitTapHighlightColor: 'transparent',
      }}>
      {children}
    </button>
  )
}

// ─── HIG List Row (com chevron) ───────────────────────────────────────────
export function HIGListRow({ T, dark, icon, iconColor, label, subtitle, accessory, onClick, disabled, separator }) {
  return (
    <>
      <button type="button" onClick={onClick} disabled={disabled}
        style={{
          width: '100%', minHeight: 44,
          padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
          border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          textAlign: 'left', fontFamily: HIG_FONT,
          WebkitTapHighlightColor: 'transparent',
        }}>
        {icon && (
          <span style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: (iconColor || HIG_COLOR.tintIdemaq) + '22',
            color: iconColor || HIG_COLOR.tintIdemaq,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TI name={icon} size={16} />
          </span>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...higType('body'), color: T.textPrimary }}>{label}</div>
          {subtitle && (
            <div style={{
              ...higType('footnote'), color: T.textMuted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{subtitle}</div>
          )}
        </div>
        {accessory !== undefined ? accessory : <TI name="chevron-right" size={14} color={T.textDim} />}
      </button>
      {separator && (
        <div style={{
          height: 0.5, background: T.border,
          marginLeft: HIG_SPACE.md + (icon ? 28 + HIG_SPACE.sm : 0),
        }} />
      )}
    </>
  )
}

// ─── HIG Field Row (label + input alinhado direita) ───────────────────────
export function HIGFieldRow({ T, dark, label, value, onChange, placeholder, mono, separator, type = 'text' }) {
  return (
    <>
      <div style={{
        minHeight: 44,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
      }}>
        <span style={{ ...higType('body'), color: T.textPrimary, minWidth: 110 }}>{label}</span>
        <input
          type={type}
          value={value || ''} onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1, minWidth: 0,
            border: 'none', background: 'transparent', outline: 'none',
            ...higType('body'),
            color: T.textPrimary,
            textAlign: 'right',
            fontFamily: mono ? HIG_FONT_MONO : HIG_FONT,
          }}
        />
      </div>
      {separator && <div style={{ height: 0.5, background: T.border, marginLeft: HIG_SPACE.md }} />}
    </>
  )
}

// ─── HIG Segmented Control ────────────────────────────────────────────────
export function HIGSegmented({ T, dark, options, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: dark ? 'rgba(118,118,128,0.24)' : '#E9E9EB',
      borderRadius: 9, padding: 2, gap: 0,
    }}>
      {options.map(o => {
        const sel = o.id === value
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            style={{
              flex: 1, minHeight: 32, border: 'none', borderRadius: 7,
              background: sel ? (dark ? '#636366' : '#FFFFFF') : 'transparent',
              color: T.textPrimary,
              ...higType('subheadline'),
              fontWeight: sel ? 600 : 400,
              cursor: 'pointer',
              boxShadow: sel ? '0 3px 8px rgba(0,0,0,0.12)' : 'none',
              transition: 'background .15s',
              WebkitTapHighlightColor: 'transparent',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── HIG Section Wrapper (container das etapas inteiras) ──────────────────
// Gap entre sections + safe padding bottom.
export function HIGScreen({ children, gap = HIG_SPACE.lg }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap, fontFamily: HIG_FONT,
    }}>
      {children}
    </div>
  )
}
