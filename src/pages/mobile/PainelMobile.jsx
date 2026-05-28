// idemaq-src/pages/mobile/PainelMobile.jsx
// Painel dono mobile — Apple HIG rebuild.
// Espelha a lógica de dados do Painel.jsx desktop:
//   useOS + useFinanceiro + useConfiguracoes + usePecas + useClientes
// Layout: Hero → KPIs → Alertas → Pipeline → Próximas paradas

import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { P } from '../../theme'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { calcStatusPrazo, diasPrazo, isAdmin } from '../../utils/osHelpers'
import { ETAPAS_TODOS } from '../../utils/osData'
import { useOS } from '../../hooks/useOS'
import { useUsuarios } from '../../hooks/useUsuarios'
import { useClientes } from '../../hooks/useClientes'
import { usePecas } from '../../hooks/usePecas'
import { useFinanceiro } from '../../hooks/useFinanceiro'
import { useConfiguracoes } from '../../hooks/useConfiguracoes'
import { supabase } from '../../supabase'

import HeroMobile from '../../components/mobile/HeroMobile'
import KPIGridMobile from '../../components/mobile/KPIGridMobile'
import PipelineMobile from '../../components/mobile/PipelineMobile'

// ─── Helpers ────────────────────────────────────────────────────────────────
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
const MESES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

export default function PainelMobile({ T, dark, user }) {
  const navigate = useNavigate()
  const { osList, loading } = useOS(false)
  const { apelidoDe } = useUsuarios()
  const { clientes } = useClientes()
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

  // ─── Financeiro ─────────────────────────────────────────────────────────────
  const finAgg = useMemo(() => {
    const ano = hojeData.getFullYear()
    const mesAtual = hojeData.getMonth()
    const hojeZero = new Date(); hojeZero.setHours(0, 0, 0, 0)
    const recebidoSerie = Array(12).fill(0)
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
    }

    const faturamentoMes = recebidoSerie[mesAtual]
    const faturamentoAnt = mesAtual === 0 ? faturamentoAntCrossYear : recebidoSerie[mesAtual - 1]
    const deltaPct = faturamentoAnt > 0
      ? Math.round(((faturamentoMes - faturamentoAnt) / faturamentoAnt) * 100)
      : null

    return { faturamentoMes, faturamentoAnt, deltaPct, recebidoHoje, labelMesAnt: MESES_CURTO[mesAtual === 0 ? 11 : mesAtual - 1] }
  }, [lancsFin, hojeData])

  // ─── Operacional ────────────────────────────────────────────────────────────
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
    const ticketMedio = osConcluidasMes > 0 ? Math.round(finAgg.faturamentoMes / osConcluidasMes) : 0
    return { osAbertas, osAtrasadas, aguardPeca, naOficina, osConcluidasMes, ticketMedio }
  }, [osList, hojeData, finAgg.faturamentoMes])

  // ─── Estoque ─────────────────────────────────────────────────────────────
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

  // ─── Alertas críticos (mesma lógica do desktop) ──────────────────────────
  const criticos = useMemo(() => {
    const list = []
    for (const os of osList || []) {
      if (os.deleted_at) continue
      if (os.etapa === 'concluido' || os.etapa === 'recusado') continue
      const dias = os.prazo ? diasPrazo(os.prazo) : null
      const status = os.prazo ? calcStatusPrazo(os.prazo, os.etapa) : null
      const ultMov = (os.historico || []).slice(-1)[0]?.data
      const diasParado = ultMov ? Math.round((Date.now() - new Date(ultMov).getTime()) / 86400000) : null
      const base = { osNumero: os.numero, msg: `OS #${os.numero} · ${os.cliente || os.equipamento || 'Fabricação'}` }

      if (dias != null && dias < -5) {
        list.push({ ...base, nivel: 'critico', icon: 'ti-calendar-x', sub: `Vencida há ${Math.abs(dias)} dias`, prio: 0 }); continue
      }
      if (diasParado != null && diasParado >= 7) {
        list.push({ ...base, nivel: 'critico', icon: 'ti-flame', sub: `Sem movimento há ${diasParado} dias`, prio: 1 }); continue
      }
      if (status === 'vencido' && dias != null && dias < 0) {
        list.push({ ...base, nivel: 'critico', icon: 'ti-calendar-x', sub: `Vencida há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}`, prio: 2 }); continue
      }
      if (dias === 0) {
        list.push({ ...base, nivel: 'atencao', icon: 'ti-alarm', sub: 'Vence hoje', prio: 10 }); continue
      }
      if (os.aguardando_peca && diasParado != null && diasParado >= 3) {
        list.push({ ...base, nivel: 'atencao', icon: 'ti-package-off', sub: `Aguardando peça há ${diasParado} dia${diasParado !== 1 ? 's' : ''}`, prio: 11 }); continue
      }
      if (dias === 1) list.push({ ...base, nivel: 'info', icon: 'ti-clock', sub: 'Vence amanhã', prio: 20 })
    }
    if (estoque.esgotadas > 0) {
      const ex = (pecas || []).find(p => (p.qtdMinima || 0) > 0 && (p.qtdAtual || 0) === 0)
      list.push({ nivel: 'critico', icon: 'ti-package-off', msg: `${estoque.esgotadas} peça${estoque.esgotadas > 1 ? 's' : ''} esgotada${estoque.esgotadas > 1 ? 's' : ''}`, sub: ex ? `Ex.: ${ex.nome}` : 'Repor urgente', prio: 3 })
    }
    if (estoque.baixas > 0) {
      const ex = (pecas || []).find(p => { const min = p.qtdMinima||0, cur = p.qtdAtual||0; return min>0 && cur>0 && cur<=min })
      list.push({ nivel: 'atencao', icon: 'ti-package', msg: `${estoque.baixas} peça${estoque.baixas > 1 ? 's' : ''} com estoque baixo`, sub: ex ? `${ex.nome} (${ex.qtdAtual}/${ex.qtdMinima})` : 'Planejar reposição', prio: 12 })
    }
    return list.sort((a, b) => a.prio - b.prio).slice(0, 5)
  }, [osList, estoque, pecas])

  // ─── Pipeline ────────────────────────────────────────────────────────────
  const pipeline = useMemo(() =>
    ETAPAS_TODOS
      .filter(e => !e.adminOnly)
      .map(e => ({
        id: e.id, label: e.curto, cor: e.cor,
        n: (osList || []).filter(o => !o.deleted_at && o.etapa === e.id).length,
      })),
    [osList]
  )

  // ─── Próximas paradas (7 dias) ────────────────────────────────────────────
  const proximas = useMemo(() => {
    const hojeZero = new Date(); hojeZero.setHours(0, 0, 0, 0)
    return (osList || [])
      .filter(o => !o.deleted_at && o.prazo && o.etapa !== 'concluido' && o.etapa !== 'recusado')
      .map(o => { const p = new Date(o.prazo); p.setHours(0, 0, 0, 0); const diff = Math.round((p - hojeZero) / 86400000); return { o, p, diff } })
      .filter(({ diff }) => diff >= 0 && diff <= 7)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 4)
      .map(({ o, p, diff }) => ({
        os: `#${o.numero}`,
        cliente: o.cliente || 'Fabricação',
        ini: iniciais(o.cliente),
        equip: `${o.marca || ''} ${o.modelo || ''}`.trim() || o.equipamento || '—',
        etapaLabel: ETAPAS_TODOS.find(e => e.id === o.etapa)?.curto || o.etapa,
        dt: diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : p.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        urgente: diff <= 1,
      }))
  }, [osList])

  const kpis = [
    { id: 'abertas',   label: 'OS abertas',    icon: 'ti-clipboard-list', valor: dados.osAbertas,   corKey: 'blue'   },
    { id: 'atrasadas', label: 'Atrasadas',      icon: 'ti-calendar-x',    valor: dados.osAtrasadas, corKey: 'red',    destaque: dados.osAtrasadas > 0 },
    { id: 'concluidas',label: 'Concluídas mês', icon: 'ti-circle-check',  valor: dados.osConcluidasMes, corKey: 'blue' },
    { id: 'ticket',    label: 'Ticket médio',   icon: 'ti-receipt',       valor: dados.ticketMedio,  corKey: 'yellow', isBRL: true },
  ]

  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, background: T.bg }}>
    <div style={{
      padding: '12px 14px 96px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <HeroMobile
        T={T} dark={dark}
        apelido={apelido}
        faturamentoMes={finAgg.faturamentoMes}
        deltaPct={finAgg.deltaPct}
        labelMesAnt={finAgg.labelMesAnt}
        meta={metaMensal}
        recebidoHoje={finAgg.recebidoHoje}
      />

      <KPIGridMobile T={T} dark={dark} kpis={kpis} loading={loading} />

      {criticos.length > 0 && (
        <AlertasMobile T={T} dark={dark} criticos={criticos} onTap={() => navigate('/os')} />
      )}

      <PipelineMobile T={T} dark={dark} pipeline={pipeline} />

      {proximas.length > 0 && (
        <ProximasMobile T={T} dark={dark} proximas={proximas} onTap={() => navigate('/os')} />
      )}
    </div>
    </div>
  )
}

// ─── Alertas ────────────────────────────────────────────────────────────────
function AlertasMobile({ T, dark, criticos, onTap }) {
  const nCriticos = criticos.filter(c => c.nivel === 'critico').length
  const nAtencao  = criticos.filter(c => c.nivel === 'atencao').length

  const nivelCor = {
    critico: corEtapa('red',    dark),
    atencao: corEtapa('yellow', dark),
    info:    corEtapa('blue',   dark),
  }
  const nivelBg = {
    critico: bgEtapa('red',    dark),
    atencao: bgEtapa('yellow', dark),
    info:    bgEtapa('blue',   dark),
  }

  return (
    <div style={{
      background: T.card,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 15, color: corEtapa('red', dark) }} aria-hidden="true" />
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>Alertas</span>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {nCriticos > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: bgEtapa('red', dark), color: corEtapa('red', dark),
              borderRadius: 100, padding: '2px 8px',
            }}>{nCriticos} crítico{nCriticos > 1 ? 's' : ''}</span>
          )}
          {nAtencao > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              background: bgEtapa('yellow', dark), color: corEtapa('yellow', dark),
              borderRadius: 100, padding: '2px 8px',
            }}>{nAtencao} atenção</span>
          )}
        </div>
      </div>

      {/* Lista */}
      {criticos.map((c, i) => (
        <button key={i} onClick={onTap}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', width: '100%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderTop: `1px solid ${T.border}`,
            fontFamily: 'inherit', textAlign: 'left',
          }}>
          {/* Stripe de nível */}
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: nivelBg[c.nivel],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`ti ${c.icon}`} style={{ fontSize: 16, color: nivelCor[c.nivel] }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.msg}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1 }}>
              {c.sub}
            </div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: 14, color: T.textDim, flexShrink: 0 }} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

// ─── Próximas paradas ────────────────────────────────────────────────────────
function ProximasMobile({ T, dark, proximas, onTap }) {
  const azul = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  const bgAzul = bgEtapa('blue', dark)
  const bgVerm = bgEtapa('red', dark)

  return (
    <div style={{
      background: T.card,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
    }}>
      <div style={{ padding: '12px 14px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className="ti ti-calendar-due" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>Próximas paradas</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: azul, background: bgAzul,
          borderRadius: 100, padding: '2px 7px', marginLeft: 2,
        }}>{proximas.length}</span>
      </div>

      {proximas.map((p, i) => (
        <button key={i} onClick={onTap}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', width: '100%',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderTop: `1px solid ${T.border}`,
            fontFamily: 'inherit', textAlign: 'left',
          }}>
          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: p.urgente ? bgVerm : bgAzul,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800,
            color: p.urgente ? vermelho : azul,
          }}>{p.ini}</div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.cliente}
              </span>
              <span style={{ fontSize: 11, color: T.textDim, flexShrink: 0 }}>{p.os}</span>
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.equip} · {p.etapaLabel}
            </div>
          </div>

          <span style={{
            fontSize: 11, fontWeight: 700, flexShrink: 0,
            color: p.urgente ? vermelho : azul,
            background: p.urgente ? bgVerm : bgAzul,
            borderRadius: 8, padding: '3px 8px',
          }}>{p.dt}</span>
        </button>
      ))}
    </div>
  )
}
