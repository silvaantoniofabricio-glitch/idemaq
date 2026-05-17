// src/components/osDetalhe/FormRecebimento.jsx
// Form de recebimento reutilizável — usado pela aba Pagamento e pela
// AcaoPagamento (etapa Pagamento). Encapsula:
//   - Input de valor (com chips de atalho)
//   - Forma de pagamento: PIX | Cartão (com sub-leque)
//     • Débito · Crédito 1x · Parcelado 2x-12x · Link D+1 · A prazo
//   - Cálculo de líquido após taxa
//   - Atalho "Enviar link InfinitePay D+1"
//   - Dialog inline pra valor < saldo: parcial ou quitar com desconto
//
// Taxas via tabela InfinitePay Maxi 1 (Instruções do Projeto §Maquininha).

import React, { useState, useEffect } from 'react'
import { P } from '../../theme'
import { corEtapa } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { useToast } from '../ui'

// Taxas InfinitePay Maxi 1 (1x a 12x). Aplicáveis ao Crédito.
const TAXA_CREDITO = {
  1: 3.15, 2: 4.46, 3: 4.99, 4: 5.52, 5: 6.05, 6: 6.58,
  7: 7.11, 8: 7.64, 9: 8.17, 10: 8.70, 11: 9.23, 12: 9.76,
}
// Link InfinitePay = taxa do crédito + 0,90% (ex: 12x maquininha 9,76% → link 10,66%)
const LINK_ACRESCIMO = 0.90
const taxaLink = (p) => (TAXA_CREDITO[p] || 0) + LINK_ACRESCIMO

const SUB_CARTAO = [
  { id: 'debito',  label: 'Débito',           fixed: 1.37,  icon: 'ti-credit-card' },
  { id: 'credito', label: 'Crédito',          parcelado: true, getTaxa: (p) => TAXA_CREDITO[p] || 0, icon: 'ti-credit-card', desc: '1x a 12x' },
  { id: 'link',    label: 'Link InfinitePay', parcelado: true, getTaxa: taxaLink, icon: 'ti-link', desc: '1x a 12x' },
  { id: 'aprazo',  label: 'A prazo',          fixed: 0,     icon: 'ti-clock', desc: 'fiado' },
]

// Converte o ID interno num label legível pro display em outras telas.
export function formaIdToLabel(id) {
  if (!id) return ''
  if (id === 'pix') return 'PIX'
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
  onEnviarLink,          // (valor) — opcional, atalho link D+1
  showLinkD1 = true,     // mostra botão "Link D+1" ao lado de confirmar
  showAviso = true,      // mostra aviso InfinitePay vs Ton Black
}) {
  const cor = (d, c) => dark ? d : c
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  const notify = useToast()

  const [valor, setValor] = useState(saldo)
  const [forma, setForma] = useState('pix')          // 'pix' | 'cartao'
  const [subCartao, setSubCartao] = useState(null)   // null antes de escolher
  const [parcelas, setParcelas] = useState(1)        // 1x a 12x (crédito e link)
  const [partialDialog, setPartialDialog] = useState(false)

  // Re-sincroniza valor quando saldo mudar (ex: depois de uma baixa parcial)
  useEffect(() => { setValor(saldo) }, [saldo])

  // Quando troca pra "Cartão", pré-seleciona Débito
  useEffect(() => {
    if (forma === 'cartao' && !subCartao) setSubCartao('debito')
  }, [forma, subCartao])

  // ─── Cálculos
  function formaIdFinal() {
    if (forma === 'pix') return 'pix'
    const sub = SUB_CARTAO.find(s => s.id === subCartao)
    if (!sub) return 'debito'
    if (sub.parcelado) return `${sub.id}_${parcelas}x`
    return sub.id
  }
  function taxaAtual() {
    if (forma === 'pix') return 0
    const sub = SUB_CARTAO.find(s => s.id === subCartao)
    if (!sub) return 0
    if (sub.fixed != null) return sub.fixed
    if (sub.getTaxa) return sub.getTaxa(parcelas)
    return 0
  }
  const taxa = taxaAtual()
  const liquido = taxa > 0 ? valor - (valor * taxa / 100) : valor
  const isParcial = valor < saldo - 0.01
  const isExcedente = valor > saldo + 0.01
  const formaOk = forma === 'pix' || (forma === 'cartao' && !!subCartao)
  const valorOk = valor > 0 && !isExcedente

  // ─── Ações
  function clickConfirmar() {
    if (!formaOk || !valorOk) return
    if (isParcial) {
      setPartialDialog(true)
    } else {
      onConfirmar({ valor, forma: formaIdFinal(), modo: 'total' })
    }
  }

  function confirmarParcial() {
    onConfirmar({ valor, forma: formaIdFinal(), modo: 'parcial' })
    setPartialDialog(false)
  }

  function confirmarComDesconto() {
    onConfirmar({ valor, forma: formaIdFinal(), modo: 'desconto' })
    setPartialDialog(false)
  }

  function clickEnviarLink() {
    if (!valorOk) return
    onEnviarLink?.(valor)
    notify('info', `Link InfinitePay pra ${fmtBRL(valor, { fr: true })} (mock) — envie pelo WhatsApp`)
  }

  // ─── Render
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Valor */}
      <div>
        <Label T={T}>Valor deste recebimento</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: T.textMuted, fontWeight: 600 }}>R$</span>
          <input
            type="number" min="0" max={saldo} step="0.01"
            value={valor}
            onChange={(e) => {
              const v = Math.max(0, Math.min(saldo, Number(e.target.value) || 0))
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
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {valor !== saldo && saldo > 0 && (
            <Chip T={T} dark={dark} onClick={() => setValor(saldo)}>
              receber tudo ({fmtBRL(saldo, { fr: true })})
            </Chip>
          )}
          {saldo > 0 && Math.abs(valor - saldo / 2) > 0.01 && (
            <Chip T={T} dark={dark} onClick={() => setValor(Math.round(saldo / 2 * 100) / 100)}>
              metade ({fmtBRL(saldo / 2, { fr: true })})
            </Chip>
          )}
        </div>
      </div>

      {/* Forma de pagamento — top: PIX | Cartão */}
      <div>
        <Label T={T}>Forma de pagamento</Label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <FormaTopBtn
            T={T} dark={dark}
            ativo={forma === 'pix'}
            onClick={() => setForma('pix')}
            icon="ti-brand-pinterest"
            label="PIX"
            sublabel="taxa 0%"
          />
          <FormaTopBtn
            T={T} dark={dark}
            ativo={forma === 'cartao'}
            onClick={() => setForma('cartao')}
            icon="ti-credit-card"
            label="Cartão"
            sublabel="débito · crédito · link · a prazo"
          />
        </div>
      </div>

      {/* Sub-leque do Cartão */}
      {forma === 'cartao' && (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          background: cor('#0d2035', '#e6f1fb'),
          border: `1px solid ${azul}44`,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <div style={{
            fontSize: 10, color: T.textMuted, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '.4px',
            marginBottom: 4,
          }}>Tipo de cartão</div>
          {SUB_CARTAO.map(s => {
            const taxa = s.fixed != null ? s.fixed : (s.getTaxa ? s.getTaxa(parcelas) : null)
            return (
              <SubCartaoBtn
                key={s.id}
                T={T} dark={dark} sub={s}
                ativo={subCartao === s.id}
                onClick={() => setSubCartao(s.id)}
                parcelas={parcelas}
                setParcelas={setParcelas}
                taxaAtual={taxa}
              />
            )
          })}
        </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: showLinkD1 ? '1.5fr 1fr' : '1fr', gap: 8 }}>
          <button
            onClick={clickConfirmar}
            disabled={!formaOk || !valorOk}
            style={{
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
            <span>
              Confirmar {fmtBRL(valor, { fr: true })}
              {!isParcial && saldo > 0 && ' · concluir'}
            </span>
          </button>
          {showLinkD1 && (
            <button
              onClick={clickEnviarLink}
              disabled={!valorOk}
              title="Gera link InfinitePay e exibe pra você enviar pelo WhatsApp"
              style={{
                padding: '12px 12px', borderRadius: 8,
                border: `1px solid ${T.border}`, background: 'transparent',
                color: T.textSecondary, fontSize: 12, fontWeight: 600,
                cursor: valorOk ? 'pointer' : 'not-allowed',
                opacity: valorOk ? 1 : 0.5,
                fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                lineHeight: 1.25,
              }}>
              <i className="ti ti-link" style={{ fontSize: 15 }} aria-hidden="true" />
              Link
            </button>
          )}
        </div>
      )}

      {/* Aviso InfinitePay vs Ton Black */}
      {showAviso && (
        <div style={{
          background: T.cardAlt, border: `1px solid ${T.border}`,
          borderRadius: 7, padding: '8px 10px',
          fontSize: 10.5, color: T.textMuted,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 12, color: amarelo, flexShrink: 0 }} aria-hidden="true" />
          <span>
            Link sempre InfinitePay. Ton Black tem link de 30 dias —
            <strong style={{ color: T.textPrimary }}> nunca usar</strong>.
          </span>
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

function FormaTopBtn({ T, dark, ativo, onClick, icon, label, sublabel }) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 12px', borderRadius: 8,
        border: `1.5px solid ${ativo ? azul : T.border}`,
        background: ativo ? cor('#0d2035', '#e6f1fb') : 'transparent',
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left',
      }}>
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        border: `2px solid ${ativo ? azul : T.textDim}`,
        background: ativo ? azul : 'transparent',
        flexShrink: 0,
      }} />
      <i className={`ti ${icon}`}
         style={{ fontSize: 17, color: ativo ? azul : T.textMuted }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{label}</div>
        <div style={{
          fontSize: 10, color: T.textMuted, marginTop: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{sublabel}</div>
      </div>
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
            {Array.from({ length: 12 }, (_, i) => i + 1).map(p => {
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
