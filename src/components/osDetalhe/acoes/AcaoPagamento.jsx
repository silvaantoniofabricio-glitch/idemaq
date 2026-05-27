// src/components/osDetalhe/acoes/AcaoPagamento.jsx
// Etapa Pagamento (a receber) — padrao V2 SubBloco.
// Reusa FormRecebimento (mesma UI da aba Pagamento).
//
// Contexto: OS na etapa Pagamento = entregue mas ainda não recebida (ou parcial).
// Aqui SEMPRE move pra Concluído quando o pagamento for total.

import React from 'react'
import { useTheme } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useOSItens } from '../../../hooks/useOSItens'
import { fmtBRL } from '../../../utils/fmt'
import { persistirLancamentosDoPagamento } from '../../../utils/osToFinanceiro'
import { TI, PALETA } from '../../_shared/PrimitivasMobile'
import { HIGSubBloco as _HIGSubBloco } from '../../_shared/HIGPrimitives'
import FormRecebimento, { formaIdToLabel } from '../FormRecebimento'

// ─── SubBloco compacto (mesmo padrao V2 das outras etapas) ────────────────
function SubBloco(props) {
  return <_HIGSubBloco {...props} />;
}
export default function AcaoPagamento({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()

  // Cálculos
  const { itens } = useOSItens(os.id)
  const subtotal = itens.reduce((s, i) => s + (i.valor || 0) * (i.qtd || 0), 0)
  const descontoAtual = os.desconto || 0
  const total = Math.max(0, subtotal - descontoAtual)
  const valorPago = os.valor_pago || 0
  const aPagar = Math.max(0, total - valorPago)
  const quitado = aPagar <= 0

  function handleConfirmar({ valor, forma, modo, taxa_pct, parcelas: parcelasAPrazo }) {
    const novoValorPago = valorPago + valor
    let novoDesconto = descontoAtual
    let novoPago = 'total'
    if (modo === 'parcial') {
      novoPago = 'parcial'
    } else if (modo === 'desconto') {
      novoDesconto = descontoAtual + (aPagar - valor)
    }
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
    persistirLancamentosDoPagamento(os, {
      valor, forma, taxa_pct,
      parcelasAPrazo: parcelasAPrazo || [],
    })
    if (novoPago === 'total') {
      const concluido = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'concluido')
      if (concluido) onMoverOS(os.numero, concluido.id)
    }
  }

  function irParaConcluido() {
    const concluido = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'concluido')
    if (concluido) onMoverOS(os.numero, concluido.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Resumo financeiro — sempre visivel */}
      <SubBloco T={T} dark={dark}
        icon={quitado ? 'circle-check' : 'cash-banknote'}
        label={quitado ? 'Pagamento quitado' : 'A receber'}
        color={quitado ? 'green' : 'blue'}>
        <ResumoFinanceiro
          T={T} dark={dark}
          total={total} valorPago={valorPago} aPagar={aPagar}
          formaAnterior={os.forma_pagamento}
        />
      </SubBloco>

      {/* Form de recebimento OU botao concluir */}
      {quitado ? (
        <button onClick={irParaConcluido}
          style={{
            minHeight: 42, padding: '0 14px', borderRadius: 9, border: 'none',
            background: PALETA.greenStrong, color: '#fff',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            WebkitTapHighlightColor: 'transparent',
          }}>
          <TI name="arrow-right" size={15} />
          Marcar OS como Concluída
        </button>
      ) : (
        <SubBloco T={T} dark={dark} icon="wallet" label="Receber pagamento" color="blue">
          <FormRecebimento
            T={T} dark={dark}
            saldo={aPagar}
            onConfirmar={handleConfirmar}
            onEnviarLink={() => {/* Módulo 03: API InfinitePay */}}
            onGerarPix={() => {/* Módulo 03: QR PIX dinâmico */}}
          />
        </SubBloco>
      )}
    </div>
  )
}

// ─── Resumo financeiro compacto ───────────────────────────────────────────
function ResumoFinanceiro({ T, dark, total, valorPago, aPagar, formaAnterior }) {
  const verde = PALETA.greenStrong
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <LinhaRes T={T} label="Total da OS" valor={fmtBRL(total, { fr: true })} />
      {valorPago > 0 && (
        <LinhaRes
          T={T}
          label={`Já recebido${formaAnterior ? ` via ${formaIdToLabel(formaAnterior)}` : ''}`}
          valor={`− ${fmtBRL(valorPago, { fr: true })}`}
          cor={verde}
        />
      )}
      <div style={{ height: 1, background: T.border, margin: '3px 0' }} />
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <span style={{
          fontSize: 10.5, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.06em',
        }}>{aPagar > 0 ? 'A receber' : 'Saldo'}</span>
        <span style={{
          fontSize: 20, fontWeight: 700,
          color: aPagar > 0 ? T.textPrimary : verde,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-.01em',
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
      <span style={{ fontWeight: 600, color: c || T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </span>
    </div>
  )
}
