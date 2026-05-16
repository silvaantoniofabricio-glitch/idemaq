// idemaq-src/pages/Painel.jsx
// Painel principal (desktop) — Hero + KPIs + Críticos + Pipeline + Fluxo + Próximas paradas.
// Usa componentes do design system (idemaq-src/components/painel/*).

import React from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, registerables } from 'chart.js'
import { P } from '../theme'
import { corEtapa, corHero } from '../utils/colors'

import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'

import HeroFaturamento         from '../components/painel/HeroFaturamento'
import HojeSidekick            from '../components/painel/HojeSidekick'
import KPICard                 from '../components/painel/KPICard'
import PipelineOS              from '../components/painel/PipelineOS'
import AlertasCriticos         from '../components/painel/AlertasCriticos'
import ProximasParadasTimeline from '../components/painel/ProximasParadasTimeline'

ChartJS.register(...registerables)

export default function Painel({ T, dark }) {
  const cor = (d, c) => dark ? d : c

  // — Dados do Hero —
  const hero = {
    mesLabel:  'Maio 2026',
    atual:     14260,
    meta:      20000,
    deltaPct:  12,
    hojeLabel: '14/mai',
    spark30d:  [320,580,240,0,0,1180,460,720,380,0,0,950,540,1620,880,1240,0,0,720,660,1490,520,0,0,1280,940,1840,1320],
  }

  // — Dados do Hoje sidekick —
  const hoje = {
    recebido: 1240,
    osPagas: 3,
    osAbertas: 14,
    emRota: 5,
    proximas: [
      { hr:'08:30', tipo:'urgente', cliente:'Ana Reis',     svc:'Diagnóstico' },
      { hr:'10:00', tipo:'hoje',    cliente:'João Costa',   svc:'Manutenção'  },
      { hr:'14:00', tipo:'hoje',    cliente:'Maria Silva',  svc:'Limpeza'     },
    ],
  }

  // — KPIs com sparklines —
  const kpis = [
    { id:'saldo',   label:'Saldo líquido',   valor:4420,  corKey:'blue',      delta:8, deltaLbl:'vs abr',     icon:'ti-wallet',
      spark:[3100,3450,3200,3680,3950,4100,3880,4250,4180,4420] },
    { id:'receber', label:'A receber',       valor:6820,  corKey:'yellow',    deltaTxt:'7 OS abertas', sub:'R$ 535 vencido', icon:'ti-arrow-down-right',
      spark:[5400,5100,5800,6200,5900,6400,6100,6500,6700,6820] },
    { id:'pagar',   label:'A pagar',         valor:2090,  corKey:'red',       deltaTxt:'2 vencimentos', sub:'Vence em 2d', icon:'ti-arrow-up-right',
      spark:[1200,1800,1500,2400,1900,2100,2300,1700,2000,2090] },
    { id:'oficina', label:'Máq. na oficina', valor:18,    corKey:'yellow',    deltaTxt:'14 OS · 4 venda', formatoCru:true, icon:'ti-building-warehouse',
      spark:[12,14,13,16,17,15,18,19,17,18] },
  ]

  // — Banner críticos —
  const criticos = [
    { icon:'ti-package-off',    msg:'Rolamento do cesto',  sub:'Esgotado · 14 saídas/mês',     acao:'Pedir' },
    { icon:'ti-alert-triangle', msg:'OS #1037 · J. Costa', sub:'Parada em diagnóstico há 31h', acao:'Abrir' },
    { icon:'ti-calendar-x',     msg:'OS #1036 · Ana Reis', sub:'Prazo atrasado em 2 dias',     acao:'Abrir' },
  ]

  // — Pipeline OS —
  const pipeline = [
    { id:'ag_agenda', label:'Ag. agenda',   n:2, corKey:'neutro' },
    { id:'agendado',  label:'Agendado',     n:3, corKey:'neutro' },
    { id:'recebido',  label:'Recebido',     n:0, corKey:'neutro' },
    { id:'diagnos',   label:'Diagnóstico',  n:2, corKey:'yellow' },
    { id:'orcam',     label:'Orçamento',    n:2, corKey:'red' },
    { id:'oficina',   label:'Em oficina',   n:2, corKey:'blueLight' },
    { id:'teste',     label:'Teste final',  n:1, corKey:'blue' },
    { id:'entrega',   label:'Entregas',     n:2, corKey:'blue' },
  ]

  // — Próximas paradas —
  const proximas = [
    { hr:'08:30', dt:'hoje',   tipo:'urgente', cliente:'Ana Reis',     ini:'AR', svc:'Diagnóstico', equip:'Lavadora LG 12kg',       os:'#1036' },
    { hr:'10:00', dt:'hoje',   tipo:'hoje',    cliente:'João Costa',   ini:'JC', svc:'Manutenção',  equip:'Geladeira Consul',        os:'#1037' },
    { hr:'14:00', dt:'hoje',   tipo:'hoje',    cliente:'Maria Silva',  ini:'MS', svc:'Limpeza',     equip:'Fogão Brastemp',          os:'#1040' },
    { hr:'16:30', dt:'hoje',   tipo:'hoje',    cliente:'Bianca Souza', ini:'BS', svc:'Entrega',     equip:'Lavadora LG 14kg',        os:'#1042' },
    { hr:'09:00', dt:'amanhã', tipo:'proximo', cliente:'Carlos Lima',  ini:'CL', svc:'Orçamento',   equip:'Micro-ondas Electrolux',  os:'#1039' },
  ]

  // — Chart.js Fluxo de Caixa anual —
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
  const chartAnualData = {
    labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
    datasets: [
      { label: 'Recebido', data: [18000,12000,15000,9000,14260,0,0,0,0,0,0,0], backgroundColor: cor(P.blue, P.blueDark), borderRadius: 3, stack: 's' },
      { label: 'Pago',     data: [-12000,-9000,-11000,-7000,-9840,0,0,0,0,0,0,0], backgroundColor: cor(P.red, P.redDark), borderRadius: 3, stack: 's' },
      { type: 'line', label: 'Saldo', data: [6000,9000,13000,15000,19420,null,null,null,null,null,null,null], borderColor: cor(P.blueLight, P.blueLightDark), borderWidth: 1.5, pointBackgroundColor: cor(P.blueLight, P.blueLightDark), pointRadius: 3, tension: 0.4, fill: false },
    ],
  }

  return (
    <div style={{
      padding: '20px 24px 32px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
      fontSize: 14,
    }}>
      {/* Hero row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <HeroFaturamento T={T} dark={dark} hero={hero} />
        <HojeSidekick T={T} dark={dark} hoje={hoje} />
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {kpis.map(k => <KPICard key={k.id} k={k} T={T} dark={dark} />)}
      </div>

      <AlertasCriticos T={T} dark={dark} criticos={criticos} />

      <PipelineOS T={T} dark={dark} etapas={pipeline} />

      {/* Fluxo de caixa + Paradas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        <Card T={T} dark={dark} radius={14} padding={'18px 20px 14px'} style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionHeader T={T} dark={dark} icon="ti-arrows-exchange" sm>Fluxo de caixa · 2026</SectionHeader>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: -2, marginBottom: 8 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: corHero(dark), letterSpacing: '-.025em', fontVariantNumeric: 'tabular-nums' }}>R$ 68.260</span>
            <span style={{ fontSize: 11, color: T.textMuted }}>recebido em 2026 até mai</span>
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
