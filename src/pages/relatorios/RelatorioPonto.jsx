// src/pages/relatorios/RelatorioPonto.jsx
// Relatório de Ponto — layout Atlassian Design System.
// Seções: Equipe agora · KPIs · Heatmap de presença · Tabela expandível

import React, { useState } from 'react'
import { P } from '../../theme'
import { corEtapa, corHero } from '../../utils/colors'
import { Card, Badge, EmptyState } from '../../components/ui'
import { useRelatorioPonto } from '../../hooks/useRelatorios'
import EspelhoPonto from '../../components/ponto/EspelhoPonto'

// ─── Constantes de design ────────────────────────────────────────────────────
const LABEL_PAPEL = { logistica: 'Logística', oficina: 'Oficina', dono: 'Dono' }
const AVATAR_CORES = ['#5B9BD5', '#B8CCE4', '#FFD966']

const STATUS_HOJE = {
  trabalhando: { label: 'Trabalhando',  icon: 'ti-activity',      cor: '#5B9BD5' },
  almoco:      { label: 'Em almoço',    icon: 'ti-coffee',        cor: '#FFD966' },
  encerrado:   { label: 'Encerrado',    icon: 'ti-circle-check',  cor: '#94A3B8' },
  ausente:     { label: 'Ausente hoje', icon: 'ti-circle-dashed', cor: '#FF6B6B' },
}

const STATUS_DIA_COR = {
  ok:    '#5B9BD5',
  extra: '#B8CCE4',
  atraso:'#FFD966',
  falta: '#FF6B6B',
}

const STATUS_DIA_LABEL = {
  ok:    'Presente',
  extra: 'Hora extra',
  atraso:'Atraso',
  falta: 'Falta',
}

function fmtHoraCurta(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtData(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function RelatorioPonto({ T, dark, iniIso, fimIso }) {
  const { data, loading, error } = useRelatorioPonto({ iniIso, fimIso })
  const [espelhoAberto, setEspelhoAberto] = useState(null)

  if (loading) return <Carregando T={T} />
  if (error)   return <Erro T={T} dark={dark} msg={error} />
  if (!data)   return null

  const azul     = P.blue
  const amarelo  = P.yellow
  const vermelho = '#FF6B6B'
  const azulClaro = P.blueLight

  const semDados = data.porFuncionario.length === 0

  if (semDados) {
    return (
      <Card T={T} dark={dark}>
        <EmptyState T={T} icon="ti-clock-off"
          title="Sem batidas no período"
          description="Nenhum funcionário registrou ponto neste período." />
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ═══════════════════════════════════════════════════════════════════
          SEÇÃO 1 — EQUIPE AGORA
      ═══════════════════════════════════════════════════════════════════ */}
      <SecLabel T={T} icon="ti-users" label="Equipe agora" />
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${data.porFuncionario.length}, 1fr)`,
        gap: 12,
      }}>
        {data.porFuncionario.map((f, i) => (
          <CartaoFuncionario key={f.id} T={T} dark={dark} f={f}
            avatarCor={AVATAR_CORES[i % AVATAR_CORES.length]}
            azul={azul} amarelo={amarelo} vermelho={vermelho} />
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SEÇÃO 2 — KPIs DO PERÍODO
      ═══════════════════════════════════════════════════════════════════ */}
      <SecLabel T={T} icon="ti-chart-bar" label={`Resumo do período · ${fmtData(iniIso)} – ${fmtData(fimIso)}`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        <KPITile T={T} dark={dark} icon="ti-clock-hour-4" label="Total horas"
          valor={data.totalHoras} cor={azul} />
        <KPITile T={T} dark={dark} icon="ti-calendar-check" label="Taxa presença"
          valor={`${data.taxaPresencaGeral}%`} cor={data.taxaPresencaGeral >= 90 ? azul : data.taxaPresencaGeral >= 70 ? amarelo : vermelho} />
        <KPITile T={T} dark={dark} icon="ti-calendar-x" label="Faltas"
          valor={data.totalFaltas} cor={data.totalFaltas === 0 ? corHero(dark) : amarelo} />
        <KPITile T={T} dark={dark} icon="ti-alarm" label="Atrasos"
          valor={data.totalAtrasos} cor={data.totalAtrasos === 0 ? corHero(dark) : amarelo} />
        <KPITile T={T} dark={dark} icon="ti-trending-up" label="Horas extras"
          valor={data.totalHorasExtras} cor={azulClaro} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SEÇÃO 3 — HEATMAP DE PRESENÇA
      ═══════════════════════════════════════════════════════════════════ */}
      <SecLabel T={T} icon="ti-calendar-stats" label="Calendário de presença" />
      <Card T={T} dark={dark} padding={0}>
        {/* Legenda */}
        <div style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          {Object.entries(STATUS_DIA_LABEL).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 10, height: 10, borderRadius: 2,
                background: STATUS_DIA_COR[k], display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: T.textMuted }}>{v}</span>
            </div>
          ))}
        </div>

        {data.porFuncionario.map((f, i) => (
          <HeatmapFuncionario key={f.id} T={T} dark={dark} f={f}
            avatarCor={AVATAR_CORES[i % AVATAR_CORES.length]}
            ultimo={i === data.porFuncionario.length - 1} />
        ))}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════
          SEÇÃO 4 — TABELA DETALHADA + ESPELHO EXPANSÍVEL
      ═══════════════════════════════════════════════════════════════════ */}
      <SecLabel T={T} icon="ti-table" label="Detalhamento — clique numa linha para o espelho dia a dia" />
      <Card T={T} dark={dark} padding={0}>
        {/* Cabeçalho tabela */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 110px 80px 80px 80px 120px 32px',
          gap: 8, padding: '8px 16px',
          background: T.cardAlt, borderBottom: `1px solid ${T.border}`,
          fontSize: 10.5, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          <div>Funcionário</div>
          <div style={{ textAlign: 'right' }}>Horas totais</div>
          <div style={{ textAlign: 'right' }}>Presença</div>
          <div style={{ textAlign: 'right' }}>Faltas</div>
          <div style={{ textAlign: 'right' }}>Atrasos</div>
          <div style={{ textAlign: 'right' }}>Banco de horas</div>
          <div />
        </div>

        {data.porFuncionario.map((f, i) => {
          const saldoPos  = f.saldoHorasMin >= 0
          const corSaldo  = saldoPos ? azul : vermelho
          const aberto    = espelhoAberto === f.id
          const funcionario = { id: f.id, nome: f.nome, papel: LABEL_PAPEL[f.papel] || f.papel || '' }

          return (
            <div key={f.id}>
              {/* Linha da tabela */}
              <div
                onClick={() => setEspelhoAberto(aberto ? null : f.id)}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 110px 80px 80px 80px 120px 32px',
                  gap: 8, alignItems: 'center',
                  padding: '13px 16px',
                  borderTop: `1px solid ${T.border}`,
                  cursor: 'pointer',
                  background: aberto ? (dark ? '#1a2235' : '#EEF3FF') : 'transparent',
                  transition: 'background .1s',
                }}>
                {/* Col: nome */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar nome={f.nome} cor={AVATAR_CORES[i % AVATAR_CORES.length]} size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: corHero(dark) }}>{f.nome}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{LABEL_PAPEL[f.papel] || f.papel}</div>
                  </div>
                </div>
                {/* Col: horas */}
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>
                  {f.totalHoras}
                  <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 500 }}>média {f.mediaHorasDia}/dia</div>
                </div>
                {/* Col: presença % */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: f.taxaPresenca >= 90 ? azul : f.taxaPresenca >= 70 ? amarelo : vermelho, fontVariantNumeric: 'tabular-nums' }}>
                    {f.taxaPresenca}%
                  </div>
                  <BarraProgresso pct={f.taxaPresenca} cor={f.taxaPresenca >= 90 ? azul : f.taxaPresenca >= 70 ? amarelo : vermelho} T={T} />
                </div>
                {/* Col: faltas */}
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: f.faltas > 0 ? amarelo : T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                  {f.faltas}
                </div>
                {/* Col: atrasos */}
                <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: f.diasAtraso > 0 ? amarelo : T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                  {f.diasAtraso}
                </div>
                {/* Col: banco horas */}
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                  <i className={`ti ${saldoPos ? 'ti-trending-up' : 'ti-trending-down'}`}
                     style={{ fontSize: 13, color: corSaldo }} aria-hidden="true" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: corSaldo, fontVariantNumeric: 'tabular-nums' }}>
                    {f.saldoHoras}
                  </span>
                </div>
                {/* Col: chevron */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={`ti ${aberto ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                     style={{ fontSize: 13, color: T.textDim }} aria-hidden="true" />
                </div>
              </div>

              {/* Espelho expansível */}
              {aberto && (
                <div style={{
                  padding: '14px 16px 20px',
                  borderTop: `1px solid ${T.border}`,
                  background: dark ? '#10141c' : '#f5f7ff',
                }}>
                  <EspelhoPonto T={T} dark={dark} funcionario={funcionario} />
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}

// ─── Cartão de funcionário (Seção 1) ────────────────────────────────────────
function CartaoFuncionario({ T, dark, f, avatarCor, azul, amarelo, vermelho }) {
  const st = STATUS_HOJE[f.statusHoje] || STATUS_HOJE.ausente
  const saldoPos = f.saldoHorasMin >= 0

  // Borda lateral colorida conforme status
  const accentMap = {
    trabalhando: azul,
    almoco:      amarelo,
    encerrado:   T.border,
    ausente:     vermelho,
  }
  const accent = accentMap[f.statusHoje] || T.border

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: T.shadow,
    }}>
      {/* Header: avatar + nome + status hoje */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar nome={f.nome} cor={avatarCor} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: corHero(dark) }}>{f.nome}</div>
          <div style={{ fontSize: 11, color: T.textMuted }}>{LABEL_PAPEL[f.papel] || f.papel}</div>
        </div>
        {/* Lozenge de status */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '3px 8px', borderRadius: 3,
          background: st.cor + '1a',
          fontSize: 11, fontWeight: 600, color: st.cor,
          whiteSpace: 'nowrap',
        }}>
          <i className={`ti ${st.icon}`} style={{ fontSize: 11 }} aria-hidden="true" />
          {st.label}
        </div>
      </div>

      {/* Métricas em grid 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricaTile T={T} label="Horas no período" valor={f.totalHoras} />
        <MetricaTile T={T} label="Média por dia" valor={f.mediaHorasDia} />
        <MetricaTile T={T} label="Dias com atraso"
          valor={f.diasAtraso}
          cor={f.diasAtraso > 0 ? amarelo : undefined} />
        <MetricaTile T={T} label="Faltas"
          valor={f.faltas}
          cor={f.faltas > 0 ? amarelo : undefined} />
      </div>

      {/* Taxa de presença */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Taxa de presença
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: f.taxaPresenca >= 90 ? azul : f.taxaPresenca >= 70 ? amarelo : vermelho, fontVariantNumeric: 'tabular-nums' }}>
            {f.taxaPresenca}%
          </span>
        </div>
        <BarraProgresso pct={f.taxaPresenca} cor={f.taxaPresenca >= 90 ? azul : f.taxaPresenca >= 70 ? amarelo : vermelho} T={T} height={5} />
      </div>

      {/* Banco de horas */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderRadius: 5,
        background: dark ? '#ffffff08' : '#0000000a',
        border: `1px solid ${T.border}`,
      }}>
        <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Banco de horas</span>
        <span style={{
          fontSize: 14, fontWeight: 800,
          color: saldoPos ? azul : vermelho,
          fontVariantNumeric: 'tabular-nums',
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <i className={`ti ${saldoPos ? 'ti-trending-up' : 'ti-trending-down'}`}
             style={{ fontSize: 13 }} aria-hidden="true" />
          {f.saldoHoras}
        </span>
      </div>
    </div>
  )
}

// ─── Heatmap de presença por funcionário (Seção 3) ──────────────────────────
function HeatmapFuncionario({ T, dark, f, avatarCor, ultimo }) {
  const dias = f.diasDetalhados || []

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: ultimo ? 'none' : `1px solid ${T.border}`,
      display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      {/* Nome */}
      <div style={{ width: 80, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7, paddingTop: 4 }}>
        <Avatar nome={f.nome} cor={avatarCor} size={24} fontSize={9} />
        <span style={{ fontSize: 11, fontWeight: 600, color: T.textSecondary }}>{f.nome}</span>
      </div>

      {/* Grid de quadradinhos */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {dias.map(d => {
            const cor = STATUS_DIA_COR[d.status] || T.border
            const dia = d.iso.slice(8)
            const mes = d.iso.slice(5, 7)
            const nomeStatus = STATUS_DIA_LABEL[d.status] || ''
            const entradaTxt = d.entrada ? ` · Entrada ${fmtHoraCurta(d.entrada)}` : ''
            const saidaTxt   = d.saida   ? ` · Saída ${fmtHoraCurta(d.saida)}` : ''
            const durTxt     = d.totalMin > 0 ? ` · ${Math.floor(d.totalMin/60)}h${String(d.totalMin%60).padStart(2,'0')}` : ''
            return (
              <div
                key={d.iso}
                title={`${dia}/${mes} — ${nomeStatus}${entradaTxt}${saidaTxt}${durTxt}`}
                style={{
                  width: 22, height: 22, borderRadius: 3,
                  background: d.status === 'falta' ? cor + 'aa' : cor,
                  border: `1px solid ${cor}55`,
                  cursor: 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: d.status === 'atraso' ? '#1a1a1d' : '#fff',
                  fontWeight: 700, opacity: d.status === 'falta' ? 0.7 : 1,
                }}>
                {dia}
              </div>
            )
          })}
        </div>

        {/* Resumo compacto */}
        <div style={{ display: 'flex', gap: 14, marginTop: 7, flexWrap: 'wrap' }}>
          {[
            { k: 'ok',    label: `${dias.filter(d=>d.status==='ok').length} OK` },
            { k: 'extra', label: `${dias.filter(d=>d.status==='extra').length} extras` },
            { k: 'atraso',label: `${dias.filter(d=>d.status==='atraso').length} atrasos` },
            { k: 'falta', label: `${dias.filter(d=>d.status==='falta').length} faltas` },
          ].filter(x => parseInt(x.label) > 0).map(x => (
            <div key={x.k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 1, background: STATUS_DIA_COR[x.k], display: 'inline-block' }} />
              <span style={{ fontSize: 10.5, color: T.textMuted }}>{x.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Primitivos de UI ────────────────────────────────────────────────────────
function Avatar({ nome, cor, size = 36, fontSize }) {
  const initials = nome ? nome.slice(0, 2).toUpperCase() : '??'
  const isLight = cor === '#FFD966'
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: cor,
      color: isLight ? '#1a1a1d' : '#fff',
      fontSize: fontSize || Math.round(size * 0.32),
      fontWeight: 800, letterSpacing: '-.01em',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function BarraProgresso({ pct, cor, T, height = 4 }) {
  return (
    <div style={{ height, borderRadius: height, background: T.progBg || T.cardAlt, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, pct)}%`, height: '100%',
        background: cor, borderRadius: height,
        transition: 'width .4s ease',
      }} />
    </div>
  )
}

function MetricaTile({ T, label, valor, cor }) {
  return (
    <div style={{
      padding: '7px 10px', borderRadius: 5,
      background: dark => dark ? '#ffffff06' : '#0000000a',
      border: `1px solid ${T.border}`,
    }}>
      <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: cor || T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </div>
    </div>
  )
}

function KPITile({ T, dark, icon, label, valor, cor }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: '12px 14px',
      boxShadow: T.shadow,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 13, color: cor }} aria-hidden="true" />
        <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {valor}
      </div>
    </div>
  )
}

function SecLabel({ T, icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12, color: T.textMuted }} aria-hidden="true" />
      <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </span>
    </div>
  )
}

function Carregando({ T }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 48, color: T.textMuted, fontSize: 13 }}>
      <i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
      Carregando jornadas…
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function Erro({ T, dark, msg }) {
  return (
    <Card T={T} dark={dark}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#FF6B6B' }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 20 }} aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Falha ao carregar relatório de ponto</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: T.textSecondary }}>{msg}</div>
    </Card>
  )
}
