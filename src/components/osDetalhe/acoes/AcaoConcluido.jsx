// src/components/osDetalhe/acoes/AcaoConcluido.jsx
// Etapa Concluido — Atlassian Design (reescrito 28/05/2026).
//
// 3 panels:
//   1. Hero — banner verde 'OS concluida em N dias' + abertura/conclusao
//   2. Resumo financeiro — breakdown servicos/pecas/desloc/desconto + total +
//      metodo de pagamento
//   3. Jornada da OS — timeline vertical das etapas

import React, { useMemo } from 'react'
import { useTheme } from '../../../theme'
import { corEtapa } from '../../../utils/colors'
import { AtlPanel, ATL_FONT, atlSurfaceSunken } from './_AtlassianUI'

const fmtBRL = (n) => {
  const v = Number(n || 0)
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const METODOS_LABEL = {
  pix:      { label: 'PIX',      icon: 'brand-pix' },
  dinheiro: { label: 'Dinheiro', icon: 'cash' },
  cartao:   { label: 'Cartão',   icon: 'credit-card' },
  boleto:   { label: 'Boleto',   icon: 'file-invoice' },
}

const diasEntre = (iniIso, fimIso) => {
  if (!iniIso || !fimIso) return null
  const ini = new Date(iniIso)
  const fim = new Date(fimIso)
  return Math.max(1, Math.round((fim - ini) / 86_400_000))
}

const JORNADA_PADRAO = [
  { id: 'aberta',    label: 'OS aberta' },
  { id: 'recebida',  label: 'Máquina recebida' },
  { id: 'preDiag',   label: 'Pré-diagnóstico' },
  { id: 'diag',      label: 'Diagnóstico técnico' },
  { id: 'orcamento', label: 'Orçamento aprovado' },
  { id: 'oficina',   label: 'Execução em oficina' },
  { id: 'concluida', label: 'Teste final · entregue' },
]

export default function AcaoConcluido({ os }) {
  const { T, dark } = useTheme()
  const verde = corEtapa('green', dark)
  const azul  = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  const jornada = os?.jornada?.length ? os.jornada : JORNADA_PADRAO
  const diasTotal = useMemo(
    () => diasEntre(os?.abertaEm, os?.concluidaEm) || jornada.length,
    [os?.abertaEm, os?.concluidaEm, jornada.length]
  )

  const totais = os?.totais || {}
  const subServ = totais.servicos || 0
  const subPeca = totais.pecas    || 0
  const subDesl = totais.deslocamento || 0
  const desconto = totais.desconto || 0
  const totalPago = totais.totalPago ?? (subServ + subPeca + subDesl - desconto)

  const pag = os?.pagamento || {}
  const metodoMeta = METODOS_LABEL[pag.metodo] || null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12, fontFamily: ATL_FONT, padding: '0 0 12px',
    }}>

      {/* 1. Hero — OS concluida em N dias */}
      <div style={{
        background: dark ? 'rgba(60,140,80,0.12)' : '#E8F9EE',
        border: `1px solid ${verde}44`,
        borderRadius: 4, padding: '14px',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 4,
          background: verde, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className="ti ti-trophy" style={{ fontSize: 22 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: verde,
            letterSpacing: '-0.01em',
          }}>
            OS concluída em {diasTotal} {diasTotal === 1 ? 'dia' : 'dias'}
          </div>
          <div style={{
            fontSize: 12, color: T.textMuted, marginTop: 2,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {os?.abertaEmLabel || '—'}
            {os?.concluidaEmLabel && ` → ${os.concluidaEmLabel}`}
            {' '}· {jornada.length} etapas
          </div>
        </div>
      </div>

      {/* 2. Resumo financeiro */}
      <AtlPanel T={T} dark={dark} title="Resumo financeiro">
        {[
          { label: 'Serviços',     v: subServ },
          { label: 'Peças',        v: subPeca },
          { label: 'Deslocamento', v: subDesl },
        ].filter(r => r.v > 0).map((r, i) => (
          <div key={r.label} style={{
            padding: '8px 14px',
            borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, color: T.textPrimary }}>{r.label}</span>
            <span style={{
              fontSize: 13, fontWeight: 600, color: T.textPrimary,
              fontVariantNumeric: 'tabular-nums',
            }}>{fmtBRL(r.v)}</span>
          </div>
        ))}

        {desconto > 0 && (
          <div style={{
            padding: '8px 14px',
            borderTop: `1px solid ${T.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 13, color: vermelho }}>Desconto</span>
            <span style={{
              fontSize: 13, fontWeight: 600, color: vermelho,
              fontVariantNumeric: 'tabular-nums',
            }}>− {fmtBRL(desconto)}</span>
          </div>
        )}

        {/* Total destacado */}
        <div style={{
          padding: '14px',
          borderTop: `1px solid ${T.border}`,
          background: dark ? 'rgba(60,140,80,0.06)' : 'rgba(60,140,80,0.04)',
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: T.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>Total pago</span>
          <span style={{
            fontSize: 24, fontWeight: 700, color: verde,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
          }}>{fmtBRL(totalPago)}</span>
        </div>

        {/* Metodo de pagamento */}
        {metodoMeta && (
          <div style={{
            padding: '10px 14px',
            borderTop: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
            background: atlSurfaceSunken(dark),
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 4,
              background: verde + '22', color: verde,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={`ti ti-${metodoMeta.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
            </div>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.textPrimary }}>
              {metodoMeta.label}{pag.quandoLabel ? ` · ${pag.quandoLabel}` : ''}
            </span>
            <i className="ti ti-check" style={{
              fontSize: 14, color: verde, flexShrink: 0,
            }} aria-hidden="true" />
          </div>
        )}
      </AtlPanel>

      {/* 3. Jornada da OS */}
      <AtlPanel T={T} dark={dark} title="Jornada da OS">
        <div style={{ padding: '8px 14px 12px' }}>
          {jornada.map((step, idx) => {
            const isLast = idx === jornada.length - 1
            return (
              <div key={step.id || idx} style={{
                display: 'flex', gap: 12, padding: '8px 0',
                position: 'relative',
              }}>
                {!isLast && (
                  <span style={{
                    position: 'absolute', left: 11, top: 28, bottom: -8,
                    width: 2, background: verde, opacity: 0.4, zIndex: 1,
                  }} />
                )}
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: verde + '22', color: verde,
                  border: `2px solid ${verde}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, zIndex: 2,
                }}>
                  <i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true" />
                </span>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: T.textPrimary,
                    letterSpacing: '-0.005em',
                  }}>{step.label}</div>
                  {step.meta && (
                    <div style={{
                      fontSize: 11.5, color: T.textMuted, marginTop: 2,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{step.meta}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </AtlPanel>
    </div>
  )
}
