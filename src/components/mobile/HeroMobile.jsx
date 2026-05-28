// idemaq-src/components/mobile/HeroMobile.jsx
// Hero do PainelMobile — Apple HIG rebuild:
//   - Avatar + saudação + data
//   - Faturamento + delta pill
//   - Barra de progresso meta
//   - Recebido hoje

import React from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
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
  return (nome || 'IN').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function HeroMobile({
  T, dark,
  apelido = 'parceiro',
  faturamentoMes = 0,
  deltaPct = null,
  labelMesAnt = null,
  meta = 20000,
  recebidoHoje = 0,
}) {
  const azul    = corEtapa('blue', dark)
  const bgAzul  = bgEtapa('blue', dark)
  const hoje    = new Date()
  const dataLabel = `${hoje.getDate()} de ${MESES_LONGO[hoje.getMonth()]}`

  const positivo = deltaPct != null && deltaPct >= 0
  const corDelta = positivo ? corEtapa('green', dark) : corEtapa('red', dark)
  const bgDelta  = positivo ? bgEtapa('green', dark)  : bgEtapa('red', dark)

  const progressoPct = meta > 0 ? Math.min(Math.round((faturamentoMes / meta) * 100), 100) : 0
  const metaBatida   = faturamentoMes >= meta && meta > 0

  return (
    <div style={{
      background: T.card,
      borderRadius: 18,
      padding: '16px 16px 18px',
      display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: dark ? 'none' : '0 1px 8px rgba(0,0,0,.07), 0 0 0 .5px rgba(0,0,0,.04)',
    }}>

      {/* Linha 1: Avatar + saudação + data */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13,
          background: `linear-gradient(135deg,${azul},${dark ? '#3a7bbf' : '#2860a0'})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '.5px',
          boxShadow: `0 4px 12px ${azul}33`,
          flexShrink: 0,
        }}>{iniciais(apelido)}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            {saudacao()},
          </div>
          <div style={{
            fontSize: 17, fontWeight: 800, color: corHero(dark),
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            marginTop: 1, letterSpacing: '-.01em',
          }}>{apelido}</div>
        </div>

        <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, textAlign: 'right', flexShrink: 0 }}>
          {dataLabel}
        </div>
      </div>

      {/* Linha 2: Faturamento + delta */}
      <div style={{ paddingTop: 12, borderTop: `1px solid ${T.border}` }}>
        <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 6 }}>
          Faturamento do mês
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div style={{
            fontSize: 30, fontWeight: 800, color: corHero(dark),
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-.025em', lineHeight: 1,
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{fmtBRL(faturamentoMes)}</div>

          {deltaPct != null && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 700, color: corDelta,
              background: bgDelta,
              borderRadius: 100, padding: '4px 10px',
              flexShrink: 0, fontVariantNumeric: 'tabular-nums',
            }}>
              <i className={`ti ${positivo ? 'ti-trending-up' : 'ti-trending-down'}`} style={{ fontSize: 12 }} aria-hidden="true" />
              {positivo ? '+' : ''}{deltaPct}%{labelMesAnt ? ` vs ${labelMesAnt}` : ''}
            </div>
          )}
        </div>

        {/* Barra de progresso da meta */}
        <div style={{ marginTop: 10 }}>
          <div style={{
            height: 5, background: T.border, borderRadius: 3, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${progressoPct}%`,
              background: metaBatida ? corEtapa('green', dark) : azul,
              borderRadius: 3,
              transition: 'width .4s ease',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5,
          }}>
            <span style={{ fontSize: 10.5, color: T.textMuted }}>
              {metaBatida ? '🎯 Meta batida!' : `${progressoPct}% da meta`}
            </span>
            <span style={{ fontSize: 10.5, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
              Meta: {fmtBRL(meta)}
            </span>
          </div>
        </div>
      </div>

      {/* Linha 3: Recebido hoje */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px',
        background: bgAzul,
        borderRadius: 11,
      }}>
        <i className="ti ti-cash" style={{ fontSize: 16, color: azul, flexShrink: 0 }} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>Recebido hoje · </span>
          <span style={{
            fontSize: 14, fontWeight: 700, color: azul,
            fontVariantNumeric: 'tabular-nums',
          }}>{fmtBRL(recebidoHoje)}</span>
        </div>
      </div>
    </div>
  )
}
