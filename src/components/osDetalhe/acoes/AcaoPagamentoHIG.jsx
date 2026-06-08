import React from 'react'
import { useTheme } from '../../../theme'
import { TI } from '../../_shared/PrimitivasMobile'
import { HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR, HIG_FONT, higType, higFilledButton, higInsetCard } from '../../../theme-hig'
import { fmtBRL } from '../../../utils/fmt'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useOSItens } from '../../../hooks/useOSItens'
import { persistirLancamentosDoPagamento } from '../../../utils/osToFinanceiro'
import FormRecebimento, { formaIdToLabel } from '../FormRecebimento'

function HIGSection({ T, dark, title, children, footer, action }) {
  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px` }}>
        <span style={{ flex: 1, ...higType('footnote'), color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
        {action}
      </div>
      <div style={higInsetCard(T, dark)}>{children}</div>
      {footer && <div style={{ ...higType('footnote'), color: T.textMuted, padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px 0` }}>{footer}</div>}
    </section>
  )
}

function Sep({ T, indent = 0 }) {
  return <div style={{ height: 0.5, background: T.border, marginLeft: indent, opacity: 0.7 }} />
}

export default function AcaoPagamentoHIG({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()

  const { itens } = useOSItens(os.id)
  const subtotal = itens.reduce((s, i) => s + (i.valor || 0) * (i.qtd || 0), 0)
  const descontoAtual = os.desconto || 0
  const total = Math.max(0, subtotal - descontoAtual)
  const valorPago = os.valor_pago || 0
  const aPagar = Math.max(0, total - valorPago)
  const quitado = aPagar <= 0
  const formaAnterior = os.forma_pagamento

  function handleConfirmar({ valor, forma, modo, taxa_pct, parcelas: parcelasAPrazo, data_pagamento }) {
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
        .map((p, i) => `${i + 1}ª · ${p.data} · ${fmtBRL(p.valor)}`)
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
      dataPagamento: data_pagamento || null,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg, fontFamily: HIG_FONT, padding: `0 0 ${HIG_SPACE.md}px` }}>

      <HIGSection T={T} dark={dark} title="Pagamento">
        <div style={{ minHeight: HIG_SIZE.listRow, padding: `0 ${HIG_SPACE.md}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ ...higType('body'), color: T.textMuted }}>Total da OS</span>
          <span style={{ ...higType('body'), color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(total)}</span>
        </div>

        {valorPago > 0 && (
          <>
            <Sep T={T} indent={HIG_SPACE.md} />
            <div style={{ minHeight: HIG_SIZE.listRow, padding: `0 ${HIG_SPACE.md}px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ ...higType('body'), color: T.textMuted }}>
                {`Já recebido${formaAnterior ? ' via ' + formaIdToLabel(formaAnterior) : ''}`}
              </span>
              <span style={{ ...higType('body'), color: HIG_COLOR.green, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {`− ${fmtBRL(valorPago)}`}
              </span>
            </div>
          </>
        )}

        <Sep T={T} />

        <div style={{ padding: `${HIG_SPACE.md}px`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ ...higType('footnote'), color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
            A receber
          </span>
          {quitado ? (
            <span style={{ fontSize: 28, fontWeight: 700, color: HIG_COLOR.green, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5, fontFamily: HIG_FONT }}>
              Quitado ✓
            </span>
          ) : (
            <span style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5, fontFamily: HIG_FONT }}>
              {fmtBRL(aPagar)}
            </span>
          )}
        </div>
      </HIGSection>

      {quitado ? (
        <HIGSection T={T} dark={dark} title="Status">
          <div style={{ padding: HIG_SPACE.sm }}>
            <button
              type="button"
              onClick={irParaConcluido}
              style={{ ...higFilledButton(T, dark), background: HIG_COLOR.green, width: '100%' }}
            >
              <TI name="circle-check" size={18} color="#fff" />
              Marcar OS como Concluída
            </button>
          </div>
        </HIGSection>
      ) : (
        <HIGSection T={T} dark={dark} title="Receber pagamento">
          <div style={{ padding: HIG_SPACE.sm }}>
            <FormRecebimento
              T={T}
              dark={dark}
              saldo={aPagar}
              onConfirmar={handleConfirmar}
              onEnviarLink={() => {}}
              onGerarPix={() => {}}
            />
          </div>
        </HIGSection>
      )}

    </div>
  )
}
