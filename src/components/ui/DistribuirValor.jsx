// src/components/ui/DistribuirValor.jsx
// Ferramenta de distribuicao de valor entre DOIS lados (X e Y) que somam o TOTAL (Z).
//
// Regras:
//  - Mexer em X ou Y NAO muda o total Z (o outro lado absorve a diferenca).
//  - Mexer no total Z mantem a proporcao atual e redistribui X e Y.
//  - Arrastar a barra muda so a proporcao (Z fica igual). Extremo esquerdo = 100% X.
//
// Uso:
//   <DistribuirValor T={T} dark={dark}
//     labelX="Mao de obra" labelY="Peças"
//     total={valor} onChange={({ x, y, total }) => ...} />

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { corEtapa } from '../../utils/colors'

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

// "1.234,56" / "1234.56" / "R$ 80" -> number
function parseBRL(s) {
  if (typeof s === 'number') return s
  const limpo = String(s ?? '').replace(/[^\d.,-]/g, '')
  if (!limpo) return 0
  const norm = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo
  const n = parseFloat(norm)
  return Number.isFinite(n) ? n : 0
}

const fmtNum = (n) => (Number(n) || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})

export default function DistribuirValor({
  T, dark,
  labelX = 'Valor X',
  labelY = 'Valor Y',
  labelTotal = 'Total',
  total: totalProp,
  ratio: ratioProp,          // fracao que fica em X (0..1)
  onChange,
  passo = 1,                 // passo do slider, em %
  style: extraStyle = {},
}) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)

  const [total, setTotal] = useState(() => round2(totalProp ?? 0))
  const [ratio, setRatio] = useState(() => (ratioProp == null ? 0.5 : ratioProp))
  // rascunho de digitacao (pra nao reformatar o campo enquanto digita)
  const [draft, setDraft] = useState(null) // { campo: 'x'|'y'|'total', txt }

  // sincroniza com props controladas
  useEffect(() => { if (totalProp != null) setTotal(round2(totalProp)) }, [totalProp])
  useEffect(() => { if (ratioProp != null) setRatio(ratioProp) }, [ratioProp])

  const x = round2(total * ratio)
  const y = round2(total - x)
  const pctX = Math.round(ratio * 100)

  const emitir = useCallback((novoTotal, novoRatio) => {
    const t = round2(novoTotal)
    const nx = round2(t * novoRatio)
    onChange?.({ x: nx, y: round2(t - nx), total: t, ratio: novoRatio })
  }, [onChange])

  const aplicar = (novoTotal, novoRatio) => {
    const r = Math.min(1, Math.max(0, novoRatio))
    setTotal(round2(novoTotal))
    setRatio(r)
    emitir(novoTotal, r)
  }

  // --- edicoes ---
  // X ou Y: total travado, o outro lado absorve
  const setX = (valor) => {
    const nx = Math.min(total, Math.max(0, round2(valor)))
    aplicar(total, total > 0 ? nx / total : 0.5)
  }
  const setY = (valor) => {
    const ny = Math.min(total, Math.max(0, round2(valor)))
    aplicar(total, total > 0 ? (total - ny) / total : 0.5)
  }
  // Total: proporcao travada, X e Y sobem/descem juntos
  const setTotalValor = (valor) => aplicar(Math.max(0, round2(valor)), ratio)

  // --- arrastar a barra ---
  const trilhaRef = useRef(null)
  const arrastando = useRef(false)

  const ratioDoEvento = (clientX) => {
    const el = trilhaRef.current
    if (!el) return ratio
    const r = el.getBoundingClientRect()
    if (r.width <= 0) return ratio
    const bruto = (clientX - r.left) / r.width
    const p = passo > 0 ? Math.round((bruto * 100) / passo) * passo / 100 : bruto
    return Math.min(1, Math.max(0, p))
  }

  useEffect(() => {
    const mover = (e) => {
      if (!arrastando.current) return
      const cx = e.touches ? e.touches[0].clientX : e.clientX
      aplicar(total, ratioDoEvento(cx))
      if (e.cancelable) e.preventDefault()
    }
    const soltar = () => { arrastando.current = false }
    window.addEventListener('mousemove', mover)
    window.addEventListener('mouseup', soltar)
    window.addEventListener('touchmove', mover, { passive: false })
    window.addEventListener('touchend', soltar)
    return () => {
      window.removeEventListener('mousemove', mover)
      window.removeEventListener('mouseup', soltar)
      window.removeEventListener('touchmove', mover)
      window.removeEventListener('touchend', soltar)
    }
  })

  const iniciarArrasto = (e) => {
    arrastando.current = true
    const cx = e.touches ? e.touches[0].clientX : e.clientX
    aplicar(total, ratioDoEvento(cx))
  }

  const teclado = (e) => {
    const d = e.key === 'ArrowLeft' ? -passo
            : e.key === 'ArrowRight' ? passo
            : e.key === 'Home' ? -100
            : e.key === 'End' ? 100
            : null
    if (d == null) return
    e.preventDefault()
    aplicar(total, ratio + d / 100)
  }

  // --- campo de valor ---
  const campo = (campoId, label, valor, aoConfirmar, cor, alinhar) => {
    const editando = draft?.campo === campoId
    return (
      <div style={{ flex: 1, minWidth: 0, textAlign: alinhar }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase',
          color: T?.textMuted, marginBottom: 6,
        }}>{label}</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          justifyContent: alinhar === 'right' ? 'flex-end' : alinhar === 'center' ? 'center' : 'flex-start',
        }}>
          <span style={{ fontSize: 13, color: T?.textMuted, fontWeight: 600 }}>R$</span>
          <input
            value={editando ? draft.txt : fmtNum(valor)}
            inputMode="decimal"
            onFocus={() => setDraft({ campo: campoId, txt: fmtNum(valor) })}
            onChange={(e) => setDraft({ campo: campoId, txt: e.target.value })}
            onBlur={() => { aoConfirmar(parseBRL(draft?.txt)); setDraft(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            style={{
              width: '100%', maxWidth: 160, minWidth: 60,
              background: 'transparent', border: 'none', outline: 'none',
              borderBottom: `1px dashed ${T?.border}`,
              color: cor, fontWeight: 800, fontSize: 20,
              fontVariantNumeric: 'tabular-nums',
              textAlign: alinhar === 'right' ? 'right' : alinhar === 'center' ? 'center' : 'left',
              padding: '2px 0',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, ...extraStyle }}>
      {/* X ---- Y */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {campo('x', labelX, x, setX, azul, 'left')}
        {campo('y', labelY, y, setY, amarelo, 'right')}
      </div>

      {/* barra de distribuicao */}
      <div>
        <div
          ref={trilhaRef}
          onMouseDown={iniciarArrasto}
          onTouchStart={iniciarArrasto}
          style={{
            position: 'relative', height: 10, borderRadius: 999,
            background: T?.border, cursor: 'ew-resize',
            touchAction: 'none', userSelect: 'none',
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, width: `${pctX}%`,
            background: azul, borderRadius: 999,
          }} />
          <div style={{
            position: 'absolute', left: `${pctX}%`, top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 24, height: 24, borderRadius: '50%',
            background: T?.card, border: `3px solid ${azul}`,
            boxShadow: dark ? 'none' : '0 1px 3px rgba(9,30,66,0.25)',
            cursor: 'grab',
          }}
            role="slider"
            tabIndex={0}
            aria-label={`Distribuicao entre ${labelX} e ${labelY}`}
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={pctX}
            onKeyDown={teclado}
          />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginTop: 8, fontSize: 12, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums', color: T?.textMuted,
        }}>
          <span style={{ color: azul }}>{pctX}%</span>
          <span style={{ color: amarelo }}>{100 - pctX}%</span>
        </div>
      </div>

      {/* total */}
      <div style={{ borderTop: `1px solid ${T?.border}`, paddingTop: 14 }}>
        {campo('total', labelTotal, total, setTotalValor, T?.textPrimary, 'center')}
      </div>
    </div>
  )
}
