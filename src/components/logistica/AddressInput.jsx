// idemaq-src/components/logistica/AddressInput.jsx
// Campo de endereço com autocomplete.
//
// ESTRATÉGIA (21/05/2026): tenta Google Places legacy → cai pro Photon (OSM)
// quando a Places API legacy não está habilitada no projeto GCP. Mesmo padrão
// do useGeocodeEnderecos (Google Geocoding → Nominatim). Decisão é memoizada
// por sessão — depois do 1º REQUEST_DENIED, todas as digitações seguintes
// vão direto pro Photon.
//
// CONFIGURAÇÃO:
//   - Variável de ambiente Vite: VITE_GOOGLE_MAPS_KEY (opcional)
//   - Sem chave OU com Places API bloqueada → autocomplete via Photon
//     (https://photon.komoot.io/), público, gratuito, sem chave.
//
// USADO EM:
//   - Cadastro/edição de cliente
//   - Cadastro de parada na rota (ParadasEditor / AdicionarOSARotaModal)

import React, { useEffect, useRef, useState } from 'react'
import { Input } from '../ui'
import { corEtapa } from '../../utils/colors'

const MAPS_KEY = import.meta.env?.VITE_GOOGLE_MAPS_KEY || ''
const MAPS_ENABLED = Boolean(MAPS_KEY)

// Estado de módulo: depois do 1º REQUEST_DENIED do Places legacy, marca flag
// e pula direto pro Photon em todas as instâncias do componente na sessão.
let placesLegacyIndisponivel = false

// Centro de Naviraí — Photon usa pra rankear sugestões próximas primeiro,
// e o Google Places usa como location + radius (bias soft, não restrição).
const NAVIRAI_LAT = -23.0653
const NAVIRAI_LON = -54.1908
// 30km cobre Naviraí + Itaquiraí + Juti + Mundo Novo. Endereços fora do
// raio ainda aparecem (é bias soft, não restriction) mas ranqueados depois.
const NAVIRAI_BIAS_RAIO_M = 30000

// Photon: autocomplete público baseado em OSM (https://photon.komoot.io/).
// Sem chave, sem cobrança, desenhado pra typeahead (diferente do Nominatim,
// que é só geocoding pontual). Retorna predições já com lat/lng — não precisa
// de uma 2ª chamada tipo PlacesService.getDetails.
//
// IMPORTANTE: Photon só aceita lang ∈ {default, de, en, fr} — `lang=pt`
// retorna HTTP 400 e quebra a busca toda. Omitir o param = comportamento
// default (multilíngue baseado nas tags OSM, que em BR já vêm em pt).
async function buscarPhoton(texto) {
  const params = new URLSearchParams({
    q: texto,
    limit: '6',
    lat: String(NAVIRAI_LAT),
    lon: String(NAVIRAI_LON),
  })
  const url = `https://photon.komoot.io/api/?${params.toString()}`
  try {
    const r = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!r.ok) return []
    const data = await r.json()
    const feats = Array.isArray(data?.features) ? data.features : []
    return feats
      .filter(f => f?.properties?.countrycode === 'BR' || f?.properties?.country === 'Brasil' || f?.properties?.country === 'Brazil')
      .map((f, i) => {
        const p = f.properties || {}
        const coords = f.geometry?.coordinates || [null, null]
        // Monta uma description limpa: "Rua X, 51, Bairro, Cidade, UF".
        const partes = [
          [p.name, p.housenumber].filter(Boolean).join(', '),
          p.suburb || p.district,
          p.city || p.town || p.village,
          p.state,
        ].filter(Boolean)
        return {
          // ID estável o suficiente pra key do React
          place_id: `photon-${p.osm_type || 't'}-${p.osm_id || i}`,
          description: partes.join(', '),
          lat: coords[1],
          lng: coords[0],
        }
      })
      .filter(s => s.description) // descarta sugestões sem texto
  } catch {
    return []
  }
}

// ─── Loader singleton do script (exportado pra reuso em MapaLogistica) ─────
//
// Usa o "Inline Bootstrap Loader" oficial do Google
// (https://goo.gle/js-api-loader). Esse snippet registra
// `google.maps.importLibrary` IMEDIATAMENTE como uma fila — quando você
// chama importLibrary('maps') antes do script principal carregar, a
// chamada fica em queue até o script chegar. Sem race condition entre
// `script.onload` e disponibilidade do `google.maps.Map`.
let mapsBootstrapInicializado = false
function inicializarBootstrap() {
  if (mapsBootstrapInicializado || !MAPS_ENABLED) return
  if (typeof window === 'undefined') return
  if (window.google?.maps?.importLibrary) {
    mapsBootstrapInicializado = true
    return
  }
  mapsBootstrapInicializado = true
  // Snippet oficial do Google — não mexer (versão minificada do site deles).
  /* eslint-disable */
  ;((g) => {
    var h, a, k,
      p = 'The Google Maps JavaScript API',
      c = 'google',
      l = 'importLibrary',
      q = '__ib__',
      m = document,
      b = window
    b = b[c] || (b[c] = {})
    var d = b.maps || (b.maps = {}),
      r = new Set(),
      e = new URLSearchParams(),
      u = () =>
        h ||
        (h = new Promise(async (f, n) => {
          await (a = m.createElement('script'))
          e.set('libraries', [...r] + '')
          for (k in g) e.set(k.replace(/[A-Z]/g, (t) => '_' + t[0].toLowerCase()), g[k])
          e.set('callback', c + '.maps.' + q)
          a.src = `https://maps.${c}apis.com/maps/api/js?` + e
          d[q] = f
          a.onerror = () => (h = n(Error(p + ' could not load.')))
          a.nonce = m.querySelector('script[nonce]')?.nonce || ''
          m.head.append(a)
        }))
    d[l]
      ? console.warn(p + ' only loads once. Ignoring:', g)
      : (d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)))
  })({
    key: MAPS_KEY,
    v: 'weekly',
    language: 'pt-BR',
    region: 'BR',
  })
  /* eslint-enable */
}

export function loadMapsScript() {
  if (!MAPS_ENABLED) return Promise.reject(new Error('VITE_GOOGLE_MAPS_KEY ausente'))
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  inicializarBootstrap()
  // Após o bootstrap, `window.google.maps.importLibrary` está sempre
  // disponível (mesmo antes do script principal carregar). Resolve direto.
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google)
  // Fallback paranoico — espera o bootstrap registrar a função (sincrono
  // em condições normais, mas garante via micro-poll).
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      if (window.google?.maps?.importLibrary) return resolve(window.google)
      if (Date.now() - start > 3000) return reject(new Error('Bootstrap do Maps demorou demais'))
      setTimeout(tick, 30)
    }
    tick()
  })
}

export const MAPS_KEY_DISPONIVEL = MAPS_ENABLED

/**
 * @param {object} props
 * @param {string} props.value — endereço atual (texto formatado)
 * @param {(payload: { endereco: string, lat: number|null, lng: number|null }) => void} props.onChange
 * @param {string} [props.label]
 * @param {string} [props.placeholder]
 * @param {object} props.T — token de tema
 * @param {boolean} props.dark
 * @param {boolean} [props.required]
 */
export default function AddressInput({
  T, dark,
  value,
  onChange,
  label = 'Endereço',
  placeholder = 'Rua, número — bairro, cidade/UF',
  required = false,
}) {
  const azul = corEtapa('blue', dark)

  const [sugestoes, setSugestoes] = useState([])
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [mapsErro, setMapsErro] = useState(false)

  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)
  const acServiceRef = useRef(null)        // AutocompleteService
  const placesServiceRef = useRef(null)    // PlacesService
  const placesDivRef = useRef(null)        // div invisível p/ PlacesService
  const sessionTokenRef = useRef(null)     // session token (economiza quota)

  // Click-fora fecha a lista
  useEffect(() => {
    function handleClickFora(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [])

  // Carrega Maps sob demanda na primeira digitação
  async function garantirServicos() {
    if (!MAPS_ENABLED || mapsErro) return false
    if (acServiceRef.current && placesServiceRef.current) return true
    try {
      const google = await loadMapsScript()
      // Com loading=async, importLibrary é o jeito oficial de esperar a
      // sub-lib estar pronta antes de instanciar classes dela.
      const places = await google.maps.importLibrary('places')
      acServiceRef.current = new places.AutocompleteService()
      // PlacesService precisa de um nó DOM mesmo invisível
      if (!placesDivRef.current) {
        placesDivRef.current = document.createElement('div')
      }
      placesServiceRef.current = new places.PlacesService(placesDivRef.current)
      sessionTokenRef.current = new places.AutocompleteSessionToken()
      return true
    } catch (e) {
      console.warn('AddressInput: Maps indisponível —', e.message)
      setMapsErro(true)
      return false
    }
  }

  async function buscarViaPlacesLegacy(texto) {
    const ok = await garantirServicos()
    if (!ok) return { denied: true }
    return new Promise((resolve) => {
      const google = window.google
      acServiceRef.current.getPlacePredictions(
        {
          input: texto,
          componentRestrictions: { country: 'br' },
          location: new google.maps.LatLng(NAVIRAI_LAT, NAVIRAI_LON),
          radius: NAVIRAI_BIAS_RAIO_M,
          sessionToken: sessionTokenRef.current,
        },
        (preds, status) => {
          const google = window.google
          const S = google?.maps?.places?.PlacesServiceStatus
          if (status === S?.REQUEST_DENIED) return resolve({ denied: true })
          if (status !== S?.OK || !preds) return resolve({ preds: [] })
          // Marca sugestões do Places legacy pra escolherSugestao saber qual rota usar
          resolve({ preds: preds.slice(0, 6).map(p => ({ ...p, _origem: 'places' })) })
        }
      )
    })
  }

  function handleChange(novoTexto) {
    onChange?.({ endereco: novoTexto, lat: null, lng: null })

    if (debounceRef.current) clearTimeout(debounceRef.current)
    const texto = (novoTexto || '').trim()
    if (texto.length < 3) {
      setSugestoes([])
      setAberto(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setCarregando(true)

      // 1ª tentativa: Places legacy (só se Maps ativo e ainda não sabemos que falha)
      if (MAPS_ENABLED && !mapsErro && !placesLegacyIndisponivel) {
        const r = await buscarViaPlacesLegacy(texto)
        if (r.denied) {
          placesLegacyIndisponivel = true
          console.warn('[AddressInput] Places API legacy indisponível — caindo pro Photon (OSM).')
        } else {
          setCarregando(false)
          setSugestoes(r.preds)
          setAberto(r.preds.length > 0)
          return
        }
      }

      // Fallback: Photon (OSM). Funciona sem chave Google.
      const photonPreds = await buscarPhoton(texto)
      setCarregando(false)
      setSugestoes(photonPreds.map(p => ({ ...p, _origem: 'photon' })))
      setAberto(photonPreds.length > 0)
    }, 250)
  }

  function escolherSugestao(pred) {
    // Sugestões do Photon já vêm com lat/lng — aplica direto sem 2ª chamada.
    if (pred._origem === 'photon') {
      onChange?.({
        endereco: pred.description,
        lat: pred.lat ?? null,
        lng: pred.lng ?? null,
      })
      setSugestoes([])
      setAberto(false)
      return
    }

    // Places legacy: precisa do getDetails pra pegar geometry + formatted_address.
    if (!placesServiceRef.current) {
      onChange?.({ endereco: pred.description, lat: null, lng: null })
      setSugestoes([])
      setAberto(false)
      return
    }
    placesServiceRef.current.getDetails(
      {
        placeId: pred.place_id,
        fields: ['geometry', 'formatted_address'],
        sessionToken: sessionTokenRef.current,
      },
      (place, status) => {
        const google = window.google
        if (status !== google?.maps?.places?.PlacesServiceStatus?.OK || !place) {
          onChange?.({ endereco: pred.description, lat: null, lng: null })
        } else {
          onChange?.({
            endereco: place.formatted_address || pred.description,
            lat: place.geometry?.location?.lat() ?? null,
            lng: place.geometry?.location?.lng() ?? null,
          })
        }
        // Renovar session token após uma seleção (economia de quota)
        if (google?.maps?.places?.AutocompleteSessionToken) {
          sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
        }
        setSugestoes([])
        setAberto(false)
      }
    )
  }

  // Hints só aparecem quando NEM Photon vai funcionar — hoje Photon sempre
  // funciona (público + sem chave), então removemos os hints visuais antigos
  // que diziam "autocomplete em breve" / "Maps indisponível".
  const mostrarHintSemChave = false
  const mostrarHintErro = false

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <Input
        T={T}
        dark={dark}
        label={label}
        required={required}
        value={value || ''}
        onChange={handleChange}
        icon="ti-map-pin"
        placeholder={placeholder}
      />

      {aberto && sugestoes.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 4, zIndex: 50,
          background: T?.card,
          border: `1px solid ${T?.border}`,
          borderRadius: 8,
          boxShadow: dark ? '0 6px 24px rgba(0,0,0,0.35)' : '0 6px 24px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          {sugestoes.map((s) => (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); escolherSugestao(s) }}
              style={{
                width: '100%', textAlign: 'left',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none', borderBottom: `1px solid ${T?.border}`,
                color: T?.textPrimary, fontSize: 13,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = T?.cardAlt}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <i className="ti ti-map-pin" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.description}
              </span>
            </button>
          ))}
        </div>
      )}

      {mostrarHintSemChave && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, color: T?.textDim, marginTop: 1,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 12, color: azul }} aria-hidden="true" />
          <span>
            Autocomplete via Google Maps <strong style={{ color: T?.textMuted }}>em breve</strong>.
            Por enquanto, digite o endereço completo.
          </span>
        </div>
      )}

      {mostrarHintErro && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, color: T?.textDim, marginTop: 1,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 12, color: corEtapa('yellow', dark) }} aria-hidden="true" />
          <span>Maps indisponível agora — digite o endereço normalmente.</span>
        </div>
      )}

      {MAPS_ENABLED && !mapsErro && carregando && (
        <div style={{
          fontSize: 10.5, color: T?.textDim, marginTop: 1,
        }}>
          Buscando endereços…
        </div>
      )}
    </div>
  )
}
