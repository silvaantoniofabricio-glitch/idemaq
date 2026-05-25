// idemaq-src/components/mobile/FiltrosMobile.jsx
// Barra horizontal de filtros pro OSMobile.
// Chips de zona + botão "Mais" (mesmo estilo dos chips) que abre bottom sheet
// com: barra de busca, botão Nova OS e filtro de tipos.

import React, { useState, useEffect } from 'react'
import { P } from '../../theme'
import { ZONAS, TIPOS_OS } from '../../utils/osData'
import { corEtapa, bgEtapa } from '../../utils/colors'

export default function FiltrosMobile({ T, dark, filtros, setFiltros, busca, setBusca, onNova }) {
  const azul   = corEtapa('blue', dark)
  const azulBg = bgEtapa('blue', dark)
  const [maisOpen, setMaisOpen] = useState(false)

  function setZona(zona) { setFiltros(f => ({ ...f, zona })) }

  function toggleTipo(tipoId) {
    setFiltros(f => {
      const novo = new Set(f.tipos)
      if (novo.has(tipoId)) {
        if (novo.size === 1) return f
        novo.delete(tipoId)
      } else {
        novo.add(tipoId)
      }
      return { ...f, tipos: novo }
    })
  }

  const zonas = [
    { id: 'todos', label: 'Todos', icon: 'ti-grid-dots' },
    ...ZONAS,
  ]

  const totalTipos   = Object.keys(TIPOS_OS).length
  const tiposAtivos  = filtros.tipos.size
  const tiposFiltrando = tiposAtivos < totalTipos
  const temBusca     = busca && busca.trim().length > 0
  const maisAtivo    = maisOpen || tiposFiltrando || temBusca

  return (
    <>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {/* Chips de zona */}
        {zonas.map(z => {
          const ativo = filtros.zona === z.id
          return (
            <button key={z.id} onClick={() => setZona(z.id)}
              style={{
                flex: 1, minWidth: 0,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '7px 4px', borderRadius: 20,
                minHeight: 32,
                background: ativo ? azulBg : T.card,
                border: `1px solid ${ativo ? azul : T.border}`,
                color: ativo ? azul : T.textSecondary,
                fontSize: 11.5, fontWeight: ativo ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
              <i className={`ti ${z.icon}`} style={{ fontSize: 13, flexShrink: 0 }} aria-hidden="true" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{z.label}</span>
            </button>
          )
        })}

        {/* Botão "Mais" — mesmo estilo dos chips de zona */}
        <button
          onClick={() => setMaisOpen(true)}
          style={{
            flex: 1, minWidth: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '7px 4px', borderRadius: 20,
            minHeight: 32,
            background: maisAtivo ? azulBg : T.card,
            border: `1px solid ${maisAtivo ? azul : T.border}`,
            color: maisAtivo ? azul : T.textSecondary,
            fontSize: 11.5, fontWeight: maisAtivo ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit',
            position: 'relative',
          }}>
          <i className="ti ti-dots" style={{ fontSize: 13 }} aria-hidden="true" />
          <span>Mais</span>
          {/* Badge quando há filtro ou busca ativa */}
          {(tiposFiltrando || temBusca) && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              minWidth: 14, height: 14, borderRadius: 7,
              background: azul, color: '#fff',
              fontSize: 9, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', boxSizing: 'border-box',
              border: `2px solid ${T.bg}`,
            }}>
              {(tiposFiltrando ? 1 : 0) + (temBusca ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Bottom sheet "Mais" */}
      {maisOpen && (
        <MaisSheet
          T={T} dark={dark}
          busca={busca} setBusca={setBusca}
          onNova={() => { setMaisOpen(false); onNova?.() }}
          filtros={filtros} toggleTipo={toggleTipo}
          tiposFiltrando={tiposFiltrando}
          azul={azul} azulBg={azulBg}
          onClose={() => setMaisOpen(false)}
        />
      )}
    </>
  )
}

function MaisSheet({ T, dark, busca, setBusca, onNova, filtros, toggleTipo, tiposFiltrando, azul, azulBg, onClose }) {
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setMontado(true))
    function onEsc(e) { if (e.key === 'Escape') fechar() }
    document.addEventListener('keydown', onEsc)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fechar() {
    setMontado(false)
    setTimeout(onClose, 180)
  }

  const inputRef = React.useRef(null)
  // Foca a busca ao abrir
  useEffect(() => {
    if (montado) setTimeout(() => inputRef.current?.focus(), 80)
  }, [montado])

  return (
    <div
      onClick={fechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-end',
        opacity: montado ? 1 : 0,
        transition: 'opacity .18s ease-out',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: T.card,
          borderRadius: '18px 18px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.35)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          transform: montado ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .22s cubic-bezier(.2,.8,.2,1)',
        }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 6px' }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: T.border }} />
        </div>

        {/* Busca + Nova OS */}
        <div style={{ padding: '4px 14px 14px', display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              fontSize: 15, color: T.textDim, pointerEvents: 'none',
            }} aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar OS, cliente, marca…"
              style={{
                width: '100%', padding: '10px 12px 10px 34px',
                borderRadius: 10, border: `1px solid ${T.border}`,
                background: T.cardAlt, color: T.textPrimary,
                fontSize: 14, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            onClick={onNova}
            aria-label="Nova OS"
            style={{
              width: 44, borderRadius: 10,
              border: 'none', cursor: 'pointer',
              background: '#5B9BD5', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontFamily: 'inherit',
            }}>
            <i className="ti ti-plus" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>

        {/* Divisor */}
        <div style={{ height: 1, background: T.border, margin: '0 14px 12px' }} />

        {/* Tipos de OS */}
        <div style={{ padding: '0 8px 4px' }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: T.textMuted,
            textTransform: 'uppercase', letterSpacing: '.5px',
            padding: '0 8px 8px',
          }}>Tipo de OS</div>
          {Object.entries(TIPOS_OS).map(([id, cfg]) => {
            const ativo = filtros.tipos.has(id)
            return (
              <button key={id} onClick={() => toggleTipo(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 10px', borderRadius: 10, width: '100%',
                  background: ativo ? azulBg : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: ativo ? azul : T.textSecondary,
                  fontSize: 14, fontWeight: ativo ? 700 : 500,
                  fontFamily: 'inherit', textAlign: 'left',
                  boxSizing: 'border-box',
                }}>
                <i className={`ti ${cfg.icon}`} style={{ fontSize: 18, width: 20, flexShrink: 0 }} aria-hidden="true" />
                <span style={{ flex: 1 }}>{cfg.label}</span>
                <div style={{
                  width: 20, height: 20, borderRadius: 6,
                  border: `2px solid ${ativo ? azul : T.border}`,
                  background: ativo ? azul : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all .12s',
                }}>
                  {ativo && <i className="ti ti-check" style={{ fontSize: 12, color: '#fff' }} aria-hidden="true" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Botão fechar */}
        <div style={{ padding: '12px 14px 0' }}>
          <button onClick={fechar} style={{
            width: '100%', padding: '13px',
            borderRadius: 12, border: `1px solid ${T.border}`,
            background: 'transparent', color: T.textSecondary,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
