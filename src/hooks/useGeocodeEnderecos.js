// idemaq-src/hooks/useGeocodeEnderecos.js
// Geocoda uma lista de endereços (texto livre) → { lat, lng }.
//
// Estratégia (21/05/2026): tenta Google Geocoding API primeiro. Se retornar
// REQUEST_DENIED (API não habilitada no projeto GCP), cai pra OpenStreetMap
// Nominatim — geocoder público, sem chave, baseado em dados OSM. Decisão é
// memoizada por sessão: depois do 1º REQUEST_DENIED do Google, todas as
// chamadas seguintes vão direto pro Nominatim.
//
// Nominatim usage policy (https://operations.osmfoundation.org/policies/nominatim/):
//   - máx 1 req/segundo (heavy users devem usar instância própria)
//   - identificar via User-Agent ou Referer (browser manda Referer auto)
//   - cache local obrigatório → fazemos via localStorage
//
// Cache: positivos em localStorage. Falhas reconsultam na próxima sessão
// (caso a API do Google seja ativada depois, mapa preenche automaticamente).

import { useEffect, useRef, useState } from 'react'
import { loadMapsScript, MAPS_KEY_DISPONIVEL } from '../components/logistica/AddressInput'

const STORAGE_KEY = 'idemaq.geocode.cache.v2'

const QUOTA_POR_SESSAO = 60
const THROTTLE_GOOGLE_MS = 120
const THROTTLE_NOMINATIM_MS = 1100 // respeita política do OSM (1 req/s)
const SUFIXO_CONTEXTO = ', Naviraí, MS, Brasil'

// Estado de módulo: depois do 1º REQUEST_DENIED do Google, marca flag e
// pula direto pro Nominatim em todas as chamadas seguintes da sessão.
let googleIndisponivel = false

function lerCache() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
function escreverCache(cache) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cache)) } catch { /* quota cheia, ignora */ }
}

// Normaliza o endereço pra um formato que geocoders (Google e Nominatim)
// conseguem parsear melhor. Os cadastros da Idemaq vêm do Bling/Trello com
// abreviações ("R.", "Av."), separadores por hífen ("X - Bairro - Cidade") e
// CEP no final — formato que confunde principalmente o Nominatim.
//
// Antes:  "R. Cravo, 51 - Jardim Vale Encantado, Naviraí - MS, 79950-000"
// Depois: "Rua Cravo, 51, Jardim Vale Encantado, Naviraí, MS"
function normalizarEndereco(end) {
  let s = end
    // expande abreviações comuns de tipo de logradouro
    .replace(/\bR\.\s*/gi, 'Rua ')
    .replace(/\bAv\.\s*/gi, 'Avenida ')
    .replace(/\bAl\.\s*/gi, 'Alameda ')
    .replace(/\bTv\.\s*/gi, 'Travessa ')
    .replace(/\bPç\.\s*/gi, 'Praça ')
    .replace(/\bEstr\.\s*/gi, 'Estrada ')
    // " X - Y " vira " X, Y " (Nominatim quase sempre falha com hífen)
    .replace(/\s+-\s+/g, ', ')
    // remove CEP no final ou no meio (geocoder confunde)
    .replace(/\b\d{5}-?\d{3}\b/g, '')
    // limpa vírgulas duplas, espaços extras, vírgula no fim
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*$/, '')
    .trim()

  // Remove tokens duplicados consecutivos (ex: "Naviraí, MS, Brasil, Naviraí, MS").
  // Acontece quando o endereço original já vem com cidade/UF colados no final
  // depois do bairro.
  const tokens = s.split(',').map(t => t.trim()).filter(Boolean)
  const semDup = []
  for (const t of tokens) {
    const tLower = t.toLowerCase()
    if (!semDup.some(x => x.toLowerCase() === tLower)) semDup.push(t)
  }
  return semDup.join(', ')
}

// Versão simplificada quando a normalização completa não bate (último recurso):
// só tipo de logradouro + nome + cidade + UF (sem número, sem bairro, sem CEP).
function versaoSimplificada(end) {
  const match = end.match(/(Rua|Avenida|Alameda|Travessa|Praça|Estrada|Rodovia)\s+[A-Za-zÀ-ÿ\s\.0-9]+?(?=,|$)/i)
  if (!match) return null
  // Remove o número do final do nome da rua se houver ("Rua Cravo 51" → "Rua Cravo").
  const ruaSemNumero = match[0].replace(/\s+\d+\s*$/, '').trim()
  return `${ruaSemNumero}, Naviraí, MS, Brasil`
}

function comContexto(end) {
  const normalizado = normalizarEndereco(end)
  const lower = normalizado.toLowerCase()
  if (lower.includes('navira') || /\bms\b/.test(lower)) return normalizado
  return normalizado + SUFIXO_CONTEXTO
}

// Google Geocoding API. Retorna { coords } | { denied: true } | { coords: null }.
async function viaGoogle(google, endereco) {
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
        console.warn('[geocode] Google falhou', { endereco, status })
        resolve({ coords: null })
      }
    })
  })
}

// Viewbox em volta de Naviraí/MS — diz pro Nominatim que resultados
// fora dessa área são improváveis. Formato: lon_min,lat_min,lon_max,lat_max.
// Caixa generosa (~50km) que cobre Naviraí + cidades vizinhas.
const NAVIRAI_VIEWBOX = '-54.35,-23.30,-54.00,-22.85'

// Faz 1 requisição ao Nominatim com a query passada.
// Usa viewbox + bounded=1 quando preferirRegiao=true (1ª tentativa) e sem
// bounded na 2ª tentativa pra permitir match aproximado fora do viewbox.
async function nominatimFetch(query, preferirRegiao = true) {
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    q: query,
    countrycodes: 'br',
    viewbox: NAVIRAI_VIEWBOX,
  })
  if (preferirRegiao) params.set('bounded', '1')

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`
  try {
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json', 'Accept-Language': 'pt-BR' },
    })
    if (!r.ok) return { httpErro: r.status }
    const data = await r.json()
    if (Array.isArray(data) && data[0] && data[0].lat && data[0].lon) {
      return { coords: { lat: Number(data[0].lat), lng: Number(data[0].lon) } }
    }
    return { vazio: true }
  } catch (e) {
    return { erro: e?.message || 'fetch falhou' }
  }
}

// OpenStreetMap Nominatim — geocoder público sem chave.
// Estratégia: 1ª tentativa com endereço normalizado completo. Se vazio,
// tenta versão simplificada (só "Rua X, Naviraí, MS") respeitando o
// throttle policy entre as 2 chamadas.
async function viaNominatim(endereco) {
  const queryCompleta = comContexto(endereco)
  // 1ª: completo + bounded (resultados só dentro de Naviraí)
  const r1 = await nominatimFetch(queryCompleta, true)
  if (r1.coords) return r1.coords
  if (r1.httpErro) console.warn('[geocode] Nominatim HTTP', r1.httpErro, endereco)

  if (r1.vazio) {
    // 2ª: completo + sem bounded (aceita match mesmo se o ponto cair fora,
    // ex: rua de cidade vizinha que o OSM aponta no centro de Naviraí).
    await new Promise(r => setTimeout(r, 1100))
    const r2 = await nominatimFetch(queryCompleta, false)
    if (r2.coords) return r2.coords

    // 3ª: versão simplificada — só "Rua X, Naviraí, MS" (sem número/bairro).
    const simplificado = versaoSimplificada(normalizarEndereco(endereco))
    if (simplificado && simplificado !== queryCompleta) {
      await new Promise(r => setTimeout(r, 1100))
      const r3 = await nominatimFetch(simplificado, false)
      if (r3.coords) return r3.coords
    }
    console.warn('[geocode] Nominatim sem resultado', endereco)
  }
  return null
}

export function useGeocodeEnderecos(enderecos) {
  const [coords, setCoords] = useState(() => lerCache())
  const cacheRef = useRef(coords)
  cacheRef.current = coords

  const chave = (enderecos || []).filter(Boolean).join('|')

  useEffect(() => {
    const lista = (enderecos || []).filter(Boolean)
    if (lista.length === 0) return

    let cancelled = false
    let usados = 0

    async function geocodar() {
      // Tenta carregar Google só se a chave existir e ainda não soubermos que falha.
      let google = null
      if (MAPS_KEY_DISPONIVEL && !googleIndisponivel) {
        try { google = await loadMapsScript() } catch (e) {
          console.warn('[geocode] loadMapsScript falhou:', e?.message)
        }
      }
      if (cancelled) return

      for (const end of lista) {
        if (cancelled) return
        if (cacheRef.current[end]) continue
        if (usados >= QUOTA_POR_SESSAO) break
        usados++

        let coordsResult = null
        let usouNominatim = false

        try {
          if (google && !googleIndisponivel) {
            const r = await viaGoogle(google, end)
            if (r.denied) {
              googleIndisponivel = true
              console.warn('[geocode] Google indisponível — caindo pra OpenStreetMap Nominatim daqui em diante.')
              coordsResult = await viaNominatim(end)
              usouNominatim = true
            } else {
              coordsResult = r.coords
            }
          } else {
            coordsResult = await viaNominatim(end)
            usouNominatim = true
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

        // Throttle: 1.1s pra Nominatim (respeita policy OSM), 120ms pra Google.
        await new Promise(r => setTimeout(r, usouNominatim ? THROTTLE_NOMINATIM_MS : THROTTLE_GOOGLE_MS))
      }
    }

    geocodar()
    return () => { cancelled = true }
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  return coords
}
