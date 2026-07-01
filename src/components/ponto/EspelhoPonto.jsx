// src/components/ponto/EspelhoPonto.jsx
// Espelho de ponto do mês — design Atlassian.
// Seções: KPI strip · barra de carga · heatmap · tabela detalhada
// Responsivo: mobile oculta colunas de almoço na tabela.

import React, { useState, useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { Card, Button } from '../ui'
import { usePonto } from '../../hooks/usePonto'
import { fmtHora, fmtDuracao, fmtBancoHoras } from './_mocks'

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const DIA_SEMANA_CURTO = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const JORNADA_DIA_MIN = 8 * 60   // 480 min
const JORNADA_SAB_MIN = 4 * 60   // 240 min
const TOLERANCIA_MIN  = 5

// ─── agregarMes: 1 linha por dia do mês ─────────────────────────────────────
// Statuses: 'normal'|'atraso'|'extra'|'falta'|'pendente'|'fds'|'futuro'
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

  const hoje = new Date()
  const inicioDoDia = new Date(hoje); inicioDoDia.setHours(0, 0, 0, 0)
  const mesAtualAno = hoje.getFullYear() === ano && hoje.getMonth() === mes
  const diaHoje = mesAtualAno ? hoje.getDate() : -1

  const ultimoDia = new Date(ano, mes + 1, 0).getDate()
  const linhas = []

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const d = new Date(ano, mes, dia)
    const diaSemana = d.getDay()
    const ehDomingo = diaSemana === 0
    const ehSabado  = diaSemana === 6
    const ehFds     = ehDomingo
    const ehHoje    = dia === diaHoje
    const ehFuturo  = d > inicioDoDia && !ehHoje
    const ehPassado = !ehHoje && !ehFuturo

    const batidasDia = porDia[dia] || {}
    const teveBatida = !!batidasDia.entrada

    // Calcula minutos trabalhados
    let totalMin = 0
    if (batidasDia.entrada && batidasDia.saida_almoco) {
      totalMin += (new Date(batidasDia.saida_almoco) - new Date(batidasDia.entrada)) / 60000
    }
    if (batidasDia.volta_almoco && batidasDia.saida) {
      totalMin += (new Date(batidasDia.saida) - new Date(batidasDia.volta_almoco)) / 60000
    }
    if (batidasDia.entrada && batidasDia.saida && !batidasDia.saida_almoco) {
      // sábado ou dia sem almoço
      totalMin += (new Date(batidasDia.saida) - new Date(batidasDia.entrada)) / 60000
    }
    totalMin = Math.round(totalMin)

    const cargaDia = ehSabado ? JORNADA_SAB_MIN : JORNADA_DIA_MIN

    let status = 'normal'
    if (ehFds)   status = 'fds'
    else if (ehFuturo) status = 'futuro'
    else if (ehSabado && !teveBatida) status = 'fds'
    else if (!teveBatida && ehHoje)   status = 'pendente'
    else if (!teveBatida && ehPassado) status = 'falta'
    else if (teveBatida) {
      const entrada = new Date(batidasDia.entrada)
      const limiar  = new Date(ano, mes, dia, ehSabado ? 7 : 8, TOLERANCIA_MIN, 0)
      if (entrada > limiar) status = 'atraso'
      else if (batidasDia.saida && totalMin > cargaDia) status = 'extra'
    }

    linhas.push({
      dia, diaSemana, ehFds, ehHoje, ehFuturo, ehSabado,
      entrada:     batidasDia.entrada      || null,
      saidaAlmoco: batidasDia.saida_almoco || null,
      voltaAlmoco: batidasDia.volta_almoco || null,
      saida:       batidasDia.saida        || null,
      totalMin,
      status,
    })
  }
  return linhas
}

// ─── Helpers de cor por status ───────────────────────────────────────────────
function corStatus(status, { azul, amarelo, vermelho, T }) {
  if (status === 'normal')   return azul
  if (status === 'extra')    return azul
  if (status === 'atraso')   return amarelo
  if (status === 'falta')    return vermelho
  if (status === 'pendente') return amarelo
  return T.textDim
}

function labelStatus(status) {
  if (status === 'normal')   return 'OK'
  if (status === 'extra')    return 'Extra'
  if (status === 'atraso')   return 'Atraso'
  if (status === 'falta')    return 'Falta'
  if (status === 'pendente') return 'Pendente'
  if (status === 'fds')      return 'Folga'
  if (status === 'futuro')   return '—'
  return '—'
}

function iconStatus(status) {
  if (status === 'normal')   return 'ti-check'
  if (status === 'extra')    return 'ti-clock-plus'
  if (status === 'atraso')   return 'ti-alert-triangle'
  if (status === 'falta')    return 'ti-x'
  if (status === 'pendente') return 'ti-clock-hour-8'
  if (status === 'fds')      return 'ti-sun'
  return 'ti-minus'
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function EspelhoPonto({ T, dark, funcionario }) {
  const azul     = corEtapa('blue',   dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red',    dark)
  const paleta   = { azul, amarelo, vermelho, T }

  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())

  const { batidas, loading } = usePonto({
    funcionarioId: funcionario.id,
    escopo: 'mes',
    ano, mes,
  })

  const linhas = useMemo(() => agregarMes(batidas, ano, mes), [batidas, ano, mes])

  // ── Stats derivados das linhas ──────────────────────────────────────────────
  const stats = useMemo(() => {
    // "Dias úteis passados + hoje" → base para presença e banco de horas
    const diasUteisPassados = linhas.filter(l => !l.ehFds && !l.ehFuturo)
    // "Todos os dias úteis do mês" (incluindo futuros) → base para meta total
    const todosUteisDoMes   = linhas.filter(l => !l.ehFds)

    const diasTrabalhados = linhas.filter(l => l.entrada).length
    const faltas   = linhas.filter(l => l.status === 'falta').length
    const atrasos  = linhas.filter(l => l.status === 'atraso').length
    const totalMin = linhas.reduce((s, l) => s + l.totalMin, 0)

    // Meta total do mês (todos os dias úteis, incluindo futuros)
    const cargaMesTotalMin = todosUteisDoMes.reduce((s, l) =>
      s + (l.ehSabado ? JORNADA_SAB_MIN : JORNADA_DIA_MIN), 0)

    // Meta até hoje (só dias passados + hoje) → para banco de horas
    const cargaAtéHojeMin = diasUteisPassados.reduce((s, l) =>
      s + (l.ehSabado ? JORNADA_SAB_MIN : JORNADA_DIA_MIN), 0)

    const saldoMin = totalMin - cargaAtéHojeMin  // adiantado (+) ou devendo (-)
    const pctCarga = cargaMesTotalMin > 0
      ? Math.min(100, Math.round((totalMin / cargaMesTotalMin) * 100))
      : 0
    const presenca = diasUteisPassados.length > 0
      ? Math.round((diasTrabalhados / diasUteisPassados.length) * 100)
      : 0

    return {
      diasTrabalhados, faltas, atrasos, totalMin,
      cargaMesTotalMin, cargaAtéHojeMin, saldoMin,
      presenca, pctCarga,
    }
  }, [linhas])

  function navegarMes(delta) {
    const novo = new Date(ano, mes + delta, 1)
    setAno(novo.getFullYear())
    setMes(novo.getMonth())
  }

  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth()
  const nomeFunc   = funcionario.nome || 'Funcionário'
  const iniciais   = nomeFunc.slice(0, 2).toUpperCase()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── CABEÇALHO / NAVEGAÇÃO ─────────────────────────────────────────── */}
      <div className="idemaq-card" style={{
        background: T.card, borderRadius: 12,
        border: `1px solid ${T.border}`,
        padding: '14px 16px',
        boxShadow: T.shadow,
      }}>
        {/* Identidade */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: azul,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff',
            flexShrink: 0,
          }}>
            {iniciais}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: corHero(dark), letterSpacing: '-0.01em' }}>
              Espelho de Ponto — {nomeFunc}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
              {funcionario.papel} · Jornada: 08:00–11:00 / 13:00–18:00 (Seg–Sex) · 07:00–11:00 (Sáb) · Tolerância: {TOLERANCIA_MIN} min
            </div>
          </div>
        </div>

        {/* Navegação de mês */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <button onClick={() => navegarMes(-1)} style={btnNavStyle(T)}>
            <i className="ti ti-chevron-left" style={{ fontSize: 16, color: 'inherit' }} aria-hidden="true" />
          </button>
          <div style={{
            flex: 1, textAlign: 'center',
            fontSize: 15, fontWeight: 700, color: corHero(dark),
            letterSpacing: '-0.01em',
          }}>
            {MESES[mes]} / {ano}
            {ehMesAtual && (
              <span style={{
                marginLeft: 8, fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 3,
                background: azul + '1a', color: azul,
                border: `1px solid ${azul}40`,
                verticalAlign: 'middle', letterSpacing: '.04em',
              }}>
                MÊS ATUAL
              </span>
            )}
          </div>
          <button onClick={() => navegarMes(1)} style={{ ...btnNavStyle(T), opacity: ehMesAtual ? 0.35 : 1 }}
            disabled={ehMesAtual}
          >
            <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'inherit' }} aria-hidden="true" />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: T.textMuted, fontSize: 13, padding: '12px 0',
        }}>
          <i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
          Carregando…
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          {/* ── KPI STRIP ──────────────────────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
          }}>
            <KPITile T={T} dark={dark}
              valor={stats.diasTrabalhados}
              label="Dias trab."
              icon="ti-calendar-check"
              cor={azul}
            />
            <KPITile T={T} dark={dark}
              valor={fmtDuracao(stats.totalMin)}
              label="Horas"
              icon="ti-clock"
              cor={azul}
            />
            <KPITile T={T} dark={dark}
              valor={`${stats.presenca}%`}
              label="Presença"
              icon="ti-user-check"
              cor={stats.presenca >= 90 ? azul : stats.presenca >= 75 ? amarelo : vermelho}
            />
            <KPITile T={T} dark={dark}
              valor={stats.faltas}
              label="Faltas"
              icon="ti-calendar-x"
              cor={stats.faltas > 0 ? vermelho : T.textMuted}
            />
            <KPITile T={T} dark={dark}
              valor={fmtBancoHoras(stats.saldoMin / 60)}
              label="Banco"
              icon={stats.saldoMin >= 0 ? 'ti-trending-up' : 'ti-trending-down'}
              cor={stats.saldoMin >= 0 ? azul : vermelho}
            />
          </div>

          {/* ── PROGRESSO DO MÊS ─────────────────────────────────────────── */}
          <div className="idemaq-card" style={{
            background: T.card, borderRadius: 12,
            border: `1px solid ${T.border}`,
            padding: '12px 16px',
            boxShadow: T.shadow,
          }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 2,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: T.textMuted,
                textTransform: 'uppercase', letterSpacing: '.06em',
              }}>
                Progresso do mês
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700, color: corHero(dark),
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtDuracao(stats.totalMin)}
                <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 500, margin: '0 3px' }}>
                  de
                </span>
                {fmtDuracao(stats.cargaMesTotalMin)}
                <span style={{ fontSize: 10, color: T.textMuted, marginLeft: 4, fontWeight: 500 }}>
                  ({stats.pctCarga}%)
                </span>
              </span>
            </div>
            {/* Subtítulo explicativo */}
            <div style={{ fontSize: 10.5, color: T.textDim, marginBottom: 8 }}>
              Horas já trabalhadas vs. total previsto para o mês
            </div>
            {/* Barra de progresso */}
            <div style={{
              height: 8, borderRadius: 4,
              background: T.cardAlt,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${stats.pctCarga}%`,
                background: stats.pctCarga >= 75 ? azul : amarelo,
                borderRadius: 4,
                transition: 'width .4s ease',
              }} />
            </div>
            {/* Banco de horas vs. expectativa de hoje */}
            <div style={{
              marginTop: 8, fontSize: 11, fontWeight: 600,
              color: stats.saldoMin >= 0 ? azul : vermelho,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <i className={`ti ${stats.saldoMin >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`}
                 style={{ fontSize: 12 }} aria-hidden="true" />
              {stats.saldoMin >= 0
                ? `${fmtDuracao(stats.saldoMin)} à frente da meta de hoje`
                : `${fmtDuracao(Math.abs(stats.saldoMin))} abaixo da meta de hoje`}
            </div>
            {stats.faltas > 0 && (
              <div style={{
                marginTop: 3, fontSize: 11, color: vermelho, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 12 }} aria-hidden="true" />
                {stats.faltas} {stats.faltas === 1 ? 'falta' : 'faltas'} não compensadas
              </div>
            )}
          </div>

          {/* ── HEATMAP DO MÊS ────────────────────────────────────────────── */}
          <HeatmapMes linhas={linhas} ano={ano} mes={mes} paleta={paleta} T={T} dark={dark} />

          {/* ── TABELA DETALHADA ──────────────────────────────────────────── */}
          <div className="idemaq-card" style={{
            background: T.card, borderRadius: 12,
            border: `1px solid ${T.border}`,
            boxShadow: T.shadow,
            overflow: 'hidden',
          }}>
            {/* Cabeçalho da tabela */}
            <div style={{
              padding: '10px 14px 8px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: `1px solid ${T.border}`,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 700, color: T.textMuted,
                textTransform: 'uppercase', letterSpacing: '.06em',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <i className="ti ti-calendar-stats" style={{ fontSize: 13 }} aria-hidden="true" />
                Marcações detalhadas
              </span>
              <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {linhas.filter(l => l.entrada).length} dias com batida
              </span>
            </div>

            {/* Scroll horizontal no mobile — todas as colunas sempre visíveis */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <TabelaHeader T={T} />
              {linhas.map(l => (
                <TabelaLinha
                  key={l.dia}
                  l={l}
                  paleta={paleta}
                  T={T} dark={dark}
                />
              ))}
            </div>
          </div>

          {/* ── LEGENDA ───────────────────────────────────────────────────── */}
          <Legenda T={T} dark={dark} azul={azul} amarelo={amarelo} vermelho={vermelho} />
        </>
      )}
    </div>
  )
}

// ─── KPI Tile ────────────────────────────────────────────────────────────────
function KPITile({ T, dark, valor, label, icon, cor }) {
  return (
    <div className="idemaq-card" style={{
      background: T.card, borderRadius: 10,
      border: `1px solid ${T.border}`,
      padding: '10px 8px 8px',
      textAlign: 'center',
      boxShadow: T.shadow,
    }}>
      <i className={`ti ${icon}`} style={{
        fontSize: 16, color: cor,
        display: 'block', marginBottom: 4, opacity: 0.85,
      }} aria-hidden="true" />
      <div style={{
        fontSize: 16, fontWeight: 800, color: cor,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em', lineHeight: 1,
        marginBottom: 3,
      }}>
        {valor}
      </div>
      <div style={{
        fontSize: 9.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.04em',
        lineHeight: 1.2,
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── Heatmap do mês ──────────────────────────────────────────────────────────
function HeatmapMes({ linhas, ano, mes, paleta, T, dark }) {
  const { azul, amarelo, vermelho } = paleta
  const primeiroDia = new Date(ano, mes, 1).getDay() // 0=Dom

  function bgCell(l) {
    if (!l) return 'transparent'
    if (l.status === 'normal' || l.status === 'extra') return azul + 'cc'
    if (l.status === 'atraso') return amarelo + 'cc'
    if (l.status === 'falta')  return vermelho + 'cc'
    if (l.status === 'pendente') return amarelo + '66'
    if (l.status === 'fds')    return T.cardAlt
    if (l.status === 'futuro') return T.border + '60'
    return T.border
  }

  function titleCell(l) {
    const data = `${String(l.dia).padStart(2,'0')}/${String(mes+1).padStart(2,'0')}`
    const entrada = l.entrada ? fmtHora(l.entrada) : '—'
    const saida   = l.saida   ? fmtHora(l.saida)   : '—'
    const dur     = l.totalMin > 0 ? fmtDuracao(l.totalMin) : '—'
    return `${data} · ${labelStatus(l.status)} · ${entrada} → ${saida} · ${dur}`
  }

  // Monta grade: semanas × 7 dias
  const cells = []
  for (let i = 0; i < primeiroDia; i++) cells.push(null)
  for (const l of linhas) cells.push(l)

  return (
    <div className="idemaq-card" style={{
      background: T.card, borderRadius: 12,
      border: `1px solid ${T.border}`,
      padding: '12px 16px 14px',
      boxShadow: T.shadow,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.06em',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <i className="ti ti-calendar-month" style={{ fontSize: 13 }} aria-hidden="true" />
        Visão do mês
      </div>

      {/* Cabeçalho Dom–Sáb */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4, marginBottom: 4,
      }}>
        {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => (
          <div key={i} style={{
            textAlign: 'center',
            fontSize: 9, fontWeight: 700, color: T.textDim,
            textTransform: 'uppercase', letterSpacing: '.03em',
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Células — auto-fill com aspect-ratio 1:1 */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
      }}>
        {cells.map((l, i) =>
          l === null ? (
            <div key={`e${i}`} style={{ aspectRatio: '1' }} />
          ) : (
            <div
              key={l.dia}
              title={titleCell(l)}
              style={{
                aspectRatio: '1',
                borderRadius: 4,
                background: bgCell(l),
                border: l.ehHoje ? `2px solid ${azul}` : '2px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
                color: l.status === 'fds' || l.status === 'futuro'
                  ? T.textDim
                  : '#fff',
                cursor: 'help',
                transition: 'transform .12s',
                boxSizing: 'border-box',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.18)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {l.dia}
            </div>
          )
        )}
      </div>

      {/* Legenda de cores do heatmap */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.border}`,
      }}>
        {[
          { cor: azul + 'cc',     label: 'OK / Extra' },
          { cor: amarelo + 'cc',  label: 'Atraso' },
          { cor: vermelho + 'cc', label: 'Falta' },
          { cor: T.cardAlt,       label: 'Folga' },
          { cor: T.border + '60', label: 'Futuro' },
        ].map(({ cor, label }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 10, color: T.textMuted,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: 2,
              background: cor,
              border: `1px solid ${T.border}`,
            }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Cabeçalho da tabela ─────────────────────────────────────────────────────
const TABELA_COLS = '48px 62px 62px 62px 62px 68px 1fr'

function TabelaHeader({ T }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: TABELA_COLS,
      gap: 4, padding: '7px 14px',
      background: T.cardAlt,
      borderBottom: `1px solid ${T.border}`,
      fontSize: 9.5, color: T.textMuted, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.05em',
      minWidth: 420,
    }}>
      <div>Dia</div>
      <div style={{ textAlign: 'center' }}>Entrada</div>
      <div style={{ textAlign: 'center' }}>Alm. saída</div>
      <div style={{ textAlign: 'center' }}>Alm. volta</div>
      <div style={{ textAlign: 'center' }}>Saída</div>
      <div style={{ textAlign: 'right' }}>Total</div>
      <div style={{ paddingLeft: 8 }}>Status</div>
    </div>
  )
}

// ─── Linha da tabela ─────────────────────────────────────────────────────────
function TabelaLinha({ l, paleta, T, dark }) {
  const { azul, amarelo, vermelho } = paleta
  const cor = corStatus(l.status, paleta)

  const opacidade = l.ehFds || l.status === 'futuro' ? 0.45 : 1
  const bgLinha = l.ehHoje
    ? (dark ? azul + '18' : azul + '0d')
    : l.status === 'falta'
      ? (dark ? vermelho + '18' : vermelho + '0a')
      : 'transparent'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: TABELA_COLS,
      gap: 4, padding: '8px 14px',
      minWidth: 420,
      borderTop: `1px solid ${T.border}`,
      alignItems: 'center',
      fontSize: 11.5,
      opacity: opacidade,
      background: bgLinha,
      borderLeft: l.ehHoje ? `3px solid ${azul}` : '3px solid transparent',
    }}>
      {/* Dia + dia da semana */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{
          color: l.ehHoje ? azul : corHero(dark),
          fontWeight: l.ehHoje ? 800 : 700,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 12,
        }}>
          {String(l.dia).padStart(2, '0')}
        </span>
        <span style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}>
          {DIA_SEMANA_CURTO[l.diaSemana]}
        </span>
      </div>

      {/* Batidas */}
      <Hora T={T} dark={dark} iso={l.entrada} />
      <Hora T={T} dark={dark} iso={l.saidaAlmoco} />
      <Hora T={T} dark={dark} iso={l.voltaAlmoco} />
      <Hora T={T} dark={dark} iso={l.saida} />

      {/* Total */}
      <div style={{
        textAlign: 'right', fontWeight: 600,
        color: l.totalMin > 0 ? corHero(dark) : T.textDim,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {l.totalMin > 0 ? fmtDuracao(l.totalMin) : '—'}
      </div>

      {/* Status — lozenge Atlassian */}
      <div style={{ paddingLeft: 6 }}>
        {l.status !== 'futuro' && l.status !== 'fds' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 7px', borderRadius: 3,
            background: cor + '1a',
            border: `1px solid ${cor}40`,
            fontSize: 10, fontWeight: 700, color: cor,
            whiteSpace: 'nowrap',
          }}>
            <i className={`ti ${iconStatus(l.status)}`} style={{ fontSize: 10 }} aria-hidden="true" />
            {labelStatus(l.status)}
          </div>
        )}
        {l.status === 'fds' && (
          <span style={{ fontSize: 10, color: T.textDim, fontStyle: 'italic' }}>
            {l.diaSemana === 0 ? 'Dom' : 'Sáb'}
          </span>
        )}
        {l.status === 'futuro' && (
          <span style={{ fontSize: 10, color: T.textDim }}>—</span>
        )}
      </div>
    </div>
  )
}

// ─── Célula de hora ──────────────────────────────────────────────────────────
function Hora({ T, dark, iso }) {
  return (
    <div style={{
      textAlign: 'center',
      color: iso ? corHero(dark) : T.textDim,
      fontVariantNumeric: 'tabular-nums',
      fontSize: 11.5,
    }}>
      {fmtHora(iso)}
    </div>
  )
}

// ─── Legenda resumida ─────────────────────────────────────────────────────────
function Legenda({ T, dark, azul, amarelo, vermelho }) {
  return (
    <div style={{
      padding: '10px 14px',
      display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
      fontSize: 10.5, color: T.textMuted,
    }}>
      {[
        { cor: azul,    label: 'OK — entrou no horário' },
        { cor: azul,    label: 'Extra — mais que a carga do dia' },
        { cor: amarelo, label: 'Atraso — entrada após 08:05 (07:05 Sáb)' },
        { cor: vermelho,label: 'Falta — dia útil sem batida' },
      ].map(({ cor, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 8, height: 8, borderRadius: 2,
            background: cor + 'cc',
          }} />
          {label}
        </div>
      ))}
    </div>
  )
}

// ─── Botão de navegação de mês ───────────────────────────────────────────────
function btnNavStyle(T) {
  return {
    background: T.card,
    border: `1.5px solid ${T.textMuted}`,
    borderRadius: 8,
    width: 36, height: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    color: T.textSecondary,
  }
}
