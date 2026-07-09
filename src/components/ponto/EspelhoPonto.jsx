// src/components/ponto/EspelhoPonto.jsx
// Espelho de ponto do mês — design Atlassian.
// Desktop (≥680px): 2 colunas — esq: calendário + progresso / dir: tabela detalhada
// Mobile: stack vertical

import React, { useState, useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { usePonto } from '../../hooks/usePonto'
import { fmtHora, fmtDuracao, fmtBancoHoras } from './_mocks'

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]
const DIA_SEMANA_CURTO = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const JORNADA_DIA_MIN = 8 * 60
const JORNADA_SAB_MIN = 4 * 60
const TOLERANCIA_MIN  = 5

// Hora de entrada esperada no sábado por papel
function horaEntradaSabPorPapel(papel) {
  const p = (papel || '').toLowerCase()
  if (p.includes('logist')) return 8   // Alessandro: sáb 08:00–12:00
  return 7                              // Guilherme/padrão: sáb 07:00–11:00
}

// ─── Agregar batidas em linhas por dia ───────────────────────────────────────
function agregarMes(batidas, ano, mes, sabHoraEntrada = 7) {
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

    let totalMin = 0
    if (batidasDia.entrada && batidasDia.saida_almoco)
      totalMin += (new Date(batidasDia.saida_almoco) - new Date(batidasDia.entrada)) / 60000
    if (batidasDia.volta_almoco && batidasDia.saida)
      totalMin += (new Date(batidasDia.saida) - new Date(batidasDia.volta_almoco)) / 60000
    if (batidasDia.entrada && batidasDia.saida && !batidasDia.saida_almoco)
      totalMin += (new Date(batidasDia.saida) - new Date(batidasDia.entrada)) / 60000
    totalMin = Math.round(totalMin)

    const cargaDia = ehSabado ? JORNADA_SAB_MIN : JORNADA_DIA_MIN

    let status = 'normal'
    if (ehFds)                          status = 'fds'
    else if (ehFuturo)                  status = 'futuro'
    else if (ehSabado && !teveBatida)   status = 'fds'
    else if (!teveBatida && ehHoje)     status = 'pendente'
    else if (!teveBatida && ehPassado)  status = 'falta'
    else if (teveBatida) {
      const entrada = new Date(batidasDia.entrada)
      const horaLimiar = ehSabado ? sabHoraEntrada : 8
      const limiar  = new Date(ano, mes, dia, horaLimiar, TOLERANCIA_MIN)
      if (entrada > limiar)                              status = 'atraso'
      else if (batidasDia.saida && totalMin > cargaDia) status = 'extra'
    }

    linhas.push({
      dia, diaSemana, ehFds, ehHoje, ehFuturo, ehSabado,
      entrada:     batidasDia.entrada      || null,
      saidaAlmoco: batidasDia.saida_almoco || null,
      voltaAlmoco: batidasDia.volta_almoco || null,
      saida:       batidasDia.saida        || null,
      totalMin, status,
    })
  }
  return linhas
}

// ─── Helpers de status ───────────────────────────────────────────────────────
function corStatus(status, { azul, amarelo, vermelho, T }) {
  if (status === 'normal' || status === 'extra') return azul
  if (status === 'atraso' || status === 'pendente') return amarelo
  if (status === 'falta') return vermelho
  return T.textDim
}
function labelStatus(status) {
  const MAP = { normal:'OK', extra:'Extra', atraso:'Atraso', falta:'Falta',
    pendente:'Pendente', fds:'Folga', futuro:'—' }
  return MAP[status] || '—'
}
function iconStatus(status) {
  const MAP = { normal:'ti-check', extra:'ti-clock-plus', atraso:'ti-alert-triangle',
    falta:'ti-x', pendente:'ti-clock-hour-8', fds:'ti-sun' }
  return MAP[status] || 'ti-minus'
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function EspelhoPonto({ T, dark, funcionario }) {
  const azul    = corEtapa('blue',   dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho= corEtapa('red',    dark)
  const paleta  = { azul, amarelo, vermelho, T }

  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())

  // Threshold de entrada no sábado varia por papel
  const sabHoraEntrada = horaEntradaSabPorPapel(funcionario.papel)

  const { batidas, loading } = usePonto({
    funcionarioId: funcionario.id,
    escopo: 'mes', ano, mes,
  })

  const linhas = useMemo(
    () => agregarMes(batidas, ano, mes, sabHoraEntrada),
    [batidas, ano, mes, sabHoraEntrada],
  )

  const stats = useMemo(() => {
    const diasUteisPassados = linhas.filter(l => !l.ehFds && !l.ehFuturo)
    const todosUteisDoMes   = linhas.filter(l => !l.ehFds)
    const diasTrabalhados   = linhas.filter(l => l.entrada).length
    const faltas   = linhas.filter(l => l.status === 'falta').length
    const atrasos  = linhas.filter(l => l.status === 'atraso').length
    const extras   = linhas.filter(l => l.status === 'extra').length
    const totalMin = linhas.reduce((s, l) => s + l.totalMin, 0)
    const cargaMesTotalMin = todosUteisDoMes.reduce((s, l) =>
      s + (l.ehSabado ? JORNADA_SAB_MIN : JORNADA_DIA_MIN), 0)
    const cargaAtéHojeMin = diasUteisPassados.reduce((s, l) =>
      s + (l.ehSabado ? JORNADA_SAB_MIN : JORNADA_DIA_MIN), 0)
    const saldoMin = totalMin - cargaAtéHojeMin
    const pctCarga = cargaMesTotalMin > 0
      ? Math.min(100, Math.round((totalMin / cargaMesTotalMin) * 100))
      : 0
    const presenca = diasUteisPassados.length > 0
      ? Math.round((diasTrabalhados / diasUteisPassados.length) * 100)
      : 0
    return { diasTrabalhados, faltas, atrasos, extras,
      totalMin, cargaMesTotalMin, cargaAtéHojeMin, saldoMin,
      presenca, pctCarga }
  }, [linhas])

  function navegarMes(delta) {
    const novo = new Date(ano, mes + delta, 1)
    setAno(novo.getFullYear())
    setMes(novo.getMonth())
  }

  const ehMesAtual = ano === hoje.getFullYear() && mes === hoje.getMonth()
  const nomeFunc   = funcionario.nome || 'Funcionário'
  const iniciais   = nomeFunc.slice(0, 2).toUpperCase()
  const corAvatar  = azul

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{`
        .espelho-main { display: flex; flex-direction: column; gap: 12px; }
        @media (min-width: 680px) {
          .espelho-main { flex-direction: row; align-items: flex-start; }
          .espelho-col-left  { width: 290px; flex-shrink: 0; }
          .espelho-col-right { flex: 1; min-width: 0; }
        }
        @keyframes spin-ep { from { transform: rotate(0) } to { transform: rotate(360deg) } }
      `}</style>

      {/* ── CABEÇALHO ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        flexWrap: 'wrap',
        padding: '12px 16px',
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 10,
        boxShadow: T.shadow,
      }}>
        {/* Avatar + identidade */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: `linear-gradient(135deg, ${azul}, ${azul}aa)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, color: '#fff',
            flexShrink: 0, letterSpacing: '-0.01em',
          }}>
            {iniciais}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 700, color: corHero(dark),
              letterSpacing: '-0.01em', lineHeight: 1.2,
            }}>
              {nomeFunc}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              {funcionario.papel} · seg–sex 08:00–18:00 · sáb {String(sabHoraEntrada).padStart(2,'0')}:00–{String(sabHoraEntrada + 4).padStart(2,'0')}:00 · tolerância {TOLERANCIA_MIN} min
            </div>
          </div>
        </div>

        {/* Navegação de mês */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={() => navegarMes(-1)} style={estiloNavBtn(T)}>
            <i className="ti ti-chevron-left" style={{ fontSize: 15, color: 'inherit' }} aria-hidden="true" />
          </button>
          <div style={{
            minWidth: 130, textAlign: 'center',
            fontSize: 14, fontWeight: 700, color: corHero(dark),
            letterSpacing: '-0.01em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {MESES[mes]} {ano}
            {ehMesAtual && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '.05em',
                padding: '2px 6px', borderRadius: 3,
                background: azul + '1a', color: azul,
                border: `1px solid ${azul}40`,
                textTransform: 'uppercase',
              }}>
                Atual
              </span>
            )}
          </div>
          <button onClick={() => navegarMes(1)} disabled={ehMesAtual}
            style={{ ...estiloNavBtn(T), opacity: ehMesAtual ? 0.3 : 1 }}>
            <i className="ti ti-chevron-right" style={{ fontSize: 15, color: 'inherit' }} aria-hidden="true" />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: T.textMuted, fontSize: 13, padding: '20px 0',
          justifyContent: 'center',
        }}>
          <i className="ti ti-loader-2" style={{
            fontSize: 18, animation: 'spin-ep 1s linear infinite',
          }} aria-hidden="true" />
          Carregando jornadas…
        </div>
      ) : (
        <>
          {/* ── KPI STRIP ────────────────────────────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 8,
          }}>
            <KPITile T={T} dark={dark} icon="ti-calendar-check"
              label="Dias trab." valor={stats.diasTrabalhados} cor={azul} />
            <KPITile T={T} dark={dark} icon="ti-clock"
              label="Horas" valor={fmtDuracao(stats.totalMin)} cor={azul} />
            <KPITile T={T} dark={dark} icon="ti-user-check"
              label="Presença"
              valor={`${stats.presenca}%`}
              cor={stats.presenca >= 90 ? azul : stats.presenca >= 75 ? amarelo : vermelho} />
            <KPITile T={T} dark={dark} icon="ti-calendar-x"
              label="Faltas"
              valor={stats.faltas}
              cor={stats.faltas > 0 ? vermelho : T.textMuted} />
            <KPITile T={T} dark={dark}
              icon={stats.saldoMin >= 0 ? 'ti-trending-up' : 'ti-trending-down'}
              label="Banco"
              valor={fmtBancoHoras(stats.saldoMin / 60)}
              cor={stats.saldoMin >= 0 ? azul : vermelho} />
          </div>

          {/* ── LAYOUT PRINCIPAL 2 COLUNAS (desktop) / stack (mobile) ───────── */}
          <div className="espelho-main">

            {/* COLUNA ESQUERDA: calendário + progresso */}
            <div className="espelho-col-left" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Heatmap calendário */}
              <div style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: '12px 14px 14px',
                boxShadow: T.shadow,
              }}>
                <SecLabel T={T} icon="ti-calendar-month" label="Visão do mês" />

                {/* Dias da semana */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 3, marginTop: 10, marginBottom: 3,
                }}>
                  {DIA_SEMANA_CURTO.map((d, i) => (
                    <div key={i} style={{
                      textAlign: 'center', fontSize: 8.5,
                      fontWeight: 700, color: T.textDim,
                      textTransform: 'uppercase', letterSpacing: '.03em',
                    }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Células */}
                <HeatmapCells linhas={linhas} mes={mes} paleta={paleta} T={T} dark={dark} />

                {/* Legenda */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '5px 10px',
                  marginTop: 10, paddingTop: 8,
                  borderTop: `1px solid ${T.border}`,
                }}>
                  {[
                    { cor: azul + 'cc',     label: 'OK/Extra' },
                    { cor: amarelo + 'cc',  label: 'Atraso' },
                    { cor: vermelho + 'cc', label: 'Falta' },
                    { cor: T.cardAlt,       label: 'Folga' },
                  ].map(({ cor, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{
                        width: 9, height: 9, borderRadius: 2,
                        background: cor, border: `1px solid ${T.border}`,
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 9.5, color: T.textMuted }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progresso + banco de horas */}
              <div style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: '12px 14px',
                boxShadow: T.shadow,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <SecLabel T={T} icon="ti-chart-bar" label="Progresso do mês" />

                {/* Barra */}
                <div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'baseline', marginBottom: 6,
                  }}>
                    <span style={{
                      fontSize: 20, fontWeight: 800, color: corHero(dark),
                      fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                      lineHeight: 1,
                    }}>
                      {fmtDuracao(stats.totalMin)}
                    </span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>
                      de {fmtDuracao(stats.cargaMesTotalMin)}
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: T.cardAlt, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${stats.pctCarga}%`,
                      background: stats.pctCarga >= 75 ? azul : amarelo,
                      borderRadius: 4,
                      transition: 'width .4s',
                    }} />
                  </div>
                  <div style={{ marginTop: 4, fontSize: 10.5, color: T.textDim, textAlign: 'right' }}>
                    {stats.pctCarga}% da carga prevista
                  </div>
                </div>

                {/* Banco de horas */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px', borderRadius: 6,
                  background: (stats.saldoMin >= 0 ? azul : vermelho) + '12',
                  border: `1px solid ${(stats.saldoMin >= 0 ? azul : vermelho)}30`,
                }}>
                  <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>
                    Banco de horas
                  </span>
                  <span style={{
                    fontSize: 15, fontWeight: 800,
                    color: stats.saldoMin >= 0 ? azul : vermelho,
                    fontVariantNumeric: 'tabular-nums',
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    <i className={`ti ${stats.saldoMin >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`}
                       style={{ fontSize: 13 }} aria-hidden="true" />
                    {fmtBancoHoras(stats.saldoMin / 60)}
                  </span>
                </div>

                {/* Alertas */}
                {stats.faltas > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, color: vermelho, fontWeight: 600,
                  }}>
                    <i className="ti ti-alert-circle" style={{ fontSize: 12 }} aria-hidden="true" />
                    {stats.faltas} {stats.faltas === 1 ? 'falta' : 'faltas'} não compensadas
                  </div>
                )}
                {stats.atrasos > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, color: amarelo, fontWeight: 600,
                  }}>
                    <i className="ti ti-clock-exclamation" style={{ fontSize: 12 }} aria-hidden="true" />
                    {stats.atrasos} {stats.atrasos === 1 ? 'dia' : 'dias'} com atraso
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: tabela detalhada */}
            <div className="espelho-col-right">
              <div style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                boxShadow: T.shadow,
                overflow: 'hidden',
              }}>
                {/* Título da tabela */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px 8px',
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, color: T.textMuted,
                    textTransform: 'uppercase', letterSpacing: '.06em',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <i className="ti ti-calendar-stats" style={{ fontSize: 12 }} aria-hidden="true" />
                    Marcações detalhadas
                  </span>
                  <span style={{ fontSize: 10.5, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
                    {linhas.filter(l => l.entrada).length} dias com batida
                  </span>
                </div>

                {/* Scroll horizontal no mobile */}
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <TabelaHeader T={T} />
                  {linhas.map(l => (
                    <TabelaLinha key={l.dia} l={l} paleta={paleta} T={T} dark={dark} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Células do heatmap ──────────────────────────────────────────────────────
function HeatmapCells({ linhas, mes, paleta, T, dark }) {
  const { azul, amarelo, vermelho } = paleta
  const primeiroDia = new Date(linhas[0]
    ? new Date(linhas[0].dia > 0
        ? new Date().getFullYear() + '-' + String(mes + 1).padStart(2, '0') + '-01'
        : new Date())
    : new Date()).getDay()

  // Recalcula o offset corretamente
  const ano = linhas.length > 0
    ? new Date(
        new Date().getFullYear(),
        mes,
        linhas[0].dia
      ).getFullYear()
    : new Date().getFullYear()

  const offset = new Date(ano, mes, 1).getDay()

  function bgCell(l) {
    if (!l) return 'transparent'
    if (l.status === 'normal' || l.status === 'extra') return azul + 'cc'
    if (l.status === 'atraso') return amarelo + 'cc'
    if (l.status === 'falta')  return vermelho + 'cc'
    if (l.status === 'pendente') return amarelo + '55'
    if (l.status === 'fds')    return T.cardAlt
    return T.border + '40'  // futuro
  }

  function titleCell(l) {
    const data = `${String(l.dia).padStart(2,'0')}/${String(mes+1).padStart(2,'0')}`
    const s    = labelStatus(l.status)
    const e    = l.entrada ? fmtHora(l.entrada) : '—'
    const sa   = l.saida   ? fmtHora(l.saida)   : '—'
    const dur  = l.totalMin > 0 ? fmtDuracao(l.totalMin) : '—'
    return `${data} · ${s} · ${e} → ${sa} · ${dur}`
  }

  const cells = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (const l of linhas) cells.push(l)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
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
              fontSize: 9.5, fontWeight: 700,
              color: l.status === 'fds' || l.status === 'futuro'
                ? T.textDim
                : l.status === 'atraso' ? '#1a1a1d' : '#fff',
              cursor: 'help', boxSizing: 'border-box',
              transition: 'transform .1s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {l.dia}
          </div>
        )
      )}
    </div>
  )
}

// ─── KPI Tile ────────────────────────────────────────────────────────────────
function KPITile({ T, dark, valor, label, icon, cor }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      padding: '10px 10px 8px',
      textAlign: 'center',
      boxShadow: T.shadow,
    }}>
      <i className={`ti ${icon}`} style={{
        fontSize: 15, color: cor,
        display: 'block', marginBottom: 5, opacity: 0.85,
      }} aria-hidden="true" />
      <div style={{
        fontSize: 17, fontWeight: 800, color: cor,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em', lineHeight: 1,
        marginBottom: 3,
      }}>
        {valor}
      </div>
      <div style={{
        fontSize: 9, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.04em',
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── Tabela: cabeçalho e linha ────────────────────────────────────────────────
const COLS = '44px 62px 66px 66px 62px 66px 1fr'

function TabelaHeader({ T }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COLS,
      gap: 4, padding: '6px 14px',
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

function TabelaLinha({ l, paleta, T, dark }) {
  const cor = corStatus(l.status, paleta)
  const { azul, vermelho } = paleta
  const opacidade = l.ehFds || l.status === 'futuro' ? 0.45 : 1
  const bgLinha   = l.ehHoje
    ? azul + (dark ? '18' : '0d')
    : l.status === 'falta'
      ? vermelho + (dark ? '18' : '0a')
      : 'transparent'

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: COLS,
      gap: 4, padding: '7px 14px',
      minWidth: 420,
      borderTop: `1px solid ${T.border}`,
      alignItems: 'center',
      fontSize: 11.5,
      opacity: opacidade,
      background: bgLinha,
      borderLeft: l.ehHoje ? `3px solid ${azul}` : '3px solid transparent',
      boxSizing: 'border-box',
    }}>
      {/* Dia */}
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
      <CelulaHora T={T} dark={dark} iso={l.entrada} />
      <CelulaHora T={T} dark={dark} iso={l.saidaAlmoco} />
      <CelulaHora T={T} dark={dark} iso={l.voltaAlmoco} />
      <CelulaHora T={T} dark={dark} iso={l.saida} />

      {/* Total */}
      <div style={{
        textAlign: 'right', fontWeight: 600,
        color: l.totalMin > 0 ? corHero(dark) : T.textDim,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {l.totalMin > 0 ? fmtDuracao(l.totalMin) : '—'}
      </div>

      {/* Status — lozenge */}
      <div style={{ paddingLeft: 6 }}>
        {l.status === 'fds' ? (
          <span style={{ fontSize: 10, color: T.textDim, fontStyle: 'italic' }}>
            {l.diaSemana === 0 ? 'Dom' : 'Sáb'}
          </span>
        ) : l.status === 'futuro' ? (
          <span style={{ fontSize: 10, color: T.textDim }}>—</span>
        ) : (
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
      </div>
    </div>
  )
}

// ─── Célula de hora ──────────────────────────────────────────────────────────
function CelulaHora({ T, dark, iso }) {
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

// ─── Label de seção ──────────────────────────────────────────────────────────
function SecLabel({ T, icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 10.5, fontWeight: 700, color: T.textMuted,
      textTransform: 'uppercase', letterSpacing: '.06em',
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
      {label}
    </div>
  )
}

// ─── Botão de navegação de mês ───────────────────────────────────────────────
function estiloNavBtn(T) {
  return {
    background: T.card,
    border: `1.5px solid ${T.textMuted}`,
    borderRadius: 7,
    width: 32, height: 32,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    color: T.textSecondary,
  }
}
