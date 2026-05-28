// idemaq-src/components/mobile/PipelineMobile.jsx
// Pipeline compacto mobile — Apple HIG rebuild.
// Aceita `pipeline` array pronto (novo) ou recalcula de `osList` (legado).

import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { ETAPAS_TODOS } from '../../utils/osData'

export default function PipelineMobile({ T, dark, pipeline: pipelineExterna, osList = [], admin = false }) {
  const navigate = useNavigate()

  const pipeline = useMemo(() => {
    if (pipelineExterna) return pipelineExterna
    return ETAPAS_TODOS
      .filter(e => admin || !e.adminOnly)
      .map(e => ({
        id: e.id, label: e.curto || e.label, cor: e.cor,
        n: (osList || []).filter(o => !o.deleted_at && o.etapa === e.id).length,
      }))
  }, [pipelineExterna, osList, admin])

  const total = pipeline.reduce((s, e) => s + e.n, 0)
  const azul  = corEtapa('blue', dark)
  const bgAzul = bgEtapa('blue', dark)

  return (
    <div style={{
      background: T.card,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-route" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>Pipeline</span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: azul, background: bgAzul,
          borderRadius: 100, padding: '2px 7px', marginLeft: 2,
        }}>{total} OS</span>
      </div>

      {/* Linhas de etapa */}
      {pipeline.map((e, i) => {
        const cor    = corEtapa(e.cor, dark)
        const bg     = bgEtapa(e.cor, dark)
        const ativa  = e.n > 0
        const pct    = total > 0 ? Math.round((e.n / total) * 100) : 0

        return (
          <button key={e.id}
            onClick={() => navigate('/os')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', minHeight: 42, width: '100%',
              background: 'transparent', border: 'none', borderRadius: 0,
              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              borderTop: `1px solid ${T.border}`,
              transition: 'background .1s',
            }}
            onTouchStart={ev => ev.currentTarget.style.background = T.cardAlt}
            onTouchEnd={ev => ev.currentTarget.style.background = 'transparent'}
          >
            {/* Indicador de cor */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: ativa ? cor : T.border,
              boxShadow: ativa ? `0 0 0 3px ${bg}` : 'none',
              transition: 'background .1s',
            }} aria-hidden="true" />

            {/* Label */}
            <span style={{
              flex: 1, fontSize: 13.5, minWidth: 0,
              fontWeight: ativa ? 600 : 500,
              color: ativa ? corHero(dark) : T.textMuted,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{e.label}</span>

            {/* Mini barra de proporção */}
            {ativa && (
              <div style={{
                width: 40, height: 3, borderRadius: 2,
                background: T.border, overflow: 'hidden', flexShrink: 0,
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: cor, borderRadius: 2,
                }} />
              </div>
            )}

            {/* Badge count */}
            <span style={{
              fontSize: 12, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: ativa ? cor : T.textDim,
              background: ativa ? bg : 'transparent',
              borderRadius: 8, padding: ativa ? '2px 9px' : '2px 6px',
              minWidth: 28, textAlign: 'center', flexShrink: 0,
              transition: 'all .1s',
            }}>{e.n}</span>

            <i className="ti ti-chevron-right"
               style={{ fontSize: 13, color: T.textDim, flexShrink: 0 }}
               aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
