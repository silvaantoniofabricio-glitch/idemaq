// src/components/ponto/CardPontoFuncionario.jsx
// Card de ponto em destaque no PainelFuncionario.
// Mostra status atual + botão grande + meta diária + banco de horas.

import React from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { useToast } from '../ui'
import BotaoBaterPonto from './BotaoBaterPonto'
import { usePonto } from '../../hooks/usePonto'
import { TIPOS_BATIDA, fmtHora, fmtDuracao, fmtBancoHoras } from './_mocks'

const JORNADA_PADRAO_H = 8

export default function CardPontoFuncionario({ T, dark, funcionario, onAbrirEspelho }) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)

  const {
    batidasHoje,
    ultima,
    prox,
    minutosTrabHoje: minTrab,
    saldoBancoMin,
    loading,
    tabelaAusente,
    bater,
  } = usePonto({ funcionarioId: funcionario.id, escopo: 'hoje' })

  const cargaMin = JORNADA_PADRAO_H * 60
  const pctDia = Math.min(100, Math.round((minTrab / cargaMin) * 100))

  // Status atual (texto)
  let statusTxt = 'Pronto pra iniciar o dia'
  let statusCor = T.textMuted
  if (ultima) {
    if (ultima.tipo === 'entrada' || ultima.tipo === 'volta_almoco') {
      statusTxt = `Trabalhando há ${fmtDuracao(minTrab)}`
      statusCor = verde
    } else if (ultima.tipo === 'saida_almoco') {
      statusTxt = 'Em almoço'
      statusCor = amarelo
    } else if (ultima.tipo === 'saida') {
      statusTxt = 'Expediente encerrado'
      statusCor = T.textMuted
    }
  }

  async function onBater({ tipo }) {
    const result = await bater({ tipo })
    if (result?.error) {
      const msg = result.error.message || 'Erro ao bater ponto'
      notify('erro', msg)
      return { error: result.error }
    }
    const cfg = TIPOS_BATIDA[tipo]
    const horaBatida = result?.data?.bateu_em
      ? fmtHora(result.data.bateu_em)
      : fmtHora(new Date().toISOString())
    notify('ok', `${cfg.label} registrada às ${horaBatida}`)
    return result
  }

  const primeiraEntrada = [...batidasHoje]
    .filter(b => b.tipo === 'entrada')
    .sort((a, b) => new Date(a.bateu_em) - new Date(b.bateu_em))[0]

  if (loading && batidasHoje.length === 0) {
    return (
      <div className="idemaq-card" style={{
        background: T.card, borderRadius: 14,
        border: `1px solid ${T.border}`,
        padding: '18px 18px 16px',
        color: T.textMuted, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
        Carregando ponto…
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (tabelaAusente) {
    return (
      <div className="idemaq-card" style={{
        background: T.card, borderRadius: 14,
        border: `1px solid ${T.border}`,
        padding: '18px 18px 16px',
        color: T.textMuted, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-clock-off" style={{ fontSize: 18, color: amarelo }} aria-hidden="true" />
        Sistema de ponto em configuração.
      </div>
    )
  }

  return (
    <div className="idemaq-card" style={{
      background: T.card, borderRadius: 14,
      border: `1px solid ${T.border}`,
      padding: '18px 18px 16px',
      display: 'flex', flexDirection: 'column', gap: 14,
      boxShadow: T.shadow,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: bgEtapa('blue', dark),
            border: `1px solid ${azul}33`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-clock-pin" style={{ fontSize: 20, color: azul }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: corHero(dark) }}>Meu Ponto</div>
            <div style={{ fontSize: 11, color: T.textMuted }}>{funcionario.nome} · {funcionario.papel}</div>
          </div>
        </div>
        {primeiraEntrada && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 11, color: T.textMuted, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '.3px',
            }}>Entrada</div>
            <div style={{
              fontSize: 14, fontWeight: 700, color: corHero(dark),
              fontVariantNumeric: 'tabular-nums',
            }}>{fmtHora(primeiraEntrada.bateu_em)}</div>
          </div>
        )}
      </div>

      {/* Status */}
      <div style={{
        padding: '10px 12px', borderRadius: 8,
        background: ultima
          ? cor(`${statusCor}18`, `${statusCor}12`)
          : T.cardAlt,
        border: `1px solid ${ultima ? statusCor + '33' : T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <span style={{
          fontSize: 13, fontWeight: 700, color: statusCor,
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <i className={`ti ${
            ultima?.tipo === 'saida_almoco' ? 'ti-coffee'
            : ultima?.tipo === 'saida' ? 'ti-check'
            : ultima ? 'ti-activity' : 'ti-clock-hour-8'
          }`} style={{ fontSize: 15 }} aria-hidden="true" />
          {statusTxt}
        </span>
        {minTrab > 0 && (
          <span style={{
            fontSize: 11, color: T.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {pctDia}% do dia
          </span>
        )}
      </div>

      {/* Botão grande */}
      <BotaoBaterPonto T={T} dark={dark} proximoTipo={prox} onBater={onBater} />

      {/* Footer com totais */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        paddingTop: 12, borderTop: `1px solid ${T.border}`,
      }}>
        <div>
          <div style={{
            fontSize: 10, color: T.textMuted, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 3,
          }}>Hoje</div>
          <div style={{
            fontSize: 15, fontWeight: 700, color: corHero(dark),
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtDuracao(minTrab)} <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>de {JORNADA_PADRAO_H}h00</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 10, color: T.textMuted, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 3,
          }}>Banco de horas</div>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: saldoBancoMin >= 0 ? azul : corEtapa('red', dark),
            fontVariantNumeric: 'tabular-nums',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <i className={`ti ${saldoBancoMin >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`}
               style={{ fontSize: 14 }} aria-hidden="true" />
            {fmtBancoHoras(saldoBancoMin / 60)}
          </div>
        </div>
      </div>

      {/* Link pro espelho */}
      <button onClick={onAbrirEspelho} style={{
        background: 'transparent', border: 'none',
        color: azul, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        padding: 4,
      }}>
        Ver meu espelho de ponto
        <i className="ti ti-arrow-right" style={{ fontSize: 13 }} aria-hidden="true" />
      </button>
    </div>
  )
}
