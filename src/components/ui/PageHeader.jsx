// idemaq-src/components/ui/PageHeader.jsx
// Header padrão de toda página — segue o modelo da página de OS (Kanban):
//   título inline + subtítulo opcional + stats horizontais separadas por "·"
//   + actions à direita. Tudo em uma única linha (com flex-wrap pra mobile).
//
// Diferente do layout anterior (stats em coluna à direita com label uppercase
// embaixo do valor), agora segue o padrão minimalista da Kanban.
//
// API mantida — todas as páginas que usam `<PageHeader title subtitle stats actions />`
// continuam funcionando sem mudança.

import React from 'react'

export default function PageHeader({
  T, dark,
  title,
  subtitle,
  stats = [],       // [{ label, value, color }] — value=0 cai pra textDim
  actions,          // ReactNode (botões à direita)
  style: extraStyle = {},
}) {
  const tituloColor = dark ? '#f1f5f9' : '#0a0a0d'

  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 14, flexWrap: 'wrap',
      ...extraStyle,
    }}>
      {/* Esquerda: título + subtítulo + stats inline */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', minWidth: 0 }}>
        <h2 style={{
          fontSize: 20, fontWeight: 700,
          color: tituloColor,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          margin: 0,
          whiteSpace: 'nowrap',
        }}>
          {title}
        </h2>

        {(subtitle || stats.length > 0) && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {subtitle && (
              <span style={{ fontSize: 11.5, color: T?.textMuted }}>{subtitle}</span>
            )}
            {stats.map((s, i) => {
              const cor = (Number(s.value) > 0 || s.value === '—') ? (s.color || T?.textPrimary) : T?.textDim
              return (
                <React.Fragment key={`${s.label}-${i}`}>
                  {(i > 0 || subtitle) && <span style={{ color: T?.textDim, fontSize: 10 }}>·</span>}
                  <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 5, fontSize: 11.5 }}>
                    <span style={{
                      fontWeight: 700, color: cor,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {s.value}
                    </span>
                    <span style={{ color: T?.textMuted }}>{s.label}</span>
                  </span>
                </React.Fragment>
              )
            })}
          </div>
        )}
      </div>

      {/* Direita: actions (botões) */}
      {actions && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
