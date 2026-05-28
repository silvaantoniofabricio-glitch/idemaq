// src/components/osDetalhe/acoes/AcaoOrcamentoHIG.jsx
// Orçamento — Apple HIG, do zero.
//
// Seções:
//   1. Resumo do diagnóstico (relato + causa + componentes)
//   2. Itens do orçamento (Serviços / Peças / Deslocamento) — cada grupo
//      é um HIGSection com list rows; + abre AddItemForm inline
//   3. Desconto (R$ ↔ % interligados)
//   4. Total — card com breakdown por categoria + valor grande
//   5. Status do orçamento — Enviar → Aguardando → Aprovado/Recusado
//   6. Ações secundárias — Gerar PDF / Enviar WhatsApp (ActionSheet)
//
// Toda a lógica de negócio preservada do AcaoOrcamento original.

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useTheme } from '../../../theme'
import { TI } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR, HIG_FONT, HIG_FONT_MONO,
  higType, higFilledButton, higTintedButton, higInsetCard,
} from '../../../theme-hig'
import { fmtBRL } from '../../../utils/fmt'
import { useOSItens } from '../../../hooks/useOSItens'
import { usePecas } from '../../../hooks/usePecas'
import { persistirLancamentosDoPagamento } from '../../../utils/osToFinanceiro'
import FormRecebimento from '../FormRecebimento'
import { CATEGORIA_POR_ID } from '../../../utils/categoriasPeca'

// ─── Tipos de item ────────────────────────────────────────────────────────
const TIPOS = [
  { id: 'servico', label: 'Serviços',     icon: 'tool',    color: HIG_COLOR.tintIdemaq },
  { id: 'peca',    label: 'Peças',        icon: 'package', color: '#7C5CBF'            },
  { id: 'desloc',  label: 'Deslocamento', icon: 'truck',   color: HIG_COLOR.orange     },
]

const SUGESTOES = {
  servico: [{ nome: 'Limpeza', valor: 165 }, { nome: 'Manutenção', valor: 165 }],
  desloc:  [{ nome: 'Deslocamento', valor: 20 }],
  peca:    [],
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const bgFor = (color, dark) =>
  dark ? `${color}22` : `${color}18`

// ─── HIGSection ───────────────────────────────────────────────────────────
function HIGSection({ T, dark, title, children, footer, action }) {
  return (
    <section>
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
      }}>
        <span style={{
          flex: 1,
          ...higType('footnote'),
          color: T.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}>
          {title}
        </span>
        {action}
      </div>
      <div style={higInsetCard(T, dark)}>
        {children}
      </div>
      {footer && (
        <div style={{
          ...higType('footnote'),
          color: T.textMuted,
          padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px 0`,
        }}>
          {footer}
        </div>
      )}
    </section>
  )
}

// ─── Separator ───────────────────────────────────────────────────────────
function Sep({ T, indent = 0 }) {
  return <div style={{ height: 0.5, background: T.border, marginLeft: indent, opacity: 0.7 }} />
}

// ─── iOS Action Sheet ─────────────────────────────────────────────────────
function ActionSheet({ T, dark, title, onClose, actions }) {
  const _mdb = useRef(false)
  return (
    <div
      onMouseDown={(e) => { _mdb.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && _mdb.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: HIG_SPACE.xs,
        paddingBottom: `calc(env(safe-area-inset-bottom,0px) + ${HIG_SPACE.xs}px)`,
      }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: HIG_SPACE.xs }}>
        {title && (
          <div style={{
            background: dark ? 'rgba(28,28,30,0.98)' : 'rgba(242,242,247,0.98)',
            borderRadius: HIG_RADIUS.sheet, padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
            textAlign: 'center',
            ...higType('footnote'), color: HIG_COLOR.gray,
            backdropFilter: 'blur(20px)',
          }}>
            {title}
          </div>
        )}
        <div style={{
          background: dark ? '#1C1C1E' : '#FFFFFF',
          borderRadius: HIG_RADIUS.sheet, overflow: 'hidden',
        }}>
          {actions.map((a, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ height: 0.5, background: HIG_COLOR.gray4 }} />}
              <button onClick={a.onClick} style={{
                width: '100%', minHeight: 56, padding: HIG_SPACE.sm,
                border: 'none', background: 'transparent',
                ...higType('body'),
                color: a.destructive ? HIG_COLOR.red : HIG_COLOR.tintIdemaq,
                cursor: 'pointer', fontFamily: HIG_FONT,
                WebkitTapHighlightColor: 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: HIG_SPACE.xs,
              }}>
                {a.icon && <TI name={a.icon} size={18} color={a.destructive ? HIG_COLOR.red : HIG_COLOR.tintIdemaq} />}
                {a.label}
              </button>
            </React.Fragment>
          ))}
        </div>
        <button onClick={onClose} style={{
          minHeight: 56, borderRadius: HIG_RADIUS.sheet,
          background: dark ? '#1C1C1E' : '#FFFFFF',
          border: 'none', cursor: 'pointer',
          ...higType('headline'), color: HIG_COLOR.tintIdemaq, fontFamily: HIG_FONT,
          WebkitTapHighlightColor: 'transparent',
        }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ─── Resumo do diagnóstico ────────────────────────────────────────────────
function ResumoDiagnostico({ T, dark, os }) {
  const relato  = (os?.defeito || '').trim()
  const causa   = (os?.pre_diagnostico?.causa_diagnostico || '').trim()
  const marcados = os?.pre_diagnostico?.componentes_marcados || {}

  const chips = []
  for (const [, itens] of Object.entries(marcados)) {
    if (!itens || typeof itens !== 'object') continue
    const pares = Array.isArray(itens)
      ? itens.map(id => [id, 'troca'])
      : Object.entries(itens)
    for (const [itemId, acao] of pares) {
      const cat = CATEGORIA_POR_ID[itemId]
      chips.push({ id: itemId, label: cat?.label || itemId, acao })
    }
  }

  if (!relato && !causa && chips.length === 0) return null

  return (
    <HIGSection T={T} dark={dark} title="Diagnóstico">
      {relato && (
        <>
          <div style={{
            padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 3, borderRadius: 99, alignSelf: 'stretch',
              flexShrink: 0, background: '#FFCC00', minHeight: 16,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...higType('caption2'), color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                Relato
              </div>
              <p style={{ ...higType('subheadline'), color: T.textPrimary, margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                {relato}
              </p>
            </div>
          </div>
          {(causa || chips.length > 0) && <Sep T={T} indent={HIG_SPACE.md} />}
        </>
      )}

      {causa && (
        <>
          <div style={{
            padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 3, borderRadius: 99, alignSelf: 'stretch',
              flexShrink: 0, background: HIG_COLOR.tintIdemaq, minHeight: 16,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...higType('caption2'), color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
                Causa
              </div>
              <p style={{ ...higType('subheadline'), color: T.textPrimary, margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                {causa}
              </p>
            </div>
          </div>
          {chips.length > 0 && <Sep T={T} indent={HIG_SPACE.md} />}
        </>
      )}

      {chips.length > 0 && (
        <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px` }}>
          <div style={{ ...higType('caption2'), color: T.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
            Componentes · {chips.length}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {chips.map(c => {
              const isManut = c.acao === 'manutencao'
              const color  = isManut ? HIG_COLOR.orange : HIG_COLOR.red
              const bg     = dark
                ? (isManut ? 'rgba(255,149,0,0.15)' : 'rgba(255,59,48,0.15)')
                : (isManut ? '#FFF5E6' : '#FEF0EF')
              return (
                <span key={c.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 9px', borderRadius: 999,
                  background: bg, color,
                  ...higType('caption1'), fontWeight: 700,
                }}>
                  <TI name={isManut ? 'tool' : 'replace'} size={10} color={color} />
                  {c.label}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </HIGSection>
  )
}

// ─── Formulário de adicionar item (DEPRECATED) ────────────────────────────
// Substituido por ItemRowEditando (edicao inline). Mantido temporariamente
// como referencia da logica de pickers (SugestoesPicker/PecaPicker), que
// podem ser reintroduzidos na row editavel mais tarde.
// eslint-disable-next-line no-unused-vars
function AddItemForm_DEPRECATED({ tipo, T, dark, onSave, onCancel, saving }) {
  const [nome, setNome]   = useState('')
  const [qtd, setQtd]     = useState('1')
  const [valor, setValor] = useState('')
  const [pecaId, setPecaId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const valido = nome.trim().length > 0 && Number(qtd) > 0

  function handleSave() {
    if (!valido) return
    const payload = {
      nome: nome.trim(),
      qtd: Number(qtd) || 1,
      valor_unitario: Number(String(valor).replace(',', '.')) || 0,
      tipo: tipo.id,
    }
    if (tipo.id === 'peca' && pecaId) payload.peca_id = pecaId
    onSave(payload)
  }

  function escolherPeca(p) {
    setNome(p.nome || '')
    setValor(p.precoVenda ? String(p.precoVenda) : '')
    setPecaId(p.id)
    setPickerOpen(false)
  }

  const inStyle = {
    border: 'none', background: 'transparent', outline: 'none',
    ...higType('body'), color: T.textPrimary, fontFamily: HIG_FONT,
    fontVariantNumeric: 'tabular-nums',
  }

  return (
    <div style={{
      background: dark ? 'rgba(91,155,213,0.07)' : 'rgba(91,155,213,0.06)',
      borderRadius: HIG_RADIUS.card,
      border: `1px solid ${HIG_COLOR.tintIdemaq}33`,
      overflow: 'hidden',
    }}>
      {/* Campos na mesma row */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: `0 ${HIG_SPACE.sm}px`,
        minHeight: HIG_SIZE.listRow,
        gap: HIG_SPACE.xs,
      }}>
        {/* Descrição */}
        <input
          ref={inputRef}
          type="text"
          placeholder={tipo.id === 'peca' ? 'Buscar peça…' : tipo.id === 'desloc' ? 'Deslocamento…' : 'Serviço…'}
          value={nome}
          onChange={e => { setNome(e.target.value); setPecaId(null); setPickerOpen(true) }}
          onFocus={() => setPickerOpen(true)}
          onBlur={() => setTimeout(() => setPickerOpen(false), 200)}
          onKeyDown={e => { if (e.key === 'Enter' && valido) handleSave(); if (e.key === 'Escape') onCancel() }}
          style={{ ...inStyle, flex: 1, minWidth: 0 }}
        />

        {/* Qtd */}
        <input
          type="number" min="1"
          value={qtd}
          onChange={e => setQtd(e.target.value)}
          style={{ ...inStyle, width: 36, textAlign: 'center', flexShrink: 0 }}
        />

        {/* R$ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <span style={{ ...higType('caption1'), color: T.textMuted }}>R$</span>
          <input
            type="number" min="0" step="0.01" placeholder="0"
            value={valor}
            onChange={e => setValor(e.target.value)}
            style={{ ...inStyle, width: 64, textAlign: 'right' }}
          />
        </div>

        {/* Cancelar */}
        <button type="button" onClick={onCancel} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: 'transparent', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}>
          <TI name="x" size={16} color={T.textMuted} />
        </button>

        {/* Salvar */}
        <button type="button" onClick={handleSave} disabled={!valido || saving} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none',
          background: valido ? (dark ? 'rgba(91,155,213,0.2)' : 'rgba(91,155,213,0.15)') : 'transparent',
          cursor: valido ? 'pointer' : 'not-allowed', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
          opacity: valido ? 1 : 0.35,
        }}>
          <TI name={saving ? 'loader-2' : 'check'} size={16} color={HIG_COLOR.tintIdemaq} />
        </button>
      </div>

      {/* Peca vinculada ao estoque */}
      {tipo.id === 'peca' && pecaId && (
        <div style={{
          padding: `0 ${HIG_SPACE.sm}px ${HIG_SPACE.xs}px`,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <TI name="link" size={11} color={HIG_COLOR.tintIdemaq} />
          <span style={{ ...higType('caption2'), color: HIG_COLOR.tintIdemaq }}>
            Vinculado ao estoque
          </span>
        </div>
      )}

      {/* Picker */}
      {pickerOpen && (
        <div style={{ borderTop: `0.5px solid ${T.border}` }}>
          {tipo.id === 'peca'
            ? <PecaPicker T={T} dark={dark} termo={nome} onEscolher={escolherPeca} />
            : <SugestoesPicker T={T} dark={dark} sugestoes={SUGESTOES[tipo.id] || []} termo={nome}
                onEscolher={s => { setNome(s.nome); setValor(String(s.valor)); setPickerOpen(false) }} />
          }
        </div>
      )}
    </div>
  )
}

// ─── Picker de sugestões (Serviço / Deslocamento) ─────────────────────────
function SugestoesPicker({ T, dark, sugestoes, termo, onEscolher }) {
  const t = (termo || '').trim().toLowerCase()
  const matches = t ? sugestoes.filter(s => s.nome.toLowerCase().includes(t)) : sugestoes
  if (matches.length === 0) return null
  return (
    <div>
      {matches.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Sep T={T} indent={HIG_SPACE.md} />}
          <button type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onEscolher(s)}
            style={{
              width: '100%', minHeight: 44,
              padding: `0 ${HIG_SPACE.md}px`,
              background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
              cursor: 'pointer', fontFamily: HIG_FONT,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <TI name="corner-down-left" size={14} color={HIG_COLOR.tintIdemaq} />
            <span style={{ flex: 1, ...higType('body'), color: T.textPrimary }}>{s.nome}</span>
            <span style={{ ...higType('subheadline'), color: HIG_COLOR.tintIdemaq, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {fmtBRL(s.valor)}
            </span>
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Picker de peças do estoque ───────────────────────────────────────────
function PecaPicker({ T, dark, termo, onEscolher }) {
  const [busca, setBusca] = useState(termo)
  useEffect(() => {
    const t = setTimeout(() => setBusca(termo), 250)
    return () => clearTimeout(t)
  }, [termo])
  const { pecas, loading } = usePecas({ busca, pageSize: 8 })

  if (loading && pecas.length === 0) return (
    <div style={{ padding: HIG_SPACE.md, textAlign: 'center' }}>
      <span style={{ ...higType('footnote'), color: T.textMuted, fontStyle: 'italic' }}>
        Buscando no estoque…
      </span>
    </div>
  )

  if (!loading && pecas.length === 0) return (
    <div style={{ padding: HIG_SPACE.md, textAlign: 'center' }}>
      <span style={{ ...higType('footnote'), color: T.textMuted, fontStyle: 'italic' }}>
        {!(termo || '').trim() ? 'Digite para buscar peças' : 'Nenhuma peça — pode digitar livre'}
      </span>
    </div>
  )

  return (
    <div>
      {pecas.slice(0, 8).map((p, i) => (
        <React.Fragment key={p.id}>
          {i > 0 && <Sep T={T} indent={HIG_SPACE.md} />}
          <button type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => onEscolher(p)}
            style={{
              width: '100%', minHeight: 44,
              padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
              background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
              cursor: 'pointer', fontFamily: HIG_FONT,
              WebkitTapHighlightColor: 'transparent',
            }}>
            {p.favorito && <TI name="star-filled" size={11} color={HIG_COLOR.yellow} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                ...higType('body'), color: T.textPrimary,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{p.nome}</div>
              {(p.sku || p.qtdAtual != null) && (
                <div style={{ ...higType('caption1'), color: T.textMuted }}>
                  {[p.sku && `SKU ${p.sku}`, p.qtdAtual != null && `${p.qtdAtual} em estoque`].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>
            <span style={{ ...higType('subheadline'), color: HIG_COLOR.tintIdemaq, fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {p.precoVenda > 0 ? fmtBRL(p.precoVenda) : '—'}
            </span>
          </button>
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Item row (modo display) ──────────────────────────────────────────────
function ItemRowStatic({ item, tipo, T, dark, onRemove }) {
  return (
    <div style={{
      minHeight: HIG_SIZE.listRow,
      padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
      display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: bgFor(tipo.color, dark),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TI name={tipo.icon} size={15} color={tipo.color} />
      </span>
      <span style={{
        flex: 1, ...higType('body'), color: T.textPrimary,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.nome || '(sem nome)'}
      </span>
      <span style={{ ...higType('caption1'), color: T.textMuted, flexShrink: 0 }}>
        {item.qtd || 1}×
      </span>
      <span style={{
        ...higType('subheadline'), fontWeight: 600, color: T.textPrimary,
        fontVariantNumeric: 'tabular-nums', minWidth: 64, textAlign: 'right', flexShrink: 0,
      }}>
        {fmtBRL((item.qtd || 1) * (item.valor_unitario || 0))}
      </span>
      <button type="button" onClick={onRemove} style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        border: `1px solid ${T.border}`, background: 'transparent',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <TI name="trash" size={13} color={T.textMuted} />
      </button>
    </div>
  )
}

// ─── Item row (modo edicao inline) ────────────────────────────────────────
// Substitui o AddItemForm antigo. Aberto direto quando + Adicionar cria
// um item novo no banco com defaults vazios. Foco automatico no nome.
// Confirma em: Enter, blur fora do container, ou click no check.
// Cancela em: Esc → onConfirm com nome vazio (parent remove).
function ItemRowEditando({ item, tipo, T, dark, onConfirm }) {
  const [nome, setNome] = useState(item.nome || '')
  const [qtd, setQtd] = useState(String(item.qtd || 1))
  const [valor, setValor] = useState(item.valor_unitario ? String(item.valor_unitario) : '')
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const confirmadoRef = useRef(false)

  useEffect(() => { inputRef.current?.focus() }, [])

  function confirmar() {
    if (confirmadoRef.current) return
    confirmadoRef.current = true
    onConfirm({ nome, qtd, valor_unitario: valor })
  }

  function cancelar() {
    if (confirmadoRef.current) return
    confirmadoRef.current = true
    onConfirm({ nome: '', qtd, valor_unitario: valor })
  }

  // Blur dispara confirmar() — mas precisa ignorar quando o foco mover
  // pra outro input do MESMO container (nome → qtd → valor).
  function handleBlur(e) {
    const next = e.relatedTarget
    if (next && containerRef.current?.contains(next)) return
    confirmar()
  }

  const inStyle = {
    border: 'none', background: 'transparent', outline: 'none',
    ...higType('body'), color: T.textPrimary, fontFamily: HIG_FONT,
    fontVariantNumeric: 'tabular-nums',
  }

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      style={{
        minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        background: dark ? 'rgba(91,155,213,0.07)' : 'rgba(91,155,213,0.06)',
      }}>
      <span style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: bgFor(tipo.color, dark),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TI name={tipo.icon} size={15} color={tipo.color} />
      </span>

      <input
        ref={inputRef}
        type="text"
        placeholder={tipo.id === 'peca' ? 'Peça…' : tipo.id === 'desloc' ? 'Deslocamento…' : 'Serviço…'}
        value={nome}
        onChange={e => setNome(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); confirmar() }
          if (e.key === 'Escape') cancelar()
        }}
        style={{ ...inStyle, flex: 1, minWidth: 0 }}
      />

      <input
        type="number" min="1"
        value={qtd}
        onChange={e => setQtd(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmar() } }}
        style={{ ...inStyle, width: 36, textAlign: 'center', flexShrink: 0 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <span style={{ ...higType('caption1'), color: T.textMuted }}>R$</span>
        <input
          type="number" min="0" step="0.01" placeholder="0"
          value={valor}
          onChange={e => setValor(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmar() } }}
          style={{ ...inStyle, width: 64, textAlign: 'right' }}
        />
      </div>

      <button type="button" onMouseDown={(e) => { e.preventDefault(); cancelar() }} style={{
        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
        border: `1px solid ${T.border}`, background: 'transparent',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <TI name="trash" size={13} color={T.textMuted} />
      </button>
    </div>
  )
}

// ─── Row pra adicionar item novo (sempre visivel no final do grupo) ──────
// Estilo Bling: a row em si ja tem os inputs com placeholder ("Servico…"
// etc) e fica permanentemente disponivel. Sem botao "+ Adicionar" header,
// sem placeholder "Nenhum item…". O usuario clica no campo, digita, e ao
// dar blur/Enter o item e criado e a row reseta pra proximo.
function NovaItemRow({ tipo, T, dark, onAdd }) {
  const [nome, setNome] = useState('')
  const [qtd, setQtd] = useState('1')
  const [valor, setValor] = useState('')
  const containerRef = useRef(null)
  const flushedRef = useRef(false)

  const valido = nome.trim().length > 0

  async function flush() {
    if (flushedRef.current) return
    if (!valido) return
    flushedRef.current = true
    await onAdd({
      nome: nome.trim(),
      qtd: Number(qtd) || 1,
      valor_unitario: Number(String(valor).replace(',', '.')) || 0,
    })
    setNome(''); setQtd('1'); setValor('')
    flushedRef.current = false
  }

  function handleBlur(e) {
    const next = e.relatedTarget
    if (next && containerRef.current?.contains(next)) return
    flush()
  }

  const inStyle = {
    border: 'none', background: 'transparent', outline: 'none',
    ...higType('body'), color: T.textPrimary, fontFamily: HIG_FONT,
    fontVariantNumeric: 'tabular-nums',
  }

  const placeholder = tipo.id === 'peca'
    ? 'Adicionar peça…'
    : tipo.id === 'desloc'
      ? 'Adicionar deslocamento…'
      : 'Adicionar serviço…'

  return (
    <div
      ref={containerRef}
      onBlur={handleBlur}
      style={{
        minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
      }}>
      <span style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: bgFor(tipo.color, dark),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0.6,
      }}>
        <TI name="plus" size={15} color={tipo.color} />
      </span>

      <input
        type="text"
        placeholder={placeholder}
        value={nome}
        onChange={e => setNome(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); flush() }
          if (e.key === 'Escape') { setNome(''); setValor(''); e.target.blur() }
        }}
        style={{ ...inStyle, flex: 1, minWidth: 0 }}
      />

      <input
        type="number" min="1"
        value={qtd}
        onChange={e => setQtd(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); flush() } }}
        style={{
          ...inStyle, width: 36, textAlign: 'center', flexShrink: 0,
          opacity: valido ? 1 : 0.4,
        }}
      />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
        opacity: valido ? 1 : 0.4,
      }}>
        <span style={{ ...higType('caption1'), color: T.textMuted }}>R$</span>
        <input
          type="number" min="0" step="0.01" placeholder="0"
          value={valor}
          onChange={e => setValor(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); flush() } }}
          style={{ ...inStyle, width: 64, textAlign: 'right' }}
        />
      </div>

      {/* placeholder no lugar do botao remover dos itens existentes,
          mantem alinhamento das colunas */}
      <span style={{
        width: 30, height: 30, flexShrink: 0,
      }} aria-hidden="true" />
    </div>
  )
}

// ─── Grupo de itens (Serviços / Peças / Deslocamento) ─────────────────────
function GrupoItens({ tipo, itens, subtotal, T, dark, onAddNovo, onRemove }) {
  const count = itens.length

  return (
    <HIGSection T={T} dark={dark}
      title={`${tipo.label}${count > 0 ? ` · ${count}` : ''}`}
      footer={subtotal > 0 ? fmtBRL(subtotal) + ' neste grupo' : undefined}
    >
      {itens.map((it, i) => (
        <React.Fragment key={it.id || i}>
          {i > 0 && <Sep T={T} indent={HIG_SPACE.md + 32 + HIG_SPACE.sm} />}
          <ItemRowStatic
            item={it} tipo={tipo} T={T} dark={dark}
            onRemove={() => onRemove(it.id)}
          />
        </React.Fragment>
      ))}

      {/* Separator entre itens e a row de adicionar */}
      {count > 0 && <Sep T={T} indent={HIG_SPACE.md + 32 + HIG_SPACE.sm} />}

      {/* Row permanente pra adicionar — substitui a placeholder e o botao */}
      <NovaItemRow tipo={tipo} T={T} dark={dark} onAdd={onAddNovo} />
    </HIGSection>
  )
}

// ─── Desconto ─────────────────────────────────────────────────────────────
function DescontoSection({ T, dark, subtotalBruto, descontoRS, onChangeRS, onChangePct, onCommit, onRemove }) {
  const podeAplicar = subtotalBruto > 0
  const ativo = descontoRS > 0
  const [editando, setEditando] = useState(ativo)
  const pct = podeAplicar ? (descontoRS / subtotalBruto * 100) : 0

  const addBtn = !editando && (
    <button type="button"
      onClick={() => podeAplicar && setEditando(true)}
      disabled={!podeAplicar}
      style={{
        ...higType('footnote'),
        color: podeAplicar ? HIG_COLOR.tintIdemaq : T.textDim,
        background: 'transparent', border: 'none',
        cursor: podeAplicar ? 'pointer' : 'not-allowed', fontFamily: HIG_FONT, padding: 0,
        display: 'flex', alignItems: 'center', gap: 3,
        WebkitTapHighlightColor: 'transparent',
      }}>
      <TI name="plus" size={13} color={podeAplicar ? HIG_COLOR.tintIdemaq : T.textDim} />
      Adicionar
    </button>
  )

  const removeBtn = editando && ativo && (
    <button type="button" onClick={() => { onRemove(); setEditando(false) }}
      style={{
        ...higType('footnote'), color: HIG_COLOR.red,
        background: 'transparent', border: 'none',
        cursor: 'pointer', fontFamily: HIG_FONT, padding: 0,
        WebkitTapHighlightColor: 'transparent',
      }}>
      Remover
    </button>
  )

  const fieldStyle = {
    flex: 1, border: 'none', background: 'transparent', outline: 'none',
    ...higType('body'), color: T.textPrimary, fontFamily: HIG_FONT,
    fontVariantNumeric: 'tabular-nums', textAlign: 'right',
  }

  return (
    <HIGSection T={T} dark={dark}
      title={ativo ? `Desconto · ${pct.toFixed(1).replace('.', ',')}%` : 'Desconto'}
      action={removeBtn || addBtn}
    >
      {editando ? (
        <>
          {/* Campo R$ */}
          <div style={{ minHeight: 44, padding: `0 ${HIG_SPACE.md}px`, display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm }}>
            <span style={{ ...higType('body'), color: T.textPrimary, minWidth: 80 }}>Valor</span>
            <span style={{ ...higType('caption1'), color: T.textMuted }}>R$</span>
            <input
              type="number" min="0" step="0.01" placeholder="0,00"
              value={descontoRS > 0 ? Number(descontoRS).toFixed(2) : ''}
              onChange={e => onChangeRS(e.target.value)}
              onBlur={onCommit}
              style={fieldStyle}
            />
          </div>
          <Sep T={T} indent={HIG_SPACE.md} />
          {/* Campo % */}
          <div style={{ minHeight: 44, padding: `0 ${HIG_SPACE.md}px`, display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm }}>
            <span style={{ ...higType('body'), color: T.textPrimary, minWidth: 80 }}>Percentual</span>
            <input
              type="number" min="0" max="100" step="0.1" placeholder="0"
              value={pct > 0 ? pct.toFixed(1) : ''}
              onChange={e => onChangePct(e.target.value)}
              onBlur={onCommit}
              style={fieldStyle}
            />
            <span style={{ ...higType('caption1'), color: T.textMuted }}>%</span>
          </div>
        </>
      ) : (
        <div style={{ minHeight: 44, padding: `0 ${HIG_SPACE.md}px`, display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs }}>
          <TI name="tag" size={16} color={T.textDim} />
          <span style={{ ...higType('subheadline'), color: T.textMuted, fontStyle: 'italic' }}>
            Nenhum desconto aplicado
          </span>
        </div>
      )}
    </HIGSection>
  )
}

// ─── Card de totais ───────────────────────────────────────────────────────
function TotalCard({ T, dark, subtotais, descontoRS, total }) {
  const temDesc = descontoRS > 0

  return (
    <HIGSection T={T} dark={dark} title="Total">
      {TIPOS.map((t, i) => (
        <React.Fragment key={t.id}>
          {i > 0 && <Sep T={T} indent={HIG_SPACE.md + 32 + HIG_SPACE.sm} />}
          <div style={{
            minHeight: 44, padding: `0 ${HIG_SPACE.md}px`,
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: bgFor(t.color, dark),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TI name={t.icon} size={15} color={t.color} />
            </span>
            <span style={{ flex: 1, ...higType('body'), color: T.textPrimary }}>{t.label}</span>
            <span style={{
              ...higType('body'), fontWeight: subtotais[t.id] > 0 ? 600 : 400,
              color: subtotais[t.id] > 0 ? T.textPrimary : T.textMuted,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtBRL(subtotais[t.id])}
            </span>
          </div>
        </React.Fragment>
      ))}

      {temDesc && (
        <>
          <Sep T={T} indent={HIG_SPACE.md} />
          <div style={{
            minHeight: 44, padding: `0 ${HIG_SPACE.md}px`,
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
          }}>
            <span style={{ flex: 1, ...higType('body'), color: HIG_COLOR.red }}>Desconto</span>
            <span style={{
              ...higType('body'), fontWeight: 600, color: HIG_COLOR.red,
              fontVariantNumeric: 'tabular-nums',
            }}>
              − {fmtBRL(descontoRS)}
            </span>
          </div>
        </>
      )}

      {/* Linha total — destaque */}
      <div style={{
        padding: `${HIG_SPACE.md}px`,
        borderTop: `0.5px solid ${T.border}`,
        background: dark ? 'rgba(91,155,213,0.05)' : 'rgba(91,155,213,0.04)',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <span style={{
          ...higType('footnote'), color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700,
        }}>
          Total
        </span>
        <span style={{
          fontSize: 28, fontWeight: 700, color: T.textPrimary,
          fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5,
          fontFamily: HIG_FONT,
        }}>
          {fmtBRL(total)}
        </span>
      </div>
    </HIGSection>
  )
}

// ─── Status do orçamento ──────────────────────────────────────────────────
function StatusOrcamento({ os, onUpdateOS, onMoverOS, T, dark }) {
  const statusSalvo = os?.pre_diagnostico?.orcamento_status || os?.orcamento_status || 'idle'
  const [status, setStatus] = useState(statusSalvo)
  const [fase, setFase] = useState('normal') // 'normal' | 'confirmar' | 'desfazer'

  useEffect(() => {
    setStatus(os?.pre_diagnostico?.orcamento_status || os?.orcamento_status || 'idle')
  }, [os?.pre_diagnostico?.orcamento_status, os?.orcamento_status])

  function persistir(novo) {
    onUpdateOS?.(os.numero, {
      pre_diagnostico: { ...(os.pre_diagnostico || {}), orcamento_status: novo },
    })
  }

  function resolver(novo) {
    setStatus(novo); setFase('normal'); persistir(novo)
    if (novo === 'confirmado') onMoverOS?.(os.numero, 'oficina')
  }

  function reverter() {
    setStatus('aguardando'); setFase('normal'); persistir('aguardando')
    if (os?.etapa !== 'orcamento') onMoverOS?.(os.numero, 'orcamento')
  }

  // Estado de confirmar aprovação/rejeição
  if (fase === 'confirmar') {
    return (
      <HIGSection T={T} dark={dark} title="Resposta do cliente">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <button type="button" onClick={() => resolver('recusado')} style={{
            minHeight: 56, border: 'none', borderRight: `0.5px solid ${T.border}`,
            background: dark ? 'rgba(255,59,48,0.10)' : '#FEF0EF',
            cursor: 'pointer', fontFamily: HIG_FONT,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <TI name="x" size={22} color={HIG_COLOR.red} />
            <span style={{ ...higType('footnote'), color: HIG_COLOR.red, fontWeight: 700 }}>Recusado</span>
          </button>
          <button type="button" onClick={() => resolver('confirmado')} style={{
            minHeight: 56, border: 'none',
            background: dark ? 'rgba(52,199,89,0.10)' : '#E8F9EE',
            cursor: 'pointer', fontFamily: HIG_FONT,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <TI name="check" size={22} color={HIG_COLOR.green} />
            <span style={{ ...higType('footnote'), color: HIG_COLOR.green, fontWeight: 700 }}>Aprovado</span>
          </button>
        </div>
        <Sep T={T} />
        <button type="button" onClick={() => setFase('normal')} style={{
          width: '100%', minHeight: 44, border: 'none', background: 'transparent',
          cursor: 'pointer', fontFamily: HIG_FONT,
          ...higType('body'), color: HIG_COLOR.tintIdemaq,
          WebkitTapHighlightColor: 'transparent',
        }}>
          Cancelar
        </button>
      </HIGSection>
    )
  }

  // Estado de desfazer
  if (fase === 'desfazer') {
    return (
      <HIGSection T={T} dark={dark} title="Reabrir orçamento">
        <div style={{ padding: HIG_SPACE.md }}>
          <p style={{ ...higType('subheadline'), color: T.textMuted, margin: `0 0 ${HIG_SPACE.md}px`, lineHeight: 1.45 }}>
            {status === 'confirmado'
              ? 'A OS volta pra etapa Orçamento e o status fica como "Aguardando resposta".'
              : 'O status volta pra "Aguardando resposta" — você pode reabrir a decisão.'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: HIG_SPACE.xs }}>
            <button type="button" onClick={() => setFase('normal')} style={{
              ...higTintedButton(T, dark),
              background: 'transparent',
              border: `1px solid ${T.border}`,
              color: T.textMuted,
            }}>
              Cancelar
            </button>
            <button type="button" onClick={reverter} style={{
              ...higTintedButton(T, dark),
            }}>
              <TI name="arrow-back-up" size={15} color={HIG_COLOR.tintIdemaq} />
              Reabrir
            </button>
          </div>
        </div>
      </HIGSection>
    )
  }

  // Estado normal — botão de ação principal
  const cfg = {
    idle:       { label: 'Enviar orçamento ao cliente', icon: 'send',         bg: 'transparent', border: `1.5px dashed ${HIG_COLOR.tintIdemaq}88`, color: HIG_COLOR.tintIdemaq },
    aguardando: { label: 'Aguardando resposta',          icon: 'clock',        bg: dark ? 'rgba(255,204,0,0.10)' : '#FFFBE6', border: `1px solid ${HIG_COLOR.yellow}66`, color: dark ? HIG_COLOR.yellow : '#B8860B' },
    confirmado: { label: 'Orçamento aprovado',           icon: 'circle-check', bg: dark ? 'rgba(52,199,89,0.10)' : '#E8F9EE', border: `1px solid ${HIG_COLOR.green}55`,  color: HIG_COLOR.green },
    recusado:   { label: 'Orçamento recusado',           icon: 'circle-x',     bg: dark ? 'rgba(255,59,48,0.10)' : '#FEF0EF', border: `1px solid ${HIG_COLOR.red}55`,    color: HIG_COLOR.red },
  }
  const c = cfg[status] || cfg.idle
  const resolvido = status === 'confirmado' || status === 'recusado'

  function handleClick() {
    if (status === 'idle') { setStatus('aguardando'); persistir('aguardando') }
    else if (status === 'aguardando') setFase('confirmar')
    else if (resolvido) setFase('desfazer')
  }

  return (
    <button type="button" onClick={handleClick} style={{
      width: '100%', minHeight: 50,
      borderRadius: HIG_RADIUS.card,
      background: c.bg, border: c.border, color: c.color,
      ...higType('headline'), fontFamily: HIG_FONT,
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: HIG_SPACE.xs,
      WebkitTapHighlightColor: 'transparent',
      transition: 'background .15s',
      position: 'relative',
    }}>
      <TI name={c.icon} size={18} color={c.color} />
      {c.label}
      {resolvido && (
        <span style={{ position: 'absolute', right: HIG_SPACE.sm, opacity: 0.45 }}>
          <TI name="dots-vertical" size={14} color={c.color} />
        </span>
      )}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoOrcamentoHIG({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()
  const { itens, addItem, removeItem } = useOSItens(os?.id)
  const [docSheet, setDocSheet] = useState(null) // null | 'pdf' | 'whats'

  // Agrupa itens por tipo
  const porTipo = useMemo(() => {
    const map = { servico: [], peca: [], desloc: [] }
    itens.forEach(it => { const k = it.tipo || 'servico'; (map[k] || map.servico).push(it) })
    return map
  }, [itens])

  const subtotais = useMemo(() => {
    const out = { servico: 0, peca: 0, desloc: 0 }
    Object.entries(porTipo).forEach(([k, arr]) => {
      out[k] = arr.reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valor_unitario) || 0), 0)
    })
    return out
  }, [porTipo])

  const subtotalBruto = subtotais.servico + subtotais.peca + subtotais.desloc

  // Desconto R$ ↔ %
  const [descontoRS, setDescontoRS] = useState(() => Number(os?.desconto || 0))
  useEffect(() => { setDescontoRS(Number(os?.desconto || 0)) }, [os?.desconto])
  const total = Math.max(0, subtotalBruto - descontoRS)

  function aplicarRS(rs)  { setDescontoRS(Math.max(0, Math.min(subtotalBruto, Number(String(rs).replace(',', '.')) || 0))) }
  function aplicarPct(p)  { setDescontoRS(subtotalBruto * (Math.max(0, Math.min(100, Number(String(p).replace(',', '.')) || 0)) / 100)) }
  function persistDesc()  { if (Number(os?.desconto || 0) !== descontoRS) onUpdateOS?.(os.numero, { desconto: descontoRS }) }

  // Auto-lembrete de itens na entrega
  const LEMBRETES = [
    { rx: /\bcapa\b/i,            frase: 'Levar a capa na entrega' },
    { rx: /mangueira.*entrada/i,  frase: 'Levar mangueira de entrada na entrega' },
  ]
  function lembreteParaItem(nome) {
    for (const { rx, frase } of LEMBRETES) if (rx.test(nome || '')) return frase
    return null
  }

  // Cria item direto a partir da row sempre-visivel (NovaItemRow). Os
  // dados ja chegam validados (nome > 0). Dispara lembrete se aplicavel.
  async function handleAddNovo(tipoId, dados) {
    await addItem({ ...dados, tipo: tipoId })
    const lembrete = lembreteParaItem(dados?.nome)
    if (lembrete) {
      const atual = os?.observacoes || ''
      if (!atual.toLowerCase().includes(lembrete.toLowerCase())) {
        onUpdateOS?.(os.numero, { observacoes: atual.trim() ? `${atual.trim()}\n${lembrete}` : lembrete })
      }
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: HIG_SPACE.lg,
      fontFamily: HIG_FONT,
      padding: `0 0 ${HIG_SPACE.md}px`,
    }}>

      {/* 1. Diagnóstico */}
      <ResumoDiagnostico T={T} dark={dark} os={os} />

      {/* 2. Grupos de itens — cada grupo ja tem uma row 'adicionar' sempre
            no final (estilo Bling). Sem botao header, sem placeholder vazio. */}
      {TIPOS.map(tipo => (
        <GrupoItens
          key={tipo.id}
          tipo={tipo}
          itens={porTipo[tipo.id]}
          subtotal={subtotais[tipo.id]}
          T={T} dark={dark}
          onAddNovo={(dados) => handleAddNovo(tipo.id, dados)}
          onRemove={removeItem}
        />
      ))}

      {/* 3. Desconto */}
      <DescontoSection
        T={T} dark={dark}
        subtotalBruto={subtotalBruto}
        descontoRS={descontoRS}
        onChangeRS={aplicarRS}
        onChangePct={aplicarPct}
        onCommit={persistDesc}
        onRemove={() => { setDescontoRS(0); onUpdateOS?.(os.numero, { desconto: 0 }) }}
      />

      {/* 4. Total */}
      <TotalCard T={T} dark={dark} subtotais={subtotais} descontoRS={descontoRS} total={total} />

      {/* 5. Status do orçamento */}
      <StatusOrcamento T={T} dark={dark} os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />

      {/* 6. Recebimento antecipado */}
      <FormRecebimento
        T={T} dark={dark}
        saldo={Math.max(0, total - (os?.valor_pago || 0))}
        onConfirmar={({ valor, forma, modo, taxa_pct, parcelas: parcelasAPrazo }) => {
          const valorAtual = Number(os?.valor_pago || 0)
          const novoValorPago = valorAtual + valor
          let novoPago = 'total'
          let novoDesconto = Number(os?.desconto || 0)
          if (modo === 'parcial') novoPago = 'parcial'
          else if (modo === 'desconto') novoDesconto += Math.max(0, total - valorAtual) - valor
          let novasObs = os?.observacoes
          if (parcelasAPrazo?.length > 0) {
            const txt = parcelasAPrazo.map((p, i) => `${i+1}ª · ${p.data} · ${fmtBRL(p.valor)}`).join('\n')
            novasObs = [os?.observacoes, `— A prazo (${parcelasAPrazo.length} parcela${parcelasAPrazo.length !== 1 ? 's' : ''}) —\n${txt}`].filter(Boolean).join('\n\n')
          }
          onUpdateOS?.(os.numero, {
            valor: total, desconto: novoDesconto, valor_pago: novoValorPago, pago: novoPago,
            forma_pagamento: forma,
            ...(novasObs !== os?.observacoes ? { observacoes: novasObs } : {}),
          })
          persistirLancamentosDoPagamento(os, { valor, forma, taxa_pct, parcelasAPrazo: parcelasAPrazo || [] })
        }}
        onEnviarLink={() => {}}
        onGerarPix={() => {}}
      />

      {/* 7. Ações secundárias */}
      <HIGSection T={T} dark={dark} title="Documentos">
        <button type="button" onClick={() => setDocSheet('pdf')} style={{
          width: '100%', minHeight: HIG_SIZE.listRow,
          padding: `0 ${HIG_SPACE.md}px`,
          border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
          cursor: 'pointer', fontFamily: HIG_FONT,
          WebkitTapHighlightColor: 'transparent',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: dark ? 'rgba(91,155,213,0.15)' : 'rgba(91,155,213,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TI name="file-text" size={16} color={HIG_COLOR.tintIdemaq} />
          </span>
          <span style={{ flex: 1, ...higType('body'), color: T.textPrimary }}>Gerar PDF</span>
          <TI name="chevron-right" size={14} color={T.textDim} />
        </button>
        <Sep T={T} indent={HIG_SPACE.md + 32 + HIG_SPACE.sm} />
        <button type="button" onClick={() => setDocSheet('whats')} style={{
          width: '100%', minHeight: HIG_SIZE.listRow,
          padding: `0 ${HIG_SPACE.md}px`,
          border: 'none', background: 'transparent',
          display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
          cursor: 'pointer', fontFamily: HIG_FONT,
          WebkitTapHighlightColor: 'transparent',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: dark ? 'rgba(52,199,89,0.15)' : 'rgba(52,199,89,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TI name="brand-whatsapp" size={16} color={HIG_COLOR.green} />
          </span>
          <span style={{ flex: 1, ...higType('body'), color: T.textPrimary }}>Enviar pelo WhatsApp</span>
          <TI name="chevron-right" size={14} color={T.textDim} />
        </button>
      </HIGSection>

      {/* ActionSheet para escolher tipo de documento */}
      {docSheet && (
        <ActionSheet
          T={T} dark={dark}
          title={docSheet === 'pdf' ? 'Gerar PDF de…' : 'Enviar pelo WhatsApp…'}
          onClose={() => setDocSheet(null)}
          actions={[
            {
              label: 'Orçamento', icon: 'file-description',
              onClick: () => { onUpdateOS?.(os.numero, { action: docSheet === 'pdf' ? 'gerar_pdf_orcamento' : 'enviar_orcamento_whatsapp' }); setDocSheet(null) },
            },
            {
              label: 'Recibo', icon: 'receipt',
              onClick: () => { onUpdateOS?.(os.numero, { action: docSheet === 'pdf' ? 'gerar_pdf_recibo' : 'enviar_recibo_whatsapp' }); setDocSheet(null) },
            },
          ]}
        />
      )}

    </div>
  )
}
