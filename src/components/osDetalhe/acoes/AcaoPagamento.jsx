// src/components/osDetalhe/acoes/AcaoPagamento.jsx
// Etapa Pagamento — fluxo completo de recebimento INLINE (não redireciona mais).
//
// Contexto (Instruções do Projeto.md):
// - OS na etapa Pagamento = entregue mas ainda não recebida (ou parcial / aguardando link D+1)
// - Link de pagamento sempre InfinitePay D+1 (Ton Black inviável: link de 30 dias)
// - Pagamento parcial mantém OS na etapa; total → pula direto pra Concluído
// - 3 estados: não pago · parcial · total
//
// A aba "Pagamento" no topo do modal continua igual e sempre disponível —
// o cliente pode pagar em qualquer etapa. Aqui é só a AÇÃO no momento certo
// do fluxo (depois da entrega).

import React, { useState, useEffect } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import { OS_ITENS_MOCK } from '../../../_mocks/os'
import { fmtBRL } from '../../../utils/fmt'
import { useToast } from '../../ui'
import BlocoAcao from './BlocoAcao'

// Formas de pagamento + taxa (InfinitePay).
// Misto e Parcelado entram no Módulo 03 (parcelamento gera ID único + parcelas).
const FORMAS = [
  { id: 'pix',        label: 'PIX',          taxa: 0,    icon: 'ti-brand-pinterest' },
  { id: 'debito',     label: 'Débito',       taxa: 1.37, icon: 'ti-credit-card' },
  { id: 'credito1x',  label: 'Cartão 1x',    taxa: 3.15, icon: 'ti-credit-card' },
  { id: 'credito12x', label: 'Cartão 12x',   taxa: 12.4, icon: 'ti-credit-card' },
  { id: 'link',       label: 'Link D+1',     taxa: 4.2,  icon: 'ti-link' },
  { id: 'misto',      label: 'Misto',        taxa: null, icon: 'ti-arrows-shuffle', disabled: true },
  { id: 'parcelado',  label: 'Parcelado',    taxa: null, icon: 'ti-calendar-event', disabled: true },
]
function formaLabel(id) {
  return FORMAS.find(f => f.id === id)?.label || id
}

export default function AcaoPagamento({ T, dark, os, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const azul = corEtapa('blue', dark)
  const notify = useToast()

  // ─── Cálculos a partir do estado atual da OS
  const itens = OS_ITENS_MOCK[os.numero] || []
  const subtotal = itens.reduce((s, i) => s + i.valor * i.qtd, 0)
  const total = Math.max(0, subtotal - (os.desconto || 0))
  const valorPago = os.valor_pago || 0
  const aPagar = Math.max(0, total - valorPago)

  // ─── Form local: valor deste recebimento + forma
  const [valor, setValor] = useState(aPagar)
  const [forma, setForma] = useState('pix')

  // Reset do valor se o "a receber" mudar (ex: depois de salvar e voltar)
  useEffect(() => { setValor(aPagar) }, [aPagar])

  const formaCfg = FORMAS.find(f => f.id === forma)
  const liquido = formaCfg?.taxa != null && formaCfg.taxa > 0
    ? valor - (valor * formaCfg.taxa / 100)
    : valor

  const quitaTotal = valor >= aPagar - 0.01 && aPagar > 0

  function confirmar() {
    if (valor <= 0 || valor > aPagar + 0.01) return
    if (formaCfg?.disabled) return
    const novoValorPago = valorPago + valor
    const pagoAgora = novoValorPago >= total - 0.01
    onUpdateOS(os.numero, {
      valor: total,
      valor_pago: novoValorPago,
      pago: pagoAgora ? 'total' : 'parcial',
      forma_pagamento: forma,
    })
    if (pagoAgora) {
      const concluido = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'concluido')
      if (concluido) onMoverOS(os.numero, concluido.id)
    }
  }

  function enviarLinkD1() {
    // Placeholder — Módulo 03 plugará a API real do InfinitePay.
    notify('info', `Link InfinitePay D+1 gerado pra ${fmtBRL(valor, { fr: true })} (mock) — envie pelo WhatsApp`)
  }

  // ─── Caso 1: OS já quitada — só mostra o resumo + dica pra avançar
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

  return (
    <BlocoAcao
      T={T} dark={dark}
      icon="ti-cash-banknote"
      etapa="Pagamento"
      descricao={valorPago > 0
        ? 'Receba o saldo restante ou envie o link de cobrança pro cliente.'
        : 'Receba o pagamento ou envie o link InfinitePay D+1 pro cliente.'}
    >
      {/* Resumo financeiro: Total · Já recebido · A receber */}
      <ResumoFinanceiro
        T={T} dark={dark}
        total={total} valorPago={valorPago} aPagar={aPagar}
        formaAnterior={os.forma_pagamento}
      />

      {/* Valor deste recebimento (editável p/ partial) */}
      <div>
        <Label T={T}>Valor deste recebimento</Label>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>R$</span>
          <input
            type="number" min="0" max={aPagar} step="0.01"
            value={valor}
            onChange={(e) => {
              const v = Math.max(0, Math.min(aPagar, Number(e.target.value) || 0))
              setValor(v)
            }}
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 7,
              border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
              fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
              outline: 'none', textAlign: 'right',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>
        {/* Atalhos */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {valor !== aPagar && (
            <ChipAtalho T={T} dark={dark} onClick={() => setValor(aPagar)}>
              receber tudo ({fmtBRL(aPagar, { fr: true })})
            </ChipAtalho>
          )}
          {aPagar > 0 && valor !== aPagar / 2 && (
            <ChipAtalho T={T} dark={dark} onClick={() => setValor(Math.round(aPagar / 2 * 100) / 100)}>
              metade ({fmtBRL(aPagar / 2, { fr: true })})
            </ChipAtalho>
          )}
        </div>
      </div>

      {/* Forma de pagamento — grid 2 colunas */}
      <div>
        <Label T={T}>Forma de pagamento</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {FORMAS.map(f => {
            const ativo = forma === f.id
            return (
              <button
                key={f.id}
                onClick={() => !f.disabled && setForma(f.id)}
                disabled={f.disabled}
                title={f.disabled ? 'Em breve · Módulo 03' : ''}
                style={{
                  padding: '8px 10px', borderRadius: 7,
                  border: `1.5px solid ${ativo ? amarelo : T.border}`,
                  background: ativo ? cor('#2a2000', '#fdf6dc') : 'transparent',
                  cursor: f.disabled ? 'not-allowed' : 'pointer',
                  opacity: f.disabled ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', gap: 7,
                  textAlign: 'left', fontFamily: 'inherit',
                }}>
                <div style={{
                  width: 13, height: 13, borderRadius: '50%',
                  border: `2px solid ${ativo ? amarelo : T.textDim}`,
                  background: ativo ? amarelo : 'transparent',
                  flexShrink: 0,
                }} />
                <i className={`ti ${f.icon}`}
                   style={{ fontSize: 13, color: ativo ? amarelo : T.textMuted }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.label}
                  </div>
                  {f.taxa != null && (
                    <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
                      taxa {f.taxa.toFixed(2).replace('.', ',')}%
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Líquido (se taxa > 0) */}
      {formaCfg?.taxa != null && formaCfg.taxa > 0 && (
        <div style={{
          fontSize: 11, color: T.textMuted, textAlign: 'center',
          padding: '4px 0',
        }}>
          Após taxa de {formaCfg.taxa.toFixed(2).replace('.', ',')}%, você recebe
          ~ <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {fmtBRL(liquido, { fr: true })}
          </strong>
        </div>
      )}

      {/* Botões: Confirmar + Enviar link */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 8 }}>
        <button
          onClick={confirmar}
          disabled={valor <= 0 || formaCfg?.disabled}
          style={{
            padding: '12px 14px', borderRadius: 8, border: 'none',
            background: amarelo, color: '#0a0a0d',
            fontSize: 13, fontWeight: 700, cursor: (valor > 0 && !formaCfg?.disabled) ? 'pointer' : 'not-allowed',
            opacity: (valor > 0 && !formaCfg?.disabled) ? 1 : 0.5,
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            lineHeight: 1.25,
          }}>
          <i className="ti ti-check" style={{ fontSize: 16 }} aria-hidden="true" />
          <span>
            Confirmar {fmtBRL(valor, { fr: true })}
            {quitaTotal && ' · concluir'}
          </span>
        </button>
        <button
          onClick={enviarLinkD1}
          disabled={valor <= 0}
          title="Gera link InfinitePay e exibe pra você enviar pelo WhatsApp"
          style={{
            padding: '12px 12px', borderRadius: 8,
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.textSecondary, fontSize: 12, fontWeight: 600,
            cursor: valor > 0 ? 'pointer' : 'not-allowed',
            opacity: valor > 0 ? 1 : 0.5,
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            lineHeight: 1.25,
          }}>
          <i className="ti ti-link" style={{ fontSize: 15 }} aria-hidden="true" />
          Link D+1
        </button>
      </div>

      {/* Aviso InfinitePay vs Ton Black */}
      <div style={{
        background: T.cardAlt, border: `1px solid ${T.border}`,
        borderRadius: 7, padding: '8px 10px',
        fontSize: 10.5, color: T.textMuted,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <i className="ti ti-info-circle" style={{ fontSize: 12, color: amarelo, flexShrink: 0 }} aria-hidden="true" />
        <span>
          Link InfinitePay cai em D+1. Ton Black tem link de 30 dias —
          <strong style={{ color: T.textPrimary }}> nunca usar</strong>.
        </span>
      </div>
    </BlocoAcao>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────────
function ResumoFinanceiro({ T, dark, total, valorPago, aPagar, formaAnterior }) {
  const cor = (d, c) => dark ? d : c
  const verde = corEtapa('green', dark)
  const azul = corEtapa('blue', dark)
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
          label={`Já recebido${formaAnterior ? ` via ${formaLabel(formaAnterior)}` : ''}`}
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

function Label({ T, children }) {
  return (
    <label style={{
      display: 'block', fontSize: 10.5, color: T.textMuted, fontWeight: 700,
      marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px',
    }}>{children}</label>
  )
}

function ChipAtalho({ T, dark, onClick, children }) {
  const cor = (d, c) => dark ? d : c
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 9px', borderRadius: 12,
        border: `1px solid ${T.border}`, background: 'transparent',
        color: cor(P.blue, P.blueDark),
        fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit',
      }}>{children}</button>
  )
}
