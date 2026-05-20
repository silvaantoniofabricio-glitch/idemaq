// idemaq-src/components/painel/HeroFaturamento.jsx
// Hero do Painel — card grande com faturamento do mês, sparkline e progress da meta.

import React from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import Card from '../ui/Card'
import Sparkline from '../ui/Sparkline'
import DeltaPill from '../ui/DeltaPill'
import SectionHeader, { SectionAction } from '../ui/SectionHeader'

export default function HeroFaturamento({ T, dark, hero }) {
  const blueC = corEtapa('blue', dark)
  const blueLightC = corEtapa('blueLight', dark)
  const pctMeta = Math.round((hero.atual / hero.meta) * 100)
  const falta = hero.meta - hero.atual

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
              <span style={{ color: T.textDim }}> · faltam {fmtBRL(falta)}</span>
            </span>
          </div>
          <div style={{ background: T.progBg, borderRadius: 99, height: 6, overflow: 'hidden' }}>
            <div style={{
              width: `${pctMeta}%`, height: '100%',
              background: `linear-gradient(90deg, ${blueC}, ${blueLightC})`,
              borderRadius: 99, transition: 'width .6s ease',
            }} />
          </div>
        </div>
      </div>
      <div style={{ padding: '6px 22px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: 10, color: T.textDim, marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 600 }}>
          Recebimentos diários · últimos 30 dias
        </div>
        <Sparkline data={hero.spark30d} color={blueC} fill={0.18} height={56} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
          <span>{hero.inicioLabel || ''}</span><span>{hero.meioLabel || ''}</span>
          <span style={{ color: blueC, fontWeight: 600 }}>{hero.hojeLabel} · hoje</span>
        </div>
      </div>
    </Card>
  )
}
