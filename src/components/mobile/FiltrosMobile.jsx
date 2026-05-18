// idemaq-src/components/mobile/FiltrosMobile.jsx
// Barra horizontal de filtros pro OSMobile — chips de zona e tipo.
// Sem bottom sheet, sem swipe. Mobile-first: scrollable horizontal.

import React from 'react'
import { ZONAS, TIPOS_OS } from '../../utils/osData'
import { corEtapa, bgEtapa } from '../../utils/colors'

export default function FiltrosMobile({ T, dark, filtros, setFiltros }) {
  const azul = corEtapa('blue', dark)
  const azulBg = bgEtapa('blue', dark)

  function setZona(zona) {
    setFiltros(f => ({ ...f, zona }))
  }
  function toggleTipo(tipoId) {
    setFiltros(f => {
      const novo = new Set(f.tipos)
      if (novo.has(tipoId)) {
        if (novo.size === 1) return f // garante pelo menos 1 tipo ativo
        novo.delete(tipoId)
      } else {
        novo.add(tipoId)
      }
      return { ...f, tipos: novo }
    })
  }

  const zonas = [
    { id: 'todos',      label: 'Todos',      icon: 'ti-grid-dots' },
    ...ZONAS,
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Zonas — scrollable horizontal */}
      <div style={{
        display: 'flex', gap: 6,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        paddingBottom: 2,
      }}>
        {zonas.map(z => {
          const ativo = filtros.zona === z.id
          return (
            <button key={z.id} onClick={() => setZona(z.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 20,
                minHeight: 36,
                background: ativo ? azulBg : T.card,
                border: `1px solid ${ativo ? azul : T.border}`,
                color: ativo ? azul : T.textSecondary,
                fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
              <i className={`ti ${z.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
              {z.label}
            </button>
          )
        })}
      </div>

      {/* Tipos — chips com ícone próprio do tipo */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.entries(TIPOS_OS).map(([id, cfg]) => {
          const ativo = filtros.tipos.has(id)
          // Filtros ativos sempre azul (regra do projeto), nunca cor do tipo
          return (
            <button key={id} onClick={() => toggleTipo(id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '6px 11px', borderRadius: 14,
                minHeight: 32,
                background: ativo ? azulBg : 'transparent',
                border: `1px solid ${ativo ? azul : T.border}`,
                color: ativo ? azul : T.textMuted,
                fontSize: 11.5, fontWeight: ativo ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <i className={`ti ${cfg.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
              {cfg.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
