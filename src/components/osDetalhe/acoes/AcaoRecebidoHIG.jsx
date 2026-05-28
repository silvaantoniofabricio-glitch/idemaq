// src/components/osDetalhe/acoes/AcaoRecebidoHIG.jsx
// Avaliação (recebido) — Apple HIG, reescrito do zero.
//
// Design: cada teste é uma iOS list row (44pt, chevron, badge de resultado).
// Tocar abre accordion com 3 botões largos (OK / Defeito / Barulho).
// Selecionar fecha automaticamente — nenhum botão espremido.
//
// Persiste:
//   · useChecklistEtapa(os.id, 'recebido') → resultados dos 4 testes
//   · os.pre_diagnostico.{equipamento_nao_liga, motivo_nao_liga, vazamentos}
//   · os.observacoes (campo global unificado)

import React, { useState, useEffect } from 'react'
import { useTheme } from '../../../theme'
import { TI } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR, HIG_FONT,
  higType, higFilledButton, higInsetCard,
} from '../../../theme-hig'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'

// ─── Dados ────────────────────────────────────────────────────────────────
const TESTES = [
  { id: 'entrada_agua',  label: 'Entrada de água',  icon: 'droplet' },
  { id: 'saida_agua',    label: 'Saída de água',    icon: 'droplet-off' },
  { id: 'agitacao',      label: 'Agitação',         icon: 'refresh' },
  { id: 'centrifugacao', label: 'Centrifugação',    icon: 'rotate-clockwise' },
]

const VAZAMENTOS = [
  { id: 'entrada',  label: 'Entrada',  icon: 'droplet' },
  { id: 'agitacao', label: 'Agitação', icon: 'refresh' },
  { id: 'saida',    label: 'Saída',    icon: 'droplet-off' },
]

const OPCOES = [
  { id: 'ok',      label: 'OK',       icon: 'check',          color: HIG_COLOR.green,  bgLight: '#E8F9EE', bgDark: 'rgba(52,199,89,0.15)' },
  { id: 'defeito', label: 'Defeito',  icon: 'alert-triangle', color: HIG_COLOR.red,    bgLight: '#FEF0EF', bgDark: 'rgba(255,59,48,0.15)'  },
  { id: 'barulho', label: 'Barulho',  icon: 'volume',         color: HIG_COLOR.orange, bgLight: '#FFF5E6', bgDark: 'rgba(255,149,0,0.15)'  },
]

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
  return (
    <div style={{
      height: 0.5,
      background: T.border,
      marginLeft: indent,
      opacity: 0.7,
    }} />
  )
}

// ─── iOS UISwitch ─────────────────────────────────────────────────────────
function UISwitch({ on, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 51, height: 31, borderRadius: 999,
        border: 'none', padding: 2, flexShrink: 0,
        background: on ? HIG_COLOR.red : (on ? HIG_COLOR.red : '#E9E9EB'),
        cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start',
        transition: 'background .2s',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
      style2={{}}
    >
      <span style={{
        width: 27, height: 27, borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 3px 8px rgba(0,0,0,.15), 0 1px 2px rgba(0,0,0,.10)',
        display: 'block', flexShrink: 0,
      }} />
    </button>
  )
}

// ─── Badge de resultado ────────────────────────────────────────────────────
function ResultBadge({ valor, dark }) {
  if (!valor) return (
    <span style={{
      ...higType('subheadline'),
      color: HIG_COLOR.gray,
      display: 'flex', alignItems: 'center', gap: 3,
    }}>
      <TI name="chevron-right" size={14} color={HIG_COLOR.gray} />
    </span>
  )
  const op = OPCOES.find(o => o.id === valor)
  if (!op) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 999,
      background: dark ? op.bgDark : op.bgLight,
      color: op.color,
      ...higType('caption1'),
      fontWeight: 700,
    }}>
      <TI name={op.icon} size={11} color={op.color} />
      {op.label}
    </span>
  )
}

// ─── Linha de teste inline ────────────────────────────────────────────────
// Ícone + label + 3 botões (OK/Defeito/Barulho) na mesma linha.
function TesteAccordion({ T, dark, teste, value, onChange }) {
  return (
    <div style={{
      minHeight: HIG_SIZE.listRow,
      padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
      display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
    }}>
      {/* Ícone em badge colorido */}
      <span style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: value
          ? (dark ? OPCOES.find(o => o.id === value)?.bgDark : OPCOES.find(o => o.id === value)?.bgLight)
          : (dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.055)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .15s',
      }}>
        <TI name={teste.icon} size={16} color={value ? OPCOES.find(o => o.id === value)?.color : HIG_COLOR.gray} />
      </span>

      {/* Label */}
      <span style={{
        flex: 1, minWidth: 0,
        ...higType('body'),
        color: T.textPrimary,
      }}>
        {teste.label}
      </span>

      {/* 3 botões inline */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {OPCOES.map(op => {
          const sel = value === op.id
          return (
            <button key={op.id} type="button"
              onClick={() => onChange(sel ? null : op.id)}
              style={{
                height: 30, padding: '0 7px',
                borderRadius: 8,
                border: `1.5px solid ${sel ? op.color : T.border}`,
                background: sel
                  ? (dark ? op.bgDark : op.bgLight)
                  : (dark ? 'rgba(255,255,255,0.04)' : T.card),
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                WebkitTapHighlightColor: 'transparent',
                transition: 'background .12s, border-color .12s',
                fontFamily: HIG_FONT,
              }}
            >
              <TI name={op.icon} size={13} color={sel ? op.color : T.textMuted} />
              <span style={{
                ...higType('caption2'),
                color: sel ? op.color : T.textMuted,
                fontWeight: sel ? 700 : 500,
              }}>
                {op.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoRecebidoHIG({ os, onMoverOS, onUpdateOS }) {
  const { T, dark } = useTheme()
  const { itens: chkItens, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'recebido')

  // Estado dos testes
  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )


  // Estado global
  const [obs, setObs]                   = useState(os?.observacoes || '')
  const [naoLiga, setNaoLiga]           = useState(false)
  const [motivoNaoLiga, setMotivo]      = useState('')
  const [vazamentos, setVazamentos]     = useState({ entrada: false, saida: false, agitacao: false })
  const [hidratado, setHidratado]       = useState(false)
  const [salvando, setSalvando]         = useState(false)

  // ── Hidratação ──────────────────────────────────────────────────────────
  useEffect(() => {
    setNaoLiga(!!os?.pre_diagnostico?.equipamento_nao_liga)
    setMotivo(os?.pre_diagnostico?.motivo_nao_liga || '')
    setVazamentos({
      entrada:  !!os?.pre_diagnostico?.vazamentos?.entrada,
      saida:    !!os?.pre_diagnostico?.vazamentos?.saida,
      agitacao: !!os?.pre_diagnostico?.vazamentos?.agitacao,
    })
  }, [os?.id,
    os?.pre_diagnostico?.equipamento_nao_liga,
    os?.pre_diagnostico?.motivo_nao_liga,
    os?.pre_diagnostico?.vazamentos])

  useEffect(() => {
    if (loadingChk || hidratado) return
    const novo = TESTES.reduce((acc, t) => {
      const found = chkItens.find(i => i.id === t.id)
      return { ...acc, [t.id]: found?.valor ?? null }
    }, {})
    setTestes(novo)
    setObs(os?.observacoes || '')
    setHidratado(true)
  }, [loadingChk, chkItens, hidratado, os?.observacoes])

  useEffect(() => {
    if (hidratado) setObs(os?.observacoes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os?.observacoes])

  // Salva imediatamente no clique — sem debounce
  function salvarTestes(novoTestes, novoNaoLiga) {
    salvarChk(TESTES.map(t => ({
      id: t.id, label: t.label,
      checked: novoNaoLiga ? false : novoTestes[t.id] === 'ok',
      valor:   novoNaoLiga ? 'na'  : (novoTestes[t.id] || null),
    })), null)
  }

  function setResultado(testeId, valor) {
    const novoTestes = { ...testes, [testeId]: valor }
    setTestes(novoTestes)
    salvarTestes(novoTestes, naoLiga)
  }

  function toggleNaoLiga() {
    const novo = !naoLiga
    setNaoLiga(novo)
    salvarTestes(testes, novo)
  }

  useEffect(() => {
    if (!hidratado || obs === (os?.observacoes || '')) return
    const t = setTimeout(() => onUpdateOS?.(os.numero, { observacoes: obs }), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs, hidratado])

  useEffect(() => {
    if (!hidratado) return
    const t = setTimeout(() => {
      onUpdateOS?.(os.numero, {
        pre_diagnostico: {
          ...(os.pre_diagnostico || {}),
          equipamento_nao_liga: naoLiga,
          motivo_nao_liga:      naoLiga ? motivoNaoLiga : null,
          vazamentos,
        },
      })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naoLiga, motivoNaoLiga, vazamentos, hidratado])

  // ── Avançar ─────────────────────────────────────────────────────────────
  async function avancar() {
    setSalvando(true)
    await salvarChk(TESTES.map(t => ({
      id: t.id, label: t.label,
      checked: naoLiga ? false : testes[t.id] === 'ok',
      valor:   naoLiga ? 'na'  : (testes[t.id] || null),
    })), null)
    if (obs !== (os?.observacoes || '')) onUpdateOS?.(os.numero, { observacoes: obs })
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'diagnostico')
    setSalvando(false)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  const todosPreenchidos = TESTES.every(t => testes[t.id] != null)
  const podeAvancar      = naoLiga || todosPreenchidos
  const preenchidos      = TESTES.filter(t => testes[t.id] != null).length
  const relatoCliente    = (os?.defeito || '').trim()
  const temVazamento     = Object.values(vazamentos).some(Boolean)

  // Cor do CTA — sempre azul (vermelho só no toggle, não em botões)
  const ctaBg = podeAvancar
    ? HIG_COLOR.tintIdemaq
    : (dark ? 'rgba(255,255,255,0.08)' : '#E5E5EA')

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
            {/* Barra amarela lateral estilo iOS quote */}
            <div style={{
              width: 3, borderRadius: 99, alignSelf: 'stretch', flexShrink: 0,
              background: '#FFCC00', minHeight: 20,
            }} />
            <p style={{
              ...higType('body'),
              color: T.textPrimary,
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

      {/* ── 2. Testes de funcionamento ──────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Testes de funcionamento"
        footer={
          naoLiga
            ? 'Testes pulados — equipamento sem energia'
            : preenchidos > 0
              ? `${preenchidos} de ${TESTES.length} avaliados`
              : `0 de ${TESTES.length} avaliados`
        }
      >
        {/* Toggle: Equipamento não liga */}
        <div style={{
          minHeight: HIG_SIZE.listRow,
          padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
          display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: naoLiga
              ? (dark ? 'rgba(91,155,213,0.18)' : 'rgba(91,155,213,0.12)')
              : (dark ? 'rgba(255,149,0,0.15)' : '#FFF5E6'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TI name="bolt-off" size={16}
              color={naoLiga ? HIG_COLOR.tintIdemaq : HIG_COLOR.orange} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ ...higType('body'), color: T.textPrimary }}>
              Equipamento não liga
            </div>
            <div style={{
              ...higType('caption1'),
              color: naoLiga ? HIG_COLOR.tintIdemaq : T.textMuted,
              marginTop: 1,
            }}>
              {naoLiga ? 'Ativo · testes desabilitados' : 'Ativar pula os 4 testes'}
            </div>
          </div>
          {/* UISwitch manual (sem style2) */}
          <button
            type="button"
            role="switch"
            aria-checked={naoLiga}
            onClick={toggleNaoLiga}
            style={{
              width: 51, height: 31, borderRadius: 999,
              border: 'none', padding: 2, flexShrink: 0,
              background: naoLiga ? HIG_COLOR.tintIdemaq : '#E9E9EB',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: naoLiga ? 'flex-end' : 'flex-start',
              transition: 'background .2s',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            <span style={{
              width: 27, height: 27, borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow: '0 3px 8px rgba(0,0,0,.15), 0 1px 2px rgba(0,0,0,.10)',
              display: 'block', flexShrink: 0,
            }} />
          </button>
        </div>

        {/* Campo "motivo" — só quando naoLiga */}
        {naoLiga && (
          <>
            <Sep T={T} />
            <div style={{ padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px` }}>
              <textarea
                placeholder="O que aconteceu? Ex: cabo arrancado, fonte queimada, painel sem reação…"
                value={motivoNaoLiga}
                onChange={e => setMotivo(e.target.value)}
                rows={2}
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
          </>
        )}

        {/* 4 testes em accordion */}
        <div style={{
          opacity: naoLiga ? 0.3 : 1,
          pointerEvents: naoLiga ? 'none' : 'auto',
          transition: 'opacity .2s',
        }}>
          {TESTES.map((teste) => (
            <React.Fragment key={teste.id}>
              <Sep T={T} indent={HIG_SPACE.md + 32 + HIG_SPACE.sm} />
              <TesteAccordion
                T={T} dark={dark}
                teste={teste}
                value={testes[teste.id]}
                onChange={v => setResultado(teste.id, v)}
              />
            </React.Fragment>
          ))}
        </div>
      </HIGSection>

      {/* ── 3. Vazamentos ────────────────────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Vazamentos"
        footer={temVazamento ? 'Registrado — será incluído no diagnóstico' : 'Toque para marcar onde está vazando'}>
        <div style={{
          padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
          display: 'flex', gap: HIG_SPACE.xs,
          opacity: naoLiga ? 0.3 : 1,
          pointerEvents: naoLiga ? 'none' : 'auto',
        }}>
          {VAZAMENTOS.map(v => {
            const on = vazamentos[v.id]
            return (
              <button key={v.id} type="button"
                onClick={() => setVazamentos(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
                style={{
                  flex: '1 1 0', minHeight: 52,
                  borderRadius: HIG_RADIUS.card,
                  border: `1.5px solid ${on ? HIG_COLOR.tintIdemaq : T.border}`,
                  background: on
                    ? (dark ? 'rgba(91,155,213,0.18)' : 'rgba(91,155,213,0.10)')
                    : 'transparent',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'background .12s, border-color .12s',
                  fontFamily: HIG_FONT,
                }}>
                <TI name={v.icon} size={18}
                  color={on ? HIG_COLOR.tintIdemaq : T.textMuted} />
                <span style={{
                  ...higType('caption1'),
                  color: on ? HIG_COLOR.tintIdemaq : T.textMuted,
                  fontWeight: on ? 700 : 500,
                }}>
                  {v.label}
                </span>
              </button>
            )
          })}
        </div>
      </HIGSection>

      {/* ── 4. Observações ───────────────────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Observações"
        footer="Visível em todas as etapas. Ex: chegou sem capa, painel arranhado.">
        <div style={{ padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px` }}>
          <textarea
            placeholder="Ex: máquina chegou com cabo arrancado, painel arranhado…"
            value={obs}
            onChange={e => setObs(e.target.value)}
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
      </HIGSection>

      {/* ── CTA: Avançar pro Diagnóstico ─────────────────────────────────── */}
      <button
        type="button"
        onClick={avancar}
        disabled={!podeAvancar || salvando}
        style={{
          ...higFilledButton(T, dark),
          width: '100%',
          background: ctaBg,
          color: podeAvancar ? '#FFFFFF' : T.textDim,
          opacity: salvando ? 0.6 : 1,
          cursor: (podeAvancar && !salvando) ? 'pointer' : 'not-allowed',
        }}
      >
        <TI name={salvando ? 'loader-2' : 'arrow-right'} size={18} />
        {salvando    ? 'Salvando…'
          : naoLiga  ? 'Avançar pro Diagnóstico'
          : podeAvancar ? 'Avançar pro Diagnóstico'
          : `Avalie os ${TESTES.length} testes para continuar`}
      </button>

    </div>
  )
}
