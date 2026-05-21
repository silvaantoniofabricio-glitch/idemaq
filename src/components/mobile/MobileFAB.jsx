// src/components/mobile/MobileFAB.jsx
// Floating Action Button — botão circular flutuante no canto inferior direito.
// Padrão Material Design pra ação primária (ex: "Nova OS", "+ Lançamento").
//
// Position fixed acima do BottomNav, respeitando safe-area.

import React from 'react'

export default function MobileFAB({
  T, dark,
  icon = 'ti-plus',
  label,                    // string opcional — quando passa, vira FAB extended
  onClick,
  cor,                      // override de cor (default = azul Deutan)
  bottom = 76,              // distância do bottom (acima do BottomNav 60px + 16 spacing)
}) {
  const azul = '#5B9BD5'
  const corFinal = cor || azul

  return (
    <button
      onClick={onClick}
      aria-label={label || 'Adicionar'}
      style={{
        position: 'fixed',
        bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`,
        right: 18,
        zIndex: 50,
        background: corFinal,
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        boxShadow: `0 6px 20px ${corFinal}55, 0 2px 6px rgba(0,0,0,0.12)`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: label ? 8 : 0,
        fontFamily: 'inherit',
        fontSize: 15, fontWeight: 700,
        ...(label
          ? { padding: '14px 20px', borderRadius: 28, height: 56 }
          : { width: 56, height: 56, borderRadius: 28 }
        ),
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 22 }} aria-hidden="true" />
      {label && <span>{label}</span>}
    </button>
  )
}
