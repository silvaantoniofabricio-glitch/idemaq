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

import React from 'react'
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

  // Casos especiais: banner informativo no lugar dos botões
  if (isConcluido) {
    return (
      <BannerEstado T={T} dark={dark}
        icon="ti-circle-check"
        cor={cor(P.green, P.greenDark)}
        texto="OS finalizada — somente leitura"
      />
    )
  }
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
              width: 48, minHeight: 48, borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.cardAlt,
              color: voltarHabilitado ? T.textPrimary : T.textDim,
              cursor: voltarHabilitado ? 'pointer' : 'not-allowed',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              opacity: voltarHabilitado ? 1 : 0.5,
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <i className="ti ti-arrow-left" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        ) : (
          <div style={{ width: 48, flexShrink: 0 }} aria-hidden="true" />
        )}

        {/* Avançar — primário, expande */}
        <button
          onClick={() => { if (avancarHabilitado) onMoverOS(os.numero, proximaUnif.id) }}
          disabled={!avancarHabilitado}
          title={proximaCfg ? `Avançar para ${proximaCfg.label}` : ''}
          style={{
            flex: 1, minHeight: 48, borderRadius: 12, border: 'none',
            cursor: avancarHabilitado ? 'pointer' : 'not-allowed',
            background: avancarHabilitado
              ? `linear-gradient(135deg, ${P.blue}, #3a7bbf)`
              : T.cardAlt,
            color: avancarHabilitado ? '#fff' : T.textDim,
            fontSize: 14.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: avancarHabilitado ? 1 : 0.55,
            fontFamily: 'inherit',
            boxShadow: avancarHabilitado ? '0 4px 14px rgba(91,155,213,.35)' : 'none',
            WebkitTapHighlightColor: 'transparent',
            padding: '0 14px',
            overflow: 'hidden',
          }}>
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {proximaCfg ? `Avançar → ${proximaCfg.label}` : 'Última etapa'}
          </span>
          {proximaCfg && (
            <i className="ti ti-arrow-right" style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true" />
          )}
        </button>
      </div>
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
