// src/components/ponto/BotaoBaterPonto.jsx
// Botão grande de bater ponto — visual muda conforme próxima ação.
// Captura geolocalização (placeholder no MVP visual) e dispara onBater.

import React, { useState } from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa } from '../../utils/colors'
import { TIPOS_BATIDA } from './_mocks'

export default function BotaoBaterPonto({ T, dark, proximoTipo, onBater, disabled = false }) {
  const cor = (d, c) => dark ? d : c
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)

  // Sem próximo tipo = expediente encerrado
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

  async function clicar() {
    if (disabled || loading) return
    setErro(null)
    setLoading(true)
    try {
      const result = await onBater?.({ tipo: proximoTipo })
      if (result?.error) {
        setErro(result.error.message || 'Erro ao bater ponto')
      }
    } catch (e) {
      setErro(e.message || 'Erro ao bater ponto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={clicar} disabled={disabled || loading}
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

      {erro && (
        <div style={{
          marginTop: 8, padding: '8px 12px',
          background: cor('#3a2200', '#fff4e0'),
          border: `1px solid #ff980055`,
          borderRadius: 7, fontSize: 11.5, color: '#ff9800',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} aria-hidden="true" />
          {erro} — permita a localização e tente de novo.
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
