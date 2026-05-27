// src/components/osDetalhe/acoes/AcaoRecebidoHIG.jsx
// Etapa Coleta / Avaliação — reescrita completa Apple HIG (iOS 17).
// Mesmo nível de acabamento do AcaoAgendamentoHIG:
//   · HIGSection (footnote uppercase + inset grouped card)
//   · UISwitch nativo para "Equipamento não liga"
//   · Segmented control compacto por teste (OK / Defeito / Barulho)
//   · Pill chips para vazamentos
//   · HIGFilledButton 50pt CTA
//
// Persiste:
//   · useChecklistEtapa(os.id, 'recebido') → resultados dos 4 testes
//   · os.pre_diagnostico.equipamento_nao_liga / motivo_nao_liga / vazamentos
//   · os.observacoes (campo global unificado)

import React, { useState, useEffect } from 'react'
import { useTheme } from '../../../theme'
import { TI, PALETA } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_COLOR, HIG_FONT,
  higType, higFilledButton, higInsetCard,
} from '../../../theme-hig'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'

// ─── Dados dos testes ─────────────────────────────────────────────────────
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

// Mapeamento visual de cada resultado
const RESULTADO = {
  ok:      { label: 'OK',      color: HIG_COLOR.green,  bgDark: 'rgba(52,199,89,0.18)',  bgLight: '#E8F9EE' },
  defeito: { label: 'Defeito', color: HIG_COLOR.red,    bgDark: 'rgba(255,59,48,0.18)',  bgLight: '#FEF0EF' },
  barulho: { label: 'Barulho', color: HIG_COLOR.orange, bgDark: 'rgba(255,149,0,0.18)',  bgLight: '#FFF4E6' },
}

// ─── Bloco de seção HIG ───────────────────────────────────────────────────
function HIGSection({ T, dark, title, children, footer }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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

// ─── Separador interno do inset card ─────────────────────────────────────
function Separator({ T }) {
  return (
    <div style={{
      height: 1,
      background: T.border,
      marginLeft: HIG_SPACE.md,
      opacity: 0.6,
    }} />
  )
}

// ─── iOS UISwitch ─────────────────────────────────────────────────────────
function UISwitch({ on, onChange, T, dark }) {
  const trackColor = on
    ? (dark ? PALETA.redStrong : PALETA.redStrong)
    : (dark ? 'rgba(120,120,128,0.36)' : '#E9E9EB')
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 51, height: 31, borderRadius: 999,
        border: 'none', padding: 2, flexShrink: 0,
        background: trackColor,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        justifyContent: on ? 'flex-end' : 'flex-start',
        transition: 'background .2s',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
    >
      <span style={{
        width: 27, height: 27, borderRadius: '50%',
        background: '#FFFFFF',
        boxShadow: '0 3px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.10)',
        flexShrink: 0,
        display: 'block',
        transition: 'transform .2s',
      }} />
    </button>
  )
}

// ─── Segmented control compacto (3 opções resultado) ─────────────────────
// Cada opção é uma pill: cor temática quando selecionada, neutro quando não.
function TesteSegmented({ T, dark, value, onChange }) {
  const opts = ['ok', 'defeito', 'barulho']
  return (
    <div style={{
      display: 'flex', gap: 4, flexShrink: 0,
    }}>
      {opts.map(k => {
        const r = RESULTADO[k]
        const sel = value === k
        const bg = sel ? (dark ? r.bgDark : r.bgLight) : 'transparent'
        const border = sel ? r.color : T.border
        const color = sel ? r.color : T.textMuted
        return (
          <button key={k} type="button"
            onClick={() => onChange(value === k ? null : k)}
            style={{
              minHeight: 32, minWidth: 68,
              padding: '0 10px',
              borderRadius: HIG_RADIUS.card,
              border: `1.5px solid ${border}`,
              background: bg,
              color,
              ...higType('footnote'),
              fontWeight: sel ? 700 : 500,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background .12s, border-color .12s',
            }}>
            {r.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Linha de teste (list row HIG com segmented direita) ──────────────────
function TesteRow({ T, dark, teste, value, onChange }) {
  return (
    <div style={{
      minHeight: 52,
      padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
      display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
    }}>
      {/* Ícone + label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
        flex: '0 0 auto',
        minWidth: 0,
      }}>
        <span style={{
          width: 30, height: 30, borderRadius: HIG_RADIUS.small,
          background: dark ? 'rgba(91,155,213,0.15)' : 'rgba(91,155,213,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <TI name={teste.icon} size={15} color={HIG_COLOR.tintIdemaq} />
        </span>
        <span style={{
          ...higType('subheadline'),
          color: T.textPrimary,
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          {teste.label}
        </span>
      </div>

      {/* Segmented — empurrado pra direita */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <TesteSegmented T={T} dark={dark} value={value} onChange={onChange} />
      </div>
    </div>
  )
}

// ─── Chip de vazamento ────────────────────────────────────────────────────
function VazChip({ T, dark, item, on, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        flex: '1 1 0', minHeight: 40,
        padding: '0 8px', borderRadius: HIG_RADIUS.pill,
        border: `1.5px solid ${on ? HIG_COLOR.tintIdemaq : T.border}`,
        background: on
          ? (dark ? 'rgba(91,155,213,0.20)' : 'rgba(91,155,213,0.12)')
          : 'transparent',
        color: on ? HIG_COLOR.tintIdemaq : T.textMuted,
        ...higType('footnote'),
        fontWeight: on ? 700 : 500,
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s, border-color .12s',
      }}>
      <TI name={item.icon} size={13} color={on ? HIG_COLOR.tintIdemaq : T.textMuted} />
      {item.label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoRecebidoHIG({ os, onMoverOS, onUpdateOS }) {
  const { T, dark } = useTheme()
  const { itens: chkItens, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'recebido')

  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )
  const [obs, setObs] = useState(os?.observacoes || '')
  const [naoLiga, setNaoLiga] = useState(false)
  const [motivoNaoLiga, setMotivoNaoLiga] = useState('')
  const [vazamentos, setVazamentos] = useState({ entrada: false, saida: false, agitacao: false })
  const [hidratado, setHidratado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Hidrata pre_diagnostico quando OS carrega
  useEffect(() => {
    setNaoLiga(!!os?.pre_diagnostico?.equipamento_nao_liga)
    setMotivoNaoLiga(os?.pre_diagnostico?.motivo_nao_liga || '')
    setVazamentos({
      entrada:  !!os?.pre_diagnostico?.vazamentos?.entrada,
      saida:    !!os?.pre_diagnostico?.vazamentos?.saida,
      agitacao: !!os?.pre_diagnostico?.vazamentos?.agitacao,
    })
  }, [os?.id, os?.pre_diagnostico?.equipamento_nao_liga,
    os?.pre_diagnostico?.motivo_nao_liga, os?.pre_diagnostico?.vazamentos])

  // Hidrata checklist de testes
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

  // Re-sync obs se outra etapa atualizar os.observacoes
  useEffect(() => {
    if (hidratado) setObs(os?.observacoes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os?.observacoes])

  // Auto-save: testes → checklist_etapa (debounce 500ms)
  useEffect(() => {
    if (!hidratado) return
    const t = setTimeout(() => {
      const itens = TESTES.map(t => ({
        id: t.id, label: t.label,
        checked: naoLiga ? false : testes[t.id] === 'ok',
        valor: naoLiga ? 'na' : (testes[t.id] || null),
      }))
      salvarChk(itens, null)
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testes, naoLiga, hidratado])

  // Auto-save: obs → os.observacoes (debounce 500ms)
  useEffect(() => {
    if (!hidratado) return
    if (obs === (os?.observacoes || '')) return
    const t = setTimeout(() => {
      onUpdateOS?.(os.numero, { observacoes: obs })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs, hidratado])

  // Auto-save: naoLiga + motivo + vazamentos → pre_diagnostico (debounce 500ms)
  useEffect(() => {
    if (!hidratado) return
    const t = setTimeout(() => {
      onUpdateOS?.(os.numero, {
        pre_diagnostico: {
          ...(os.pre_diagnostico || {}),
          equipamento_nao_liga: naoLiga,
          motivo_nao_liga: naoLiga ? motivoNaoLiga : null,
          vazamentos: vazamentos,
        },
      })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [naoLiga, motivoNaoLiga, vazamentos, hidratado])

  async function avancar() {
    setSalvando(true)
    const itens = TESTES.map(t => ({
      id: t.id, label: t.label,
      checked: naoLiga ? false : testes[t.id] === 'ok',
      valor: naoLiga ? 'na' : (testes[t.id] || null),
    }))
    await salvarChk(itens, null)
    if (obs !== (os?.observacoes || '')) {
      onUpdateOS?.(os.numero, { observacoes: obs })
    }
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'diagnostico')
    setSalvando(false)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  const todosPreenchidos = TESTES.every(t => testes[t.id] != null)
  const podeAvancar = naoLiga || todosPreenchidos

  const relatoCliente = (os?.defeito || '').trim()

  // Contagem de resultados para o badge de status
  const countOk      = TESTES.filter(t => testes[t.id] === 'ok').length
  const countDefeito = TESTES.filter(t => testes[t.id] === 'defeito').length
  const countBarulho = TESTES.filter(t => testes[t.id] === 'barulho').length

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: HIG_SPACE.lg,
      fontFamily: HIG_FONT,
      padding: `0 0 ${HIG_SPACE.md}px`,
    }}>

      {/* ── Seção 1: Relato do cliente ─────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Relato do cliente">
        {relatoCliente ? (
          <div style={{
            padding: HIG_SPACE.md,
            display: 'flex', gap: HIG_SPACE.sm, alignItems: 'flex-start',
          }}>
            <span style={{
              width: 3, borderRadius: 99, flexShrink: 0, alignSelf: 'stretch',
              background: PALETA.yellowStrong,
              minHeight: 20,
            }} />
            <p style={{
              ...higType('body'),
              color: T.textPrimary,
              margin: 0,
              whiteSpace: 'pre-wrap',
              lineHeight: '1.45',
            }}>
              {relatoCliente}
            </p>
          </div>
        ) : (
          <div style={{
            padding: HIG_SPACE.md,
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
          }}>
            <TI name="message-off" size={16} color={T.textDim} />
            <span style={{
              ...higType('footnote'),
              color: T.textMuted,
              fontStyle: 'italic',
            }}>
              Sem relato registrado na abertura da OS.
            </span>
          </div>
        )}
      </HIGSection>

      {/* ── Seção 2: Testes de funcionamento ──────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Testes de funcionamento"
        footer={!naoLiga && todosPreenchidos
          ? `${countOk} OK · ${countDefeito} com defeito · ${countBarulho} com barulho`
          : undefined}
      >
        {/* Linha: toggle "Equipamento não liga" */}
        <div style={{
          minHeight: HIG_SPACE.xl * 2,
          padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
          display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        }}>
          <span style={{
            width: 30, height: 30, borderRadius: HIG_RADIUS.small, flexShrink: 0,
            background: naoLiga
              ? (dark ? 'rgba(255,59,48,0.20)' : '#FEEEED')
              : (dark ? 'rgba(255,149,0,0.18)' : '#FFF4E5'),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TI name="bolt-off" size={15}
              color={naoLiga ? HIG_COLOR.red : HIG_COLOR.orange} />
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              ...higType('subheadline'),
              color: T.textPrimary,
              fontWeight: 500,
            }}>
              Equipamento não liga
            </div>
            <div style={{
              ...higType('caption1'),
              color: naoLiga ? HIG_COLOR.red : T.textMuted,
              marginTop: 1,
            }}>
              {naoLiga ? 'Ativo — testes pulados' : 'Pula os 4 testes abaixo'}
            </div>
          </div>

          <UISwitch on={naoLiga} onChange={setNaoLiga} T={T} dark={dark} />
        </div>

        {/* Textarea "Motivo" — só aparece quando naoLiga */}
        {naoLiga && (
          <>
            <Separator T={T} />
            <div style={{ padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px` }}>
              <textarea
                placeholder="O que aconteceu? Ex: cabo de força arrancado, fonte queimada, painel sem reação…"
                value={motivoNaoLiga}
                onChange={e => setMotivoNaoLiga(e.target.value)}
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
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </>
        )}

        {/* 4 linhas de teste — opacity quando naoLiga */}
        <div style={{
          opacity: naoLiga ? 0.35 : 1,
          pointerEvents: naoLiga ? 'none' : 'auto',
          transition: 'opacity .2s',
        }}>
          {TESTES.map((teste, idx) => (
            <React.Fragment key={teste.id}>
              <Separator T={T} />
              <TesteRow
                T={T} dark={dark}
                teste={teste}
                value={naoLiga ? null : testes[teste.id]}
                onChange={v => setTestes(prev => ({ ...prev, [teste.id]: v }))}
              />
            </React.Fragment>
          ))}
        </div>

        {/* Sub-seção: Vazamentos */}
        <Separator T={T} />
        <div style={{
          padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
          opacity: naoLiga ? 0.35 : 1,
          pointerEvents: naoLiga ? 'none' : 'auto',
          transition: 'opacity .2s',
        }}>
          <div style={{
            ...higType('caption2'),
            color: T.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: HIG_SPACE.xs,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <TI name="droplet" size={10} color={T.textMuted} />
            Vazamentos · marque onde estiver vazando
          </div>
          <div style={{
            display: 'flex', gap: HIG_SPACE.xs,
          }}>
            {VAZAMENTOS.map(v => (
              <VazChip
                key={v.id}
                T={T} dark={dark}
                item={v}
                on={vazamentos[v.id]}
                onClick={() => setVazamentos(prev => ({ ...prev, [v.id]: !prev[v.id] }))}
              />
            ))}
          </div>
        </div>
      </HIGSection>

      {/* ── Seção 3: Observações ───────────────────────────────────────── */}
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
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>
      </HIGSection>

      {/* ── CTA: Avançar pro Diagnóstico ──────────────────────────────── */}
      <button
        type="button"
        onClick={avancar}
        disabled={!podeAvancar || salvando}
        style={{
          ...higFilledButton(T, dark),
          width: '100%',
          background: podeAvancar
            ? (naoLiga ? HIG_COLOR.red : HIG_COLOR.tintIdemaq)
            : (dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray5),
          color: podeAvancar ? '#FFFFFF' : T.textDim,
          opacity: salvando ? 0.6 : 1,
          cursor: (podeAvancar && !salvando) ? 'pointer' : 'not-allowed',
        }}
      >
        <TI name={salvando ? 'loader-2' : 'arrow-right'} size={18} />
        {salvando
          ? 'Salvando…'
          : naoLiga
            ? 'Avançar pro Diagnóstico'
            : podeAvancar
              ? 'Avançar pro Diagnóstico'
              : `Preencha os ${TESTES.length} testes`}
      </button>

    </div>
  )
}
