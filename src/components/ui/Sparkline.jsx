// idemaq-src/components/ui/Sparkline.jsx
// Mini gráfico de linha + área inline (SVG). Aceita array de números.
// Hover mostra o valor exato do dia (+ ponto na curva) — `labels` é opcional,
// um array paralelo a `data` com o texto de cada ponto (ex: "05/ago").

import React, { useRef, useState } from 'react'

export default function Sparkline({
  data, color, fill = 0.22, height = 38, strokeWidth = 1.5,
  labels, formatValue = (v) => v.toLocaleString('pt-BR'),
}) {
  const svgRef = useRef(null)
  const [hoverIdx, setHoverIdx] = useState(null)

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

  function moverParaMais(clientX) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0) return
    const relX = ((clientX - rect.left) / rect.width) * w
    const idx = Math.round(relX / step)
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)))
  }

  const ponto = hoverIdx != null ? pts.find((_, i) => i === hoverIdx) : null
  const valorHover = hoverIdx != null ? data[hoverIdx] : null
  const labelHover = hoverIdx != null ? labels?.[hoverIdx] : null

  // Tooltip perto da borda vira colado no lado oposto pra não cortar.
  const tooltipEsq = ponto != null && ponto.x > w * 0.7

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${height}`} width="100%" height={height}
        preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible', cursor: valorHover != null ? 'crosshair' : undefined }}
        onMouseMove={(e) => moverParaMais(e.clientX)}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={fill} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        {ponto && (
          <>
            <line x1={ponto.x} y1={0} x2={ponto.x} y2={height} stroke={color} strokeWidth={0.5} strokeDasharray="2,2" opacity={0.4} />
            <circle cx={ponto.x} cy={ponto.y} r={2.2} fill={color} stroke="#fff" strokeWidth={0.8} />
          </>
        )}
      </svg>

      {ponto && valorHover != null && (
        <div style={{
          position: 'absolute',
          left: tooltipEsq ? 'auto' : `${ponto.x}%`,
          right: tooltipEsq ? `${100 - ponto.x}%` : 'auto',
          top: 0,
          transform: `translate(${tooltipEsq ? '8px' : '-8px'}, -100%)`,
          marginTop: -6,
          background: '#1A1F24', color: '#fff',
          padding: '5px 9px', borderRadius: 6,
          fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
          pointerEvents: 'none', zIndex: 20,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {labelHover && (
            <div style={{ fontSize: 9.5, fontWeight: 500, opacity: 0.7, marginBottom: 1 }}>{labelHover}</div>
          )}
          {formatValue(valorHover)}
        </div>
      )}
    </div>
  )
}
