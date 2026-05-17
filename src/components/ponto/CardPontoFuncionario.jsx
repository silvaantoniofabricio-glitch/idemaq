// src/components/ponto/CardPontoFuncionario.jsx
// Card de ponto em destaque no PainelFuncionario.
// Mostra status atual + botão grande + meta diária + banco de horas.

import React, { useState } from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { useToast } from '../ui'
import BotaoBaterPonto from './BotaoBaterPonto'
import {
  TIPOS_BATIDA, proximoTipo, ultimaBatidaHoje,
  minutosTrabalhadosHoje, fmtHora, fmtDuracao, fmtBancoHoras,
  BATIDAS_MOCK, JORNADA_MOCK,
} from './_mocks'

export default function CardPontoFuncionario({ T, dark, funcionario, onAbrirEspelho }) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)

  // Cópia local pra simular novas batidas no MVP visual
  const [batidasLocais, setBatidasLocais] = useState(() => ({ ...BATIDAS_MOCK }))

  const ultima = ultimaBatidaHoje(funcionario.id, batidasLocais)
  const prox = proximoTipo(ultima)
  const minTrab = minutosTrabalhadosHoje(funcionario.id, batidasLocais)
  const jornada = JORNADA_MOCK[funcionario.id] || {}
  const cargaMin = (jornada.carga_diaria_horas || 8) * 60
  const pctDia = Math.min(100, Math.round((minTrab / cargaMin) * 100))

  // Status atual (texto)
  let statusTxt = 'Pronto pra iniciar o dia'
  let statusCor = T.textMuted
  if (ultima) {
    if (ultima.tipo === 'entrada' || ultima.tipo === 'almoco_fim') {
      statusTxt = `Trabalhando há ${fmtDuracao(minTrab)}`
      statusCor = verde
    } else if (ultima.tipo === 'almoco_inicio') {
      statusTxt = 'Em almoço'
      statusCor = amarelo
    } else if (ultima.tipo === 'saida') {
      statusTxt = 'Expediente encerrado'
      statusCor = T.textMuted
    }
  }

  async function bater({ tipo, endereco, latitude, longitude }) {
    const novaBatida = {
      id: Date.now(),
      tipo,
      data_hora: new Date().toISOString(),
      latitude, longitude, endereco,
    }
    setBatidasLocais(prev => ({
      ...prev,
      [funcionario.id]: [...(prev[funcionario.id] || []), novaBatida],
    }))
    const cfg = TIPOS_BATIDA[tipo]
    notify('ok', `${cfg.label} registrada às ${fmtHora(novaBatida.data_hora)} · ${endereco}`)
  }

  // Última batida pra mostrar no card
  const primeiraEntrada = (batidasLocais[funcionario.id] || [])
    .filter(b => b.tipo === 'entrada' && new Date(b.data_hora).toDateString() === new Date().toDateString())
    .sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))[0]

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
            }}>{fmtHora(primeiraEntrada.data_hora)}</div>
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
            ultima?.tipo === 'almoco_inicio' ? 'ti-coffee'
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
      <BotaoBaterPonto T={T} dark={dark} proximoTipo={prox} onBater={bater} />

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
            {fmtDuracao(minTrab)} <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>de {Math.floor(cargaMin/60)}h00</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 10, color: T.textMuted, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 3,
          }}>Banco de horas</div>
          <div style={{
            fontSize: 15, fontWeight: 700,
            color: jornada.banco_horas_saldo >= 0 ? azul : corEtapa('red', dark),
            fontVariantNumeric: 'tabular-nums',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <i className={`ti ${jornada.banco_horas_saldo >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`}
               style={{ fontSize: 14 }} aria-hidden="true" />
            {fmtBancoHoras(jornada.banco_horas_saldo)}
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
