// src/components/osDetalhe/Footer.jsx
// Footer fixo do OSDetalhe — botões Voltar/Avançar etapa.
// Usa podeMoverOS() pra validar ambas direções. Em concluido/recusado mostra mensagem.

import React from 'react'
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

  // Caso especial — OS finalizada
  if (isConcluido) {
    return (
      <div style={{
        flexShrink: 0, padding: '14px 18px',
        borderTop: `1px solid ${T.border}`,
        background: T.cardAlt,
        textAlign: 'center',
        fontSize: 12.5, color: T.textMuted,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        <i className="ti ti-circle-check" style={{ fontSize: 16, color: cor(P.green, P.greenDark) }} aria-hidden="true" />
        <span>OS finalizada — somente leitura</span>
      </div>
    )
  }

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

  return (
    <div style={{
      flexShrink: 0, padding: '12px 18px',
      borderTop: `1px solid ${T.border}`,
      background: T.card,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      {/* Esquerda — Voltar etapa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
        {anteriorCfg && (
          <>
            <button
              onClick={() => { if (podeVoltar.ok && anteriorUnif) onMoverOS(os.numero, anteriorUnif.id) }}
              disabled={!podeVoltar.ok || !anteriorUnif}
              title={podeVoltar.ok ? `Voltar para ${anteriorCfg.label}` : podeVoltar.motivo}
              style={{
                padding: '8px 14px', borderRadius: 7,
                border: `1px solid ${podeVoltar.ok ? T.border : T.border}`,
                background: 'transparent',
                color: podeVoltar.ok ? T.textSecondary : T.textDim,
                fontSize: 12, fontWeight: 600,
                cursor: podeVoltar.ok && anteriorUnif ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 5,
                opacity: podeVoltar.ok ? 1 : 0.55,
                fontFamily: 'inherit', flexShrink: 0,
              }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 14 }} aria-hidden="true" />
              Voltar etapa
            </button>
            <span style={{
              fontSize: 10.5, color: T.textMuted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              minWidth: 0,
            }}>
              para <strong style={{ color: T.textSecondary, fontWeight: 600 }}>{anteriorCfg.label}</strong>
            </span>
          </>
        )}
      </div>

      {/* Direita — Avançar etapa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {proximaCfg && (
          <span style={{
            fontSize: 10.5,
            color: podeAvancar.ok ? T.textMuted : cor(P.red, P.redDark),
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {!podeAvancar.ok && <i className="ti ti-lock" style={{ fontSize: 12 }} aria-hidden="true" />}
            {podeAvancar.ok
              ? <>Avançar para <strong style={{ color: T.textPrimary, fontWeight: 600 }}>{proximaCfg.label}</strong></>
              : <span>{podeAvancar.motivo}</span>}
          </span>
        )}
        <button
          onClick={() => { if (podeAvancar.ok && proximaUnif) onMoverOS(os.numero, proximaUnif.id) }}
          disabled={!podeAvancar.ok || !proximaUnif}
          title={podeAvancar.ok ? `Avançar para ${proximaCfg?.label}` : podeAvancar.motivo}
          style={{
            padding: '9px 16px', borderRadius: 7, border: 'none',
            cursor: podeAvancar.ok && proximaUnif ? 'pointer' : 'not-allowed',
            background: podeAvancar.ok ? `linear-gradient(135deg, ${P.blue}, #3a7bbf)` : T.cardAlt,
            color: podeAvancar.ok ? '#fff' : T.textDim,
            fontSize: 12.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: podeAvancar.ok ? 1 : 0.6,
            fontFamily: 'inherit',
            boxShadow: podeAvancar.ok ? '0 2px 8px rgba(91,155,213,.25)' : 'none',
          }}>
          Avançar etapa
          <i className="ti ti-arrow-right" style={{ fontSize: 14 }} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
