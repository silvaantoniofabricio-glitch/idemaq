// src/components/osDetalhe/acoes/AcaoOficinaHIG.jsx
// Oficina (Conserto) — Apple HIG, do zero.
//
// Seções:
//   1. Gate: orçamento fechado? Se não → tela BloqueioOrcamento
//   2. Resumo do diagnóstico (relato · causa · componentes)
//   3. Banner falhas do teste final (quando OS volta pra corrigir)
//   4. Aviso diagnóstico vazio (tem manutenção mas sem componentes)
//   5. Lado Limpeza (HIGSection com 3 linhas: Desmont. · Limpeza · Montagem)
//   6. Lado Manutenção (HIGSection com Desmont. · serviço por componente · Montagem)
//   7. CTA "Concluir conserto → Teste final"
//
// Lógica preservada de AcaoOficina.jsx:
//  - Desmontagem e Montagem são COMPARTILHADAS (marcar num lado marca no outro)
//  - Montagem bloqueada até: desm OK + serviço próprio OK + serviço do outro OK
//  - Persistência em pre_diagnostico.oficina.execucao (jsonb)
//  - Limpeza ativa se orcamento tem /limpeza/i; Manutenção = o resto

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

// Pill de status da seção (Limpeza / Manutenção)
function StatusPill({ status }) {
  const map = {
    pendente:  { label: 'Pendente',  bg: HIG_COLOR.gray5, color: HIG_COLOR.gray },
    andamento: { label: 'Em andamento', bg: 'rgba(255,149,0,0.15)', color: HIG_COLOR.orange },
    concluido: { label: 'Concluído', bg: 'rgba(52,199,89,0.15)', color: HIG_COLOR.green },
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

// Header de seção com pill de status e badge sync ↔
function LadoHeader({ T, dark, icon, label, status, synced }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
      padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
    }}>
      <span style={{
        width: 28, height: 28, borderRadius: HIG_RADIUS.sm,
        background: dark ? 'rgba(91,155,213,0.18)' : 'rgba(91,155,213,0.12)',
        color: HIG_COLOR.tintIdemaq,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <TI name={icon} size={14} />
      </span>
      <span style={{ flex: 1, ...higType('footnote'), fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: HIG_COLOR.gray }}>
        {label}
      </span>
      <StatusPill status={status} />
    </div>
  )
}

// ─── CheckRow — linha de 44pt com checkbox ────────────────────────────────────
function CheckRow({ T, dark, label, checked, disabled, onToggle, badge, shared }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      style={{
        width: '100%', minHeight: HIG_SIZE.touch,
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        WebkitTapHighlightColor: 'transparent',
        fontFamily: 'inherit',
        textAlign: 'left',
      }}
    >
      {/* Checkbox */}
      <span style={{
        width: 22, height: 22, borderRadius: HIG_RADIUS.sm, flexShrink: 0,
        border: `1.5px solid ${checked ? HIG_COLOR.green : HIG_COLOR.gray3}`,
        background: checked
          ? HIG_COLOR.green
          : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)'),
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, border-color 0.15s',
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

      {/* Badge de ação (Troca / Manut.) */}
      {badge && (
        <span style={{
          ...higType('caption2'),
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: HIG_RADIUS.pill,
          background: badge.bg,
          color: badge.color,
          flexShrink: 0,
        }}>{badge.label}</span>
      )}

      {/* Ícone compartilhado ↔ */}
      {shared && (
        <TI name="arrows-left-right" size={12} color={HIG_COLOR.gray2} />
      )}
    </button>
  )
}

// ─── Linha de bloqueio (com cadeado + motivo) ────────────────────────────────
function BloqueioRow({ T, dark, msg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
      padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
      background: dark ? 'rgba(255,204,0,0.08)' : 'rgba(255,204,0,0.10)',
      minHeight: 36,
    }}>
      <TI name="lock" size={13} color={HIG_COLOR.orange} />
      <span style={{ ...higType('caption1'), color: HIG_COLOR.orange, flex: 1 }}>{msg}</span>
    </div>
  )
}

// ─── Sub-header de grupo dentro do card ──────────────────────────────────────
function SubGroupHeader({ T, dark, label, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: HIG_SPACE.xs,
      padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
      background: dark ? 'rgba(255,255,255,0.04)' : HIG_COLOR.gray6,
      borderTop: `0.5px solid ${T.border}`,
    }}>
      <TI name="tool" size={12} color={HIG_COLOR.gray} />
      <span style={{ flex: 1, ...higType('caption1'), fontWeight: 600, color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
      {count > 0 && (
        <span style={{
          ...higType('caption2'),
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: HIG_RADIUS.pill,
          background: dark ? 'rgba(255,255,255,0.10)' : HIG_COLOR.gray5,
          color: HIG_COLOR.gray,
          fontVariantNumeric: 'tabular-nums',
        }}>{count}</span>
      )}
    </div>
  )
}

// ─── Card de lado (Limpeza ou Manutenção) ─────────────────────────────────────
function CardLado({
  T, dark, titulo, icon, status,
  desmCheck, servChecks, montCheck,
  desmVal, servVal, montVal,
  onToggleDesm, onToggleServ, onToggleMont,
  outroServDone, outroLabel,
  sempreLista,
}) {
  const desmDone = desmCheck.every(c => desmVal[c.id])
  const servDone = servChecks.length > 0 && servChecks.every(c => servVal[c.id])

  let montBloqueio = null
  if (!desmDone) montBloqueio = 'Conclua a desmontagem primeiro'
  else if (!servDone) montBloqueio = `Conclua ${titulo.toLowerCase()} primeiro`
  else if (!outroServDone) montBloqueio = `Aguardando ${outroLabel}`

  return (
    <section>
      <LadoHeader T={T} dark={dark} icon={icon} label={titulo} status={status} />
      <div style={higInsetCard(T, dark)}>

        {/* Desmontagem — sempre 1 check (shared) */}
        <CheckRow
          T={T} dark={dark}
          label="Desmontagem"
          checked={!!desmVal[desmCheck[0].id]}
          onToggle={() => onToggleDesm(desmCheck[0].id)}
          shared
        />

        <Sep T={T} />

        {/* Serviço */}
        {servChecks.length === 0 ? (
          <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`, ...higType('footnote'), color: HIG_COLOR.gray, fontStyle: 'italic' }}>
            Sem itens de serviço
          </div>
        ) : sempreLista ? (
          <>
            <SubGroupHeader T={T} dark={dark} label="Serviço de manutenção" count={servChecks.filter(c => servVal[c.id]).length + '/' + servChecks.length} />
            {servChecks.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && <Sep T={T} />}
                <CheckRow
                  T={T} dark={dark}
                  label={c.label}
                  checked={!!servVal[c.id]}
                  onToggle={() => onToggleServ(c.id)}
                  badge={c.badge}
                />
              </React.Fragment>
            ))}
          </>
        ) : (
          <CheckRow
            T={T} dark={dark}
            label={servChecks[0].label}
            checked={!!servVal[servChecks[0].id]}
            onToggle={() => onToggleServ(servChecks[0].id)}
          />
        )}

        <Sep T={T} />

        {/* Montagem — shared, pode estar bloqueada */}
        {montBloqueio ? (
          <BloqueioRow T={T} dark={dark} msg={montBloqueio} />
        ) : (
          <CheckRow
            T={T} dark={dark}
            label="Montagem"
            checked={!!montVal[montCheck[0].id]}
            onToggle={() => onToggleMont(montCheck[0].id)}
            shared
          />
        )}

      </div>
    </section>
  )
}

// ─── ResumoDiagnostico ────────────────────────────────────────────────────────
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
            <div style={{
              borderLeft: `3px solid ${HIG_COLOR.orange}`,
              paddingLeft: HIG_SPACE.sm,
              ...higType('footnote'),
              color: T.textPrimary,
              lineHeight: '18px',
            }}>{relato}</div>
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
            <div style={{
              borderLeft: `3px solid ${HIG_COLOR.tintIdemaq}`,
              paddingLeft: HIG_SPACE.sm,
              ...higType('footnote'),
              color: T.textPrimary,
              lineHeight: '18px',
            }}>{causa}</div>
          </div>
          {componentes.length > 0 && <Sep T={T} />}
        </>
      )}
      {componentes.length > 0 && (
        <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px` }}>
          <div style={{ ...higType('caption2'), color: HIG_COLOR.gray, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: HIG_SPACE.xs }}>
            Componentes marcados · {componentes.length}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {componentes.map(c => (
              <span key={c.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                ...higType('caption2'),
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: HIG_RADIUS.pill,
                background: c.badgeBg,
                color: c.badgeColor,
                border: `1px solid ${c.badgeColor}33`,
              }}>
                <span style={{ fontWeight: 700, fontSize: 10 }}>{c.acao.toUpperCase()}</span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </HIGSection>
  )
}

// ─── Banner falhas do Teste ───────────────────────────────────────────────────
function BannerFalhas({ T, dark, falhas }) {
  if (!falhas.length) return null
  return (
    <div style={{
      ...higInsetCard(T, dark),
      overflow: 'hidden',
      border: `1px solid ${HIG_COLOR.red}44`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        background: dark ? 'rgba(255,59,48,0.12)' : 'rgba(255,59,48,0.08)',
        borderBottom: `0.5px solid ${T.border}`,
      }}>
        <TI name="alert-triangle" size={15} color={HIG_COLOR.red} />
        <span style={{ ...higType('footnote'), fontWeight: 700, color: HIG_COLOR.red, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Falhas do teste final — corrigir
        </span>
      </div>
      {falhas.map((f, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Sep T={T} />}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: HIG_SPACE.sm,
            padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
            minHeight: HIG_SIZE.touch,
          }}>
            <TI name="x" size={13} color={HIG_COLOR.red} style={{ marginTop: 2 }} />
            <span style={{ ...higType('subheadline'), color: T.textPrimary, flex: 1 }}>
              {typeof f === 'string' ? f : (f.label || f.descricao || JSON.stringify(f))}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
const CHECKS_DESMONTAGEM = [{ id: 'feito', label: 'Desmontagem feita' }]
const CHECKS_LIMPEZA     = [{ id: 'feito', label: 'Limpeza feita' }]
const CHECKS_MONTAGEM    = [{ id: 'feito', label: 'Montagem feita' }]

export default function AcaoOficinaHIG({ os, onUpdateOS, onMoverOS, onAbrirAba }) {
  const { T, dark } = useTheme()
  const { itens } = useOSItens(os?.id)

  // Detecta lados ativos
  const temLimpeza = useMemo(
    () => (itens || []).some(it => /limpeza/i.test(it.nome || '')),
    [itens]
  )
  const temManutencao = useMemo(
    () => (itens || []).some(it => !/limpeza/i.test(it.nome || '')),
    [itens]
  )

  // Checklist da Manutenção (derivado do diagnóstico)
  const manutChecks = useMemo(() => {
    const marcados = os?.pre_diagnostico?.componentes_marcados || {}
    const out = []
    for (const [grupoId, items] of Object.entries(marcados)) {
      if (!items || typeof items !== 'object') continue
      const pares = Array.isArray(items)
        ? items.map(id => [id, 'troca'])
        : Object.entries(items)
      for (const [itemId, acao] of pares) {
        const cat = CATEGORIA_POR_ID[itemId]
        const label = cat?.label || itemId
        const isManut = acao === 'manutencao'
        out.push({
          id: itemId,
          label,
          badge: {
            label: isManut ? 'Manut.' : 'Troca',
            color: isManut ? HIG_COLOR.orange : HIG_COLOR.red,
            bg: isManut
              ? (dark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.12)')
              : (dark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.10)'),
          },
          // Compat pra ResumoDiagnostico
          acao,
          badgeBg:    isManut ? (dark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.12)') : (dark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.10)'),
          badgeColor: isManut ? HIG_COLOR.orange : HIG_COLOR.red,
        })
      }
    }
    return out
  }, [os?.pre_diagnostico?.componentes_marcados, dark])

  // Estado persistido em pre_diagnostico.oficina
  const oficinaJsonb = os?.pre_diagnostico?.oficina || {}
  const exec = oficinaJsonb.execucao || {}
  const desmVal  = exec.desmontagem  || {}
  const montVal  = exec.montagem     || {}
  const limpVal  = exec.limpeza_serv || {}
  const manutVal = exec.manut_serv   || {}

  // Falhas do Teste final
  const falhas = Array.isArray(os?.pre_diagnostico?.teste_falhas)
    ? os.pre_diagnostico.teste_falhas
    : []

  // Persistência
  function persistExec(novoExec) {
    const desmOk = CHECKS_DESMONTAGEM.every(c => novoExec.desmontagem?.[c.id])
    const montOk = CHECKS_MONTAGEM.every(c => novoExec.montagem?.[c.id])
    const limpServOk = CHECKS_LIMPEZA.every(c => novoExec.limpeza_serv?.[c.id])
    const manutServOk = manutChecks.length > 0
      && manutChecks.every(c => novoExec.manut_serv?.[c.id])

    const calcStatus = (servOk) => {
      const algum = desmOk || servOk || montOk
      if (desmOk && servOk && montOk) return 'concluido'
      if (algum) return 'andamento'
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
    if (novo[chaveId]) delete novo[chaveId]
    else novo[chaveId] = true
    persistExec({ ...exec, [secao]: novo })
  }

  // Estados dos serviços (pra anti-erro da Montagem)
  const limpServDone = !temLimpeza || CHECKS_LIMPEZA.every(c => limpVal[c.id])
  const manutServDone = !temManutencao
    || (manutChecks.length > 0 && manutChecks.every(c => manutVal[c.id]))

  const desmDone = CHECKS_DESMONTAGEM.every(c => desmVal[c.id])
  const montDone = CHECKS_MONTAGEM.every(c => montVal[c.id])
  const tudoDone = desmDone && limpServDone && manutServDone && montDone

  const semDiagnostico = temManutencao && manutChecks.length === 0

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

  // Dados pro resumo
  const relatoCliente = os?.defeito || ''
  const causaDiag = os?.pre_diagnostico?.causa_diagnostico || ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg }}>

      {/* 1. Resumo do diagnóstico */}
      <ResumoDiagnostico
        T={T} dark={dark}
        relato={relatoCliente}
        causa={causaDiag}
        componentes={manutChecks}
      />

      {/* 2. Banner falhas do Teste final */}
      <BannerFalhas T={T} dark={dark} falhas={falhas} />

      {/* 3. Aviso diagnóstico vazio */}
      {semDiagnostico && (
        <HIGSection T={T} dark={dark}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: HIG_SPACE.sm,
            padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: HIG_RADIUS.sm, flexShrink: 0,
              background: dark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.10)',
              color: HIG_COLOR.orange,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TI name="info-circle" size={14} />
            </span>
            <div>
              <div style={{ ...higType('subheadline'), fontWeight: 600, color: T.textPrimary, marginBottom: 2 }}>
                Diagnóstico vazio
              </div>
              <div style={{ ...higType('footnote'), color: HIG_COLOR.gray, lineHeight: '18px' }}>
                O orçamento tem itens de manutenção mas o diagnóstico não tem componentes
                marcados. Volte e marque os componentes pra gerar o checklist de serviço.
              </div>
            </div>
          </div>
        </HIGSection>
      )}

      {/* 4. Lados: Limpeza e Manutenção */}
      {(temLimpeza || temManutencao) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg }}>
          {temLimpeza && (
            <CardLado
              T={T} dark={dark}
              titulo="Limpeza" icon="droplet"
              status={oficinaJsonb.limpeza_status || 'pendente'}
              desmCheck={CHECKS_DESMONTAGEM} desmVal={desmVal}
              servChecks={CHECKS_LIMPEZA} servVal={limpVal}
              montCheck={CHECKS_MONTAGEM} montVal={montVal}
              onToggleDesm={toggleEm('desmontagem')}
              onToggleServ={toggleEm('limpeza_serv')}
              onToggleMont={toggleEm('montagem')}
              outroServDone={manutServDone} outroLabel="Manutenção"
              sempreLista={false}
            />
          )}
          {temManutencao && (
            <CardLado
              T={T} dark={dark}
              titulo="Manutenção" icon="tool"
              status={oficinaJsonb.manutencao_status || 'pendente'}
              desmCheck={CHECKS_DESMONTAGEM} desmVal={desmVal}
              servChecks={manutChecks} servVal={manutVal}
              montCheck={CHECKS_MONTAGEM} montVal={montVal}
              onToggleDesm={toggleEm('desmontagem')}
              onToggleServ={toggleEm('manut_serv')}
              onToggleMont={toggleEm('montagem')}
              outroServDone={limpServDone} outroLabel="Limpeza"
              sempreLista={true}
            />
          )}
        </div>
      ) : (
        <HIGSection T={T} dark={dark} title="Conserto">
          <div style={{
            display: 'flex', alignItems: 'center', gap: HIG_SPACE.sm,
            padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
            minHeight: HIG_SIZE.touch,
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
            tudoDone ? HIG_COLOR.tintIdemaq : (dark ? 'rgba(255,255,255,0.08)' : HIG_COLOR.gray5)
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
    if (id === 'oficina') return 'Liberado quando orçamento for fechado'
    return 'Feito'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: HIG_SPACE.lg }}>

      {/* Aviso */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: HIG_SPACE.sm,
        padding: HIG_SPACE.md,
        background: dark ? 'rgba(255,149,0,0.10)' : 'rgba(255,149,0,0.08)',
        borderRadius: HIG_RADIUS.md,
        border: `1px solid ${HIG_COLOR.orange}44`,
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
            Feche o orçamento antes de executar o conserto.
          </div>
        </div>
      </div>

      {/* Timeline */}
      <section>
        <div style={{
          padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.xxs}px`,
          ...higType('footnote'),
          color: HIG_COLOR.gray,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>Progresso</div>
        <div style={higInsetCard(T, dark)}>
          {ETAPAS_SEQ.map((step, idx) => {
            const status = statusOf(step.id)
            const meta = metaOf(step.id)
            const isLast = idx === ETAPAS_SEQ.length - 1
            const cfg = {
              done:    { icon: 'check', iconColor: HIG_COLOR.green,          bg: 'rgba(52,199,89,0.15)',       lineColor: HIG_COLOR.green },
              miss:    { icon: 'alert-circle', iconColor: HIG_COLOR.orange,  bg: 'rgba(255,149,0,0.12)',       lineColor: HIG_COLOR.orange },
              blocked: { icon: 'lock', iconColor: HIG_COLOR.gray2,           bg: dark ? 'rgba(255,255,255,0.06)' : HIG_COLOR.gray5, lineColor: T.border },
            }[status]

            return (
              <React.Fragment key={step.id}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: HIG_SPACE.sm,
                  padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
                  minHeight: HIG_SIZE.touch,
                  position: 'relative',
                }}>
                  {/* Linha vertical de conexão */}
                  {!isLast && (
                    <div style={{
                      position: 'absolute',
                      left: HIG_SPACE.md + 13,
                      top: HIG_SIZE.touch - 4,
                      bottom: 0,
                      width: 2,
                      background: cfg.lineColor,
                      opacity: 0.35,
                      zIndex: 0,
                    }} />
                  )}

                  {/* Ícone */}
                  <span style={{
                    width: 28, height: 28, borderRadius: HIG_RADIUS.pill,
                    background: cfg.bg,
                    color: cfg.iconColor,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, zIndex: 1,
                  }}>
                    <TI name={cfg.icon} size={13} />
                  </span>

                  <div style={{ flex: 1, paddingTop: 3 }}>
                    <div style={{
                      ...higType('subheadline'),
                      fontWeight: status === 'miss' ? 600 : 400,
                      color: status === 'blocked' ? HIG_COLOR.gray : T.textPrimary,
                    }}>
                      {step.label}{step.id === 'oficina' && ' · você está aqui'}
                    </div>
                    {meta && (
                      <div style={{
                        ...higType('caption1'),
                        color: status === 'miss' ? HIG_COLOR.orange : HIG_COLOR.gray,
                        fontWeight: status === 'miss' ? 600 : 400,
                        marginTop: 1,
                      }}>{meta}</div>
                    )}
                  </div>
                </div>
                {!isLast && <Sep T={T} />}
              </React.Fragment>
            )
          })}
        </div>
      </section>

      {/* CTA: voltar pro orçamento */}
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
