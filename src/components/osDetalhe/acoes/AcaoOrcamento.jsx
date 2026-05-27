// src/components/osDetalhe/acoes/AcaoOrcamento.jsx
// Etapa Orçamento — mobile-first, padrão novo (T/dark props, Tabler icons, BlocoAcao).

import React, { useState, useMemo } from 'react'
import { P } from '../../../theme'
import { corEtapa, bgEtapa } from '../../../utils/colors'
import { fmtBRL } from '../../../utils/fmt'
import { useOSItens } from '../../../hooks/useOSItens'
import { persistirLancamentosDoPagamento } from '../../../utils/osToFinanceiro'
import FormRecebimento from '../FormRecebimento'
import BlocoAcao from './BlocoAcao'

// ─── Constantes ───────────────────────────────────────────────────────────────
const TIPOS = [
  { id: 'servico', label: 'Serviços',     icon: 'ti-tool',    corKey: 'blue'   },
  { id: 'peca',    label: 'Peças',        icon: 'ti-puzzle',  corKey: 'purple' },
  { id: 'desloc',  label: 'Deslocamento', icon: 'ti-truck',   corKey: 'yellow' },
]

// Purple não existe em corEtapa, definimos direto
const COR_PECA = { fg: '#7C5CBF', bg: '#F1ECF8', bgDark: 'rgba(124,92,191,0.12)' }

function corTipo(tipo, dark) {
  if (tipo.id === 'peca') return { fg: COR_PECA.fg, bg: dark ? COR_PECA.bgDark : COR_PECA.bg }
  return { fg: corEtapa(tipo.corKey, dark), bg: bgEtapa(tipo.corKey, dark) }
}

// ─── Input base ──────────────────────────────────────────────────────────────
function Input({ T, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%', boxSizing: 'border-box',
        height: 44, padding: '0 12px', fontSize: 15,
        background: T.card, color: T.textPrimary,
        border: `1px solid ${T.border}`, borderRadius: 8,
        outline: 'none', fontFamily: 'inherit',
        fontVariantNumeric: 'tabular-nums',
        ...props.style,
      }}
    />
  )
}

// ─── Botão de ação ───────────────────────────────────────────────────────────
function Btn({ children, icon, variant = 'ghost', T, dark, onClick, disabled, full }) {
  const azul    = corEtapa('blue', dark)
  const verde   = corEtapa('green', dark)

  const styles = {
    ghost: {
      bg: 'transparent', color: T.textSecondary,
      border: `1px solid ${T.border}`,
    },
    blue: {
      bg: azul, color: '#fff', border: 'none',
    },
    green: {
      bg: verde, color: '#fff', border: 'none',
    },
    dashed: {
      bg: 'transparent', color: azul,
      border: `1.5px dashed ${azul}88`,
    },
  }
  const s = styles[variant] || styles.ghost

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 44, padding: '0 16px',
        borderRadius: 9, cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        width: full ? '100%' : undefined,
        opacity: disabled ? 0.5 : 1,
        WebkitTapHighlightColor: 'transparent',
        transition: 'opacity .12s',
        background: s.bg, color: s.color, border: s.border,
      }}
    >
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 16 }} aria-hidden="true" />}
      {children}
    </button>
  )
}

// ─── Formulário de novo item ──────────────────────────────────────────────────
function AddItemForm({ tipo, T, dark, onSave, onCancel, saving }) {
  const [nome, setNome]   = useState('')
  const [qtd, setQtd]     = useState('1')
  const [valor, setValor] = useState('')

  const valido = nome.trim().length > 0 && Number(qtd) > 0
  const { fg, bg } = corTipo(tipo, dark)

  return (
    <div style={{
      background: bg, border: `1px solid ${fg}44`,
      borderRadius: 10, padding: 12,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Título do form */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, fontWeight: 700, color: fg,
        textTransform: 'uppercase', letterSpacing: '.05em',
      }}>
        <i className={`ti ${tipo.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
        Novo {tipo.label.replace(/s$/, '').toLowerCase()}
      </div>

      {/* Descrição */}
      <div>
        <Label T={T}>Descrição</Label>
        <Input T={T} placeholder="Ex: Troca de correia" value={nome}
          onChange={e => setNome(e.target.value)} autoFocus />
      </div>

      {/* Qtd + Valor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <Label T={T}>Qtd</Label>
          <Input T={T} type="number" min="1" step="1" value={qtd}
            onChange={e => setQtd(e.target.value)} />
        </div>
        <div>
          <Label T={T}>Valor unit. (R$)</Label>
          <Input T={T} type="number" min="0" step="0.01" placeholder="0,00"
            value={valor} onChange={e => setValor(e.target.value)} />
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Btn T={T} dark={dark} icon="ti-x" onClick={onCancel} disabled={saving}>
          Cancelar
        </Btn>
        <Btn T={T} dark={dark} icon="ti-check" variant="blue"
          onClick={() => { if (valido) onSave({ nome: nome.trim(), qtd: Number(qtd) || 1, valor_unitario: Number(valor) || 0, tipo: tipo.id }) }}
          disabled={!valido || saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Btn>
      </div>
    </div>
  )
}

// ─── Bloco de um grupo de itens ───────────────────────────────────────────────
function GrupoBlock({ tipo, itens, subtotal, T, dark, onAdd, onRemove, adicionandoTipo }) {
  const { fg, bg } = corTipo(tipo, dark)
  const isEmpty = itens.length === 0

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Cabeçalho do grupo */}
      <div style={{
        padding: '10px 14px',
        background: dark ? 'rgba(255,255,255,0.03)' : T.cardAlt,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: bg, color: fg,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ${tipo.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
        </span>
        <span style={{
          flex: 1, fontSize: 12.5, fontWeight: 700, color: T.textPrimary,
        }}>
          {tipo.label}
          {itens.length > 0 && (
            <span style={{ fontWeight: 400, color: T.textMuted, marginLeft: 5 }}>
              · {itens.length}
            </span>
          )}
        </span>
        {subtotal > 0 && (
          <span style={{
            fontSize: 14, fontWeight: 700, color: T.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtBRL(subtotal)}
          </span>
        )}
      </div>

      {/* Lista de itens */}
      {itens.map((it, idx) => (
        <div key={it.id || idx} style={{
          padding: '11px 14px',
          borderTop: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            flex: 1, fontSize: 14, color: T.textPrimary, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{it.nome || '(sem nome)'}</span>
          <span style={{
            fontSize: 12, color: T.textMuted,
            fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>{it.qtd || 1}×</span>
          <span style={{
            fontSize: 14, fontWeight: 600, color: T.textPrimary,
            fontVariantNumeric: 'tabular-nums', minWidth: 64, textAlign: 'right', flexShrink: 0,
          }}>{fmtBRL((it.qtd || 1) * (it.valor_unitario || 0))}</span>
          <button
            type="button"
            onClick={() => onRemove(it.id)}
            style={{
              width: 32, height: 32, borderRadius: 6, flexShrink: 0,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.textMuted, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Remover item"
          >
            <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
          </button>
        </div>
      ))}

      {/* Botão adicionar */}
      {adicionandoTipo !== tipo.id && (
        <button
          type="button"
          onClick={() => onAdd(tipo.id)}
          style={{
            width: '100%', height: 44, padding: '0 14px',
            background: 'transparent', border: 'none',
            borderTop: isEmpty ? 'none' : `1px dashed ${T.border}`,
            color: fg, fontWeight: 600, fontSize: 13.5,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 7,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
          Adicionar {tipo.label.replace(/s$/, '').toLowerCase()}
        </button>
      )}
    </div>
  )
}

// ─── Card de totais ───────────────────────────────────────────────────────────
function TotaisCard({ T, dark, subtotais, total }) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c

  return (
    <div style={{
      background: cor('rgba(91,155,213,0.06)', '#F4F9FE'),
      border: `1px solid ${azul}44`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Linhas por categoria */}
      {TIPOS.map((t, i) => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
          fontSize: 13.5, color: T.textSecondary,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
            <span>{t.label}</span>
          </div>
          <span style={{
            fontWeight: 600, color: subtotais[t.id] > 0 ? T.textPrimary : T.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtBRL(subtotais[t.id])}
          </span>
        </div>
      ))}

      {/* Linha total */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px',
        borderTop: `1.5px solid ${azul}44`,
        background: cor('rgba(91,155,213,0.04)', 'rgba(91,155,213,0.05)'),
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.06em',
        }}>
          Total
        </span>
        <span style={{
          fontSize: 26, fontWeight: 700, color: T.textPrimary,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em',
        }}>
          {fmtBRL(total)}
        </span>
      </div>
    </div>
  )
}

// ─── Status do orçamento ─────────────────────────────────────────────────────
const STATUS_META = {
  idle:       { label: 'Enviar orçamento ao cliente', icon: 'ti-send',      variant: 'dashed' },
  aguardando: { label: 'Aguardando resposta',         icon: 'ti-clock',     variant: 'waiting' },
  confirmado: { label: 'Orçamento confirmado',        icon: 'ti-circle-check', variant: 'confirmed' },
  recusado:   { label: 'Orçamento recusado',          icon: 'ti-circle-x',  variant: 'rejected' },
}

function BotaoStatus({ os, onUpdateOS, T, dark }) {
  const [status, setStatus] = useState(os?.orcamento_status || 'idle')
  const [confirmando, setConfirmando] = useState(false)
  const azul    = corEtapa('blue', dark)
  const verde   = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)
  const amarelo  = dark ? P.yellow : P.yellowDark
  const cor = (d, c) => dark ? d : c

  function avancar() {
    if (status === 'idle') {
      setStatus('aguardando')
      onUpdateOS?.(os.numero, { orcamento_status: 'aguardando' })
    } else if (status === 'aguardando') {
      setConfirmando(true)
    }
  }

  function resolver(novo) {
    setStatus(novo)
    setConfirmando(false)
    onUpdateOS?.(os.numero, { orcamento_status: novo })
  }

  // Escolha confirmado/recusado
  if (confirmando) {
    return (
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 10, padding: 14,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{
          fontSize: 12.5, fontWeight: 700, color: T.textMuted,
          textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          O cliente aprovou?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" onClick={() => resolver('recusado')} style={{
            height: 48, borderRadius: 9, cursor: 'pointer', border: `1px solid ${vermelho}55`,
            fontFamily: 'inherit', background: cor('#2a1515', '#fde8e8'), color: vermelho,
            fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <i className="ti ti-x" style={{ fontSize: 16 }} aria-hidden="true" />
            Recusado
          </button>
          <button type="button" onClick={() => resolver('confirmado')} style={{
            height: 48, borderRadius: 9, cursor: 'pointer', border: `1px solid ${verde}55`,
            fontFamily: 'inherit', background: cor('#0f2a15', '#e8f5ec'), color: verde,
            fontSize: 14, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <i className="ti ti-check" style={{ fontSize: 16 }} aria-hidden="true" />
            Aprovado
          </button>
        </div>
      </div>
    )
  }

  // Estados visuais
  const estilos = {
    idle:      { bg: 'transparent',                  border: `1.5px dashed ${azul}88`, color: azul },
    aguardando:{ bg: cor('#2a2000', '#fdf6dc'),       border: `1px solid ${amarelo}55`, color: amarelo },
    confirmado:{ bg: cor('#0f2a15', '#e8f5ec'),       border: `1px solid ${verde}55`,  color: verde },
    recusado:  { bg: cor('#2a1515', '#fde8e8'),       border: `1px solid ${vermelho}55`, color: vermelho },
  }
  const meta = STATUS_META[status] || STATUS_META.idle
  const s = estilos[status] || estilos.idle
  const clicavel = status === 'idle' || status === 'aguardando'

  return (
    <button
      type="button"
      onClick={clicavel ? avancar : undefined}
      style={{
        width: '100%', height: 48, borderRadius: 9,
        fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
        cursor: clicavel ? 'pointer' : 'default',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        WebkitTapHighlightColor: 'transparent',
        background: s.bg, color: s.color, border: s.border,
        transition: 'background .15s',
      }}
    >
      <i className={`ti ${meta.icon}`} style={{ fontSize: 17 }} aria-hidden="true" />
      {meta.label}
    </button>
  )
}

// ─── Bloco diagnóstico (resumo) ───────────────────────────────────────────────
function ResumoDiagnostico({ T, dark, os }) {
  const causa = os?.diagnostico?.causa
  const itensMarcados = os?.diagnostico?.componentesMarcados || []
  if (!causa && !itensMarcados.length) return null

  const azul   = corEtapa('blue', dark)
  const amarelo = dark ? P.yellow : P.yellowDark

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.05em',
      }}>
        <i className="ti ti-stethoscope" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
        Diagnóstico
        {os?.diagnostico?.por && (
          <span style={{
            marginLeft: 'auto', fontWeight: 500,
            textTransform: 'none', letterSpacing: 0, fontSize: 11,
          }}>
            por {os.diagnostico.por}
          </span>
        )}
      </div>

      {causa && (
        <div style={{
          fontSize: 13.5, color: T.textPrimary, lineHeight: 1.4,
          borderLeft: `3px solid ${amarelo}`,
          paddingLeft: 10,
        }}>
          {causa}
        </div>
      )}

      {itensMarcados.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {itensMarcados.map((c, i) => (
            <span key={i} style={{
              fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 12,
              background: COR_PECA.bg, color: COR_PECA.fg,
              border: `1px solid ${COR_PECA.fg}33`,
            }}>
              {c.label || c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Label de campo ───────────────────────────────────────────────────────────
function Label({ T, children }) {
  return (
    <div style={{
      fontSize: 11.5, fontWeight: 600, color: T.textMuted,
      marginBottom: 5,
    }}>
      {children}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AcaoOrcamento({ T, dark, os, onUpdateOS, onAbrirAba }) {
  const { itens, addItem, removeItem } = useOSItens(os?.id)
  const [adicionandoTipo, setAdicionandoTipo] = useState(null)
  const [saving, setSaving] = useState(false)

  const porTipo = useMemo(() => {
    const map = { servico: [], peca: [], desloc: [] }
    itens.forEach(it => {
      const k = it.tipo || 'servico'
      ;(map[k] || map.servico).push(it)
    })
    return map
  }, [itens])

  const subtotais = useMemo(() => {
    const out = { servico: 0, peca: 0, desloc: 0 }
    Object.entries(porTipo).forEach(([k, arr]) => {
      out[k] = arr.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valor_unitario) || 0), 0)
    })
    return out
  }, [porTipo])

  const total = subtotais.servico + subtotais.peca + subtotais.desloc

  async function handleSaveItem(dados) {
    setSaving(true)
    await addItem(dados)
    setSaving(false)
    setAdicionandoTipo(null)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-receipt"
      etapa="Orçamento"
      descricao="Lance itens por categoria. Único lugar onde se define o valor da OS."
      tom="amarelo"
    >
      {/* Diagnóstico */}
      <ResumoDiagnostico T={T} dark={dark} os={os} />

      {/* Grupos de itens */}
      {TIPOS.map(t => (
        <React.Fragment key={t.id}>
          <GrupoBlock
            tipo={t} itens={porTipo[t.id]} subtotal={subtotais[t.id]}
            T={T} dark={dark}
            onAdd={id => setAdicionandoTipo(id)}
            onRemove={removeItem}
            adicionandoTipo={adicionandoTipo}
          />
          {adicionandoTipo === t.id && (
            <AddItemForm
              tipo={t} T={T} dark={dark} saving={saving}
              onSave={handleSaveItem}
              onCancel={() => setAdicionandoTipo(null)}
            />
          )}
        </React.Fragment>
      ))}

      {/* Totais */}
      <TotaisCard T={T} dark={dark} subtotais={subtotais} total={total} />

      {/* Status do orçamento */}
      <BotaoStatus T={T} dark={dark} os={os} onUpdateOS={onUpdateOS} />

      {/* Recebimento */}
      <FormRecebimento
        T={T} dark={dark}
        saldo={Math.max(0, total - (os?.valor_pago || 0))}
        onConfirmar={({ valor, forma, modo, taxa_pct, parcelas: parcelasAPrazo }) => {
          const valorAtual = Number(os?.valor_pago || 0)
          const novoValorPago = valorAtual + valor
          let novoPago = 'total'
          let novoDesconto = Number(os?.desconto || 0)
          if (modo === 'parcial') novoPago = 'parcial'
          else if (modo === 'desconto') {
            novoDesconto += Math.max(0, total - valorAtual) - valor
          }
          let novasObs = os?.observacoes
          if (parcelasAPrazo?.length > 0) {
            const txt = parcelasAPrazo
              .map((p, i) => `${i + 1}ª · ${p.data} · ${fmtBRL(p.valor)}`)
              .join('\n')
            novasObs = [os?.observacoes, `— A prazo (${parcelasAPrazo.length} parcela${parcelasAPrazo.length !== 1 ? 's' : ''}) —\n${txt}`]
              .filter(Boolean).join('\n\n')
          }
          onUpdateOS?.(os.numero, {
            valor: total,
            desconto: novoDesconto,
            valor_pago: novoValorPago,
            pago: novoPago,
            forma_pagamento: forma,
            ...(novasObs !== os?.observacoes ? { observacoes: novasObs } : {}),
          })
          persistirLancamentosDoPagamento(os, { valor, forma, taxa_pct, parcelasAPrazo: parcelasAPrazo || [] })
        }}
      />

      {/* Ações secundárias */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Btn T={T} dark={dark} icon="ti-file-text"
          onClick={() => onUpdateOS?.(os.numero, { action: 'gerar_pdf' })}>
          Gerar PDF
        </Btn>
        <Btn T={T} dark={dark} icon="ti-cash-banknote"
          onClick={() => onAbrirAba?.('pagamento')}>
          Pagamento
        </Btn>
      </div>

      <Btn T={T} dark={dark} icon="ti-brand-whatsapp" variant="dashed" full
        onClick={() => onUpdateOS?.(os.numero, { action: 'enviar_orcamento_whatsapp' })}>
        Enviar por WhatsApp
      </Btn>
    </BlocoAcao>
  )
}
