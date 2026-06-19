// src/components/ponto/BotaoBaterPonto.jsx
// Botão grande de bater ponto — visual muda conforme próxima ação.
// Tenta capturar geolocalização; se negada, mostra aviso + opção de registrar sem geo.

import React, { useState } from 'react'
import { corEtapa } from '../../utils/colors'
import { TIPOS_BATIDA } from './_mocks'

const ERR_GEO = 'Permissão de localização negada'

export default function BotaoBaterPonto({ T, dark, proximoTipo, onBater, disabled = false }) {
  const cor = (d, c) => dark ? d : c
  const [loading, setLoading] = useState(false)
  const [semGeo, setSemGeo] = useState(false)   // true quando geo foi negada

  if (!proximoTipo) {
    return (
      <button disabled style={{
        width: '100%', padding: '18px 20px', borderRadius: 12, border: 'none',
        background: T.cardAlt, color: T.textMuted,
        fontSize: 15, fontWeight: 700, cursor: 'not-allowed',
        fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        opacity: 0.7,
      }}>
        <i className="ti ti-check" style={{ fontSize: 22 }} aria-hidden="true" />
        Expediente encerrado
      </button>
    )
  }

  const cfg = TIPOS_BATIDA[proximoTipo]
  const corBtn = corEtapa(cfg.cor, dark)
  const isAmarelo = cfg.cor === 'yellow'

  async function clicar(forcarSemGeo = false) {
    if (disabled || loading) return
    setSemGeo(false)
    setLoading(true)
    try {
      const result = await onBater?.({ tipo: proximoTipo, semGeo: forcarSemGeo })
      if (result?.error) {
        const msg = result.error.message || ''
        if (msg === ERR_GEO || msg.includes('localização') || msg.includes('geoloc')) {
          setSemGeo(true)  // mostra opção de registrar sem geo
        }
      }
    } catch (e) {
      if ((e.message || '').includes('localização')) setSemGeo(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={() => clicar(false)} disabled={disabled || loading}
        style={{
          width: '100%', padding: '18px 20px', borderRadius: 12, border: 'none',
          background: loading
            ? T.cardAlt
            : isAmarelo
              ? corBtn
              : `linear-gradient(135deg, ${corBtn}, ${corBtn}cc)`,
          color: loading ? T.textMuted : isAmarelo ? '#1a1a1d' : '#fff',
          fontSize: 15, fontWeight: 800,
          cursor: loading || disabled ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          letterSpacing: '0.01em',
          boxShadow: loading ? 'none' : `0 4px 14px ${corBtn}44`,
          transition: 'all .15s',
        }}>
        {loading ? (
          <>
            <i className="ti ti-loader" style={{ fontSize: 20, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
            Registrando…
          </>
        ) : (
          <>
            <i className={`ti ${cfg.icon}`} style={{ fontSize: 22 }} aria-hidden="true" />
            {cfg.labelBatida}
          </>
        )}
      </button>

      {semGeo && (
        <div style={{
          padding: '10px 12px',
          background: cor('#2a1f00', '#fff8e6'),
          border: `1px solid #ff980044`,
          borderRadius: 8,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{
            fontSize: 12, color: '#ff9800',
            display: 'flex', alignItems: 'flex-start', gap: 6,
          }}>
            <i className="ti ti-map-pin-off" style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
            <span>
              Localização bloqueada no navegador. Permita e tente de novo, ou registre sem localização.
            </span>
          </div>
          <button
            onClick={() => clicar(true)}
            disabled={loading}
            style={{
              background: 'transparent',
              border: `1px solid #ff980066`,
              borderRadius: 6,
              color: '#ff9800',
              fontSize: 12, fontWeight: 700,
              padding: '7px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            <i className="ti ti-pencil-check" style={{ fontSize: 13 }} aria-hidden="true" />
            Registrar sem localização
          </button>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
