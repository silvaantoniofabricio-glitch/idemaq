// src/components/osDetalhe/FooterMobile.jsx
// Footer fixo mobile do OSDetalhe — botão Voltar (icon-only 44x44) + Avançar primário
// que ocupa o resto da linha com o nome da próxima etapa.
//
// Decisões mobile-first:
//   • Botão primário com 48px de altura e label visível ("Avançar → Diagnóstico")
//   • Voltar fica ícone-only mas mantém 44x44 (toque confortável de polegar)
//   • Quando bloqueado: motivo aparece numa pílula vermelha pequena acima
//   • Safe-area-inset-bottom respeitada (iPhones com home bar)
//   • Estados concluído/recusado mostram banner-info no lugar dos botões

import React, { useState, useRef, useEffect } from 'react'
import { P } from '../../theme'
import { TIPOS_OS, ETAPAS_TODOS } from '../../utils/osData'
import { podeMoverOS } from '../../utils/osHelpers'

export default function FooterMobile({ T, dark, os, admin, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const config = TIPOS_OS[os.tipo]
  const etapas = (config?.etapas || []).filter(e => admin || !e.adminOnly)
  const etapaIdx = etapas.findIndex(e => e.id === os.etapa)

  const isConcluido = os.etapa === 'concluido'
  const isRecusado = os.etapa === 'recusado'

  if (isRecusado) {
    return (
      <BannerEstado T={T} dark={dark}
        icon="ti-circle-x"
        cor={cor(P.red, P.redDark)}
        texto="OS recusada — use as ações da aba Etapa"
      />
    )
  }

  const anteriorCfg = etapaIdx > 0 ? etapas[etapaIdx - 1] : null
  const proximaCfg = etapaIdx < etapas.length - 1 ? etapas[etapaIdx + 1] : null

  const podeVoltar = anteriorCfg ? podeMoverOS(os, anteriorCfg.id) : { ok: false, motivo: 'Primeira etapa' }
  const podeAvancar = proximaCfg ? podeMoverOS(os, proximaCfg.id) : { ok: false, motivo: 'Última etapa' }

  const anteriorUnif = anteriorCfg
    ? ETAPAS_TODOS.find(e => e.match?.[os.tipo] === anteriorCfg.id)
    : null
  const proximaUnif = proximaCfg
    ? ETAPAS_TODOS.find(e => e.match?.[os.tipo] === proximaCfg.id)
    : null

  const azul = cor(P.blue, P.blueDark)
  const avancarHabilitado = podeAvancar.ok && proximaUnif
  const voltarHabilitado = podeVoltar.ok && anteriorUnif

  const etapasAlcancaveis = etapas
    .filter(e => e.id !== os.etapa)
    .map(e => {
      const r = podeMoverOS(os, e.id, { pularEtapas: true })
      const unif = ETAPAS_TODOS.find(et => et.match?.[os.tipo] === e.id)
      return { ...e, ok: r.ok, motivo: r.motivo, unifId: unif?.id }
    })

  return (
    <div style={{
      flexShrink: 0,
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {/* Motivo de bloqueio (quando avançar está disabled) */}
      {!podeAvancar.ok && proximaCfg && (
        <div style={{
          padding: '8px 14px 0',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 12,
            background: cor('#2a1515', '#fde8e8'),
            color: cor(P.red, P.redDark),
            border: `1px solid ${cor(P.red, P.redDark)}33`,
            fontSize: 11, fontWeight: 600,
            maxWidth: '100%',
          }}>
            <i className="ti ti-lock" style={{ fontSize: 12 }} aria-hidden="true" />
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{podeAvancar.motivo}</span>
          </span>
        </div>
      )}

      <div style={{
        padding: '10px 14px 12px',
        display: 'flex', alignItems: 'stretch', gap: 8,
      }}>
        {/* Voltar — ícone-only */}
        {anteriorCfg ? (
          <button
            onClick={() => { if (voltarHabilitado) onMoverOS(os.numero, anteriorUnif.id) }}
            disabled={!voltarHabilitado}
            title={voltarHabilitado ? `Voltar para ${anteriorCfg.label}` : podeVoltar.motivo}
            aria-label={voltarHabilitado ? `Voltar para ${anteriorCfg.label}` : podeVoltar.motivo}
            style={{
              width: 44, minHeight: 48, borderRadius: 10,
              border: `1px solid ${T.border}`,
              background: 'transparent',
              color: voltarHabilitado ? T.textPrimary : T.textDim,
              cursor: voltarHabilitado ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              opacity: voltarHabilitado ? 1 : 0.5,
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 18 }} aria-hidden="true" />
          </button>
        ) : (
          <div style={{ width: 44, flexShrink: 0 }} aria-hidden="true" />
        )}

        {/* Pular para — menu */}
        <PularMenuMobile T={T} dark={dark} azul={azul}
          etapas={etapasAlcancaveis}
          onEscolher={(unifId) => onMoverOS(os.numero, unifId)}
        />

        {/* Avançar — primário, expande. Visual flat com hierarquia tipografica:
            "Avançar" em bold, etapa-alvo em weight regular sutil. */}
        <button
          onClick={() => { if (avancarHabilitado) onMoverOS(os.numero, proximaUnif.id) }}
          disabled={!avancarHabilitado}
          title={proximaCfg ? `Avançar para ${proximaCfg.label}` : ''}
          style={{
            flex: 1, minHeight: 48, borderRadius: 10,
            cursor: avancarHabilitado ? 'pointer' : 'not-allowed',
            background: avancarHabilitado ? azul : T.cardAlt,
            border: avancarHabilitado
              ? `1px solid ${dark ? '#3a7bbf' : '#3a7bbf'}`
              : `1px solid ${T.border}`,
            color: avancarHabilitado ? '#fff' : T.textDim,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: avancarHabilitado ? 1 : 0.55,
            fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
            padding: '0 14px',
            overflow: 'hidden',
            transition: 'transform .08s, filter .12s',
          }}
          onTouchStart={e => { if (avancarHabilitado) e.currentTarget.style.filter = 'brightness(.92)' }}
          onTouchEnd={e => { e.currentTarget.style.filter = 'none' }}>
          <span style={{
            fontSize: 14.5, fontWeight: 700, letterSpacing: '.01em',
          }}>Avançar</span>
          {proximaCfg && (
            <>
              <i className="ti ti-arrow-right" style={{
                fontSize: 15, flexShrink: 0, opacity: 0.85,
              }} aria-hidden="true" />
              <span style={{
                fontSize: 13.5, fontWeight: 500, opacity: 0.92,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                minWidth: 0,
              }}>{proximaCfg.label}</span>
            </>
          )}
          {!proximaCfg && (
            <span style={{ fontSize: 14, fontWeight: 600 }}>Última etapa</span>
          )}
        </button>
      </div>
    </div>
  )
}

function PularMenuMobile({ T, dark, azul, etapas, onEscolher }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!aberto) return
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
    }
  }, [aberto])
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setAberto(v => !v)}
        title="Pular para uma etapa específica"
        aria-label="Pular para etapa"
        style={{
          width: 44, minHeight: 48, borderRadius: 10,
          border: `1px solid ${T.border}`,
          background: 'transparent', color: T.textMuted,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit',
          WebkitTapHighlightColor: 'transparent',
          transition: 'background .12s, color .12s',
        }}>
        <i className="ti ti-dots" style={{ fontSize: 18 }} />
      </button>
      {aberto && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          minWidth: 220, maxHeight: 320, overflowY: 'auto',
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.25)', zIndex: 100, padding: 6,
        }}>
          {etapas.map(e => (
            <button
              key={e.id}
              disabled={!e.ok || !e.unifId}
              title={e.ok ? `Ir para ${e.label}` : e.motivo}
              onClick={() => { if (e.ok && e.unifId) { onEscolher(e.unifId); setAberto(false) } }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '10px 12px', borderRadius: 6, border: 'none',
                background: 'transparent', color: e.ok ? T.text : T.textDim,
                fontSize: 14, fontFamily: 'inherit',
                cursor: e.ok ? 'pointer' : 'not-allowed',
                opacity: e.ok ? 1 : 0.5,
              }}>
              {e.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BannerEstado({ T, dark, icon, cor, texto }) {
  return (
    <div style={{
      flexShrink: 0,
      padding: '14px 18px',
      paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
      borderTop: `1px solid ${T.border}`,
      background: T.cardAlt,
      textAlign: 'center',
      fontSize: 13, color: T.textSecondary, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 18, color: cor }} aria-hidden="true" />
      <span>{texto}</span>
    </div>
  )
}
