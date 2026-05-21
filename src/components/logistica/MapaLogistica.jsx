// src/components/logistica/MapaLogistica.jsx
// Mapa Google Maps real, centrado em Naviraí-MS por default.
// Reusa `loadMapsScript` exportado do AddressInput (singleton da chave).
//
// Estados:
//   - loading: script carregando
//   - erro:    chave ausente / API bloqueada / erro de network
//   - ok:      mapa montado
//
// Quando paradas com lat/lng forem passadas (futuro), desenha marcadores.

import React, { useEffect, useRef, useState } from 'react'
import { loadMapsScript, MAPS_KEY_DISPONIVEL } from './AddressInput'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'

// Centro default: Oficina Idemaq · Naviraí/MS
const NAVIRAI_CENTER = { lat: -23.0653, lng: -54.1903 }
const ZOOM_DEFAULT = 14

// Esquema visual SIMPLIFICADO (pedido 21/05/2026):
//   - coleta:  azul
//   - entrega: verde
//   - outro:   azul claro (cobranca/visita/avulsa caem aqui)
// Quando a parada faz parte de uma rota, o texto do pino é o NÚMERO da ordem
// (1, 2, 3, …) — passado via prop `ordem` em cada parada. Quando NÃO tem
// ordem, cai pra letra do tipo (C/E/?/...). Pinos "disponivel" (OS da sidebar
// sem rota ainda) ficam contornados tracejado e usam "?".
const TIPO_VISUAL = {
  coleta:     { cor: '#5B9BD5', letra: 'C' },
  entrega:    { cor: '#8FBC55', letra: 'E' },
  cobranca:   { cor: '#B8CCE4', letra: '$' },
  visita:     { cor: '#B8CCE4', letra: 'V' },
  avulsa:     { cor: '#B8CCE4', letra: 'A' },
  // OS na sidebar de "disponíveis" — ainda não viraram parada de rota.
  // Pin contornado tracejado pra diferenciar visualmente das paradas oficiais.
  disponivel: { cor: '#1a3a6e', letra: '?', tracejado: true },
}

// Gera data URL SVG dum pin colorido com texto dentro — sem dependência externa.
// `texto` aceita string (ex.: 'C', '1', '12'). Font ajusta pra 2 dígitos.
// `tracejado` = pin com borda branca tracejada (OS "disponível" — sem rota).
function svgPin(cor, texto, tracejado = false) {
  const strokeProps = tracejado
    ? 'stroke="#fff" stroke-width="2" stroke-dasharray="3,2"'
    : 'stroke="#fff" stroke-width="2"'
  const t = String(texto ?? '')
  const fontSize = t.length >= 2 ? 12 : 15
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 0 C7 0 0 7 0 16 C0 25 16 42 16 42 C16 42 32 25 32 16 C32 7 25 0 16 0 Z" fill="${cor}" ${strokeProps}/>
    <text x="16" y="22" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700">${t}</text>
  </svg>`
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
}

export default function MapaLogistica({
  T, dark,
  height = 460,
  center = NAVIRAI_CENTER,
  zoom = ZOOM_DEFAULT,
  paradas = [], // [{ lat, lng, tipo, label, ordem?, onClick? }]
                // `ordem` (número) substitui a letra do pino quando presente.
}) {
  const containerRef = useRef(null)
  const mapaRef = useRef(null)
  const markersRef = useRef([])
  const googleRef = useRef(null)
  const MarkerRef = useRef(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'erro'
  const [erroMsg, setErroMsg] = useState(null)
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)

  useEffect(() => {
    let cancelado = false

    async function montar() {
      if (!MAPS_KEY_DISPONIVEL) {
        if (!cancelado) {
          setStatus('erro')
          setErroMsg('VITE_GOOGLE_MAPS_KEY não está setada')
        }
        return
      }
      try {
        const google = await loadMapsScript()
        if (cancelado || !containerRef.current) return

        // Com loading=async, o script.onload pode disparar antes do
        // google.maps.Map estar disponível. importLibrary garante que a
        // lib específica está carregada antes de instanciar.
        const { Map } = await google.maps.importLibrary('maps')
        const { Marker } = await google.maps.importLibrary('marker')
        if (cancelado || !containerRef.current) return

        googleRef.current = google
        MarkerRef.current = Marker

        mapaRef.current = new Map(containerRef.current, {
          center,
          zoom,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
          clickableIcons: false, // POIs não clicáveis (evita popup ao errar)
          styles: [
            // Esconde restaurantes, hotéis, postos, comércio, parques, etc
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            // Esconde paradas de ônibus, estações de metrô, etc
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            // Esconde escolas/hospitais/governo (ainda dentro de poi mas separado)
            { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
            // Mantém parques visíveis (verde do mapa) mas sem ícones
            { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          ],
        })

        // Marcador fixo da oficina (sempre visível) — pin laranja com "O"
        new Marker({
          position: NAVIRAI_CENTER,
          map: mapaRef.current,
          title: 'Oficina Idemaq · Naviraí/MS',
          icon: {
            url: svgPin('#FF9800', 'O'),
            scaledSize: new google.maps.Size(32, 42),
            anchor: new google.maps.Point(16, 42),
          },
          zIndex: 9999,
        })

        setStatus('ok')
      } catch (e) {
        if (cancelado) return
        console.warn('[MapaLogistica] falhou:', e.message)
        setStatus('erro')
        setErroMsg(e.message)
      }
    }

    montar()
    return () => { cancelado = true }
  }, [center.lat, center.lng, zoom])

  // Renderiza marcadores das paradas quando lista mudar
  useEffect(() => {
    if (status !== 'ok' || !mapaRef.current) return
    const google = googleRef.current
    const Marker = MarkerRef.current
    if (!google || !Marker) return

    // Limpa marcadores antigos
    for (const m of markersRef.current) m.setMap(null)
    markersRef.current = []

    if (!paradas || paradas.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    bounds.extend(NAVIRAI_CENTER)

    for (const p of paradas) {
      if (p.lat == null || p.lng == null) continue
      const visual = TIPO_VISUAL[p.tipo] || TIPO_VISUAL.avulsa
      // Quando a parada faz parte de uma rota, o pino mostra o NÚMERO da
      // ordem (1, 2, …) em vez da letra do tipo.
      const texto = p.ordem != null ? String(p.ordem) : visual.letra
      const m = new Marker({
        position: { lat: Number(p.lat), lng: Number(p.lng) },
        map: mapaRef.current,
        title: p.label || p.tipo,
        icon: {
          url: svgPin(visual.cor, texto, visual.tracejado),
          scaledSize: new google.maps.Size(32, 42),
          anchor: new google.maps.Point(16, 42),
        },
      })
      if (p.onClick) m.addListener('click', () => p.onClick(p))
      markersRef.current.push(m)
      bounds.extend(m.getPosition())
    }

    // Re-enquadra se tiver paradas válidas
    if (markersRef.current.length > 0) {
      mapaRef.current.fitBounds(bounds, 80)
      // Limita zoom in absurdo quando há 1 ou 2 paradas perto
      const listener = google.maps.event.addListenerOnce(mapaRef.current, 'idle', () => {
        if (mapaRef.current.getZoom() > 16) mapaRef.current.setZoom(15)
      })
    }
  }, [paradas, status])

  // Container sempre presente (pra google.maps.Map ter onde montar).
  // Overlays de loading/erro ficam por cima.
  return (
    <div style={{ position: 'relative', minHeight: height }}>
      <div
        ref={containerRef}
        style={{
          width: '100%', height,
          borderBottomLeftRadius: 11, borderBottomRightRadius: 11,
          background: dark ? '#1a1a1d' : '#f7f7f9',
        }}
      />

      {status === 'loading' && (
        <Overlay T={T} dark={dark} height={height}>
          <i className="ti ti-loader-2 ti-spin" style={{ fontSize: 24, color: azul }} aria-hidden="true" />
          <div style={{ fontSize: 12, color: T?.textMuted, marginTop: 8 }}>
            Carregando mapa…
          </div>
        </Overlay>
      )}

      {status === 'erro' && (
        <Overlay T={T} dark={dark} height={height}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: bgEtapa('yellow', dark),
            border: `1px solid ${amarelo}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <i className="ti ti-map-off" style={{ fontSize: 28, color: amarelo }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: corHero(dark), marginBottom: 4 }}>
            Mapa indisponível
          </div>
          <div style={{ fontSize: 11.5, color: T?.textMuted, maxWidth: 380, textAlign: 'center', lineHeight: 1.45 }}>
            {erroMsg || 'Não foi possível carregar o Google Maps.'}
          </div>
        </Overlay>
      )}
    </div>
  )
}

function Overlay({ T, dark, height, children }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      minHeight: height,
      background: dark ? 'rgba(20,20,22,0.92)' : 'rgba(247,247,249,0.92)',
      borderBottomLeftRadius: 11, borderBottomRightRadius: 11,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, pointerEvents: 'none',
    }}>
      {children}
    </div>
  )
}
