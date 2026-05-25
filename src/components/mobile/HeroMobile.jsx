// idemaq-src/components/mobile/HeroMobile.jsx
// Topo do PainelMobile: saudação + apelido + data + faturamento do mês
// inline. Variação compacta do HeroFaturamento do desktop.

import React from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'

const MESES_LONGO = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

function saudacao() {
  const h = parseInt(new Date().toLocaleString('en-US', {
    hour: '2-digit', hour12: false, timeZone: 'America/Cuiaba',
  }), 10)
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function iniciais(nome) {
  return (nome || 'IN').split(/\s+/).filter(Boolean)
    .map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function HeroMobile({ T, dark, apelido = 'parceiro', faturamentoMes = 0, deltaPct = null }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const hoje = new Date()
  const dataLabel = `${hoje.getDate()} de ${MESES_LONGO[hoje.getMonth()]}`
  const positivo = deltaPct != null && deltaPct >= 0
  const seta = positivo ? 'ti-trending-up' : 'ti-trending-down'
  const corDelta = positivo ? corEtapa('green', dark) : corEtapa('red', dark)

  return (
    <div className="idemaq-card" style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '14px 14px 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Linha 1: avatar + saudação + data */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11,
          background: `linear-gradient(135deg, ${azul}, ${cor('#3a7bbf', '#2860a0')})`,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14.5, fontWeight: 800, letterSpacing: '.5px',
          boxShadow: `0 4px 12px ${azul}33`,
          flexShrink: 0,
        }}>{iniciais(apelido)}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.5px',
          }}>{saudacao()},</div>
          <div style={{
            fontSize: 17, fontWeight: 800, color: corHero(dark),
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginTop: 1, letterSpacing: '-.01em',
          }}>{apelido}</div>
        </div>
        <div style={{
          fontSize: 11, color: T.textMuted, fontWeight: 500,
          textAlign: 'right', flexShrink: 0,
        }}>{dataLabel}</div>
      </div>

      {/* Linha 2: faturamento do mês — sem subcard, separado por divisor sutil */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10,
        paddingTop: 12,
        borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.3px',
          }}>Faturamento do mês</div>
          <div style={{
            fontSize: 24, fontWeight: 800, color: corHero(dark),
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em',
            marginTop: 4, lineHeight: 1.1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{fmtBRL(faturamentoMes)}</div>
        </div>
        {deltaPct != null && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 700, color: corDelta,
            padding: '4px 8px', borderRadius: 8,
            background: corDelta + '15',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}>
            <i className={`ti ${seta}`} style={{ fontSize: 13 }} aria-hidden="true" />
            {positivo ? '+' : ''}{deltaPct}%
          </div>
        )}
      </div>
    </div>
  )
}
