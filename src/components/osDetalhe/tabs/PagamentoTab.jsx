// src/components/osDetalhe/tabs/PagamentoTab.jsx
// Aba "Pagamento" do OSDetalhe — espelho 1:1 da etapa Orçamento.
// O conteúdo, layout, lógica de itens, desconto, forma de pagamento e
// FormRecebimento vivem todos no AcaoOrcamento; aqui só repassamos
// as props. Qualquer mudança no Orçamento aparece automaticamente aqui.

import React from 'react'
import { useTheme } from '../../../theme'
import AcaoOrcamento from '../acoes/AcaoOrcamento'

export default function PagamentoTab({ os, onUpdateOS, onMoverOS, setAba }) {
  const { T, dark } = useTheme()
  // Mesmo wrapper que o EtapaTab usa, pra ficar pixel-perfect identico
  // ao Orcamento (sem ele as bordas dos blocos colam na tela = "zoom").
  return (
    <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <AcaoOrcamento
        T={T}
        dark={dark}
        os={os}
        onUpdateOS={onUpdateOS}
        onMoverOS={onMoverOS}
        onAbrirAba={setAba}
      />
    </div>
  )
}
