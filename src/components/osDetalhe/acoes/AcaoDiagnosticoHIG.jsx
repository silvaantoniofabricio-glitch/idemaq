// src/components/osDetalhe/acoes/AcaoDiagnosticoHIG.jsx
// Diagnóstico — Apple HIG, do zero.
//
// Seções:
//   1. Relato do cliente (texto da OS)
//   2. Resumo da avaliação (testes, nao liga, vazamentos vindos do recebido)
//   3. Causa identificada (textarea + autocomplete localStorage)
//   4. Componentes afetados (grupos como list rows → accordion com itens
//      Troca / Manutenção por item)
//   5. CTA 50pt "Concluir diagnóstico"
//
// Persiste:
//   · os.pre_diagnostico.causa_diagnostico
//   · os.pre_diagnostico.componentes_marcados { [grupoId]: { [itemId]: 'troca'|'manutencao' } }
//   · localStorage idemaq:diagnostico:causas_historico (autocomplete)

import React, { useState, useMemo, useEffect } from 'react'
import { useTheme } from '../../../theme'
import { TI } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR, HIG_FONT,
  higType, higFilledButton, higInsetCard,
} from '../../../theme-hig'
import { CATEGORIAS_PECA, GRUPOS_CATEGORIA } from '../../../utils/categoriasPeca'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'

// ─── Dados dos grupos de componentes ─────────────────────────────────────
const ICON_MAP = {
  motor:      'engine',
  agua:       'droplet',
  eletrico:   'bolt',
  estrutura:  'tool',
  acabamento: 'package',
  outros:     'puzzle',
}

const GRUPOS = Object.entries(GRUPOS_CATEGORIA).map(([id, g]) => ({
  id,
  label: g.label,
  icon: ICON_MAP[id] || 'tool',
  itens: CATEGORIAS_PECA.filter(c => c.grupo === id).map(c => ({ id: c.id, label: c.label })),
}))

// Mapeamento visual dos resultados da avaliação
const RESULTADO_VISUAL = {
  ok:      { label: 'OK',      color: HIG_COLOR.green,  icon: 'check',          bgLight: '#E8F9EE', bgDark: 'rgba(52,199,89,0.15)'  },
  defeito: { label: 'Defeito', color: HIG_COLOR.red,    icon: 'alert-triangle', bgLight: '#FEF0EF', bgDark: 'rgba(255,59,48,0.15)'  },
  barulho: { label: 'Barulho', color: HIG_COLOR.orange, icon: 'volume',         bgLight: '#FFF5E6', bgDark: 'rgba(255,149,0,0.15)'  },
  na:      { label: 'N/A',     color: HIG_COLOR.gray,   icon: 'minus',          bgLight: '#F2F2F7', bgDark: 'rgba(142,142,147,0.15)' },
}

// ─── Autocomplete ─────────────────────────────────────────────────────────
const CAUSAS_KEY = 'idemaq:diagnostico:causas_historico'
const CAUSAS_MAX = 80

function lerCausas() {
  try {
    const arr = JSON.parse(localStorage.getItem(CAUSAS_KEY) || '[]')
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []
  } catch { return [] }
}

function salvarCausa(frase) {
  const f = (frase || '').trim()
  if (f.length < 4) return
  try {
    const atual = lerCausas()
    const novo = [f, ...atual.filter(x => x.toLowerCase() !== f.toLowerCase())].slice(0, CAUSAS_MAX)
    localStorage.setItem(CAUSAS_KEY, JSON.stringify(novo))
  } catch {}
}

// ─── Migração de formato antigo (array → objeto) ─────────────────────────
function normalizeMarcados(raw) {
  const out = {}
  for (const [grupoId, val] of Object.entries(raw || {})) {
    if (Array.isArray(val))
      out[grupoId] = Object.fromEntries(val.map(id => [id, 'troca']))
    else if (val && typeof val === 'object')
      out[grupoId] = val
    else
      out[grupoId] = {}
  }
  return out
}

// ─── HIGSection ───────────────────────────────────────────────────────────
function HIGSection({ T, dark, title, children, footer }) {
  return (
    <section>
      <div style={{
        ...higType('footnote'),
        color: T.textMuted,
        textTransform: 'uppercase',
        padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
        letterSpacing: 0.5,
      }}>
        {title}
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

// ─── Badge de resultado (pill colorida) ──────────────────────────────────
function ResultBadge({ valor, dark }) {
  const v = RESULTADO_VISUAL[valor]
  if (!v) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 999,
      background: dark ? v.bgDark : v.bgLight,
      color: v.color,
      ...higType('caption1'),
      fontWeight: 700,
      flexShrink: 0,
    }}>
      <TI name={v.icon} size={11} color={v.color} />
      {v.label}
    </span>
  )
}

// ─── Row de grupo (accordion header) ─────────────────────────────────────
function GrupoRow({ T, dark, grupo, marcados, open, onToggle }) {
  const count = Object.keys(marcados).length
  const temMarcado = count > 0

  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%', minHeight: HIG_SIZE.listRow,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        border: 'none',
        background: open
          ? (dark ? 'rgba(91,155,213,0.08)' : 'rgba(91,155,213,0.06)')
          : 'transparent',
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        cursor: 'pointer', textAlign: 'left', fontFamily: HIG_FONT,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s',
      }}
    >
      {/* Ícone em badge */}
      <span style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: temMarcado
          ? (dark ? 'rgba(91,155,213,0.18)' : 'rgba(91,155,213,0.12)')
          : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.055)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .15s',
      }}>
        <TI name={grupo.icon} size={16}
          color={temMarcado ? HIG_COLOR.tintIdemaq : HIG_COLOR.gray} />
      </span>

      {/* Label */}
      <span style={{ flex: 1, ...higType('body'), color: T.textPrimary }}>
        {grupo.label}
      </span>

      {/* Badge de contagem */}
      {temMarcado && (
        <span style={{
          ...higType('caption1'),
          fontWeight: 700,
          color: HIG_COLOR.tintIdemaq,
          background: dark ? 'rgba(91,155,213,0.15)' : 'rgba(91,155,213,0.10)',
          padding: '2px 8px', borderRadius: 999,
        }}>
          {count}
        </span>
      )}

      {/* Chevron rotacionado quando aberto */}
      <TI
        name="chevron-right"
        size={14}
        color={T.textDim}
        style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}
      />
    </button>
  )
}

// ─── Row de item com Troca / Manutenção ──────────────────────────────────
function ItemRow({ T, dark, item, acao, onSetAcao, isLast }) {
  const trocoAtivo = acao === 'troca'
  const manutAtivo = acao === 'manutencao'

  return (
    <div style={{
      minHeight: 48,
      padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
      display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
      background: acao
        ? (dark ? 'rgba(91,155,213,0.06)' : 'rgba(91,155,213,0.04)')
        : 'transparent',
      borderTop: `0.5px solid ${T.border}`,
    }}>
      {/* Label do item */}
      <span style={{
        flex: 1, minWidth: 0,
        ...higType('subheadline'),
        color: T.textPrimary,
        fontWeight: acao ? 600 : 400,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {item.label}
      </span>

      {/* Botão Troca */}
      <button
        type="button"
        onClick={() => onSetAcao(item.id, trocoAtivo ? null : 'troca')}
        style={{
          minHeight: 32, padding: '0 12px',
          borderRadius: HIG_RADIUS.card,
          border: `1.5px solid ${trocoAtivo ? HIG_COLOR.red : T.border}`,
          background: trocoAtivo
            ? (dark ? 'rgba(255,59,48,0.15)' : '#FEF0EF')
            : 'transparent',
          color: trocoAtivo ? HIG_COLOR.red : T.textMuted,
          ...higType('caption1'),
          fontWeight: trocoAtivo ? 700 : 500,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          WebkitTapHighlightColor: 'transparent',
          transition: 'background .12s, border-color .12s',
          fontFamily: HIG_FONT,
          flexShrink: 0,
        }}
      >
        <TI name="replace" size={12} color={trocoAtivo ? HIG_COLOR.red : T.textMuted} />
        Troca
      </button>

      {/* Botão Manutenção */}
      <button
        type="button"
        onClick={() => onSetAcao(item.id, manutAtivo ? null : 'manutencao')}
        style={{
          minHeight: 32, padding: '0 12px',
          borderRadius: HIG_RADIUS.card,
          border: `1.5px solid ${manutAtivo ? HIG_COLOR.orange : T.border}`,
          background: manutAtivo
            ? (dark ? 'rgba(255,149,0,0.15)' : '#FFF5E6')
            : 'transparent',
          color: manutAtivo ? HIG_COLOR.orange : T.textMuted,
          ...higType('caption1'),
          fontWeight: manutAtivo ? 700 : 500,
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          WebkitTapHighlightColor: 'transparent',
          transition: 'background .12s, border-color .12s',
          fontFamily: HIG_FONT,
          flexShrink: 0,
        }}
      >
        <TI name="tool" size={12} color={manutAtivo ? HIG_COLOR.orange : T.textMuted} />
        Manut.
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoDiagnosticoHIG({ os, onUpdateOS, onMoverOS }) {
  const { T, dark } = useTheme()

  // ── Estado ───────────────────────────────────────────────────────────────
  const preDiag = os?.pre_diagnostico || {}
  const [causa, setCausa]                   = useState(preDiag.causa_diagnostico || '')
  const [marcadosPorGrupo, setMarcados]     = useState(() => normalizeMarcados(preDiag.componentes_marcados))
  const [grupoAberto, setGrupoAberto]       = useState(null)
  const [busca, setBusca]                   = useState('')
  const [causaFocada, setCausaFocada]       = useState(false)
  const [historicoCausas, setHistorico]     = useState(() => lerCausas())
  const [salvando, setSalvando]             = useState(false)

  // Re-sync quando OS muda (Realtime)
  useEffect(() => {
    setCausa(os?.pre_diagnostico?.causa_diagnostico || '')
    setMarcados(normalizeMarcados(os?.pre_diagnostico?.componentes_marcados))
  }, [os?.id])

  // ── Testes da avaliação anterior ─────────────────────────────────────────
  const { itens: chkRecebido } = useChecklistEtapa(os.id, 'recebido')
  const testesComResultado = useMemo(
    () => (chkRecebido || []).filter(t => t.valor && t.valor !== 'na'),
    [chkRecebido]
  )
  const naoLiga   = !!preDiag.equipamento_nao_liga
  const vazamentos = preDiag.vazamentos || {}
  const locaisVaz  = [
    vazamentos.entrada  && 'Entrada',
    vazamentos.agitacao && 'Agitação',
    vazamentos.saida    && 'Saída',
  ].filter(Boolean)

  // ── Itens filtrados do grupo aberto ──────────────────────────────────────
  const itensDoGrupo = useMemo(() => {
    if (!grupoAberto) return []
    const base = GRUPOS.find(g => g.id === grupoAberto)?.itens || []
    if (!busca.trim()) return base
    return base.filter(i => i.label.toLowerCase().includes(busca.toLowerCase()))
  }, [grupoAberto, busca])

  // ── Auto-save componentes (debounce 400ms) ────────────────────────────────
  useEffect(() => {
    if (!os?.id) return
    const salvoServ = normalizeMarcados(os?.pre_diagnostico?.componentes_marcados)
    if (JSON.stringify(salvoServ) === JSON.stringify(marcadosPorGrupo)) return
    const t = setTimeout(() => {
      onUpdateOS?.(os.numero, {
        pre_diagnostico: { ...preDiag, componentes_marcados: marcadosPorGrupo },
      })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcadosPorGrupo, os?.id])

  // ── Autocomplete ──────────────────────────────────────────────────────────
  const sugestoes = useMemo(() => {
    const q = causa.trim().toLowerCase()
    const base = historicoCausas.filter(f => f.toLowerCase() !== q)
    return q ? base.filter(f => f.toLowerCase().includes(q)).slice(0, 5)
             : base.slice(0, 5)
  }, [causa, historicoCausas])

  function persistirCausa() {
    setCausaFocada(false)
    if (!causa.trim() || causa === (preDiag.causa_diagnostico || '')) return
    onUpdateOS?.(os.numero, {
      pre_diagnostico: { ...preDiag, causa_diagnostico: causa },
    })
    salvarCausa(causa)
    setHistorico(lerCausas())
  }

  function aplicarSugestao(frase) {
    setCausa(frase)
    setCausaFocada(false)
    onUpdateOS?.(os.numero, {
      pre_diagnostico: { ...preDiag, causa_diagnostico: frase },
    })
    salvarCausa(frase)
    setHistorico(lerCausas())
  }

  // ── Marcação de componente ────────────────────────────────────────────────
  function setAcaoItem(itemId, acao) {
    setMarcados(prev => {
      const atual = { ...(prev[grupoAberto] || {}) }
      if (!acao) delete atual[itemId]
      else atual[itemId] = acao
      return { ...prev, [grupoAberto]: atual }
    })
  }

  // ── CTA ───────────────────────────────────────────────────────────────────
  const totalMarcados = Object.values(marcadosPorGrupo).reduce(
    (s, obj) => s + Object.keys(obj || {}).length, 0
  )
  const podeConcluir = causa.trim().length > 0 && totalMarcados > 0

  async function concluir() {
    if (!podeConcluir) return
    setSalvando(true)
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...preDiag,
        causa_diagnostico: causa,
        componentes_marcados: marcadosPorGrupo,
      },
    })
    salvarCausa(causa)
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'orcamento')
    setSalvando(false)
    if (proxima) onMoverOS?.(os.numero, proxima.id)
  }

  const relatoCliente = (os?.defeito || '').trim()

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: HIG_SPACE.lg,
      fontFamily: HIG_FONT,
      padding: `0 0 ${HIG_SPACE.md}px`,
    }}>

      {/* ── 1. Relato do cliente ─────────────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Relato do cliente">
        {relatoCliente ? (
          <div style={{
            padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 3, borderRadius: 99, alignSelf: 'stretch',
              flexShrink: 0, background: '#FFCC00', minHeight: 20,
            }} />
            <p style={{
              ...higType('body'), color: T.textPrimary,
              margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap',
            }}>
              {relatoCliente}
            </p>
          </div>
        ) : (
          <div style={{
            padding: HIG_SPACE.md,
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
          }}>
            <TI name="message-off" size={17} color={T.textDim} />
            <span style={{ ...higType('subheadline'), color: T.textMuted, fontStyle: 'italic' }}>
              Sem relato na abertura da OS.
            </span>
          </div>
        )}
      </HIGSection>

      {/* ── 2. Resumo da avaliação ───────────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Resumo da avaliação">
        {/* "Não liga" */}
        {naoLiga && (
          <>
            <div style={{
              minHeight: 44, padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
              display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: dark ? 'rgba(91,155,213,0.15)' : 'rgba(91,155,213,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TI name="bolt-off" size={16} color={HIG_COLOR.tintIdemaq} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ ...higType('subheadline'), color: T.textPrimary, fontWeight: 500 }}>
                  Equipamento não liga
                </div>
                {preDiag.motivo_nao_liga && (
                  <div style={{ ...higType('caption1'), color: T.textMuted, marginTop: 1 }}>
                    {preDiag.motivo_nao_liga}
                  </div>
                )}
              </div>
            </div>
            {(locaisVaz.length > 0 || testesComResultado.length > 0) && <Sep T={T} indent={HIG_SPACE.md} />}
          </>
        )}

        {/* Vazamentos */}
        {locaisVaz.length > 0 && (
          <>
            <div style={{
              minHeight: 44, padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
              display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: dark ? 'rgba(91,155,213,0.15)' : 'rgba(91,155,213,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <TI name="droplet" size={16} color={HIG_COLOR.tintIdemaq} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ ...higType('subheadline'), color: T.textPrimary, fontWeight: 500 }}>
                  Vazamento detectado
                </div>
                <div style={{ ...higType('caption1'), color: T.textMuted, marginTop: 1 }}>
                  {locaisVaz.join(' · ')}
                </div>
              </div>
            </div>
            {testesComResultado.length > 0 && <Sep T={T} indent={HIG_SPACE.md} />}
          </>
        )}

        {/* Resultados dos testes */}
        {testesComResultado.length > 0 ? (
          testesComResultado.map((t, i) => (
            <React.Fragment key={t.id}>
              {i > 0 && <Sep T={T} indent={HIG_SPACE.md + 32 + HIG_SPACE.sm} />}
              <div style={{
                minHeight: 44, padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
                display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: dark
                    ? (RESULTADO_VISUAL[t.valor]?.bgDark || 'rgba(142,142,147,0.15)')
                    : (RESULTADO_VISUAL[t.valor]?.bgLight || '#F2F2F7'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TI
                    name={RESULTADO_VISUAL[t.valor]?.icon || 'minus'}
                    size={15}
                    color={RESULTADO_VISUAL[t.valor]?.color || HIG_COLOR.gray}
                  />
                </span>
                <span style={{ flex: 1, ...higType('subheadline'), color: T.textPrimary, fontWeight: 400 }}>
                  {t.label || t.id}
                </span>
                <ResultBadge valor={t.valor} dark={dark} />
              </div>
            </React.Fragment>
          ))
        ) : !naoLiga ? (
          <div style={{
            padding: HIG_SPACE.md,
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
          }}>
            <TI name="clipboard-off" size={16} color={T.textDim} />
            <span style={{ ...higType('subheadline'), color: T.textMuted, fontStyle: 'italic' }}>
              Nenhum teste registrado na Avaliação.
            </span>
          </div>
        ) : null}
      </HIGSection>

      {/* ── 3. Causa identificada ────────────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Causa identificada"
        footer={!causa.trim() ? 'Obrigatório para concluir o diagnóstico' : undefined}>
        <div style={{ padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px` }}>
          <textarea
            placeholder="Ex: Rolamento do tambor desgastado, correia rompida…"
            value={causa}
            onChange={e => setCausa(e.target.value)}
            onFocus={() => setCausaFocada(true)}
            onBlur={() => setTimeout(persistirCausa, 150)}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: `${HIG_SPACE.xs}px ${HIG_SPACE.sm}px`,
              borderRadius: HIG_RADIUS.small,
              border: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.04)' : HIG_COLOR.gray6,
              color: T.textPrimary,
              ...higType('subheadline'),
              fontFamily: HIG_FONT,
              outline: 'none', resize: 'vertical',
            }}
          />
        </div>

        {/* Autocomplete — lista iOS abaixo do textarea */}
        {causaFocada && sugestoes.length > 0 && (
          <>
            <Sep T={T} />
            <div style={{
              padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px`,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <TI name="history" size={11} color={T.textMuted} />
              <span style={{
                ...higType('caption2'),
                color: T.textMuted,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {causa.trim() ? 'Sugestões' : 'Usadas recentemente'}
              </span>
            </div>
            {sugestoes.map((f, i) => (
              <React.Fragment key={i}>
                <Sep T={T} indent={HIG_SPACE.md} />
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => aplicarSugestao(f)}
                  style={{
                    width: '100%', minHeight: 44,
                    padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
                    border: 'none', background: 'transparent',
                    display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
                    cursor: 'pointer', textAlign: 'left', fontFamily: HIG_FONT,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <TI name="corner-down-left" size={14} color={HIG_COLOR.tintIdemaq} />
                  <span style={{
                    flex: 1, ...higType('subheadline'), color: T.textPrimary,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {f}
                  </span>
                </button>
              </React.Fragment>
            ))}
          </>
        )}
      </HIGSection>

      {/* ── 4. Componentes afetados ──────────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Componentes afetados"
        footer={totalMarcados > 0
          ? `${totalMarcados} ${totalMarcados === 1 ? 'componente marcado' : 'componentes marcados'}`
          : 'Selecione pelo menos 1 componente para concluir'}>

        {/* Campo de busca */}
        <div style={{
          padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
          display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
          borderBottom: `0.5px solid ${T.border}`,
        }}>
          <TI name="search" size={15} color={T.textMuted} />
          <input
            type="search"
            placeholder="Buscar componente…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              outline: 'none', ...higType('body'), color: T.textPrimary,
              fontFamily: HIG_FONT,
            }}
          />
          {busca && (
            <button type="button" onClick={() => setBusca('')}
              style={{
                border: 'none', background: 'transparent',
                cursor: 'pointer', color: T.textMuted, padding: 0,
              }}>
              <TI name="x" size={14} color={T.textMuted} />
            </button>
          )}
        </div>

        {/* Lista de grupos com accordion */}
        {GRUPOS.map((grupo, idx) => {
          const marcados = marcadosPorGrupo[grupo.id] || {}
          const open = grupoAberto === grupo.id
          const itensFiltrados = open
            ? (busca.trim()
                ? grupo.itens.filter(i => i.label.toLowerCase().includes(busca.toLowerCase()))
                : grupo.itens)
            : []

          return (
            <React.Fragment key={grupo.id}>
              {idx > 0 && <Sep T={T} indent={HIG_SPACE.md + 32 + HIG_SPACE.sm} />}
              <GrupoRow
                T={T} dark={dark}
                grupo={grupo}
                marcados={marcados}
                open={open}
                onToggle={() => setGrupoAberto(open ? null : grupo.id)}
              />
              {open && (
                <div style={{ borderTop: `0.5px solid ${T.border}` }}>
                  {itensFiltrados.length > 0
                    ? itensFiltrados.map((item, iIdx) => (
                        <ItemRow
                          key={item.id}
                          T={T} dark={dark}
                          item={item}
                          acao={marcados[item.id]}
                          onSetAcao={setAcaoItem}
                          isLast={iIdx === itensFiltrados.length - 1}
                        />
                      ))
                    : (
                      <div style={{
                        padding: `${HIG_SPACE.md}px`,
                        display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
                      }}>
                        <TI name="search-off" size={15} color={T.textDim} />
                        <span style={{ ...higType('subheadline'), color: T.textMuted, fontStyle: 'italic' }}>
                          Nenhum componente encontrado.
                        </span>
                      </div>
                    )
                  }
                </div>
              )}
            </React.Fragment>
          )
        })}
      </HIGSection>

      {/* ── CTA: Concluir diagnóstico ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={concluir}
        disabled={!podeConcluir || salvando}
        style={{
          ...higFilledButton(T, dark),
          width: '100%',
          background: podeConcluir
            ? HIG_COLOR.tintIdemaq
            : (dark ? 'rgba(255,255,255,0.08)' : '#E5E5EA'),
          color: podeConcluir ? '#FFFFFF' : T.textDim,
          opacity: salvando ? 0.6 : 1,
          cursor: (podeConcluir && !salvando) ? 'pointer' : 'not-allowed',
        }}
      >
        <TI name={salvando ? 'loader-2' : 'arrow-right'} size={18} />
        {salvando          ? 'Salvando…'
          : !causa.trim()  ? 'Descreva a causa identificada'
          : totalMarcados === 0 ? 'Marque pelo menos 1 componente'
          : 'Concluir diagnóstico'}
      </button>

    </div>
  )
}
