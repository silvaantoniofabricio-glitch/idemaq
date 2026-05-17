// src/components/osDetalhe/HistoricoPanel.jsx
// Painel sobreposto ao OSDetalhe — timeline vertical do histórico de etapas da OS.
// Aberto pelo ícone de relógio (com badge) no Header.

import React, { useEffect } from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa } from '../../utils/colors'
import { TIPOS_OS, funcPorId } from '../../utils/osData'
import { fmtDataHora } from '../../utils/fmt'

export default function HistoricoPanel({ T, dark, os, onClose, mobile = false }) {
  const cor = (d, c) => dark ? d : c
  const historico = (os.historico || []).slice().reverse() // mais recente em cima
  const config = TIPOS_OS[os.tipo]

  // ESC fecha (independente do modal pai)
  useEffect(() => {
    const fn = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    document.addEventListener('keydown', fn, true)
    return () => document.removeEventListener('keydown', fn, true)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: mobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: mobile ? 0 : '2rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="idemaq-card"
        style={{
          background: T.card,
          borderRadius: mobile ? '16px 16px 0 0' : 12,
          width: '100%',
          maxWidth: mobile ? '100%' : 480,
          maxHeight: mobile ? '85vh' : '80vh',
          border: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: T.cardAlt,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-history" style={{ fontSize: 18, color: cor(P.blue, P.blueDark) }} aria-hidden="true" />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>
                Histórico da OS #{os.numero}
              </div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>
                {historico.length} {historico.length === 1 ? 'evento registrado' : 'eventos registrados'}
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: T.textMuted, padding: 6, borderRadius: 6,
            }}>
            <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>
        </div>

        {/* Lista — timeline vertical */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
          {historico.length === 0 ? (
            <div style={{
              padding: '24px 12px', textAlign: 'center',
              fontSize: 12, color: T.textMuted,
            }}>
              <i className="ti ti-clock-off" style={{ fontSize: 24, color: T.textDim, display: 'block', margin: '0 auto 8px' }} aria-hidden="true" />
              Nenhum evento registrado ainda.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Linha vertical conectora */}
              <div style={{
                position: 'absolute', left: 11, top: 8, bottom: 8,
                width: 2, background: T.border,
              }} />

              {historico.map((h, i) => {
                const etapaCfg = config?.etapas?.find(e => e.id === h.etapa) || config?.lateral
                const corE = etapaCfg ? corEtapa(etapaCfg.cor, dark) : T.textDim
                const bgE = etapaCfg ? bgEtapa(etapaCfg.cor, dark) : T.bg
                const func = funcPorId(h.funcionario)
                const isUltimo = i === 0 // mais recente
                return (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    marginBottom: i === historico.length - 1 ? 0 : 14,
                    position: 'relative',
                  }}>
                    {/* Bolinha */}
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: bgE, color: corE,
                      border: `2px solid ${corE}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      flexShrink: 0, zIndex: 1,
                      boxShadow: isUltimo ? `0 0 0 3px ${corE}22` : 'none',
                    }}>
                      <i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true" />
                    </div>

                    {/* Conteúdo */}
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 8, marginBottom: 3, flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontSize: 12.5, fontWeight: 700, color: T.textPrimary,
                        }}>{etapaCfg?.label || h.etapa}</span>
                        <span style={{
                          fontSize: 10.5, color: T.textMuted,
                          fontVariantNumeric: 'tabular-nums',
                        }}>{fmtDataHora(h.data)}</span>
                      </div>
                      {func && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 11, color: T.textMuted,
                        }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: func.cor + '33', color: func.cor,
                            fontSize: 9, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${func.cor}55`,
                          }}>{func.apelido}</span>
                          <span>{func.nome}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
