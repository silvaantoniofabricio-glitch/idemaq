// idemaq-src/components/painel/HojeSidekick.jsx
import React from 'react'
import { corEtapa, corHero, dividerColor } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import Card from '../ui/Card'
import DeltaPill from '../ui/DeltaPill'
import SectionHeader from '../ui/SectionHeader'

export default function HojeSidekick({ T, dark, hoje }) {
  const blueC = corEtapa('blue', dark)
  const yellowC = corEtapa('yellow', dark)
  const greenC = corEtapa('green', dark)
  const redC = corEtapa('red', dark)
  const corByTipo = (t) => t === 'urgente' ? redC : t === 'hoje' ? yellowC : greenC

  return (
    <Card T={T} dark={dark} radius={14}
      style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 260 }}>
      <div style={{ padding: '18px 18px 6px' }}>
        <SectionHeader T={T} dark={dark} icon="ti-calendar-event" sm>
          Hoje · {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
        </SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div style={{ gridColumn: 'span 2', background: T.cardAlt, borderRadius: 9, padding: '11px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10.5, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>Recebido hoje</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: corHero(dark), letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{fmtBRL(hoje.recebido)}</div>
            </div>
            <DeltaPill value={null} lbl={`${hoje.osPagas} OS`} neutral dark={dark} />
          </div>
          {[
            { lbl: 'OS abertas', v: hoje.osAbertas, c: blueC },
            { lbl: 'Em rota',    v: hoje.emRota,    c: yellowC },
          ].map((s, i) => (
            <div key={i} style={{ background: T.cardAlt, borderRadius: 9, padding: '9px 12px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.c, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 3 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, padding: '0 18px 18px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 10, color: T.textDim, marginBottom: 6, letterSpacing: '.05em', textTransform: 'uppercase', fontWeight: 600 }}>
          Próximas paradas
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hoje.proximas.slice(0, 3).map((p, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              borderTop: i === 0 ? 'none' : `1px solid ${dividerColor(dark)}`,
              paddingTop: i === 0 ? 0 : 7,
            }}>
              <div style={{ fontSize: 11, color: T.textSecondary, fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 36 }}>{p.hr}</div>
              <div style={{ width: 4, height: 22, borderRadius: 2, background: corByTipo(p.tipo), flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: T.textSecondary, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cliente}</div>
                <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{p.svc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
