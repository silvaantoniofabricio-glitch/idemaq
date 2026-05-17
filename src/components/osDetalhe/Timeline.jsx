// src/components/osDetalhe/Timeline.jsx
// Timeline horizontal compacta: substitui o bloco FLUXO grande do OSDrawer antigo.
// Cada etapa vira uma bolinha pequena com conector. A etapa atual tem glow amarelo sutil.

import React from 'react'
import { P } from '../../theme'
import { corEtapa } from '../../utils/colors'

export default function Timeline({ T, dark, os, config, admin, mobile = false }) {
  const cor = (d, c) => dark ? d : c
  const etapas = (config?.etapas || []).filter(e => admin || !e.adminOnly)
  const etapaIdx = etapas.findIndex(e => e.id === os.etapa)

  // Cores fixas (paleta Deutan-safe — verde tem ✓, amarelo tem glow, cinza neutro)
  const verde = cor(P.green, P.greenDark)
  const amarelo = cor(P.yellow, P.yellowDark)
  const cinzaPendente = T.textDim
  const cinzaConector = T.border

  const dotSize = mobile ? 7 : 8
  const gap = mobile ? 4 : 6

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      gap: 0, padding: mobile ? '6px 0 4px' : '8px 0 6px',
      overflowX: mobile ? 'auto' : 'visible',
    }}>
      {etapas.map((e, i) => {
        const passou = i < etapaIdx
        const atual = i === etapaIdx
        const isUltima = i === etapas.length - 1

        const corDot = atual ? amarelo : passou ? verde : cinzaPendente
        const corConector = i < etapaIdx ? verde : cinzaConector

        return (
          <div key={e.id} style={{
            flex: mobile ? '0 0 auto' : 1,
            minWidth: mobile ? 56 : 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative',
          }}>
            {/* Bolinha + conector */}
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              {/* Espaço à esquerda da primeira (vazio) */}
              <div style={{ flex: 1, height: 2, background: i === 0 ? 'transparent' : (passou || atual ? verde : cinzaConector) }} />
              {/* Bolinha */}
              <div style={{
                width: dotSize, height: dotSize, borderRadius: '50%',
                background: corDot,
                border: passou ? 'none' : `1px solid ${corDot}`,
                boxShadow: atual ? `0 0 0 3px ${amarelo}33` : 'none',
                flexShrink: 0,
                transition: 'box-shadow .2s',
              }} aria-hidden="true" />
              {/* Conector à direita */}
              <div style={{ flex: 1, height: 2, background: isUltima ? 'transparent' : corConector }} />
            </div>

            {/* Label minúsculo */}
            <span style={{
              fontSize: mobile ? 9 : 9.5,
              color: atual ? amarelo : passou ? verde : T.textMuted,
              fontWeight: atual ? 700 : 500,
              marginTop: 4,
              textAlign: 'center', lineHeight: 1.2,
              padding: '0 2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: mobile ? 56 : 70,
            }}>
              {e.curto || e.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
