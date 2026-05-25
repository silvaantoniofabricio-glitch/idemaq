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
