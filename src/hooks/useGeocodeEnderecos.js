// idemaq-src/hooks/useGeocodeEnderecos.js
// Geocoda uma lista de endereços (texto livre) → { lat, lng } usando o
// Google Maps Geocoding API. Cache em localStorage por endereço, throttle
// leve (200ms entre requisições) e quota de segurança por sessão.
//
// Uso:
//   const coordsPorEndereco = useGeocodeEnderecos(enderecos)
//   coordsPorEndereco['R. Acre 88, Naviraí/MS'] // { lat, lng } | undefined
//
// Pré-requisito: `VITE_GOOGLE_MAPS_KEY` setada (mesma chave do AddressInput).
// Sem chave, o hook fica em no-op e devolve {} — UI continua funcionando.

import { useEffect, useRef, useState } from 'react'
import { loadMapsScript, MAPS_KEY_DISPONIVEL } from '../components/logistica/AddressInput'

// v2 (21/05/2026): cache passou a guardar SÓ positivos — invalidação de v1
// limpa entradas null antigas que ficavam grudadas pra sempre.
const STORAGE_KEY = 'idemaq.geocode.cache.v2'

// Quota por sessão — Google Geocoding tier free aceita ~40 req/s e 40k/mês.
// 60 cobre o dia-a-dia de logística (até ~60 OS visíveis no mapa por sessão).
const QUOTA_POR_SESSAO = 60

// Throttle entre requisições. 120ms ≈ 8 req/s — bem abaixo do teto.
const THROTTLE_MS = 120

// Sufixo automático pra dar contexto pro geocoder quando o endereço não tem
// cidade/UF — a maior parte dos clientes da Idemaq está em Naviraí/MS.
const SUFIXO_CONTEXTO = ', Naviraí, MS, Brasil'

function lerCache() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function escreverCache(cache) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)) } catch { /* quota cheia, ignora */ }
}

// Heurística simples: se o endereço já tem "Naviraí" ou "MS", não anexa o sufixo.
function comContexto(end) {
  const lower = end.toLowerCase()
  if (lower.includes('navira') || /\bms\b/.test(lower)) return end
  return end + SUFIXO_CONTEXTO
}

export function useGeocodeEnderecos(enderecos) {
  const [coords, setCoords] = useState(() => lerCache())
  const cacheRef = useRef(coords)
  cacheRef.current = coords

  // Chave estável pra dependência do effect — sem isso, .join novo a cada render
  // re-dispara o effect mesmo com mesma lista de strings.
  const chave = (enderecos || []).filter(Boolean).join('|')

  useEffect(() => {
    if (!MAPS_KEY_DISPONIVEL) return
    const lista = (enderecos || []).filter(Boolean)
    if (lista.length === 0) return

    let cancelled = false
    let usados = 0

    async function geocodar() {
      let google
      try { google = await loadMapsScript() } catch { return }
      if (cancelled || !google) return

      let Geocoder
      try {
        const lib = await google.maps.importLibrary('geocoding')
        Geocoder = lib.Geocoder
      } catch { return }
      if (cancelled || !Geocoder) return

      const geocoder = new Geocoder()

      for (const end of lista) {
        if (cancelled) return
        // Só pula se já tiver positivo cacheado. Negativos NÃO são cacheados —
        // se um dia faltou chave/quota, na próxima sessão tenta de novo.
        if (cacheRef.current[end]) continue
        if (usados >= QUOTA_POR_SESSAO) break

        usados++
        try {
          const res = await new Promise((resolve) => {
            geocoder.geocode({ address: comContexto(end) }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const loc = results[0].geometry.location
                resolve({ lat: loc.lat(), lng: loc.lng() })
              } else {
                resolve(null)
              }
            })
          })
          if (cancelled) return
          if (res) {
            // Cacheia só os positivos
            const next = { ...cacheRef.current, [end]: res }
            cacheRef.current = next
            setCoords(next)
            escreverCache(next)
          }
        } catch { /* erro de rede, segue pro próximo */ }

        // throttle
        await new Promise(r => setTimeout(r, THROTTLE_MS))
      }
    }

    geocodar()
    return () => { cancelled = true }
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  return coords
}
