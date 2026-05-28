// src/components/osDetalhe/acoes/AcaoTesteHIG.jsx
// Teste final — Apple HIG, do zero.
//
// Seções:
//   1. Resumo do diagnóstico (relato · causa · componentes)
//   2. Testes finais — acordeão por teste (OK / Defeito / Barulho)
//   3. Acabamento — 3 checkrows (Secagem · Polimento · Enceramento),
//      só aparece se OS tem Limpeza no orçamento
//   4. Observações (textarea · auto-save · global os.observacoes)
//   5. CTA — "Aprovar · ir pra Entrega" ou "Voltar pra oficina (N falhas)"
//
// Lógica preservada de AcaoTeste.jsx:
//  - podeAprovar = todos testes preenchidos + todos OK + acabamento OK
//  - podeVoltarOficina = há defeito ou barulho em qualquer teste
//  - Persistência: useChecklistEtapa('teste_final') + useFalhaTeste

import React, { useState, useEffect, useMemo } from 'react'
import { useTheme } from '../../../theme'
import { TI } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR,
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

const OPCOES = [
  {
    id: 'ok',
    label: 'OK',
    icon: 'check',
    color: HIG_COLOR.green,
    bgDark: 'rgba(52,199,89,0.18)',
    bgLight: 'rgba(52,199,89,0.12)',
  },
  {
    id: 'defeito',
    label: 'Defeito',
    icon: 'alert-triangle',
    color: HIG_COLOR.red,
    bgDark: 'rgba(255,59,48,0.18)',
    bgLight: 'rgba(255,59,48,0.10)',
  },
  {
    id: 'barulho',
    label: 'Barulho',
    icon: 'volume',
    color: HIG_COLOR.orange,
    bgDark: 'rgba(255,149,0,0.18)',
    bgLight: 'rgba(255,149,0,0.12)',
  },
]

// ─── Primitivos ───────────────────────────────────────────────────────────────
function Sep({ T }) {
  return <div style={{ height: 0.5, background: T.border, marginLeft: HIG_SPACE.lg }} />
}

function HIGSection({ T, dark, title, children, footer }) {
  return (
    <section>
      {title && (
        <div style={{
          padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
          ...higType('footnote'),
          color: HIG_COLOR.gray,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>{title}</div>
      )}
      <div style={higInsetCard(T, dark)}>{children}</div>
      {footer && (
        <div style={{
          padding: `${HIG_SPACE.xxs}px ${HIG_SPACE.md}px 0`,
          ...higType('caption1'),
          color: HIG_COLOR.gray,
        }}>{footer}</div>
      )}
    </section>
  )
}

// Badge de resultado atual (exibido na linha fechada do acordeão)
function ResultBadge({ valor, dark }) {
  if (!valor) return null
  const op = OPCOES.find(o => o.id === valor)
  if (!op) return null
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      ...higType('caption2'),
      fontWeight: 700,
      padding: '3px 8px',
      borderRadius: HIG_RADIUS.pill,
      background: dark ? op.bgDark : op.bgLight,
      color: op.color,
    }}>
      <TI name={op.icon} size={10} />
      {op.label}
    </span>
  )
}

// ─── Acordeão de teste ────────────────────────────────────────────────────────
function TesteAccordion({ T, dark, teste, valor, onChange, open, onToggle }) {
  return (
    <div>
      {/* Linha principal — 44pt */}
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%', minHeight: HIG_SIZE.touch,
          display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
          padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        {/* Ícone badge 32px */}
        <span style={{
          width: 32, height: 32, borderRadius: HIG_RADIUS.sm, flexShrink: 0,
          background: valor
            ? (dark ? OPCOES.find(o => o.id === valor)?.bgDark : OPCOES.find(o => o.id === valor)?.bgLight)
            : (dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray6),
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
        }}>
          <TI
            name={valor ? OPCOES.find(o => o.id === valor)?.icon || teste.icon : teste.icon}
            size={16}
            color={valor ? OPCOES.find(o => o.id === valor)?.color : HIG_COLOR.gray}
          />
        </span>

        {/* Label */}
        <span style={{ flex: 1, ...higType('subheadline'), color: T.textPrimary }}>
          {teste.label}
        </span>

        {/* Badge resultado ou chevron */}
        {valor
          ? <ResultBadge valor={valor} dark={dark} />
          : <TI name={open ? 'chevron-up' : 'chevron-down'} size={14} color={HIG_COLOR.gray3} />
        }
        {valor && (
          <TI name={open ? 'chevron-up' : 'chevron-down'} size={14} color={HIG_COLOR.gray3} />
        )}
      </button>

      {/* Painel expandido — 3 botões em grid */}
      {open && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: HIG_SPACE.xs,
          padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px ${HIG_SPACE.sm}px`,
          background: dark ? 'rgba(255,255,255,0.03)' : HIG_COLOR.gray6,
        }}>
          {OPCOES.map(op => {
            const sel = valor === op.id
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => {
                  onChange(sel ? null : op.id)
                  onToggle()
                }}
                style={{
                  minHeight: 60,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 5,
                  borderRadius: HIG_RADIUS.md,
                  border: `1.5px solid ${sel ? op.color : (dark ? 'rgba(255,255,255,0.12)' : HIG_COLOR.gray4)}`,
                  background: sel
                    ? (dark ? op.bgDark : op.bgLight)
                    : (dark ? 'rgba(255,255,255,0.06)' : '#fff'),
                  cursor: 'pointer',
                  WebkitTapHighlightColor: 'transparent',
                  fontFamily: 'inherit',
                  transition: 'background 0.12s, border-color 0.12s',
                }}
              >
                <TI name={op.icon} size={20} color={sel ? op.color : HIG_COLOR.gray} />
                <span style={{
                  ...higType('caption2'),
                  fontWeight: 600,
                  color: sel ? op.color : HIG_COLOR.gray,
                }}>{op.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── CheckRow de acabamento ───────────────────────────────────────────────────
function AcabCheckRow({ T, dark, item, feito, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%', minHeight: HIG_SIZE.touch,
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      {/* Checkbox */}
      <span style={{
        width: 22, height: 22, borderRadius: HIG_RADIUS.sm, flexShrink: 0,
        border: `1.5px solid ${feito ? HIG_COLOR.green : HIG_COLOR.gray3}`,
        background: feito
          ? HIG_COLOR.green
          : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)'),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, border-color 0.15s',
      }}>
        {feito && <TI name="check" size={13} color="#fff" />}
      </span>

      {/* Ícone + label */}
      <span style={{
        width: 28, height: 28, borderRadius: HIG_RADIUS.sm, flexShrink: 0,
        background: feito
          ? (dark ? 'rgba(52,199,89,0.18)' : 'rgba(52,199,89,0.12)')
          : (dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray6),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TI name={item.icon} size={14} color={feito ? HIG_COLOR.green : HIG_COLOR.gray} />
      </span>

      <span style={{
        flex: 1,
        ...higType('subheadline'),
        color: feito ? HIG_COLOR.gray : T.textPrimary,
        textDecoration: feito ? 'line-through' : 'none',
      }}>{item.label}</span>
    </button>
  )
}

// ─── Resumo do diagnóstico ────────────────────────────────────────────────────
function ResumoDiagnostico({ T, dark, os }) {
  const relato = os?.defeito || ''
  const causa = os?.pre_diagnostico?.causa_diagnostico || ''
  const marcados = os?.pre_diagnostico?.componentes_marcados || {}
  const chips = []
  for (const [, items] of Object.entries(marcados)) {
    if (!items || typeof items !== 'object') continue
    const pares = Array.isArray(items)
      ? items.map(id => [id, 'troca'])
      : Object.entries(items)
    for (const [itemId, acao] of pares) {
      const cat = CATEGORIA_POR_ID[itemId]
      chips.push({ id: itemId, label: cat?.label || itemId, acao })
    }
  }
  if (!relato && !causa && chips.length === 0) return null

  const isManut = (acao) => acao === 'manutencao'

  return (
    <HIGSection T={T} dark={dark} title="Diagnóstico">
      {relato && (
        <>
          <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px` }}>
            <div style={{ ...higType('caption2'), color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: HIG_SPACE.xxs }}>
              Relato do cliente
            </div>
            <div style={{
              borderLeft: `3px solid ${HIG_COLOR.orange}`,
              paddingLeft: HIG_SPACE.sm,
              ...higType('footnote'),
              color: T.textPrimary, lineHeight: '18px',
            }}>{relato}</div>
          </div>
          {(causa || chips.length > 0) && <Sep T={T} />}
        </>
      )}
      {causa && (
        <>
          <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px` }}>
            <div style={{ ...higType('caption2'), color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: HIG_SPACE.xxs }}>
              Causa identificada
            </div>
            <div style={{
              borderLeft: `3px solid ${HIG_COLOR.tintIdemaq}`,
              paddingLeft: HIG_SPACE.sm,
              ...higType('footnote'),
              color: T.textPrimary, lineHeight: '18px',
            }}>{causa}</div>
          </div>
          {chips.length > 0 && <Sep T={T} />}
        </>
      )}
      {chips.length > 0 && (
        <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px` }}>
          <div style={{ ...higType('caption2'), color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: HIG_SPACE.xs }}>
            Componentes · {chips.length}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chips.map(c => {
              const iM = isManut(c.acao)
              const col = iM ? HIG_COLOR.orange : HIG_COLOR.red
              const bg  = iM
                ? (dark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.10)')
                : (dark ? 'rgba(255,59,48,0.15)'  : 'rgba(255,59,48,0.08)')
              return (
                <span key={c.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  ...higType('caption2'), fontWeight: 600,
                  padding: '3px 8px', borderRadius: HIG_RADIUS.pill,
                  background: bg, color: col, border: `1px solid ${col}33`,
                }}>
                  <span style={{ fontWeight: 700, fontSize: 10 }}>{iM ? 'MANUT.' : 'TROCA'}</span>
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
  const [aberto, setAberto] = useState(null) // id do teste com acordeão aberto

  // Hidratação inicial do checklist
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

  // Sincroniza obs quando outra etapa altera os.observacoes
  useEffect(() => {
    if (hidratado) setObs(os?.observacoes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os?.observacoes])

  // Auto-save obs (debounce 500ms)
  useEffect(() => {
    if (!hidratado) return
    if (obs === (os?.observacoes || '')) return
    const t = setTimeout(() => {
      onUpdateOS?.(os.numero, { observacoes: obs })
    }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obs, hidratado])

  function setResultado(testeId, valor) {
    setTestes(prev => ({ ...prev, [testeId]: valor }))
  }
  function toggleAcab(itemId) {
    setAcabamento(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  function serializarChecklist() {
    const linhasTestes = TESTES.map(t => ({
      id: `teste:${t.id}`, label: t.label,
      checked: testes[t.id] === 'ok',
      valor: testes[t.id] || null,
    }))
    const linhasAcab = temLimpeza
      ? ACABAMENTO.map(a => ({ id: `acab:${a.id}`, label: a.label, checked: !!acabamento[a.id] }))
      : []
    return [...linhasTestes, ...linhasAcab]
  }

  const falhas = TESTES
    .filter(t => testes[t.id] === 'defeito' || testes[t.id] === 'barulho')
    .map(t => `${t.label}: ${testes[t.id] === 'defeito' ? 'com defeito' : 'com barulho'}`)

  const todosTestesPreenchidos = TESTES.every(t => testes[t.id] != null)
  const todosTestesOk = todosTestesPreenchidos && falhas.length === 0
  const acabPendentes = ACABAMENTO.filter(a => !acabamento[a.id]).length
  const todoAcabOk = !temLimpeza || acabPendentes === 0
  const podeAprovar = todosTestesOk && todoAcabOk
  const podeVoltarOficina = falhas.length > 0

  const okCount = TESTES.filter(t => testes[t.id] === 'ok').length

  async function aprovar() {
    setSalvando(true)
    await salvarChk(serializarChecklist(), null)
    if (obs !== (os?.observacoes || '')) {
      onUpdateOS?.(os.numero, { observacoes: obs })
    }
    await sincronizarAbertas([])
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'entrega')
    setSalvando(false)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  async function voltarOficina() {
    setSalvando(true)
    await salvarChk(serializarChecklist(), null)
    if (obs !== (os?.observacoes || '')) {
      onUpdateOS?.(os.numero, { observacoes: obs })
    }
    await sincronizarAbertas(falhas)
    const oficina = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'oficina')
    setSalvando(false)
    if (oficina) onMoverOS(os.numero, oficina.id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg }}>

      {/* 1. Resumo do diagnóstico */}
      <ResumoDiagnostico T={T} dark={dark} os={os} />

      {/* 2. Testes finais — acordeão */}
      <HIGSection
        T={T} dark={dark}
        title="Testes finais"
        footer={todosTestesPreenchidos
          ? (todosTestesOk
              ? `Todos os ${TESTES.length} testes passaram ✓`
              : `${falhas.length} falha${falhas.length > 1 ? 's' : ''} detectada${falhas.length > 1 ? 's' : ''}`)
          : `${okCount} de ${TESTES.length} preenchidos`}
      >
        {TESTES.map((t, i) => (
          <React.Fragment key={t.id}>
            {i > 0 && <Sep T={T} />}
            <TesteAccordion
              T={T} dark={dark}
              teste={t}
              valor={testes[t.id]}
              onChange={(v) => setResultado(t.id, v)}
              open={aberto === t.id}
              onToggle={() => setAberto(aberto === t.id ? null : t.id)}
            />
          </React.Fragment>
        ))}
      </HIGSection>

      {/* 3. Acabamento (só se tem Limpeza) */}
      {temLimpeza && (
        <HIGSection
          T={T} dark={dark}
          title="Acabamento"
          footer={acabPendentes === 0
            ? 'Acabamento completo ✓'
            : `${ACABAMENTO.length - acabPendentes} de ${ACABAMENTO.length} marcados`}
        >
          {ACABAMENTO.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 && <Sep T={T} />}
              <AcabCheckRow
                T={T} dark={dark}
                item={a}
                feito={!!acabamento[a.id]}
                onToggle={() => toggleAcab(a.id)}
              />
            </React.Fragment>
          ))}
        </HIGSection>
      )}

      {/* 4. Observações */}
      <HIGSection T={T} dark={dark} title="Observações">
        <div style={{ padding: `${HIG_SPACE.xs}px ${HIG_SPACE.sm}px` }}>
          <textarea
            placeholder="Ex: ficou tudo OK; cliente vai retirar amanhã…"
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: `${HIG_SPACE.xs}px ${HIG_SPACE.sm}px`,
              borderRadius: HIG_RADIUS.md,
              border: `1px solid ${T.border}`,
              background: 'transparent',
              color: T.textPrimary,
              ...higType('subheadline'),
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
              WebkitTapHighlightColor: 'transparent',
            }}
          />
        </div>
      </HIGSection>

      {/* 5. CTAs */}
      {!podeVoltarOficina && (
        <button
          type="button"
          disabled={!podeAprovar || salvando}
          onClick={aprovar}
          style={{
            ...higFilledButton(
              podeAprovar ? HIG_COLOR.tintIdemaq : (dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray5)
            ),
            color: podeAprovar ? '#fff' : HIG_COLOR.gray,
            cursor: podeAprovar && !salvando ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: HIG_SPACE.sm,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <TI name={podeAprovar ? 'circle-check' : 'lock'} size={17} />
          <span style={{ ...higType('headline'), color: 'inherit' }}>
            {salvando
              ? 'Salvando…'
              : podeAprovar
                ? 'Aprovar teste · ir pra Entrega'
                : !todosTestesPreenchidos
                  ? `Preencha os ${TESTES.length} testes`
                  : `Marque o acabamento (${acabPendentes} pendente${acabPendentes !== 1 ? 's' : ''})`}
          </span>
        </button>
      )}

      {podeVoltarOficina && (
        <button
          type="button"
          disabled={salvando}
          onClick={voltarOficina}
          style={{
            ...higFilledButton(HIG_COLOR.red),
            color: '#fff',
            cursor: salvando ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: HIG_SPACE.sm,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <TI name="arrow-back-up" size={17} />
          <span style={{ ...higType('headline'), color: '#fff' }}>
            {salvando
              ? 'Salvando…'
              : `Voltar pra oficina (${falhas.length} ${falhas.length === 1 ? 'falha' : 'falhas'})`}
          </span>
        </button>
      )}

    </div>
  )
}
