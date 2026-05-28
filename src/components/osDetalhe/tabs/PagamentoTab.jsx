// src/components/osDetalhe/tabs/PagamentoTab.jsx
// Aba "A receber" — espelho exato do Orçamento (AcaoOrcamentoHIG).
// Idêntico pra que o usuário consiga dar baixa no pagamento usando
// o mesmo FormRecebimento do Orçamento, inclusive quando o cliente
// pagou antecipado durante a etapa de orçamento.
import React from 'react'
import AcaoOrcamentoHIG from '../acoes/AcaoOrcamentoHIG'

export default function PagamentoTab({ os, onUpdateOS, onMoverOS, setAba }) {
  return (
    <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <AcaoOrcamentoHIG os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} onAbrirAba={setAba} />
    </div>
  )
}
