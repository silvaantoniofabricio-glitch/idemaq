// idemaq-src/components/painel/KPICard.jsx
import React from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import Card from '../ui/Card'
import Sparkline from '../ui/Sparkline'
import DeltaPill from '../ui/DeltaPill'

export default function KPICard({ k, T, dark }) {
  const cor = corEtapa(k.corKey, dark)
  const valorTxt = k.formatoCru ? k.valor : fmtBRL(k.valor)

  return (
    <Card T={T} dark={dark} radius={14} padding={'16px 18px 0'}
      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = T.shadowHover }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)';    e.currentTarget.style.boxShadow = T.shadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          <i className={`ti ${k.icon}`} style={{ fontSize: 13, color: cor }} aria-hidden="true" />
          {k.label}
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: corHero(dark), letterSpacing: '-.025em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{valorTxt}</div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, minHeight: 22 }}>
        {k.delta != null && <DeltaPill value={k.delta} lbl={k.deltaLbl} dark={dark} />}
        {k.deltaTxt && <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>{k.deltaTxt}</span>}
        {k.sub && <span style={{ fontSize: 11, color: T.textDim }}>· {k.sub}</span>}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 8, marginLeft: -18, marginRight: -18 }}>
        <Sparkline data={k.spark} color={cor} fill={0.22} height={32} />
      </div>
    </Card>
  )
}
