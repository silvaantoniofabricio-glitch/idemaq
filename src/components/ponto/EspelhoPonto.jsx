// src/components/ponto/EspelhoPonto.jsx
// Espelho de ponto do mês — tabela com batidas + indicadores de atraso/extra/falta.
// Acessível tanto pelo próprio funcionário (no painel dele) quanto pelo dono
// (na aba "Espelhos" do RelatorioPontoDono).

import React, { useState, useMemo } from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { Card, Badge, Button, Tabs, SectionHeader } from '../ui'
import { usePonto } from '../../hooks/usePonto'
import { fmtHora, fmtDuracao, fmtBancoHoras } from './_mocks'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const JORNADA_PADRAO_H = 8

// Agrega batidas num mês específico → 1 linha por dia
function agregarMes(batidas, ano, mes) {
  const doMes = batidas.filter(b => {
    const d = new Date(b.bateu_em)
    return d.getFullYear() === ano && d.getMonth() === mes
  })

  const porDia = {}
  for (const b of doMes) {
    const d = new Date(b.bateu_em)
    const dia = d.getDate()
    if (!porDia[dia]) porDia[dia] = {}
    porDia[dia][b.tipo] = b.bateu_em
  }

  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  const linhas = []
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const d = new Date(ano, mes, dia)
    const diaSemana = d.getDay()
    const ehDomingo = diaSemana === 0
    const ehSabado = diaSemana === 6
    const ehFds = ehDomingo          // só domingo é folga fixa
    const batidasDia = porDia[dia] || {}

    let totalMin = 0
    if (batidasDia.entrada && batidasDia.saida_almoco) {
      // dia normal com almoço
      totalMin += (new Date(batidasDia.saida_almoco) - new Date(batidasDia.entrada)) / 60000
    }
    if (batidasDia.volta_almoco && batidasDia.saida) {
      totalMin += (new Date(batidasDia.saida) - new Date(batidasDia.volta_almoco)) / 60000
    }
    if (batidasDia.entrada && batidasDia.saida && !batidasDia.saida_almoco) {
      // sábado (ou dia sem almoço): entrada → saida direto
      totalMin += (new Date(batidasDia.saida) - new Date(batidasDia.entrada)) / 60000
    }
    totalMin = Math.round(totalMin)

    const cargaDia = ehSabado ? (JORNADA_PADRAO_H / 2) * 60 : JORNADA_PADRAO_H * 60

    let status = 'normal'
    const teveBatida = !!batidasDia.entrada
    if (ehFds) status = 'fds'
    else if (ehSabado && !teveBatida) status = 'fds'   // sábado sem batida = não trabalhou
    else if (!teveBatida && d <= new Date()) status = 'falta'
    else if (teveBatida) {
      const entrada = new Date(batidasDia.entrada)
      const entradaPadrao = new Date(ano, mes, dia, 7, 40, 0)
      if (entrada > entradaPadrao) status = 'atraso'
      else if (totalMin > cargaDia) status = 'extra'
    }

    linhas.push({
      dia, diaSemana, ehFds,
      entrada:      batidasDia.entrada,
      saidaAlmoco:  batidasDia.saida_almoco,
      voltaAlmoco:  batidasDia.volta_almoco,
      saida:        batidasDia.saida,
      totalMin,
      status,
    })
  }
  return linhas
}

const DIA_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function EspelhoPonto({ T, dark, funcionario }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)

  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())

  const { batidas, loading } = usePonto({
    funcionarioId: funcionario.id,
    escopo: 'mes',
    ano,
    mes,
  })

  const linhas = useMemo(() => agregarMes(batidas, ano, mes), [batidas, ano, mes])

  // Stats do mês
  const totalMin = linhas.reduce((s, l) => s + l.totalMin, 0)
  const cargaDiaMin = JORNADA_PADRAO_H * 60
  const diasUteis = linhas.filter(l => !l.ehFds).length
  const cargaMesMin = diasUteis * cargaDiaMin
  const extraMin = Math.max(0, totalMin - cargaMesMin)
  const atrasos = linhas.filter(l => l.status === 'atraso').length
  const faltas = linhas.filter(l => l.status === 'falta').length
  const saldoMin = totalMin - cargaMesMin

  function navegarMes(delta) {
    const novo = new Date(ano, mes + delta, 1)
    setAno(novo.getFullYear())
    setMes(novo.getMonth())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header com navegação de mês */}
      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <Button variant="ghost" size="sm" T={T} dark={dark}
            iconLeft="ti-chevron-left"
            onClick={() => navegarMes(-1)}>
            Anterior
          </Button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: corHero(dark),
              letterSpacing: '-0.01em',
            }}>
              {MESES[mes]} / {ano}
            </div>
            <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>
              {funcionario.nome} · {funcionario.papel}
            </div>
          </div>
          <Button variant="ghost" size="sm" T={T} dark={dark}
            iconRight="ti-chevron-right"
            onClick={() => navegarMes(1)}>
            Próximo
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card T={T} dark={dark}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textMuted, fontSize: 13, padding: '8px 0' }}>
            <i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
            Carregando…
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        </Card>
      ) : (
        <>
          {/* Resumo do mês */}
          <Card T={T} dark={dark}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12,
            }}>
              <Stat T={T} dark={dark} label="Trabalhadas" valor={fmtDuracao(totalMin)} cor={corHero(dark)} />
              <Stat T={T} dark={dark} label="Horas extras" valor={extraMin > 0 ? '+' + fmtDuracao(extraMin) : '—'}
                cor={extraMin > 0 ? azul : T.textDim} />
              <Stat T={T} dark={dark} label="Atrasos" valor={atrasos}
                cor={atrasos > 0 ? amarelo : T.textDim} />
              <Stat T={T} dark={dark} label="Faltas" valor={faltas}
                cor={faltas > 0 ? vermelho : T.textDim} />
              <Stat T={T} dark={dark} label="Banco de horas" valor={fmtBancoHoras(saldoMin / 60)}
                cor={saldoMin >= 0 ? azul : vermelho} />
            </div>
          </Card>

          {/* Tabela do mês */}
          <Card T={T} dark={dark} padding={0}>
            <div style={{ padding: '12px 14px 8px' }}>
              <SectionHeader T={T} dark={dark} icon="ti-calendar-stats" mb={0}
                action={
                  <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                    {linhas.length} dias
                  </span>
                }
              >Marcações do mês</SectionHeader>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '50px 60px 60px 60px 60px 70px 1fr',
              gap: 6, padding: '8px 14px',
              borderTop: `1px solid ${T.border}`,
              background: T.cardAlt,
              fontSize: 10, color: T.textMuted, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.05em',
            }}>
              <div>Dia</div>
              <div style={{ textAlign: 'center' }}>Ent.</div>
              <div style={{ textAlign: 'center' }}>Alm.Σ</div>
              <div style={{ textAlign: 'center' }}>Alm.↻</div>
              <div style={{ textAlign: 'center' }}>Saí.</div>
              <div style={{ textAlign: 'right' }}>Total</div>
              <div style={{ paddingLeft: 8 }}>Status</div>
            </div>

            {linhas.map(l => {
              const opaca = l.ehFds
              return (
                <div key={l.dia} style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 60px 60px 60px 60px 70px 1fr',
                  gap: 6, padding: '8px 14px',
                  borderTop: `1px solid ${T.border}`,
                  alignItems: 'center',
                  fontSize: 11.5,
                  opacity: opaca ? 0.5 : 1,
                  background: l.status === 'falta' ? cor('#2a1515', '#fde8e8') + '40' : 'transparent',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span style={{ color: corHero(dark), fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {String(l.dia).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}>
                      {DIA_SEMANA_CURTO[l.diaSemana]}
                    </span>
                  </div>
                  <div style={{ textAlign: 'center', color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtHora(l.entrada)}
                  </div>
                  <div style={{ textAlign: 'center', color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtHora(l.saidaAlmoco)}
                  </div>
                  <div style={{ textAlign: 'center', color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtHora(l.voltaAlmoco)}
                  </div>
                  <div style={{ textAlign: 'center', color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtHora(l.saida)}
                  </div>
                  <div style={{
                    textAlign: 'right', fontWeight: 600,
                    color: l.totalMin > 0 ? corHero(dark) : T.textDim,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {l.totalMin > 0 ? fmtDuracao(l.totalMin) : '—'}
                  </div>
                  <div style={{ paddingLeft: 8 }}>
                    {l.status === 'normal' && l.totalMin > 0 && (
                      <Badge variant="azul" dark={dark} sm>
                        <i className="ti ti-check" aria-hidden="true" /> OK
                      </Badge>
                    )}
                    {l.status === 'atraso' && (
                      <Badge variant="amarelo" dark={dark} sm>
                        <i className="ti ti-alert-triangle" aria-hidden="true" /> Atraso
                      </Badge>
                    )}
                    {l.status === 'extra' && (
                      <Badge variant="azul" dark={dark} sm>
                        <i className="ti ti-plus" aria-hidden="true" /> Hora extra
                      </Badge>
                    )}
                    {l.status === 'falta' && (
                      <Badge variant="vermelho" dark={dark} sm>
                        <i className="ti ti-x" aria-hidden="true" /> Falta
                      </Badge>
                    )}
                    {l.status === 'fds' && (
                      <span style={{ fontSize: 10, color: T.textDim, fontStyle: 'italic' }}>
                        {l.diaSemana === 0 ? 'Domingo' : 'Sábado'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}

function Stat({ T, dark, label, valor, cor }) {
  return (
    <div>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 16, fontWeight: 700, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
      }}>
        {valor}
      </div>
    </div>
  )
}
