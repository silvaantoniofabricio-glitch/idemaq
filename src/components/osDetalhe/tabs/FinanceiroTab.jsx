// src/components/osDetalhe/tabs/FinanceiroTab.jsx
// PR1: placeholder — implementação completa vem no PR3.
// Vai unir itens + orçamento + pagamento numa única aba.

import React from 'react'
import PlaceholderTab from './_PlaceholderTab'

export default function FinanceiroTab(props) {
  return (
    <PlaceholderTab
      {...props}
      icon="ti-receipt"
      titulo="Financeiro — em construção (PR3)"
      descricao="Vai unir itens (editáveis em Orçamento), desconto bidirecional, total, status de pagamento e fluxo de cobrança InfinitePay D+1 (PIX / Débito / Cartão / Misto / Parcelado)."
    />
  )
}
