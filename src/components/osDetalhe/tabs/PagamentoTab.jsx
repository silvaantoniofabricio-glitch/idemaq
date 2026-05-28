// src/components/osDetalhe/tabs/PagamentoTab.jsx
// Aba "A receber" do OSDetalhe — renderiza AcaoPagamentoHIG.
import React from 'react'
import AcaoPagamentoHIG from '../acoes/AcaoPagamentoHIG'

export default function PagamentoTab({ os, onUpdateOS, onMoverOS }) {
  return (
    <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <AcaoPagamentoHIG os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />
    </div>
  )
}
