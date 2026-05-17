// src/components/osDetalhe/acoes/AcaoRecebido.jsx
// Pré-diagnóstico ao receber a máquina.
// Campos: estado geral, defeito observado, observações da coleta.
// Botão "Concluir pré-diagnóstico" → avança pra Diagnóstico.

import React, { useState } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import BlocoAcao from './BlocoAcao'

export default function AcaoRecebido({ T, dark, os, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = cor(P.yellow, P.yellowDark)
  const [defeito, setDefeito] = useState(os.defeito || '')
  const [observacoes, setObservacoes] = useState(os.observacoes || '')

  function concluir() {
    onUpdateOS(os.numero, { defeito, observacoes })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'diagnostico')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-clipboard-text"
      etapa="Pré-diagnóstico"
      descricao="Registre o que o cliente reportou e o estado da máquina ao chegar."
    >
      <Campo T={T} label="Defeito relatado / observado">
        <textarea
          value={defeito}
          onChange={(e) => setDefeito(e.target.value)}
          placeholder="Ex: Não centrifuga, faz barulho de chiado…"
          style={textareaStyle(T, dark)}
        />
      </Campo>
      <Campo T={T} label="Observações da coleta" opcional>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          placeholder="Ex: Máquina molhada, fiapos no tambor, capa rasgada…"
          style={textareaStyle(T, dark)}
        />
      </Campo>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled
          title="Coleta de foto vem em outra etapa do fluxo"
          style={{
            padding: '8px 14px', borderRadius: 7,
            border: `1px dashed ${T.border}`,
            background: 'transparent', color: T.textDim,
            fontSize: 12, fontWeight: 500, cursor: 'not-allowed',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          <i className="ti ti-camera" style={{ fontSize: 14 }} aria-hidden="true" />
          Foto da coleta (em breve)
        </button>
        <button
          onClick={concluir}
          style={{
            padding: '10px 16px', borderRadius: 7, border: 'none',
            background: amarelo, color: '#0a0a0d',
            fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          <i className="ti ti-check" style={{ fontSize: 16 }} aria-hidden="true" />
          Concluir pré-diagnóstico
        </button>
      </div>
    </BlocoAcao>
  )
}

function Campo({ T, label, opcional, children }) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px',
      }}>
        {label}
        {opcional && <span style={{ fontSize: 10, color: T.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>· opcional</span>}
      </label>
      {children}
    </div>
  )
}

function textareaStyle(T, dark) {
  return {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
    minHeight: 64, resize: 'vertical',
  }
}
