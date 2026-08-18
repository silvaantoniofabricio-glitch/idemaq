// src/components/osDetalhe/acoes/AcaoOficinaHIG.jsx
// Etapa Conserto (oficina) — Atlassian Design (reescrito 28/05/2026).
//
// Estrutura:
//   - Gate: orcamento fechado? -> Tela de bloqueio com timeline progresso
//   - 1. Diagnostico (relato + causa + componentes)
//   - 2. Banner falhas do teste final (quando OS volta)
//   - 3. Aviso diagnostico vazio (orc tem manutencao mas diag nao)
//   - 4. Secao Limpeza (Desmontagem · Limpeza · Montagem)
//   - 5. Secao Manutencao (Desmontagem · componentes · Montagem)
//   - 6. CTA Concluir conserto
//
// Persiste:
//   · os.pre_diagnostico.oficina.execucao
//   · os.pre_diagnostico.oficina.limpeza_status / manutencao_status

import React, { useMemo, useState, useEffect } from 'react'
import { fetchFaltaPecas } from '../../../utils/pecasStatus'
import { useTheme } from '../../../theme'
import { corEtapa } from '../../../utils/colors'
import { CATEGORIA_POR_ID } from '../../../utils/categoriasPeca'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { useOSItens } from '../../../hooks/useOSItens'
import { useAutorCheck, fmtAutor as autorDe, detectarTrocaAutor } from '../../../hooks/useAutorCheck'
import PecasComprarSection from './PecasComprarSection'
import {
  AtlPanel, AtlButton, ATL_FONT, atlHover, atlSurfaceSunken,
} from './_AtlassianUI'

// ─── Pill de status ──────────────────────────────────────────────────────
function StatusPill({ T, dark, status }) {
  const verde = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)
  const map = {
    pendente:  { label: 'Pendente',     cor: T.textMuted, bg: dark ? 'rgba(255,255,255,0.07)' : '#DFE1E6' },
    andamento: { label: 'Em andamento', cor: amarelo, bg: amarelo + '22' },
    concluido: { label: 'Concluído',    cor: verde,   bg: verde + '22' },
  }
  const m = map[status] || map.pendente
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '2px 7px', borderRadius: 99,
      background: m.bg, color: m.cor,
      letterSpacing: '-0.005em',
    }}>{m.label}</span>
  )
}

// ─── CheckRow Atlassian ──────────────────────────────────────────────────
function CheckRow({ T, dark, label, checked, onToggle, badge, shared, first, author }) {
  const [hover, setHover] = useState(false)
  const verde = corEtapa('green', dark)
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', padding: '10px 14px',
        borderTop: first ? 'none' : `1px solid ${T.border}`,
        background: hover ? atlHover(dark) : 'transparent',
        border: 'none', cursor: 'pointer', fontFamily: ATL_FONT,
        display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s',
      }}>
      <span style={{
        width: 18, height: 18, borderRadius: 3, flexShrink: 0,
        border: `1.5px solid ${checked ? verde : (dark ? 'rgba(255,255,255,0.2)' : '#C1C7D0')}`,
        background: checked ? verde : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background .12s, border-color .12s',
      }}>
        {checked && (
          <i className="ti ti-check" style={{ fontSize: 12, color: '#fff' }} aria-hidden="true" />
        )}
      </span>

      <span style={{
        flex: 1, fontSize: 13,
        color: checked ? T.textMuted : T.textPrimary,
        textDecoration: checked ? 'line-through' : 'none',
        letterSpacing: '-0.005em',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{label}</span>

      {checked && author && (
        <span style={{
          fontSize: 10.5, color: T.textMuted, fontWeight: 500,
          flexShrink: 0, letterSpacing: '-0.003em', whiteSpace: 'nowrap',
        }}>{author}</span>
      )}

      {badge && (
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '2px 7px', borderRadius: 99,
          background: badge.cor + '22', color: badge.cor,
          flexShrink: 0, letterSpacing: '-0.005em',
        }}>{badge.label}</span>
      )}

      {shared && (
        <i className="ti ti-arrows-left-right"
           style={{ fontSize: 12, color: T.textDim, flexShrink: 0 }}
           aria-hidden="true" />
      )}
    </button>
  )
}

// ─── Bloqueio row (montagem trancada) ────────────────────────────────────
function BloqueioRow({ T, dark, msg }) {
  const amarelo = corEtapa('yellow', dark)
  return (
    <div style={{
      padding: '10px 14px',
      borderTop: `1px solid ${T.border}`,
      background: amarelo + '12',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{
        width: 18, height: 18, borderRadius: 3, flexShrink: 0,
        background: amarelo + '22', color: amarelo,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className="ti ti-lock" style={{ fontSize: 11 }} aria-hidden="true" />
      </span>
      <span style={{ flex: 1, fontSize: 12, color: amarelo, letterSpacing: '-0.005em' }}>
        {msg}
      </span>
    </div>
  )
}

// ─── Secao Limpeza ───────────────────────────────────────────────────────
function SecaoLimpeza({ T, dark, status, desmVal, limpVal, montVal,
                       onToggleDesm, onToggleLimp, onToggleMont, outroServDone }) {
  const desmDone = !!desmVal.feito
  const limpDone = !!limpVal.feito
  let montBloqueio = null
  if (!desmDone) montBloqueio = 'Conclua a desmontagem primeiro'
  else if (!limpDone) montBloqueio = 'Conclua a higienização primeiro'
  else if (!outroServDone) montBloqueio = 'Aguardando manutenção'

  return (
    <AtlPanel
      T={T} dark={dark}
      title="Higienização"
      action={<StatusPill T={T} dark={dark} status={status} />}>
      <CheckRow first T={T} dark={dark}
        label="Desmontagem"
        checked={desmDone}
        onToggle={() => onToggleDesm('feito')}
        author={autorDe(desmVal.feito)}
        shared
      />
      <CheckRow T={T} dark={dark}
        label="Higienização feita"
        checked={limpDone}
        onToggle={() => onToggleLimp('feito')}
        author={autorDe(limpVal.feito)}
      />
      {montBloqueio
        ? <BloqueioRow T={T} dark={dark} msg={montBloqueio} />
        : (
          <CheckRow T={T} dark={dark}
            label="Montagem"
            checked={!!montVal.feito}
            onToggle={() => onToggleMont('feito')}
            author={autorDe(montVal.feito)}
            shared
          />
        )}
    </AtlPanel>
  )
}

// ─── Secao Manutencao ───────────────────────────────────────────────────
function SecaoManutencao({ T, dark, status, desmVal, manutVal, montVal, manutChecks,
                          onToggleDesm, onToggleManut, onToggleMont, outroServDone }) {
  const desmDone = !!desmVal.feito
  const servDone = manutChecks.length > 0
    ? manutChecks.every(c => manutVal[c.id])
    : !!manutVal.feito
  let montBloqueio = null
  if (!desmDone) montBloqueio = 'Conclua a desmontagem primeiro'
  else if (!servDone) montBloqueio = manutChecks.length > 0 ? 'Instale todas as peças' : 'Marque a manutenção como feita'
  else if (!outroServDone) montBloqueio = 'Aguardando higienização'

  return (
    <AtlPanel
      T={T} dark={dark}
      title="Manutenção"
      action={<StatusPill T={T} dark={dark} status={status} />}>
      <CheckRow first T={T} dark={dark}
        label="Desmontagem"
        checked={desmDone}
        onToggle={() => onToggleDesm('feito')}
        shared
      />
      {manutChecks.length > 0 ? (
        manutChecks.map(c => (
          <CheckRow key={c.id}
            T={T} dark={dark}
            label={c.label}
            checked={!!manutVal[c.id]}
            onToggle={() => onToggleManut(c.id)}
            badge={c.badge}
            author={autorDe(manutVal[c.id])}
          />
        ))
      ) : (
        // Sem peças no orçamento (manutenção de mão de obra) — marca direto.
        <CheckRow T={T} dark={dark}
          label="Manutenção feita"
          checked={!!manutVal.feito}
          onToggle={() => onToggleManut('feito')}
          author={autorDe(manutVal.feito)}
        />
      )}
      {montBloqueio
        ? <BloqueioRow T={T} dark={dark} msg={montBloqueio} />
        : (
          <CheckRow T={T} dark={dark}
            label="Montagem"
            checked={!!montVal.feito}
            onToggle={() => onToggleMont('feito')}
            author={autorDe(montVal.feito)}
            shared
          />
        )}
    </AtlPanel>
  )
}

// ─── Banner falhas do teste final ────────────────────────────────────────
function BannerFalhas({ T, dark, falhas }) {
  const vermelho = corEtapa('red', dark)
  if (!falhas.length) return null
  return (
    <AtlPanel T={T} dark={dark}
      title="Falhas do teste final"
      accent={vermelho}>
      <div style={{
        padding: '8px 14px',
        background: vermelho + '12',
        fontSize: 11.5, fontWeight: 700, color: vermelho,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        borderBottom: `1px solid ${T.border}`,
      }}>
        Corrigir antes de retornar o teste
      </div>
      {falhas.map((f, i) => (
        <div key={i} style={{
          padding: '8px 14px',
          borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: 3, flexShrink: 0,
            background: vermelho + '22', color: vermelho,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 11 }} aria-hidden="true" />
          </span>
          <span style={{ flex: 1, fontSize: 13, color: T.textPrimary }}>
            {typeof f === 'string' ? f : (f.label || f.descricao || JSON.stringify(f))}
          </span>
        </div>
      ))}
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function AcaoOficinaHIG({ os, onUpdateOS, onMoverOS, onAbrirAba, admin = false }) {
  const { T, dark } = useTheme()
  const { itens } = useOSItens(os?.id)
  const { carimbo } = useAutorCheck()
  const vermelho = corEtapa('red', dark)
  const amarelo  = corEtapa('yellow', dark)
  const azul     = corEtapa('blue', dark)
  const verde    = corEtapa('green', dark)

  // Falta de peças — alocação GLOBAL do estoque entre todas as OS de conserto
  // (considera qtd pedida e a mesma peça pedida por várias OS).
  const [faltaSet, setFaltaSet] = useState(() => new Set())
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { falta } = await fetchFaltaPecas()
      if (!cancel) setFaltaSet(falta)
    })()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [os?.id, os?.pre_diagnostico?.compra_pecas, itens])

  const temLimpeza = useMemo(
    () => (itens || []).some(it => /limpeza|higieniz/i.test(it.nome || '')),
    [itens]
  )
  // Checklist da manutenção = combinação de duas fontes:
  //   1) Componentes do diagnóstico marcados como MANUTENÇÃO → mão de obra, sem
  //      peça no orçamento. O check vem do próprio componente.
  //   2) PEÇAS do orçamento (vêm dos componentes marcados como TROCA) → com selo
  //      de estoque (🔴 Falta · 🟡 Comprada · 🟢 Em estoque).
  const compraPecas = os?.pre_diagnostico?.compra_pecas || {}
  const manutChecks = useMemo(() => {
    const out = []

    // 1) Componentes "manutenção" (sem peça — serviço embutido na mão de obra)
    const marcados = os?.pre_diagnostico?.componentes_marcados || {}
    for (const [, items] of Object.entries(marcados)) {
      if (!items || typeof items !== 'object') continue
      const pares = Array.isArray(items)
        ? items.map(id => [id, 'troca'])
        : Object.entries(items)
      for (const [itemId, acao] of pares) {
        if (acao !== 'manutencao') continue // 'troca' vira peça no orçamento (abaixo)
        const cat = CATEGORIA_POR_ID[itemId]
        out.push({
          id: `manut:${itemId}`,
          label: cat?.label || itemId,
          badge: { label: 'Manut.', cor: amarelo },
        })
      }
    }

    // 2) Peças do orçamento (troca) — com selo de estoque
    for (const it of (itens || [])) {
      if (it.tipo !== 'peca') continue
      const qtd = Number(it.qtd) || 1
      const compraSt = compraPecas[it.id]?.status
      let badge = null
      if (compraSt === 'entrega')        badge = { label: 'Comprada',   cor: amarelo }
      else if (compraSt === 'entregue')  badge = { label: 'Em estoque', cor: verde }
      else if (!it.peca_id)              badge = null // peça avulsa, sem estoque
      else if (faltaSet.has(it.id))      badge = { label: 'Falta',      cor: vermelho }
      else                               badge = { label: 'Em estoque', cor: verde }
      out.push({
        id: it.id,
        label: qtd > 1 ? `${it.nome} · ${qtd}x` : it.nome,
        badge,
      })
    }

    return out
  }, [itens, faltaSet, compraPecas, os?.pre_diagnostico?.componentes_marcados, amarelo, vermelho, verde])

  // Manutenção ativa quando há itens de manutenção (peças/componentes) OU serviço.
  const temManutencao = useMemo(
    () => manutChecks.length > 0 || (itens || []).some(it => /manuten/i.test(it.nome || '')),
    [manutChecks, itens]
  )

  const oficinaJsonb = os?.pre_diagnostico?.oficina || {}
  const exec = oficinaJsonb.execucao || {}
  const desmVal  = exec.desmontagem  || {}
  const montVal  = exec.montagem     || {}
  const limpVal  = exec.limpeza_serv || {}
  const manutVal = exec.manut_serv   || {}

  const falhas = Array.isArray(os?.pre_diagnostico?.teste_falhas)
    ? os.pre_diagnostico.teste_falhas : []

  function persistExec(novoExec, alerta) {
    const desmOk = !!novoExec.desmontagem?.feito
    const montOk = !!novoExec.montagem?.feito
    const limpServOk = !!novoExec.limpeza_serv?.feito
    const manutServOk = manutChecks.length > 0
      ? manutChecks.every(c => novoExec.manut_serv?.[c.id])
      : !!novoExec.manut_serv?.feito // sem peças (mão de obra): marca "manutenção feita"

    const calcStatus = (servOk) => {
      if (desmOk && servOk && montOk) return 'concluido'
      if (desmOk || servOk || montOk) return 'andamento'
      return 'pendente'
    }

    const novaOficina = { ...oficinaJsonb, execucao: novoExec }
    novaOficina.limpeza_status    = temLimpeza    ? calcStatus(limpServOk)  : 'concluido'
    novaOficina.manutencao_status = temManutencao ? calcStatus(manutServOk) : 'concluido'
    // Flags persistidas para o KanbanCard saber se o serviço existe no orçamento
    novaOficina.tem_limpeza    = temLimpeza
    novaOficina.tem_manutencao = temManutencao
    // Contadores do checklist de manutenção (peças do orçamento + componentes).
    // O KanbanCard pinta o chip Manut. a partir daqui: todos feitos = verde,
    // parte feita = amarelo — SEM exigir a montagem. A lista de checks vem do
    // orçamento, que o card não tem; por isso o contador é salvo aqui.
    novaOficina.manut_total  = manutChecks.length
    novaOficina.manut_feitos = manutChecks.filter(c => !!novoExec.manut_serv?.[c.id]).length

    const base = os.pre_diagnostico || {}
    onUpdateOS?.(os.numero, {
      pre_diagnostico: {
        ...base,
        oficina: novaOficina,
        ...(alerta ? { alertas_pontuacao: [...(base.alertas_pontuacao || []), alerta] } : {}),
      },
    })
  }

  // Alerta de reatribuição: dispara sempre que quem mexe agora (marcando OU
  // desmarcando) é diferente de quem tinha o carimbo antes — rastro pro
  // relatório de Qualidade, ver useAutorCheck.detectarTrocaAutor.
  const LABEL_SECAO = {
    desmontagem: 'Desmontagem', montagem: 'Montagem', limpeza_serv: 'Higienização',
  }
  const toggleEm = (secao) => (chaveId) => {
    const atual = exec[secao] || {}
    const antigoAutor = atual[chaveId]
    const quemAgora = carimbo()
    const novo = { ...atual }
    if (novo[chaveId]) {
      delete novo[chaveId]
    } else {
      novo[chaveId] = quemAgora
    }
    const troca = detectarTrocaAutor(antigoAutor, quemAgora)
    const labelSecao = LABEL_SECAO[secao] || `Manutenção · ${chaveId}`
    const alerta = troca ? { campo: `Conserto · ${labelSecao}`, ...troca, em: quemAgora.em } : null
    persistExec({ ...exec, [secao]: novo }, alerta)
  }

  const limpServDone = !temLimpeza || !!limpVal.feito
  const manutServDone = !temManutencao
    || (manutChecks.length > 0
        ? manutChecks.every(c => manutVal[c.id])
        : !!manutVal.feito)

  const desmDone  = !!desmVal.feito
  const montDone  = !!montVal.feito
  const tudoDone  = desmDone && limpServDone && manutServDone && montDone

  function concluirOficina() {
    if (!tudoDone) return
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'teste_final')
    if (proxima) onMoverOS?.(os.numero, proxima.id)
  }

  // Gate: orcamento fechado?
  const orcStatus = os?.pre_diagnostico?.orcamento_status || os?.orcamento_status
  const orcamentoFechado = orcStatus === 'confirmado' || (itens || []).length > 0
  if (!orcamentoFechado) {
    return <BloqueioOrcamento T={T} dark={dark} os={os} itens={itens} onAbrirAba={onAbrirAba} />
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12, fontFamily: ATL_FONT, padding: '0 0 12px',
    }}>

      {/* 1. Banner falhas */}
      <BannerFalhas T={T} dark={dark} falhas={falhas} />

      {/* 1b. Peças a comprar (em falta no estoque) */}
      <PecasComprarSection
        T={T} dark={dark} os={os} itens={itens} admin={admin}
        faltaSet={faltaSet}
        onUpdateOS={onUpdateOS}
      />

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
        <AtlPanel T={T} dark={dark} title="Conserto">
          <div style={{
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 8,
            color: T.textMuted, fontSize: 13, fontStyle: 'italic',
          }}>
            <i className="ti ti-info-circle" style={{ fontSize: 14 }} aria-hidden="true" />
            Adicione itens no orçamento pra liberar o conserto.
          </div>
        </AtlPanel>
      )}

      {/* 5. CTA */}
      <AtlButton
        T={T} dark={dark}
        variant="primary"
        fullWidth
        disabled={!tudoDone}
        icon={tudoDone ? 'check' : 'lock'}
        onClick={concluirOficina}>
        {tudoDone ? 'Concluir conserto · Teste final' : 'Conclua todas as etapas pra avançar'}
      </AtlButton>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Bloqueio (orcamento nao fechado) — timeline progresso + voltar pro Orcamento
// ═══════════════════════════════════════════════════════════════════════════
const ETAPAS_SEQ = [
  { id: 'diagnostico', label: 'Diagnóstico' },
  { id: 'orcamento',   label: 'Orçamento' },
  { id: 'oficina',     label: 'Conserto' },
]

function BloqueioOrcamento({ T, dark, os, itens, onAbrirAba }) {
  const verde   = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)

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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      gap: 12, fontFamily: ATL_FONT, padding: '0 0 12px',
    }}>

      {/* Aviso */}
      <AtlPanel T={T} dark={dark} accent={amarelo}>
        <div style={{ padding: '12px 14px', display: 'flex', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 4,
            background: amarelo + '22', color: amarelo,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 17 }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.textPrimary,
              letterSpacing: '-0.005em',
            }}>Etapa anterior pendente</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2, lineHeight: 1.4 }}>
              Feche o orçamento antes de iniciar o conserto.
            </div>
          </div>
        </div>
      </AtlPanel>

      {/* Timeline */}
      <AtlPanel T={T} dark={dark} title="Progresso">
        <div style={{ padding: '8px 14px' }}>
          {ETAPAS_SEQ.map((step, idx) => {
            const status = statusOf(step.id)
            const meta = metaOf(step.id)
            const isLast = idx === ETAPAS_SEQ.length - 1
            const cfg = {
              done:    { icon: 'check',         cor: verde,         bg: verde + '22' },
              miss:    { icon: 'alert-circle',  cor: amarelo,       bg: amarelo + '22' },
              blocked: { icon: 'lock',          cor: T.textMuted,   bg: dark ? 'rgba(255,255,255,0.06)' : '#F4F5F7' },
            }[status]
            return (
              <div key={step.id} style={{
                display: 'flex', gap: 12, padding: '8px 0',
                position: 'relative',
              }}>
                {!isLast && (
                  <span style={{
                    position: 'absolute', left: 11, top: 28, bottom: -8,
                    width: 2, background: cfg.cor, opacity: 0.3, zIndex: 1,
                  }} />
                )}
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: cfg.bg, color: cfg.cor,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, zIndex: 2,
                }}>
                  <i className={`ti ti-${cfg.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
                </span>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <div style={{
                    fontSize: 13, fontWeight: status === 'miss' ? 600 : 500,
                    color: status === 'blocked' ? T.textMuted : T.textPrimary,
                    letterSpacing: '-0.005em',
                  }}>
                    {step.label}{step.id === 'oficina' && ' · você está aqui'}
                  </div>
                  <div style={{
                    fontSize: 11.5, marginTop: 1,
                    color: status === 'miss' ? amarelo : T.textMuted,
                    fontWeight: status === 'miss' ? 600 : 400,
                  }}>{meta}</div>
                </div>
              </div>
            )
          })}
        </div>
      </AtlPanel>

      <AtlButton
        T={T} dark={dark}
        variant="primary"
        fullWidth
        icon="arrow-back-up"
        onClick={() => onAbrirAba?.('pagamento')}>
        Voltar pro Orçamento
      </AtlButton>
    </div>
  )
}
