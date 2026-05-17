// src/components/osDetalhe/acoes/AcaoOrcamento.jsx
// Etapa Orçamento — orçamento detalhado é editado na aba Pagamento.
// Aqui na Etapa mostro um resumo + atalhos Aprovar/Recusar (mesma ação dos botões da aba Pagamento).

import React from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { OS_ITENS_MOCK } from '../../../_mocks/os'
import { fmtBRL } from '../../../utils/fmt'
import BlocoAcao from './BlocoAcao'

export default function AcaoOrcamento({ T, dark, os, onMoverOS, setAba }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = cor(P.yellow, P.yellowDark)
  const verde = cor(P.green, P.greenDark)
  const vermelho = cor(P.red, P.redDark)

  const itens = OS_ITENS_MOCK[os.numero] || []
  const subtotal = itens.reduce((s, i) => s + i.valor * i.qtd, 0)
  const total = Math.max(0, subtotal - (os.desconto || 0))

  function aprovar() {
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }
  function recusar() {
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'recusado')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-file-dollar"
      etapa="Orçamento"
      descricao="Edite os itens e o desconto na aba Pagamento. Depois decida abaixo."
    >
      {/* Resumo do orçamento */}
      <div style={{
        background: T.cardAlt, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: '10px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>
            {itens.length} {itens.length === 1 ? 'item' : 'itens'} no orçamento
          </span>
          {setAba && (
            <button
              onClick={() => setAba('pagamento')}
              style={{
                background: 'transparent', border: 'none',
                color: cor(P.blue, P.blueDark), fontSize: 11.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}>
              Editar na aba Pagamento <i className="ti ti-arrow-right" style={{ fontSize: 12 }} aria-hidden="true" />
            </button>
          )}
        </div>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          fontSize: 11, color: T.textMuted,
        }}>
          <span>Subtotal {fmtBRL(subtotal, { fr: true })} {os.desconto > 0 && `· Desconto −${fmtBRL(os.desconto, { fr: true })}`}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {fmtBRL(total, { fr: true })}
          </span>
        </div>
      </div>

      {/* Decisão */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <button
          onClick={aprovar}
          style={{
            padding: '12px 16px', borderRadius: 8, border: 'none',
            background: verde, color: '#fff',
            fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <i className="ti ti-check" style={{ fontSize: 17 }} aria-hidden="true" />
          Aprovar orçamento
        </button>
        <button
          onClick={recusar}
          style={{
            padding: '12px 14px', borderRadius: 8,
            border: `1px solid ${vermelho}55`,
            background: cor('#2a1515', '#fde8e8'),
            color: vermelho,
            fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <i className="ti ti-x" style={{ fontSize: 15 }} aria-hidden="true" />
          Recusar
        </button>
      </div>
    </BlocoAcao>
  )
}
