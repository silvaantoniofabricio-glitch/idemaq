// idemaq-src/hooks/useGeocodeEnderecos.js
// Geocoda uma lista de endereços (texto livre) → { lat, lng }.
//
// Estratégia (21/05/2026): tenta Geocoding API primeiro. Se a chave do Google
// não tem ela habilitada (status REQUEST_DENIED), cai automaticamente pra
// Places API findPlaceFromQuery — que está habilitada (mesmo serviço do
// AddressInput) e cobre o mesmo objetivo. Decisão é memoizada por sessão pra
// não desperdiçar 1 chamada de Geocoder rejeitada em cada endereço.
//
// Cache em localStorage por endereço (positivos só — falhas reconsultam na
// próxima sessão pra que ativar a API depois automaticamente preencha o mapa).
//
// Uso:
//   const coordsPorEndereco = useGeocodeEnderecos(enderecos)
//   coordsPorEndereco['R. Acre 88, Naviraí/MS'] // { lat, lng } | undefined
//
// Pré-requisito: `VITE_GOOGLE_MAPS_KEY` setada (mesma chave do AddressInput).
// Sem chave, o hook fica em no-op e devolve {} — UI continua funcionando.

import { useEffect, useRef, useState } from 'react'
import { loadMapsScript, MAPS_KEY_DISPONIVEL } from '../components/logistica/AddressInput'

const STORAGE_KEY = 'idemaq.geocode.cache.v2'

const QUOTA_POR_SESSAO = 60
const THROTTLE_MS = 120
const SUFIXO_CONTEXTO = ', Naviraí, MS, Brasil'

// Estado de módulo: depois da 1ª resposta REQUEST_DENIED do Geocoder,
// pulamos direto pro Places API em todas as próximas chamadas da sessão.
let geocoderIndisponivel = false
let placesServiceSingleton = null

function lerCache() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function escreverCache(cache) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)) } catch { /* quota cheia, ignora */ }
}

function comContexto(end) {
  const lower = end.toLowerCase()
  if (lower.includes('navira') || /\bms\b/.test(lower)) return end
  return end + SUFIXO_CONTEXTO
}

// Tenta via Geocoding API. Retorna { coords } | { denied: true } | { coords: null }.
async function viaGeocoder(google, endereco) {
  const { Geocoder } = await google.maps.importLibrary('geocoding')
  const geocoder = new Geocoder()
  return new Promise((resolve) => {
    geocoder.geocode({ address: comContexto(endereco) }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location
        resolve({ coords: { lat: loc.lat(), lng: loc.lng() } })
      } else if (status === 'REQUEST_DENIED') {
        resolve({ denied: true })
      } else {
        console.warn('[geocode] Geocoder falhou', { endereco, status })
        resolve({ coords: null })
      }
    })
  })
}

// Fallback via Places API findPlaceFromQuery (sempre disponível quando a chave
// tem Places habilitada — usada pelo AddressInput).
async function viaPlaces(google, endereco) {
  if (!placesServiceSingleton) {
    const { PlacesService } = await google.maps.importLibrary('places')
    // PlacesService precisa de um HTMLElement ou Map — usamos um div solto.
    placesServiceSingleton = new PlacesService(document.createElement('div'))
  }
  const placesService = placesServiceSingleton
  const { PlacesServiceStatus } = await google.maps.importLibrary('places')
  return new Promise((resolve) => {
    placesService.findPlaceFromQuery({
      query: comContexto(endereco),
      fields: ['geometry'],
    }, (results, status) => {
      if (status === PlacesServiceStatus.OK && results && results[0]) {
        const loc = results[0].geometry.location
        resolve({ lat: loc.lat(), lng: loc.lng() })
      } else {
        console.warn('[geocode] Places falhou', { endereco, status })
        resolve(null)
      }
    })
  })
}

export function useGeocodeEnderecos(enderecos) {
  const [coords, setCoords] = useState(() => lerCache())
  const cacheRef = useRef(coords)
  cacheRef.current = coords

  const chave = (enderecos || []).filter(Boolean).join('|')

  useEffect(() => {
    if (!MAPS_KEY_DISPONIVEL) return
    const lista = (enderecos || []).filter(Boolean)
    if (lista.length === 0) return

    let cancelled = false
    let usados = 0

    async function geocodar() {
      let google
      try { google = await loadMapsScript() } catch (e) {
        console.warn('[geocode] loadMapsScript falhou:', e?.message)
        return
      }
      if (cancelled || !google) return

      for (const end of lista) {
        if (cancelled) return
        if (cacheRef.current[end]) continue
        if (usados >= QUOTA_POR_SESSAO) break
        usados++

        let coordsResult = null
        try {
          if (!geocoderIndisponivel) {
            const r = await viaGeocoder(google, end)
            if (r.denied) {
              // Marca Geocoder como inutilizável na sessão e usa Places.
              geocoderIndisponivel = true
              console.warn('[geocode] Geocoding API não habilitada — caindo pra Places API.')
              coordsResult = await viaPlaces(google, end)
            } else {
              coordsResult = r.coords
            }
          } else {
            coordsResult = await viaPlaces(google, end)
          }
        } catch (e) {
          console.warn('[geocode] erro inesperado em', end, e?.message)
        }

        if (cancelled) return
        if (coordsResult) {
          const next = { ...cacheRef.current, [end]: coordsResult }
          cacheRef.current = next
          setCoords(next)
          escreverCache(next)
        }

        await new Promise(r => setTimeout(r, THROTTLE_MS))
      }
    }

    geocodar()
    return () => { cancelled = true }
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  return coords
}
