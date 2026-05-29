// src/components/osDetalhe/acoes/AcaoAgendamentoHIG.jsx
// Etapa Agendamento — Atlassian Design (reescrito 28/05/2026).
//
// Picker pra escolher dia + periodo + horario da coleta:
//   1. Dia       — scroll horizontal 14 dias (chips dd/dow)
//   2. Periodo   — segmented control Manha/Tarde/Noite
//   3. Horario   — grid 4 cols de slots de 15min do periodo
//   4. CTA       — Confirmar dd/mm · HH:MM (avanca pra etapa agendamento)

import React, { useState, useMemo } from 'react'
import { useTheme } from '../../../theme'
import {
  AtlPanel, AtlButton, AtlDayChip, AtlSegmented, AtlTimeChip, ATL_FONT,
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
function detectarPeriodo(hora) {
  if (!hora) return 'tarde'
  const h = parseInt(hora.split(':')[0], 10)
  if (h < 12) return 'manha'
  if (h < 18) return 'tarde'
  return 'noite'
}

export default function AcaoAgendamentoHIG({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()
  const dias = useMemo(() => proxNDias(14), [])

  const dataInicial = os?.data_agendamento?.slice(0, 10) || os?.coleta?.data || dias[1]?.iso
  const horaInicial = os?.data_agendamento?.slice(11, 16) || os?.coleta?.hora || null

  const [diaSel, setDiaSel] = useState(dataInicial)
  const [periodoSel, setPeriodoSel] = useState(os?.coleta?.periodo || detectarPeriodo(horaInicial))
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
      gap: 12, fontFamily: ATL_FONT, padding: '0 0 12px',
    }}>

      {/* 1. DIA */}
      <AtlPanel T={T} dark={dark} title="Dia" footer="Próximos 14 dias.">
        <div style={{
          display: 'flex', gap: 6, padding: '12px 14px',
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
            options={PERIODOS}
            value={periodoSel}
            onChange={(v) => { setPeriodoSel(v); setHoraSel(null) }} />
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
