// idemaq-src/components/painel/AlertasCriticos.jsx
import React from 'react'
import { corEtapa, bgEtapa } from '../../utils/colors'
import Card from '../ui/Card'

export default function AlertasCriticos({ T, dark, criticos }) {
  const redC = corEtapa('red', dark)
  return (
    <Card T={T} dark={dark} radius={14}
      style={{ padding: 0, overflow: 'hidden', borderLeft: `3px solid ${redC}` }}
      data-no-left-border="false">
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr' }}>
        <div style={{
          padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: `1px solid ${T.border}`,
          background: 'rgba(192,66,66,0.04)', minWidth: 170,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ti ti-alert-octagon-filled" style={{ fontSize: 17, color: redC }} aria-hidden="true" />
            <span style={{ fontSize: 11, fontWeight: 700, color: redC, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Críticos · agir hoje
            </span>
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>{criticos.length} itens · revise agora</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${criticos.length}, minmax(0,1fr))` }}>
          {criticos.map((a, i) => (
            <div key={i} style={{
              padding: '14px 16px', borderLeft: i > 0 ? `1px solid ${T.border}` : 'none',
              display: 'flex', alignItems: 'center', gap: 11, minWidth: 0,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: bgEtapa('red', dark), color: redC,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className={`ti ${a.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.msg}</div>
                <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>{a.sub}</div>
              </div>
              <button style={{
                fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6,
                background: 'transparent', border: `1px solid ${T.border}`, color: T.textPrimary,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}>{a.acao}</button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
