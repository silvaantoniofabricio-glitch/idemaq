// src/components/osDetalhe/acoes/AcaoAgendamentoHIG.jsx
// Etapa Agendamento — Atlassian Design (reescrito 28/05/2026).
//
// Picker pra escolher dia + periodo + horario da coleta. Estrutura:
//   1. Dia       — scroll horizontal de 14 dias (chips dd/dow)
//   2. Periodo   — segmented control (Manha / Tarde / Noite)
//   3. Horario   — grid 4-cols de slots de 15min do periodo
//   4. CTA       — Confirmar dd/mm · HH:MM (avanca pra etapa agendamento)
//
// O nome do arquivo permanece *HIG por compat com imports do EtapaTab.
// O sub-componente AgendadoHIG legado foi removido (etapa 'agendado' agora
// roteia direto pra AcaoColetaHIG no EtapaTab.MAP).

import React, { useState, useMemo } from 'react'
import { useTheme } from '../../../theme'
import { corEtapa } from '../../../utils/colors'
import {
  AtlPanel, AtlButton, ATL_FONT, atlHover,
} from './_AtlassianUI'

const DOW = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const PERIODOS = [
  { id: 'manha', label: 'Manhã', ini: 6,  fim: 12 },
  { id: 'tarde', label: 'Tarde', ini: 12, fim: 18 },
  { id: 'noite', label: 'Noite', ini: 18, fim: 22 },
]

function proxNDias(n = 14) {
  const out = []
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    const d = new Date(hoje); d.setDate(d.getDate() + i)
    out.push({ iso: d.toISOString().slice(0, 10), dia: d.getDate(), dow: DOW[d.getDay()] })
  }
  return out
}

function horariosDoPeriodo(periodoId) {
  const p = PERIODOS.find(x => x.id === periodoId) || PERIODOS[1]
  const out = []
  for (let h = p.ini; h < p.fim; h++) {
    for (let m = 0; m < 60; m += 15) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return out
}

function fmtBR(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ─── Chip de dia ──────────────────────────────────────────────────────────
function AtlDayChip({ T, dark, dia, dow, selected, onClick }) {
  const azul = corEtapa('blue', dark)
  return (
    <button type="button" onClick={onClick}
      style={{
        flex: '0 0 auto',
        width: 50, height: 58,
        borderRadius: 4,
        border: `1px solid ${selected ? azul : T.border}`,
        background: selected ? azul : (dark ? 'rgba(255,255,255,0.025)' : '#FAFBFC'),
        color: selected ? '#fff' : T.textPrimary,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        cursor: 'pointer',
        fontFamily: ATL_FONT,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}>
      <span style={{
        fontSize: 10, fontWeight: 700,
        color: selected ? 'rgba(255,255,255,0.85)' : T.textMuted,
        letterSpacing: '0.06em',
      }}>{dow}</span>
      <span style={{
        fontSize: 20, fontWeight: 600,
        color: selected ? '#fff' : T.textPrimary,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
      }}>{dia}</span>
    </button>
  )
}

// ─── Segmented control Atlassian (Manhã / Tarde / Noite) ──────────────────
function AtlSegmented({ T, dark, options, value, onChange }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      display: 'flex',
      background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
      borderRadius: 3,
      padding: 2,
      gap: 0,
    }}>
      {options.map(o => {
        const sel = o.id === value
        return (
          <button key={o.id} type="button" onClick={() => onChange(o.id)}
            style={{
              flex: 1, minHeight: 32,
              border: 'none', borderRadius: 3,
              background: sel
                ? (dark ? '#22272B' : '#FFFFFF')
                : 'transparent',
              color: sel ? (dark ? '#fff' : T.textPrimary) : T.textMuted,
              fontSize: 13, fontWeight: sel ? 600 : 500,
              fontFamily: ATL_FONT,
              cursor: 'pointer',
              boxShadow: sel
                ? (dark
                    ? '0 1px 2px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,0.05)'
                    : '0 1px 2px rgba(9,30,66,0.18), 0 0 0 1px rgba(9,30,66,0.05)')
                : 'none',
              letterSpacing: '-0.005em',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background .12s, box-shadow .12s',
            }}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Chip de horário ──────────────────────────────────────────────────────
function AtlTimeChip({ T, dark, label, selected, onClick }) {
  const [hover, setHover] = useState(false)
  const azul = corEtapa('blue', dark)
  return (
    <button type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        minHeight: 32, padding: '4px 8px',
        borderRadius: 3,
        border: `1px solid ${selected ? azul : T.border}`,
        background: selected
          ? azul
          : (hover ? atlHover(dark) : 'transparent'),
        color: selected ? '#fff' : T.textPrimary,
        fontSize: 13, fontWeight: selected ? 600 : 500,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        fontVariantNumeric: 'tabular-nums',
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}>
      {label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Picker (ag_agendamento / agendamento)
// ═══════════════════════════════════════════════════════════════════════════
function AgendamentoPicker({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()
  const dias = useMemo(() => proxNDias(14), [])

  const dataInicial = os?.data_agendamento?.slice(0, 10) || os?.coleta?.data || dias[1]?.iso
  const horaInicial = os?.data_agendamento?.slice(11, 16) || os?.coleta?.hora || null

  const [diaSel, setDiaSel] = useState(dataInicial)
  const [periodoSel, setPeriodoSel] = useState(os?.coleta?.periodo || (
    horaInicial && parseInt(horaInicial, 10) < 12 ? 'manha'
    : horaInicial && parseInt(horaInicial, 10) < 18 ? 'tarde'
    : horaInicial ? 'noite' : 'tarde'
  ))
  const [horaSel, setHoraSel] = useState(horaInicial)
  const horarios = useMemo(() => horariosDoPeriodo(periodoSel), [periodoSel])
  const podeConfirmar = !!diaSel && !!horaSel
  const [salvando, setSalvando] = useState(false)

  async function confirmar() {
    if (!podeConfirmar) return
    setSalvando(true)
    const iso = new Date(`${diaSel}T${horaSel}:00-04:00`).toISOString()
    await onUpdateOS?.(os.numero, { data_agendamento: iso })
    onMoverOS?.(os.numero, 'agendamento')
    setSalvando(false)
  }

  const ctaLabel = podeConfirmar
    ? `Confirmar ${fmtBR(diaSel)} · ${horaSel}`
    : 'Escolha dia e hora'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12,
      fontFamily: ATL_FONT,
      padding: '0 0 12px',
    }}>

      {/* 1. DIA */}
      <AtlPanel T={T} dark={dark} title="Dia" footer="Próximos 14 dias.">
        <div style={{
          display: 'flex', gap: 6,
          padding: '12px 14px',
          overflowX: 'auto',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          <style>{`div::-webkit-scrollbar{display:none}`}</style>
          {dias.map(d => (
            <AtlDayChip key={d.iso} T={T} dark={dark}
              dia={d.dia} dow={d.dow}
              selected={d.iso === diaSel}
              onClick={() => setDiaSel(d.iso)} />
          ))}
        </div>
      </AtlPanel>

      {/* 2. PERIODO */}
      <AtlPanel T={T} dark={dark} title="Período">
        <div style={{ padding: 10 }}>
          <AtlSegmented T={T} dark={dark}
            options={PERIODOS} value={periodoSel} onChange={(v) => { setPeriodoSel(v); setHoraSel(null) }} />
        </div>
      </AtlPanel>

      {/* 3. HORARIO */}
      <AtlPanel
        T={T} dark={dark}
        title="Horário"
        count={horarios.length}
        footer="Escolha o horário disponível.">
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6, padding: 12,
        }}>
          {horarios.map(h => (
            <AtlTimeChip key={h} T={T} dark={dark}
              label={h}
              selected={h === horaSel}
              onClick={() => setHoraSel(h)} />
          ))}
        </div>
      </AtlPanel>

      {/* 4. CTA */}
      <AtlButton
        T={T} dark={dark}
        variant="primary"
        fullWidth
        disabled={!podeConfirmar || salvando}
        icon={salvando ? 'loader-2' : (podeConfirmar ? 'check' : 'calendar-event')}
        onClick={confirmar}>
        {salvando ? 'Salvando…' : ctaLabel}
      </AtlButton>
    </div>
  )
}

// ─── Export padrão ────────────────────────────────────────────────────────
export default function AcaoAgendamentoHIG({ os, onUpdateOS, onMoverOS }) {
  return <AgendamentoPicker os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />
}
