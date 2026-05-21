// src/components/mobile/MobileChipFilter.jsx
// Linha horizontal de chips de filtro com scroll-x suave (snap).
// Padrão usado em apps tipo Uber, iFood, Bling Mobile.

import React from 'react'

export default function MobileChipFilter({
  T, dark,
  opcoes = [],         // [{ id, label, icon?, badge? }]
  ativos,              // Set<id> ou string única (modo single)
  onToggle,            // (id) → multi: toggleSet; single: setAtivo(id)
  modo = 'multi',      // 'multi' | 'single'
  azul = '#5B9BD5',
}) {
  function isAtivo(id) {
    if (modo === 'single') return ativos === id
    return ativos?.has?.(id)
  }
  return (
    <div style={{
      display: 'flex', gap: 6,
      padding: '6px 14px 10px',
      overflowX: 'auto',
      WebkitOverflowScrolling: 'touch',
      scrollSnapType: 'x proximity',
      // esconde scrollbar (Webkit)
      scrollbarWidth: 'none',
    }}
      className="idemaq-no-scrollbar"
    >
      {opcoes.map(o => {
        const ativo = isAtivo(o.id)
        return (
          <button key={o.id}
            onClick={() => onToggle?.(o.id)}
            style={{
              flexShrink: 0,
              scrollSnapAlign: 'start',
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '8px 14px',
              borderRadius: 18,
              border: `1px solid ${ativo ? azul : T?.border}`,
              background: ativo ? `${azul}15` : T?.card,
              color: ativo ? azul : T?.textSecondary,
              fontSize: 12.5, fontWeight: ativo ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              minHeight: 36, // touch target
              whiteSpace: 'nowrap',
            }}>
            {o.icon && <i className={`ti ${o.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />}
            <span>{o.label}</span>
            {o.badge != null && (
              <span style={{
                background: ativo ? azul : T?.textMuted,
                color: '#fff',
                fontSize: 9.5, fontWeight: 700,
                padding: '1px 5px', borderRadius: 8,
                marginLeft: 2,
              }}>{o.badge}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
