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
import { corEtapa } from '../../../utils/colors'
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

// ═══════════════════════════════════════════════════════════════════════════
// Estilo Atlassian Design — substitui HIGSection no orçamento (deploy v2)
// ═══════════════════════════════════════════════════════════════════════════

const ATL_RADIUS = 4
const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'

function atlSurfaceSunken(dark) {
  return dark ? 'rgba(255,255,255,0.025)' : '#F7F8F9'
}
function atlHover(dark) {
  return dark ? 'rgba(255,255,255,0.04)' : 'rgba(9,30,66,0.04)'
}

// Card/panel Atlassian — borda + sombra sutil, radius 4, header com hairline
function AtlPanel({ T, dark, title, action, count, footer, children, accent }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: ATL_RADIUS,
      overflow: 'hidden',
      fontFamily: ATL_FONT,
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      {(title || action) && (
        <div style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
          background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
        }}>
          {accent && (
            <div style={{
              width: 3, alignSelf: 'stretch', borderRadius: 99,
              background: accent, minHeight: 14, flexShrink: 0,
            }} />
          )}
          <div style={{
            fontSize: 13, fontWeight: 600, color: T.textPrimary,
            letterSpacing: '-0.005em', flex: 1,
          }}>
            {title}
          </div>
          {count != null && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: T.textMuted,
              background: dark ? 'rgba(255,255,255,0.07)' : '#DFE1E6',
              padding: '2px 7px', borderRadius: 99,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {count}
            </span>
          )}
          {action}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div style={{
          padding: '8px 14px',
          borderTop: `1px solid ${T.border}`,
          background: atlSurfaceSunken(dark),
          fontSize: 12, color: T.textMuted,
        }}>
          {footer}
        </div>
      )}
    </div>
  )
}

// Botão de texto Atlassian (link primário)
function AtlTextButton({ T, dark, onClick, icon, children, disabled }) {
  const azul = corEtapa('blue', dark)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent', border: 'none',
        padding: '4px 6px', borderRadius: 3,
        fontSize: 12.5, fontWeight: 500,
        color: disabled ? T.textDim : azul,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        WebkitTapHighlightColor: 'transparent',
      }}>
      {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 13 }} aria-hidden="true" />}
      {children}
    </button>
  )
}

// Sub-header dentro do panel (separa Serviços/Peças/Deslocamento)
function AtlSubHeader({ T, dark, label, valor, first }) {
  return (
    <div style={{
      padding: '10px 14px 6px',
      borderTop: first ? 'none' : `1px solid ${T.border}`,
      display: 'flex', alignItems: 'center', gap: 8,
      background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
    }}>
      <span style={{
        fontSize: 10.5, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        flex: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 600, color: T.textPrimary,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtBRL(valor || 0)}
      </span>
    </div>
  )
}

// Row de item (modo display) — hover sutil + remover só no hover
function AtlItemRow({ T, dark, item, tipo, onRemove }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: hover ? atlHover(dark) : 'transparent',
        transition: 'background .12s',
      }}>
      <div style={{
        width: 24, height: 24, borderRadius: 4,
        background: bgFor(tipo.color, dark),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <TI name={tipo.icon} size={12} color={tipo.color} />
      </div>
      <div style={{
        flex: 1, minWidth: 0,
        fontSize: 13, color: T.textPrimary,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        letterSpacing: '-0.005em',
      }}>
        {item.nome || <span style={{ color: T.textDim, fontStyle: 'italic' }}>Sem nome</span>}
      </div>
      <div style={{
        fontSize: 12, color: T.textMuted,
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0, minWidth: 24, textAlign: 'right',
      }}>
        {item.qtd || 1}×
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: T.textPrimary,
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0, minWidth: 76, textAlign: 'right',
      }}>
        {fmtBRL((item.qtd || 1) * (item.valor_unitario || 0))}
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover item"
        style={{
          width: 24, height: 24, borderRadius: 3,
          border: 'none', background: 'transparent',
          color: T.textMuted, cursor: 'pointer',
          opacity: hover ? 1 : 0,
          transition: 'opacity .12s, background .12s',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
        <TI name="trash" size={13} color={T.textMuted} />
      </button>
    </div>
  )
}

// Row sempre presente pra adicionar novo item (estilo Atlassian inline)
function AtlNovoItemRow({ T, dark, tipo, onAdd }) {
  const [nome, setNome] = useState('')
  const [qtd, setQtd] = useState('1')
  const [valor, setValor] = useState('')
  const [focusado, setFocusado] = useState(false)
  const containerRef = useRef(null)
  const flushedRef = useRef(false)

  const valido = nome.trim().length > 0
  const azul = corEtapa('blue', dark)

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
    setFocusado(false)
    flush()
  }

  const inStyle = {
    border: 'none', background: 'transparent', outline: 'none',
    fontSize: 13, color: T.textPrimary,
    fontVariantNumeric: 'tabular-nums',
    fontFamily: 'inherit',
  }

  const placeholder = tipo.id === 'peca'
    ? 'Adicionar peça…'
    : tipo.id === 'desloc'
      ? 'Adicionar deslocamento…'
      : 'Adicionar serviço…'

  return (
    <div
      ref={containerRef}
      onFocus={() => setFocusado(true)}
      onBlur={handleBlur}
      style={{
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: focusado
          ? (dark ? 'rgba(91,155,213,0.06)' : 'rgba(91,155,213,0.04)')
          : 'transparent',
        borderTop: `1px dashed ${T.border}`,
        transition: 'background .12s',
      }}>
      <div style={{
        width: 24, height: 24, borderRadius: 4,
        background: focusado ? bgFor(tipo.color, dark) : 'transparent',
        border: `1px dashed ${focusado ? 'transparent' : T.border}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'background .12s, border-color .12s',
      }}>
        <TI name="plus" size={11} color={focusado ? tipo.color : T.textDim} />
      </div>

      <input
        type="text"
        placeholder={placeholder}
        value={nome}
        onChange={e => setNome(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); flush() }
          if (e.key === 'Escape') { setNome(''); setValor(''); e.currentTarget.blur() }
        }}
        style={{ ...inStyle, flex: 1, minWidth: 0, textOverflow: 'ellipsis' }}
      />

      {/* Qtd/Valor so aparecem depois que comecou a digitar — assim o
          placeholder do nome usa toda a largura disponivel. */}
      {valido && (
        <>
          <input
            type="number" min="1"
            value={qtd}
            onChange={e => setQtd(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); flush() } }}
            style={{ ...inStyle, width: 30, textAlign: 'right' }}
          />
          <span style={{ fontSize: 11, color: T.textMuted, marginLeft: -4, opacity: 0.7 }}>×</span>

          <div style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 2,
            minWidth: 76, justifyContent: 'flex-end',
          }}>
            <span style={{ fontSize: 11, color: T.textMuted }}>R$</span>
            <input
              type="number" min="0" step="0.01" placeholder="0"
              value={valor}
              onChange={e => setValor(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); flush() } }}
              style={{ ...inStyle, width: 60, textAlign: 'right' }}
            />
          </div>
        </>
      )}

      <span style={{ width: 24, flexShrink: 0 }} aria-hidden="true" />
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

// ─── Diagnóstico em panel Atlassian ───────────────────────────────────────
function AtlDiagnosticoCard({ T, dark, os }) {
  const relato = (os?.observacoes || '').trim()
  if (!relato) return null
  return (
    <AtlPanel T={T} dark={dark} title="Diagnóstico" accent="#FFCC00">
      <div style={{ padding: '12px 14px' }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 5,
        }}>
          Relato do cliente
        </div>
        <p style={{
          fontSize: 13.5, color: T.textPrimary, margin: 0,
          lineHeight: 1.5, whiteSpace: 'pre-wrap',
          letterSpacing: '-0.005em',
        }}>{relato}</p>
      </div>
    </AtlPanel>
  )
}

// ─── Itens do orçamento em panel Atlassian (3 sub-grupos) ────────────────
function AtlItensCard({ T, dark, itens, porTipo, subtotais, onAddNovo, onRemove }) {
  const totalItens = itens.length

  return (
    <AtlPanel T={T} dark={dark}
      title="Itens do orçamento"
      count={totalItens > 0 ? totalItens : undefined}
    >
      {TIPOS.map((tipo, idxTipo) => {
        const arr = porTipo[tipo.id] || []
        return (
          <React.Fragment key={tipo.id}>
            <AtlSubHeader
              T={T} dark={dark}
              label={tipo.label}
              valor={subtotais[tipo.id]}
              first={idxTipo === 0}
            />
            {arr.map(it => (
              <AtlItemRow
                key={it.id}
                T={T} dark={dark} tipo={tipo}
                item={it}
                onRemove={() => onRemove(it.id)}
              />
            ))}
            <AtlNovoItemRow
              T={T} dark={dark} tipo={tipo}
              onAdd={(dados) => onAddNovo(tipo.id, dados)}
            />
          </React.Fragment>
        )
      })}
    </AtlPanel>
  )
}

// ─── Desconto em panel Atlassian ──────────────────────────────────────────
function AtlDescontoCard({ T, dark, subtotalBruto, descontoRS, onChangeRS, onChangePct, onCommit, onRemove }) {
  const podeAplicar = subtotalBruto > 0
  const ativo = descontoRS > 0
  const [editando, setEditando] = useState(ativo)
  const pct = podeAplicar ? (descontoRS / subtotalBruto * 100) : 0
  const azul = corEtapa('blue', dark)

  const action = !editando ? (
    <AtlTextButton
      T={T} dark={dark}
      onClick={() => podeAplicar && setEditando(true)}
      disabled={!podeAplicar}
      icon="plus">
      Aplicar
    </AtlTextButton>
  ) : ativo ? (
    <AtlTextButton
      T={T} dark={dark}
      onClick={() => { onRemove(); setEditando(false) }}
      icon="x">
      Remover
    </AtlTextButton>
  ) : null

  return (
    <AtlPanel T={T} dark={dark} title="Desconto" action={action}>
      {editando ? (
        <div style={{
          padding: '10px 14px',
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>R$</span>
            <input
              type="number" min="0" step="0.01"
              value={descontoRS || ''}
              onChange={e => onChangeRS(e.target.value)}
              onBlur={onCommit}
              placeholder="0,00"
              style={{
                flex: 1, padding: '4px 6px',
                border: `1px solid ${T.border}`, borderRadius: 3,
                background: T.card, color: T.textPrimary,
                fontSize: 13, outline: 'none', fontFamily: 'inherit',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <input
              type="number" min="0" max="100" step="0.1"
              value={pct ? pct.toFixed(1) : ''}
              onChange={e => onChangePct(e.target.value)}
              onBlur={onCommit}
              placeholder="0"
              style={{
                width: 48, padding: '4px 6px',
                border: `1px solid ${T.border}`, borderRadius: 3,
                background: T.card, color: T.textPrimary,
                fontSize: 13, outline: 'none', fontFamily: 'inherit',
                fontVariantNumeric: 'tabular-nums', textAlign: 'right',
              }}
            />
            <span style={{ fontSize: 12, color: T.textMuted }}>%</span>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '12px 14px',
          fontSize: 13, color: ativo ? T.textPrimary : T.textMuted,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {ativo
            ? (
              <>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  −{fmtBRL(descontoRS)}
                </span>
                <span style={{ fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {pct.toFixed(1)}%
                </span>
              </>
            )
            : <span style={{ fontStyle: 'italic' }}>Nenhum desconto aplicado</span>}
        </div>
      )}
    </AtlPanel>
  )
}

// ─── Botão Atlassian (primary/subtle/default) ─────────────────────────────
function AtlButton({ T, dark, variant = 'default', icon, onClick, disabled, children, fullWidth }) {
  const [hover, setHover] = useState(false)
  const azul = corEtapa('blue', dark)

  const styles = variant === 'primary'
    ? {
        background: hover ? '#4a8bc8' : azul,
        color: '#fff',
        border: 'none',
      }
    : variant === 'subtle'
      ? {
          background: hover ? atlHover(dark) : 'transparent',
          color: azul,
          border: 'none',
        }
      : {
          background: hover
            ? (dark ? 'rgba(255,255,255,0.08)' : '#EBECF0')
            : (dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7'),
          color: T.textPrimary,
          border: `1px solid ${T.border}`,
        }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles,
        padding: '7px 12px', borderRadius: 3,
        fontSize: 13.5, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: ATL_FONT,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        width: fullWidth ? '100%' : undefined,
        minHeight: 32, letterSpacing: '-0.005em',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s',
      }}>
      {icon && <i className={`ti ti-${icon}`} style={{ fontSize: 14 }} aria-hidden="true" />}
      {children}
    </button>
  )
}

// ─── Card de totais em padrão Atlassian ───────────────────────────────────
function AtlTotalCard({ T, dark, subtotais, descontoRS, total }) {
  const temDesc = descontoRS > 0
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)

  return (
    <AtlPanel T={T} dark={dark} title="Resumo">
      {TIPOS.map((t, i) => {
        const v = subtotais[t.id] || 0
        return (
          <div key={t.id} style={{
            padding: '8px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 4,
              background: bgFor(t.color, dark),
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <TI name={t.icon} size={11} color={t.color} />
            </div>
            <span style={{ flex: 1, fontSize: 13, color: T.textPrimary }}>{t.label}</span>
            <span style={{
              fontSize: 13, fontWeight: v > 0 ? 600 : 400,
              color: v > 0 ? T.textPrimary : T.textMuted,
              fontVariantNumeric: 'tabular-nums',
            }}>{fmtBRL(v)}</span>
          </div>
        )
      })}

      {temDesc && (
        <div style={{
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderTop: `1px solid ${T.border}`,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 4,
            background: vermelho + '22',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-tag" style={{ fontSize: 11, color: vermelho }} aria-hidden="true" />
          </div>
          <span style={{ flex: 1, fontSize: 13, color: vermelho }}>Desconto</span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: vermelho,
            fontVariantNumeric: 'tabular-nums',
          }}>− {fmtBRL(descontoRS)}</span>
        </div>
      )}

      {/* Total destacado */}
      <div style={{
        padding: '14px',
        borderTop: `1px solid ${T.border}`,
        background: dark ? 'rgba(91,155,213,0.06)' : 'rgba(91,155,213,0.04)',
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Total</span>
        <span style={{
          fontSize: 26, fontWeight: 700, color: azul,
          fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        }}>{fmtBRL(total)}</span>
      </div>
    </AtlPanel>
  )
}

// ─── Status do orçamento em padrão Atlassian ──────────────────────────────
function AtlStatusOrcamento({ os, onUpdateOS, onMoverOS, T, dark }) {
  const statusSalvo = os?.pre_diagnostico?.orcamento_status || os?.orcamento_status || 'idle'
  const [status, setStatus] = useState(statusSalvo)
  const [fase, setFase] = useState('normal') // 'normal' | 'confirmar' | 'desfazer'
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)
  const amarelo = corEtapa('yellow', dark)

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

  // Estado de confirmar resposta do cliente
  if (fase === 'confirmar') {
    return (
      <AtlPanel T={T} dark={dark} title="Resposta do cliente">
        <div style={{
          padding: 14,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        }}>
          <button type="button" onClick={() => resolver('recusado')} style={{
            padding: '14px 8px', borderRadius: 4,
            background: dark ? 'rgba(192,66,66,0.10)' : '#FEF0EF',
            border: `1px solid ${vermelho}33`,
            color: vermelho, cursor: 'pointer', fontFamily: ATL_FONT,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <i className="ti ti-x" style={{ fontSize: 20 }} aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Recusado</span>
          </button>
          <button type="button" onClick={() => resolver('confirmado')} style={{
            padding: '14px 8px', borderRadius: 4,
            background: dark ? 'rgba(60,140,80,0.10)' : '#E8F9EE',
            border: `1px solid ${verde}33`,
            color: verde, cursor: 'pointer', fontFamily: ATL_FONT,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <i className="ti ti-check" style={{ fontSize: 20 }} aria-hidden="true" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Aprovado</span>
          </button>
        </div>
        <div style={{
          padding: '8px 14px', borderTop: `1px solid ${T.border}`,
          background: atlSurfaceSunken(dark), textAlign: 'center',
        }}>
          <AtlTextButton T={T} dark={dark} onClick={() => setFase('normal')}>
            Cancelar
          </AtlTextButton>
        </div>
      </AtlPanel>
    )
  }

  // Estado de desfazer
  if (fase === 'desfazer') {
    return (
      <AtlPanel T={T} dark={dark} title="Reabrir orçamento">
        <div style={{ padding: 14 }}>
          <p style={{
            fontSize: 13, color: T.textMuted, margin: '0 0 12px',
            lineHeight: 1.5, letterSpacing: '-0.005em',
          }}>
            {status === 'confirmado'
              ? 'A OS volta pra etapa Orçamento e o status fica como "Aguardando resposta".'
              : 'O status volta pra "Aguardando resposta" — você pode reabrir a decisão.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <AtlButton T={T} dark={dark} variant="default" onClick={() => setFase('normal')}>
              Cancelar
            </AtlButton>
            <AtlButton T={T} dark={dark} variant="primary" icon="arrow-back-up" onClick={reverter}>
              Reabrir
            </AtlButton>
          </div>
        </div>
      </AtlPanel>
    )
  }

  // Estado normal — banner com status + ação
  const cfg = {
    idle: {
      icon: 'send', label: 'Enviar orçamento ao cliente',
      cor: azul, sub: 'Quando o cliente receber, marque como aguardando resposta.',
    },
    aguardando: {
      icon: 'clock', label: 'Aguardando resposta',
      cor: amarelo, sub: 'Toque pra registrar se o cliente aprovou ou recusou.',
    },
    confirmado: {
      icon: 'circle-check', label: 'Orçamento aprovado',
      cor: verde, sub: 'OS avançou pra oficina. Toque pra reabrir se precisar.',
    },
    recusado: {
      icon: 'circle-x', label: 'Orçamento recusado',
      cor: vermelho, sub: 'Toque pra reabrir se o cliente reconsiderar.',
    },
  }
  const c = cfg[status] || cfg.idle
  const resolvido = status === 'confirmado' || status === 'recusado'

  function handleClick() {
    if (status === 'idle') { setStatus('aguardando'); persistir('aguardando') }
    else if (status === 'aguardando') setFase('confirmar')
    else if (resolvido) setFase('desfazer')
  }

  return (
    <AtlPanel T={T} dark={dark}>
      <button
        type="button"
        onClick={handleClick}
        style={{
          width: '100%', padding: '14px',
          background: 'transparent', border: 'none',
          cursor: 'pointer', fontFamily: ATL_FONT,
          display: 'flex', alignItems: 'center', gap: 12,
          textAlign: 'left',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <div style={{
          width: 36, height: 36, borderRadius: 4,
          background: c.cor + '22', color: c.cor,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className={`ti ti-${c.icon}`} style={{ fontSize: 18 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 600, color: c.cor,
            letterSpacing: '-0.005em',
          }}>{c.label}</div>
          <div style={{
            fontSize: 12, color: T.textMuted, marginTop: 2,
            lineHeight: 1.35,
          }}>{c.sub}</div>
        </div>
        <i className="ti ti-chevron-right" style={{
          fontSize: 14, color: T.textDim, flexShrink: 0,
        }} aria-hidden="true" />
      </button>
    </AtlPanel>
  )
}

// ─── Documentos (PDF/WhatsApp) em padrão Atlassian ────────────────────────
function AtlDocumentosCard({ T, dark, onPdf, onWhats }) {
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)

  const items = [
    { id: 'pdf',   icon: 'file-text', cor: azul,  label: 'Gerar PDF',           sub: 'Compartilhe o orçamento por e-mail ou impresso.', onClick: onPdf },
    { id: 'whats', icon: 'brand-whatsapp', cor: verde, label: 'Enviar pelo WhatsApp', sub: 'Mande direto pro cliente via mensagem.', onClick: onWhats },
  ]

  return (
    <AtlPanel T={T} dark={dark} title="Documentos">
      {items.map((it, i) => (
        <button
          key={it.id}
          type="button"
          onClick={it.onClick}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
            background: 'transparent', border: 'none',
            cursor: 'pointer', fontFamily: ATL_FONT,
            display: 'flex', alignItems: 'center', gap: 10,
            textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <div style={{
            width: 28, height: 28, borderRadius: 4,
            background: it.cor + '22', color: it.cor,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className={`ti ti-${it.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.textPrimary,
              letterSpacing: '-0.005em',
            }}>{it.label}</div>
            <div style={{
              fontSize: 11.5, color: T.textMuted, marginTop: 1,
            }}>{it.sub}</div>
          </div>
          <i className="ti ti-chevron-right" style={{
            fontSize: 13, color: T.textDim, flexShrink: 0,
          }} aria-hidden="true" />
        </button>
      ))}
    </AtlPanel>
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

      {/* 1. Diagnóstico — Atlassian panel */}
      <AtlDiagnosticoCard T={T} dark={dark} os={os} />

      {/* 2. Itens — Atlassian panel com 3 sub-grupos (Servicos/Pecas/Desloc),
            cada um com sub-header (label + subtotal) e row sempre-presente
            pra adicionar. */}
      <AtlItensCard
        T={T} dark={dark}
        itens={itens}
        porTipo={porTipo}
        subtotais={subtotais}
        onAddNovo={handleAddNovo}
        onRemove={removeItem}
      />

      {/* 3. Desconto — Atlassian panel */}
      <AtlDescontoCard
        T={T} dark={dark}
        subtotalBruto={subtotalBruto}
        descontoRS={descontoRS}
        onChangeRS={aplicarRS}
        onChangePct={aplicarPct}
        onCommit={persistDesc}
        onRemove={() => { setDescontoRS(0); onUpdateOS?.(os.numero, { desconto: 0 }) }}
      />

      {/* 4. Total — Atlassian panel */}
      <AtlTotalCard T={T} dark={dark} subtotais={subtotais} descontoRS={descontoRS} total={total} />

      {/* 5. Status do orçamento — Atlassian panel */}
      <AtlStatusOrcamento T={T} dark={dark} os={os} onUpdateOS={onUpdateOS} onMoverOS={onMoverOS} />

      {/* 6. Recebimento antecipado — envolvido em AtlPanel pra consistencia
            visual com os outros cards. FormRecebimento mantem layout interno
            (compartilhado com etapa Pagamento). */}
      <AtlPanel T={T} dark={dark} title="Recebimento antecipado">
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
      </AtlPanel>

      {/* 7. Documentos — Atlassian panel */}
      <AtlDocumentosCard
        T={T} dark={dark}
        onPdf={() => setDocSheet('pdf')}
        onWhats={() => setDocSheet('whats')}
      />

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
