// idemaq-src/utils/colors.js
// Helpers para resolver cor/bg por chave de paleta semântica (respeitando dark/light).

import { P } from '../theme'

export function corEtapa(nome, dark) {
  const map = {
    blue:      dark ? P.blue       : P.blueDark,
    yellow:    dark ? P.yellow     : P.yellowDark,
    red:       dark ? P.red        : P.redDark,
    blueLight: dark ? P.blueLight  : P.blueLightDark,
    green:     dark ? P.green      : P.greenDark,
    neutro:    '#888888',
    muted:     dark ? '#666666'    : '#6a6a6e',
  }
  return map[nome] || map.neutro
}

export function bgEtapa(nome, dark) {
  const map = {
    blue:      dark ? '#0d2035' : '#e6f1fb',
    yellow:    dark ? '#2a2000' : '#fdf6dc',
    red:       dark ? '#2a1515' : '#fde8e8',
    blueLight: dark ? '#0d2035' : '#e6f1fb',
    green:     dark ? '#0f2a15' : '#e8f5ec',
    neutro:    dark ? '#2a2a2c' : '#ebebed',
  }
  return map[nome] || map.neutro
}

// Cor de texto "hero" (preto puro no light, branco quente no dark) — usado em valores em destaque
export const corHero = (dark) => dark ? '#f1f5f9' : '#0a0a0d'

// Divider sutil — rgba transparente
export const dividerColor = (dark) => dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
