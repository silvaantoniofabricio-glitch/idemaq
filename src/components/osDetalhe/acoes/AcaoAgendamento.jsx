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

  // Identificação obrigatória pra confirmar recebimento: foto OU (modelo + nº série)
  const [fotoRegistrada, setFotoRegistrada] = useState((os.fotos || 0) > 0)
  const [modelo, setModelo] = useState(os.modelo || '')
  const [serie, setSerie] = useState(os.serie || '')
  const podeConfirmarRecebimento = fotoRegistrada || (modelo.trim() && serie.trim())

  function confirmarAgendamento() {
    if (!prazo) return
    onUpdateOS(os.numero, { prazo })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'agendado')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  function confirmarRecebimento() {
    if (!podeConfirmarRecebimento) return
    const patch = {}
    if (modelo.trim() !== (os.modelo || '')) patch.modelo = modelo.trim()
    if (serie.trim() !== (os.serie || '')) patch.serie = serie.trim()
    if (fotoRegistrada && !(os.fotos > 0)) patch.fotos = (os.fotos || 0) + 1
    if (Object.keys(patch).length > 0) onUpdateOS(os.numero, patch)
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
      descricao="Coleta agendada — quando a máquina chegar, identifique-a (foto OU modelo+série) e confirme o recebimento."
    >
      {/* Info card: coleta agendada */}
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

      {/* Identificação da máquina — foto OU modelo+série */}
      <div style={{
        background: T.cardAlt, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-id" style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
          <span style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px',
          }}>Identificar máquina</span>
          <span style={{
            marginLeft: 'auto',
            fontSize: 10, color: podeConfirmarRecebimento ? cor(P.green, P.greenDark) : T.textDim,
            fontWeight: 600,
          }}>
            {podeConfirmarRecebimento ? '✓ ok' : 'foto OU modelo + série'}
          </span>
        </div>

        {/* Foto */}
        <button
          onClick={() => setFotoRegistrada(v => !v)}
          style={{
            padding: '10px 12px', borderRadius: 7,
            border: `1.5px dashed ${fotoRegistrada ? cor(P.green, P.greenDark) : T.border}`,
            background: fotoRegistrada ? cor('#0f2a15', '#e8f5ec') : 'transparent',
            color: fotoRegistrada ? cor(P.green, P.greenDark) : T.textSecondary,
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
          <i className={`ti ${fotoRegistrada ? 'ti-circle-check' : 'ti-camera'}`}
             style={{ fontSize: 15 }} aria-hidden="true" />
          {fotoRegistrada ? 'Foto da máquina registrada' : 'Tirar foto da máquina'}
        </button>

        {/* Separador "ou" */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 9.5, color: T.textDim, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '.4px',
        }}>
          <div style={{ flex: 1, height: 1, background: T.border }} />
          ou
          <div style={{ flex: 1, height: 1, background: T.border }} />
        </div>

        {/* Modelo + Série */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={miniLabel(T)}>Modelo</label>
            <input
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="Ex: BWK11A"
              style={inputSmall(T)}
            />
          </div>
          <div>
            <label style={miniLabel(T)}>Nº de série</label>
            <input
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              placeholder="Ex: BR-2024-887"
              style={inputSmall(T)}
            />
          </div>
        </div>
      </div>

      {/* Confirmar — só habilita se identificação OK */}
      <button
        onClick={confirmarRecebimento}
        disabled={!podeConfirmarRecebimento}
        title={podeConfirmarRecebimento
          ? 'Confirmar recebimento e avançar pra Recebido'
          : 'Registre a foto OU preencha modelo + nº de série antes de confirmar'}
        style={{
          ...btnAmarelo,
          justifyContent: 'center',
          opacity: podeConfirmarRecebimento ? 1 : 0.45,
          cursor: podeConfirmarRecebimento ? 'pointer' : 'not-allowed',
        }}>
        <i className="ti ti-package" style={{ fontSize: 16 }} aria-hidden="true" />
        Confirmar recebimento da máquina
      </button>
    </BlocoAcao>
  )
}

function miniLabel(T) {
  return {
    display: 'block', fontSize: 10, color: T.textMuted, fontWeight: 600,
    marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.3px',
  }
}
function inputSmall(T) {
  return {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
}
