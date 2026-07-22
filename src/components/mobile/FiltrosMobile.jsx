// src/components/mobile/FiltrosMobile.jsx
// Barra de filtros do OSMobile — Atlassian Design (redesenho 22/07/2026).
//
// Estrutura:
//   - Barra visível: SÓ busca + botão "···" (Mais) — nada de abas nem "+"
//     ficando fixo na tela, pra header ficar mínimo.
//   - Bottom sheet 'Mais', com facetas em CHIPS (não lista de checkbox) —
//     mais moderno e compacto, e não vira parede azul quando "tudo" está
//     selecionado (o padrão comum aqui é ficar neutro/sem chip preenchido):
//     * Nova OS — AtlButton primary, destaque no topo
//     * Zona (Todos/Externo/Interno/Financeiro) — chips, seleção única
//     * Tipo de OS (Atendimento/Fabricação/Venda/Visita) — chips, múltipla
//     * Serviço (Limpeza/Manutenção) — chips, múltipla
//     * Status (Ag. peça/Recusadas) — chips, múltipla
//     * Fechar — AtlButton default

import React, { useState, useEffect } from 'react'
import { ZONAS, TIPOS_OS } from '../../utils/osData'
import { corEtapa } from '../../utils/colors'
import {
  AtlButton, AtlChip, ATL_FONT, ATL_RADIUS,
} from '../osDetalhe/acoes/_AtlassianUI'

const ZONAS_TODAS = [
  { id: 'todos', label: 'Todos', icon: 'grid-dots' },
  ...ZONAS.map(z => ({ ...z, icon: z.icon.replace(/^ti-/, '') })),
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

// ─── Bottom sheet Mais — montado com as primitivas Atlassian canônicas ────
function MaisSheet({ T, dark, onNova, filtros, setZona, toggleTipo, toggleServico, onClose }) {
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
          background: T.bg,
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

        <div style={{ padding: '8px 14px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Nova OS — destaque no topo */}
          <AtlButton T={T} dark={dark} variant="primary" icon="plus" fullWidth onClick={onNova}>
            Nova OS
          </AtlButton>

          {/* Zona — chips, seleção única */}
          <FiltroSecao T={T} dark={dark} titulo="Zona">
            {ZONAS_TODAS.map(z => (
              <AtlChip
                key={z.id} T={T} dark={dark}
                icon={z.icon} label={z.label}
                selected={filtros.zona === z.id}
                onClick={() => setZona(z.id)}
              />
            ))}
          </FiltroSecao>

          {/* Tipo de OS — chips, múltipla */}
          <FiltroSecao T={T} dark={dark} titulo="Tipo de OS">
            {Object.entries(TIPOS_OS).map(([id, cfg]) => (
              <AtlChip
                key={id} T={T} dark={dark}
                icon={cfg.icon.replace(/^ti-/, '')} label={cfg.label}
                selected={filtros.tipos.has(id)}
                onClick={() => toggleTipo(id)}
              />
            ))}
          </FiltroSecao>

          {/* Serviço — chips, múltipla */}
          <FiltroSecao T={T} dark={dark} titulo="Serviço">
            <AtlChip T={T} dark={dark}
              icon="bubble" label="Limpeza"
              selected={!!filtros.limpeza}
              onClick={() => toggleServico('limpeza')}
            />
            <AtlChip T={T} dark={dark}
              icon="tool" label="Manutenção"
              selected={!!filtros.manutencao}
              onClick={() => toggleServico('manutencao')}
            />
          </FiltroSecao>

          {/* Status extra — chips, múltipla */}
          <FiltroSecao T={T} dark={dark} titulo="Status">
            <AtlChip T={T} dark={dark}
              icon="package-off" label="Aguardando peça"
              selected={!!filtros.agPeca}
              onClick={() => toggleServico('agPeca')}
            />
            <AtlChip T={T} dark={dark}
              icon="circle-x" label="Recusadas"
              selected={!!filtros.recusadas}
              onClick={() => toggleServico('recusadas')}
            />
          </FiltroSecao>

          {/* Fechar */}
          <AtlButton T={T} dark={dark} variant="default" fullWidth onClick={fechar}>
            Fechar
          </AtlButton>
        </div>
      </div>
    </div>
  )
}

// ─── Seção de facetas: rótulo pequeno + chips que quebram linha ───────────
function FiltroSecao({ T, titulo, children }) {
  return (
    <div>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.07em',
        marginBottom: 8,
      }}>{titulo}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {children}
      </div>
    </div>
  )
}
