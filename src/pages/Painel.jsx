// idemaq-src/pages/Painel.jsx
// Painel principal (desktop) — Hero + KPIs + Críticos + Pipeline + Fluxo + Próximas paradas.
// Usa componentes do design system (idemaq-src/components/painel/*).
// Dados derivados de useOS + useUsuarios (Módulo 00c — Lote 1, terminal `painel`).

import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, registerables } from 'chart.js'
import { P } from '../theme'
import { corEtapa, corHero } from '../utils/colors'
import { fmtBRL } from '../utils/fmt'
import { calcStatusPrazo, diasPrazo } from '../utils/osHelpers'
import { ETAPAS_TODOS } from '../utils/osData'
import { useOS } from '../hooks/useOS'
import { useUsuarios } from '../hooks/useUsuarios'
import { supabase } from '../supabase'

import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'

import HeroFaturamento         from '../components/painel/HeroFaturamento'
import HojeSidekick            from '../components/painel/HojeSidekick'
import KPICard                 from '../components/painel/KPICard'
import PipelineOS              from '../components/painel/PipelineOS'
import AlertasCriticos         from '../components/painel/AlertasCriticos'
import ProximasParadasTimeline from '../components/painel/ProximasParadasTimeline'

ChartJS.register(...registerables)

// ─── Helpers locais ─────────────────────────────────────────────────────────
const MESES_LONGO = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

// Data do pagamento da OS — etapa 'pagamento' ou (quando pulou direto) 'concluido'
function dataPagamento(os) {
  const reg = (os.historico || []).find(h => h.etapa === 'pagamento') ||
              (os.historico || []).find(h => h.etapa === 'concluido')
  return reg ? new Date(reg.data) : null
}
function mesmoMes(d, ref) {
  return d && d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}
// Saudação por hora local de Cuiabá (fuso da operação).
// Pega a hora via Intl em vez de getHours() pra evitar deslocamento de
// servidor/sessão que esteja em outro timezone.
function saudacao() {
  const h = parseInt(new Date().toLocaleString('en-US', {
    hour: '2-digit', hour12: false, timeZone: 'America/Cuiaba',
  }), 10)
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}
function iniciais(nome) {
  return (nome || 'IN').split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Painel({ T, dark, user }) {
  const cor = (d, c) => dark ? d : c
  const navigate = useNavigate()
  const { osList } = useOS(false)
  const { apelidoDe } = useUsuarios()

  // Fallback robusto: prop user pode vir undefined (ex: PainelPorPerfil em
  // App.jsx não está repassando). Busca via supabase.auth como backup.
  const [authUser, setAuthUser] = useState(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUser(data?.user || null))
  }, [])
  const idUsuario = user?.id || authUser?.id
  const ap = idUsuario ? apelidoDe(idUsuario) : null
  // apelidoDe retorna 'desconhecido' quando array ainda não carregou — trata como fallback
  const apelido = (ap && ap !== 'desconhecido') ? ap : 'parceiro'
  const hojeData = new Date()

  // ─── Agregações principais derivadas de osList ────────────────────────────
  const dados = useMemo(() => {
    const refMesAtual = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1)
    const refMesAnt   = new Date(hojeData.getFullYear(), hojeData.getMonth() - 1, 1)
    const hojeZero = new Date(); hojeZero.setHours(0, 0, 0, 0)

    let faturamentoMes = 0
    let faturamentoAnt = 0
    let osAbertas = 0
    let osAtrasadas = 0
    let aguardPeca = 0
    let naOficina = 0
    let osConcluidasMes = 0
    let osConcluidasMesAnt = 0
    let osCriadasMes = 0
    let osCriadasMesAnt = 0
    const spark30d = Array(30).fill(0)

    for (const os of osList || []) {
      if (os.deleted_at) continue

      // Faturamento (mês atual e anterior) + sparkline 30 dias
      const dt = dataPagamento(os)
      if (dt && os.valor_pago > 0) {
        if (mesmoMes(dt, refMesAtual)) faturamentoMes += os.valor_pago
        if (mesmoMes(dt, refMesAnt))  faturamentoAnt += os.valor_pago

        const dtZero = new Date(dt); dtZero.setHours(0, 0, 0, 0)
        const diff = Math.round((hojeZero - dtZero) / 86400000)
        if (diff >= 0 && diff < 30) spark30d[29 - diff] += os.valor_pago
      }

      // OS criadas no mês (proxy: abertura como "YYYY-MM-DD HH:mm" Cuiabá)
      if (os.abertura) {
        const dtAb = new Date(os.abertura)
        if (!isNaN(dtAb)) {
          if (mesmoMes(dtAb, refMesAtual)) osCriadasMes++
          else if (mesmoMes(dtAb, refMesAnt)) osCriadasMesAnt++
        }
      }

      if (os.etapa !== 'concluido' && os.etapa !== 'recusado') {
        osAbertas++
        if (os.prazo && calcStatusPrazo(os.prazo, os.etapa) === 'vencido') osAtrasadas++
        if (os.aguardando_peca) aguardPeca++
        if (os.etapa === 'oficina') naOficina++
      } else if (os.etapa === 'concluido') {
        const cReg = (os.historico || []).find(h => h.etapa === 'concluido')
        if (cReg) {
          const cData = new Date(cReg.data)
          if (mesmoMes(cData, refMesAtual)) osConcluidasMes++
          else if (mesmoMes(cData, refMesAnt)) osConcluidasMesAnt++
        }
      }
    }

    const ticketMedio = osConcluidasMes > 0 ? Math.round(faturamentoMes / osConcluidasMes) : 0
    const ticketAnt   = osConcluidasMesAnt > 0 ? Math.round(faturamentoAnt / osConcluidasMesAnt) : 0

    // Helper: variação % vs base. Retorna null se base = 0 (evita "Infinity%").
    const varPct = (atual, base) =>
      base > 0 ? Math.round(((atual - base) / base) * 100) : null

    return {
      faturamentoMes, faturamentoAnt,
      osAbertas, osAtrasadas, aguardPeca, naOficina,
      osConcluidasMes, osConcluidasMesAnt,
      osCriadasMes, osCriadasMesAnt,
      ticketMedio, ticketAnt,
      deltaPct:     varPct(faturamentoMes, faturamentoAnt),
      deltaTicket:  varPct(ticketMedio,    ticketAnt),
      deltaCriadas: varPct(osCriadasMes,   osCriadasMesAnt),
      spark30d,
      labelMesAnt: MESES_CURTO[refMesAnt.getMonth()],
    }
  }, [osList, hojeData])

  // ─── Pipeline — contagem real por etapa (exceto admin-only) ───────────────
  const pipeline = useMemo(() =>
    ETAPAS_TODOS
      .filter(e => !e.adminOnly)
      .map(e => ({
        id: e.id,
        label: e.curto,
        n: (osList || []).filter(o => !o.deleted_at && o.etapa === e.id).length,
        corKey: e.cor,
      })),
    [osList]
  )

  // ─── Alertas com 3 níveis (crítico / atenção / info) ──────────────────────
  // Lógica de classificação documentada em painel-noite.md (Tarefa 3).
  // `prio` numérica ordena dentro da lista: menor = mais urgente.
  const criticos = useMemo(() => {
    const list = []
    for (const os of osList || []) {
      if (os.deleted_at) continue
      if (os.etapa === 'concluido' || os.etapa === 'recusado') continue

      const dias = os.prazo ? diasPrazo(os.prazo) : null  // signed: <0 atrasado, 0 hoje, 1 amanhã
      const status = os.prazo ? calcStatusPrazo(os.prazo, os.etapa) : null
      const ultMov = (os.historico || []).slice(-1)[0]?.data
      const diasParado = ultMov
        ? Math.round((Date.now() - new Date(ultMov).getTime()) / 86400000)
        : null

      const base = {
        osNumero: os.numero,
        msg: `OS #${os.numero} · ${os.cliente || os.equipamento || 'Fabricação'}`,
      }

      // ── CRÍTICO ────────────────────────────────────────
      if (dias != null && dias < -5) {
        list.push({ ...base, nivel: 'critico', icon: 'ti-calendar-x',
          sub: `Vencida há ${Math.abs(dias)} dias`, prio: 0 })
        continue
      }
      if (diasParado != null && diasParado >= 7) {
        list.push({ ...base, nivel: 'critico', icon: 'ti-flame',
          sub: `Sem movimento há ${diasParado} dias`, prio: 1 })
        continue
      }
      if (status === 'vencido' && dias != null && dias < 0) {
        list.push({ ...base, nivel: 'critico', icon: 'ti-calendar-x',
          sub: `Vencida há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}`, prio: 2 })
        continue
      }

      // ── ATENÇÃO ────────────────────────────────────────
      if (dias === 0) {
        list.push({ ...base, nivel: 'atencao', icon: 'ti-alarm',
          sub: 'Vence hoje', prio: 10 })
        continue
      }
      if (os.aguardando_peca && diasParado != null && diasParado >= 3) {
        list.push({ ...base, nivel: 'atencao', icon: 'ti-package-off',
          sub: `Aguardando peça há ${diasParado} dia${diasParado !== 1 ? 's' : ''}`, prio: 11 })
        continue
      }

      // ── INFO ───────────────────────────────────────────
      if (dias === 1) {
        list.push({ ...base, nivel: 'info', icon: 'ti-clock',
          sub: 'Vence amanhã', prio: 20 })
      }
    }
    return list.sort((a, b) => a.prio - b.prio).slice(0, 6)
  }, [osList])

  // ─── Próximas paradas (próximos 7 dias com prazo, qualquer etapa ativa) ───
  const proximas = useMemo(() => {
    const hojeZero = new Date(); hojeZero.setHours(0, 0, 0, 0)
    return (osList || [])
      .filter(o => !o.deleted_at && o.prazo && o.etapa !== 'concluido' && o.etapa !== 'recusado')
      .map(o => {
        const prazo = new Date(o.prazo); prazo.setHours(0, 0, 0, 0)
        const diff = Math.round((prazo - hojeZero) / 86400000)
        return { o, prazo, diff }
      })
      .filter(({ diff }) => diff >= 0 && diff <= 7)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5)
      .map(({ o, prazo, diff }) => ({
        hr: '—',
        dt: diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : prazo.toLocaleDateString('pt-BR'),
        tipo: diff === 0 ? 'urgente' : diff <= 2 ? 'hoje' : 'proximo',
        cliente: o.cliente || 'Fabricação interna',
        ini: iniciais(o.cliente),
        svc: ETAPAS_TODOS.find(e => e.id === o.etapa)?.label || o.etapa,
        equip: `${o.marca || ''} ${o.modelo || ''}`.trim() || o.equipamento || '—',
        os: `#${o.numero}`,
      }))
  }, [osList])

  // ─── Hero ─────────────────────────────────────────────────────────────────
  const hero = {
    mesLabel: `${MESES_LONGO[hojeData.getMonth()]} ${hojeData.getFullYear()}`,
    atual: dados.faturamentoMes,
    meta: 20000, // meta da empresa — confirmar com Toni se varia
    deltaPct: dados.deltaPct,
    hojeLabel: `${String(hojeData.getDate()).padStart(2, '0')}/${MESES_CURTO[hojeData.getMonth()]}`,
    spark30d: dados.spark30d,
  }

  // ─── Hoje sidekick ────────────────────────────────────────────────────────
  const hoje = useMemo(() => {
    const hojeZero = new Date(); hojeZero.setHours(0, 0, 0, 0)
    let recebidoHoje = 0
    let pagasHoje = 0
    for (const os of osList || []) {
      const dt = dataPagamento(os)
      if (!dt || !os.valor_pago) continue
      const dtZero = new Date(dt); dtZero.setHours(0, 0, 0, 0)
      if (dtZero.getTime() === hojeZero.getTime()) {
        recebidoHoje += os.valor_pago
        pagasHoje++
      }
    }
    const emRota = (osList || []).filter(o =>
      !o.deleted_at && ['ag_agendamento', 'agendamento', 'entrega', 'entregue'].includes(o.etapa)
    ).length
    return {
      recebido: recebidoHoje,
      osPagas: pagasHoje,
      osAbertas: dados.osAbertas,
      emRota,
      proximas: proximas.slice(0, 3),
    }
  }, [osList, dados.osAbertas, proximas])

  // ─── KPIs operacionais ────────────────────────────────────────────────────
  // Variações com base no mês anterior. `delta == null` = sem base — esconde a
  // pill e deixa só o texto auxiliar.
  const lblAnt = `vs ${dados.labelMesAnt}`
  const kpis = [
    {
      id: 'abertas', label: 'OS abertas', icon: 'ti-clipboard-list',
      valor: dados.osAbertas, corKey: 'blue', formatoCru: true,
      delta: dados.deltaCriadas, deltaLbl: lblAnt,
      deltaTxt: `${dados.naOficina} em oficina · ${dados.aguardPeca} aguard. peça`,
    },
    {
      id: 'atrasadas', label: 'OS atrasadas', icon: 'ti-calendar-x',
      valor: dados.osAtrasadas, corKey: 'red', formatoCru: true,
      deltaTxt: dados.osAtrasadas > 0 ? 'prazo vencido — agir hoje' : 'tudo no prazo',
    },
    {
      id: 'faturamento', label: 'Faturamento do mês', icon: 'ti-cash',
      valor: dados.faturamentoMes, corKey: 'blue',
      delta: dados.deltaPct, deltaLbl: lblAnt,
      spark: dados.spark30d,
    },
    {
      id: 'ticket', label: 'Ticket médio', icon: 'ti-receipt',
      valor: dados.ticketMedio, corKey: 'yellow',
      delta: dados.deltaTicket, deltaLbl: lblAnt,
      deltaTxt: `${dados.osConcluidasMes} OS concluídas`,
    },
  ]

  // ─── Fluxo de caixa anual — placeholder (despesas só vêm no Módulo 07) ────
  // Por enquanto: meses 1–4 com valores ilustrativos + mês atual com receita real.
  // TODO: trocar por dados de `lancamento_financeiro` quando existir.
  const gridColor = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'
  const tickColor = T.textDim
  const chartOpts = () => ({
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: T.card, titleColor: T.textPrimary, bodyColor: T.textSecondary, borderColor: T.border, borderWidth: 1, padding: 9 },
    },
    scales: {
      x: { stacked: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } }, border: { color: 'transparent' } },
      y: { stacked: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 }, callback: v => (v < 0 ? '-R$' + Math.abs(Math.round(v / 1000)) + 'k' : 'R$' + Math.round(v / 1000) + 'k') }, border: { color: 'transparent' } },
    },
  })
  const mesIdx = hojeData.getMonth()
  const recebidoSerie = Array(12).fill(0)
  const pagoSerie = Array(12).fill(0)
  const saldoSerie = Array(12).fill(null)
  recebidoSerie[mesIdx] = dados.faturamentoMes
  if (mesIdx > 0) recebidoSerie[mesIdx - 1] = dados.faturamentoAnt
  saldoSerie[mesIdx] = Math.max(0, dados.faturamentoMes)
  const chartAnualData = {
    labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    datasets: [
      { label: 'Recebido', data: recebidoSerie, backgroundColor: cor(P.blue, P.blueDark), borderRadius: 3, stack: 's' },
      { label: 'Pago',     data: pagoSerie, backgroundColor: cor(P.red, P.redDark), borderRadius: 3, stack: 's' },
      { type: 'line', label: 'Saldo', data: saldoSerie, borderColor: cor(P.blueLight, P.blueLightDark), borderWidth: 1.5, pointBackgroundColor: cor(P.blueLight, P.blueLightDark), pointRadius: 3, tension: 0.4, fill: false },
    ],
  }

  return (
    <div style={{
      padding: '20px 24px 32px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
      fontSize: 14,
    }}>
      {/* Saudação personalizada */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 8,
        fontSize: 15, color: T.textMuted,
      }}>
        <span style={{ fontWeight: 600, color: corHero(dark) }}>
          {saudacao()}, {apelido}
        </span>
        <span style={{ fontSize: 12 }}>
          · {hojeData.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </span>
      </div>

      {/* Hero row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <HeroFaturamento T={T} dark={dark} hero={hero} />
        <HojeSidekick T={T} dark={dark} hoje={hoje} />
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {kpis.map(k => <KPICard key={k.id} k={k} T={T} dark={dark} />)}
      </div>

      <AlertasCriticos T={T} dark={dark} criticos={criticos}
        onAbrirOS={(numero) => navigate(`/os?os=${numero}`)} />


      <PipelineOS T={T} dark={dark} etapas={pipeline} />

      {/* Fluxo de caixa + Paradas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        <Card T={T} dark={dark} radius={14} padding={'18px 20px 14px'} style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionHeader T={T} dark={dark} icon="ti-arrows-exchange" sm>Fluxo de caixa · {hojeData.getFullYear()}</SectionHeader>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: -2, marginBottom: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: corHero(dark), letterSpacing: '-.025em', fontVariantNumeric: 'tabular-nums' }}>
              {fmtBRL(dados.faturamentoMes)}
            </span>
            <span style={{ fontSize: 11, color: T.textMuted }}>recebido em {MESES_CURTO[hojeData.getMonth()]}</span>
          </div>
          <div style={{ position: 'relative', width: '100%', height: 220 }}>
            <Bar data={chartAnualData} options={chartOpts()} />
          </div>
        </Card>
        <ProximasParadasTimeline T={T} dark={dark} paradas={proximas} />
      </div>
    </div>
  )
}
