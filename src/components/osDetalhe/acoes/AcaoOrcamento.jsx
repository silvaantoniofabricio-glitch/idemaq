// src/components/osDetalhe/acoes/AcaoOrcamento.jsx
// Etapa Orçamento — mobile-first, padrão novo (T/dark props, Tabler icons, BlocoAcao).

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { P } from '../../../theme'
import { corEtapa, bgEtapa } from '../../../utils/colors'
import { fmtBRL } from '../../../utils/fmt'
import { useOSItens } from '../../../hooks/useOSItens'
import { usePecas } from '../../../hooks/usePecas'
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

// Sugestões fixas por tipo (Limpeza/Manutenção R$ 165 cada, Deslocamento R$ 20).
// Esses 3 já vêm pré-selecionados em OS novas de atendimento; o autocomplete
// só serve pra re-adicionar se o user removeu por acidente.
const SUGESTOES = {
  servico: [
    { nome: 'Limpeza',    valor: 165 },
    { nome: 'Manutenção', valor: 165 },
  ],
  desloc: [
    { nome: 'Deslocamento', valor: 20 },
  ],
  peca: [],
}

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
  // Autocomplete só pra peças. peca_id é guardado pra rastrear que veio do estoque.
  const [pecaIdSelecionada, setPecaIdSelecionada] = useState(null)
  const [pickerAberto, setPickerAberto] = useState(false)

  const valido = nome.trim().length > 0 && Number(qtd) > 0
  const { fg, bg } = corTipo(tipo, dark)

  function escolherPecaDoEstoque(p) {
    setNome(p.nome || '')
    setValor(p.precoVenda ? String(p.precoVenda) : '')
    setPecaIdSelecionada(p.id)
    setPickerAberto(false)
  }

  function handleSave() {
    if (!valido) return
    const payload = {
      nome: nome.trim(),
      qtd: Number(qtd) || 1,
      valor_unitario: Number(valor) || 0,
      tipo: tipo.id,
    }
    if (tipo.id === 'peca' && pecaIdSelecionada) payload.peca_id = pecaIdSelecionada
    onSave(payload)
  }

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

      {/* Descrição — com autocomplete: peças vêm do estoque; serviço e
          deslocamento vêm das sugestões fixas (Limpeza/Manutenção/Deslocamento). */}
      <div style={{ position: 'relative' }}>
        <Label T={T}>Descrição</Label>
        <Input T={T}
          placeholder={
            tipo.id === 'peca' ? 'Buscar no estoque ou digitar…'
            : tipo.id === 'servico' ? 'Ex: Limpeza, Manutenção…'
            : tipo.id === 'desloc' ? 'Ex: Deslocamento'
            : 'Ex: Troca de correia'
          }
          value={nome}
          onChange={e => {
            setNome(e.target.value)
            setPecaIdSelecionada(null)
            setPickerAberto(true)
          }}
          onFocus={() => setPickerAberto(true)}
          onBlur={() => setTimeout(() => setPickerAberto(false), 200)}
          autoFocus
        />
        {pickerAberto && tipo.id === 'peca' && (
          <PecaPicker T={T} dark={dark} fg={fg}
            termo={nome}
            onEscolher={escolherPecaDoEstoque}
          />
        )}
        {pickerAberto && tipo.id !== 'peca' && (
          <SugestoesPicker T={T} dark={dark} fg={fg}
            sugestoes={SUGESTOES[tipo.id] || []}
            termo={nome}
            onEscolher={(s) => {
              setNome(s.nome)
              setValor(String(s.valor))
              setPickerAberto(false)
            }}
          />
        )}
        {tipo.id === 'peca' && pecaIdSelecionada && (
          <div style={{
            marginTop: 4, fontSize: 10.5, color: fg, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            <i className="ti ti-link" style={{ fontSize: 11 }} aria-hidden="true" />
            Vinculado ao estoque (baixa automática)
          </div>
        )}
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
          onClick={handleSave} disabled={!valido || saving}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Btn>
      </div>
    </div>
  )
}

// Picker simples pra Serviço/Deslocamento — sugestões hardcoded SUGESTOES.
// Filtra pelo termo se houver, senão mostra todas as sugestões do tipo.
function SugestoesPicker({ T, dark, fg, sugestoes, termo, onEscolher }) {
  const t = (termo || '').trim().toLowerCase()
  const matches = t
    ? sugestoes.filter(s => s.nome.toLowerCase().includes(t))
    : sugestoes
  if (matches.length === 0) return null
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, right: 0,
      marginTop: 4, zIndex: 50,
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.2)',
      maxHeight: 200, overflowY: 'auto',
    }}>
      {matches.map((s, i) => (
        <button key={i} type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onEscolher(s)}
          style={{
            width: '100%', textAlign: 'left',
            padding: '10px 12px',
            background: 'transparent', border: 'none',
            borderBottom: i < matches.length - 1 ? `1px solid ${T.border}` : 'none',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
          <div style={{
            flex: 1, fontSize: 13, fontWeight: 600, color: T.textPrimary,
          }}>{s.nome}</div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: fg,
            fontVariantNumeric: 'tabular-nums',
          }}>{fmtBRL(s.valor)}</div>
        </button>
      ))}
    </div>
  )
}

// Picker de peças do estoque — debounce de 250ms, top 8 matches.
// Favoritos vêm primeiro (usePecas já ordena `favorito DESC, nome ASC`).
function PecaPicker({ T, dark, fg, termo, onEscolher }) {
  const [busca, setBusca] = useState(termo)
  useEffect(() => {
    const id = setTimeout(() => setBusca(termo), 250)
    return () => clearTimeout(id)
  }, [termo])
  const { pecas, loading } = usePecas({ busca, pageSize: 8 })
  const cor = (d, c) => dark ? d : c

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, right: 0,
      marginTop: 4, zIndex: 50,
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.2)',
      maxHeight: 240, overflowY: 'auto',
    }}>
      {loading && pecas.length === 0 && (
        <div style={{
          padding: '12px', fontSize: 12, color: T.textMuted,
          textAlign: 'center', fontStyle: 'italic',
        }}>Buscando no estoque…</div>
      )}
      {!loading && pecas.length === 0 && (
        <div style={{
          padding: '12px', fontSize: 12, color: T.textMuted,
          textAlign: 'center', fontStyle: 'italic',
        }}>
          {(termo || '').trim().length === 0
            ? 'Comece a digitar pra buscar peças'
            : 'Nenhuma peça encontrada — pode digitar livre'}
        </div>
      )}
      {pecas.slice(0, 8).map(p => (
        <button key={p.id} type="button"
          onMouseDown={(e) => e.preventDefault()}  // não perder foco antes do click
          onClick={() => onEscolher(p)}
          style={{
            width: '100%', textAlign: 'left',
            padding: '9px 12px',
            background: 'transparent', border: 'none',
            borderBottom: `1px solid ${T.border}`,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
          {p.favorito && (
            <i className="ti ti-star-filled"
               style={{ fontSize: 11, color: cor('#ffcf66', '#d59f00'), flexShrink: 0 }}
               aria-hidden="true" />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.textPrimary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{p.nome}</div>
            <div style={{
              fontSize: 10.5, color: T.textMuted, marginTop: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {p.sku && <span>SKU {p.sku}</span>}
              {p.sku && p.qtdAtual != null && <span> · </span>}
              {p.qtdAtual != null && <span>{p.qtdAtual} em estoque</span>}
            </div>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: fg,
            fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          }}>
            {p.precoVenda > 0 ? fmtBRL(p.precoVenda) : '—'}
          </div>
        </button>
      ))}
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
      {/* Cabeçalho do grupo — botão "+" no final pra economizar a linha
          inteira do antigo "+ Adicionar X" embaixo. */}
      <div style={{
        padding: '8px 6px 8px 14px',
        background: dark ? 'rgba(255,255,255,0.03)' : T.cardAlt,
        borderBottom: !isEmpty ? `1px solid ${T.border}` : 'none',
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
        {adicionandoTipo !== tipo.id && (
          <button
            type="button"
            onClick={() => onAdd(tipo.id)}
            aria-label={`Adicionar ${tipo.label.replace(/s$/, '').toLowerCase()}`}
            title={`Adicionar ${tipo.label.replace(/s$/, '').toLowerCase()}`}
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: bg, border: 'none', color: fg,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
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

    </div>
  )
}

// ─── Card de totais ───────────────────────────────────────────────────────────
function TotaisCard({ T, dark, subtotais, descontoRS, subtotalBruto, total }) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c
  const temDesc = descontoRS > 0

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

      {/* Linha desconto (se houver) */}
      {temDesc && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderTop: `1px solid ${T.border}`,
          fontSize: 13.5, color: T.textSecondary,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="ti ti-tag" style={{ fontSize: 14, color: corEtapa('red', dark) }} aria-hidden="true" />
            <span>Desconto</span>
          </div>
          <span style={{
            fontWeight: 600, color: corEtapa('red', dark),
            fontVariantNumeric: 'tabular-nums',
          }}>
            − {fmtBRL(descontoRS)}
          </span>
        </div>
      )}

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

// ─── Bloco Desconto — mesma visual do GrupoBlock ──────────────────────────────
// Quando vazio: header + botão "+ Adicionar um desconto".
// Ao adicionar: expande 2 campos R$ ↔ % interligados.
function DescontoBlock({
  T, dark,
  subtotalBruto, descontoRS,
  onChangeRS, onChangePct, onCommit, onRemove,
}) {
  const vermelho = corEtapa('red', dark)
  const bgRed = dark ? 'rgba(192,66,66,0.16)' : '#FDECEC'
  const podeAplicar = subtotalBruto > 0
  const ativo = descontoRS > 0
  const [editando, setEditando] = useState(ativo)
  const pct = podeAplicar ? (descontoRS / subtotalBruto * 100) : 0

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Cabeçalho (mesma visual dos GrupoBlock) — botão "+" ou "🗑" na linha */}
      <div style={{
        padding: '8px 6px 8px 14px',
        background: dark ? 'rgba(255,255,255,0.03)' : T.cardAlt,
        borderBottom: editando ? `1px solid ${T.border}` : 'none',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: bgRed, color: vermelho,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-tag" style={{ fontSize: 14 }} aria-hidden="true" />
        </span>
        <span style={{
          flex: 1, fontSize: 12.5, fontWeight: 700, color: T.textPrimary,
        }}>
          Desconto
          {ativo && (
            <span style={{ fontWeight: 400, color: T.textMuted, marginLeft: 5 }}>
              · {pct.toFixed(1).replace('.', ',')}%
            </span>
          )}
        </span>
        {ativo && (
          <span style={{
            fontSize: 14, fontWeight: 700, color: vermelho,
            fontVariantNumeric: 'tabular-nums',
          }}>
            − {fmtBRL(descontoRS)}
          </span>
        )}
        {!editando ? (
          <button
            type="button"
            onClick={() => podeAplicar && setEditando(true)}
            disabled={!podeAplicar}
            aria-label="Adicionar um desconto"
            title="Adicionar um desconto"
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: bgRed, border: 'none', color: vermelho,
              cursor: podeAplicar ? 'pointer' : 'not-allowed',
              opacity: podeAplicar ? 1 : 0.4,
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
        ) : ativo && (
          <button
            type="button"
            onClick={() => { onRemove(); setEditando(false) }}
            aria-label="Remover desconto"
            title="Remover desconto"
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'transparent', border: `1px solid ${T.border}`,
              color: T.textMuted, cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Campos R$ ↔ % (quando editando) */}
      {editando && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          padding: '12px 14px',
        }}>
          <DescontoCampo
            T={T} dark={dark}
            label="Valor" prefix="R$"
            value={descontoRS > 0 ? Number(descontoRS).toFixed(2).replace('.', ',') : ''}
            onChange={(v) => onChangeRS(String(v).replace(',', '.'))}
            onCommit={onCommit}
            disabled={!podeAplicar}
            accent={vermelho}
          />
          <DescontoCampo
            T={T} dark={dark}
            label="Percentual" suffix="%"
            value={pct > 0 ? pct.toFixed(1).replace('.', ',') : ''}
            onChange={(v) => onChangePct(String(v).replace(',', '.'))}
            onCommit={onCommit}
            disabled={!podeAplicar}
            accent={vermelho}
          />
        </div>
      )}
    </div>
  )
}

function DescontoCampo({ T, dark, label, prefix, suffix, value, onChange, onCommit, disabled, accent }) {
  return (
    <label style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      opacity: disabled ? 0.5 : 1,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.04em',
      }}>{label}</span>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 10px', borderRadius: 7,
        border: `1px solid ${T.border}`,
        background: T.bg,
      }}>
        {prefix && (
          <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>{prefix}</span>
        )}
        <input
          type="text" inputMode="decimal"
          placeholder="0"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          style={{
            flex: 1, minWidth: 0,
            border: 'none', background: 'transparent', outline: 'none',
            color: value ? accent : T.textPrimary,
            fontSize: 14, fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'right',
            fontFamily: 'inherit',
          }}
        />
        {suffix && (
          <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, flexShrink: 0 }}>{suffix}</span>
        )}
      </div>
    </label>
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
  const [escolherTipo, setEscolherTipo] = useState({ acao: null, open: false })
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

  const subtotalBruto = subtotais.servico + subtotais.peca + subtotais.desloc

  // Desconto interligado R$↔% — persiste em os.desconto (coluna text/decimal).
  // Re-hidrata se os.desconto mudar (Realtime). Persist debounced em onBlur
  // pra evitar 1 UPDATE por keystroke.
  const [descontoRS, setDescontoRS] = useState(() => Number(os?.desconto || 0))
  useEffect(() => {
    setDescontoRS(Number(os?.desconto || 0))
  }, [os?.desconto])

  const total = Math.max(0, subtotalBruto - descontoRS)

  function aplicarDescontoRS(rs) {
    const v = Math.max(0, Math.min(subtotalBruto, Number(rs) || 0))
    setDescontoRS(v)
  }
  function aplicarDescontoPct(pct) {
    const p = Math.max(0, Math.min(100, Number(pct) || 0))
    setDescontoRS(subtotalBruto * (p / 100))
  }
  function persistDesconto() {
    if (Number(os?.desconto || 0) === descontoRS) return
    onUpdateOS?.(os.numero, { desconto: descontoRS })
  }

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

      {/* Bloco Desconto — mesma visual dos GrupoBlock acima.
          Vazio: só mostra "+ Adicionar um desconto". Ativo: 2 campos R$↔%. */}
      <DescontoBlock
        T={T} dark={dark}
        subtotalBruto={subtotalBruto}
        descontoRS={descontoRS}
        onChangeRS={aplicarDescontoRS}
        onChangePct={aplicarDescontoPct}
        onCommit={persistDesconto}
        onRemove={() => { setDescontoRS(0); onUpdateOS?.(os.numero, { desconto: 0 }) }}
      />

      {/* Totais */}
      <TotaisCard
        T={T} dark={dark}
        subtotais={subtotais}
        descontoRS={descontoRS}
        subtotalBruto={subtotalBruto}
        total={total}
      />

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

      {/* Ações secundárias — Gerar PDF e Enviar WhatsApp abrem modal pra
          escolher entre Orçamento ou Recibo. Botão "Enviar por WhatsApp"
          standalone foi removido (substituído pelo botão WhatsApp acima). */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Btn T={T} dark={dark} icon="ti-file-text"
          onClick={() => setEscolherTipo({ acao: 'pdf', open: true })}>
          Gerar PDF
        </Btn>
        <Btn T={T} dark={dark} icon="ti-brand-whatsapp"
          onClick={() => setEscolherTipo({ acao: 'whats', open: true })}>
          Enviar WhatsApp
        </Btn>
      </div>

      {escolherTipo.open && (
        <EscolherDocModal
          T={T} dark={dark}
          acao={escolherTipo.acao}
          onClose={() => setEscolherTipo({ acao: null, open: false })}
          onEscolher={(tipo) => {
            const action = escolherTipo.acao === 'pdf'
              ? (tipo === 'orcamento' ? 'gerar_pdf_orcamento' : 'gerar_pdf_recibo')
              : (tipo === 'orcamento' ? 'enviar_orcamento_whatsapp' : 'enviar_recibo_whatsapp')
            onUpdateOS?.(os.numero, { action })
            setEscolherTipo({ acao: null, open: false })
          }}
        />
      )}
    </BlocoAcao>
  )
}

// Sheet inline pra escolher entre "Orçamento" e "Recibo".
// Usado tanto pelo "Gerar PDF" quanto pelo "Enviar WhatsApp".
function EscolherDocModal({ T, dark, acao, onClose, onEscolher }) {
  const titulo = acao === 'pdf' ? 'Gerar PDF de…' : 'Enviar pelo WhatsApp…'
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: T.card,
          borderRadius: '16px 16px 0 0',
          padding: '14px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T.border }} />
        </div>
        <div style={{
          fontSize: 15, fontWeight: 700, color: T.textPrimary,
          textAlign: 'center', marginBottom: 4,
        }}>{titulo}</div>

        <button onClick={() => onEscolher('orcamento')}
          style={escolhaBtnStyle(T, dark, azul)}>
          <i className="ti ti-file-description" style={{ fontSize: 22, color: azul }} aria-hidden="true" />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>Orçamento</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              Antes de receber o pagamento — pra cliente aprovar
            </div>
          </div>
        </button>

        <button onClick={() => onEscolher('recibo')}
          style={escolhaBtnStyle(T, dark, verde)}>
          <i className="ti ti-receipt" style={{ fontSize: 22, color: verde }} aria-hidden="true" />
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>Recibo</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              Após o pagamento — comprovante pro cliente
            </div>
          </div>
        </button>

        <button onClick={onClose}
          style={{
            padding: '10px', borderRadius: 8,
            background: 'transparent', border: `1px solid ${T.border}`,
            color: T.textMuted, fontWeight: 600, fontSize: 13,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function escolhaBtnStyle(T, dark, accent) {
  return {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 16px', borderRadius: 10,
    background: dark ? 'rgba(255,255,255,0.04)' : T.cardAlt,
    border: `1px solid ${T.border}`,
    fontFamily: 'inherit', cursor: 'pointer',
    textAlign: 'left', minHeight: 60,
  }
}
