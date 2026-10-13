// src/components/logistica/MapaLogistica.jsx
// Mapa OpenStreetMap (Leaflet), centrado em Naviraí-MS por default.
// Gratuito e sem chave — trocou o Google Maps em 13/10/2026 (faturamento
// do Google Cloud negado).
//
// Estados:
//   - loading: montando
//   - erro:    falha ao criar o mapa
//   - ok:      mapa montado
//
// Quando paradas com lat/lng forem passadas, desenha marcadores.

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'

// Centro default: Oficina Idemaq · Alameda Londrina, 438 · Naviraí/MS
// Coordenadas geocodadas via Nominatim (21/05/2026).
const NAVIRAI_CENTER = { lat: -23.0630348, lng: -54.1803840 }
const ZOOM_DEFAULT = 14

// Esquema visual (revisado 21/05/2026 noite): 5 tipos canônicos + 2 aliases
// que o mobile usa (`receber` = cobranca, `outros` = visita). Alinhado com a
// tabela do contexto-logistica.md §3 e com o `VISUAL_TIPO` do LogisticaMobile.
//
// Quando a parada faz parte de uma rota, o texto do pino é o `codigo` (ex.
// "A1") ou `ordem` numérica — passado via prop em cada parada. Quando NÃO
// tem nenhum dos dois, cai pra letra do tipo (C/E/$/V/A). Pinos "disponivel"
// (OS sem rota ainda) ficam contornados tracejado e usam "?".
const TIPO_VISUAL = {
  coleta:              { cor: '#5B9BD5', letra: 'C' },
  aguardando_coleta:   { cor: '#A6C8E5', letra: 'C' }, // azul claro p/ `aguardando_agendamento`
  entrega:             { cor: '#8FBC55', letra: 'E' },
  aguardando_entrega:  { cor: '#C5E0A4', letra: 'E' }, // verde claro p/ `teste_final`
  cobranca:            { cor: '#FFD966', letra: '$' },
  receber:             { cor: '#FFD966', letra: '$' }, // alias UI mobile
  visita:              { cor: '#B8CCE4', letra: 'V' },
  outros:              { cor: '#B8CCE4', letra: 'V' }, // alias UI mobile
  avulsa:              { cor: '#9CA3AF', letra: 'A' },
  // OS na sidebar de "disponíveis" — ainda não viraram parada de rota.
  // Pin contornado tracejado pra diferenciar visualmente das paradas oficiais.
  disponivel:          { cor: '#1a3a6e', letra: '?', tracejado: true },
}

// Pinos ~22% menores no display que o SVG nativo (pedido 21/05/2026 noite).
// Aplicado no tamanho do ícone, evitando reescrever o path do SVG.
const PIN_DISPLAY_SCALE = 0.78

// Gera data URL SVG dum pin colorido com texto dentro — sem dependência externa.
// `texto` aceita string (ex.: 'C', 'A1', '12'). Font ajusta automático.
// `tracejado` = borda branca tracejada (OS "disponível" — sem rota).
// `agendamento` = desenha um anel amarelo externo no pino (ponto de atenção).
function svgPin(cor, texto, tracejado = false, agendamento = false) {
  const strokeProps = tracejado
    ? 'stroke="#fff" stroke-width="2" stroke-dasharray="3,2"'
    : 'stroke="#fff" stroke-width="2"'
  const t = String(texto ?? '')
  // 1 caractere: fonte 15. 2 caracteres (A1, B2…): fonte 12. 3+: fonte 10.
  const fontSize = t.length >= 3 ? 10 : t.length === 2 ? 12 : 15
  // Anel amarelo de atenção quando a OS tem `data_agendamento` (precisa não atrasar).
  // Anel maior em volta do pino. SVG cresce de 32×42 pra 40×48 nesse caso.
  const w = agendamento ? 40 : 32
  const h = agendamento ? 48 : 42
  const cx = agendamento ? 20 : 16
  const px = agendamento ? 4 : 0
  const py = agendamento ? 3 : 0
  const anel = agendamento
    ? `<circle cx="${cx}" cy="20" r="19" fill="none" stroke="#FFD966" stroke-width="3"/>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    ${anel}
    <g transform="translate(${px} ${py})">
      <path d="M16 0 C7 0 0 7 0 16 C0 25 16 42 16 42 C16 42 32 25 32 16 C32 7 25 0 16 0 Z" fill="${cor}" ${strokeProps}/>
      <text x="16" y="22" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700">${t}</text>
    </g>
  </svg>`
  return { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg), w, h, cx, anchorY: agendamento ? 45 : 42 }
}

const sz = (n) => Math.round(n * PIN_DISPLAY_SCALE)
const iconeDoPin = (pin) => L.icon({
  iconUrl: pin.url,
  iconSize: [sz(pin.w), sz(pin.h)],
  iconAnchor: [sz(pin.cx), sz(pin.anchorY)],
})

export default function MapaLogistica({
  T, dark,
  height = 460,
  center = NAVIRAI_CENTER,
  zoom = ZOOM_DEFAULT,
  paradas = [], // [{ lat, lng, tipo, label, ordem?, codigo?, agendamento?, onClick? }]
                // - `codigo` (string "A1"/"B2"…): texto do pino se a parada está em rota nomeada
                // - `ordem` (número): fallback se sem código
                // - `agendamento` (bool): desenha anel amarelo de atenção
}) {
  const containerRef = useRef(null)
  const mapaRef = useRef(null)
  const markersRef = useRef([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'erro'
  const [erroMsg, setErroMsg] = useState(null)
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)

  useEffect(() => {
    if (!containerRef.current) return
    try {
      const mapa = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom,
        zoomControl: true,
      })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapa)

      // Marcador fixo da oficina (sempre visível) — pin laranja com "O"
      L.marker([NAVIRAI_CENTER.lat, NAVIRAI_CENTER.lng], {
        icon: iconeDoPin(svgPin('#FF9800', 'O')),
        title: 'Oficina Idemaq · Alameda Londrina, 438 · Naviraí/MS',
        zIndexOffset: 9999,
      }).addTo(mapa)

      mapaRef.current = mapa
      setStatus('ok')
    } catch (e) {
      console.warn('[MapaLogistica] falhou:', e.message)
      setStatus('erro')
      setErroMsg(e.message)
    }
    return () => {
      markersRef.current = []
      mapaRef.current?.remove()
      mapaRef.current = null
    }
  }, [center.lat, center.lng, zoom])

  // Renderiza marcadores das paradas quando lista mudar
  useEffect(() => {
    const mapa = mapaRef.current
    if (status !== 'ok' || !mapa) return

    for (const m of markersRef.current) m.remove()
    markersRef.current = []

    if (!paradas || paradas.length === 0) return

    const pontos = [[NAVIRAI_CENTER.lat, NAVIRAI_CENTER.lng]]

    for (const p of paradas) {
      if (p.lat == null || p.lng == null) continue
      const visual = TIPO_VISUAL[p.tipo] || TIPO_VISUAL.avulsa
      // Prioridade do texto exibido no pino:
      //   1. `codigo` (ex.: "A1") quando a parada está numa rota nomeada
      //   2. `ordem` (número) quando só tem ordem mas não letra da rota
      //   3. letra do tipo (C/E/?/...) como fallback
      const texto = p.codigo != null
        ? String(p.codigo)
        : p.ordem != null ? String(p.ordem) : visual.letra
      // `tracejado` da parada sobrescreve o do TIPO_VISUAL — usado pra OS
      // "disponíveis" terem cor por tipo (coleta/entrega/cobrança/etc) MAS
      // ainda mostrarem borda tracejada por não estarem em rota ainda.
      const tracejadoFinal = p.tracejado != null ? p.tracejado : visual.tracejado
      const pin = svgPin(visual.cor, texto, tracejadoFinal, !!p.agendamento)
      const lat = Number(p.lat), lng = Number(p.lng)
      const m = L.marker([lat, lng], {
        icon: iconeDoPin(pin),
        title: p.label || p.tipo,
      }).addTo(mapa)
      // Clique nativo no ícone: o 'click' do Leaflet era descartado em cliques
      // reais de mouse (testado em prod), então ouvimos o DOM direto. Ignora
      // quando o mouse andou >5px (era arrasto do mapa, não clique no pino).
      const el = m.getElement()
      if (p.onClick && el) {
        let inicio = null
        el.addEventListener('pointerdown', (e) => { inicio = [e.clientX, e.clientY] })
        el.addEventListener('click', (e) => {
          if (inicio && Math.hypot(e.clientX - inicio[0], e.clientY - inicio[1]) > 5) return
          p.onClick(p)
        })
      }
      markersRef.current.push(m)
      pontos.push([lat, lng])
    }

    // maxZoom evita zoom absurdo quando há 1 ou 2 paradas perto
    if (markersRef.current.length > 0) {
      mapa.fitBounds(L.latLngBounds(pontos), { padding: [80, 80], maxZoom: 15 })
    }
  }, [paradas, status])

  // Container sempre presente (pro Leaflet ter onde montar).
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
            {erroMsg || 'Não foi possível carregar o mapa.'}
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
