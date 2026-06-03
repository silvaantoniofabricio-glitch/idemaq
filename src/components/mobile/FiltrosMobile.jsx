// src/components/mobile/FiltrosMobile.jsx
// Barra de filtros do OSMobile — Atlassian Design (reescrito 28/05/2026).
//
// Estrutura:
//   - Segmented control de zonas (Todos / Externo / Interno / Financeiro
//     / Mais) com badge contador no Mais quando ha filtros ativos
//   - Bottom sheet 'Mais' com:
//     * busca + botao Nova OS azul Atlassian
//     * lista de tipos de OS (Atendimento/Fabricacao/Venda) com toggle
//       checkbox cor primaria
//     * botao Fechar default secondary

import React, { useState, useEffect, useRef } from 'react'
import { ZONAS, TIPOS_OS } from '../../utils/osData'
import { corEtapa } from '../../utils/colors'

const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const ATL_RADIUS = 4

export default function FiltrosMobile({ T, dark, filtros, setFiltros, busca, setBusca, onNova }) {
  const azul = corEtapa('blue', dark)
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

  const totalTipos     = Object.keys(TIPOS_OS).length
  const tiposAtivos    = filtros.tipos.size
  const tiposFiltrando = tiposAtivos < totalTipos
  const temBusca       = busca && busca.trim().length > 0
  const maisAtivo      = maisOpen || tiposFiltrando || temBusca
  const contadorMais   = (tiposFiltrando ? 1 : 0) + (temBusca ? 1 : 0)

  // Segmented control Atlassian
  const segBg = dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7'

  return (
    <>
      <div style={{
        display: 'flex',
        background: segBg,
        borderRadius: 3, padding: 2, gap: 0,
        fontFamily: ATL_FONT,
      }}>
        {zonas.map(z => {
          const ativo = filtros.zona === z.id
          return (
            <button key={z.id} onClick={() => setZona(z.id)}
              style={{
                flex: 1, minWidth: 0, minHeight: 30,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '5px 4px',
                borderRadius: 3, border: 'none',
                background: ativo ? (dark ? '#22272B' : '#FFFFFF') : 'transparent',
                color: ativo ? T.textPrimary : T.textMuted,
                fontSize: 11.5, fontWeight: ativo ? 600 : 500,
                fontFamily: ATL_FONT, cursor: 'pointer',
                boxShadow: ativo
                  ? (dark
                      ? '0 1px 2px rgba(0,0,0,.4)'
                      : '0 1px 2px rgba(9,30,66,0.18)')
                  : 'none',
                letterSpacing: '-0.005em',
                whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
                WebkitTapHighlightColor: 'transparent',
                transition: 'background .12s, box-shadow .12s',
              }}>
              <i className={`ti ${z.icon}`}
                 style={{ fontSize: 12, flexShrink: 0 }}
                 aria-hidden="true" />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {z.label}
              </span>
            </button>
          )
        })}

        {/* Botao Mais */}
        <button
          onClick={() => setMaisOpen(true)}
          style={{
            flex: '0 0 auto', minHeight: 30,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: '5px 8px',
            borderRadius: 3, border: 'none',
            background: maisAtivo ? (dark ? '#22272B' : '#FFFFFF') : 'transparent',
            color: maisAtivo ? T.textPrimary : T.textMuted,
            fontSize: 11.5, fontWeight: maisAtivo ? 600 : 500,
            fontFamily: ATL_FONT, cursor: 'pointer',
            position: 'relative',
            boxShadow: maisAtivo
              ? (dark ? '0 1px 2px rgba(0,0,0,.4)' : '0 1px 2px rgba(9,30,66,0.18)')
              : 'none',
            letterSpacing: '-0.005em',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background .12s, box-shadow .12s',
          }}>
          <i className="ti ti-dots" style={{ fontSize: 12 }} aria-hidden="true" />
          <span>Mais</span>
          {contadorMais > 0 && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              minWidth: 13, height: 13, borderRadius: 99,
              background: azul, color: '#fff',
              fontSize: 9, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', boxSizing: 'border-box',
              border: `2px solid ${T.bg}`,
              fontVariantNumeric: 'tabular-nums',
            }}>{contadorMais}</span>
          )}
        </button>

        {/* Botão + Nova OS */}
        <button
          onClick={onNova}
          aria-label="Nova OS"
          style={{
            flex: '0 0 30px', minHeight: 30,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 3, border: 'none',
            background: azul, color: '#fff',
            cursor: 'pointer', fontFamily: ATL_FONT,
            WebkitTapHighlightColor: 'transparent',
            marginLeft: 2,
          }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
        </button>
      </div>

      {/* Bottom sheet Mais */}
      {maisOpen && (
        <MaisSheet
          T={T} dark={dark}
          busca={busca} setBusca={setBusca}
          onNova={() => { setMaisOpen(false); onNova?.() }}
          filtros={filtros} toggleTipo={toggleTipo}
          onClose={() => setMaisOpen(false)}
        />
      )}
    </>
  )
}

// ─── Bottom sheet Mais ────────────────────────────────────────────────────
function MaisSheet({ T, dark, busca, setBusca, onNova, filtros, toggleTipo, onClose }) {
  const azul = corEtapa('blue', dark)
  const [montado, setMontado] = useState(false)
  const inputRef = useRef(null)

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

  useEffect(() => {
    if (montado) setTimeout(() => inputRef.current?.focus(), 80)
  }, [montado])

  function fechar() {
    setMontado(false)
    setTimeout(onClose, 180)
  }

  return (
    <div
      onClick={fechar}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(9,30,66,0.5)',
        backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-end',
        opacity: montado ? 1 : 0,
        transition: 'opacity .18s ease-out',
        fontFamily: ATL_FONT,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: T.card,
          borderRadius: '8px 8px 0 0',
          boxShadow: '0 -8px 32px rgba(9,30,66,0.35)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)',
          transform: montado ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform .22s cubic-bezier(.2,.8,.2,1)',
        }}>

        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          <div style={{
            width: 36, height: 3, borderRadius: 2,
            background: dark ? 'rgba(255,255,255,0.15)' : '#DFE1E6',
          }} />
        </div>

        {/* Busca + Nova OS */}
        <div style={{ padding: '8px 14px 14px', display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: T.textMuted, pointerEvents: 'none',
            }} aria-hidden="true" />
            <input
              ref={inputRef}
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar OS, cliente, marca…"
              style={{
                width: '100%', height: 36,
                padding: '0 12px 0 32px',
                borderRadius: 3,
                border: `1px solid ${T.border}`,
                background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
                color: T.textPrimary,
                fontSize: 13.5, outline: 'none',
                boxSizing: 'border-box',
                fontFamily: ATL_FONT,
                letterSpacing: '-0.005em',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = azul
                e.currentTarget.style.boxShadow = `0 0 0 2px ${azul}33`
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = T.border
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>
          <button
            onClick={onNova}
            aria-label="Nova OS"
            style={{
              width: 36, height: 36, borderRadius: 3,
              border: 'none', cursor: 'pointer',
              background: azul, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontFamily: ATL_FONT,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <i className="ti ti-plus" style={{ fontSize: 18 }} aria-hidden="true" />
          </button>
        </div>

        {/* Divisor */}
        <div style={{ height: 1, background: T.border, margin: '0 14px 10px' }} />

        {/* Tipos de OS */}
        <div style={{ padding: '0 8px 4px' }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: T.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.07em',
            padding: '0 8px 8px',
          }}>Tipo de OS</div>
          {Object.entries(TIPOS_OS).map(([id, cfg]) => {
            const ativo = filtros.tipos.has(id)
            return (
              <button key={id} onClick={() => toggleTipo(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px', borderRadius: 3, width: '100%',
                  background: ativo
                    ? (dark ? 'rgba(91,155,213,0.12)' : 'rgba(91,155,213,0.08)')
                    : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: ativo ? azul : T.textPrimary,
                  fontSize: 13.5, fontWeight: ativo ? 600 : 500,
                  fontFamily: ATL_FONT, textAlign: 'left',
                  boxSizing: 'border-box',
                  letterSpacing: '-0.005em',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background .12s',
                }}>
                <i className={`ti ${cfg.icon}`}
                   style={{ fontSize: 16, width: 18, flexShrink: 0 }}
                   aria-hidden="true" />
                <span style={{ flex: 1 }}>{cfg.label}</span>
                <div style={{
                  width: 18, height: 18, borderRadius: 3,
                  border: `1.5px solid ${ativo ? azul : T.border}`,
                  background: ativo ? azul : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'all .12s',
                }}>
                  {ativo && (
                    <i className="ti ti-check"
                       style={{ fontSize: 11, color: '#fff' }}
                       aria-hidden="true" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Botao Fechar */}
        <div style={{ padding: '12px 14px 0' }}>
          <button onClick={fechar} style={{
            width: '100%', height: 36,
            borderRadius: 3,
            border: `1px solid ${T.border}`,
            background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
            color: T.textPrimary,
            fontSize: 13.5, fontWeight: 500,
            cursor: 'pointer', fontFamily: ATL_FONT,
            letterSpacing: '-0.005em',
            WebkitTapHighlightColor: 'transparent',
          }}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
