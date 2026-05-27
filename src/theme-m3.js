// src/theme/m3.js
// Design tokens Material Design 3 (Google) — escala oficial.
// https://m3.material.io/foundations/design-tokens/overview

// ─── Spacing — grid 8dp (Material 3 nao usa 4dp como base, mas multiplos de 4) ─
export const M3_SPACE = {
  xxs: 4,   // densidade extra
  xs:  8,   // base da grade
  sm:  12,
  md:  16,  // padding padrao
  lg:  20,
  xl:  24,
  xxl: 32,
  xxxl: 40,
}

// ─── Typography (Material 3 type scale) ───────────────────────────────────
// Tamanhos em px. Mobile-first.
export const M3_TYPE = {
  // Display — uso raro (heros)
  displayLarge:  { size: 57, weight: 400, lh: 64, ls: -0.25 },
  displayMedium: { size: 45, weight: 400, lh: 52, ls:  0 },
  displaySmall:  { size: 36, weight: 400, lh: 44, ls:  0 },
  // Headline
  headlineLarge:  { size: 32, weight: 400, lh: 40, ls: 0 },
  headlineMedium: { size: 28, weight: 400, lh: 36, ls: 0 },
  headlineSmall:  { size: 24, weight: 400, lh: 32, ls: 0 },
  // Title — top app bar, dialogs, etc
  titleLarge:  { size: 22, weight: 500, lh: 28, ls: 0 },
  titleMedium: { size: 16, weight: 500, lh: 24, ls: 0.15 },
  titleSmall:  { size: 14, weight: 500, lh: 20, ls: 0.1 },
  // Body — paragraphs
  bodyLarge:  { size: 16, weight: 400, lh: 24, ls: 0.5 },
  bodyMedium: { size: 14, weight: 400, lh: 20, ls: 0.25 },
  bodySmall:  { size: 12, weight: 400, lh: 16, ls: 0.4 },
  // Label — buttons, captions, overline
  labelLarge:  { size: 14, weight: 500, lh: 20, ls: 0.1 },
  labelMedium: { size: 12, weight: 500, lh: 16, ls: 0.5 },
  labelSmall:  { size: 11, weight: 500, lh: 16, ls: 0.5 },
}

// Helper: vira CSS style object
export const m3Type = (key) => {
  const t = M3_TYPE[key]
  if (!t) return {}
  return {
    fontSize: t.size,
    fontWeight: t.weight,
    lineHeight: `${t.lh}px`,
    letterSpacing: t.ls + 'px',
  }
}

// ─── Shape / border-radius (Material 3 shape scale) ───────────────────────
export const M3_SHAPE = {
  none:        0,
  extraSmall:  4,   // small chips
  small:       8,   // small components
  medium:     12,   // cards padrao
  large:      16,   // large cards, sheets
  extraLarge: 28,   // dialogs, FABs
  full:       999,  // pills (buttons!)
}

// ─── Elevation (sombras) ──────────────────────────────────────────────────
// Usamos surface tint pra dark mode (M3 substitui sombra por tint).
export const M3_ELEVATION = {
  0: 'none',
  1: '0 1px 2px 0 rgba(0,0,0,0.08), 0 1px 3px 1px rgba(0,0,0,0.04)',
  2: '0 1px 2px 0 rgba(0,0,0,0.10), 0 2px 6px 2px rgba(0,0,0,0.06)',
  3: '0 1px 3px 0 rgba(0,0,0,0.12), 0 4px 8px 3px rgba(0,0,0,0.08)',
  4: '0 2px 3px 0 rgba(0,0,0,0.14), 0 6px 10px 4px rgba(0,0,0,0.10)',
  5: '0 4px 4px 0 rgba(0,0,0,0.16), 0 8px 12px 6px rgba(0,0,0,0.12)',
}

// ─── Tamanhos de componentes M3 ───────────────────────────────────────────
export const M3_SIZE = {
  // Botoes: 40dp altura padrao (M3 moveu de 36 → 40 em 2024)
  buttonHeight: 40,
  iconButtonSize: 40,
  iconButtonSizeLarge: 48,
  // FAB
  fabSize: 56,
  // Tap target minimo
  minTouchTarget: 48,
  // Chips
  chipHeight: 32,
  chipHeightCompact: 28,
  // Top app bar
  appBarSmall: 64,
  appBarMedium: 112,
  appBarLarge: 152,
  // Bottom navigation
  bottomNavHeight: 80,
  // Navigation rail
  navRailWidth: 80,
}

// Estilo base de um botao filled (CTA primario)
export const m3FilledButton = (T, dark, { color = 'primary' } = {}) => {
  const primary = '#5B9BD5'      // mantemos azul Idemaq
  const onPrimary = '#FFFFFF'
  return {
    minHeight: M3_SIZE.buttonHeight,
    padding: '0 24px',
    borderRadius: M3_SHAPE.full,
    border: 'none',
    background: primary,
    color: onPrimary,
    ...m3Type('labelLarge'),
    cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    WebkitTapHighlightColor: 'transparent',
    transition: 'box-shadow .15s, background .15s',
    boxShadow: M3_ELEVATION[0],
  }
}

// Botao outlined
export const m3OutlinedButton = (T, dark) => ({
  minHeight: M3_SIZE.buttonHeight,
  padding: '0 24px',
  borderRadius: M3_SHAPE.full,
  border: `1px solid ${T.border}`,
  background: 'transparent',
  color: '#5B9BD5',
  ...m3Type('labelLarge'),
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  WebkitTapHighlightColor: 'transparent',
})

// Botao text (TextButton M3)
export const m3TextButton = (T, dark) => ({
  minHeight: M3_SIZE.buttonHeight,
  padding: '0 12px',
  borderRadius: M3_SHAPE.full,
  border: 'none',
  background: 'transparent',
  color: '#5B9BD5',
  ...m3Type('labelLarge'),
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  WebkitTapHighlightColor: 'transparent',
})

// Filter chip — visual M3
export const m3FilterChip = (T, dark, { selected = false } = {}) => ({
  minHeight: M3_SIZE.chipHeight,
  padding: selected ? '0 12px 0 8px' : '0 12px',
  borderRadius: M3_SHAPE.small,
  border: `1px solid ${selected ? '#5B9BD5' : T.border}`,
  background: selected
    ? (dark ? 'rgba(91,155,213,0.20)' : '#E3F2FD')
    : T.bg,
  color: selected ? '#5B9BD5' : T.textPrimary,
  ...m3Type('labelLarge'),
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  WebkitTapHighlightColor: 'transparent',
})

// Card outlined M3
export const m3OutlinedCard = (T, dark) => ({
  background: T.card,
  border: `1px solid ${T.border}`,
  borderRadius: M3_SHAPE.medium,
  overflow: 'hidden',
})
