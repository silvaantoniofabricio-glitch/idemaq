// idemaq-src/theme.js
// Sistema de tema (paleta Deutan + tokens dark/claro) + hook compartilhado.
// Importe em qualquer componente que precise de cores: `import { useTheme, TEMAS, P } from './theme'`

import { useState, useEffect } from 'react'

// ─── Tokens dos 2 temas ────────────────────────────────────────────────────
export const TEMAS = {
  escuro: {
    bg:        '#161618',
    card:      '#222225',
    cardAlt:   '#1a1a1d',
    border:    '#2e2e32',
    border2:   '#3a3a3e',
    sbBg:      '#1c1c1f',
    topBg:     '#1c1c1f',
    textPrimary:   '#f1f5f9',
    textSecondary: '#aaaaaa',
    textMuted:     '#666666',
    textDim:       '#444446',
    progBg:    '#111113',
    osNeutro:  '#2a2a2c',
    osNeutroT: '#888888',
    shadow:    'none',
    shadowHover: 'none',
  },
  claro: {
    bg:        '#ececef',
    card:      '#ffffff',
    cardAlt:   '#f7f7f9',
    border:    '#eaeaee',
    border2:   '#dcdce0',
    sbBg:      '#ffffff',
    topBg:     '#ffffff',
    textPrimary:   '#0a0a0d',
    textSecondary: '#3a3a3e',
    textMuted:     '#6a6a6e',
    textDim:       '#8a8a8e',
    progBg:    '#e8e8ec',
    osNeutro:  '#ebebed',
    osNeutroT: '#6a6a6e',
    shadow:    '0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)',
    shadowHover: '0 4px 12px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.06)',
  },
}

// ─── Paleta Deutan (cores acessíveis pro daltônico) ───────────────────────
// Use sempre as versões "Dark" no modo claro para contraste correto.
export const P = {
  blue:      '#5B9BD5',
  yellow:    '#FFD966',
  red:       '#c04242',
  blueLight: '#B8CCE4',
  green:     '#4ade80',
  blueDark:      '#1a6aaa',
  yellowDark:    '#b8860b',
  redDark:       '#c04242',
  blueLightDark: '#4a7ea8',
  greenDark:     '#1a7a3a',
}

// ─── useIsMobile ───────────────────────────────────────────────────────────
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// ─── useTheme ──────────────────────────────────────────────────────────────
// Retorna { T, P, dark, toggleTheme, setTheme }. Persiste em localStorage.
// Default: dark no desktop, light no mobile.
export function useTheme() {
  const isMobile = useIsMobile()
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('idemaq_tema')
    if (saved !== null) return saved === 'escuro'
    return window.innerWidth >= 768
  })

  useEffect(() => {
    document.body.style.background = dark ? TEMAS.escuro.bg : TEMAS.claro.bg
  }, [dark])

  const toggleTheme = () => {
    setDark(d => {
      const novo = !d
      try { localStorage.setItem('idemaq_tema', novo ? 'escuro' : 'claro') } catch {}
      return novo
    })
  }
  const setTheme = (modo) => {
    const novo = modo === 'escuro' || modo === 'dark'
    setDark(novo)
    try { localStorage.setItem('idemaq_tema', novo ? 'escuro' : 'claro') } catch {}
  }

  const T = TEMAS[dark ? 'escuro' : 'claro']
  return { T, P, dark, toggleTheme, setTheme, isMobile }
}

// Helper conveniente: cor(d, c) → retorna d se dark, c se light
export const corPorTema = (dark) => (d, c) => dark ? d : c
