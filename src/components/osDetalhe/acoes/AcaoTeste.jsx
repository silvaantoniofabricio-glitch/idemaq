// src/components/osDetalhe/acoes/AcaoTeste.jsx
// Etapa Teste final — registra falhas encontradas durante o teste.
// Se 0 falhas: botão grande verde "Aprovar teste" → vai pra Entrega.
// Se ≥1 falha: botão vermelho "Voltar para Em oficina" → volta uma etapa.

import React, { useState } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import BlocoAcao from './BlocoAcao'

export default function AcaoTeste({ T, dark, os, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  const [falhas, setFalhas] = useState([])
  const [novaFalha, setNovaFalha] = useState('')

  function adicionarFalha() {
    const t = novaFalha.trim()
    if (!t) return
    setFalhas(prev => [...prev, t])
    setNovaFalha('')
  }
  function removerFalha(i) {
    setFalhas(prev => prev.filter((_, idx) => idx !== i))
  }

  function aprovar() {
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'entrega')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }
  function voltarOficina() {
    const oficina = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    if (oficina) onMoverOS(os.numero, oficina.id)
  }

  const semFalhas = falhas.length === 0

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-clipboard-check"
      etapa="Teste final"
      descricao="Liste qualquer falha encontrada. Sem falhas, aprove. Com falhas, volte pra oficina."
      tom={semFalhas ? 'amarelo' : 'vermelho'}
    >
      {/* Lista de falhas */}
      {falhas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {falhas.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: cor('#2a1515', '#fde8e8'),
              border: `1px solid ${vermelho}33`,
              borderRadius: 7, padding: '8px 10px',
              fontSize: 12, color: T.textPrimary,
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 14, color: vermelho }} aria-hidden="true" />
              <span style={{ flex: 1 }}>{f}</span>
              <button
                onClick={() => removerFalha(i)}
                aria-label="Remover falha"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: T.textMuted, padding: 2, borderRadius: 4,
                  display: 'inline-flex', alignItems: 'center',
                }}>
                <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Adicionar falha */}
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={novaFalha}
          onChange={(e) => setNovaFalha(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarFalha() } }}
          placeholder="Registrar nova falha (ex: vazamento no spin)"
          style={{
            flex: 1,
            padding: '9px 12px', borderRadius: 7,
            border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
            fontSize: 12.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={adicionarFalha}
          disabled={!novaFalha.trim()}
          style={{
            padding: '0 14px', borderRadius: 7,
            border: `1px solid ${T.border}`, background: T.bg,
            color: T.textSecondary, fontSize: 12, fontWeight: 600,
            cursor: novaFalha.trim() ? 'pointer' : 'not-allowed',
            opacity: novaFalha.trim() ? 1 : 0.5,
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
          Adicionar
        </button>
      </div>

      {/* Ação principal */}
      {semFalhas ? (
        <button
          onClick={aprovar}
          style={{
            padding: '14px 18px', borderRadius: 8, border: 'none',
            background: verde, color: '#fff',
            fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          <i className="ti ti-circle-check" style={{ fontSize: 18 }} aria-hidden="true" />
          Aprovar teste · ir pra Entrega
        </button>
      ) : (
        <button
          onClick={voltarOficina}
          style={{
            padding: '12px 16px', borderRadius: 8, border: 'none',
            background: vermelho, color: '#fff',
            fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <i className="ti ti-arrow-back-up" style={{ fontSize: 17 }} aria-hidden="true" />
          Voltar para Em oficina ({falhas.length} {falhas.length === 1 ? 'falha' : 'falhas'})
        </button>
      )}
    </BlocoAcao>
  )
}
