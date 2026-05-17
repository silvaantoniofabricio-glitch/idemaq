// src/components/osDetalhe/acoes/AcaoAgendamento.jsx
// Etapas ag_agendamento e agendado.
// - ag_agendamento: input data+hora + botão "Confirmar agendamento" → move pra agendado
// - agendado: mostra info do agendamento + botão "Confirmar recebimento" → move pra recebido

import React, { useState } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS, TIPOS_OS } from '../../../utils/osData'
import { fmtDataHora } from '../../../utils/fmt'
import BlocoAcao from './BlocoAcao'

export default function AcaoAgendamento({ T, dark, os, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = cor(P.yellow, P.yellowDark)
  const isAgendado = os.etapa === 'agendado'

  const [prazo, setPrazo] = useState(os.prazo ? os.prazo.slice(0, 16) : '')

  function confirmarAgendamento() {
    if (!prazo) return
    onUpdateOS(os.numero, { prazo })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'agendado')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  function confirmarRecebimento() {
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'recebido')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    colorScheme: dark ? 'dark' : 'light',
  }

  const btnAmarelo = {
    padding: '10px 16px', borderRadius: 7, border: 'none',
    background: amarelo, color: dark ? '#0a0a0d' : '#0a0a0d',
    fontSize: 12.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  }

  if (!isAgendado) {
    return (
      <BlocoAcao
        T={T} dark={dark} icon="ti-calendar-event"
        etapa="Aguardando agendamento"
        descricao="Defina data e hora da coleta — ao confirmar, a OS vai pra coluna Agendado."
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 10.5, color: T.textMuted, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px' }}>
              Data e hora da coleta
            </label>
            <input
              type="datetime-local"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              style={inputStyle}
            />
          </div>
          <button
            onClick={confirmarAgendamento}
            disabled={!prazo}
            style={{
              ...btnAmarelo,
              opacity: prazo ? 1 : 0.45,
              cursor: prazo ? 'pointer' : 'not-allowed',
            }}>
            <i className="ti ti-calendar-check" style={{ fontSize: 16 }} aria-hidden="true" />
            Confirmar agendamento
          </button>
        </div>
      </BlocoAcao>
    )
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-calendar-check"
      etapa="Agendado"
      descricao="Coleta agendada — quando a máquina chegar na oficina, confirme o recebimento."
    >
      <div style={{
        background: T.cardAlt, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: '10px 12px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <i className="ti ti-clock" style={{ fontSize: 18, color: T.textMuted }} aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>
            Coleta agendada para
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
            {fmtDataHora(os.prazo) || '—'}
          </div>
        </div>
      </div>
      <button onClick={confirmarRecebimento} style={btnAmarelo}>
        <i className="ti ti-package" style={{ fontSize: 16 }} aria-hidden="true" />
        Confirmar recebimento da máquina
      </button>
    </BlocoAcao>
  )
}
