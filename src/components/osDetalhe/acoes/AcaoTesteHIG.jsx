// src/components/osDetalhe/acoes/AcaoTesteHIG.jsx
// Teste final — Apple HIG, padrão idêntico ao AcaoRecebidoHIG.
//
// Seções:
//   1. Testes finais — acordeão por teste (OK / Defeito / Barulho)
//      mesmo TesteAccordion + ResultBadge do Avaliação
//   2. Acabamento (Secagem · Polimento · Enceramento) — 3 tiles toggle,
//      mesmo padrão dos Vazamentos do Avaliação; só se OS tem Limpeza
//   3. Observações (textarea · auto-save · os.observacoes)
//   4. CTA azul "Aprovar · ir pra Entrega" ou vermelho "Voltar pra oficina"

import React, { useState, useEffect, useMemo } from 'react'
import { useTheme } from '../../../theme'
import { TI } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR, HIG_FONT,
  higType, higFilledButton, higInsetCard,
} from '../../../theme-hig'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import { useFalhaTeste } from '../../../hooks/useFalhaTeste'
import { useOSItens } from '../../../hooks/useOSItens'
import { CATEGORIA_POR_ID } from '../../../utils/categoriasPeca'

// ─── Dados ────────────────────────────────────────────────────────────────────
const TESTES = [
  { id: 'entrada_agua',  label: 'Entrada de água',  icon: 'droplet' },
  { id: 'saida_agua',    label: 'Saída de água',    icon: 'droplet-off' },
  { id: 'agitacao',      label: 'Agitação',         icon: 'refresh' },
  { id: 'centrifugacao', label: 'Centrifugação',    icon: 'rotate-clockwise' },
]

const ACABAMENTO = [
  { id: 'secagem',     label: 'Secagem',     icon: 'wind' },
  { id: 'polimento',   label: 'Polimento',   icon: 'sparkles' },
  { id: 'enceramento', label: 'Enceramento', icon: 'droplet-half-2' },
]

// Mesmas opções do Avaliação — padrão idêntico
const OPCOES = [
  { id: 'ok',      label: 'OK',      icon: 'check',          color: HIG_COLOR.green,  bgLight: '#E8F9EE', bgDark: 'rgba(52,199,89,0.15)'  },
  { id: 'defeito', label: 'Defeito', icon: 'alert-triangle', color: HIG_COLOR.red,    bgLight: '#FEF0EF', bgDark: 'rgba(255,59,48,0.15)'   },
  { id: 'barulho', label: 'Barulho', icon: 'volume',         color: HIG_COLOR.orange, bgLight: '#FFF5E6', bgDark: 'rgba(255,149,0,0.15)'   },
]

// ─── HIGSection — idêntico ao Avaliação ──────────────────────────────────────
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

// ─── Separator — idêntico ao Avaliação ───────────────────────────────────────
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

// ─── ResultBadge — idêntico ao Avaliação ─────────────────────────────────────
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AcaoTesteHIG({ os, onMoverOS, onUpdateOS }) {
  const { T, dark } = useTheme()

  const { itens: itensOrcamento } = useOSItens(os.id)
  const temLimpeza = useMemo(
    () => itensOrcamento.some(i => /limpeza/i.test(i.nome || '')),
    [itensOrcamento]
  )

  const { itens: chkItens, salvar: salvarChk, loading: loadingChk } =
    useChecklistEtapa(os.id, 'teste_final')
  const { sincronizarAbertas } = useFalhaTeste(os.id)

  const [testes, setTestes] = useState(
    () => TESTES.reduce((acc, t) => ({ ...acc, [t.id]: null }), {})
  )
  const [acabamento, setAcabamento] = useState(
    () => ACABAMENTO.reduce((acc, a) => ({ ...acc, [a.id]: false }), {})
  )
  const [obs, setObs] = useState(os?.observacoes || '')

  const [hidratado, setHidratado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Hidratação
  useEffect(() => {
    if (loadingChk || hidratado) return
    const novoTestes = TESTES.reduce((acc, t) => {
      const found = chkItens.find(i => i.id === `teste:${t.id}`)
      return { ...acc, [t.id]: found?.valor ?? null }
    }, {})
    const novoAcab = ACABAMENTO.reduce((acc, a) => {
      const found = chkItens.find(i => i.id === `acab:${a.id}`)
      return { ...acc, [a.id]: !!found?.checked }
    }, {})
    setTestes(novoTestes)
    setAcabamento(novoAcab)
    setObs(os?.observacoes || '')
    setHidratado(true)
  }, [loadingChk, chkItens, hidratado, os?.observacoes])

  useEffect(() => {
    if (hidratado) setObs(os?.observacoes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os?.observacoes])

  // Auto-save obs (debounce 500ms)
  useEffect(() => {
    if (!hidratado || obs === (os?.observacoes || '')) return
    const t = setTimeout(() => onUpdateOS?.(os.numero, { observacoes: obs }), 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs, hidratado])

  function serializarChecklist(novoTestes, novoAcab) {
    const t = novoTestes ?? testes
    const a = novoAcab ?? acabamento
    const linhasTestes = TESTES.map(item => ({
      id: `teste:${item.id}`, label: item.label,
      checked: t[item.id] === 'ok',
      valor: t[item.id] || null,
    }))
    const linhasAcab = temLimpeza
      ? ACABAMENTO.map(item => ({ id: `acab:${item.id}`, label: item.label, checked: !!a[item.id] }))
      : []
    return [...linhasTestes, ...linhasAcab]
  }

  function setResultado(testeId, valor) {
    const novoTestes = { ...testes, [testeId]: valor }
    setTestes(novoTestes)
    salvarChk(serializarChecklist(novoTestes, null), null)
  }

  function toggleAcab(itemId) {
    const novoAcab = { ...acabamento, [itemId]: !acabamento[itemId] }
    setAcabamento(novoAcab)
    salvarChk(serializarChecklist(null, novoAcab), null)
  }

  const falhas = TESTES
    .filter(t => testes[t.id] === 'defeito' || testes[t.id] === 'barulho')
    .map(t => `${t.label}: ${testes[t.id] === 'defeito' ? 'com defeito' : 'com barulho'}`)

  const todosPreenchidos = TESTES.every(t => testes[t.id] != null)
  const todosOk = todosPreenchidos && falhas.length === 0
  const acabPendentes = ACABAMENTO.filter(a => !acabamento[a.id]).length
  const todoAcabOk = !temLimpeza || acabPendentes === 0
  const podeAprovar = todosOk && todoAcabOk
  const podeVoltarOficina = falhas.length > 0
  const preenchidos = TESTES.filter(t => testes[t.id] != null).length

  async function aprovar() {
    setSalvando(true)
    await salvarChk(serializarChecklist(), null)
    if (obs !== (os?.observacoes || '')) onUpdateOS?.(os.numero, { observacoes: obs })
    await sincronizarAbertas([])
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'entrega')
    setSalvando(false)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  async function voltarOficina() {
    setSalvando(true)
    await salvarChk(serializarChecklist(), null)
    if (obs !== (os?.observacoes || '')) onUpdateOS?.(os.numero, { observacoes: obs })
    await sincronizarAbertas(falhas)
    const oficina = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    setSalvando(false)
    if (oficina) onMoverOS(os.numero, oficina.id)
  }

  const ctaBg = podeAprovar
    ? HIG_COLOR.tintIdemaq
    : (dark ? 'rgba(255,255,255,0.08)' : '#E5E5EA')

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: HIG_SPACE.lg,
      fontFamily: HIG_FONT,
      padding: `0 0 ${HIG_SPACE.md}px`,
    }}>

      {/* ── 1. Testes finais ─────────────────────────────────────────────── */}
      <HIGSection
        T={T} dark={dark}
        title="Testes finais"
        footer={
          preenchidos > 0
            ? `${preenchidos} de ${TESTES.length} avaliados`
            : `0 de ${TESTES.length} avaliados`
        }
      >
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
      </HIGSection>

      {/* ── 2. Acabamento (só se tem Limpeza) ────────────────────────────── */}
      {temLimpeza && (
        <HIGSection
          T={T} dark={dark}
          title="Acabamento"
          footer={
            acabPendentes === 0
              ? 'Acabamento completo'
              : `${ACABAMENTO.length - acabPendentes} de ${ACABAMENTO.length} marcados`
          }
        >
          <div style={{
            padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
            display: 'flex', gap: HIG_SPACE.xs,
          }}>
            {ACABAMENTO.map(a => {
              const on = !!acabamento[a.id]
              return (
                <button key={a.id} type="button"
                  onClick={() => toggleAcab(a.id)}
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
                  <TI name={a.icon} size={18}
                    color={on ? HIG_COLOR.tintIdemaq : T.textMuted} />
                  <span style={{
                    ...higType('caption1'),
                    color: on ? HIG_COLOR.tintIdemaq : T.textMuted,
                    fontWeight: on ? 700 : 500,
                  }}>
                    {a.label}
                  </span>
                </button>
              )
            })}
          </div>
        </HIGSection>
      )}

      {/* ── 3. Observações ───────────────────────────────────────────────── */}
      <HIGSection T={T} dark={dark} title="Observações"
        footer="Visível em todas as etapas.">
        <div style={{ padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px` }}>
          <textarea
            placeholder="Ex: ficou tudo OK; cliente vai retirar amanhã…"
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

      {/* ── 4. CTA ───────────────────────────────────────────────────────── */}
      {!podeVoltarOficina ? (
        <button
          type="button"
          onClick={aprovar}
          disabled={!podeAprovar || salvando}
          style={{
            ...higFilledButton(T, dark),
            width: '100%',
            background: ctaBg,
            color: podeAprovar ? '#FFFFFF' : T.textDim,
            opacity: salvando ? 0.6 : 1,
            cursor: (podeAprovar && !salvando) ? 'pointer' : 'not-allowed',
          }}
        >
          <TI name={salvando ? 'loader-2' : (podeAprovar ? 'circle-check' : 'lock')} size={18} />
          {salvando
            ? 'Salvando…'
            : podeAprovar
              ? 'Aprovar teste · ir pra Entrega'
              : !todosPreenchidos
                ? `Avalie os ${TESTES.length} testes para continuar`
                : `Marque o acabamento (${acabPendentes} pendente${acabPendentes !== 1 ? 's' : ''})`}
        </button>
      ) : (
        <button
          type="button"
          onClick={voltarOficina}
          disabled={salvando}
          style={{
            ...higFilledButton(T, dark),
            width: '100%',
            background: salvando ? (dark ? 'rgba(255,255,255,0.08)' : '#E5E5EA') : HIG_COLOR.red,
            color: salvando ? T.textDim : '#FFFFFF',
            opacity: salvando ? 0.6 : 1,
            cursor: salvando ? 'not-allowed' : 'pointer',
          }}
        >
          <TI name={salvando ? 'loader-2' : 'arrow-back-up'} size={18} />
          {salvando
            ? 'Salvando…'
            : `Voltar pra oficina (${falhas.length} ${falhas.length === 1 ? 'falha' : 'falhas'})`}
        </button>
      )}

    </div>
  )
}
