// src/components/osDetalhe/Footer.jsx
// Footer fixo do OSDetalhe — botões Voltar/Avançar etapa.
// Usa podeMoverOS() pra validar ambas direções. Em concluido/recusado mostra mensagem.

import React, { useState, useRef, useEffect } from 'react'
import { P } from '../../theme'
import { TIPOS_OS, ETAPAS_TODOS } from '../../utils/osData'
import { podeMoverOS } from '../../utils/osHelpers'
import { corEtapa } from '../../utils/colors'

export default function Footer({ T, dark, os, admin, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const config = TIPOS_OS[os.tipo]
  const etapas = (config?.etapas || []).filter(e => admin || !e.adminOnly)
  const etapaIdx = etapas.findIndex(e => e.id === os.etapa)

  const isConcluido = os.etapa === 'concluido'
  const isRecusado = os.etapa === 'recusado'

  // Caso especial — OS recusada
  if (isRecusado) {
    return (
      <div style={{
        flexShrink: 0, padding: '14px 18px',
        borderTop: `1px solid ${T.border}`,
        background: T.cardAlt,
        textAlign: 'center',
        fontSize: 12.5, color: T.textMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <i className="ti ti-circle-x" style={{ fontSize: 16, color: cor(P.red, P.redDark) }} aria-hidden="true" />
        <span>OS recusada — use as ações da aba Resumo</span>
      </div>
    )
  }

  // Cálculo de etapa anterior / próxima + validação
  const anteriorCfg = etapaIdx > 0 ? etapas[etapaIdx - 1] : null
  const proximaCfg = etapaIdx < etapas.length - 1 ? etapas[etapaIdx + 1] : null

  const podeVoltar = anteriorCfg ? podeMoverOS(os, anteriorCfg.id) : { ok: false, motivo: 'Primeira etapa' }
  const podeAvancar = proximaCfg ? podeMoverOS(os, proximaCfg.id) : { ok: false, motivo: 'Última etapa' }

  // Tradução pra ID unificado (o que onMoverOS espera)
  const anteriorUnif = anteriorCfg
    ? ETAPAS_TODOS.find(e => e.match?.[os.tipo] === anteriorCfg.id)
    : null
  const proximaUnif = proximaCfg
    ? ETAPAS_TODOS.find(e => e.match?.[os.tipo] === proximaCfg.id)
    : null

  const azul = cor(P.blue, P.blueDark)

  // Lista de etapas para "Pular para..." — todas alcançáveis (com pularEtapas)
  const etapasAlcancaveis = etapas
    .filter(e => e.id !== os.etapa)
    .map(e => {
      const r = podeMoverOS(os, e.id, { pularEtapas: true })
      const unif = ETAPAS_TODOS.find(et => et.match?.[os.tipo] === e.id)
      return { ...e, ok: r.ok, motivo: r.motivo, unifId: unif?.id }
    })

  return (
    <div style={{
      flexShrink: 0, padding: '10px 16px',
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    }}>
      <MiniBtn
        T={T} azul={azul}
        habilitado={podeVoltar.ok && !!anteriorUnif}
        motivo={podeVoltar.motivo}
        label={anteriorCfg?.label}
        direcao="voltar"
        onClick={() => { if (podeVoltar.ok && anteriorUnif) onMoverOS(os.numero, anteriorUnif.id) }}
        visivel={!!anteriorCfg}
      />

      <PularMenu
        T={T} azul={azul}
        etapas={etapasAlcancaveis}
        onEscolher={(unifId) => onMoverOS(os.numero, unifId)}
      />

      <MiniBtn
        T={T} azul={azul}
        habilitado={podeAvancar.ok && !!proximaUnif}
        motivo={podeAvancar.motivo}
        label={proximaCfg?.label}
        direcao="avancar"
        onClick={() => { if (podeAvancar.ok && proximaUnif) onMoverOS(os.numero, proximaUnif.id) }}
        visivel={!!proximaCfg}
      />
    </div>
  )
}

function PularMenu({ T, azul, etapas, onEscolher }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!aberto) return
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [aberto])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(v => !v)}
        title="Pular para uma etapa específica"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 6, border: 'none',
          background: 'transparent', color: T.textSecondary,
          fontSize: 12, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        onMouseEnter={e => e.currentTarget.style.color = azul}
        onMouseLeave={e => e.currentTarget.style.color = T.textSecondary}
      >
        <i className="ti ti-chevrons-right" style={{ fontSize: 16 }} />
        <span>Pular para…</span>
      </button>
      {aberto && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, minWidth: 200, maxHeight: 300, overflowY: 'auto',
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
          boxShadow: '0 6px 20px rgba(0,0,0,.18)', zIndex: 100, padding: 4,
        }}>
          {etapas.map(e => (
            <button
              key={e.id}
              disabled={!e.ok || !e.unifId}
              title={e.ok ? `Ir para ${e.label}` : e.motivo}
              onClick={() => { if (e.ok && e.unifId) { onEscolher(e.unifId); setAberto(false) } }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 10px', borderRadius: 4, border: 'none',
                background: 'transparent', color: e.ok ? T.text : T.textDim,
                fontSize: 12.5, fontFamily: 'inherit',
                cursor: e.ok ? 'pointer' : 'not-allowed',
                opacity: e.ok ? 1 : 0.5,
              }}
              onMouseEnter={ev => { if (e.ok) ev.currentTarget.style.background = T.cardAlt }}
              onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MiniBtn({ T, azul, habilitado, motivo, label, direcao, onClick, visivel }) {
  if (!visivel) return <span style={{ width: 1 }} aria-hidden="true" />
  const isAvancar = direcao === 'avancar'
  const titulo = habilitado
    ? (isAvancar ? `Avançar para ${label}` : `Voltar para ${label}`)
    : motivo
  return (
    <button
      onClick={onClick}
      disabled={!habilitado}
      title={titulo}
      aria-label={titulo}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', borderRadius: 6,
        border: 'none', background: 'transparent',
        color: habilitado ? T.textSecondary : T.textDim,
        fontSize: 12, fontWeight: 500,
        cursor: habilitado ? 'pointer' : 'not-allowed',
        opacity: habilitado ? 1 : 0.45,
        fontFamily: 'inherit',
        transition: 'color .15s, background .15s',
      }}
      onMouseEnter={e => { if (habilitado) { e.currentTarget.style.color = azul } }}
      onMouseLeave={e => { if (habilitado) { e.currentTarget.style.color = T.textSecondary } }}
    >
      {!isAvancar && <i className="ti ti-chevron-left" style={{ fontSize: 16 }} aria-hidden="true" />}
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
      {isAvancar && <i className="ti ti-chevron-right" style={{ fontSize: 16 }} aria-hidden="true" />}
    </button>
  )
}
