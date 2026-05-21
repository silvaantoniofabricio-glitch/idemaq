// src/components/mobile/MobilePageHeader.jsx
// Header sticky pra páginas mobile.
//
// Substitui o PageHeader desktop quando isMobile=true. Layout otimizado pra
// tela pequena: título grande no topo, KPIs em grid 2x2 abaixo (não em linha),
// botões touch-friendly (44px+).
//
// Variantes:
//   compact (default): título + subtítulo + ação opcional
//   stats: + grid 2x2 ou 4 colunas de KPIs

import React from 'react'

export default function MobilePageHeader({
  T, dark,
  title,
  subtitle,
  stats = [],          // [{ label, value, color }]
  action,              // ReactNode (botão primário) à direita do título
  onBack,              // callback opcional → mostra botão back
  sticky = false,      // gruda no topo durante scroll
}) {
  return (
    <div style={{
      padding: '12px 14px 10px',
      background: T?.bg,
      position: sticky ? 'sticky' : 'static',
      top: 0, zIndex: 5,
    }}>
      {/* Linha do título + ação */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        marginBottom: subtitle ? 4 : 6,
      }}>
        {onBack && (
          <button onClick={onBack} aria-label="Voltar"
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: T?.cardAlt, border: `1px solid ${T?.border}`,
              color: T?.textSecondary, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit', flexShrink: 0, marginTop: 1,
            }}>
            <i className="ti ti-chevron-left" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, color: T?.textPrimary,
            letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>{title}</div>
          {subtitle && (
            <div style={{ fontSize: 12, color: T?.textMuted, marginTop: 3 }}>{subtitle}</div>
          )}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>

      {/* KPI grid */}
      {stats.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: stats.length <= 2 ? '1fr 1fr' : '1fr 1fr',
          gap: 8,
          marginTop: 8,
        }}>
          {stats.map((s, i) => (
            <div key={i} style={{
              background: T?.cardAlt,
              border: `1px solid ${T?.border}`,
              borderRadius: 10,
              padding: '10px 12px',
            }}>
              <div style={{
                fontSize: 10, color: T?.textMuted, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.3px',
                marginBottom: 3,
              }}>{s.label}</div>
              <div style={{
                fontSize: 18, fontWeight: 700,
                color: s.color || T?.textPrimary,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-.01em',
              }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
