// src/components/ponto/SaldoBancoHoras.jsx
// Card de saldo do banco de horas — destaque positivo (azul, hora extra a
// compensar) ou negativo (vermelho, horas devidas). Acompanha um indicador
// com ícone pra reforçar a leitura (paleta Deutan — verde/vermelho puros
// não são confiáveis pro daltônico Deutan).
//
// Props:
//   T, dark        — tokens de tema
//   saldoMinutos   — saldo em minutos (positivo ou negativo). 0 = neutro.
//   periodo        — string opcional ("Maio/2026", "últimos 7 dias", etc)
//
// Uso típico no PainelFuncionario:
//   <SaldoBancoHoras T={T} dark={dark} saldoMinutos={saldoBancoMin} />

import React from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { fmtDuracao } from './_mocks'

export default function SaldoBancoHoras({ T, dark, saldoMinutos = 0, periodo = 'acumulado' }) {
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  const positivo = saldoMinutos > 0
  const negativo = saldoMinutos < 0
  const neutro = saldoMinutos === 0

  const cor = positivo ? azul : negativo ? vermelho : T.textMuted
  const icon = positivo ? 'ti-trending-up' : negativo ? 'ti-trending-down' : 'ti-equal'
  const titulo = positivo ? 'Saldo a favor'
              : negativo ? 'Saldo devedor'
              : 'Banco zerado'
  const descricao = positivo ? 'Você fez horas extras — a compensar ou receber.'
                  : negativo ? 'Você deve horas — compensar nos próximos dias.'
                  : 'Bateu a jornada padrão sem extras ou pendências.'

  const sinal = positivo ? '+' : negativo ? '-' : ''
  const valor = `${sinal}${fmtDuracao(Math.abs(saldoMinutos))}`

  return (
    <div className="idemaq-card" style={{
      background: T.card, borderRadius: 14,
      border: `1px solid ${T.border}`,
      padding: '16px 18px',
      boxShadow: T.shadow,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Cabeçalho */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div style={{
          fontSize: 11, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.5px',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-arrows-exchange" style={{ fontSize: 13 }} aria-hidden="true" />
          Banco de horas
        </div>
        <span style={{ fontSize: 10.5, color: T.textDim, fontStyle: 'italic' }}>
          {periodo}
        </span>
      </div>

      {/* Valor grande + ícone */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 14px',
        borderRadius: 10,
        background: neutro ? T.cardAlt : bgEtapa(positivo ? 'blue' : 'red', dark),
        border: `1px solid ${neutro ? T.border : cor + '44'}`,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: neutro ? T.card : cor + '22',
          border: `1px solid ${cor}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className={`ti ${icon}`} style={{ fontSize: 24, color: cor }} aria-hidden="true" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: cor,
            textTransform: 'uppercase', letterSpacing: '.4px',
            marginBottom: 2,
          }}>
            {titulo}
          </div>
          <div style={{
            fontSize: 26, fontWeight: 800,
            color: corHero(dark),
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}>
            {valor}
          </div>
        </div>
      </div>

      {/* Descrição */}
      <div style={{
        fontSize: 11.5, color: T.textSecondary, lineHeight: 1.45,
      }}>
        {descricao}
      </div>
    </div>
  )
}
