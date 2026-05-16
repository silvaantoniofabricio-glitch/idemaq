// idemaq-src/components/ui/Badge.jsx
// Variantes semânticas (azul/amarelo/vermelho/verde/neutro) + livre (color/bg/border).
// `tipo` pode ser uma string semântica conhecida (StatusBadge pattern) ou usar props color/bg/border direto.

import React from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa } from '../../utils/colors'

// Mapa de status semânticos pré-definidos (mantém os labels do código original)
const STATUS = {
  vencido:  { c: 'red',    label: 'Vencido' },
  amanha:   { c: 'yellow', label: 'Amanhã' },
  '2dias':  { c: 'green',  label: '2 dias' },
  hoje:     { c: 'yellow', label: 'Hoje' },
  esgotado: { c: 'red',    label: 'Esgotado' },
  critico:  { c: 'red',    label: 'Crítico' },
  baixo:    { c: 'yellow', label: 'Baixo' },
  atrasada: { c: 'red',    label: 'Atrasada' },
  pago:     { c: 'green',  label: '✓ Pago' },
}

export default function Badge({
  children,
  // Variante semântica + tema:
  variant,        // 'azul' | 'amarelo' | 'vermelho' | 'verde' | 'neutro' | 'azulClaro'
  dark,
  // Override livre (substitui variant):
  color, bg, border,
  // Tamanho:
  sm = false,
}) {
  // Mapa variantes → corEtapa key
  const variantMap = {
    azul: 'blue',
    amarelo: 'yellow',
    vermelho: 'red',
    verde: 'green',
    neutro: 'neutro',
    azulClaro: 'blueLight',
  }

  if (variant && variantMap[variant]) {
    const k = variantMap[variant]
    color = color || corEtapa(k, dark)
    bg = bg || bgEtapa(k, dark)
    border = border || (corEtapa(k, dark) + '33')
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: sm ? 10 : 11,
      padding: sm ? '2px 6px' : '3px 8px',
      borderRadius: 20,
      fontWeight: 600,
      whiteSpace: 'nowrap',
      color, background: bg,
      border: border ? `1px solid ${border}` : 'none',
      letterSpacing: '0.01em',
    }}>{children}</span>
  )
}

// StatusBadge — wrapper que mapeia um tipo semântico pra Badge
export function StatusBadge({ tipo, dark, sm }) {
  const s = STATUS[tipo]
  if (!s) return null
  return <Badge variant={s.c === 'red' ? 'vermelho' : s.c === 'yellow' ? 'amarelo' : 'verde'} dark={dark} sm={sm}>{s.label}</Badge>
}

// CountBadge — pequeno badge numérico (azul ou vermelho)
export function CountBadge({ n, red, dark, T }) {
  const redBg  = dark ? '#2a1515' : '#fde8e8'
  const redClr = dark ? P.red     : P.redDark
  const defBg  = dark ? '#1a3a5c' : '#e6f1fb'
  const defClr = dark ? P.blue    : P.blueDark
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: red ? redBg : defBg, color: red ? redClr : defClr,
      fontVariantNumeric: 'tabular-nums',
    }}>{n}</span>
  )
}
