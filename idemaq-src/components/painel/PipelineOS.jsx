// idemaq-src/components/painel/PipelineOS.jsx
import React from 'react'
import { corEtapa, bgEtapa, corHero, dividerColor } from '../../utils/colors'
import Card from '../ui/Card'
import SectionHeader, { SectionAction } from '../ui/SectionHeader'

export default function PipelineOS({ T, dark, etapas }) {
  const total = etapas.reduce((s, e) => s + e.n, 0)
  const max = Math.max(...etapas.map(e => e.n), 1)
  return (
    <Card T={T} dark={dark} radius={14} padding={'18px 20px'}>
      <SectionHeader T={T} dark={dark} icon="ti-layout-kanban"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: T.textMuted }}>
              Total <strong style={{ color: corHero(dark), fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{total} OS</strong>
            </span>
            <SectionAction dark={dark}>Abrir kanban</SectionAction>
          </div>
        }>Pipeline operacional</SectionHeader>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${etapas.length}, minmax(0,1fr))`, gap: 6, alignItems: 'end' }}>
        {etapas.map(p => {
          const c  = p.corKey === 'neutro' ? T.osNeutroT : corEtapa(p.corKey, dark)
          const bg = p.corKey === 'neutro' ? T.osNeutro  : bgEtapa(p.corKey, dark)
          const altura = p.n === 0 ? 18 : Math.max(36, (p.n / max) * 88)
          const isZero = p.n === 0
          return (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{
                height: altura, background: isZero ? T.osNeutro : bg,
                borderRadius: 8, border: `1px solid ${isZero ? T.border : c + '33'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'transform .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c, opacity: isZero ? 0.3 : 1 }} />
                <span style={{ fontSize: 20, fontWeight: 700, color: isZero ? T.textDim : c, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{p.n}</span>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 500, color: T.textSecondary, textAlign: 'center', lineHeight: 1.25 }}>{p.label}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${dividerColor(dark)}` }}>
        {[
          { lbl: 'Externo (logística)', c: corEtapa('blue', dark) },
          { lbl: 'Interno (oficina)',   c: corEtapa('yellow', dark) },
          { lbl: 'Financeiro',          c: corEtapa('green', dark) },
        ].map((l, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T.textMuted }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: l.c }} />
            {l.lbl}
          </span>
        ))}
      </div>
    </Card>
  )
}
