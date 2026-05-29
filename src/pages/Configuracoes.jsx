// src/pages/Configuracoes.jsx
// Configuracoes da empresa — Atlassian Design (reescrito 28/05/2026).
//
// MVP: edicao da meta mensal e da jornada padrao. Cada chave vive na tabela
// `configuracoes` (sql/10) como chave/valor JSONB. Hook: useConfiguracoes.

import React, { useState, useEffect } from 'react'
import { useIsMobile } from '../theme'
import { fmtBRL } from '../utils/fmt'
import { useConfiguracoes } from '../hooks/useConfiguracoes'
import { useToast } from '../components/ui/Toast'
import { corEtapa } from '../utils/colors'

const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const ATL_RADIUS = 4

export default function Configuracoes({ T, dark }) {
  const isMobile = useIsMobile()
  const { configs, loading, tabelaAusente, get, set } = useConfiguracoes()
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)

  const [meta, setMeta] = useState('')
  const [jornada, setJornada] = useState('')
  const [salvandoMeta, setSalvandoMeta] = useState(false)
  const [salvandoJornada, setSalvandoJornada] = useState(false)

  useEffect(() => {
    if (!loading) {
      setMeta(String(get('meta_mensal', 20000)))
      setJornada(String(get('jornada_padrao_horas', 8)))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, configs])

  async function salvarMeta() {
    const v = Number(meta)
    if (!Number.isFinite(v) || v <= 0) {
      notify('erro', 'Meta inválida — informe um valor maior que zero.')
      return
    }
    setSalvandoMeta(true)
    const { error } = await set('meta_mensal', v)
    setSalvandoMeta(false)
    if (error) {
      if (error.code === 'OFFLINE') {
        notify('info', 'Modo demo: rode sql/10-configuracoes.sql pra persistir.')
      } else {
        notify('erro', `Falha ao salvar meta: ${error.message || 'erro'}`)
      }
      return
    }
    notify('ok', `Meta mensal atualizada pra ${fmtBRL(v)}.`)
  }

  async function salvarJornada() {
    const v = Number(jornada)
    if (!Number.isFinite(v) || v <= 0 || v > 24) {
      notify('erro', 'Jornada inválida — informe um número entre 1 e 24.')
      return
    }
    setSalvandoJornada(true)
    const { error } = await set('jornada_padrao_horas', v)
    setSalvandoJornada(false)
    if (error) {
      if (error.code === 'OFFLINE') {
        notify('info', 'Modo demo: rode sql/10-configuracoes.sql pra persistir.')
      } else {
        notify('erro', `Falha ao salvar jornada: ${error.message || 'erro'}`)
      }
      return
    }
    notify('ok', `Jornada padrão atualizada pra ${v} h/dia.`)
  }

  return (
    <div style={{
      padding: '20px 24px 32px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
      fontFamily: ATL_FONT,
    }}>
      {/* Page header — escondido no mobile (titulo ja esta na topbar) */}
      {!isMobile && (
        <div>
          <h1 style={{
            fontSize: 22, fontWeight: 700, color: T.textPrimary,
            margin: 0, letterSpacing: '-0.01em',
          }}>Configurações</h1>
          <p style={{
            fontSize: 13, color: T.textMuted, margin: '4px 0 0',
            letterSpacing: '-0.005em',
          }}>
            Parâmetros da empresa usados pelos painéis e relatórios.
          </p>
        </div>
      )}

      {tabelaAusente && (
        <AtlPanel T={T} dark={dark} accent={amarelo}>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: ATL_RADIUS,
              background: amarelo + '22', color: amarelo,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 15 }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: 12.5, color: T.textPrimary, lineHeight: 1.45 }}>
              <strong>Modo demo:</strong> rode <code style={{
                background: dark ? 'rgba(255,255,255,0.07)' : '#F4F5F7',
                padding: '1px 5px', borderRadius: 3,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                fontSize: 11,
              }}>sql/10-configuracoes.sql</code> no Supabase pra
              persistir as alterações. Por enquanto, as mudanças ficam só nesta sessão.
            </div>
          </div>
        </AtlPanel>
      )}

      {/* Meta mensal */}
      <AtlPanel T={T} dark={dark}
        titleIcon="target"
        title="Meta mensal de faturamento"
        footer="O Painel usa essa meta pra calcular o progresso do mês e a meta diária restante.">
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <AtlField T={T} dark={dark}
              label="Meta (R$)"
              icon="currency-real"
              type="number" min={0} step={100}
              value={meta} onChange={setMeta}
              width={200}
            />
            <AtlButton T={T} dark={dark} variant="primary"
              icon={salvandoMeta ? 'loader-2' : 'device-floppy'}
              disabled={salvandoMeta || loading}
              onClick={salvarMeta}>
              {salvandoMeta ? 'Salvando…' : 'Salvar'}
            </AtlButton>
            <div style={{
              fontSize: 11.5, color: T.textMuted,
              fontVariantNumeric: 'tabular-nums', alignSelf: 'center',
            }}>
              Atual: <strong style={{ color: T.textPrimary }}>
                {fmtBRL(Number(get('meta_mensal', 20000)) || 0)}
              </strong>
            </div>
          </div>
        </div>
      </AtlPanel>

      {/* Jornada padrao */}
      <AtlPanel T={T} dark={dark}
        titleIcon="clock"
        title="Jornada padrão"
        footer="Horas trabalhadas por dia. Base do módulo Ponto (horas extras / banco de horas).">
        <div style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <AtlField T={T} dark={dark}
              label="Horas / dia"
              icon="hourglass"
              type="number" min={1} max={24} step={0.5}
              value={jornada} onChange={setJornada}
              width={160}
            />
            <AtlButton T={T} dark={dark} variant="primary"
              icon={salvandoJornada ? 'loader-2' : 'device-floppy'}
              disabled={salvandoJornada || loading}
              onClick={salvarJornada}>
              {salvandoJornada ? 'Salvando…' : 'Salvar'}
            </AtlButton>
            <div style={{
              fontSize: 11.5, color: T.textMuted,
              fontVariantNumeric: 'tabular-nums', alignSelf: 'center',
            }}>
              Atual: <strong style={{ color: T.textPrimary }}>
                {Number(get('jornada_padrao_horas', 8)) || 8} h/dia
              </strong>
            </div>
          </div>
        </div>
      </AtlPanel>
    </div>
  )
}

// ─── Primitivos Atlassian inline ─────────────────────────────────────────
function AtlPanel({ T, dark, title, titleIcon, accent, footer, children }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: ATL_RADIUS, overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
      fontFamily: ATL_FONT,
    }}>
      {(title || titleIcon) && (
        <div style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
          background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
        }}>
          {accent && (
            <div style={{
              width: 3, alignSelf: 'stretch', borderRadius: 99,
              background: accent, minHeight: 14, flexShrink: 0,
            }} />
          )}
          {titleIcon && (
            <i className={`ti ti-${titleIcon}`}
               style={{ fontSize: 14, color: T.textMuted, flexShrink: 0 }}
               aria-hidden="true" />
          )}
          <div style={{
            fontSize: 13, fontWeight: 600, color: T.textPrimary,
            letterSpacing: '-0.005em', flex: 1,
          }}>{title}</div>
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div style={{
          padding: '8px 14px',
          borderTop: `1px solid ${T.border}`,
          background: dark ? 'rgba(255,255,255,0.025)' : '#F7F8F9',
          fontSize: 12, color: T.textMuted,
        }}>{footer}</div>
      )}
    </div>
  )
}

function AtlButton({ T, dark, variant = 'default', icon, onClick, disabled, children }) {
  const azul = corEtapa('blue', dark)
  const styles = variant === 'primary'
    ? { background: azul, color: '#fff', border: 'none' }
    : {
        background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
        color: T.textPrimary,
        border: `1px solid ${T.border}`,
      }
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{
        ...styles,
        padding: '7px 12px', borderRadius: 3,
        fontSize: 13.5, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: ATL_FONT,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        minHeight: 32, letterSpacing: '-0.005em',
        WebkitTapHighlightColor: 'transparent',
      }}>
      {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
      {children}
    </button>
  )
}

function AtlField({ T, dark, label, icon, value, onChange, type = 'text', width, ...rest }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width }}>
      <label style={{
        fontSize: 11, fontWeight: 600, color: T.textMuted,
        letterSpacing: '-0.005em',
      }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '0 10px',
        background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: `1px solid ${T.border}`,
        borderRadius: 3, height: 32,
      }}>
        {icon && (
          <i className={`ti ti-${icon}`}
             style={{ fontSize: 14, color: T.textMuted, flexShrink: 0 }}
             aria-hidden="true" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...rest}
          style={{
            flex: 1, minWidth: 0,
            border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13, color: T.textPrimary,
            fontFamily: ATL_FONT, letterSpacing: '-0.005em',
            fontVariantNumeric: 'tabular-nums',
          }}
        />
      </div>
    </div>
  )
}
