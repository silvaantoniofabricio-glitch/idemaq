// src/components/osDetalhe/tabs/EtapaTab.jsx
// Aba Etapa — onde a AÇÃO acontece. Delega pra um componente em acoes/ conforme
// a etapa atual da OS. Cada ação é responsável pelo form + botão que avança.
//
// IMPORTANTE: o alerta amarelo "ATENÇÃO · observações da OS" é renderizado
// AQUI, no wrapper, pra aparecer automaticamente em TODAS as etapas. As etapas
// individuais mantem seus campos editaveis de observacoes (que escrevem em
// os.observacoes), e este alerta no topo serve so de destaque visual pra
// tecnico nunca esquecer (ex: 'levar a capa na entrega').

import React from 'react'
import { useTheme } from '../../../theme'
import { TI, PALETA } from '../../_shared/PrimitivasMobile'
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
import AcaoAgendamentoHIG from '../acoes/AcaoAgendamentoHIG'
import AcaoRecebidoHIG from '../acoes/AcaoRecebidoHIG'

const MAP = {
  // HIG aplicado em TODAS as etapas.
  // Agendamento ainda usa o componente dedicado AcaoAgendamentoHIG porque
  // tem layout especial (segmented control iOS, day chips, etc).
  ag_agendamento: AcaoAgendamentoHIG,
  agendado: AcaoAgendamentoHIG,
  recebido: AcaoRecebidoHIG,
  diagnostico: AcaoDiagnostico,
  orcamento: AcaoOrcamento,
  oficina: AcaoOficina,
  teste_final: AcaoTeste,
  entrega: AcaoEntrega,
  pagamento: AcaoPagamento,
  concluido: AcaoConcluido,
  recusado: AcaoRecusada,
  // Aliases / variantes que aparecem em Fabricação e Venda
  agendamento: AcaoAgendamentoHIG,
  entregue: AcaoEntrega,
}

// Alerta amarelo persistente — aparece no topo de toda etapa quando há
// observacoes na OS. Conteudo somente leitura (cada etapa tem seu campo
// editavel proprio que escreve em os.observacoes).
function AlertaObservacoes({ os }) {
  const { T, dark } = useTheme()
  const obs = (os?.observacoes || '').trim()
  if (!obs) return null

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
      marginBottom: 8,
    }}>
      <div style={{
        padding: '3px 6px 3px 8px',
        background: dark ? 'rgba(255,217,102,0.10)' : '#FFF7DC',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          background: dark ? 'rgba(255,217,102,0.18)' : PALETA.yellowBg,
          color: PALETA.yellowStrong,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TI name="alert-circle" size={11} />
        </span>
        <span style={{
          flex: 1, fontSize: 11, fontWeight: 700, color: T.textPrimary,
          textTransform: 'uppercase', letterSpacing: '.04em',
        }}>Atenção · observações da OS</span>
        <span style={{
          fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: PALETA.yellowStrong, color: '#fff',
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>NÃO ESQUECER</span>
      </div>
      <div style={{
        padding: 10,
        fontSize: 13, color: T.textPrimary, lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
      }}>{obs}</div>
    </div>
  )
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
