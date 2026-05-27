// src/components/osDetalhe/acoes/AcaoRecebido.jsx
// Pré-diagnóstico de recebimento: registra estado inicial da máquina antes
// de enviar pro diagnóstico. Persiste via checklist_etapa (etapa='recebido').

import React, { useState, useEffect } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import BlocoAcao from './BlocoAcao'

const TESTES = [
  { id: 'entrada_agua',  label: 'Entrada de água',  icon: 'ti-droplet' },
  { id: 'saida_agua',    label: 'Saída de água',    icon: 'ti-droplet-off' },
  { id: 'agitacao',      label: 'Agitação',         icon: 'ti-refresh' },
  { id: 'centrifugacao', label: 'Centrifugação',    icon: 'ti-rotate-clockwise' },
]

const OPCOES = [
  { valor: 'ok',      label: 'Ok',          cor: 'azul' },
  { valor: 'defeito', label: 'Com defeito', cor: 'vermelho' },
  { valor: 'barulho', label: 'Com barulho', cor: 'amarelo' },
]

export default function AcaoRecebido({ T, dark, os, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const azul    = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  const amarelo  = cor(P.yellow, P.yellowDark)

  const { itens: chkItens, observacoes: chkObs, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'recebido')

  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )
  const [obs, setObs] = useState('')
  const [hidratado, setHidratado] = useState(false)

  useEffect(() => {
    if (loadingChk || hidratado) return
    const novoTestes = TESTES.reduce((acc, t) => {
      const found = chkItens.find(i => i.id === t.id)
      return { ...acc, [t.id]: found?.valor ?? null }
    }, {})
    setTestes(novoTestes)
    setObs(chkObs || '')
    setHidratado(true)
  }, [loadingChk, chkItens, chkObs, hidratado])

  function selecionar(testeId, valor) {
    setTestes(prev => ({ ...prev, [testeId]: prev[testeId] === valor ? null : valor }))
  }

  function serializarChecklist() {
    return TESTES.map(t => ({
      id: t.id, label: t.label,
      checked: testes[t.id] === 'ok',
      valor: testes[t.id] || null,
    }))
  }

  async function avancar() {
    await salvarChk(serializarChecklist(), obs || null)
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'diagnostico')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  const todosPreenchidos = TESTES.every(t => testes[t.id] != null)

  function corOpcao(opcaoCor, ativo) {
    if (!ativo) return { bg: 'transparent', border: T.border, color: T.textMuted }
    if (opcaoCor === 'azul')     return { bg: `${azul}22`,     border: azul,     color: azul }
    if (opcaoCor === 'vermelho') return { bg: `${vermelho}22`, border: vermelho, color: vermelho }
    if (opcaoCor === 'amarelo')  return { bg: `${amarelo}22`,  border: amarelo,  color: amarelo }
    return { bg: 'transparent', border: T.border, color: T.textMuted }
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-clipboard-check"
      etapa="Recebido (pré-diagnóstico)"
      descricao="Teste cada função e registre o estado inicial da máquina antes de enviar pro diagnóstico."
      tom="azul"
    >
      {/* === CHECKLIST DE TESTE === */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <i className="ti ti-test-pipe" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
          <span style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}>
            Teste de funcionamento
          </span>
        </div>

        <div style={{ borderRadius: 8, border: `1px solid ${T.border}`, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr repeat(3, auto)', gap: 0,
            padding: '7px 12px',
            background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
            borderBottom: `1px solid ${T.border}`,
          }}>
            <span style={hdrStyle(T)}>Teste</span>
            {OPCOES.map(op => (
              <span key={op.valor} style={{ ...hdrStyle(T), width: 90, textAlign: 'center' }}>
                {op.label}
              </span>
            ))}
          </div>

          {TESTES.map((teste, idx) => (
            <div key={teste.id} style={{
              display: 'grid', gridTemplateColumns: '1fr repeat(3, auto)', gap: 0,
              alignItems: 'center', padding: '10px 12px',
              borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
              background: idx % 2 === 0 ? 'transparent'
                : dark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <i className={`ti ${teste.icon}`} style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
                <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
                  {teste.label}
                </span>
              </div>
              {OPCOES.map(op => {
                const ativo = testes[teste.id] === op.valor
                const { bg, border, color } = corOpcao(op.cor, ativo)
                return (
                  <div key={op.valor} style={{ width: 90, display: 'flex', justifyContent: 'center' }}>
                    <button type="button"
                      onClick={() => selecionar(teste.id, op.valor)}
                      style={{
                        padding: '5px 10px', borderRadius: 20,
                        border: `1.5px solid ${border}`,
                        background: bg, color,
                        fontSize: 12, fontWeight: ativo ? 700 : 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all .15s', whiteSpace: 'nowrap',
                      }}>
                      {op.label}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* === OBSERVAÇÕES === */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <i className="ti ti-message-2" style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
          <span style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.04em',
          }}>
            Observações
          </span>
        </div>
        <textarea
          value={obs}
          onChange={e => setObs(e.target.value)}
          placeholder="Ex: máquina chegou com cabo arrancado, painel arranhado…"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '9px 12px', borderRadius: 7,
            border: `1px solid ${T.border}`,
            background: T.cardAlt, color: T.textPrimary,
            fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
            outline: 'none',
          }}
        />
      </div>

      {/* === STATUS === */}
      {!todosPreenchidos && (
        <div style={{
          padding: '10px 12px', borderRadius: 7,
          background: T.cardAlt, border: `1px dashed ${T.border}`,
          fontSize: 12, color: T.textMuted, fontStyle: 'italic',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 14 }} aria-hidden="true" />
          Preencha todos os {TESTES.length} testes pra liberar.
        </div>
      )}

      {/* === BOTÃO AVANÇAR === */}
      {todosPreenchidos && (
        <button onClick={avancar} style={{
          padding: '14px 18px', borderRadius: 8, border: 'none',
          background: azul, color: '#fff',
          fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="ti ti-arrow-right" style={{ fontSize: 18 }} aria-hidden="true" />
          Salvar e ir para Diagnóstico
        </button>
      )}
    </BlocoAcao>
  )
}

function hdrStyle(T) {
  return {
    fontSize: 10.5, color: T.textMuted, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '.3px',
  }
}
