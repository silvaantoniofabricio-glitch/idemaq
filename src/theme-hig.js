// src/theme-hig.js
// Design tokens Apple Human Interface Guidelines (iOS).
// https://developer.apple.com/design/human-interface-guidelines/

// Fonte do sistema Apple (SF Pro Text/Display)
export const HIG_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif'
export const HIG_FONT_MONO = '"SF Mono", ui-monospace, Menlo, monospace'
export const HIG_FONT_ROUNDED = '-apple-system, "SF Pro Rounded", system-ui, sans-serif'

// ─── Typography (HIG Type Ramp) ───────────────────────────────────────────
// Tamanhos em pt = px (mobile). Pesos: regular 400 / medium 500 / semibold 600 / bold 700
export const HIG_TYPE = {
  largeTitle:   { size: 34, weight: 700, lh: 41, ls:  0.37 },
  title1:       { size: 28, weight: 400, lh: 34, ls:  0.36 },
  title2:       { size: 22, weight: 400, lh: 28, ls:  0.35 },
  title3:       { size: 20, weight: 400, lh: 25, ls:  0.38 },
  headline:     { size: 17, weight: 600, lh: 22, ls: -0.41 },
  body:         { size: 17, weight: 400, lh: 22, ls: -0.41 },
  callout:      { size: 16, weight: 400, lh: 21, ls: -0.32 },
  subheadline:  { size: 15, weight: 400, lh: 20, ls: -0.24 },
  footnote:     { size: 13, weight: 400, lh: 18, ls: -0.08 },
  caption1:     { size: 12, weight: 400, lh: 16, ls:  0    },
  caption2:     { size: 11, weight: 400, lh: 13, ls:  0.07 },
}

export const higType = (key) => {
  const t = HIG_TYPE[key]
  if (!t) return {}
  return {
    fontFamily: HIG_FONT,
    fontSize: t.size,
    fontWeight: t.weight,
    lineHeight: `${t.lh}px`,
    letterSpacing: `${t.ls}px`,
  }
}

// ─── System colors ────────────────────────────────────────────────────────
// Cores nativas do iOS — adaptamos pro azul Idemaq mantendo o feel.
export const HIG_COLOR = {
  // Acento — mantemos azul Idemaq no lugar do systemBlue #007AFF
  tint: '#007AFF',         // systemBlue (poderia ser #5B9BD5 idemaq)
  tintIdemaq: '#5B9BD5',   // alternativa: azul Idemaq
  red:    '#FF3B30',
  green:  '#34C759',
  orange: '#FF9500',
  yellow: '#FFCC00',
  // Grays
  gray:   '#8E8E93',
  gray2:  '#AEAEB2',
  gray3:  '#C7C7CC',
  gray4:  '#D1D1D6',
  gray5:  '#E5E5EA',
  gray6:  '#F2F2F7',
  // Backgrounds
  bg:           '#FFFFFF',
  bgGrouped:    '#F2F2F7',
  bgSecondary:  '#FFFFFF',
  separator:    'rgba(60,60,67,0.29)',
  separatorOpaque: '#C6C6C8',
}

// ─── Spacing — Apple recomenda multiplos de 4/8 ───────────────────────────
export const HIG_SPACE = {
  xxs: 4,
  xs:  8,
  sm:  12,
  md:  16,
  lg:  20,
  xl:  24,
  xxl: 32,
}

// ─── Shapes / radius (iOS usa 10pt cards padrao, 13pt sheets) ─────────────
export const HIG_RADIUS = {
  small:   6,
  card:   10,    // Inset grouped list, cards padrao
  sheet:  13,    // Action sheets, modais
  large:  18,
  pill:  999,
}

// ─── Tamanhos ──────────────────────────────────────────────────────────────
export const HIG_SIZE = {
  // Tap target minimo = 44pt
  minTouchTarget: 44,
  // Listas: row 44pt min
  listRow: 44,
  // Navigation bar: 44pt + safe area
  navBar: 44,
  navBarLarge: 96,  // com large title
  // Tab bar: 49pt + safe area
  tabBar: 49,
  // Botoes: prominent ~50pt, plain ~44pt
  buttonProminent: 50,
  buttonPlain: 44,
}

// ─── Botao prominent (CTA principal) ───────────────────────────────────────
// .borderedProminent: rounded 12pt, fundo .tint, label branco semibold
export const higFilledButton = (T, dark, { color } = {}) => ({
  minHeight: 50,
  padding: '0 16px',
  borderRadius: 12,
  border: 'none',
  background: color || HIG_COLOR.tintIdemaq,
  color: '#FFFFFF',
  ...higType('headline'),
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  WebkitTapHighlightColor: 'transparent',
  transition: 'opacity .15s',
})

// Botao tinted (filled mais suave, fundo tint 15%)
export const higTintedButton = (T, dark) => ({
  minHeight: 44,
  padding: '0 16px',
  borderRadius: 10,
  border: 'none',
  background: dark ? 'rgba(91,155,213,0.18)' : 'rgba(91,155,213,0.15)',
  color: HIG_COLOR.tintIdemaq,
  ...higType('headline'),
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  WebkitTapHighlightColor: 'transparent',
})

// Botao plain (so texto em tint)
export const higPlainButton = (T, dark) => ({
  minHeight: 44,
  padding: '0 12px',
  borderRadius: 0,
  border: 'none',
  background: 'transparent',
  color: HIG_COLOR.tintIdemaq,
  ...higType('body'),
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  WebkitTapHighlightColor: 'transparent',
})

// Inset grouped list (cards arredondados estilo iOS Settings/Lista)
export const higInsetCard = (T, dark) => ({
  background: T.card,
  borderRadius: HIG_RADIUS.card,
  overflow: 'hidden',
})

// Section header (uppercase footnote)
export const higSectionHeader = (T, dark) => ({
  ...higType('footnote'),
  color: T.textMuted,
  textTransform: 'uppercase',
  padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px`,
  letterSpacing: 0.5,
})
