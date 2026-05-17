// src/components/osDetalhe/tabs/EtapaTab.jsx
// Aba Etapa — onde a AÇÃO acontece. Delega pra um componente em acoes/ conforme
// a etapa atual da OS. Cada ação é responsável pelo form + botão que avança.

import React from 'react'
import {
  AcaoAgendamento,
  AcaoRecebido,
  AcaoDiagnostico,
  AcaoOrcamento,
  AcaoOficina,
  AcaoTeste,
  AcaoEntrega,
  AcaoPagamento,
  AcaoConcluido,
  AcaoRecusada,
} from '../acoes'

const MAP = {
  ag_agendamento: AcaoAgendamento,
  agendado: AcaoAgendamento,
  recebido: AcaoRecebido,
  diagnostico: AcaoDiagnostico,
  orcamento: AcaoOrcamento,
  oficina: AcaoOficina,
  teste_final: AcaoTeste,
  entrega: AcaoEntrega,
  pagamento: AcaoPagamento,
  concluido: AcaoConcluido,
  recusado: AcaoRecusada,
  // Aliases / variantes que aparecem em Fabricação e Venda
  agendamento: AcaoAgendamento,
  entregue: AcaoEntrega,
}

export default function EtapaTab(props) {
  const Componente = MAP[props.os.etapa]

  return (
    <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Componente
        ? <Componente {...props} />
        : <SemAcao {...props} />}
    </div>
  )
}

function SemAcao({ T, dark, os }) {
  return (
    <div style={{
      padding: '24px 20px',
      background: T.cardAlt,
      border: `1px dashed ${T.border}`,
      borderRadius: 9,
      textAlign: 'center',
    }}>
      <i className="ti ti-circle-dashed" style={{ fontSize: 28, color: T.textDim, display: 'block', margin: '0 auto 8px' }} aria-hidden="true" />
      <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
        Sem ação detalhada nesta etapa
      </div>
      <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 4 }}>
        Use o footer pra avançar a OS quando estiver pronto.
      </div>
    </div>
  )
}
