// src/components/osDetalhe/FormRecebimento.jsx
// Form de recebimento reutilizável — usado pela aba Pagamento e pela
// AcaoPagamento (etapa Pagamento). Encapsula:
//   - Input de valor (com atalho "receber tudo")
//   - Forma de pagamento: PIX · Cartão · Dinheiro · A prazo (4 top-level)
//     • Cartão expande sub-leque: Débito · Crédito 1x-12x · Link 1x-12x
//   - Cálculo de líquido após taxa
//   - Atalhos rápidos: "Gerar PIX" e "Gerar link"
//   - Dialog inline pra valor < saldo: parcial ou quitar com desconto
//
// Taxas via tabela InfinitePay Maxi 1 (Instruções do Projeto §Maquininha).

import React, { useState, useEffect } from 'react'
import { P } from '../../theme'
import { corEtapa } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { useToast } from '../ui'

// Taxas reais da maquininha InfinitePay por BANDEIRA (1x a 21x no crédito).
// Mastercard e Visa usam a mesma tabela; Elo é mais cara. Conferido em
// "Minhas taxas e prazos" do app InfinitePay (10/06/2026).
const TAXAS_BANDEIRA = {
  master: {
    debito: 1.36,
    credito: {
      1: 3.14, 2: 5.38, 3: 6.11, 4: 6.84, 5: 7.56, 6: 8.27, 7: 8.98,
      8: 9.68, 9: 10.37, 10: 11.05, 11: 11.73, 12: 12.39, 13: 15.39,
      14: 16.01, 15: 16.65, 16: 17.31, 17: 18.00, 18: 18.72, 19: 19.36,
      20: 20.00, 21: 20.64,
    },
  },
  elo: {
    debito: 2.57,
    credito: {
      1: 4.90, 2: 6.46, 3: 7.19, 4: 7.91, 5: 8.62, 6: 9.32, 7: 10.02,
      8: 10.71, 9: 11.40, 10: 12.07, 11: 12.74, 12: 13.40, 13: 16.40,
      14: 17.06, 15: 17.74, 16: 18.45, 17: 19.19, 18: 19.95, 19: 20.59,
      20: 21.23, 21: 21.87,
    },
  },
}
TAXAS_BANDEIRA.visa = TAXAS_BANDEIRA.master // Visa = mesma tabela da Mastercard

const MAX_PARCELAS = 21

const BANDEIRAS = [
  { id: 'master', label: 'Mastercard' },
  { id: 'visa',   label: 'Visa' },
  { id: 'elo',    label: 'Elo' },
]

// Link InfinitePay = taxa do crédito + 0,90%.
const LINK_ACRESCIMO = 0.90

function taxaDebito(bandeira) {
  return (TAXAS_BANDEIRA[bandeira] || TAXAS_BANDEIRA.master).debito
}
function taxaCredito(bandeira, parcelas) {
  return (TAXAS_BANDEIRA[bandeira] || TAXAS_BANDEIRA.master).credito[parcelas] || 0
}
function taxaSub(subId, bandeira, parcelas) {
  if (subId === 'debito')  return taxaDebito(bandeira)
  if (subId === 'credito') return taxaCredito(bandeira, parcelas)
  if (subId === 'link')    return taxaCredito(bandeira, parcelas) + LINK_ACRESCIMO
  return 0
}

const SUB_CARTAO = [
  { id: 'debito',  label: 'Débito',           icon: 'ti-credit-card' },
  { id: 'credito', label: 'Crédito',          parcelado: true, icon: 'ti-credit-card', desc: '1x a 21x' },
  { id: 'link',    label: 'Link InfinitePay', parcelado: true, icon: 'ti-link',        desc: '1x a 21x' },
]

// Converte o ID interno num label legível pro display em outras telas.
export function formaIdToLabel(id) {
  if (!id) return ''
  if (id === 'pix') return 'PIX'
  if (id === 'dinheiro') return 'Dinheiro'
  if (id === 'debito') return 'Débito'
  if (id === 'aprazo') return 'A prazo'
  // Novos IDs: credito_Nx, link_Nx
  let m = id.match?.(/^credito_(\d+)x$/)
  if (m) return `Crédito ${m[1]}x`
  m = id.match?.(/^link_(\d+)x$/)
  if (m) return `Link ${m[1]}x`
  // Legacy: credito1x, parcelado_Nx, link
  if (id === 'credito1x') return 'Crédito 1x'
  if (id === 'link') return 'Link'
  m = id.match?.(/^parcelado_(\d+)x$/)
  if (m) return `Crédito ${m[1]}x`
  return id
}

export default function FormRecebimento({
  T, dark,
  saldo,                 // valor máximo a receber
  onConfirmar,           // ({ valor, forma, modo }) — modo: 'total'|'parcial'|'desconto'
  onEnviarLink,          // (valor) — opcional, atalho gerar link InfinitePay
  onGerarPix,            // (valor) — opcional, atalho gerar QR PIX
  showAtalhos = true,    // mostra botões "PIX" e "Link" ao lado de confirmar
}) {
  const cor = (d, c) => dark ? d : c
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  const notify = useToast()

  const [valor, setValor] = useState(saldo)
  const [dataPagamento, setDataPagamento] = useState(dataMaisDiasISO(0)) // hoje, editável
  const [forma, setForma] = useState('pix')          // 'pix' | 'cartao' | 'dinheiro' | 'aprazo'
  const [subCartao, setSubCartao] = useState(null)   // null antes de escolher
  const [bandeira, setBandeira] = useState('master') // 'master' | 'visa' | 'elo'
  const [parcelas, setParcelas] = useState(1)        // 1x a 21x (crédito e link)
  const [parcelasAPrazo, setParcelasAPrazo] = useState([])  // [{ data, valor }]
  const [partialDialog, setPartialDialog] = useState(false)

  // Re-sincroniza valor quando saldo mudar (ex: depois de uma baixa parcial)
  useEffect(() => { setValor(saldo) }, [saldo])

  // Quando troca pra "Cartão", pré-seleciona Débito
  useEffect(() => {
    if (forma === 'cartao' && !subCartao) setSubCartao('debito')
  }, [forma, subCartao])

  // Quando troca pra "A prazo" pela primeira vez, cria 1 parcela default (+30d com o valor total)
  useEffect(() => {
    if (forma === 'aprazo' && parcelasAPrazo.length === 0) {
      setParcelasAPrazo([{ data: dataMaisDiasISO(30), valor: valor || saldo }])
    }
  }, [forma, parcelasAPrazo.length, valor, saldo])

  // ─── Cálculos
  function formaIdFinal() {
    if (forma === 'pix') return 'pix'
    if (forma === 'dinheiro') return 'dinheiro'
    if (forma === 'aprazo') return `aprazo_${parcelasAPrazo.length}x`
    const sub = SUB_CARTAO.find(s => s.id === subCartao)
    if (!sub) return 'debito'
    if (sub.parcelado) return `${sub.id}_${parcelas}x`
    return sub.id
  }
  function taxaAtual() {
    if (forma === 'pix' || forma === 'dinheiro' || forma === 'aprazo') return 0
    if (!subCartao) return 0
    return taxaSub(subCartao, bandeira, parcelas)
  }

  // Total das parcelas a prazo (precisa bater com o valor de recebimento)
  const totalParcelasAPrazo = parcelasAPrazo.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const parcelasAPrazoOk = forma !== 'aprazo' || (
    parcelasAPrazo.length > 0 &&
    parcelasAPrazo.every(p => p.data && Number(p.valor) > 0) &&
    Math.abs(totalParcelasAPrazo - valor) < 0.01
  )
  const taxa = taxaAtual()
  const liquido = taxa > 0 ? valor - (valor * taxa / 100) : valor
  const isParcial = valor < saldo - 0.01
  const isExcedente = valor > saldo + 0.01
  const formaOk = (
    forma === 'pix' || forma === 'dinheiro' ||
    (forma === 'aprazo' && parcelasAPrazoOk) ||
    (forma === 'cartao' && !!subCartao)
  )
  const valorOk = valor > 0 && !isExcedente

  // ─── CRUD das parcelas a prazo
  function addParcelaAPrazo() {
    setParcelasAPrazo(prev => {
      const totalAnterior = prev.reduce((s, p) => s + (Number(p.valor) || 0), 0)
      const restante = Math.max(0, valor - totalAnterior)
      const ultimaData = prev.length > 0 ? prev[prev.length - 1].data : dataMaisDiasISO(0)
      return [...prev, { data: addDiasISO(ultimaData, 30), valor: restante }]
    })
  }
  function updateParcelaAPrazo(i, field, v) {
    setParcelasAPrazo(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: v } : p))
  }
  function removeParcelaAPrazo(i) {
    setParcelasAPrazo(prev => prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i))
  }

  // ─── Ações
  function clickConfirmar() {
    if (!formaOk || !valorOk) return
    // A prazo: confirma direto com parcelas no payload, sem dialog parcial
    if (forma === 'aprazo') {
      onConfirmar({
        valor, forma: formaIdFinal(), modo: 'total',
        taxa_pct: taxa, data_pagamento: dataPagamento,
        parcelas: parcelasAPrazo.map(p => ({ ...p, valor: Number(p.valor) || 0 })),
      })
      return
    }
    if (isParcial) {
      setPartialDialog(true)
    } else {
      onConfirmar({ valor, forma: formaIdFinal(), modo: 'total', taxa_pct: taxa, data_pagamento: dataPagamento })
    }
  }

  function confirmarParcial() {
    onConfirmar({ valor, forma: formaIdFinal(), modo: 'parcial', taxa_pct: taxa, data_pagamento: dataPagamento })
    setPartialDialog(false)
  }

  function confirmarComDesconto() {
    onConfirmar({ valor, forma: formaIdFinal(), modo: 'desconto', taxa_pct: taxa, data_pagamento: dataPagamento })
    setPartialDialog(false)
  }

  function clickEnviarLink() {
    if (!valorOk) return
    onEnviarLink?.(valor)
    notify('info', `Link InfinitePay pra ${fmtBRL(valor, { fr: true })} (mock) — envie pelo WhatsApp`)
  }

  function clickGerarPix() {
    if (!valorOk) return
    onGerarPix?.(valor)
    notify('info', `QR Code PIX pra ${fmtBRL(valor, { fr: true })} (mock) — mostre ao cliente`)
  }

  // ─── Render
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Bloco unificado: label "Valor Recebido" centralizado em cima dos 2
          primeiros botoes (PIX/Cartao); input ocupando os 2 ultimos
          (Dinheiro/A prazo). Tudo alinhado num grid de 4 colunas. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Linha 1: label + input (2 cols cada) */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
          alignItems: 'center',
        }}>
          <div style={{
            gridColumn: '1 / span 2',
            textAlign: 'center',
            fontSize: 11, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px',
          }}>
            Valor Recebido
          </div>
          <div style={{
            gridColumn: '3 / span 2',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', borderRadius: 7,
            border: `1px solid ${T.border}`, background: T.bg,
            minHeight: 38,
          }}>
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>R$</span>
            <input
              type="number" min="0" max={saldo} step="0.01"
              value={valor}
              onChange={(e) => {
                const v = Math.max(0, Math.min(saldo, Number(e.target.value) || 0))
                setValor(v)
              }}
              style={{
                flex: 1, minWidth: 0,
                padding: 0, border: 'none', outline: 'none',
                background: 'transparent', color: T.textPrimary,
                fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                textAlign: 'right', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* Linha 2: 4 botoes de forma — PIX · Cartao · Dinheiro · A prazo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          <FormaTopBtn
            T={T} dark={dark}
            ativo={forma === 'pix'}
            onClick={() => setForma('pix')}
            icon="ti-brand-pinterest"
            label="PIX"
            sublabel="0%"
          />
          <FormaTopBtn
            T={T} dark={dark}
            ativo={forma === 'cartao'}
            onClick={() => setForma('cartao')}
            icon="ti-credit-card"
            label="Cartão"
            sublabel="déb·créd·link"
          />
          <FormaTopBtn
            T={T} dark={dark}
            ativo={forma === 'dinheiro'}
            onClick={() => setForma('dinheiro')}
            icon="ti-coins"
            label="Dinheiro"
            sublabel="0%"
          />
          <FormaTopBtn
            T={T} dark={dark}
            ativo={forma === 'aprazo'}
            onClick={() => setForma('aprazo')}
            icon="ti-clock"
            label="A prazo"
            sublabel="fiado"
          />
        </div>

        {/* Chip "receber tudo" — só aparece se valor != saldo */}
        {valor !== saldo && saldo > 0 && (
          <div style={{ marginTop: 2 }}>
            <Chip T={T} dark={dark} onClick={() => setValor(saldo)}>
              receber tudo ({fmtBRL(saldo, { fr: true })})
            </Chip>
          </div>
        )}
      </div>

      {/* Data do pagamento — pré-preenchida com hoje (à vista; a prazo usa as datas das parcelas) */}
      {forma !== 'aprazo' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          border: `1px solid ${T.border}`, background: T.bg,
        }}>
          <i className="ti ti-calendar-event" style={{ fontSize: 15, color: azul, flexShrink: 0 }} aria-hidden="true" />
          <span style={{
            fontSize: 11, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px', flex: 1,
          }}>Data do pagamento</span>
          <input
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value || dataMaisDiasISO(0))}
            style={{
              padding: '6px 8px', borderRadius: 6,
              border: `1px solid ${T.border}`, background: T.card || T.bg, color: T.textPrimary,
              fontSize: 12.5, fontWeight: 600, outline: 'none', fontFamily: 'inherit',
              colorScheme: dark ? 'dark' : 'light', fontVariantNumeric: 'tabular-nums',
            }}
          />
        </div>
      )}

      {/* Sub-leque do Cartão */}
      {forma === 'cartao' && (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          background: cor('#0d2035', '#e6f1fb'),
          border: `1px solid ${azul}44`,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {/* Bandeira — define a tabela de taxas (Mastercard/Visa x Elo) */}
          <div style={{
            fontSize: 10, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px',
            marginBottom: 4,
          }}>Bandeira</div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
            marginBottom: 8,
          }}>
            {BANDEIRAS.map(b => (
              <BandeiraBtn
                key={b.id}
                T={T} dark={dark}
                ativo={bandeira === b.id}
                onClick={() => setBandeira(b.id)}
                label={b.label}
              />
            ))}
          </div>

          <div style={{
            fontSize: 10, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px',
            marginBottom: 4,
          }}>Tipo de cartão</div>
          {SUB_CARTAO.map(s => (
            <SubCartaoBtn
              key={s.id}
              T={T} dark={dark} sub={s}
              ativo={subCartao === s.id}
              onClick={() => setSubCartao(s.id)}
              parcelas={parcelas}
              setParcelas={setParcelas}
              taxaAtual={taxaSub(s.id, bandeira, parcelas)}
            />
          ))}
        </div>
      )}

      {/* Calendário de parcelas a prazo (só visível quando forma === 'aprazo') */}
      {forma === 'aprazo' && (
        <ParcelasAPrazoPanel
          T={T} dark={dark}
          valor={valor}
          parcelas={parcelasAPrazo}
          total={totalParcelasAPrazo}
          ok={parcelasAPrazoOk}
          onAdd={addParcelaAPrazo}
          onUpdate={updateParcelaAPrazo}
          onRemove={removeParcelaAPrazo}
        />
      )}

      {/* Líquido (se taxa > 0) */}
      {taxa > 0 && valor > 0 && (
        <div style={{
          fontSize: 11, color: T.textMuted, textAlign: 'center', padding: '2px 0',
        }}>
          Após taxa de {taxa.toFixed(2).replace('.', ',')}%, você recebe
          ~ <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {fmtBRL(liquido, { fr: true })}
          </strong>
        </div>
      )}

      {/* Dialog inline pra valor parcial OU botões de confirmar */}
      {partialDialog ? (
        <PartialDialog
          T={T} dark={dark} cor={cor}
          valor={valor} saldo={saldo}
          onParcial={confirmarParcial}
          onDesconto={confirmarComDesconto}
          onCancelar={() => setPartialDialog(false)}
        />
      ) : (
        // Grid 4-col alinhado com os 4 botoes de forma de pagamento:
        // - Confirmar ocupa cols 1-3 (mesmo width que PIX+Cartao+Dinheiro)
        // - PIX+Link split col 4 (mesma largura que "A prazo")
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
          alignItems: 'stretch',
        }}>
          <button
            onClick={clickConfirmar}
            disabled={!formaOk || !valorOk}
            style={{
              gridColumn: showAtalhos ? '1 / span 3' : '1 / -1',
              minWidth: 0,
              padding: '12px 14px', borderRadius: 8, border: 'none',
              background: amarelo, color: '#0a0a0d',
              fontSize: 13, fontWeight: 700,
              cursor: (formaOk && valorOk) ? 'pointer' : 'not-allowed',
              opacity: (formaOk && valorOk) ? 1 : 0.5,
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              lineHeight: 1.25,
            }}>
            <i className="ti ti-check" style={{ fontSize: 16 }} aria-hidden="true" />
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              Confirmar {fmtBRL(valor, { fr: true })}
              {!isParcial && saldo > 0 && ' · concluir'}
            </span>
          </button>

          {showAtalhos && (
            <div style={{
              gridColumn: '4 / span 1',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
            }}>
              <AtalhoBtn
                T={T} valorOk={valorOk}
                icon="ti-qrcode" label="PIX"
                title="Gera QR Code PIX pra mostrar ao cliente"
                onClick={clickGerarPix}
              />
              <AtalhoBtn
                T={T} valorOk={valorOk}
                icon="ti-link" label="Link"
                title="Gera link InfinitePay pra mandar pelo WhatsApp"
                onClick={clickEnviarLink}
              />
            </div>
          )}
        </div>
      )}

    </div>
  )
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function Label({ T, children }) {
  return (
    <label style={{
      display: 'block', fontSize: 10.5, color: T.textMuted, fontWeight: 700,
      marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.4px',
    }}>{children}</label>
  )
}

function Chip({ T, dark, onClick, children }) {
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

// ─── Helpers de data ────────────────────────────────────────────────────────
function dataMaisDiasISO(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  // Fuso LOCAL (não UTC) — senão à noite cai no dia seguinte.
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10) // YYYY-MM-DD
}
function addDiasISO(iso, n) {
  if (!iso) return dataMaisDiasISO(n)
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function fmtDataPtBr(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

// ─── Painel: agenda de parcelas a prazo ────────────────────────────────────
function ParcelasAPrazoPanel({ T, dark, valor, parcelas, total, ok, onAdd, onUpdate, onRemove }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)
  const diff = valor - total

  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: cor('#0d2035', '#e6f1fb'),
      border: `1px solid ${azul}44`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-calendar-event" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
          <span style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px',
          }}>Agenda de parcelas</span>
        </div>
        <span style={{
          fontSize: 10.5, color: T.textMuted,
          fontVariantNumeric: 'tabular-nums',
        }}>{parcelas.length} {parcelas.length === 1 ? 'parcela' : 'parcelas'}</span>
      </div>

      {/* Linhas de parcelas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {parcelas.map((p, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '60px 1fr 110px auto', gap: 6,
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: 10.5, color: T.textMuted, fontWeight: 600,
              textAlign: 'right',
            }}>{i + 1}ª</span>
            <input
              type="date"
              value={p.data || ''}
              onChange={(e) => onUpdate(i, 'data', e.target.value)}
              style={{
                padding: '6px 8px', borderRadius: 5,
                border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                fontSize: 11.5, outline: 'none', fontFamily: 'inherit',
                colorScheme: dark ? 'dark' : 'light',
                minWidth: 0,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600 }}>R$</span>
              <input
                type="number" min="0" step="0.01"
                value={p.valor}
                onChange={(e) => onUpdate(i, 'valor', Number(e.target.value) || 0)}
                style={{
                  flex: 1, padding: '6px 8px', borderRadius: 5,
                  border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
                  fontSize: 11.5, outline: 'none', textAlign: 'right',
                  fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
                  minWidth: 0, boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={() => onRemove(i)}
              disabled={parcelas.length <= 1}
              aria-label="Remover parcela"
              style={{
                padding: '5px 6px', borderRadius: 5,
                border: 'none', background: 'transparent',
                color: parcelas.length <= 1 ? T.textDim : T.textMuted,
                cursor: parcelas.length <= 1 ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}>
              <i className="ti ti-x" style={{ fontSize: 13 }} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {/* Adicionar parcela */}
      <button
        onClick={onAdd}
        style={{
          padding: '6px 10px', borderRadius: 6,
          border: `1px dashed ${azul}66`, background: 'transparent',
          color: azul, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
        <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
        adicionar parcela
      </button>

      {/* Validação: soma deve igualar valor */}
      <div style={{
        fontSize: 11, color: ok ? verde : amarelo,
        fontWeight: 600, textAlign: 'center',
        paddingTop: 4, borderTop: `1px dashed ${T.border}`,
        fontVariantNumeric: 'tabular-nums',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
      }}>
        {ok ? (
          <>
            <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" />
            Total {fmtBRL(total, { fr: true })} — bate com o valor
          </>
        ) : (
          <>
            <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} aria-hidden="true" />
            Total {fmtBRL(total, { fr: true })} — {diff > 0
              ? `falta ${fmtBRL(diff, { fr: true })}`
              : `${fmtBRL(-diff, { fr: true })} a mais`}
          </>
        )}
      </div>
    </div>
  )
}

function AtalhoBtn({ T, valorOk, icon, label, title, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!valorOk}
      title={title}
      style={{
        padding: '8px 4px', borderRadius: 8,
        border: `1px solid ${T.border}`, background: 'transparent',
        color: T.textSecondary, fontSize: 10.5, fontWeight: 600,
        cursor: valorOk ? 'pointer' : 'not-allowed',
        opacity: valorOk ? 1 : 0.5,
        fontFamily: 'inherit', minWidth: 0,
        display: 'inline-flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2,
        lineHeight: 1.1,
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
      {label}
    </button>
  )
}

// Botão de bandeira (Mastercard/Visa/Elo) — chip simples, ativo = azul.
function BandeiraBtn({ T, dark, ativo, onClick, label }) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 6px', borderRadius: 6,
        border: `1.5px solid ${ativo ? azul : T.border}`,
        background: ativo ? cor('#142d4a', '#dbe9f7') : 'transparent',
        color: ativo ? azul : T.textSecondary,
        fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', minWidth: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        WebkitTapHighlightColor: 'transparent',
      }}>
      <i className="ti ti-credit-card" style={{ fontSize: 13 }} aria-hidden="true" />
      {label}
    </button>
  )
}

// Layout VERTICAL compacto (icon + label/sublabel centralizados) — cabe nas
// 4 colunas de qualquer largura mobile, evita overflow. Radio dot no canto.
function FormaTopBtn({ T, dark, ativo, onClick, icon, label, sublabel }) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '8px 4px 6px', borderRadius: 8,
        border: `1.5px solid ${ativo ? azul : T.border}`,
        background: ativo ? cor('#0d2035', '#e6f1fb') : 'transparent',
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 3,
        textAlign: 'center', minWidth: 0,
        minHeight: 64,
      }}>
      {/* Radio no canto sup-esquerdo */}
      <div style={{
        position: 'absolute', top: 5, left: 5,
        width: 10, height: 10, borderRadius: '50%',
        border: `2px solid ${ativo ? azul : T.textDim}`,
        background: ativo ? azul : 'transparent',
      }} />
      <i className={`ti ${icon}`}
         style={{ fontSize: 18, color: ativo ? azul : T.textMuted }} aria-hidden="true" />
      <div style={{
        fontSize: 12, fontWeight: 700, color: T.textPrimary,
        lineHeight: 1.1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}>{label}</div>
      <div style={{
        fontSize: 9.5, color: T.textMuted,
        lineHeight: 1.1,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}>{sublabel}</div>
    </button>
  )
}

function SubCartaoBtn({ T, dark, sub, ativo, onClick, parcelas, setParcelas, taxaAtual }) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  return (
    <div style={{
      padding: '7px 9px', borderRadius: 6,
      border: `1px solid ${ativo ? azul : 'transparent'}`,
      background: ativo ? cor('#142d4a', '#dbe9f7') : 'transparent',
    }}>
      <button
        onClick={onClick}
        style={{
          width: '100%', padding: 0,
          background: 'transparent', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8,
          textAlign: 'left',
        }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          border: `2px solid ${ativo ? azul : T.textDim}`,
          background: ativo ? azul : 'transparent',
          flexShrink: 0,
        }} />
        <i className={`ti ${sub.icon}`}
           style={{ fontSize: 14, color: ativo ? azul : T.textMuted }} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: T.textPrimary,
            display: 'inline-flex', alignItems: 'baseline', gap: 6,
          }}>
            {sub.label}
            {sub.desc && (
              <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 500 }}>· {sub.desc}</span>
            )}
          </div>
        </div>
        {taxaAtual != null && (
          <span style={{
            fontSize: 10.5, color: T.textMuted, fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}>{taxaAtual.toFixed(2).replace('.', ',')}%</span>
        )}
      </button>

      {/* Seletor de parcelas 1x a 12x (visível quando sub parcelado está ativo) */}
      {sub.parcelado && ativo && (
        <div style={{ marginTop: 8, paddingLeft: 24 }}>
          <div style={{
            fontSize: 10, color: T.textMuted, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4,
          }}>Número de parcelas</div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4,
          }}>
            {Array.from({ length: MAX_PARCELAS }, (_, i) => i + 1).map(p => {
              const ativoP = parcelas === p
              return (
                <button
                  key={p}
                  onClick={(e) => { e.stopPropagation(); setParcelas(p) }}
                  style={{
                    padding: '5px 4px', borderRadius: 5,
                    border: `1px solid ${ativoP ? azul : T.border}`,
                    background: ativoP ? azul : 'transparent',
                    color: ativoP ? '#fff' : T.textSecondary,
                    fontSize: 10.5, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums',
                  }}>{p}x</button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function PartialDialog({ T, dark, cor, valor, saldo, onParcial, onDesconto, onCancelar }) {
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const azul = corEtapa('blue', dark)
  const falta = saldo - valor
  return (
    <div style={{
      background: cor('#2a2000', '#fdf6dc'),
      border: `1.5px solid ${amarelo}66`,
      borderRadius: 9, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ fontSize: 12, color: T.textPrimary, lineHeight: 1.45 }}>
        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(valor, { fr: true })}</strong>
        {' '}é menor que o saldo de
        {' '}<strong style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(saldo, { fr: true })}</strong>.
        Como registrar?
      </div>

      <button
        onClick={onParcial}
        style={{
          padding: '10px 12px', borderRadius: 7,
          background: 'transparent', color: T.textPrimary,
          border: `1px solid ${T.border}`,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
        }}>
        <i className="ti ti-circle-half" style={{ fontSize: 16, color: azul }} aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>Dar baixa parcial</div>
          <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2, fontWeight: 500 }}>
            OS continua aberta com <strong style={{ color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(falta, { fr: true })}</strong> a receber
          </div>
        </div>
      </button>

      <button
        onClick={onDesconto}
        style={{
          padding: '10px 12px', borderRadius: 7,
          background: 'transparent', color: T.textPrimary,
          border: `1px solid ${T.border}`,
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
        }}>
        <i className="ti ti-discount-2" style={{ fontSize: 16, color: verde }} aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>Quitar com desconto</div>
          <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2, fontWeight: 500 }}>
            Aplica <strong style={{ color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>−{fmtBRL(falta, { fr: true })}</strong> de desconto e marca como pago total
          </div>
        </div>
      </button>

      <button
        onClick={onCancelar}
        style={{
          padding: '6px 10px', borderRadius: 6,
          background: 'transparent', border: 'none',
          color: T.textMuted, fontSize: 11, fontWeight: 500,
          cursor: 'pointer', fontFamily: 'inherit',
          alignSelf: 'center',
        }}>
        Cancelar
      </button>
    </div>
  )
}
