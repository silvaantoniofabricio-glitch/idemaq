// src/components/paineis/PainelFuncionario.jsx
// Painel inicial do funcionário (Alessandro/Guilherme) — substitui o painel do dono
// quando o usuário não é admin. Layout mobile-first.
// REGRA: nunca mostrar financeiro (R$, faturamento, lucro, etc.) — Toni decidiu.

import React, { useState } from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { Card, Badge, Button, SectionHeader } from '../ui'
import CardPontoFuncionario from '../ponto/CardPontoFuncionario'
import EspelhoPonto from '../ponto/EspelhoPonto'
import { FUNCIONARIOS_PONTO } from '../ponto/_mocks'

// Mocks visuais — futuro: query nas tabelas os, avisos, etc.
const OS_DO_DIA_MOCK = [
  { numero: 1247, cliente: 'Ana Reis',     etapa: 'agendado',   hora: '14:00', tipo: 'atendimento' },
  { numero: 1245, cliente: 'João Costa',   etapa: 'diagnostico', tipo: 'atendimento' },
  { numero: 1244, cliente: 'Maria Silva',  etapa: 'oficina',    tipo: 'atendimento' },
]

const AVISOS_MOCK = [
  { id: 1, texto: 'Reunião terça 8h sobre meta do mês',  icon: 'ti-calendar-event', cor: 'blue' },
  { id: 2, texto: 'Estoque de mangueira no mínimo',      icon: 'ti-alert-triangle', cor: 'yellow' },
]

const DESEMPENHO_MOCK = {
  osConcluidas: 18,
  tempoMedio: '3h22',
  pontualidade: '94%',
}

export default function PainelFuncionario({ T, dark, funcId = 'func1' }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const [verEspelho, setVerEspelho] = useState(false)

  const funcionario = FUNCIONARIOS_PONTO.find(f => f.id === funcId) || FUNCIONARIOS_PONTO[0]

  // Data formatada pro header
  const hoje = new Date()
  const diaSemana = hoje.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dia = hoje.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
  const dataFormatada = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1) + ', ' + dia

  if (verEspelho) {
    return (
      <div style={{
        padding: '16px 16px 24px', overflowY: 'auto', flex: 1,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="ghost" size="sm" T={T} dark={dark}
            iconLeft="ti-arrow-left"
            onClick={() => setVerEspelho(false)}>
            Voltar
          </Button>
        </div>
        <EspelhoPonto T={T} dark={dark} funcionario={funcionario} />
      </div>
    )
  }

  return (
    <div style={{
      padding: '16px 16px 24px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
      maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box',
    }}>
      {/* Header pessoal */}
      <div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: corHero(dark),
          letterSpacing: '-0.02em', marginBottom: 3,
        }}>
          Olá, {funcionario.nome} <span style={{ display: 'inline-block', transform: 'rotate(15deg)' }}>
            <i className="ti ti-hand-stop" style={{ fontSize: 22, color: amarelo }} aria-hidden="true" />
          </span>
        </div>
        <div style={{ fontSize: 12, color: T.textMuted }}>
          Naviraí · {dataFormatada}
        </div>
      </div>

      {/* Card de ponto em destaque */}
      <CardPontoFuncionario T={T} dark={dark} funcionario={funcionario}
        onAbrirEspelho={() => setVerEspelho(true)} />

      {/* Minhas OS de hoje */}
      <Card T={T} dark={dark} padding={0}>
        <div style={{ padding: '12px 14px 8px' }}>
          <SectionHeader T={T} dark={dark} icon="ti-clipboard-list" mb={0}
            action={
              <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {OS_DO_DIA_MOCK.length} OS
              </span>
            }
          >Minhas OS de hoje</SectionHeader>
        </div>
        {OS_DO_DIA_MOCK.map((os, i) => (
          <div key={os.numero} style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr auto auto',
            gap: 10, alignItems: 'center',
            padding: '11px 14px',
            borderTop: `1px solid ${T.border}`,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: bgEtapa('blue', dark),
              border: `1px solid ${azul}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: azul,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {os.numero.toString().slice(-3)}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: corHero(dark),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                OS #{os.numero} — {os.cliente}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                Etapa: {os.etapa}
              </div>
            </div>
            {os.hora && (
              <span style={{
                fontSize: 12, color: T.textSecondary, fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <i className="ti ti-clock" style={{ fontSize: 12, marginRight: 3 }} aria-hidden="true" />
                {os.hora}
              </span>
            )}
            <i className="ti ti-chevron-right" style={{ fontSize: 16, color: T.textDim }} aria-hidden="true" />
          </div>
        ))}
      </Card>

      {/* Avisos */}
      <Card T={T} dark={dark} padding={0}>
        <div style={{ padding: '12px 14px 8px' }}>
          <SectionHeader T={T} dark={dark} icon="ti-megaphone" mb={0}>Avisos</SectionHeader>
        </div>
        {AVISOS_MOCK.map(av => {
          const corAv = corEtapa(av.cor, dark)
          return (
            <div key={av.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px',
              borderTop: `1px solid ${T.border}`,
            }}>
              <i className={`ti ${av.icon}`} style={{ fontSize: 16, color: corAv }} aria-hidden="true" />
              <span style={{ fontSize: 12.5, color: T.textPrimary, flex: 1 }}>{av.texto}</span>
            </div>
          )
        })}
      </Card>

      {/* Desempenho — só números operacionais, ZERO financeiro */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-chart-line" mb={12}>
          Meu desempenho no mês
        </SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <KPI T={T} dark={dark} label="OS concluídas" valor={DESEMPENHO_MOCK.osConcluidas} cor={azul} />
          <KPI T={T} dark={dark} label="Tempo médio" valor={DESEMPENHO_MOCK.tempoMedio} cor={corHero(dark)} />
          <KPI T={T} dark={dark} label="Pontualidade" valor={DESEMPENHO_MOCK.pontualidade} cor={corEtapa('green', dark)} />
        </div>
      </Card>
    </div>
  )
}

function KPI({ T, dark, label, valor, cor }) {
  return (
    <div style={{
      padding: '10px 12px',
      background: T.cardAlt, borderRadius: 8,
      border: `1px solid ${T.border}`,
      textAlign: 'center',
    }}>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 18, fontWeight: 700, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em',
      }}>
        {valor}
      </div>
    </div>
  )
}
