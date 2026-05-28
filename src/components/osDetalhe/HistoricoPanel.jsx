// src/components/osDetalhe/HistoricoPanel.jsx
// Painel sobreposto ao OSDetalhe — timeline vertical do histórico de etapas da OS.
// Aberto pelo ícone de relógio (com badge) no Header.
//
// Consome useOSHistorico(os.id) — query real à tabela os_historico com JOIN
// em usuarios (apelido + papel). Substituiu o campo os.historico em memória.

import React, { useEffect, useRef } from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa } from '../../utils/colors'
import { TIPOS_OS } from '../../utils/osData'
import { fmtDataHora } from '../../utils/fmt'
import { useOSHistorico } from '../../hooks/useOSHistorico'

// Mapeia papel → cor (Deutan). Usado pro avatar quando o JOIN traz apelido+papel
// mas sem a cor (que existia no mock FUNCIONARIOS por id).
const COR_POR_PAPEL = {
  dono: '#5B9BD5',
  logistica: '#FFD966',
  oficina: '#B8CCE4',
}

export default function HistoricoPanel({ T, dark, os, onClose, mobile = false }) {
  const _mdb = useRef(false)
  const cor = (d, c) => dark ? d : c
  const config = TIPOS_OS[os.tipo]

  // Lê histórico real do banco. Hook retorna ordem ASCENDENTE (mais antigo
  // primeiro) — invertemos aqui pra mostrar mais recente em cima.
  const { historico: historicoAsc, loading, error } = useOSHistorico(os?.id)
  const historico = historicoAsc.slice().reverse()

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
      onMouseDown={(e) => { _mdb.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && _mdb.current) onClose() }}
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
                {loading
                  ? 'carregando…'
                  : `${historico.length} ${historico.length === 1 ? 'evento registrado' : 'eventos registrados'}`}
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
          {loading && (
            <div style={{
              padding: '24px 12px', textAlign: 'center',
              fontSize: 12, color: T.textMuted,
            }}>
              <i className="ti ti-loader" style={{ fontSize: 22, color: T.textDim, display: 'block', margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              Carregando histórico…
            </div>
          )}

          {!loading && error && (
            <div style={{
              padding: '14px 12px', borderRadius: 7,
              background: cor('#2a1515', '#fde8e8'),
              border: `1px solid ${cor(P.red, P.redDark)}55`,
              fontSize: 12, color: cor(P.red, P.redDark),
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 14 }} aria-hidden="true" />
              Erro ao carregar histórico: {error.message || 'desconhecido'}
            </div>
          )}

          {!loading && !error && historico.length === 0 && (
            <div style={{
              padding: '24px 12px', textAlign: 'center',
              fontSize: 12, color: T.textMuted,
            }}>
              <i className="ti ti-clock-off" style={{ fontSize: 24, color: T.textDim, display: 'block', margin: '0 auto 8px' }} aria-hidden="true" />
              Nenhum evento registrado ainda.
            </div>
          )}

          {!loading && !error && historico.length > 0 && (
            <div style={{ position: 'relative' }}>
              {/* Linha vertical conectora */}
              <div style={{
                position: 'absolute', left: 11, top: 8, bottom: 8,
                width: 2, background: T.border,
              }} />

              {historico.map((h, i) => {
                // h vem da query: { id, etapa_de, etapa_para, data, duracao_segundos,
                // observacao, funcionario_id, apelido, papel }
                const etapaCfg = config?.etapas?.find(e => e.id === h.etapa_para) || config?.lateral
                const corE = etapaCfg ? corEtapa(etapaCfg.cor, dark) : T.textDim
                const bgE = etapaCfg ? bgEtapa(etapaCfg.cor, dark) : T.bg
                const corFunc = COR_POR_PAPEL[h.papel] || T.textMuted
                const inicialApelido = (h.apelido || '?').slice(0, 2).toUpperCase()
                const isUltimo = i === 0 // mais recente
                const duracaoTxt = formatarDuracao(h.duracao_segundos)
                return (
                  <div key={h.id || i} style={{
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
                        }}>{etapaCfg?.label || h.etapa_para}</span>
                        <span style={{
                          fontSize: 10.5, color: T.textMuted,
                          fontVariantNumeric: 'tabular-nums',
                        }}>{fmtDataHora(h.data)}</span>
                      </div>
                      {h.apelido && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 11, color: T.textMuted,
                        }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: corFunc + '33', color: corFunc,
                            fontSize: 9, fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${corFunc}55`,
                          }}>{inicialApelido}</span>
                          <span>movido por {h.apelido}</span>
                        </div>
                      )}
                      {duracaoTxt && (
                        <div style={{
                          fontSize: 10.5, color: T.textDim, marginTop: 2,
                          fontStyle: 'italic',
                        }}>
                          <i className="ti ti-clock-hour-3" style={{ fontSize: 11, marginRight: 3, verticalAlign: 'middle' }} aria-hidden="true" />
                          ficou {duracaoTxt} na etapa anterior
                        </div>
                      )}
                      {h.observacao && (
                        <div style={{
                          fontSize: 11, color: T.textSecondary, marginTop: 4,
                          padding: '5px 8px', background: T.cardAlt, borderRadius: 5,
                          borderLeft: `2px solid ${T.border}`,
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {h.observacao}
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
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// Formata duracao_segundos pra "Xh", "Ymin", "Zd" — null/0 retorna null (oculta).
function formatarDuracao(segundos) {
  if (!segundos || segundos < 60) return null
  const min = Math.round(segundos / 60)
  if (min < 60) return `${min}min`
  const horas = Math.round(min / 60)
  if (horas < 48) return `${horas}h`
  const dias = Math.round(horas / 24)
  return `${dias}d`
}
