// idemaq-src/hooks/useGeocodeEnderecos.js
// Geocoda uma lista de endereços (texto livre) → { lat, lng }.
//
// Estratégia (21/05/2026 noite): tenta Google Geocoding API primeiro. Se
// retornar REQUEST_DENIED (API não habilitada no projeto GCP), cai pro
// **Photon** (https://photon.komoot.io/) — geocoder público baseado em OSM,
// sem chave, CORS habilitado, rate-limit generoso pra uso razoável. Decisão
// é memoizada por sessão: depois do 1º REQUEST_DENIED do Google, todas as
// chamadas seguintes vão direto pro Photon.
//
// HISTÓRICO: a versão anterior usava OSM Nominatim, mas o uso em prod (~30
// endereços simultâneos) bate no rate-limit de 1 req/s — Nominatim retorna
// 429 e *omite o header CORS*, fazendo o browser interpretar como CORS fail.
// Photon usa a mesma base OSM, tem CORS sempre, e a versão pública aguenta
// muito mais que 1 req/s. Mesma escolha do AddressInput (autocomplete).
//
// Cache: positivos em localStorage. Falhas reconsultam na próxima sessão
// (caso a API do Google seja ativada depois, mapa preenche automaticamente).

import { useEffect, useRef, useState } from 'react'
import { loadMapsScript, MAPS_KEY_DISPONIVEL } from '../components/logistica/AddressInput'

const STORAGE_KEY = 'idemaq.geocode.cache.v2'

const QUOTA_POR_SESSAO = 60
const THROTTLE_GOOGLE_MS = 120
const THROTTLE_PHOTON_MS = 200 // generoso o suficiente sem stress no serviço público
const SUFIXO_CONTEXTO = ', Naviraí, MS, Brasil'

// Centro de Naviraí — Photon usa pra rankear resultados próximos primeiro.
const NAVIRAI_LAT = -23.0653
const NAVIRAI_LON = -54.1908

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

// Faz 1 requisição ao Photon. Retorna { coords } | { vazio: true } | { erro }.
// `lat`/`lon` no params funciona como bias (não restriction) — resultados
// próximos a Naviraí vêm primeiro, mas o serviço ainda aceita endereços fora
// do raio se forem o melhor match.
async function photonFetch(query) {
  const params = new URLSearchParams({
    q: query,
    limit: '1',
    lat: String(NAVIRAI_LAT),
    lon: String(NAVIRAI_LON),
  })
  const url = `https://photon.komoot.io/api/?${params.toString()}`
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!r.ok) return { httpErro: r.status }
    const data = await r.json()
    const feat = Array.isArray(data?.features) ? data.features[0] : null
    const coords = feat?.geometry?.coordinates
    if (coords && coords.length === 2 && coords[0] != null && coords[1] != null) {
      // Photon retorna [lon, lat] (GeoJSON), oposto do Nominatim
      return { coords: { lat: Number(coords[1]), lng: Number(coords[0]) } }
    }
    return { vazio: true }
  } catch (e) {
    return { erro: e?.message || 'fetch falhou' }
  }
}

// Photon (OSM) — geocoder público sem chave, CORS habilitado.
// Estratégia: tentativa completa + se vazio cai pra versão simplificada
// (só "Rua X, Naviraí, MS"). Sem retry por timeout pq Photon raramente falha.
async function viaPhoton(endereco) {
  const queryCompleta = comContexto(endereco)
  const r1 = await photonFetch(queryCompleta)
  if (r1.coords) return r1.coords
  if (r1.httpErro) console.warn('[geocode] Photon HTTP', r1.httpErro, endereco)

  if (r1.vazio) {
    const simplificado = versaoSimplificada(normalizarEndereco(endereco))
    if (simplificado && simplificado !== queryCompleta) {
      const r2 = await photonFetch(simplificado)
      if (r2.coords) return r2.coords
    }
    console.warn('[geocode] Photon sem resultado', endereco)
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
        let usouPhoton = false

        try {
          if (google && !googleIndisponivel) {
            const r = await viaGoogle(google, end)
            if (r.denied) {
              googleIndisponivel = true
              console.warn('[geocode] Google indisponível — caindo pro Photon (OSM) daqui em diante.')
              coordsResult = await viaPhoton(end)
              usouPhoton = true
            } else {
              coordsResult = r.coords
            }
          } else {
            coordsResult = await viaPhoton(end)
            usouPhoton = true
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

        // Throttle: 200ms pra Photon (uso público responsável), 120ms pra Google.
        await new Promise(r => setTimeout(r, usouPhoton ? THROTTLE_PHOTON_MS : THROTTLE_GOOGLE_MS))
      }
    }

    geocodar()
    return () => { cancelled = true }
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  return coords
}
