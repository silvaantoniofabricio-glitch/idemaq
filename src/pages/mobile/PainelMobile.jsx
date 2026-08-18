// src/pages/mobile/PainelMobile.jsx
// Painel dono mobile — Atlassian Design (reescrito 28/05/2026).
//
// Estrutura:
//   1. Hero            — avatar + saudacao + data + faturamento + barra meta + recebido hoje
//   2. KPIs            — grid 2x2 (OS abertas / Atrasadas / Concluidas mes / Ticket medio)
//   3. Alertas         — panel com count + lista de criticos
//   4. Pipeline        — panel com lista de etapas + badge contagem
//   5. Proximas        — panel com lista de proximas paradas em 7 dias
//
// Espelha 100% da logica do Painel.jsx desktop (useOS + useFinanceiro +
// useConfiguracoes + usePecas + useClientes + meta_mensal).

import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { corEtapa } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { calcStatusPrazo, diasPrazo } from '../../utils/osHelpers'
import { ETAPAS_TODOS } from '../../utils/osData'
import { useOS } from '../../hooks/useOS'
import { useUsuarios } from '../../hooks/useUsuarios'
import { useClientes } from '../../hooks/useClientes'
import { usePecas } from '../../hooks/usePecas'
import { useFinanceiro } from '../../hooks/useFinanceiro'
import { useConfiguracoes } from '../../hooks/useConfiguracoes'
import { supabase } from '../../supabase'

const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const ATL_RADIUS = 4

// ─── Helpers ──────────────────────────────────────────────────────────────
function parseISODate(s) {
  if (!s) return null
  const [y, m, d] = String(s).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
function mesmoMes(d, ref) {
  return d && d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}
function iniciais(nome) {
  return (nome || 'IN').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function saudacao() {
  const h = parseInt(new Date().toLocaleString('en-US', {
    hour: '2-digit', hour12: false, timeZone: 'America/Cuiaba',
  }), 10)
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const MESES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const MESES_LONGO = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

// ═══════════════════════════════════════════════════════════════════════════
// Pagina
// ═══════════════════════════════════════════════════════════════════════════

export default function PainelMobile({ T, dark, user }) {
  const navigate = useNavigate()
  const { osList, loading } = useOS(false)
  const { apelidoDe } = useUsuarios()
  useClientes() // mantem cache populado
  const { pecas } = usePecas()
  const { lancamentos: lancsFin } = useFinanceiro()
  const { get: getConfig } = useConfiguracoes()

  const [authUser, setAuthUser] = useState(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUser(data?.user || null))
  }, [])
  const idUsuario = user?.id || authUser?.id
  const ap = idUsuario ? apelidoDe(idUsuario) : null
  const apelido = (ap && ap !== 'desconhecido') ? ap : 'parceiro'

  const hojeData = new Date()
  const metaMensal = Number(getConfig('meta_mensal', 20000)) || 20000

  // ─── Financeiro ────────────────────────────────────────────────────────
  const finAgg = useMemo(() => {
    const ano = hojeData.getFullYear()
    const mesAtual = hojeData.getMonth()
    const hojeZero = new Date(); hojeZero.setHours(0, 0, 0, 0)
    const recebidoSerie = Array(12).fill(0)

    // Últimos 30 dias ÚTEIS (pula domingo) — não 30 dias corridos.
    const diasUteis30 = []
    {
      const cursor = new Date(hojeZero)
      while (diasUteis30.length < 30) {
        if (cursor.getDay() !== 0) diasUteis30.push(new Date(cursor))
        cursor.setDate(cursor.getDate() - 1)
      }
      diasUteis30.reverse()
    }
    const idxPorData = new Map(diasUteis30.map((d, i) => [d.toDateString(), i]))
    const spark30d = Array(30).fill(0)
    let recebidoHoje = 0
    let faturamentoAntCrossYear = 0

    for (const l of lancsFin || []) {
      if (!l.pago_em || l.tipo !== 'receita') continue
      const dt = parseISODate(l.pago_em)
      if (!dt) continue
      const valor = Number(l.valor) || 0
      if (dt.getFullYear() === ano) recebidoSerie[dt.getMonth()] += valor
      if (mesAtual === 0 && dt.getFullYear() === ano - 1 && dt.getMonth() === 11)
        faturamentoAntCrossYear += valor
      if (dt.getTime() === hojeZero.getTime()) recebidoHoje += valor
      const idx = idxPorData.get(dt.toDateString())
      if (idx != null) spark30d[idx] += valor
    }

    const faturamentoMes = recebidoSerie[mesAtual]
    const faturamentoAnt = mesAtual === 0 ? faturamentoAntCrossYear : recebidoSerie[mesAtual - 1]
    const deltaPct = faturamentoAnt > 0
      ? Math.round(((faturamentoMes - faturamentoAnt) / faturamentoAnt) * 100)
      : null

    return {
      faturamentoMes, faturamentoAnt, deltaPct, recebidoHoje, spark30d, diasUteis30,
      labelMesAnt: MESES_CURTO[mesAtual === 0 ? 11 : mesAtual - 1],
    }
  }, [lancsFin, hojeData])

  // ─── Operacional ───────────────────────────────────────────────────────
  const dados = useMemo(() => {
    const refAtual = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1)
    const refAnt   = new Date(hojeData.getFullYear(), hojeData.getMonth() - 1, 1)
    let osAbertas = 0, osAtrasadas = 0, aguardPeca = 0, naOficina = 0
    let osConcluidasMes = 0, osConcluidasMesAnt = 0

    for (const os of osList || []) {
      if (os.deleted_at) continue
      if (os.etapa !== 'concluido' && os.etapa !== 'recusado') {
        osAbertas++
        if (os.prazo && calcStatusPrazo(os.prazo, os.etapa) === 'vencido') osAtrasadas++
        if (os.aguardando_peca) aguardPeca++
        if (os.etapa === 'oficina') naOficina++
      } else if (os.etapa === 'concluido') {
        const cReg = (os.historico || []).find(h => h.etapa === 'concluido')
        if (cReg) {
          const d = new Date(cReg.data)
          if (mesmoMes(d, refAtual)) osConcluidasMes++
          else if (mesmoMes(d, refAnt)) osConcluidasMesAnt++
        }
      }
    }
    const ticketMedio = osConcluidasMes > 0
      ? Math.round(finAgg.faturamentoMes / osConcluidasMes)
      : 0
    return { osAbertas, osAtrasadas, aguardPeca, naOficina, osConcluidasMes, ticketMedio }
  }, [osList, hojeData, finAgg.faturamentoMes])

  const estoque = useMemo(() => {
    let esgotadas = 0, baixas = 0
    for (const p of pecas || []) {
      const min = p.qtdMinima || 0, cur = p.qtdAtual || 0
      if (min <= 0) continue
      if (cur === 0) esgotadas++
      else if (cur <= min) baixas++
    }
    return { esgotadas, baixas }
  }, [pecas])

  // ─── Alertas criticos ──────────────────────────────────────────────────
  const criticos = useMemo(() => {
    const list = []
    for (const os of osList || []) {
      if (os.deleted_at) continue
      if (os.etapa === 'concluido' || os.etapa === 'recusado') continue
      const dias = os.prazo ? diasPrazo(os.prazo) : null
      const status = os.prazo ? calcStatusPrazo(os.prazo, os.etapa) : null
      const ultMov = (os.historico || []).slice(-1)[0]?.data
      const diasParado = ultMov
        ? Math.round((Date.now() - new Date(ultMov).getTime()) / 86400000)
        : null
      // Entrega agendada (AcaoEntregaHIG → pre_diagnostico.entrega.data) — o
      // "Prazo" já para de contar na etapa Entrega, então precisa de alerta
      // próprio pra não esquecer da entrega marcada.
      const entregaData = os.pre_diagnostico?.entrega?.data || null
      const diasEntrega = (entregaData && (os.etapa === 'entrega' || os.etapa === 'entregue'))
        ? Math.round((new Date(entregaData).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
        : null
      const base = {
        osNumero: os.numero,
        msg: `OS #${os.numero} · ${os.cliente || os.equipamento || 'Fabricação'}`,
      }

      if (dias != null && dias < -5) {
        list.push({ ...base, nivel: 'critico', icon: 'calendar-x',
          sub: `Vencida há ${Math.abs(dias)} dias`, prio: 0 }); continue
      }
      if (diasParado != null && diasParado >= 7) {
        list.push({ ...base, nivel: 'critico', icon: 'flame',
          sub: `Sem movimento há ${diasParado} dias`, prio: 1 }); continue
      }
      if (status === 'vencido' && dias != null && dias < 0) {
        list.push({ ...base, nivel: 'critico', icon: 'calendar-x',
          sub: `Vencida há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}`, prio: 2 }); continue
      }
      if (dias === 0) {
        list.push({ ...base, nivel: 'atencao', icon: 'alarm',
          sub: 'Vence hoje', prio: 10 }); continue
      }
      if (diasEntrega === 0) {
        list.push({ ...base, nivel: 'atencao', icon: 'truck-delivery',
          sub: 'Entrega agendada pra hoje', prio: 10 }); continue
      }
      if (os.aguardando_peca && diasParado != null && diasParado >= 3) {
        list.push({ ...base, nivel: 'atencao', icon: 'package-off',
          sub: `Aguardando peça há ${diasParado} dia${diasParado !== 1 ? 's' : ''}`, prio: 11 }); continue
      }
      if (dias === 1) {
        list.push({ ...base, nivel: 'info', icon: 'clock', sub: 'Vence amanhã', prio: 20 }); continue
      }
      if (diasEntrega === 1) {
        list.push({ ...base, nivel: 'info', icon: 'truck-delivery', sub: 'Entrega agendada pra amanhã', prio: 20 })
      }
    }
    if (estoque.esgotadas > 0) {
      const ex = (pecas || []).find(p => (p.qtdMinima || 0) > 0 && (p.qtdAtual || 0) === 0)
      list.push({
        nivel: 'critico', icon: 'package-off',
        msg: `${estoque.esgotadas} peça${estoque.esgotadas > 1 ? 's' : ''} esgotada${estoque.esgotadas > 1 ? 's' : ''}`,
        sub: ex ? `Ex.: ${ex.nome}` : 'Repor urgente', prio: 3,
      })
    }
    if (estoque.baixas > 0) {
      const ex = (pecas || []).find(p => {
        const min = p.qtdMinima || 0, cur = p.qtdAtual || 0
        return min > 0 && cur > 0 && cur <= min
      })
      list.push({
        nivel: 'atencao', icon: 'package',
        msg: `${estoque.baixas} peça${estoque.baixas > 1 ? 's' : ''} com estoque baixo`,
        sub: ex ? `${ex.nome} (${ex.qtdAtual}/${ex.qtdMinima})` : 'Planejar reposição', prio: 12,
      })
    }
    return list.sort((a, b) => a.prio - b.prio).slice(0, 5)
  }, [osList, estoque, pecas])

  // ─── Pipeline ──────────────────────────────────────────────────────────
  const pipeline = useMemo(() =>
    ETAPAS_TODOS
      .filter(e => !e.adminOnly)
      .map(e => ({
        id: e.id, label: e.curto, corKey: e.cor,
        n: (osList || []).filter(o => !o.deleted_at && o.etapa === e.id).length,
      })),
    [osList]
  )

  // ─── Proximas paradas ─────────────────────────────────────────────────
  const proximas = useMemo(() => {
    const hojeZero = new Date(); hojeZero.setHours(0, 0, 0, 0)
    return (osList || [])
      .filter(o => !o.deleted_at && o.prazo && o.etapa !== 'concluido' && o.etapa !== 'recusado')
      .map(o => {
        const p = new Date(o.prazo); p.setHours(0, 0, 0, 0)
        const diff = Math.round((p - hojeZero) / 86400000)
        return { o, p, diff }
      })
      .filter(({ diff }) => diff >= 0 && diff <= 7)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 4)
      .map(({ o, p, diff }) => ({
        os: `#${o.numero}`,
        cliente: o.cliente || 'Fabricação',
        ini: iniciais(o.cliente),
        equip: `${o.marca || ''} ${o.modelo || ''}`.trim() || o.equipamento || '—',
        etapaLabel: ETAPAS_TODOS.find(e => e.id === o.etapa)?.curto || o.etapa,
        dt: diff === 0 ? 'hoje' : diff === 1 ? 'amanhã'
          : p.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        urgente: diff <= 1,
      }))
  }, [osList])

  const kpis = [
    { id: 'abertas',   label: 'OS abertas',     icon: 'clipboard-list', valor: dados.osAbertas,       corKey: 'blue' },
    { id: 'atrasadas', label: 'Atrasadas',      icon: 'calendar-x',     valor: dados.osAtrasadas,     corKey: 'red',  destaque: dados.osAtrasadas > 0 },
    { id: 'concluidas',label: 'Concluídas mês', icon: 'circle-check',   valor: dados.osConcluidasMes, corKey: 'blue' },
    { id: 'ticket',    label: 'Ticket médio',   icon: 'receipt',        valor: dados.ticketMedio,     corKey: 'yellow', isBRL: true },
    { id: 'agpeca',    label: 'Ag. peça',       icon: 'package-off',    valor: dados.aguardPeca,      corKey: 'yellow', destaque: dados.aguardPeca > 0 },
    { id: 'oficina',   label: 'Em oficina',     icon: 'tool',           valor: dados.naOficina,       corKey: 'blue' },
  ]

  return (
    <div style={{
      overflowY: 'auto', flex: 1, minHeight: 0,
      background: T.bg, fontFamily: ATL_FONT,
    }}>
      <div style={{
        padding: '12px 14px 96px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>

        {/* 1. Hero */}
        <HeroPanel
          T={T} dark={dark}
          apelido={apelido}
          faturamentoMes={finAgg.faturamentoMes}
          deltaPct={finAgg.deltaPct}
          labelMesAnt={finAgg.labelMesAnt}
          meta={metaMensal}
          recebidoHoje={finAgg.recebidoHoje}
        />

        {/* 2. KPIs */}
        <KPIGrid T={T} dark={dark} kpis={kpis} loading={loading} />

        {/* 2b. Sparkline 30 dias */}
        <Sparkline30d T={T} dark={dark} serie={finAgg.spark30d || []} dias={finAgg.diasUteis30 || []} />

        {/* 3. Alertas */}
        {criticos.length > 0 && (
          <AlertasPanel T={T} dark={dark} criticos={criticos} onTap={() => navigate('/os')} />
        )}

        {/* 4. Pipeline */}
        <PipelinePanel
          T={T} dark={dark}
          pipeline={pipeline}
          onTap={() => navigate('/os')}
        />

        {/* 5. Proximas */}
        {proximas.length > 0 && (
          <ProximasPanel T={T} dark={dark} proximas={proximas} onTap={() => navigate('/os')} />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Hero panel
// ═══════════════════════════════════════════════════════════════════════════
function HeroPanel({ T, dark, apelido, faturamentoMes, deltaPct, labelMesAnt, meta, recebidoHoje }) {
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  const hoje = new Date()
  const dataLabel = `${hoje.getDate()} de ${MESES_LONGO[hoje.getMonth()]}`

  const positivo = deltaPct != null && deltaPct >= 0
  const corDelta = positivo ? verde : vermelho
  const progressoPct = meta > 0 ? Math.min(Math.round((faturamentoMes / meta) * 100), 100) : 0
  const metaBatida = faturamentoMes >= meta && meta > 0

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: ATL_RADIUS, overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      {/* Linha 1: avatar + saudacao + data */}
      <div style={{
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${T.border}`,
        background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: ATL_RADIUS,
          background: azul, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, letterSpacing: '0.5px',
          flexShrink: 0,
        }}>{iniciais(apelido)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: T.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>{saudacao()},</div>
          <div style={{
            fontSize: 15, fontWeight: 700, color: T.textPrimary,
            letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{apelido}</div>
        </div>
        <div style={{
          fontSize: 11.5, color: T.textMuted, fontWeight: 500,
          textAlign: 'right', flexShrink: 0,
        }}>{dataLabel}</div>
      </div>

      {/* Linha 2: faturamento + delta + meta */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
        }}>Faturamento do mês</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div style={{
            fontSize: 28, fontWeight: 700, color: T.textPrimary,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em',
            lineHeight: 1, flex: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{fmtBRL(faturamentoMes)}</div>
          {deltaPct != null && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 11.5, fontWeight: 600, color: corDelta,
              background: corDelta + '22',
              borderRadius: 3, padding: '3px 8px',
              flexShrink: 0, fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.005em',
            }}>
              <i className={`ti ti-${positivo ? 'trending-up' : 'trending-down'}`}
                 style={{ fontSize: 12 }} aria-hidden="true" />
              {positivo ? '+' : ''}{deltaPct}%{labelMesAnt ? ` vs ${labelMesAnt}` : ''}
            </div>
          )}
        </div>

        {/* Barra meta */}
        <div style={{ marginTop: 10 }}>
          <div style={{
            height: 5, background: dark ? 'rgba(255,255,255,0.08)' : '#DFE1E6',
            borderRadius: 3, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${progressoPct}%`,
              background: metaBatida ? verde : azul,
              borderRadius: 3, transition: 'width .4s ease',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 5,
          }}>
            <span style={{ fontSize: 11, color: T.textMuted }}>
              {metaBatida ? '🎯 Meta batida!' : `${progressoPct}% da meta`}
            </span>
            <span style={{
              fontSize: 11, color: T.textDim, fontVariantNumeric: 'tabular-nums',
            }}>Meta: {fmtBRL(meta)}</span>
          </div>
        </div>
      </div>

      {/* Linha 3: recebido hoje */}
      <div style={{
        padding: '10px 14px',
        borderTop: `1px solid ${T.border}`,
        background: dark ? 'rgba(91,155,213,0.06)' : 'rgba(91,155,213,0.04)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: ATL_RADIUS,
          background: azul + '22', color: azul,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className="ti ti-cash" style={{ fontSize: 13 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11.5, color: T.textMuted, fontWeight: 500 }}>
            Recebido hoje
          </span>
          <span style={{
            fontSize: 13, fontWeight: 700, color: azul,
            fontVariantNumeric: 'tabular-nums', marginLeft: 6,
          }}>{fmtBRL(recebidoHoje)}</span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI grid 2x2
// ═══════════════════════════════════════════════════════════════════════════
function KPIGrid({ T, dark, kpis, loading }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {kpis.map(k => (
        <KpiCard key={k.id} T={T} dark={dark} item={k} loading={loading} />
      ))}
    </div>
  )
}

function KpiCard({ T, dark, item, loading }) {
  const cor = corEtapa(item.corKey, dark)
  const destaqueAtivo = item.destaque && (item.valor || 0) > 0
  return (
    <div style={{
      background: destaqueAtivo
        ? (dark ? 'rgba(192,66,66,0.10)' : '#FEF0EF')
        : T.card,
      border: `1px solid ${destaqueAtivo ? cor + '44' : T.border}`,
      borderRadius: ATL_RADIUS,
      padding: '12px',
      display: 'flex', flexDirection: 'column', gap: 0,
      minHeight: 88,
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: ATL_RADIUS,
        background: cor + '22', color: cor,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 8, flexShrink: 0,
      }}>
        <i className={`ti ti-${item.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
      </div>

      {loading ? (
        <div style={{
          height: 28, width: 48, borderRadius: 3,
          background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
          marginBottom: 4,
        }} />
      ) : (
        <div style={{
          fontSize: item.isBRL ? 18 : 24,
          fontWeight: 700,
          color: destaqueAtivo ? cor : T.textPrimary,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.025em', lineHeight: 1,
          marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.isBRL ? fmtBRL(item.valor || 0) : (item.valor ?? 0)}
        </div>
      )}

      <div style={{
        fontSize: 11, color: T.textMuted, fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{item.label}</div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Alertas panel
// ═══════════════════════════════════════════════════════════════════════════
function AlertasPanel({ T, dark, criticos, onTap }) {
  const vermelho = corEtapa('red', dark)
  const amarelo  = corEtapa('yellow', dark)
  const azul     = corEtapa('blue', dark)

  const nCriticos = criticos.filter(c => c.nivel === 'critico').length
  const nAtencao  = criticos.filter(c => c.nivel === 'atencao').length

  const nivelCor = { critico: vermelho, atencao: amarelo, info: azul }

  return (
    <AtlPanel T={T} dark={dark}
      titleIcon="alert-triangle"
      titleCor={vermelho}
      title="Alertas"
      headerExtra={
        <div style={{ display: 'flex', gap: 5 }}>
          {nCriticos > 0 && (
            <span style={{
              fontSize: 10.5, fontWeight: 700,
              background: vermelho + '22', color: vermelho,
              borderRadius: 3, padding: '2px 7px',
              letterSpacing: '-0.005em',
            }}>{nCriticos} crítico{nCriticos > 1 ? 's' : ''}</span>
          )}
          {nAtencao > 0 && (
            <span style={{
              fontSize: 10.5, fontWeight: 700,
              background: amarelo + '22', color: amarelo,
              borderRadius: 3, padding: '2px 7px',
              letterSpacing: '-0.005em',
            }}>{nAtencao} atenção</span>
          )}
        </div>
      }>
      {criticos.map((c, i) => (
        <button key={i} onClick={onTap}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', width: '100%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
            fontFamily: ATL_FONT, textAlign: 'left',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <div style={{
            width: 28, height: 28, borderRadius: ATL_RADIUS, flexShrink: 0,
            background: nivelCor[c.nivel] + '22',
            color: nivelCor[c.nivel],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`ti ti-${c.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.textPrimary,
              letterSpacing: '-0.005em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{c.msg}</div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
              {c.sub}
            </div>
          </div>
          <i className="ti ti-chevron-right"
             style={{ fontSize: 13, color: T.textDim, flexShrink: 0 }}
             aria-hidden="true" />
        </button>
      ))}
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Pipeline panel
// ═══════════════════════════════════════════════════════════════════════════
function PipelinePanel({ T, dark, pipeline, onTap }) {
  const azul = corEtapa('blue', dark)
  const total = pipeline.reduce((s, e) => s + e.n, 0)

  return (
    <AtlPanel T={T} dark={dark}
      titleIcon="route"
      titleCor={azul}
      title="Pipeline"
      count={`${total} OS`}>
      {pipeline.map((e, i) => {
        const cor = corEtapa(e.corKey, dark)
        const ativa = e.n > 0
        const pct = total > 0 ? Math.round((e.n / total) * 100) : 0
        return (
          <button key={e.id} onClick={onTap}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', minHeight: 40, width: '100%',
              background: 'transparent', border: 'none', borderRadius: 0,
              cursor: 'pointer', fontFamily: ATL_FONT, textAlign: 'left',
              borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
              WebkitTapHighlightColor: 'transparent',
            }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: ativa ? cor : T.border,
              boxShadow: ativa ? `0 0 0 3px ${cor}22` : 'none',
            }} aria-hidden="true" />
            <span style={{
              flex: 1, fontSize: 13, minWidth: 0,
              fontWeight: ativa ? 600 : 500,
              color: ativa ? T.textPrimary : T.textMuted,
              letterSpacing: '-0.005em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{e.label}</span>

            {ativa && (
              <div style={{
                width: 36, height: 3, borderRadius: 2,
                background: dark ? 'rgba(255,255,255,0.08)' : '#E5E5EA',
                overflow: 'hidden', flexShrink: 0,
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: cor, borderRadius: 2,
                }} />
              </div>
            )}

            <span style={{
              fontSize: 12, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: ativa ? cor : T.textDim,
              background: ativa ? cor + '22' : 'transparent',
              borderRadius: 3, padding: ativa ? '2px 8px' : '2px 6px',
              minWidth: 26, textAlign: 'center', flexShrink: 0,
              letterSpacing: '-0.005em',
            }}>{e.n}</span>

            <i className="ti ti-chevron-right"
               style={{ fontSize: 12, color: T.textDim, flexShrink: 0 }}
               aria-hidden="true" />
          </button>
        )
      })}
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Próximas paradas panel
// ═══════════════════════════════════════════════════════════════════════════
function ProximasPanel({ T, dark, proximas, onTap }) {
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  return (
    <AtlPanel T={T} dark={dark}
      titleIcon="calendar-due"
      titleCor={azul}
      title="Próximas paradas"
      count={proximas.length}>
      {proximas.map((p, i) => {
        const cor = p.urgente ? vermelho : azul
        return (
          <button key={i} onClick={onTap}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', width: '100%',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
              fontFamily: ATL_FONT, textAlign: 'left',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <div style={{
              width: 32, height: 32, borderRadius: ATL_RADIUS, flexShrink: 0,
              background: cor + '22', color: cor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, letterSpacing: '-0.005em',
            }}>{p.ini}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: T.textPrimary,
                  letterSpacing: '-0.005em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{p.cliente}</span>
                <span style={{
                  fontSize: 11, color: T.textDim, flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>{p.os}</span>
              </div>
              <div style={{
                fontSize: 11.5, color: T.textMuted, marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{p.equip} · {p.etapaLabel}</div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              color: cor, background: cor + '22',
              borderRadius: 3, padding: '3px 8px',
              letterSpacing: '-0.005em',
            }}>{p.dt}</span>
          </button>
        )
      })}
    </AtlPanel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Sparkline 30 dias — barras SVG simples
// ═══════════════════════════════════════════════════════════════════════════
function Sparkline30d({ T, dark, serie, dias = [] }) {
  const azul = corEtapa('blue', dark)
  const temDados = serie.some(v => v > 0)
  if (!temDados) return null

  const max = Math.max(...serie, 1)
  const H = 36, gap = 2
  const totalW = 30 * (gap + 4) - gap

  // dias[] já são os 30 dias ÚTEIS de verdade (domingo pulado) — não dá pra
  // recalcular aqui com offset de dia corrido.
  const fmtDia = (d) => `${d.getDate()}/${MESES_CURTO[d.getMonth()]}`
  const labelIni = dias[0] ? fmtDia(dias[0]) : ''
  const labelFim = dias[dias.length - 1] ? fmtDia(dias[dias.length - 1]) : ''

  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: ATL_RADIUS,
      padding: '10px 14px',
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <i className="ti ti-chart-bar" style={{ fontSize: 12, color: azul }} aria-hidden="true" />
        Receita — últimos 30 dias
      </div>
      <svg width="100%" viewBox={`0 0 ${totalW} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        {serie.map((v, i) => {
          const h = Math.max(Math.round((v / max) * H), v > 0 ? 2 : 1)
          const x = i * (4 + gap)
          const isHoje = i === 29
          return (
            <rect key={i}
              x={x} y={H - h} width={4} height={h}
              rx={1}
              fill={isHoje ? azul : v > 0 ? azul + 'AA' : (dark ? 'rgba(255,255,255,0.06)' : '#DFE1E6')}
            />
          )
        })}
      </svg>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: T.textDim, marginTop: 4,
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span>{labelIni}</span>
        <span style={{ color: azul, fontWeight: 600 }}>hoje</span>
        <span>{labelFim}</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// AtlPanel inline — com titleIcon + headerExtra + count
// ═══════════════════════════════════════════════════════════════════════════
function AtlPanel({ T, dark, title, titleIcon, titleCor, count, headerExtra, footer, children }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: ATL_RADIUS, overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
        background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
      }}>
        {titleIcon && (
          <i className={`ti ti-${titleIcon}`}
             style={{ fontSize: 14, color: titleCor || T.textMuted, flexShrink: 0 }}
             aria-hidden="true" />
        )}
        <div style={{
          fontSize: 13, fontWeight: 600, color: T.textPrimary,
          letterSpacing: '-0.005em', flex: 1,
        }}>{title}</div>
        {count != null && (
          <span style={{
            fontSize: 11, fontWeight: 600, color: T.textMuted,
            background: dark ? 'rgba(255,255,255,0.07)' : '#DFE1E6',
            padding: '2px 7px', borderRadius: 99,
            fontVariantNumeric: 'tabular-nums',
          }}>{count}</span>
        )}
        {headerExtra}
      </div>
      <div>{children}</div>
      {footer && (
        <div style={{
          padding: '8px 14px',
          borderTop: `1px solid ${T.border}`,
          background: dark ? 'rgba(255,255,255,0.025)' : '#F7F8F9',
          fontSize: 12, color: T.textMuted,
        }}>{footer}</div>
      )}
    </div>
  )
}
