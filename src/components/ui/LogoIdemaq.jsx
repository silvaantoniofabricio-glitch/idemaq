// idemaq-src/components/ui/LogoIdemaq.jsx
// Logo oficial da Idemaq com 2 variantes e tintura dinâmica por tema.
//
// O PNG em /logo-idemaq.png é RGBA com:
//   - símbolo (engrenagem/globo) verde na esquerda
//   - "Ide" em BRANCO no meio (somia em light mode → trocado por azul marinho)
//   - "Maq" em verde na direita
//   - muito padding transparente ao redor
//
// Variantes:
//   variant="full"   → logo inteira (default — usado quando há largura)
//   variant="symbol" → SÓ o símbolo da esquerda (usado no slot 56px da Sidebar)
//
// Tintura: em light mode, pixels brancos viram navy. Em dark mode, original.
// Tudo cacheado em módulo (1 processamento por (variant, dark) por sessão).

import React, { useEffect, useState } from 'react'

const NAVY = '#1a3a6e'
const BRANCO_THRESHOLD = 200
const ORIGINAL_URL = '/logo-idemaq.png'

// Padding em volta do bbox detectado do símbolo (em pixels da imagem original)
const SYMBOL_BBOX_PADDING = 12

// Pra detectar o símbolo, varremos só os primeiros 30% da largura da imagem
// — evita pegar o "I" de "Ide" (que começa por volta de 27% no PNG atual) e
// dá folga caso a logo mude um pouco.
const SYMBOL_SEARCH_LIMIT_PCT = 0.30

// ─── Cache de módulo ────────────────────────────────────────────────────────
// Chaves: 'full-dark', 'full-light', 'symbol-dark', 'symbol-light'
const cacheUrl = {}
const cachePromise = {}

// Carrega a imagem 1x e cacheia o ImageBitmap-like pra reuso.
let imagemPromise = null
function carregarImagem() {
  if (imagemPromise) return imagemPromise
  imagemPromise = new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = ORIGINAL_URL
  })
  return imagemPromise
}

// Detecta o bounding box do símbolo (parte esquerda da logo).
// Olha só os primeiros SYMBOL_SEARCH_LIMIT_PCT da largura pra não capturar o "Ide".
function detectarBboxSimbolo(imgData, width, height) {
  const limiteX = Math.floor(width * SYMBOL_SEARCH_LIMIT_PCT)
  const d = imgData.data
  let minX = width, maxX = -1, minY = height, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < limiteX; x++) {
      const i = (y * width + x) * 4
      if (d[i + 3] > 0) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null // nada encontrado
  // padding com clamp pras bordas da imagem
  const p = SYMBOL_BBOX_PADDING
  return {
    x: Math.max(0, minX - p),
    y: Math.max(0, minY - p),
    width:  Math.min(width,  maxX - minX + 1 + p * 2),
    height: Math.min(height, maxY - minY + 1 + p * 2),
  }
}

// Substitui pixels brancos por NAVY in-place na ImageData.
function tingirBrancosParaNavy(imgData) {
  const d = imgData.data
  const navyR = parseInt(NAVY.slice(1, 3), 16)
  const navyG = parseInt(NAVY.slice(3, 5), 16)
  const navyB = parseInt(NAVY.slice(5, 7), 16)
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]
    if (a > 0 && r > BRANCO_THRESHOLD && g > BRANCO_THRESHOLD && b > BRANCO_THRESHOLD) {
      d[i]     = navyR
      d[i + 1] = navyG
      d[i + 2] = navyB
    }
  }
}

// Gera uma variante específica e cacheia. Sempre usa o mesmo <img> base.
function gerarVariante(variant, dark) {
  const key = `${variant}-${dark ? 'dark' : 'light'}`

  // Atalho: full-dark é a URL original sem processamento.
  if (variant === 'full' && dark) return Promise.resolve(ORIGINAL_URL)

  if (cacheUrl[key])     return Promise.resolve(cacheUrl[key])
  if (cachePromise[key]) return cachePromise[key]

  cachePromise[key] = carregarImagem().then(img => {
    const W = img.naturalWidth
    const H = img.naturalHeight

    // 1) Desenha imagem completa pra ler pixels.
    const fullCanvas = document.createElement('canvas')
    fullCanvas.width = W
    fullCanvas.height = H
    const fullCtx = fullCanvas.getContext('2d')
    fullCtx.drawImage(img, 0, 0)

    // 2) Define a região (full ou bbox do símbolo).
    let region = { x: 0, y: 0, width: W, height: H }
    if (variant === 'symbol') {
      const bbox = detectarBboxSimbolo(fullCtx.getImageData(0, 0, W, H), W, H)
      if (bbox) region = bbox
    }

    // 3) Canvas de saída com tamanho da região.
    const outCanvas = document.createElement('canvas')
    outCanvas.width  = region.width
    outCanvas.height = region.height
    const outCtx = outCanvas.getContext('2d')
    outCtx.drawImage(img,
      region.x, region.y, region.width, region.height,
      0, 0, region.width, region.height)

    // 4) Tintura (só em light mode).
    if (!dark) {
      const outData = outCtx.getImageData(0, 0, region.width, region.height)
      tingirBrancosParaNavy(outData)
      outCtx.putImageData(outData, 0, 0)
    }

    const url = outCanvas.toDataURL('image/png')
    cacheUrl[key] = url
    return url
  }).catch(err => {
    console.error(`LogoIdemaq: falha gerando "${key}"`, err)
    // Fallback no original
    return ORIGINAL_URL
  })

  return cachePromise[key]
}

/**
 * @param {object} props
 * @param {boolean} props.dark              — modo atual (afeta tintura de branco→navy)
 * @param {'full'|'symbol'} [props.variant='full']
 * @param {object}  [props.style]           — estilo inline aplicado ao <img>
 * @param {string}  [props.alt='Idemaq']
 * @param {string}  [props.className]
 */
export default function LogoIdemaq({ dark, variant = 'full', style, alt = 'Idemaq', className }) {
  const initialKey = `${variant}-${dark ? 'dark' : 'light'}`
  const initial = cacheUrl[initialKey] || (variant === 'full' && dark ? ORIGINAL_URL : null)
  const [src, setSrc] = useState(initial)

  useEffect(() => {
    let cancelled = false
    gerarVariante(variant, dark).then(url => {
      if (!cancelled) setSrc(url)
    })
    return () => { cancelled = true }
  }, [variant, dark])

  // Enquanto a variante não fica pronta, mostra o original como placeholder
  // (evita "buraco" de layout). Pra symbol-dark/light isso significa ver a
  // logo inteira por uma fração de segundo antes do crop entrar.
  return <img src={src || ORIGINAL_URL} alt={alt} className={className} style={style} />
}
