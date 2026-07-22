// src/components/mobile/FiltrosMobile.jsx
// Barra de filtros do OSMobile — Atlassian Design (redesenho 22/07/2026).
//
// Estrutura:
//   - Barra visível: SÓ busca + botão "···" (Mais) — nada de abas nem "+"
//     ficando fixo na tela, pra header ficar mínimo.
//   - Bottom sheet 'Mais' com, nessa ordem:
//     * Zona (Todos/Externo/Interno/Financeiro) — escolha única, estilo rádio
//     * Nova OS — botão de destaque azul Atlassian
//     * Tipo de OS (Atendimento/Fabricação/Venda/Visita) — múltipla, checkbox
//     * Serviço (Limpeza/Manutenção) — múltipla, checkbox
//     * Status (Ag. peça/Recusadas) — múltipla, checkbox
//     * Fechar

import React, { useState, useEffect, useRef } from 'react'
import { ZONAS, TIPOS_OS } from '../../utils/osData'
import { corEtapa } from '../../utils/colors'

const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const ATL_RADIUS = 4

const ZONAS_TODAS = [
  { id: 'todos', label: 'Todos', icon: 'ti-grid-dots' },
  ...ZONAS,
]

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

  function toggleServico(key) {
    setFiltros(f => ({ ...f, [key]: !f[key] }))
  }

  const totalTipos     = Object.keys(TIPOS_OS).length
  const tiposAtivos    = filtros.tipos.size
  const tiposFiltrando = tiposAtivos < totalTipos
  const zonaFiltrando  = filtros.zona !== 'todos'
  const servicoFiltrando = !!filtros.limpeza || !!filtros.manutencao
  const extraFiltrando = !!filtros.agPeca || !!filtros.recusadas
  const maisAtivo      = maisOpen || tiposFiltrando || zonaFiltrando || servicoFiltrando || extraFiltrando
  const contadorMais   = (tiposFiltrando ? 1 : 0) + (zonaFiltrando ? 1 : 0) + (filtros.limpeza ? 1 : 0) + (filtros.manutencao ? 1 : 0) + (filtros.agPeca ? 1 : 0) + (filtros.recusadas ? 1 : 0)

  return (
    <>
      {/* Barra visível — só busca + Mais */}
      <div style={{ display: 'flex', gap: 8, fontFamily: ATL_FONT }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <i className="ti ti-search" style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontSize: 14, color: T.textMuted, pointerEvents: 'none',
          }} aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar OS, cliente, marca…"
            style={{
              width: '100%', height: 36,
              padding: '0 12px 0 32px',
              borderRadius: ATL_RADIUS,
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

        {/* Botão Mais — único controle além da busca */}
        <button
          onClick={() => setMaisOpen(true)}
          aria-label="Mais opções e filtros"
          style={{
            flex: '0 0 36px', height: 36,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: ATL_RADIUS,
            border: `1px solid ${maisAtivo ? azul : T.border}`,
            background: maisAtivo ? (dark ? 'rgba(91,155,213,0.14)' : 'rgba(91,155,213,0.08)') : (dark ? 'rgba(255,255,255,0.04)' : '#fff'),
            color: maisAtivo ? azul : T.textPrimary,
            cursor: 'pointer', fontFamily: ATL_FONT,
            position: 'relative',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <i className="ti ti-dots" style={{ fontSize: 18 }} aria-hidden="true" />
          {contadorMais > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 15, height: 15, borderRadius: 99,
              background: azul, color: '#fff',
              fontSize: 9.5, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', boxSizing: 'border-box',
              border: `2px solid ${T.bg}`,
              fontVariantNumeric: 'tabular-nums',
            }}>{contadorMais}</span>
          )}
        </button>
      </div>

      {/* Bottom sheet Mais */}
      {maisOpen && (
        <MaisSheet
          T={T} dark={dark}
          onNova={() => { setMaisOpen(false); onNova?.() }}
          filtros={filtros} setZona={setZona} toggleTipo={toggleTipo} toggleServico={toggleServico}
          onClose={() => setMaisOpen(false)}
        />
      )}
    </>
  )
}

// ─── Seção genérica de lista (usada por Zona/Tipo/Serviço/Status) ─────────
function SecaoLista({ T, dark, titulo, itens, multipla }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{ padding: '0 8px 4px' }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.07em',
        padding: '0 8px 8px',
      }}>{titulo}</div>
      {itens.map(it => (
        <button key={it.id} onClick={it.onClick}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px', borderRadius: ATL_RADIUS, width: '100%',
            background: it.ativo
              ? (dark ? 'rgba(91,155,213,0.12)' : 'rgba(91,155,213,0.08)')
              : 'transparent',
            border: 'none', cursor: 'pointer',
            color: it.ativo ? azul : T.textPrimary,
            fontSize: 13.5, fontWeight: it.ativo ? 600 : 500,
            fontFamily: ATL_FONT, textAlign: 'left',
            boxSizing: 'border-box',
            letterSpacing: '-0.005em',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background .12s',
          }}>
          <i className={`ti ${it.icon}`}
             style={{ fontSize: 16, width: 18, flexShrink: 0 }}
             aria-hidden="true" />
          <span style={{ flex: 1 }}>{it.label}</span>
          {multipla ? (
            <div style={{
              width: 18, height: 18, borderRadius: 3,
              border: `1.5px solid ${it.ativo ? azul : T.border}`,
              background: it.ativo ? azul : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all .12s',
            }}>
              {it.ativo && <i className="ti ti-check" style={{ fontSize: 11, color: '#fff' }} aria-hidden="true" />}
            </div>
          ) : (
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `1.5px solid ${it.ativo ? azul : T.border}`,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all .12s',
            }}>
              {it.ativo && <div style={{ width: 9, height: 9, borderRadius: '50%', background: azul }} />}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Bottom sheet Mais ────────────────────────────────────────────────────
function MaisSheet({ T, dark, onNova, filtros, setZona, toggleTipo, toggleServico, onClose }) {
  const azul = corEtapa('blue', dark)
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
          maxHeight: '85vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
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

        {/* Nova OS — destaque logo no topo */}
        <div style={{ padding: '8px 14px 4px' }}>
          <button
            onClick={onNova}
            style={{
              width: '100%', height: 40, borderRadius: ATL_RADIUS,
              border: 'none', cursor: 'pointer',
              background: azul, color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 13.5, fontWeight: 600, fontFamily: ATL_FONT,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
            Nova OS
          </button>
        </div>

        {/* Divisor */}
        <div style={{ height: 1, background: T.border, margin: '10px 14px' }} />

        {/* Zona */}
        <SecaoLista T={T} dark={dark} titulo="Zona" itens={
          ZONAS_TODAS.map(z => ({
            id: z.id, label: z.label, icon: z.icon,
            ativo: filtros.zona === z.id,
            onClick: () => setZona(z.id),
          }))
        } />

        {/* Divisor */}
        <div style={{ height: 1, background: T.border, margin: '10px 14px' }} />

        {/* Tipos de OS */}
        <SecaoLista T={T} dark={dark} titulo="Tipo de OS" multipla itens={
          Object.entries(TIPOS_OS).map(([id, cfg]) => ({
            id, label: cfg.label, icon: cfg.icon,
            ativo: filtros.tipos.has(id),
            onClick: () => toggleTipo(id),
          }))
        } />

        {/* Divisor */}
        <div style={{ height: 1, background: T.border, margin: '10px 14px' }} />

        {/* Serviço */}
        <SecaoLista T={T} dark={dark} titulo="Serviço" multipla itens={[
          { id: 'limpeza', label: 'Limpeza', icon: 'ti-bubble', ativo: !!filtros.limpeza, onClick: () => toggleServico('limpeza') },
          { id: 'manutencao', label: 'Manutenção', icon: 'ti-tool', ativo: !!filtros.manutencao, onClick: () => toggleServico('manutencao') },
        ]} />

        {/* Divisor */}
        <div style={{ height: 1, background: T.border, margin: '10px 14px' }} />

        {/* Status extra */}
        <SecaoLista T={T} dark={dark} titulo="Status" multipla itens={[
          { id: 'agPeca', label: 'Aguardando peça', icon: 'ti-package-off', ativo: !!filtros.agPeca, onClick: () => toggleServico('agPeca') },
          { id: 'recusadas', label: 'Recusadas', icon: 'ti-circle-x', ativo: !!filtros.recusadas, onClick: () => toggleServico('recusadas') },
        ]} />

        {/* Botao Fechar */}
        <div style={{ padding: '12px 14px 0' }}>
          <button onClick={fechar} style={{
            width: '100%', height: 36,
            borderRadius: ATL_RADIUS,
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
