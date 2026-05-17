// src/components/osDetalhe/acoes/AcaoPagamento.jsx
// Etapa Pagamento — ação "FAZER AGORA" com form de recebimento inline.
// Reusa FormRecebimento (mesma UI da aba Pagamento).
//
// Contexto: OS na etapa Pagamento = entregue mas ainda não recebida (ou parcial).
// Aqui SEMPRE move pra Concluído quando o pagamento for total (estamos na etapa
// Pagamento, então quitar fecha o fluxo).

import React from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import { OS_ITENS_MOCK } from '../../../_mocks/os'
import { fmtBRL } from '../../../utils/fmt'
import BlocoAcao from './BlocoAcao'
import FormRecebimento, { formaIdToLabel } from '../FormRecebimento'

export default function AcaoPagamento({ T, dark, os, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const verde = corEtapa('green', dark)

  // Cálculos
  const itens = OS_ITENS_MOCK[os.numero] || []
  const subtotal = itens.reduce((s, i) => s + i.valor * i.qtd, 0)
  const descontoAtual = os.desconto || 0
  const total = Math.max(0, subtotal - descontoAtual)
  const valorPago = os.valor_pago || 0
  const aPagar = Math.max(0, total - valorPago)

  function handleConfirmar({ valor, forma, modo, parcelas: parcelasAPrazo }) {
    const novoValorPago = valorPago + valor
    let novoDesconto = descontoAtual
    let novoPago = 'total'
    if (modo === 'parcial') {
      novoPago = 'parcial'
    } else if (modo === 'desconto') {
      novoDesconto = descontoAtual + (aPagar - valor)
    }
    // Anexa parcelas a prazo nas observações
    let novasObs = os.observacoes
    if (parcelasAPrazo && parcelasAPrazo.length > 0) {
      const txt = parcelasAPrazo
        .map((p, i) => `${i + 1}ª · ${p.data} · ${fmtBRL(p.valor, { fr: true })}`)
        .join('\n')
      novasObs = [
        os.observacoes,
        `— A prazo (${parcelasAPrazo.length} ${parcelasAPrazo.length === 1 ? 'parcela' : 'parcelas'}) —\n${txt}`,
      ].filter(Boolean).join('\n\n')
    }
    onUpdateOS(os.numero, {
      valor: subtotal,
      desconto: novoDesconto,
      valor_pago: novoValorPago,
      pago: novoPago,
      forma_pagamento: forma,
      ...(novasObs !== os.observacoes ? { observacoes: novasObs } : {}),
    })
    // Estamos na etapa Pagamento, então quitar fecha pra Concluído
    if (novoPago === 'total') {
      const concluido = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'concluido')
      if (concluido) onMoverOS(os.numero, concluido.id)
    }
  }

  // ─── Caso 1: OS já quitada — atalho pra Concluído
  if (aPagar <= 0) {
    return (
      <BlocoAcao
        T={T} dark={dark}
        icon="ti-circle-check"
        etapa="Pagamento quitado"
        descricao="Recebimento completo. Avance pra Concluído pelo footer ou pelo botão abaixo."
        tom="verde"
      >
        <ResumoFinanceiro
          T={T} dark={dark}
          total={total} valorPago={valorPago} aPagar={0}
          formaAnterior={os.forma_pagamento}
        />
        <button
          onClick={() => {
            const concluido = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'concluido')
            if (concluido) onMoverOS(os.numero, concluido.id)
          }}
          style={{
            padding: '11px 16px', borderRadius: 8, border: 'none',
            background: verde, color: '#fff',
            fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <i className="ti ti-arrow-right" style={{ fontSize: 16 }} aria-hidden="true" />
          Marcar OS como Concluída
        </button>
      </BlocoAcao>
    )
  }

  // ─── Caso 2: tem saldo — resumo + FormRecebimento
  return (
    <BlocoAcao
      T={T} dark={dark}
      icon="ti-cash-banknote"
      etapa="Pagamento"
      descricao={valorPago > 0
        ? 'Receba o saldo restante ou envie o link de cobrança pro cliente.'
        : 'Receba o pagamento ou envie o link InfinitePay D+1 pro cliente.'}
    >
      <ResumoFinanceiro
        T={T} dark={dark}
        total={total} valorPago={valorPago} aPagar={aPagar}
        formaAnterior={os.forma_pagamento}
      />
      <FormRecebimento
        T={T} dark={dark}
        saldo={aPagar}
        onConfirmar={handleConfirmar}
        onEnviarLink={() => {/* Módulo 03: API InfinitePay */}}
        onGerarPix={() => {/* Módulo 03: QR PIX dinâmico */}}
      />
    </BlocoAcao>
  )
}

// ─── Sub-componente: resumo financeiro (total / pago / a receber) ──────────
function ResumoFinanceiro({ T, dark, total, valorPago, aPagar, formaAnterior }) {
  const verde = corEtapa('green', dark)
  return (
    <div style={{
      background: T.cardAlt, border: `1px solid ${T.border}`,
      borderRadius: 8, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <LinhaRes T={T} label="Total da OS" valor={fmtBRL(total, { fr: true })} />
      {valorPago > 0 && (
        <LinhaRes
          T={T}
          label={`Já recebido${formaAnterior ? ` via ${formaIdToLabel(formaAnterior)}` : ''}`}
          valor={`− ${fmtBRL(valorPago, { fr: true })}`}
          cor={verde}
        />
      )}
      <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span style={{
          fontSize: 11, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.3px',
        }}>{aPagar > 0 ? 'A receber' : 'Saldo'}</span>
        <span style={{
          fontSize: 20, fontWeight: 700,
          color: aPagar > 0 ? T.textPrimary : verde,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {aPagar > 0 ? fmtBRL(aPagar, { fr: true }) : '✓ quitado'}
        </span>
      </div>
    </div>
  )
}

function LinhaRes({ T, label, valor, cor: c }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      fontSize: 12, color: T.textMuted,
    }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600, color: c || T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </span>
    </div>
  )
}
