// idemaq-src/components/painel/HeroFaturamento.jsx
// Hero do Painel — card grande com faturamento do mês, sparkline e progress da meta.

import React from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import Card from '../ui/Card'
import Sparkline from '../ui/Sparkline'
import DeltaPill from '../ui/DeltaPill'
import SectionHeader, { SectionAction } from '../ui/SectionHeader'

const MESES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

export default function HeroFaturamento({ T, dark, hero }) {
  const blueC = corEtapa('blue', dark)
  const blueLightC = corEtapa('blueLight', dark)
  const pctMeta = hero.meta > 0 ? Math.round((hero.atual / hero.meta) * 100) : 0
  const falta = Math.max(hero.meta - hero.atual, 0)

  // spark30d[29] = hoje, spark30d[0] = 29 dias atrás — label por dia pro
  // tooltip de hover do Sparkline.
  const spark30dLabels = (hero.spark30d || []).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    const label = `${String(d.getDate()).padStart(2, '0')}/${MESES_CURTO[d.getMonth()]}`
    return i === 29 ? `${label} · hoje` : label
  })

  return (
    <Card T={T} dark={dark} radius={14}
      style={{ padding: 0, overflow: 'hidden', position: 'relative', minHeight: 260, display: 'flex', flexDirection: 'column' }}>
      <div style={{
        position: 'absolute', top: -60, right: -60, width: 240, height: 240,
        background: `radial-gradient(circle, ${blueC}22 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ padding: '20px 22px 8px', position: 'relative' }}>
        <SectionHeader T={T} dark={dark} icon="ti-cash" sm action={<SectionAction dark={dark}>Ver financeiro</SectionAction>}>
          Faturamento · {hero.mesLabel}
        </SectionHeader>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginTop: 2 }}>
          <div style={{
            fontSize: 44, fontWeight: 700, color: corHero(dark),
            letterSpacing: '-.035em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>{fmtBRL(hero.atual)}</div>
          <DeltaPill value={hero.deltaPct} dark={dark} lbl={hero.deltaLabel || ''} />
          {hero.demo && (
            <span title="Tabela lancamento_financeiro ainda não foi aplicada — exibindo dados de demonstração" style={{
              fontSize: 9, fontWeight: 700, color: T.textDim, textTransform: 'uppercase',
              letterSpacing: '.06em', border: `1px solid ${T.border}`,
              padding: '2px 7px', borderRadius: 4, lineHeight: 1,
            }}>
              demo
            </span>
          )}
        </div>
        <div style={{ marginTop: 14, marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 500 }}>Meta de {fmtBRL(hero.meta)}</span>
            <span style={{ fontSize: 11.5, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
              <strong style={{ color: corHero(dark), fontWeight: 600 }}>{pctMeta}%</strong>
              <span style={{ color: T.textDim }}>{falta > 0 ? ` · faltam ${fmtBRL(falta)}` : ' · meta batida'}</span>
            </span>
          </div>
          <div style={{ background: T.progBg, borderRadius: 99, height: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(pctMeta, 100)}%`, height: '100%',
              background: `linear-gradient(90deg, ${blueC}, ${blueLightC})`,
              borderRadius: 99, transition: 'width .6s ease',
            }} />
          </div>
          {/* Meta diária fixa do mês (meta ÷ dias úteis do mês, não recalcula) */}
          <div style={{ marginTop: 8, fontSize: 11, color: T.textMuted, lineHeight: 1.35 }}>
            {hero.metaBatida ? (
              <span>
                <i className="ti ti-trophy" style={{ fontSize: 12, color: blueC, marginRight: 4 }} aria-hidden="true" />
                Meta do mês batida — qualquer R$ daqui pra frente é acima do alvo.
              </span>
            ) : hero.diasUteisRestantes > 0 ? (
              hero.hojeBatida ? (
                <span>
                  <i className="ti ti-check" style={{ fontSize: 12, color: blueC, marginRight: 4 }} aria-hidden="true" />
                  Meta de hoje (<strong style={{ color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(hero.metaDiariaRestante)}</strong>) batida —
                  recebeu <strong style={{ color: blueC, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(hero.recebidoHoje)}</strong>
                  {hero.excedenteHoje > 0 && <>, excedente de <strong style={{ color: blueC, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(hero.excedenteHoje)}</strong> a mais que o alvo do dia</>}.
                </span>
              ) : (
                <span>
                  <i className="ti ti-calendar-stats" style={{ fontSize: 12, color: T.textDim, marginRight: 4 }} aria-hidden="true" />
                  Meta de hoje: <strong style={{ color: blueC, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtBRL(hero.metaDiariaRestante)}
                  </strong> · já recebeu <strong style={{ color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(hero.recebidoHoje)}</strong>
                  {' '}· faltam <strong style={{ color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(hero.faltaHoje)}</strong>
                </span>
              )
            ) : (
              <span>
                <i className="ti ti-calendar-off" style={{ fontSize: 12, color: T.textDim, marginRight: 4 }} aria-hidden="true" />
                Mês encerrado — sem dias úteis restantes.
              </span>
            )}
            {!hero.metaBatida && hero.diasUteisRestantes > 0 && (
              <span style={{ color: T.textDim }}>
                {' '}· pra bater a meta do mês, precisa de <strong style={{ color: hero.mostrarRitmoRecuperacao ? '#FFD966' : T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtBRL(hero.ritmoRecuperacao)}/dia
                </strong> nos <strong style={{ color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                  {hero.diasUteisRestantes} {hero.diasUteisRestantes === 1 ? 'dia útil' : 'dias úteis'}
                </strong> que faltam
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ padding: '6px 22px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: 10, color: T.textDim, marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 600 }}>
          Recebimentos diários · últimos 30 dias
        </div>
        <Sparkline data={hero.spark30d} color={blueC} fill={0.18} height={56}
          labels={spark30dLabels} formatValue={(v) => fmtBRL(v)} T={T} dark={dark} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
          <span>{hero.inicioLabel || ''}</span><span>{hero.meioLabel || ''}</span>
          <span style={{ color: blueC, fontWeight: 600 }}>{hero.hojeLabel} · hoje</span>
        </div>
      </div>
    </Card>
  )
}
