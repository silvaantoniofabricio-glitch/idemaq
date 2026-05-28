// src/components/osDetalhe/acoes/AcaoOficinaHIG.jsx
// Oficina (Conserto) — Apple HIG, do zero.
//
// Layout Apple HIG correto:
//   - Seção = footnote uppercase cinza + higInsetCard abaixo (nunca ícone no header)
//   - Rows = 44pt, checkbox 22px, label, separador 0.5px
//   - Status pill inline na linha do título da seção
//   - Montagem bloqueada = row com cadeado dentro do card (não desabilita row)
//
// Seções:
//   1. Gate: orçamento fechado? → BloqueioOrcamento se não
//   2. Resumo diagnóstico (relato · causa · componentes)
//   3. Banner falhas do teste final (OS voltou da oficina)
//   4. Aviso diagnóstico vazio
//   5. Seção LIMPEZA (Desmontagem · Limpeza · Montagem)
//   6. Seção MANUTENÇÃO (Desmontagem · componentes · Montagem)
//   7. CTA azul

import React, { useMemo } from 'react'
import { useTheme } from '../../../theme'
import { TI } from '../../_shared/PrimitivasMobile'
import {
  HIG_SPACE, HIG_RADIUS, HIG_SIZE, HIG_COLOR,
  higType, higFilledButton, higInsetCard,
} from '../../../theme-hig'
import { useOSItens } from '../../../hooks/useOSItens'
import { CATEGORIA_POR_ID } from '../../../utils/categoriasPeca'
import { ETAPAS_TODOS } from '../../../utils/osData'

// ─── Separador ───────────────────────────────────────────────────────────────
function Sep({ T }) {
  return <div style={{ height: 0.5, background: T.border, marginLeft: 56 }} />
}

// ─── HIGSection — título uppercase footnote + card + footer opcional ─────────
// O título aceita um `right` para colocar pill/badge alinhado à direita.
function HIGSection({ T, dark, title, right, children, footer }) {
  return (
    <section>
      {(title || right) && (
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
        }}>
          {title && (
            <span style={{
              flex: 1,
              ...higType('footnote'),
              color: HIG_COLOR.gray,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>{title}</span>
          )}
          {right}
        </div>
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

// ─── Pill de status ───────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    pendente:  { label: 'Pendente',      bg: HIG_COLOR.gray5,               color: HIG_COLOR.gray },
    andamento: { label: 'Em andamento',  bg: 'rgba(255,149,0,0.14)',         color: HIG_COLOR.orange },
    concluido: { label: 'Concluído',     bg: 'rgba(52,199,89,0.14)',         color: HIG_COLOR.green },
  }
  const m = map[status] || map.pendente
  return (
    <span style={{
      ...higType('caption2'),
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: HIG_RADIUS.pill,
      background: m.bg,
      color: m.color,
    }}>{m.label}</span>
  )
}

// ─── CheckRow — linha 44pt com checkbox ──────────────────────────────────────
// shared = mostra ↔ indicando que esse passo é compartilhado Limpeza/Manutenção
function CheckRow({ T, dark, label, checked, onToggle, badge, shared }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: '100%', minHeight: HIG_SIZE.touch,
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        padding: `0 ${HIG_SPACE.md}px`,
        background: 'transparent', border: 'none',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        fontFamily: 'inherit', textAlign: 'left',
      }}
    >
      {/* Checkbox iOS — 22px */}
      <span style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        border: `1.5px solid ${checked ? HIG_COLOR.green : HIG_COLOR.gray3}`,
        background: checked
          ? HIG_COLOR.green
          : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .15s, border-color .15s',
      }}>
        {checked && <TI name="check" size={13} color="#fff" />}
      </span>

      {/* Label */}
      <span style={{
        flex: 1,
        ...higType('subheadline'),
        color: checked ? HIG_COLOR.gray : T.textPrimary,
        textDecoration: checked ? 'line-through' : 'none',
      }}>{label}</span>

      {/* Badge Troca / Manut. */}
      {badge && (
        <span style={{
          ...higType('caption2'), fontWeight: 700,
          padding: '2px 7px', borderRadius: HIG_RADIUS.pill,
          background: badge.bg, color: badge.color, flexShrink: 0,
        }}>{badge.label}</span>
      )}

      {/* Indicador ↔ compartilhado */}
      {shared && (
        <TI name="arrows-left-right" size={12} color={HIG_COLOR.gray3} />
      )}
    </button>
  )
}

// ─── BloqueioRow — mostra por que a Montagem está travada ────────────────────
function BloqueioRow({ T, dark, msg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
      padding: `0 ${HIG_SPACE.md}px`,
      minHeight: HIG_SIZE.touch,
      background: dark ? 'rgba(255,149,0,0.06)' : 'rgba(255,149,0,0.05)',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 6, flexShrink: 0,
        background: dark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.10)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <TI name="lock" size={12} color={HIG_COLOR.orange} />
      </span>
      <span style={{ flex: 1, ...higType('footnote'), color: HIG_COLOR.orange }}>
        {msg}
      </span>
    </div>
  )
}

// ─── SubHeader dentro do card (antes dos itens de manutenção) ────────────────
function CardSubHeader({ T, dark, done, total }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
      padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
      background: dark ? 'rgba(255,255,255,0.03)' : HIG_COLOR.gray6,
      borderTop: `0.5px solid ${T.border}`,
    }}>
      <TI name="tool" size={11} color={HIG_COLOR.gray} />
      <span style={{ flex: 1, ...higType('caption2'), fontWeight: 600, color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Serviço de manutenção
      </span>
      <span style={{
        ...higType('caption2'), fontWeight: 700,
        padding: '1px 6px', borderRadius: HIG_RADIUS.pill,
        background: done === total
          ? 'rgba(52,199,89,0.14)'
          : (dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray5),
        color: done === total ? HIG_COLOR.green : HIG_COLOR.gray,
        fontVariantNumeric: 'tabular-nums',
      }}>{done}/{total}</span>
    </div>
  )
}

// ─── Seção Limpeza ────────────────────────────────────────────────────────────
function SecaoLimpeza({ T, dark, status, desmVal, limpVal, montVal, onToggleDesm, onToggleLimp, onToggleMont, outroServDone }) {
  const desmDone = !!desmVal.feito
  const limpDone = !!limpVal.feito

  let montBloqueio = null
  if (!desmDone) montBloqueio = 'Conclua a desmontagem primeiro'
  else if (!limpDone) montBloqueio = 'Conclua a limpeza primeiro'
  else if (!outroServDone) montBloqueio = 'Aguardando manutenção'

  return (
    <HIGSection
      T={T} dark={dark}
      title="Limpeza"
      right={<StatusPill status={status} />}
    >
      <CheckRow
        T={T} dark={dark}
        label="Desmontagem"
        checked={desmDone}
        onToggle={() => onToggleDesm('feito')}
        shared
      />

      <Sep T={T} />

      <CheckRow
        T={T} dark={dark}
        label="Limpeza feita"
        checked={limpDone}
        onToggle={() => onToggleLimp('feito')}
      />

      <Sep T={T} />

      {montBloqueio
        ? <BloqueioRow T={T} dark={dark} msg={montBloqueio} />
        : (
          <CheckRow
            T={T} dark={dark}
            label="Montagem"
            checked={!!montVal.feito}
            onToggle={() => onToggleMont('feito')}
            shared
          />
        )
      }
    </HIGSection>
  )
}

// ─── Seção Manutenção ─────────────────────────────────────────────────────────
function SecaoManutencao({ T, dark, status, desmVal, manutVal, montVal, manutChecks, onToggleDesm, onToggleManut, onToggleMont, outroServDone }) {
  const desmDone = !!desmVal.feito
  const servDone = manutChecks.length > 0 && manutChecks.every(c => manutVal[c.id])
  const servFeitos = manutChecks.filter(c => manutVal[c.id]).length

  let montBloqueio = null
  if (!desmDone) montBloqueio = 'Conclua a desmontagem primeiro'
  else if (!servDone) montBloqueio = 'Conclua todos os itens de serviço'
  else if (!outroServDone) montBloqueio = 'Aguardando limpeza'

  return (
    <HIGSection
      T={T} dark={dark}
      title="Manutenção"
      right={<StatusPill status={status} />}
    >
      <CheckRow
        T={T} dark={dark}
        label="Desmontagem"
        checked={desmDone}
        onToggle={() => onToggleDesm('feito')}
        shared
      />

      {/* Sub-header + itens de serviço */}
      {manutChecks.length > 0 ? (
        <>
          <CardSubHeader T={T} dark={dark} done={servFeitos} total={manutChecks.length} />
          {manutChecks.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && <Sep T={T} />}
              <CheckRow
                T={T} dark={dark}
                label={c.label}
                checked={!!manutVal[c.id]}
                onToggle={() => onToggleManut(c.id)}
                badge={c.badge}
              />
            </React.Fragment>
          ))}
        </>
      ) : (
        <>
          <Sep T={T} />
          <div style={{ padding: `0 ${HIG_SPACE.md}px`, minHeight: HIG_SIZE.touch, display: 'flex', alignItems: 'center' }}>
            <span style={{ ...higType('footnote'), color: HIG_COLOR.gray, fontStyle: 'italic' }}>
              Sem componentes marcados no diagnóstico
            </span>
          </div>
        </>
      )}

      <Sep T={T} />

      {montBloqueio
        ? <BloqueioRow T={T} dark={dark} msg={montBloqueio} />
        : (
          <CheckRow
            T={T} dark={dark}
            label="Montagem"
            checked={!!montVal.feito}
            onToggle={() => onToggleMont('feito')}
            shared
          />
        )
      }
    </HIGSection>
  )
}

// ─── Resumo diagnóstico ───────────────────────────────────────────────────────
function ResumoDiagnostico({ T, dark, relato, causa, componentes }) {
  if (!relato && !causa && componentes.length === 0) return null
  return (
    <HIGSection T={T} dark={dark} title="Diagnóstico">
      {relato && (
        <>
          <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px` }}>
            <div style={{ ...higType('caption2'), color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: HIG_SPACE.xxs }}>
              Relato do cliente
            </div>
            <div style={{ borderLeft: `3px solid ${HIG_COLOR.orange}`, paddingLeft: HIG_SPACE.sm, ...higType('footnote'), color: T.textPrimary, lineHeight: '18px' }}>
              {relato}
            </div>
          </div>
          {(causa || componentes.length > 0) && <Sep T={T} />}
        </>
      )}
      {causa && (
        <>
          <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px` }}>
            <div style={{ ...higType('caption2'), color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: HIG_SPACE.xxs }}>
              Causa identificada
            </div>
            <div style={{ borderLeft: `3px solid ${HIG_COLOR.tintIdemaq}`, paddingLeft: HIG_SPACE.sm, ...higType('footnote'), color: T.textPrimary, lineHeight: '18px' }}>
              {causa}
            </div>
          </div>
          {componentes.length > 0 && <Sep T={T} />}
        </>
      )}
      {componentes.length > 0 && (
        <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px` }}>
          <div style={{ ...higType('caption2'), color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: HIG_SPACE.xs }}>
            Componentes · {componentes.length}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {componentes.map(c => (
              <span key={c.id} style={{
                ...higType('caption2'), fontWeight: 600,
                padding: '3px 8px', borderRadius: HIG_RADIUS.pill,
                background: c.badge.bg, color: c.badge.color,
                border: `1px solid ${c.badge.color}33`,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontWeight: 700, fontSize: 10 }}>{c.badge.label}</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </HIGSection>
  )
}

// ─── Banner falhas do Teste final ─────────────────────────────────────────────
function BannerFalhas({ T, dark, falhas }) {
  if (!falhas.length) return null
  return (
    <HIGSection T={T} dark={dark}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        background: dark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.07)',
        minHeight: 40,
      }}>
        <TI name="alert-triangle" size={14} color={HIG_COLOR.red} />
        <span style={{ ...higType('footnote'), fontWeight: 700, color: HIG_COLOR.red, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Falhas do teste final — corrigir
        </span>
      </div>
      {falhas.map((f, i) => (
        <React.Fragment key={i}>
          <Sep T={T} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
            padding: `0 ${HIG_SPACE.md}px`, minHeight: HIG_SIZE.touch,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: dark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.08)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TI name="x" size={12} color={HIG_COLOR.red} />
            </span>
            <span style={{ ...higType('subheadline'), color: T.textPrimary, flex: 1 }}>
              {typeof f === 'string' ? f : (f.label || f.descricao || JSON.stringify(f))}
            </span>
          </div>
        </React.Fragment>
      ))}
    </HIGSection>
  )
}

// ─── Constantes de checklist ──────────────────────────────────────────────────
const CHECKS_DESMONTAGEM = [{ id: 'feito' }]
const CHECKS_MONTAGEM    = [{ id: 'feito' }]

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AcaoOficinaHIG({ os, onUpdateOS, onMoverOS, onAbrirAba }) {
  const { T, dark } = useTheme()
  const { itens } = useOSItens(os?.id)

  const temLimpeza = useMemo(
    () => (itens || []).some(it => /limpeza/i.test(it.nome || '')),
    [itens]
  )
  const temManutencao = useMemo(
    () => (itens || []).some(it => !/limpeza/i.test(it.nome || '')),
    [itens]
  )

  // Checklist da manutenção vem do diagnóstico
  const manutChecks = useMemo(() => {
    const marcados = os?.pre_diagnostico?.componentes_marcados || {}
    const out = []
    for (const [, items] of Object.entries(marcados)) {
      if (!items || typeof items !== 'object') continue
      const pares = Array.isArray(items)
        ? items.map(id => [id, 'troca'])
        : Object.entries(items)
      for (const [itemId, acao] of pares) {
        const cat = CATEGORIA_POR_ID[itemId]
        const isManut = acao === 'manutencao'
        out.push({
          id: itemId,
          label: cat?.label || itemId,
          badge: {
            label: isManut ? 'Manut.' : 'Troca',
            color: isManut ? HIG_COLOR.orange : HIG_COLOR.red,
            bg: isManut
              ? (dark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.10)')
              : (dark ? 'rgba(255,59,48,0.15)'  : 'rgba(255,59,48,0.08)'),
          },
        })
      }
    }
    return out
  }, [os?.pre_diagnostico?.componentes_marcados, dark])

  // Estado persistido em pre_diagnostico.oficina.execucao
  const oficinaJsonb = os?.pre_diagnostico?.oficina || {}
  const exec = oficinaJsonb.execucao || {}
  const desmVal  = exec.desmontagem  || {}
  const montVal  = exec.montagem     || {}
  const limpVal  = exec.limpeza_serv || {}
  const manutVal = exec.manut_serv   || {}

  const falhas = Array.isArray(os?.pre_diagnostico?.teste_falhas)
    ? os.pre_diagnostico.teste_falhas : []

  function persistExec(novoExec) {
    const desmOk = !!novoExec.desmontagem?.feito
    const montOk = !!novoExec.montagem?.feito
    const limpServOk = !!novoExec.limpeza_serv?.feito
    const manutServOk = manutChecks.length > 0
      && manutChecks.every(c => novoExec.manut_serv?.[c.id])

    const calcStatus = (servOk) => {
      if (desmOk && servOk && montOk) return 'concluido'
      if (desmOk || servOk || montOk) return 'andamento'
      return 'pendente'
    }

    const novaOficina = { ...oficinaJsonb, execucao: novoExec }
    if (temLimpeza)    novaOficina.limpeza_status    = calcStatus(limpServOk)
    if (temManutencao) novaOficina.manutencao_status = calcStatus(manutServOk)

    onUpdateOS?.(os.numero, {
      pre_diagnostico: { ...(os.pre_diagnostico || {}), oficina: novaOficina },
    })
  }

  const toggleEm = (secao) => (chaveId) => {
    const atual = exec[secao] || {}
    const novo = { ...atual }
    if (novo[chaveId]) delete novo[chaveId]; else novo[chaveId] = true
    persistExec({ ...exec, [secao]: novo })
  }

  const limpServDone = !temLimpeza || !!limpVal.feito
  const manutServDone = !temManutencao
    || (manutChecks.length > 0 && manutChecks.every(c => manutVal[c.id]))

  const desmDone  = !!desmVal.feito
  const montDone  = !!montVal.feito
  const tudoDone  = desmDone && limpServDone && manutServDone && montDone

  function concluirOficina() {
    if (!tudoDone) return
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'teste_final')
    if (proxima) onMoverOS?.(os.numero, proxima.id)
  }

  // Gate: orçamento fechado?
  const orcStatus = os?.pre_diagnostico?.orcamento_status || os?.orcamento_status
  const orcamentoFechado = orcStatus === 'confirmado' || (itens || []).length > 0
  if (!orcamentoFechado) {
    return <BloqueioOrcamento T={T} dark={dark} os={os} itens={itens} onAbrirAba={onAbrirAba} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg }}>

      {/* 1. Resumo diagnóstico */}
      <ResumoDiagnostico
        T={T} dark={dark}
        relato={os?.defeito || ''}
        causa={os?.pre_diagnostico?.causa_diagnostico || ''}
        componentes={manutChecks}
      />

      {/* 2. Falhas do Teste (quando OS volta) */}
      <BannerFalhas T={T} dark={dark} falhas={falhas} />

      {/* 3. Aviso diagnóstico vazio */}
      {temManutencao && manutChecks.length === 0 && (
        <HIGSection T={T} dark={dark}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
            padding: `0 ${HIG_SPACE.md}px`, minHeight: HIG_SIZE.touch,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: HIG_RADIUS.sm, flexShrink: 0,
              background: dark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.10)',
              color: HIG_COLOR.orange,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TI name="info-circle" size={14} />
            </span>
            <span style={{ ...higType('footnote'), color: HIG_COLOR.gray, flex: 1, lineHeight: '18px' }}>
              O orçamento tem manutenção mas o diagnóstico não tem componentes marcados. Volte e marque os componentes.
            </span>
          </div>
        </HIGSection>
      )}

      {/* 4. Lados */}
      {temLimpeza && (
        <SecaoLimpeza
          T={T} dark={dark}
          status={oficinaJsonb.limpeza_status || 'pendente'}
          desmVal={desmVal} limpVal={limpVal} montVal={montVal}
          onToggleDesm={toggleEm('desmontagem')}
          onToggleLimp={toggleEm('limpeza_serv')}
          onToggleMont={toggleEm('montagem')}
          outroServDone={manutServDone}
        />
      )}

      {temManutencao && (
        <SecaoManutencao
          T={T} dark={dark}
          status={oficinaJsonb.manutencao_status || 'pendente'}
          desmVal={desmVal} manutVal={manutVal} montVal={montVal}
          manutChecks={manutChecks}
          onToggleDesm={toggleEm('desmontagem')}
          onToggleManut={toggleEm('manut_serv')}
          onToggleMont={toggleEm('montagem')}
          outroServDone={limpServDone}
        />
      )}

      {!temLimpeza && !temManutencao && (
        <HIGSection T={T} dark={dark} title="Conserto">
          <div style={{
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
            padding: `0 ${HIG_SPACE.md}px`, minHeight: HIG_SIZE.touch,
          }}>
            <TI name="info-circle" size={15} color={HIG_COLOR.gray} />
            <span style={{ ...higType('subheadline'), color: HIG_COLOR.gray }}>
              Adicione itens no orçamento pra liberar o conserto.
            </span>
          </div>
        </HIGSection>
      )}

      {/* 5. CTA */}
      <button
        type="button"
        disabled={!tudoDone}
        onClick={concluirOficina}
        style={{
          ...higFilledButton(
            tudoDone
              ? HIG_COLOR.tintIdemaq
              : (dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray5)
          ),
          color: tudoDone ? '#fff' : HIG_COLOR.gray,
          cursor: tudoDone ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: HIG_SPACE.sm,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <TI name={tudoDone ? 'check' : 'lock'} size={17} />
        <span style={{ ...higType('headline'), color: 'inherit' }}>
          {tudoDone ? 'Concluir conserto · Teste final' : 'Conclua todas as etapas pra avançar'}
        </span>
      </button>

    </div>
  )
}

// ─── Tela de bloqueio (orçamento não fechado) ─────────────────────────────────
const ETAPAS_SEQ = [
  { id: 'recebido',    label: 'Pré-diagnóstico' },
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'orcamento',   label: 'Orçamento' },
  { id: 'oficina',     label: 'Conserto' },
]

function BloqueioOrcamento({ T, dark, os, itens, onAbrirAba }) {
  const statusOf = (id) => {
    if (id === 'oficina') return 'blocked'
    if (id === 'orcamento' && !(itens || []).length) return 'miss'
    return 'done'
  }
  const metaOf = (id) => {
    if (id === 'diagnostico') {
      const marc = os?.pre_diagnostico?.componentes_marcados || {}
      const n = Object.values(marc).reduce((s, o) => s + Object.keys(o || {}).length, 0)
      return n ? `${n} componentes marcados` : 'Feito'
    }
    if (id === 'orcamento') {
      const n = (itens || []).length
      return n ? `${n} itens cadastrados` : 'Pendente — sem itens'
    }
    if (id === 'oficina') return 'Liberado quando o orçamento for fechado'
    return 'Feito'
  }

  function Sep2({ T }) {
    return <div style={{ height: 0.5, background: T.border, marginLeft: HIG_SPACE.md + 28 + HIG_SPACE.sm }} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg }}>

      {/* Aviso */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: HIG_SPACE.sm,
        padding: HIG_SPACE.md,
        background: dark ? 'rgba(255,149,0,0.10)' : 'rgba(255,149,0,0.07)',
        borderRadius: HIG_RADIUS.md,
        border: `1px solid ${HIG_COLOR.orange}33`,
      }}>
        <span style={{
          width: 32, height: 32, borderRadius: HIG_RADIUS.md, flexShrink: 0,
          background: dark ? 'rgba(255,149,0,0.18)' : 'rgba(255,149,0,0.14)',
          color: HIG_COLOR.orange,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TI name="alert-triangle" size={16} />
        </span>
        <div>
          <div style={{ ...higType('subheadline'), fontWeight: 600, color: T.textPrimary, marginBottom: 2 }}>
            Etapa anterior pendente
          </div>
          <div style={{ ...higType('footnote'), color: HIG_COLOR.gray, lineHeight: '18px' }}>
            Feche o orçamento antes de iniciar o conserto.
          </div>
        </div>
      </div>

      {/* Timeline */}
      <section>
        <div style={{
          padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
          ...higType('footnote'),
          color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Progresso</div>
        <div style={higInsetCard(T, dark)}>
          {ETAPAS_SEQ.map((step, idx) => {
            const status = statusOf(step.id)
            const meta   = metaOf(step.id)
            const isLast = idx === ETAPAS_SEQ.length - 1
            const cfg = {
              done:    { icon: 'check',        iconColor: HIG_COLOR.green,  bg: 'rgba(52,199,89,0.14)',  lineColor: HIG_COLOR.green },
              miss:    { icon: 'alert-circle',  iconColor: HIG_COLOR.orange, bg: 'rgba(255,149,0,0.12)', lineColor: HIG_COLOR.orange },
              blocked: { icon: 'lock',          iconColor: HIG_COLOR.gray2,  bg: dark ? 'rgba(255,255,255,0.06)' : HIG_COLOR.gray5, lineColor: T.border },
            }[status]

            return (
              <React.Fragment key={step.id}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: HIG_SPACE.sm,
                  padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
                  minHeight: HIG_SIZE.touch,
                  position: 'relative',
                }}>
                  {!isLast && (
                    <div style={{
                      position: 'absolute',
                      left: HIG_SPACE.md + 14,
                      top: HIG_SIZE.touch - 2,
                      bottom: 0,
                      width: 2,
                      background: cfg.lineColor,
                      opacity: 0.3,
                      zIndex: 0,
                    }} />
                  )}
                  <span style={{
                    width: 28, height: 28, borderRadius: HIG_RADIUS.pill,
                    background: cfg.bg, color: cfg.iconColor,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, zIndex: 1,
                  }}>
                    <TI name={cfg.icon} size={13} />
                  </span>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{
                      ...higType('subheadline'),
                      fontWeight: status === 'miss' ? 600 : 400,
                      color: status === 'blocked' ? HIG_COLOR.gray : T.textPrimary,
                    }}>
                      {step.label}{step.id === 'oficina' && ' · você está aqui'}
                    </div>
                    {meta && (
                      <div style={{
                        ...higType('caption1'), marginTop: 1,
                        color: status === 'miss' ? HIG_COLOR.orange : HIG_COLOR.gray,
                        fontWeight: status === 'miss' ? 600 : 400,
                      }}>{meta}</div>
                    )}
                  </div>
                </div>
                {!isLast && <Sep2 T={T} />}
              </React.Fragment>
            )
          })}
        </div>
      </section>

      <button
        type="button"
        onClick={() => onAbrirAba?.('pagamento')}
        style={{
          ...higFilledButton(HIG_COLOR.tintIdemaq),
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: HIG_SPACE.sm,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <TI name="arrow-back-up" size={17} />
        <span style={{ ...higType('headline'), color: '#fff' }}>Voltar pro Orçamento</span>
      </button>

    </div>
  )
}
