// idemaq-src/components/ui/Sparkline.jsx
// Mini gráfico de linha + área inline (SVG). Aceita array de números.

import React from 'react'

export default function Sparkline({ data, color, fill = 0.22, height = 38, strokeWidth = 1.5 }) {
  if (!data || data.length < 2) return null
  const clean = data.filter(v => v != null && !isNaN(v))
  if (clean.length < 2) return null

  const min = Math.min(...clean), max = Math.max(...clean), range = max - min || 1
  const w = 100, step = w / (data.length - 1)
  const pts = data.map((v, i) => v == null ? null : ({
    x: i * step,
    y: height - ((v - min) / range) * (height - 4) - 2,
  })).filter(Boolean)

  const path = pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`
    const prev = pts[i - 1]
    const cx = (prev.x + p.x) / 2
    return acc + ` Q${cx},${prev.y} ${cx},${(prev.y + p.y) / 2} T${p.x},${p.y}`
  }, '')
  const area = path + ` L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z`
  const gid = 'spk-' + Math.random().toString(36).slice(2, 8)

  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fill} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
