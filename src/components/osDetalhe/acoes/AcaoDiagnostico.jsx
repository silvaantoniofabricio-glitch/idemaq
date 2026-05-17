// src/components/osDetalhe/acoes/AcaoDiagnostico.jsx
// Diagnóstico técnico após avaliar a máquina.
// Campos: causa identificada, itens necessários, tempo estimado.
// Botão "Concluir diagnóstico" → avança pra Orçamento.

import React, { useState } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import BlocoAcao from './BlocoAcao'

export default function AcaoDiagnostico({ T, dark, os, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = cor(P.yellow, P.yellowDark)

  const [causa, setCausa] = useState('')
  const [itens, setItens] = useState([''])
  const [tempoEstimado, setTempoEstimado] = useState('')
  const [observacoes, setObservacoes] = useState(os.observacoes || '')

  const addItem = () => setItens(prev => prev.length >= 8 ? prev : [...prev, ''])
  const updateItem = (i, v) => setItens(prev => prev.map((x, idx) => idx === i ? v : x))
  const removeItem = (i) => setItens(prev => prev.length <= 1 ? [''] : prev.filter((_, idx) => idx !== i))

  function concluir() {
    const itensLimpos = itens.map(i => i.trim()).filter(Boolean)
    const diagnostico = [
      causa && `Causa: ${causa}`,
      itensLimpos.length > 0 && `Itens necessários: ${itensLimpos.join(', ')}`,
      tempoEstimado && `Tempo estimado: ${tempoEstimado}`,
    ].filter(Boolean).join(' · ')
    onUpdateOS(os.numero, {
      observacoes: [observacoes, diagnostico].filter(Boolean).join('\n\n— Diagnóstico —\n'),
    })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'orcamento')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-stethoscope"
      etapa="Diagnóstico técnico"
      descricao="Descreva a causa, o que precisa pra resolver e quanto tempo leva. Os preços vão na próxima etapa (Orçamento)."
    >
      <div>
        <Label T={T}>Causa identificada</Label>
        <input
          value={causa}
          onChange={(e) => setCausa(e.target.value)}
          placeholder="Ex: Rolamento do tambor desgastado"
          style={inputStyle(T)}
        />
      </div>

      <div>
        <Label T={T}>Itens necessários <Op T={T} /></Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {itens.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input
                value={it}
                onChange={(e) => updateItem(i, e.target.value)}
                placeholder={`Ex: Rolamento 6205, mola da porta…`}
                style={{ ...inputStyle(T), flex: 1 }}
              />
              {itens.length > 1 && (
                <button
                  onClick={() => removeItem(i)}
                  aria-label="Remover item"
                  style={{
                    padding: '0 10px', borderRadius: 7,
                    border: `1px solid ${T.border}`, background: 'transparent',
                    color: T.textMuted, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center',
                  }}>
                  <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
        {itens.length < 8 && (
          <button
            onClick={addItem}
            style={{
              marginTop: 6, padding: '6px 10px', borderRadius: 6,
              border: `1px dashed ${T.border}`, background: 'transparent',
              color: cor(P.blue, P.blueDark),
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
            adicionar item
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <Label T={T}>Tempo estimado <Op T={T} /></Label>
          <input
            value={tempoEstimado}
            onChange={(e) => setTempoEstimado(e.target.value)}
            placeholder="Ex: 2h, 1 dia útil"
            style={inputStyle(T)}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={concluir}
          disabled={!causa.trim()}
          title={!causa.trim() ? 'Informe a causa antes de concluir' : 'Avança pra Orçamento'}
          style={{
            padding: '10px 16px', borderRadius: 7, border: 'none',
            background: amarelo, color: '#0a0a0d',
            fontSize: 12.5, fontWeight: 700,
            cursor: causa.trim() ? 'pointer' : 'not-allowed',
            opacity: causa.trim() ? 1 : 0.5,
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          <i className="ti ti-check" style={{ fontSize: 16 }} aria-hidden="true" />
          Concluir diagnóstico
        </button>
      </div>
    </BlocoAcao>
  )
}

function Label({ T, children }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 10.5, color: T.textMuted, fontWeight: 600,
      marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px',
    }}>{children}</label>
  )
}
function Op({ T }) {
  return <span style={{ fontSize: 10, color: T.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>· opcional</span>
}
function inputStyle(T) {
  return {
    width: '100%', padding: '9px 12px', borderRadius: 7,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
}
