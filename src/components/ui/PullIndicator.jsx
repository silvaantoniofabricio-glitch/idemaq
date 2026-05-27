// src/components/ui/PullIndicator.jsx
// Indicador visual do pull-to-refresh — ícone gira conforme puxa,
// vira loader quando refreshing=true.

import React from 'react'
import { useTheme } from '../../theme'
import { P } from '../../theme'

export default function PullIndicator({ distance, refreshing, progress }) {
  const { dark } = useTheme()
  const azul = dark ? P.blue : P.blueDark

  // Visível só quando puxando ou refrescando
  const altura = refreshing ? 50 : Math.max(0, distance)
  const opacity = refreshing ? 1 : progress

  return (
    <div style={{
      position: 'sticky', top: 0, left: 0, right: 0,
      height: altura,
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
      transition: refreshing ? 'height .2s' : 'none',
    }}>
      <div style={{
        opacity,
        transition: refreshing ? 'opacity .2s' : 'none',
      }}>
        <i className={`ti ti-refresh ${refreshing ? 'idemaq-spin' : ''}`}
          style={{
            fontSize: 22, color: azul, display: 'inline-block',
            transform: refreshing ? 'none' : `rotate(${progress * 360}deg)`,
            transition: refreshing ? 'none' : 'transform .1s',
          }}
          aria-hidden="true" />
      </div>
      <style>{`
        @keyframes idemaq-spin-anim {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .idemaq-spin {
          animation: idemaq-spin-anim .9s linear infinite;
        }
      `}</style>
    </div>
  )
}
