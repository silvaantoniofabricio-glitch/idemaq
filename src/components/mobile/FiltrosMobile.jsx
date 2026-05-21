// idemaq-src/components/mobile/FiltrosMobile.jsx
// Barra horizontal de filtros pro OSMobile — chips de zona + ícone de filtro
// (dropdown) pra escolher tipos. 21/05/2026: tipos saíram pra dentro do ícone
// pra deixar a topbar mais limpa (1 linha só).

import React, { useState, useRef, useEffect } from 'react'
import { ZONAS, TIPOS_OS } from '../../utils/osData'
import { corEtapa, bgEtapa } from '../../utils/colors'

export default function FiltrosMobile({ T, dark, filtros, setFiltros }) {
  const azul = corEtapa('blue', dark)
  const azulBg = bgEtapa('blue', dark)
  const [tiposOpen, setTiposOpen] = useState(false)
  const wrapRef = useRef(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!tiposOpen) return
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setTiposOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('touchstart', onDocClick)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick)
    }
  }, [tiposOpen])

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

  // Quantos tipos estão ativos (pra mostrar badge no ícone se for diferente do "todos")
  const totalTipos = Object.keys(TIPOS_OS).length
  const tiposAtivos = filtros.tipos.size
  const tiposFiltrando = tiposAtivos < totalTipos

  return (
    <div style={{
      display: 'flex', gap: 5,
      alignItems: 'center',
    }}>
      {/* Zonas */}
      {zonas.map(z => {
        const ativo = filtros.zona === z.id
        return (
          <button key={z.id} onClick={() => setZona(z.id)}
            style={{
              flex: 1, minWidth: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '7px 6px', borderRadius: 20,
              minHeight: 36,
              background: ativo ? azulBg : T.card,
              border: `1px solid ${ativo ? azul : T.border}`,
              color: ativo ? azul : T.textSecondary,
              fontSize: 12, fontWeight: ativo ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
            <i className={`ti ${z.icon}`} style={{ fontSize: 14, flexShrink: 0 }} aria-hidden="true" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{z.label}</span>
          </button>
        )
      })}

      {/* Ícone de filtro → dropdown com tipos (parte da mesma barra) */}
      <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setTiposOpen(v => !v)}
          aria-label="Filtrar tipos de OS"
          style={{
            width: 36, height: 36, borderRadius: 20,
            background: tiposFiltrando ? azulBg : T.card,
            border: `1px solid ${tiposFiltrando ? azul : T.border}`,
            color: tiposFiltrando ? azul : T.textSecondary,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontFamily: 'inherit',
            position: 'relative',
          }}>
          <i className="ti ti-filter" style={{ fontSize: 16 }} aria-hidden="true" />
          {tiposFiltrando && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 16, height: 16, borderRadius: 8,
              background: azul, color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', boxSizing: 'border-box',
              border: `2px solid ${T.bg}`,
            }}>{tiposAtivos}</span>
          )}
        </button>

        {tiposOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,.18)',
            padding: 6, minWidth: 180,
            zIndex: 100,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: T.textMuted,
              textTransform: 'uppercase', letterSpacing: '.4px',
              padding: '6px 10px 4px',
            }}>Tipo de OS</div>
            {Object.entries(TIPOS_OS).map(([id, cfg]) => {
              const ativo = filtros.tipos.has(id)
              return (
                <button key={id} onClick={() => toggleTipo(id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 8,
                    background: ativo ? azulBg : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: ativo ? azul : T.textSecondary,
                    fontSize: 13, fontWeight: ativo ? 700 : 500,
                    fontFamily: 'inherit', textAlign: 'left', width: '100%',
                  }}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize: 15, width: 16 }} aria-hidden="true" />
                  <span style={{ flex: 1 }}>{cfg.label}</span>
                  {ativo && (
                    <i className="ti ti-check" style={{ fontSize: 14 }} aria-hidden="true" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
