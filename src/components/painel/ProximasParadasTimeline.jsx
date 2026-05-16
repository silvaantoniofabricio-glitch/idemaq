// idemaq-src/components/painel/ProximasParadasTimeline.jsx
import React from 'react'
import { corEtapa, bgEtapa, dividerColor } from '../../utils/colors'
import Card from '../ui/Card'
import SectionHeader, { SectionAction } from '../ui/SectionHeader'

export default function ProximasParadasTimeline({ T, dark, paradas }) {
  const redC = corEtapa('red', dark)
  const yellowC = corEtapa('yellow', dark)
  const greenC = corEtapa('green', dark)
  const corByTipo = (t) => t === 'urgente' ? redC : t === 'hoje' ? yellowC : greenC
  const bgByTipo  = (t) => t === 'urgente' ? bgEtapa('red', dark) : t === 'hoje' ? bgEtapa('yellow', dark) : bgEtapa('green', dark)
  return (
    <Card T={T} dark={dark} radius={14} padding={'18px 20px'} style={{ height: '100%' }}>
      <SectionHeader T={T} dark={dark} icon="ti-route" action={<SectionAction dark={dark}>Ver logística</SectionAction>}>
        Próximas paradas · {paradas.length}
      </SectionHeader>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 19, top: 8, bottom: 8, width: 1, background: dividerColor(dark) }} />
        {paradas.map((p, i) => {
          const cor = corByTipo(p.tipo)
          return (
            <div key={i} style={{ display: 'flex', gap: 14, padding: '9px 0' }}>
              <div style={{ width: 38, display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: cor + '22', color: cor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  border: `2px solid ${T.card}`, boxShadow: `0 0 0 1px ${cor}66`,
                  position: 'relative', zIndex: 2,
                }}>{p.ini}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: '2px 10px 2px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cliente}</div>
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 6,
                    background: bgByTipo(p.tipo), color: cor, fontWeight: 600, whiteSpace: 'nowrap',
                  }}>{p.hr} · {p.dt}</span>
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.svc} · {p.equip} <span style={{ marginLeft: 6, color: T.textDim, fontFamily: 'ui-monospace, monospace', fontSize: 10.5 }}>OS {p.os}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
