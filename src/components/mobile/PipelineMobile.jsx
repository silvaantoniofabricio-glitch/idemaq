// idemaq-src/components/mobile/PipelineMobile.jsx
// Pipeline compacto pro mobile — lista vertical de etapas com contagem.
// Toque numa etapa navega pra /os filtrando aquela etapa (futuro).

import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { ETAPAS_TODOS } from '../../utils/osData'

export default function PipelineMobile({ T, dark, osList = [], admin = false }) {
  const navigate = useNavigate()

  const etapas = useMemo(() => {
    return ETAPAS_TODOS
      .filter(e => admin || !e.adminOnly)
      .map(e => ({
        id: e.id,
        label: e.curto || e.label,
        cor: e.cor,
        n: (osList || []).filter(o => !o.deleted_at && o.etapa === e.id).length,
      }))
  }, [osList, admin])

  return (
    <div className="idemaq-card" style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 14,
      padding: '12px 12px 10px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 6, padding: '0 2px',
      }}>
        <i className="ti ti-route" style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
        <span style={{
          fontSize: 11, color: T.textMuted, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '.4px',
        }}>Pipeline · {etapas.reduce((s, e) => s + e.n, 0)} OS</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {etapas.map(e => {
          const corE = corEtapa(e.cor, dark)
          const bgE = bgEtapa(e.cor, dark)
          const ativa = e.n > 0
          return (
            <button key={e.id}
              onClick={() => navigate('/os')}
              style={{
                display: 'grid',
                gridTemplateColumns: '10px 1fr auto',
                gap: 10, alignItems: 'center',
                padding: '8px 10px', minHeight: 40,
                background: 'transparent',
                border: 'none', borderRadius: 8,
                cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'left',
                transition: 'background .12s',
              }}
              onTouchStart={e2 => e2.currentTarget.style.background = T.cardAlt}
              onTouchEnd={e2 => e2.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: ativa ? corE : T.border,
              }} aria-hidden="true" />
              <span style={{
                fontSize: 13.5, fontWeight: ativa ? 600 : 500,
                color: ativa ? corHero(dark) : T.textMuted,
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{e.label}</span>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: ativa ? corE : T.textDim,
                fontVariantNumeric: 'tabular-nums',
                padding: ativa ? '2px 10px' : '2px 8px',
                borderRadius: 12,
                background: ativa ? bgE : 'transparent',
                minWidth: 32, textAlign: 'center',
                flexShrink: 0,
              }}>{e.n}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
