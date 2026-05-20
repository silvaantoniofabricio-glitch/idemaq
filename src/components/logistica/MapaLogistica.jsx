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
const ZOOM_DEFAULT = 13

export default function MapaLogistica({
  T, dark,
  height = 460,
  center = NAVIRAI_CENTER,
  zoom = ZOOM_DEFAULT,
  paradas = [], // futuro: [{ lat, lng, tipo: 'coleta'|'entrega', label }]
}) {
  const containerRef = useRef(null)
  const mapaRef = useRef(null)
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

        mapaRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
        })

        // Marcador fixo da oficina (sempre visível)
        new google.maps.Marker({
          position: NAVIRAI_CENTER,
          map: mapaRef.current,
          title: 'Oficina Idemaq · Naviraí/MS',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#5B9BD5',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
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

  // Atualiza marcadores quando paradas mudarem (futuro)
  useEffect(() => {
    if (status !== 'ok' || !mapaRef.current || !window.google) return
    // TODO: limpar marcadores antigos + adicionar novos com base em `paradas`
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
