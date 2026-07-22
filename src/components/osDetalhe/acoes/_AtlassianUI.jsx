// src/components/osDetalhe/acoes/_AtlassianUI.jsx
// Primitivas visuais de Atlassian Design (atlassian.design) usadas pelas
// etapas reescritas (Orcamento, Coleta, etc).
//
// Mantem a paleta Deutan do projeto (5B9BD5 azul, FFD966 amarelo, c04242
// vermelho) — Atlassian fornece so estrutura, spacing, tipografia.
//
// Originalmente duplicado em AcaoOrcamentoHIG.jsx; aqui mora a versao
// canonica. Outros consumidores devem importar deste arquivo.

import React, { useState } from 'react'
import { corEtapa } from '../../../utils/colors'

export const ATL_RADIUS = 4
export const ATL_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'

export function atlSurfaceSunken(dark) {
  return dark ? 'rgba(255,255,255,0.025)' : '#F7F8F9'
}
export function atlHover(dark) {
  return dark ? 'rgba(255,255,255,0.04)' : 'rgba(9,30,66,0.04)'
}

// Card/panel Atlassian — borda + sombra sutil, radius 4, header com hairline
export function AtlPanel({ T, dark, title, action, count, footer, children, accent }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: ATL_RADIUS,
      overflow: 'hidden',
      fontFamily: ATL_FONT,
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      {(title || action) && (
        <div style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
          background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
        }}>
          {accent && (
            <div style={{
              width: 3, alignSelf: 'stretch', borderRadius: 99,
              background: accent, minHeight: 14, flexShrink: 0,
            }} />
          )}
          <div style={{
            fontSize: 13, fontWeight: 600, color: T.textPrimary,
            letterSpacing: '-0.005em', flex: 1,
          }}>
            {title}
          </div>
          {count != null && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: T.textMuted,
              background: dark ? 'rgba(255,255,255,0.07)' : '#DFE1E6',
              padding: '2px 7px', borderRadius: 99,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {count}
            </span>
          )}
          {action}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div style={{
          padding: '8px 14px',
          borderTop: `1px solid ${T.border}`,
          background: atlSurfaceSunken(dark),
          fontSize: 12, color: T.textMuted,
        }}>
          {footer}
        </div>
      )}
    </div>
  )
}

// Botão Atlassian (primary/subtle/default)
export function AtlButton({ T, dark, variant = 'default', icon, onClick, disabled, children, fullWidth, type = 'button' }) {
  const [hover, setHover] = useState(false)
  const azul = corEtapa('blue', dark)

  const styles = variant === 'primary'
    ? {
        background: hover ? '#4a8bc8' : azul,
        color: '#fff',
        border: 'none',
      }
    : variant === 'subtle'
      ? {
          background: hover ? atlHover(dark) : 'transparent',
          color: azul,
          border: 'none',
        }
      : {
          background: hover
            ? (dark ? 'rgba(255,255,255,0.08)' : '#EBECF0')
            : (dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7'),
          color: T.textPrimary,
          border: `1px solid ${T.border}`,
        }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles,
        padding: '7px 12px', borderRadius: 3,
        fontSize: 13.5, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: ATL_FONT,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        width: fullWidth ? '100%' : undefined,
        minHeight: 32, letterSpacing: '-0.005em',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s',
      }}>
      {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
      {children}
    </button>
  )
}

// Botão de texto Atlassian (link/action)
export function AtlTextButton({ T, dark, onClick, icon, children, disabled }) {
  const azul = corEtapa('blue', dark)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent', border: 'none',
        padding: '4px 6px', borderRadius: 3,
        fontSize: 12.5, fontWeight: 500,
        color: disabled ? T.textDim : azul,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        WebkitTapHighlightColor: 'transparent',
      }}>
      {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 13 }} aria-hidden="true" />}
      {children}
    </button>
  )
}

// List row Atlassian — usado em listas dentro de panels (acoes, documentos…)
// Icone tintado a esquerda, label+subtitle no centro, chevron direita
export function AtlListRow({ T, dark, icon, iconCor, label, subtitle, onClick, disabled, first }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderTop: first ? 'none' : `1px solid ${T.border}`,
        background: hover && !disabled ? atlHover(dark) : 'transparent',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: ATL_FONT,
        display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s',
      }}>
      <div style={{
        width: 28, height: 28, borderRadius: 4,
        background: iconCor + '22', color: iconCor,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: T.textPrimary,
          letterSpacing: '-0.005em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{label}</div>
        {subtitle && (
          <div style={{
            fontSize: 11.5, color: T.textMuted, marginTop: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{subtitle}</div>
        )}
      </div>
      {!disabled && (
        <i className="ti ti-chevron-right" style={{
          fontSize: 13, color: T.textDim, flexShrink: 0,
        }} aria-hidden="true" />
      )}
    </button>
  )
}

// List row com indicador de seleção (checkbox ou radio) — usado em filtros/
// preferências onde a linha inteira é o toggle (não navega pra outro lugar,
// ao contrário do AtlListRow que tem chevron).
export function AtlListRowCheck({ T, dark, icon, label, checked, onClick, first, radio }) {
  const [hover, setHover] = useState(false)
  const azul = corEtapa('blue', dark)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderTop: first ? 'none' : `1px solid ${T.border}`,
        background: checked
          ? (dark ? 'rgba(91,155,213,0.10)' : 'rgba(91,155,213,0.06)')
          : (hover ? atlHover(dark) : 'transparent'),
        border: 'none', cursor: 'pointer',
        fontFamily: ATL_FONT,
        display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s',
      }}>
      <i className={`ti ti-${icon}`}
         style={{ fontSize: 15, width: 18, flexShrink: 0, color: checked ? azul : T.textMuted }}
         aria-hidden="true" />
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: 13, fontWeight: checked ? 600 : 500,
        color: checked ? T.textPrimary : T.textPrimary,
        letterSpacing: '-0.005em',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</span>
      <div style={{
        width: 18, height: 18, flexShrink: 0,
        borderRadius: radio ? '50%' : 4,
        border: `1.5px solid ${checked ? azul : T.border}`,
        background: checked && !radio ? azul : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .12s',
      }}>
        {checked && (radio
          ? <div style={{ width: 9, height: 9, borderRadius: '50%', background: azul }} />
          : <i className="ti ti-check" style={{ fontSize: 12, color: '#fff' }} aria-hidden="true" />)}
      </div>
    </button>
  )
}

// Chip de filtro — pill compacta com ícone + label, preenchida quando
// selecionada. Pra grupos de facetas (zona/tipo/status) em vez de lista
// vertical de checkbox — mais moderno e não vira parede azul quando "tudo"
// está selecionado (o padrão comum é ficar tudo desmarcado/neutro).
export function AtlChip({ T, dark, icon, label, selected, onClick, count }) {
  const [hover, setHover] = useState(false)
  const azul = corEtapa('blue', dark)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 10px',
        borderRadius: 99,
        border: `1px solid ${selected ? azul : T.border}`,
        background: selected
          ? azul
          : (hover ? atlHover(dark) : (dark ? 'rgba(255,255,255,0.025)' : '#FAFBFC')),
        color: selected ? '#fff' : T.textPrimary,
        fontSize: 13, fontWeight: selected ? 600 : 500,
        fontFamily: ATL_FONT, cursor: 'pointer',
        letterSpacing: '-0.005em', whiteSpace: 'nowrap',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}>
      {icon && (
        <i className={`ti ti-${icon}`}
           style={{ fontSize: 14, color: selected ? '#fff' : T.textMuted }}
           aria-hidden="true" />
      )}
      {label}
      {count != null && count > 0 && (
        <span style={{
          padding: '0 5px', borderRadius: 8, minWidth: 16, textAlign: 'center',
          background: selected ? 'rgba(255,255,255,0.28)' : (dark ? 'rgba(255,255,255,0.08)' : '#DFE1E6'),
          color: selected ? '#fff' : T.textMuted,
          fontSize: 10.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
        }}>{count}</span>
      )}
    </button>
  )
}

// Day chip — usado em pickers de agenda/entrega (50x58 com DOW + dia grande)
export function AtlDayChip({ T, dark, dia, dow, selected, onClick }) {
  const azul = corEtapa('blue', dark)
  return (
    <button type="button" onClick={onClick}
      style={{
        flex: '0 0 auto', width: 50, height: 58,
        borderRadius: ATL_RADIUS,
        border: `1px solid ${selected ? azul : T.border}`,
        background: selected ? azul : (dark ? 'rgba(255,255,255,0.025)' : '#FAFBFC'),
        color: selected ? '#fff' : T.textPrimary,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        cursor: 'pointer', fontFamily: ATL_FONT,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}>
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.85)' : T.textMuted,
        letterSpacing: '0.06em',
      }}>{dow}</span>
      <span style={{
        fontSize: 20, fontWeight: 600,
        color: selected ? '#fff' : T.textPrimary,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
      }}>{dia}</span>
    </button>
  )
}

// Segmented control Atlassian (Manhã / Tarde / Noite e similares)
export function AtlSegmented({ T, dark, options, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
      borderRadius: 3, padding: 2, gap: 0,
    }}>
      {options.map(o => {
        const sel = o.id === value
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            style={{
              flex: 1, minHeight: 32,
              border: 'none', borderRadius: 3,
              background: sel ? (dark ? '#22272B' : '#FFFFFF') : 'transparent',
              color: sel ? (dark ? '#fff' : T.textPrimary) : T.textMuted,
              fontSize: 13, fontWeight: sel ? 600 : 500,
              fontFamily: ATL_FONT, cursor: 'pointer',
              boxShadow: sel
                ? (dark
                    ? '0 1px 2px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,0.05)'
                    : '0 1px 2px rgba(9,30,66,0.18), 0 0 0 1px rgba(9,30,66,0.05)')
                : 'none',
              letterSpacing: '-0.005em',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background .12s, box-shadow .12s',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Chip de horário (mono, border subtil, selecionado em azul cheio)
export function AtlTimeChip({ T, dark, label, selected, onClick }) {
  const [hover, setHover] = useState(false)
  const azul = corEtapa('blue', dark)
  return (
    <button type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minHeight: 32, padding: '4px 8px',
        borderRadius: 3,
        border: `1px solid ${selected ? azul : T.border}`,
        background: selected ? azul : (hover ? atlHover(dark) : 'transparent'),
        color: selected ? '#fff' : T.textPrimary,
        fontSize: 13, fontWeight: selected ? 600 : 500,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        fontVariantNumeric: 'tabular-nums',
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}>
      {label}
    </button>
  )
}

// Field row Atlassian — label esquerda + input direita inline
export function AtlFieldRow({ T, dark, label, value, onChange, placeholder, mono, first, type = 'text' }) {
  const [focusado, setFocusado] = useState(false)
  return (
    <div style={{
      padding: '8px 14px',
      borderTop: first ? 'none' : `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', gap: 12,
      background: focusado ? (dark ? 'rgba(91,155,213,0.04)' : 'rgba(91,155,213,0.03)') : 'transparent',
      transition: 'background .12s',
    }}>
      <label style={{
        fontSize: 13, color: T.textPrimary, fontWeight: 500,
        minWidth: 100, flexShrink: 0,
        letterSpacing: '-0.005em',
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocusado(true)}
        onBlur={() => setFocusado(false)}
        style={{
          flex: 1, minWidth: 0,
          border: 'none', background: 'transparent', outline: 'none',
          fontSize: 13, color: T.textPrimary,
          textAlign: 'right',
          fontFamily: mono
            ? 'ui-monospace, "SF Mono", "Menlo", Consolas, monospace'
            : ATL_FONT,
        }}
      />
    </div>
  )
}
