// idemaq-src/components/kanban/SubStatus.jsx
// Pequeno indicador de status dentro do card (Limp / Manut em "Em oficina").

import React from 'react'
import { P } from '../../theme'

export default function SubStatus({ label, status, T, dark }) {
  const cor = (d, c) => dark ? d : c
  const map = {
    concluido:    { c: cor(P.green, P.greenDark),   bg: cor('#0f2a15', '#e8f5ec'), ico: 'ti-check' },
    em_andamento: { c: cor(P.yellow, P.yellowDark), bg: cor('#2a2000', '#fdf6dc'), ico: 'ti-loader-2' },
    aguardando:   { c: T.textMuted,                 bg: T.bg,                     ico: 'ti-clock' },
    // Peça do orçamento (chip Manut.):
    falta:        { c: cor(P.red, P.redDark),       bg: cor('#2a1515', '#fde8e8'), ico: 'ti-shopping-cart' },   // zerada, não comprada
    comprado:     { c: cor(P.yellow, P.yellowDark), bg: cor('#2a2000', '#fdf6dc'), ico: 'ti-truck-delivery' },  // comprada, não chegou
  }
  const m = map[status] || map.aguardando
  return (
    <div style={{
      flex: 1, padding: '3px 6px', borderRadius: 4,
      background: m.bg, color: m.c,
      fontSize: 10, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 3,
    }}>
      <i className={`ti ${m.ico}`} style={{ fontSize: 11 }} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
