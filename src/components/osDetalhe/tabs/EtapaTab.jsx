// src/components/osDetalhe/tabs/EtapaTab.jsx
// Aba Etapa — onde a AÇÃO acontece. Delega pra um componente em acoes/ conforme
// a etapa atual da OS. Cada ação é responsável pelo form + botão que avança.
//
// IMPORTANTE: o painel "Observações internas" é renderizado AQUI, no
// wrapper, pra aparecer sempre no topo de TODAS as etapas — editável ali
// mesmo, sem precisar caçar campo escondido dentro de cada etapa. Escreve
// em os.observacoes (mesmo campo que os textareas de observação de etapas
// específicas, tipo entrega, já usavam — fica tudo sincronizado).

import React, { useState } from 'react'
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
import AcaoColetaHIG from '../acoes/AcaoColetaHIG'
import AcaoDiagnosticoHIG from '../acoes/AcaoDiagnosticoHIG'
import AcaoOrcamentoHIG from '../acoes/AcaoOrcamentoHIG'
import AcaoOficinaHIG from '../acoes/AcaoOficinaHIG'
import AcaoTesteHIG from '../acoes/AcaoTesteHIG'
import AcaoEntregaHIG from '../acoes/AcaoEntregaHIG'
import AcaoPagamentoHIG from '../acoes/AcaoPagamentoHIG'

const MAP = {
  // HIG aplicado em TODAS as etapas — cada uma com arquivo dedicado.
  ag_agendamento: AcaoAgendamentoHIG,  // Agenda    (escolher dia/hora)
  agendado: AcaoColetaHIG,             // Coleta    (ir buscar no cliente)
  // Avaliação + Diagnóstico UNIFICADOS (06/07/2026) — uma tela só.
  diagnostico: AcaoDiagnosticoHIG,    // Diagnóstico (testes + componentes)
  recebido: AcaoDiagnosticoHIG,       // alias de segurança (etapa DB aposentada)
  orcamento: AcaoOrcamentoHIG,        // Orçamento (itens + total + aprovação)
  oficina: AcaoOficinaHIG,            // Conserto  (Higienização + Manutenção)
  teste_final: AcaoTesteHIG,          // Teste final (4 testes + acabamento)
  entrega: AcaoEntregaHIG,            // Entrega   (agendar + confirmar entrega)
  pagamento: AcaoPagamentoHIG,        // A receber (resumo + FormRecebimento)
  concluido: AcaoConcluido,
  recusado: AcaoRecusada,
  // Aliases / variantes que aparecem em Fabricação e Venda
  agendamento: AcaoAgendamentoHIG,
  entregue: AcaoEntregaHIG,
}

// Painel "Observações internas" — sempre visível no topo de toda etapa,
// editável direto ali (não precisa caçar o campo de observação escondido
// dentro de cada Acao*HIG). Escreve em os.observacoes — mesmo campo que
// os textareas de observação de etapas específicas (ex: entrega) já usavam,
// então tudo fica sincronizado num campo só.
function ObservacoesInternas({ T, dark, os, onUpdateOS }) {
  const [editando, setEditando] = useState(false)
  const [valor, setValor] = useState(os?.observacoes || '')
  const [salvando, setSalvando] = useState(false)
  const obs = (os?.observacoes || '').trim()

  function abrir() { setValor(os?.observacoes || ''); setEditando(true) }
  async function salvar() {
    setSalvando(true)
    await onUpdateOS?.(os.numero, { observacoes: valor.trim() })
    setSalvando(false)
    setEditando(false)
  }

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
      marginBottom: 8,
    }}>
      <div style={{
        padding: '3px 6px 3px 8px',
        background: obs ? (dark ? 'rgba(255,217,102,0.10)' : '#FFF7DC') : (dark ? 'rgba(255,255,255,0.02)' : '#FAFBFC'),
        borderBottom: editando || obs ? `1px solid ${T.border}` : 'none',
        display: 'flex', alignItems: 'center', gap: 7,
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          background: obs ? (dark ? 'rgba(255,217,102,0.18)' : PALETA.yellowBg) : (dark ? 'rgba(255,255,255,0.06)' : '#EDEFF2'),
          color: obs ? PALETA.yellowStrong : T.textMuted,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TI name={obs ? 'alert-circle' : 'note'} size={11} />
        </span>
        <span style={{
          flex: 1, fontSize: 11, fontWeight: 700, color: T.textPrimary,
          textTransform: 'uppercase', letterSpacing: '.04em',
        }}>Observações internas</span>
        {!editando && (
          <button
            onClick={abrir}
            style={{
              background: 'transparent', border: 'none', color: T.textMuted,
              cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '2px 6px',
              display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
            <TI name={obs ? 'pencil' : 'plus'} size={11} />
            {obs ? 'Editar' : 'Adicionar'}
          </button>
        )}
      </div>
      {editando ? (
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="Ex: cliente pediu pra ligar antes de ir, levar a capa na entrega…"
            rows={3}
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 10px', borderRadius: 6,
              border: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
              color: T.textPrimary, fontSize: 13, fontFamily: 'inherit',
              outline: 'none', resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setEditando(false)}
              style={{
                flex: 1, padding: '7px', borderRadius: 6, border: `1px solid ${T.border}`,
                background: 'transparent', color: T.textSecondary, fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 500,
              }}>
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              style={{
                flex: 1, padding: '7px', borderRadius: 6, border: 'none',
                background: PALETA.yellowStrong, color: '#1a1500', fontSize: 12, fontWeight: 700,
                cursor: salvando ? 'default' : 'pointer', opacity: salvando ? 0.6 : 1,
                fontFamily: 'inherit',
              }}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : obs ? (
        <div style={{
          padding: 10,
          fontSize: 13, color: T.textPrimary, lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
        }}>{obs}</div>
      ) : null}
    </div>
  )
}

export default function EtapaTab(props) {
  const Componente = MAP[props.os.etapa]

  return (
    <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ObservacoesInternas T={props.T} dark={props.dark} os={props.os} onUpdateOS={props.onUpdateOS} />
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
