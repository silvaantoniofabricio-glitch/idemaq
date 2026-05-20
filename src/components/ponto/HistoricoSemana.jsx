// src/components/ponto/HistoricoSemana.jsx
// Lista compacta dos últimos 7 dias com status do dia (ok / atraso /
// extra / falta / fds). Cabe num cartão lateral do PainelFuncionario sem
// disputar espaço com o botão grande de bater ponto.
//
// Props:
//   T, dark        — tokens de tema
//   batidas        — array de batidas (~ últimos 7 dias) shape ponto_registro
//   jornadaPadraoMin (opcional, default 480) — minutos da jornada padrão
//
// Status do dia:
//   • fds      — sábado/domingo (sem expectativa de batida)
//   • falta    — dia útil passado sem nenhuma batida
//   • atraso   — entrou depois de 07:40 (07:30 + 10min tolerância)
//   • extra    — trabalhou mais que a jornada padrão
//   • ok       — bateu dentro do esperado
//   • parcial  — bateu hoje mas ainda não fechou o dia

import React, { useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { fmtHora, fmtDuracao } from './_mocks'

const DIA_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                     'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function chaveDia(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcularMinutosDia(batidasDoDia) {
  // Pareia entrada→saida_almoco e volta_almoco→saida
  const lista = [...batidasDoDia].sort((a, b) =>
    new Date(a.bateu_em) - new Date(b.bateu_em))
  let total = 0
  let abertura = null
  for (const b of lista) {
    const t = new Date(b.bateu_em)
    if (b.tipo === 'entrada' || b.tipo === 'volta_almoco') {
      abertura = t
    } else if ((b.tipo === 'saida_almoco' || b.tipo === 'saida') && abertura) {
      total += Math.round((t - abertura) / 60000)
      abertura = null
    }
  }
  return total
}

export default function HistoricoSemana({ T, dark, batidas = [], jornadaPadraoMin = 480 }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  // Monta os últimos 7 dias (hoje + 6 anteriores)
  const dias = useMemo(() => {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const resultado = []

    // Agrupa batidas por dia
    const porDia = {}
    for (const b of batidas) {
      const k = chaveDia(new Date(b.bateu_em))
      if (!porDia[k]) porDia[k] = []
      porDia[k].push(b)
    }

    for (let i = 0; i < 7; i++) {
      const d = new Date(hoje)
      d.setDate(hoje.getDate() - i)
      const chave = chaveDia(d)
      const batidasDia = porDia[chave] || []
      const diaSemana = d.getDay()
      const ehFds = diaSemana === 0 || diaSemana === 6
      const ehHoje = i === 0
      const minutos = calcularMinutosDia(batidasDia)
      const entrada = batidasDia.find(b => b.tipo === 'entrada')
      const saida = batidasDia.find(b => b.tipo === 'saida')

      let status = 'ok'
      if (ehFds) status = 'fds'
      else if (batidasDia.length === 0) {
        status = ehHoje ? 'pendente' : 'falta'
      } else if (ehHoje && !saida) {
        status = 'parcial'
      } else {
        // Atraso? Entrada > 07:40
        if (entrada) {
          const t = new Date(entrada.bateu_em)
          const padrao = new Date(t)
          padrao.setHours(7, 40, 0, 0)
          if (t > padrao) status = 'atraso'
          else if (minutos > jornadaPadraoMin) status = 'extra'
        }
      }

      resultado.push({
        data: d,
        diaSemana,
        ehHoje,
        ehFds,
        minutos,
        entrada: entrada?.bateu_em || null,
        saida: saida?.bateu_em || null,
        status,
      })
    }
    return resultado
  }, [batidas, jornadaPadraoMin])

  return (
    <div className="idemaq-card" style={{
      background: T.card, borderRadius: 14,
      border: `1px solid ${T.border}`,
      boxShadow: T.shadow,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: 11, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.5px',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-history" style={{ fontSize: 13 }} aria-hidden="true" />
          Últimos 7 dias
        </div>
        <span style={{ fontSize: 10.5, color: T.textDim }}>
          mais recente em cima
        </span>
      </div>

      {dias.map((d, idx) => {
        const corStatus = corPorStatus(d.status, { azul, amarelo, vermelho, neutro: T.textMuted })
        const labelStatus = labelPorStatus(d.status, d.minutos, jornadaPadraoMin)
        const iconStatus = iconPorStatus(d.status)

        return (
          <div key={idx} style={{
            display: 'grid',
            gridTemplateColumns: '52px 1fr auto',
            gap: 10, alignItems: 'center',
            padding: '10px 16px',
            borderTop: `1px solid ${T.border}`,
            opacity: d.ehFds ? 0.55 : 1,
            background: d.ehHoje ? bgEtapa('blue', dark) + '60' : 'transparent',
          }}>
            {/* Dia */}
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{
                fontSize: 17, fontWeight: 800,
                color: d.ehHoje ? azul : corHero(dark),
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}>
                {String(d.data.getDate()).padStart(2, '0')}
              </span>
              <span style={{
                fontSize: 9.5, color: T.textMuted, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.3px', marginTop: 2,
              }}>
                {DIA_SEMANA_CURTO[d.diaSemana]} · {MESES_CURTO[d.data.getMonth()]}
              </span>
            </div>

            {/* Resumo do dia */}
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 12, color: corHero(dark), fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: 2,
              }}>
                {d.ehHoje && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, color: azul,
                    padding: '1px 5px', borderRadius: 5,
                    background: bgEtapa('blue', dark),
                    border: `1px solid ${azul}55`,
                    textTransform: 'uppercase', letterSpacing: '.4px',
                  }}>Hoje</span>
                )}
                {d.entrada && d.saida
                  ? `${fmtHora(d.entrada)} → ${fmtHora(d.saida)}`
                  : d.entrada
                    ? `Entrou ${fmtHora(d.entrada)}`
                    : d.ehFds
                      ? (d.diaSemana === 0 ? 'Domingo' : 'Sábado')
                      : 'Sem batidas'
                }
              </div>
              <div style={{
                fontSize: 10.5, color: corStatus, fontWeight: 700,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <i className={`ti ${iconStatus}`} style={{ fontSize: 11 }} aria-hidden="true" />
                {labelStatus}
              </div>
            </div>

            {/* Total */}
            <div style={{
              textAlign: 'right',
              fontSize: 13, fontWeight: 700,
              color: d.minutos > 0 ? corHero(dark) : T.textDim,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {d.minutos > 0 ? fmtDuracao(d.minutos) : '—'}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function corPorStatus(status, { azul, amarelo, vermelho, neutro }) {
  if (status === 'atraso')  return amarelo
  if (status === 'falta')   return vermelho
  if (status === 'extra')   return azul
  if (status === 'parcial') return azul
  if (status === 'pendente')return amarelo
  if (status === 'ok')      return azul
  return neutro  // fds
}

function iconPorStatus(status) {
  if (status === 'atraso')  return 'ti-alert-triangle'
  if (status === 'falta')   return 'ti-x'
  if (status === 'extra')   return 'ti-plus'
  if (status === 'parcial') return 'ti-clock-pause'
  if (status === 'pendente')return 'ti-clock-hour-8'
  if (status === 'ok')      return 'ti-check'
  return 'ti-calendar-off'  // fds
}

function labelPorStatus(status, minutos, padrao) {
  if (status === 'atraso')  return 'Atraso na entrada'
  if (status === 'falta')   return 'Falta'
  if (status === 'extra')   return `Hora extra +${fmtDuracao(minutos - padrao)}`
  if (status === 'parcial') return 'Em andamento'
  if (status === 'pendente')return 'Pendente — bata o ponto'
  if (status === 'ok')      return 'Dia normal'
  return 'Folga'  // fds
}
