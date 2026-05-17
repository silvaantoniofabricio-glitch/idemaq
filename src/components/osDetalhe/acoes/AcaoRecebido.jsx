// src/components/osDetalhe/acoes/AcaoRecebido.jsx
// Checklist de pré-diagnóstico na etapa Recebido.
// 4 testes (Entrada de água, Saída de água, Agitação, Centrifugação),
// cada um com opção Ok / Defeito / Barulho + textarea de observações.
// Botão "Concluir pré-diagnóstico" → avança pra Diagnóstico.

import React, { useState } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import BlocoAcao from './BlocoAcao'

const TESTES = [
  { id: 'entrada_agua',   label: 'Entrada de água',  icon: 'ti-droplet' },
  { id: 'saida_agua',     label: 'Saída de água',    icon: 'ti-droplet-off' },
  { id: 'agitacao',       label: 'Agitação',         icon: 'ti-refresh' },
  { id: 'centrifugacao',  label: 'Centrifugação',    icon: 'ti-rotate-clockwise' },
]

const OPCOES = [
  { valor: 'ok',      label: 'Ok',      cor: 'azul' },
  { valor: 'defeito', label: 'Defeito', cor: 'vermelho' },
  { valor: 'barulho', label: 'Barulho', cor: 'amarelo' },
]

export default function AcaoRecebido({ T, dark, os, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = cor(P.yellow, P.yellowDark)

  // Estado dos testes — inicializa do campo salvo ou vazio
  const salvo = os.pre_diagnostico || {}
  const [testes, setTestes] = useState(() =>
    TESTES.reduce((acc, t) => ({ ...acc, [t.id]: salvo[t.id] || null }), {})
  )
  const [obsPreDiag, setObsPreDiag] = useState(salvo.observacoes || '')

  function selecionar(testeId, valor) {
    setTestes(prev => ({
      ...prev,
      [testeId]: prev[testeId] === valor ? null : valor, // toggle
    }))
  }

  function concluir() {
    onUpdateOS(os.numero, {
      pre_diagnostico: { ...testes, observacoes: obsPreDiag },
    })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'diagnostico')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  // Cores por opção
  function corOpcao(opcaoCor, ativo) {
    const azul    = corEtapa('blue',   dark)
    const vermelho = corEtapa('red',   dark)
    const amareloCor = cor(P.yellow, P.yellowDark)

    if (!ativo) return {
      bg: 'transparent',
      border: T.border,
      color: T.textMuted,
    }
    if (opcaoCor === 'azul')     return { bg: `${azul}22`,     border: azul,      color: azul }
    if (opcaoCor === 'vermelho') return { bg: `${vermelho}22`, border: vermelho,  color: vermelho }
    if (opcaoCor === 'amarelo')  return { bg: `${amareloCor}22`, border: amareloCor, color: amareloCor }
    return { bg: 'transparent', border: T.border, color: T.textMuted }
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-clipboard-check"
      etapa="Pré-diagnóstico"
      descricao="Teste cada função da máquina e registre o resultado."
    >
      {/* Tabela de testes */}
      <div style={{
        borderRadius: 8,
        border: `1px solid ${T.border}`,
        overflow: 'hidden',
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr repeat(3, auto)',
          gap: 0,
          padding: '7px 12px',
          background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
          borderBottom: `1px solid ${T.border}`,
        }}>
          <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>
            Teste
          </span>
          {OPCOES.map(op => (
            <span key={op.valor} style={{
              fontSize: 10.5, color: T.textMuted, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '.3px',
              width: 78, textAlign: 'center',
            }}>
              {op.valor === 'ok' ? 'Ok' : op.valor === 'defeito' ? 'Com defeito' : 'Com barulho'}
            </span>
          ))}
        </div>

        {/* Linhas de teste */}
        {TESTES.map((teste, idx) => (
          <div
            key={teste.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr repeat(3, auto)',
              alignItems: 'center',
              gap: 0,
              padding: '10px 12px',
              borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
              background: idx % 2 === 0
                ? 'transparent'
                : dark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
            }}
          >
            {/* Nome do teste */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className={`ti ${teste.icon}`} style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
              <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                {teste.label}
              </span>
            </div>

            {/* Botões Ok / Defeito / Barulho */}
            {OPCOES.map(op => {
              const ativo = testes[teste.id] === op.valor
              const { bg, border, color } = corOpcao(op.cor, ativo)
              return (
                <div key={op.valor} style={{ width: 78, display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => selecionar(teste.id, op.valor)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 20,
                      border: `1.5px solid ${border}`,
                      background: bg,
                      color: color,
                      fontSize: 12,
                      fontWeight: ativo ? 700 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all .15s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {op.label}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Textarea de observações */}
      <div>
        <label style={{
          display: 'block',
          fontSize: 10.5, color: T.textMuted, fontWeight: 600,
          marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.3px',
        }}>
          Observações do pré-diagnóstico
          <span style={{ fontSize: 10, color: T.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', marginLeft: 6 }}>
            · opcional
          </span>
        </label>
        <textarea
          value={obsPreDiag}
          onChange={e => setObsPreDiag(e.target.value)}
          placeholder="Descreva detalhes observados nos testes…"
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${T.border}`,
            background: T.bg, color: T.textPrimary,
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
            fontFamily: 'inherit', minHeight: 72, resize: 'vertical',
          }}
        />
      </div>

      {/* Ações */}
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
