// idemaq-src/components/ui/LogoIdemaq.jsx
// Logo oficial da Idemaq com tintura dinâmica por tema.
//
// O PNG em /logo-idemaq.png é RGBA — a parte "Ide" (e detalhes do símbolo) é
// BRANCA. Em dark fica legível, em light somia no card branco.
//
// Solução: no mount, processamos o PNG em <canvas> trocando pixels brancos
// por AZUL MARINHO (NAVY). Gera um dataURL que é usado SÓ em light mode.
// Resultado processado é cacheado em módulo (1x por sessão).

import React, { useEffect, useState } from 'react'

// Azul marinho usado pra "Ide" em light mode. Pedido do Toni — não é da
// paleta Deutan oficial, mas combina com o verde do "Maq".
const NAVY = '#1a3a6e'

// Limite de "branco" — pixel é considerado branco se R/G/B > este valor.
// 200 pega branco puro + bordas anti-aliased levemente acinzentadas.
const BRANCO_THRESHOLD = 200

const ORIGINAL_URL = '/logo-idemaq.png'

// ─── Cache de módulo (1 processamento por sessão) ─────────────────────────
let cachedLightUrl = null
let promiseAtivo = null

function gerarVersaoLight() {
  if (cachedLightUrl) return Promise.resolve(cachedLightUrl)
  if (promiseAtivo)   return promiseAtivo

  promiseAtivo = new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imgData.data

        // Parse #RRGGBB pra componentes RGB
        const navyR = parseInt(NAVY.slice(1, 3), 16)
        const navyG = parseInt(NAVY.slice(3, 5), 16)
        const navyB = parseInt(NAVY.slice(5, 7), 16)

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3]
          // Só toca em pixels visíveis (alpha > 0) que sejam "brancos".
          // Verde do "Maq" tem G alto mas R/B baixos — não é afetado.
          if (a > 0 && r > BRANCO_THRESHOLD && g > BRANCO_THRESHOLD && b > BRANCO_THRESHOLD) {
            d[i]     = navyR
            d[i + 1] = navyG
            d[i + 2] = navyB
          }
        }
        ctx.putImageData(imgData, 0, 0)
        const url = canvas.toDataURL('image/png')
        cachedLightUrl = url
        resolve(url)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = (e) => reject(e)
    img.src = ORIGINAL_URL
  })

  return promiseAtivo
}

/**
 * @param {object} props
 * @param {boolean} props.dark        — modo atual; light gera variante tingida
 * @param {object}  [props.style]     — estilo inline aplicado ao <img>
 * @param {string}  [props.alt='Idemaq']
 * @param {string}  [props.className]
 */
export default function LogoIdemaq({ dark, style, alt = 'Idemaq', className }) {
  const [lightUrl, setLightUrl] = useState(cachedLightUrl)

  useEffect(() => {
    if (!dark && !lightUrl) {
      gerarVersaoLight().then(setLightUrl).catch(err => {
        console.error('LogoIdemaq: falha ao gerar versão light', err)
      })
    }
  }, [dark, lightUrl])

  // Em light, usa a versão tingida assim que pronta; fallback no original.
  // Em dark, sempre o original (branco fica legível no fundo escuro).
  const src = dark ? ORIGINAL_URL : (lightUrl || ORIGINAL_URL)

  return <img src={src} alt={alt} className={className} style={style} />
}
