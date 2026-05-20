// idemaq-src/components/logistica/AddressInput.jsx
// Campo de endereço com autocomplete via Google Maps Places.
//
// CONFIGURAÇÃO:
//   - Variável de ambiente Vite: VITE_GOOGLE_MAPS_KEY
//   - Se não estiver setada, o componente cai pro modo "texto livre" com hint
//     visual — mesmo comportamento da versão anterior.
//
// COMPORTAMENTO COM CHAVE:
//   1. Carrega o script `maps/api/js?libraries=places` uma vez (singleton).
//   2. Digita → debounce 250ms → `AutocompleteService.getPlacePredictions`.
//   3. Sugestão clicada → `PlacesService.getDetails` → devolve `{ endereco, lat, lng }`.
//   4. Se Maps falhar, ainda permite texto livre (envia lat/lng=null).
//
// USADO EM:
//   - Cadastro/edição de cliente
//   - Cadastro de parada na rota (modal futuro)

import React, { useEffect, useRef, useState } from 'react'
import { Input } from '../ui'
import { corEtapa } from '../../utils/colors'

const MAPS_KEY = import.meta.env?.VITE_GOOGLE_MAPS_KEY || ''
const MAPS_ENABLED = Boolean(MAPS_KEY)

// ─── Loader singleton do script (exportado pra reuso em MapaLogistica) ─────
let mapsScriptPromise = null
export function loadMapsScript() {
  if (!MAPS_ENABLED) return Promise.reject(new Error('VITE_GOOGLE_MAPS_KEY ausente'))
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.google?.maps?.places) return Promise.resolve(window.google)
  if (mapsScriptPromise) return mapsScriptPromise

  mapsScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&libraries=places&language=pt-BR&region=BR&loading=async`
    s.async = true
    s.defer = true
    s.onload = () => resolve(window.google)
    s.onerror = () => {
      mapsScriptPromise = null
      reject(new Error('Falha ao carregar Google Maps'))
    }
    document.head.appendChild(s)
  })
  return mapsScriptPromise
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

  function handleChange(novoTexto) {
    onChange?.({ endereco: novoTexto, lat: null, lng: null })

    if (!MAPS_ENABLED || mapsErro) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    const texto = (novoTexto || '').trim()
    if (texto.length < 3) {
      setSugestoes([])
      setAberto(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const ok = await garantirServicos()
      if (!ok) return
      setCarregando(true)
      acServiceRef.current.getPlacePredictions(
        {
          input: texto,
          componentRestrictions: { country: 'br' },
          sessionToken: sessionTokenRef.current,
        },
        (preds, status) => {
          setCarregando(false)
          const google = window.google
          if (status !== google?.maps?.places?.PlacesServiceStatus?.OK || !preds) {
            setSugestoes([])
            setAberto(false)
            return
          }
          setSugestoes(preds.slice(0, 6))
          setAberto(true)
        }
      )
    }, 250)
  }

  function escolherSugestao(pred) {
    if (!placesServiceRef.current) return
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

  const mostrarHintSemChave = !MAPS_ENABLED
  const mostrarHintErro = MAPS_ENABLED && mapsErro

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
