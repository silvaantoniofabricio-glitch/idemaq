// src/components/osDetalhe/acoes/AcaoPagamento.jsx
// Etapa Pagamento — recebimento real do dinheiro acontece na aba Pagamento.
// Aqui só mostro um resumo + link "→ Receber na aba Pagamento".

import React from 'react'
import { P } from '../../../theme'
import { OS_ITENS_MOCK } from '../../../_mocks/os'
import { fmtBRL } from '../../../utils/fmt'
import BlocoAcao from './BlocoAcao'

export default function AcaoPagamento({ T, dark, os, setAba }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = cor(P.yellow, P.yellowDark)

  const itens = OS_ITENS_MOCK[os.numero] || []
  const subtotal = itens.reduce((s, i) => s + i.valor * i.qtd, 0)
  const total = Math.max(0, subtotal - (os.desconto || 0))
  const aPagar = Math.max(0, total - (os.valor_pago || 0))

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-cash-banknote"
      etapa="Pagamento"
      descricao="Selecione a forma de pagamento e confirme o recebimento. Tudo na aba Pagamento."
    >
      <div style={{
        background: T.cardAlt, border: `1px solid ${T.border}`,
        borderRadius: 8, padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      }}>
        <div>
          <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>
            A receber
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
            {fmtBRL(aPagar, { fr: true })}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
            Total {fmtBRL(total, { fr: true })}
            {os.valor_pago > 0 && ` · Já pago ${fmtBRL(os.valor_pago, { fr: true })}`}
          </div>
        </div>
        <button
          onClick={() => setAba && setAba('pagamento')}
          style={{
            padding: '12px 16px', borderRadius: 8, border: 'none',
            background: amarelo, color: '#0a0a0d',
            fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
          <i className="ti ti-arrow-right" style={{ fontSize: 16 }} aria-hidden="true" />
          Receber na aba Pagamento
        </button>
      </div>
    </BlocoAcao>
  )
}
