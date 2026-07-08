// idemaq-src/pages/Relatorios.jsx
// Tela de Relatórios — hub + 7 relatórios (Ponto incluso, dados reais).
//
// 4 relatórios reais (Geral / OS Operacional / Estoque / Vendas): consomem
// hooks de `useRelatorios.js` que agregam Supabase no JS.
// 2 com IA (DRE / Funcionários): ainda mock — dependem da edge function do
// Claude API + (no caso do DRE) do schema parte 2 (`lancamento_financeiro`).
// Visível só pro dono — rota `/relatorios` envolvida em <AdminOnly> no App.jsx.

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL } from '../utils/fmt'
import { CATEGORIA_POR_ID } from '../utils/categoriasPeca'
import {
  Card, Button, Badge,
  EmptyState,
  Sparkline, DeltaPill,
  useToast, ModuleHeader,
} from '../components/ui'
import RelatorioPonto from './relatorios/RelatorioPonto'
import RelatorioFinanceiroMensal from './relatorios/RelatorioFinanceiroMensal'
import {
  useRelatorioGeral,
  useRelatorioOperacional,
  useRelatorioEstoque,
  useRelatorioVendas,
  useRelatorioDRE,
  useRelatorioFuncionarios,
  fmtDuracao,
} from '../hooks/useRelatorios'
import { useRelatorioIA } from '../hooks/useRelatorioIA'
import { usePontuacao } from '../hooks/usePontuacao'
import { useRelatorioQualidade } from '../hooks/useRelatorioQualidade'
import { useAlertasPontuacao } from '../hooks/useAlertasPontuacao'
import { LABEL_SERVICO } from '../utils/pontuacao'
import { AtlPanel, ATL_FONT } from '../components/osDetalhe/acoes/_AtlassianUI'

// === Catálogo dos relatórios ===
const RELATORIOS = [
  { id:'finmensal',    label:'Relatório Financeiro', tab:'Fin. Mensal',   icon:'ti-report-money',   desc:'Receitas, despesas, fluxo e comparativo do mês', cor:'blue' },
  { id:'geral',        label:'Geral',                tab:'Geral',         icon:'ti-chart-arcs',     desc:'Visão consolidada do negócio', cor:'blue' },
  { id:'operacional',  label:'OS Operacional',       tab:'Operacional',   icon:'ti-clipboard-list', desc:'Tempos por etapa, gargalos, retrabalho', cor:'blue' },
  { id:'estoque',      label:'Estoque',              tab:'Estoque',       icon:'ti-package',        desc:'Giro, paradas, projeção', cor:'blue' },
  { id:'vendas',       label:'Vendas',               tab:'Vendas',        icon:'ti-shopping-cart',  desc:'Funil, ticket médio, conversão', cor:'blue' },
  { id:'financeiro',   label:'Financeiro (DRE)',      tab:'DRE',          icon:'ti-cash-banknote',  desc:'DRE + análise com IA', cor:'blue', ia:true },
  { id:'funcionarios', label:'Funcionários',          tab:'Funcionários', icon:'ti-users',          desc:'Performance individual + IA', cor:'blue', ia:true },
  { id:'ponto',        label:'Ponto',                tab:'Ponto',         icon:'ti-clock',          desc:'Horas trabalhadas, faltas, banco de horas', cor:'blue' },
]

// Flag de deploy da edge function `relatorio-ia`.
// Enquanto `false`: o botão "Gerar análise" fica oculto e InsightIA mostra "Em breve".
// Flipar pra `true` depois de:
//   supabase functions deploy relatorio-ia --no-verify-jwt
//   supabase secrets set ANTHROPIC_API_KEY=...
// Antes do flip o invoke trava ~25-30s no timeout do Supabase Functions, então mantemos
// off de propósito (Toni reportou esse freeze em prod).
const IA_DEPLOYED = false

const MESES_PT   = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
const MESES_NOME = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function labelPeriodo(p) {
  if (p.id === 'sel_period') {
    const f = s => s ? s.split('-').reverse().join('/') : '...'
    return `${f(p.de)} → ${f(p.ate)}`
  }
  if (p.id === 'sel_mes' && p.ano != null) return `${MESES_NOME[p.mes]} ${p.ano}`
  if (p.id === 'mes_ant') return 'Mês passado'
  return 'Mês atual'
}

function computeRangeFromPeriodo(p) {
  function isoStart(d) { const x = new Date(d); x.setHours(0,0,0,0); return x.toISOString() }
  function isoEnd(d)   { const x = new Date(d); x.setHours(23,59,59,999); return x.toISOString() }
  const hoje = new Date()
  if (p.id === 'mes') {
    return { iniIso: isoStart(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fimIso: isoEnd(hoje) }
  }
  if (p.id === 'mes_ant') {
    return {
      iniIso: isoStart(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
      fimIso: isoEnd(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
    }
  }
  if (p.id === 'sel_mes' && p.ano != null) {
    return {
      iniIso: isoStart(new Date(p.ano, p.mes, 1)),
      fimIso: isoEnd(new Date(p.ano, p.mes + 1, 0)),
    }
  }
  if (p.id === 'sel_period') {
    const ini = p.de  ? new Date(p.de  + 'T00:00:00') : new Date(2000, 0, 1)
    const fim = p.ate ? new Date(p.ate + 'T00:00:00') : hoje
    return { iniIso: isoStart(ini), fimIso: isoEnd(fim) }
  }
  return { iniIso: isoStart(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fimIso: isoEnd(hoje) }
}

function inputDate(T) {
  return {
    padding: '6px 8px', fontSize: 12, borderRadius: 6,
    border: `1px solid ${T.border}`, background: T.card, color: T.textPrimary,
    fontFamily: 'inherit', flex: 1, outline: 'none',
  }
}

// ─── StatBadge local ─────────────────────────────────────────────────────────
function StatBadge({ v, label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 12 }}>
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
      <span style={{ color, opacity: .75 }}>{label}</span>
    </span>
  )
}

// === Página ===
export default function Relatorios({ T, dark }) {
  const notify = useToast()
  const [relAtivo, setRelAtivo] = useState('finmensal')
  const [periodo, setPeriodo] = useState({ id: 'mes' })
  const [periodoAberto, setPeriodoAberto] = useState(false)
  const periodoRef = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (periodoRef.current && !periodoRef.current.contains(e.target)) setPeriodoAberto(false)
    }
    if (periodoAberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [periodoAberto])

  const { iniIso, fimIso } = useMemo(() => computeRangeFromPeriodo(periodo), [periodo])

  function placeholder(msg) { notify('info', msg || 'Em breve') }

  const azul    = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const azulBg  = dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb'
  const relInfo = RELATORIOS.find(r => r.id === relAtivo)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minHeight: 0, overflow: 'hidden', background: T.bg,
    }}>

      <ModuleHeader
        T={T} dark={dark}
        icon="ti-chart-arcs"
        title="Relatórios"
        stats={[
          { v: 8, label: 'relatórios', color: azul },
          { v: 2, label: 'com IA', color: azulClaro },
        ]}
        tabs={RELATORIOS.map(r => ({ id: r.id, label: r.tab, icon: r.icon, ia: r.ia }))}
        activeTab={relAtivo}
        onTabChange={setRelAtivo}
        secondaryActions={[{ label: 'Exportar', icon: 'ti-file-export', onClick: () => placeholder('Export PDF/Excel em breve') }]}
        filterSlot={
          <div ref={periodoRef} style={{ position: 'relative' }}>
            <button onClick={() => setPeriodoAberto(o => !o)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0 8px', height: 22, borderRadius: 4,
                border: `1px solid ${T.border}`,
                background: dark ? 'rgba(255,255,255,0.04)' : T.card,
                color: T.textSecondary,
                fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                minWidth: 130,
              }}>
              <i className="ti ti-calendar" style={{ fontSize: 12, color: azul }} aria-hidden="true" />
              <span style={{ flex: 1, textAlign: 'left' }}>{labelPeriodo(periodo)}</span>
              <i className={`ti ${periodoAberto ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 10, color: T.textMuted }} aria-hidden="true" />
            </button>
            {periodoAberto && (
              <DropdownPeriodo T={T} dark={dark} periodo={periodo} setPeriodo={setPeriodo}
                onClose={() => setPeriodoAberto(false)} />
            )}
          </div>
        }
      />

      {/* ══════════════════════════════════════════════════
          CONTENT
      ══════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {relAtivo === 'finmensal'    && <RelatorioFinanceiroMensal T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'geral'        && <RelatorioGeral        T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'operacional'  && <RelatorioOperacional  T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'estoque'      && <RelatorioEstoque      T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'vendas'       && <RelatorioVendas       T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'financeiro'   && <RelatorioFinanceiro   T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'funcionarios' && <RelatorioFuncionarios T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'ponto'        && <RelatorioPonto        T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
        </div>
      </div>
    </div>
  )
}

// ─── DropdownPeriodo ─────────────────────────────────────────────────────────
function DropdownPeriodo({ T, dark, periodo, setPeriodo, onClose }) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c
  const hoje = new Date()
  const [selMesAno, setSelMesAno] = useState(
    periodo.id === 'sel_mes' && periodo.ano != null
      ? { ano: periodo.ano, mes: periodo.mes }
      : { ano: hoje.getFullYear(), mes: hoje.getMonth() }
  )

  const itemStyle = (ativo) => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 10px', borderRadius: 6, border: 'none',
    background: ativo ? cor('#0d2035', '#e6f1fb') : 'transparent',
    color: ativo ? azul : T.textSecondary,
    fontSize: 12.5, fontWeight: ativo ? 700 : 500,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
  })

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
      minWidth: 270,
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
      padding: 8,
    }}>
      <button style={itemStyle(periodo.id === 'mes')}
        onClick={() => { setPeriodo({ id: 'mes' }); onClose() }}>
        {periodo.id === 'mes' ? <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" /> : <span style={{ width: 13 }} />}
        Mês atual
      </button>

      <button style={itemStyle(periodo.id === 'mes_ant')}
        onClick={() => { setPeriodo({ id: 'mes_ant' }); onClose() }}>
        {periodo.id === 'mes_ant' ? <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" /> : <span style={{ width: 13 }} />}
        Mês passado
      </button>

      <button style={itemStyle(periodo.id === 'sel_mes')}
        onClick={() => setPeriodo(p => p.id === 'sel_mes' ? p : { id: 'sel_mes', ano: selMesAno.ano, mes: selMesAno.mes })}>
        {periodo.id === 'sel_mes' ? <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" /> : <span style={{ width: 13 }} />}
        Selecionar mês
        <i className={`ti ti-chevron-${periodo.id === 'sel_mes' ? 'up' : 'down'}`} style={{ fontSize: 12, marginLeft: 'auto', color: T.textMuted }} aria-hidden="true" />
      </button>

      {periodo.id === 'sel_mes' && (
        <div style={{ padding: '6px 10px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => {
            const novo = selMesAno.mes === 0 ? { ano: selMesAno.ano - 1, mes: 11 } : { ano: selMesAno.ano, mes: selMesAno.mes - 1 }
            setSelMesAno(novo); setPeriodo({ id: 'sel_mes', ...novo })
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 2 }}>
            <i className="ti ti-chevron-left" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: T.textPrimary }}>
            {MESES_NOME[selMesAno.mes]} {selMesAno.ano}
          </span>
          <button onClick={() => {
            const novo = selMesAno.mes === 11 ? { ano: selMesAno.ano + 1, mes: 0 } : { ano: selMesAno.ano, mes: selMesAno.mes + 1 }
            setSelMesAno(novo); setPeriodo({ id: 'sel_mes', ...novo })
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 2 }}>
            <i className="ti ti-chevron-right" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
          <button onClick={onClose}
            style={{ background: azul, border: 'none', cursor: 'pointer', color: '#fff', padding: '3px 10px', borderRadius: 5, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            OK
          </button>
        </div>
      )}

      <button style={itemStyle(periodo.id === 'sel_period')}
        onClick={() => setPeriodo(p => p.id === 'sel_period' ? p : { id: 'sel_period', de: '', ate: '' })}>
        {periodo.id === 'sel_period' ? <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" /> : <span style={{ width: 13 }} />}
        Selecionar período
        <i className={`ti ti-chevron-${periodo.id === 'sel_period' ? 'up' : 'down'}`} style={{ fontSize: 12, marginLeft: 'auto', color: T.textMuted }} aria-hidden="true" />
      </button>

      {periodo.id === 'sel_period' && (
        <div style={{ padding: '4px 8px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.textMuted, minWidth: 24 }}>De</span>
            <input type="date" value={periodo.de || ''} onChange={e => setPeriodo({ id: 'sel_period', de: e.target.value, ate: periodo.ate })}
              style={inputDate(T)} />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.textMuted, minWidth: 24 }}>Até</span>
            <input type="date" value={periodo.ate || ''} onChange={e => setPeriodo({ id: 'sel_period', de: periodo.de, ate: e.target.value })}
              style={inputDate(T)} />
          </div>
          {periodo.de && periodo.ate && (
            <button onClick={onClose}
              style={{ alignSelf: 'flex-end', background: azul, border: 'none', cursor: 'pointer', color: '#fff', padding: '3px 12px', borderRadius: 5, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              OK
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Cabeçalho de seção inline (substitui SectionHeader do ui/)
function SecHeader({ T, icon, cor, mb = 14, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, marginBottom: mb,
      fontSize: 11, fontWeight: 700, color: T.textMuted,
      textTransform: 'uppercase', letterSpacing: '.04em',
    }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 14, color: cor }} aria-hidden="true" />}
      {children}
    </div>
  )
}

// =============================================================================
// HUB
// =============================================================================
function RelatoriosHub({ T, dark, onAbrir }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 12,
    }}>
      {RELATORIOS.map(r => (
        <Card key={r.id} T={T} dark={dark} hover accent={azul}
          onClick={() => onAbrir(r.id)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 11,
              background: bgEtapa('blue', dark),
              border: `1px solid ${azul}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={`ti ${r.icon}`} style={{ fontSize: 22, color: azul }} aria-hidden="true" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 14, fontWeight: 700, color: corHero(dark),
                marginBottom: 4,
              }}>
                {r.label}
                {r.ia && (
                  <Badge variant="azulClaro" dark={dark} sm>
                    <i className="ti ti-sparkles" aria-hidden="true" /> IA
                  </Badge>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.4 }}>
                {r.desc}
              </div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 18, color: T.textDim }} aria-hidden="true" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// =============================================================================
// GERAL — dados reais
// =============================================================================
function RelatorioGeral({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const amarelo = corEtapa('yellow', dark)
  const { data, loading, error } = useRelatorioGeral({ iniIso, fimIso })

  if (loading) return <RelatorioLoading T={T} />
  if (error)   return <RelatorioErro    T={T} dark={dark} msg={error} />
  if (!data)   return null

  const tipoCores = { atendimento: azul, fabricacao: amarelo, venda: azulClaro }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}>
        <KPI T={T} dark={dark} label="Faturamento" valor={fmtBRL(data.faturamento)} cor={azul}
          sparkData={data.sparkFat} sparkCor={azul} icon="ti-cash" />
        <KPI T={T} dark={dark} label="OS concluídas" valor={data.osConcluidas} cor={corHero(dark)}
          sparkData={data.sparkOS} sparkCor={azulClaro} icon="ti-clipboard-list" />
        <KPI T={T} dark={dark} label="Ticket médio" valor={fmtBRL(data.ticketMedio)} cor={corHero(dark)}
          icon="ti-receipt" />
        <KPI T={T} dark={dark} label="OS abertas no período" valor={data.totalAbertas} cor={azul}
          icon="ti-folder-plus" />
      </div>

      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-chart-bar" cor={azul}>
          Distribuição por tipo de OS
        </SecHeader>
        {data.totalDistribuicao > 0 ? (
          <BarrasCategoria T={T} dark={dark}
            dados={data.porTipo.map(t => ({ label: t.label, valor: t.valor, cor: tipoCores[t.id] || azul }))}
            total={data.totalDistribuicao}
          />
        ) : (
          <EmptyState T={T} compact icon="ti-chart-bar"
            title="Sem OS abertas neste período"
            description="Ajuste o filtro acima pra ver outro intervalo." />
        )}
      </Card>

      <InsightIA T={T} dark={dark} disponivel={false} />
    </div>
  )
}

// =============================================================================
// OS OPERACIONAL — dados reais
// =============================================================================
function RelatorioOperacional({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const { data, loading, error } = useRelatorioOperacional({ iniIso, fimIso })

  if (loading) return <RelatorioLoading T={T} />
  if (error)   return <RelatorioErro    T={T} dark={dark} msg={error} />
  if (!data)   return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Lead time médio" valor={fmtDuracao(data.leadTimeSegs)} cor={azul}
          icon="ti-clock" />
        <KPI T={T} dark={dark} label="OS concluídas" valor={data.osConcluidas} cor={corHero(dark)}
          icon="ti-circle-check" />
        <KPI T={T} dark={dark} label="Recusadas" valor={data.osRecusadas} cor={amarelo}
          icon="ti-x" />
        <KPI T={T} dark={dark} label="Retrabalho (garantia)" valor={`${data.pctRetrabalho}%`} cor={vermelho}
          icon="ti-rotate-clockwise" />
      </div>

      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-hourglass" cor={azul}>
          Tempo médio por etapa
        </SecHeader>
        {data.tempoMedioPorEtapa.length > 0 ? (
          <BarrasHorizontais T={T} dark={dark} dados={data.tempoMedioPorEtapa} />
        ) : (
          <EmptyState T={T} compact icon="ti-hourglass"
            title="Sem movimentações no período"
            description="OS precisam mudar de etapa pra gerar este dado." />
        )}
      </Card>

      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-alert-triangle" cor={azul}>
          Gargalos identificados
        </SecHeader>
        {data.gargalos.length > 0 ? (
          <ListaSimples T={T} dark={dark} itens={data.gargalos} />
        ) : (
          <EmptyState T={T} compact icon="ti-alert-triangle"
            title="Sem gargalos detectados"
            description="Volume insuficiente no período pra identificar pontos críticos." />
        )}
      </Card>
    </div>
  )
}

// =============================================================================
// ESTOQUE — dados reais
// =============================================================================
function RelatorioEstoque({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const { data, loading, error } = useRelatorioEstoque({ iniIso, fimIso })

  if (loading) return <RelatorioLoading T={T} />
  if (error)   return <RelatorioErro    T={T} dark={dark} msg={error} />
  if (!data)   return null

  const CLASSE_ABC_INFO = {
    A: { cor: vermelho,  desc: 'Poucos SKUs concentram a maior parte do capital — priorize contagem e controle.' },
    B: { cor: amarelo,   desc: 'Relevância intermediária — revisão periódica basta.' },
    C: { cor: azulClaro, desc: 'Muitos SKUs, pouco capital — controle simplificado.' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Itens em estoque" valor={data.totalItens} cor={corHero(dark)}
          icon="ti-package" />
        <KPI T={T} dark={dark} label="Valor parado" valor={fmtBRL(data.valorParado)} cor={azul}
          icon="ti-cash" />
        <KPI T={T} dark={dark} label="Estoque baixo" valor={data.estoqueBaixo} cor={amarelo}
          icon="ti-alert-triangle" />
        <KPI T={T} dark={dark} label="Ruptura (zerado)" valor={data.estoqueZerado} cor={vermelho}
          icon="ti-alert-octagon" />
        <KPI T={T} dark={dark} label="Giro no período" valor={`${data.giroEstoquePct}%`} cor={azulClaro}
          icon="ti-refresh" />
        <KPI T={T} dark={dark} label="SKUs ativos" valor={data.totalSkus} cor={azul}
          icon="ti-tag" />
      </div>

      {data.sugestaoReposicao.length > 0 && (
        <Card T={T} dark={dark} padding={0}>
          <div style={{ padding: '12px 16px 10px' }}>
            <SecHeader T={T} icon="ti-shopping-cart-plus" cor={azul} mb={0}>
              Sugestão de reposição
            </SecHeader>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 70px 70px 90px 110px',
            gap: 10, padding: '8px 16px',
            borderTop: `1px solid ${T.border}`,
            background: T.cardAlt,
            fontSize: 10.5, color: T.textMuted, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            <div>Item</div>
            <div style={{ textAlign: 'right' }}>Atual</div>
            <div style={{ textAlign: 'right' }}>Mínimo</div>
            <div style={{ textAlign: 'right' }}>Comprar</div>
            <div style={{ textAlign: 'right' }}>Custo est.</div>
          </div>
          {data.sugestaoReposicao.map((r, idx) => (
            <div key={idx} style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 70px 70px 90px 110px',
              gap: 10, alignItems: 'center',
              padding: '10px 16px',
              borderTop: `1px solid ${T.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: corHero(dark), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.nome}
                </span>
                {r.zerado && <Badge variant="vermelho" dark={dark} sm>Zerado</Badge>}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: r.zerado ? vermelho : amarelo, fontWeight: 700 }}>
                {r.atual}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: T.textMuted }}>
                {r.minima}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: azul, fontWeight: 700 }}>
                +{r.sugestaoQtd}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12.5, fontVariantNumeric: 'tabular-nums', color: T.textSecondary }}>
                {fmtBRL(r.custoEstimado)}
              </div>
            </div>
          ))}
        </Card>
      )}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <Card T={T} dark={dark}>
          <SecHeader T={T} icon="ti-chart-pie" cor={azul}>
            Curva ABC — concentração de capital
          </SecHeader>
          {data.skusAtivos > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.curvaABC.map(c => (
                <div key={c.classe}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Badge dark={dark} sm
                        color={CLASSE_ABC_INFO[c.classe].cor}
                        bg={`${CLASSE_ABC_INFO[c.classe].cor}22`}
                        border={`${CLASSE_ABC_INFO[c.classe].cor}44`}>
                        Classe {c.classe}
                      </Badge>
                      <span style={{ color: T.textMuted }}>{c.skus} SKU{c.skus === 1 ? '' : 's'}</span>
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: corHero(dark), fontWeight: 700 }}>
                      {fmtBRL(c.valor)} <span style={{ color: T.textMuted, fontWeight: 400 }}>· {c.pctValor}%</span>
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 8, borderRadius: 5, background: T.cardAlt, overflow: 'hidden' }}>
                    <div style={{ width: `${c.pctValor}%`, height: '100%', background: CLASSE_ABC_INFO[c.classe].cor, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 3 }}>{CLASSE_ABC_INFO[c.classe].desc}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState T={T} compact icon="ti-chart-pie"
              title="Sem SKUs com saldo"
              description="A curva ABC precisa de itens com estoque atual > 0." />
          )}
        </Card>

        <Card T={T} dark={dark}>
          <SecHeader T={T} icon="ti-category" cor={azul}>
            Valor parado por categoria
          </SecHeader>
          {data.valorPorCategoria.length > 0 ? (
            <BarrasValorBRL T={T} dark={dark} cor={azul}
              dados={data.valorPorCategoria.map(c => ({
                label: CATEGORIA_POR_ID[c.categoria]?.label || c.categoria,
                valor: c.valor,
              }))}
            />
          ) : (
            <EmptyState T={T} compact icon="ti-category"
              title="Sem valor parado por categoria"
              description="Cadastre custo nas peças pra esta seção calcular." />
          )}
        </Card>
      </div>

      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-trending-up" cor={azul}>
          Peças mais usadas no período
        </SecHeader>
        {data.pecasMaisUsadas.length > 0 ? (
          <BarrasHorizontais T={T} dark={dark} dados={data.pecasMaisUsadas} />
        ) : (
          <EmptyState T={T} compact icon="ti-package"
            title="Sem consumo registrado no período"
            description="Itens consumidos em OS aparecem aqui — verifique se o período cobre OS com peças baixadas." />
        )}
      </Card>

      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-alert-octagon" cor={azul}>
          Peças paradas (sem giro no período)
        </SecHeader>
        {data.pecasParadas.length > 0 ? (
          <ListaSimples T={T} dark={dark} itens={data.pecasParadas.map(p => ({
            titulo: p.nome,
            detalhe: `${p.qtd} un em estoque · capital parado ${fmtBRL(p.custoTotal)}`,
            badge: p.qtd > 5 ? 'Alto' : 'Médio',
            badgeVar: p.qtd > 5 ? 'amarelo' : 'azul',
          }))} />
        ) : (
          <EmptyState T={T} compact icon="ti-circle-check"
            title="Sem peças paradas"
            description={data.temConsumo
              ? 'Todas as peças com saldo tiveram movimentação.'
              : 'Sem consumo no período — abra um período maior pra avaliar.'} />
        )}
      </Card>

      {data.movimentacoes && (
        <Card T={T} dark={dark}>
          <SecHeader T={T} icon="ti-arrows-exchange" cor={azul}>
            Movimentações de estoque no período
          </SecHeader>
          <div style={{
            display: 'grid', gap: 10,
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            marginBottom: data.movimentacoes.porTipo.length > 0 ? 12 : 0,
          }}>
            <StatBadge v={`+${data.movimentacoes.totalEntradasUn}`} label="un. entraram" color={azul} />
            <StatBadge v={`-${data.movimentacoes.totalSaidasUn}`} label="un. saíram" color={amarelo} />
            <StatBadge v={data.movimentacoes.qtdMovimentacoes} label="movimentações" color={corHero(dark)} />
          </div>
          {data.movimentacoes.porTipo.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {data.movimentacoes.porTipo.map(t => (
                <Badge key={t.tipo} variant="neutro" dark={dark} sm>
                  {LABEL_TIPO_MOV[t.tipo] || t.tipo} · {t.n}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

const LABEL_TIPO_MOV = {
  baixa_os: 'Baixa por OS',
  ajuste_manual: 'Ajuste manual',
  entrada_compra: 'Entrada/compra',
  devolucao: 'Devolução',
}

// =============================================================================
// VENDAS — dados reais
// =============================================================================
function RelatorioVendas({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const { data, loading, error } = useRelatorioVendas({ iniIso, fimIso })

  if (loading) return <RelatorioLoading T={T} />
  if (error)   return <RelatorioErro    T={T} dark={dark} msg={error} />
  if (!data)   return null

  const coresTipo = { servico: azul, peca: azulClaro }
  const totalCat = data.servicosMaisVendidos.reduce((s, r) => s + r.valor, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Conversão orçamento" valor={`${data.conversaoOrcamento}%`} cor={azul}
          icon="ti-target-arrow" />
        <KPI T={T} dark={dark} label="Ticket médio" valor={fmtBRL(data.ticketMedio)} cor={corHero(dark)}
          icon="ti-receipt" />
        <KPI T={T} dark={dark} label="Máquinas vendidas" valor={data.maquinasVendidas} cor={corHero(dark)}
          icon="ti-device-washing-machine" />
        <KPI T={T} dark={dark} label="Receita máquinas" valor={fmtBRL(data.receitaMaquinas)} cor={azul}
          icon="ti-cash" />
      </div>

      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-funnel" cor={azul}>
          Funil de OS
        </SecHeader>
        {data.totalAbertas > 0 ? (
          <BarrasHorizontais T={T} dark={dark} dados={data.funil} />
        ) : (
          <EmptyState T={T} compact icon="ti-funnel"
            title="Sem OS abertas no período"
            description="Ajuste o filtro pra ver o funil." />
        )}
      </Card>

      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-star" cor={azul}>
          Itens mais vendidos no período
        </SecHeader>
        {data.servicosMaisVendidos.length > 0 ? (
          <BarrasCategoria T={T} dark={dark}
            dados={data.servicosMaisVendidos.map(r => ({
              label: r.label,
              valor: r.valor,
              cor: coresTipo[r.tipo] || amarelo,
            }))}
            total={totalCat}
          />
        ) : (
          <EmptyState T={T} compact icon="ti-receipt"
            title="Sem itens vendidos no período"
            description="Itens de serviço ou peça em OS criadas no período aparecem aqui." />
        )}
      </Card>
    </div>
  )
}

// =============================================================================
// FINANCEIRO (DRE) — dados reais (lancamento_financeiro)
// Regime de caixa: receitas/despesas pagas no período (pago_em). Lançamentos
// abertos (vencidos ou futuros) NÃO entram no DRE — eles vivem em A Receber/
// A Pagar do módulo Financeiro.
// =============================================================================
function RelatorioFinanceiro({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const { data, loading, error } = useRelatorioDRE({ iniIso, fimIso })
  const { markdown, loading: loadingIA, error: errorIA, gerar } = useRelatorioIA()

  if (loading) return <RelatorioLoading T={T} />
  if (error)   return <RelatorioErro    T={T} dark={dark} msg={error} />
  if (!data)   return null

  const { receitas, despesas, lucro, margem, receitasDetalhe, despesasDetalhe } = data
  const meta = 20000 // TODO Módulo 09: ler da tabela `configuracoes`

  // Monta as linhas do DRE com base nas categorias agregadas
  const linhasDRE = [
    ...receitasDetalhe.map(r => ({ label: `Receita — ${r.categoria}`, valor: r.valor, tipo: 'receita' })),
    { label: 'Subtotal receitas', valor: receitas, tipo: 'subtotal' },
    ...despesasDetalhe.map(d => ({ label: `Despesa — ${d.categoria}`, valor: -d.valor, tipo: 'despesa' })),
    { label: 'Subtotal despesas', valor: -despesas, tipo: 'subtotal' },
    { label: 'Lucro líquido', valor: lucro, tipo: 'total' },
  ]

  // Payload pra IA — categorias agregadas + meta
  const dadosIA = {
    periodo: { ini: iniIso, fim: fimIso },
    receitas, despesas, lucro, margem,
    receitasDetalhe: Object.fromEntries(receitasDetalhe.map(r => [r.categoria, r.valor])),
    despesasDetalhe: Object.fromEntries(despesasDetalhe.map(d => [d.categoria, d.valor])),
    totalLancamentos: data.totalLancamentos,
    meta,
  }

  const semDados = data.totalLancamentos === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Receita (regime caixa)" valor={fmtBRL(receitas)} cor={azul}
          icon="ti-arrow-down-circle" />
        <KPI T={T} dark={dark} label="Despesas pagas" valor={fmtBRL(despesas)} cor={amarelo}
          icon="ti-arrow-up-circle" />
        <KPI T={T} dark={dark} label="Lucro líquido" valor={fmtBRL(lucro)} cor={corHero(dark)}
          icon="ti-trending-up" />
        <KPI T={T} dark={dark} label="Margem" valor={`${margem}%`} cor={azul}
          icon="ti-percentage" />
      </div>

      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-file-invoice" cor={azul}>
          DRE simplificado
        </SecHeader>
        {!semDados ? (
          <DRELinhas T={T} dark={dark} linhas={linhasDRE} />
        ) : (
          <EmptyState T={T} compact icon="ti-file-invoice"
            title="Sem lançamentos pagos no período"
            description="DRE usa regime de caixa — só entram lançamentos com pago_em dentro do intervalo. Ajuste o filtro ou registre baixas no Financeiro." />
        )}
      </Card>

      <InsightIA T={T} dark={dark}
        markdown={markdown} loading={loadingIA} error={errorIA}
        onGerar={IA_DEPLOYED && !semDados ? () => gerar('dre', dadosIA) : undefined}
        previewTexto={semDados
          ? 'Sem dados pagos no período — a análise IA vai habilitar quando houver lançamentos baixados.'
          : `A IA vai analisar ${receitasDetalhe.length} categoria(s) de receita e ${despesasDetalhe.length} de despesa — destacando o que puxou pra cima, o que puxou pra baixo e ações pra atingir a meta de R$ 20.000.`} />
    </div>
  )
}

// =============================================================================
// FUNCIONÁRIOS — dados reais (os_historico + usuarios + os + pontuação +
// qualidade). Redesenho Atlassian Design (07/07/2026): 1 card por pessoa
// reunindo performance + pontos + retrabalho/garantia, com comparativo do
// período anterior. Ver contexto-os.md §18/19.
// =============================================================================
function RelatorioFuncionarios({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)

  const { data, loading, error } = useRelatorioFuncionarios({ iniIso, fimIso })
  const { data: pontosData, loading: loadingPontos } = usePontuacao({ iniIso, fimIso })
  const { data: qualidadeData, loading: loadingQualidade } = useRelatorioQualidade({ iniIso, fimIso })
  const { data: alertasData, loading: loadingAlertas } = useAlertasPontuacao({ iniIso, fimIso })
  const { markdown, loading: loadingIA, error: errorIA, gerar } = useRelatorioIA()

  // Período anterior (mesma duração, imediatamente antes) — pra comparativo.
  const { iniAntIso, fimAntIso } = useMemo(() => {
    const ini = new Date(iniIso), fim = new Date(fimIso)
    const dur = fim - ini
    const fimAnt = new Date(ini.getTime() - 1)
    const iniAnt = new Date(fimAnt.getTime() - dur)
    return { iniAntIso: iniAnt.toISOString(), fimAntIso: fimAnt.toISOString() }
  }, [iniIso, fimIso])
  const { data: dataAnt } = useRelatorioFuncionarios({ iniIso: iniAntIso, fimIso: fimAntIso })
  const { data: pontosAnt } = usePontuacao({ iniIso: iniAntIso, fimIso: fimAntIso })

  const loadingGeral = loading || loadingPontos || loadingQualidade
  if (loadingGeral && !data) return <RelatorioLoading T={T} />
  if (error) return <RelatorioErro T={T} dark={dark} msg={error} />
  if (!data) return null

  const equipe = data.equipe || []
  const semDados = equipe.length === 0

  const labelPapel = { dono: 'Dono', logistica: 'Logística', oficina: 'Oficina' }

  const antPorId = Object.fromEntries((dataAnt?.equipe || []).map(f => [f.id, f]))
  const pontosPorId = Object.fromEntries((pontosData?.equipe || []).map(f => [f.funcionario_id, f]))
  const pontosAntPorId = Object.fromEntries((pontosAnt?.equipe || []).map(f => [f.funcionario_id, f]))
  const qualidadePorId = Object.fromEntries((qualidadeData?.equipe || []).map(f => [f.id, f]))

  const totalPontos = pontosData?.totalPontos || 0
  const totalFalhas = qualidadeData?.totalFalhas || 0
  const totalGarantias = qualidadeData?.totalGarantias || 0

  // Líder do período — maior pontuação (só se houver pontos)
  const liderId = Object.values(pontosPorId).sort((a, b) => b.total - a.total)[0]?.funcionario_id || null

  // Payload pra IA — campos legíveis
  const dadosIA = {
    periodo: { ini: iniIso, fim: fimIso },
    totalEtapas: data.totalEtapas,
    totalOSAtendidas: data.totalOSAtendidas,
    totalPontos, totalFalhas, totalGarantias,
    equipe: equipe.map(f => ({
      nome: f.nome,
      papel: f.papel,
      osParticipadas: f.osTotal,
      osFinalizadas: f.osFinalizadas,
      etapasFeitas: f.etapasFeitas,
      tempoMedio: f.tempoMedio,
      faturamento: f.faturamento,
      ticketMedio: f.ticketMedio,
      etapaMaisDemorada: f.etapaMaisDemorada,
      pontos: pontosPorId[f.id]?.total || 0,
      falhasRetrabalho: qualidadePorId[f.id]?.falhas || 0,
      garantias: qualidadePorId[f.id]?.garantias || 0,
    })),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: ATL_FONT }}>

      {/* KPIs topo */}
      <div style={{
        display: 'grid', gap: 10,
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      }}>
        <AtlKpi T={T} dark={dark} icon="ti-users" cor={azul} label="Pessoas ativas" valor={data.totalFuncionarios} />
        <AtlKpi T={T} dark={dark} icon="ti-clipboard-check" cor={azul} label="Etapas registradas" valor={data.totalEtapas} />
        <AtlKpi T={T} dark={dark} icon="ti-clipboard-list" cor={azul} label="OS atendidas" valor={data.totalOSAtendidas} />
        <AtlKpi T={T} dark={dark} icon="ti-trophy" cor={amarelo} label="Pontos no período" valor={totalPontos} />
        <AtlKpi T={T} dark={dark} icon="ti-alert-triangle" cor={totalFalhas > 0 ? vermelho : verde} label="OS c/ retrabalho" valor={totalFalhas} />
        <AtlKpi T={T} dark={dark} icon="ti-shield-check" cor={totalGarantias > 0 ? vermelho : verde} label="OS em garantia" valor={totalGarantias} />
      </div>

      {/* Cards por pessoa */}
      {semDados ? (
        <AtlPanel T={T} dark={dark}>
          <div style={{ padding: '18px 16px' }}>
            <EmptyState T={T} compact icon="ti-users"
              title="Sem atuação registrada no período"
              description="Funcionários aparecem aqui quando movem OS de etapa (registros em os_historico) ou dão check numa etapa da OS." />
          </div>
        </AtlPanel>
      ) : (
        <div style={{
          display: 'grid', gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        }}>
          {equipe.map(f => (
            <PessoaCard key={f.id} T={T} dark={dark}
              f={f}
              ant={antPorId[f.id]}
              pontos={pontosPorId[f.id]}
              pontosAnt={pontosAntPorId[f.id]}
              qualidade={qualidadePorId[f.id]}
              labelPapel={labelPapel}
              lider={liderId === f.id && (pontosPorId[f.id]?.total || 0) > 0}
            />
          ))}
        </div>
      )}

      {!loadingAlertas && alertasData?.alertas?.length > 0 && (
        <AlertasReatribuicao T={T} dark={dark} alertas={alertasData.alertas} />
      )}

      <InsightIA T={T} dark={dark}
        markdown={markdown} loading={loadingIA} error={errorIA}
        onGerar={IA_DEPLOYED && !semDados ? () => gerar('funcionarios', dadosIA) : undefined}
        previewTexto={semDados
          ? 'Sem atuação no período — a análise IA habilita quando houver movimentações em os_historico.'
          : 'A IA vai destacar pontos fortes, gargalos por pessoa e sugestões de treinamento — baseado nos números acima.'} />
    </div>
  )
}

// ─── Alertas de reatribuição — rastro de quando alguém mexeu num check que
// já tinha o carimbo de outra pessoa (07/07/2026, ver useAutorCheck.js). Não
// impede a reatribuição, só deixa visível pro dono revisar se quiser. ────
function AlertasReatribuicao({ T, dark, alertas }) {
  const vermelho = corEtapa('red', dark)
  return (
    <AtlPanel T={T} dark={dark}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 13, color: vermelho }} aria-hidden="true" />
          <span>Alertas de reatribuição</span>
        </div>
      }
      count={alertas.length}>
      {alertas.map((a, i) => (
        <div key={i} style={{
          padding: '10px 14px',
          borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 10, fontFamily: ATL_FONT,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary }}>
              OS #{a.os_numero} · {a.campo}
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              {a.autor_anterior?.apelido} → {a.autor_novo?.apelido}
            </div>
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {a.em ? new Date(a.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
          </div>
        </div>
      ))}
    </AtlPanel>
  )
}

// ─── KPI compacto Atlassian ────────────────────────────────────────────────
function AtlKpi({ T, dark, icon, cor, label, valor }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 4,
      padding: '10px 12px', fontFamily: ATL_FONT,
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 13, color: cor }} aria-hidden="true" />
        <span style={{
          fontSize: 10, fontWeight: 600, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.04em',
        }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </div>
    </div>
  )
}

// ─── Indicador de variação vs período anterior ────────────────────────────
function DeltaTag({ dark, diff, unidade = '' }) {
  if (diff == null || diff === 0) return null
  const subiu = diff > 0
  const cor = subiu ? corEtapa('green', dark) : corEtapa('red', dark)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 1,
      fontSize: 10.5, fontWeight: 700, color: cor,
    }}>
      <i className={`ti ti-arrow-${subiu ? 'up' : 'down'}-right`} style={{ fontSize: 11 }} aria-hidden="true" />
      {Math.abs(diff)}{unidade}
    </span>
  )
}

// ─── Estatística pequena (label + valor) dentro do card da pessoa ─────────
function StatMini({ T, label, valor, dark, diff }) {
  return (
    <div>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.03em',
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 1 }}>
        <span style={{
          fontSize: 15, fontWeight: 700, color: T.textPrimary,
          fontVariantNumeric: 'tabular-nums',
        }}>{valor}</span>
        <DeltaTag dark={dark} diff={diff} />
      </div>
    </div>
  )
}

// ─── Card completo por pessoa — performance + pontos + qualidade ─────────
function PessoaCard({ T, dark, f, ant, pontos, pontosAnt, qualidade, labelPapel, lider }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)

  const totalPontos = pontos?.total || 0
  const totalPontosAnt = pontosAnt?.total ?? null
  const falhas = qualidade?.falhas || 0
  const garantias = qualidade?.garantias || 0
  const semRetrabalho = falhas === 0 && garantias === 0

  return (
    <AtlPanel T={T} dark={dark}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%',
            background: azul + '22', color: azul,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10.5, fontWeight: 800, flexShrink: 0,
          }}>{(f.nome || '?').slice(0, 2).toUpperCase()}</span>
          <span>{f.nome}</span>
          {lider && (
            <i className="ti ti-crown" style={{ fontSize: 13, color: amarelo }}
              aria-hidden="true" title="Líder de pontos no período" />
          )}
        </div>
      }
      action={
        <span style={{
          fontSize: 10, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.04em',
        }}>{labelPapel[f.papel] || f.papel || '—'}</span>
      }>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Pontos — destaque */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 600 }}>Pontos no período</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{
                fontSize: 22, fontWeight: 800, color: amarelo,
                fontVariantNumeric: 'tabular-nums',
              }}>{totalPontos}</span>
              <DeltaTag dark={dark} diff={totalPontosAnt != null ? totalPontos - totalPontosAnt : null} />
            </div>
          </div>
          {pontos && Object.keys(pontos.porServico || {}).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {Object.entries(pontos.porServico).map(([s, pts]) => (
                <span key={s} style={{
                  fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                  background: azul + '1a', color: azul, border: `1px solid ${azul}33`,
                }}>
                  {LABEL_SERVICO[s] || s} · {pts}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Grid de stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          paddingTop: 10, borderTop: `1px solid ${T.border}`,
        }}>
          <StatMini T={T} dark={dark} label="Etapas"
            valor={f.etapasFeitas} diff={ant ? f.etapasFeitas - ant.etapasFeitas : null} />
          <StatMini T={T} dark={dark} label="OS participadas" valor={f.osTotal} />
          <StatMini T={T} dark={dark} label="OS finalizadas" valor={f.osFinalizadas} />
          <StatMini T={T} dark={dark} label="Tempo médio" valor={f.tempoMedio} />
        </div>

        {/* Distribuição de etapas — onde essa pessoa mais atua */}
        {f.distribuicaoEtapas?.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.03em' }}>
              Onde atua mais
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {f.distribuicaoEtapas.map(d => (
                <div key={d.etapa} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 11, color: T.textSecondary, width: 82, flexShrink: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{d.label}</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: T.cardAlt, overflow: 'hidden' }}>
                    <div style={{ width: `${d.pct}%`, height: '100%', background: azul, borderRadius: 3 }} />
                  </div>
                  <span style={{
                    fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums',
                    width: 18, textAlign: 'right', flexShrink: 0,
                  }}>{d.n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Qualidade — retrabalho e garantia */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          paddingTop: 10, borderTop: `1px solid ${T.border}`,
        }}>
          {semRetrabalho ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, color: verde,
            }}>
              <i className="ti ti-shield-check" style={{ fontSize: 13 }} aria-hidden="true" />
              Sem retrabalho no período
            </span>
          ) : (
            <>
              {falhas > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, color: vermelho,
                  background: vermelho + '15', padding: '3px 8px', borderRadius: 99,
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} aria-hidden="true" />
                  {falhas} {falhas === 1 ? 'OS voltou' : 'OS voltaram'} do teste
                </span>
              )}
              {garantias > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontWeight: 600, color: vermelho,
                  background: vermelho + '15', padding: '3px 8px', borderRadius: 99,
                }}>
                  <i className="ti ti-shield-x" style={{ fontSize: 12 }} aria-hidden="true" />
                  {garantias} em garantia
                </span>
              )}
            </>
          )}
        </div>

      </div>
    </AtlPanel>
  )
}

// =============================================================================
// PRIMITIVOS REUTILIZÁVEIS
// =============================================================================
function KPI({ T, dark, label, valor, delta, cor, icon, sparkData, sparkCor, deltaInverso = false }) {
  // deltaInverso: pra métricas onde "baixar é bom" (ex: retrabalho, tempo médio).
  // Não muda a cor do badge (verde/vermelho é definido pelo sinal), só inverte se a "subida"
  // é positiva ou negativa pra UX. Como DeltaPill atual define pela aritmética, deixamos como está
  // — o ícone de tendência basta pra leitura.
  return (
    <Card T={T} dark={dark}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{
          fontSize: 10.5, color: T.textMuted, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {icon && <i className={`ti ${icon}`} style={{ fontSize: 14, color: cor }} aria-hidden="true" />}
          {label}
        </div>
        {delta != null && <DeltaPill value={delta} dark={dark} />}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        marginBottom: sparkData ? 6 : 0,
      }}>
        {valor}
      </div>
      {sparkData && (
        <Sparkline data={sparkData} color={sparkCor || cor} height={32} />
      )}
    </Card>
  )
}

function BarrasCategoria({ T, dark, dados, total }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {dados.map(d => {
        const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0
        return (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>
              <span>{d.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: corHero(dark), fontWeight: 600 }}>
                {d.valor} <span style={{ color: T.textMuted, fontWeight: 400 }}>· {pct}%</span>
              </span>
            </div>
            <div style={{
              width: '100%', height: 8, borderRadius: 5,
              background: T.cardAlt, overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: d.cor, transition: 'width .3s',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BarrasValorBRL({ T, dark, dados, cor }) {
  const total = dados.reduce((s, d) => s + d.valor, 0) || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {dados.map(d => {
        const pct = Math.round((d.valor / total) * 100)
        return (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>
              <span>{d.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: corHero(dark), fontWeight: 600 }}>
                {fmtBRL(d.valor)} <span style={{ color: T.textMuted, fontWeight: 400 }}>· {pct}%</span>
              </span>
            </div>
            <div style={{ width: '100%', height: 8, borderRadius: 5, background: T.cardAlt, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, pct)}%`, height: '100%', background: cor, transition: 'width .3s' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BarrasHorizontais({ T, dark, dados }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {dados.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>
            <span>{d.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: corHero(dark), fontWeight: 600 }}>{d.valor}</span>
          </div>
          <div style={{
            width: '100%', height: 6, borderRadius: 4,
            background: T.cardAlt, overflow: 'hidden',
          }}>
            <div style={{
              width: `${d.pct}%`, height: '100%',
              background: `linear-gradient(90deg, ${azul}, ${corEtapa('blueLight', dark)})`,
              transition: 'width .3s',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListaSimples({ T, dark, itens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {itens.map((i, idx) => (
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '10px 12px',
          background: T.cardAlt,
          borderRadius: 8,
          border: `1px solid ${T.border}`,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: corHero(dark) }}>{i.titulo}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{i.detalhe}</div>
          </div>
          {i.badge && <Badge variant={i.badgeVar || 'neutro'} dark={dark} sm>{i.badge}</Badge>}
        </div>
      ))}
    </div>
  )
}

function DRELinhas({ T, dark, linhas }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {linhas.map((l, idx) => {
        const ehReceita = l.tipo === 'receita'
        const ehDespesa = l.tipo === 'despesa'
        const ehSubtotal = l.tipo === 'subtotal'
        const ehTotal = l.tipo === 'total'
        return (
          <div key={idx} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: ehTotal ? '14px 0 4px' : '8px 0',
            borderTop: idx > 0 && (ehSubtotal || ehTotal) ? `1px solid ${T.border}` : 'none',
            marginTop: ehTotal ? 6 : 0,
          }}>
            <span style={{
              fontSize: ehTotal ? 14 : 12.5,
              color: ehTotal ? corHero(dark) : ehSubtotal ? T.textPrimary : T.textSecondary,
              fontWeight: ehTotal ? 700 : ehSubtotal ? 600 : 400,
              paddingLeft: (ehReceita || ehDespesa) ? 14 : 0,
            }}>
              {l.label}
            </span>
            <span style={{
              fontSize: ehTotal ? 16 : 12.5,
              color: ehTotal ? corHero(dark)
                : ehReceita ? azul
                : ehDespesa ? amarelo
                : corHero(dark),
              fontWeight: ehTotal ? 800 : ehSubtotal ? 700 : 500,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtBRL(l.valor)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function InsightIA({ T, dark, disponivel = false, previewTexto, markdown, loading, error, onGerar }) {
  const azulClaro = corEtapa('blueLight', dark)
  const vermelho = corEtapa('red', dark)
  const cor = (d, c) => dark ? d : c

  // Estado do badge: pronto > gerando > erro > em breve / ativo
  const statusLabel = markdown ? 'Pronto'
    : loading ? 'Gerando…'
    : error ? 'Erro'
    : (disponivel || onGerar) ? 'Pronto pra rodar' : 'Em breve'

  return (
    <Card T={T} dark={dark} accent={azulClaro}
      style={{ background: cor('#0d2035', '#e6f1fb') + '40' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: bgEtapa('blueLight', dark),
          border: `1px solid ${azulClaro}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className="ti ti-sparkles" style={{ fontSize: 20, color: azulClaro }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: corHero(dark) }}>
              Insight da IA
            </span>
            <Badge variant="neutro" dark={dark} sm>{statusLabel}</Badge>
            <span style={{ fontSize: 10.5, color: T.textMuted }}>
              <i className="ti ti-cpu" style={{ marginRight: 3 }} aria-hidden="true" />
              claude-opus-4-7
            </span>
          </div>

          {markdown ? (
            <MarkdownView T={T} dark={dark} texto={markdown} />
          ) : loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textSecondary, fontSize: 12.5, padding: '6px 0' }}>
              <i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              Gerando análise com Claude API…
            </div>
          ) : error ? (
            <div style={{ fontSize: 12.5, color: vermelho, lineHeight: 1.5 }}>
              <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} aria-hidden="true" />
              {error}
              {onGerar && (
                <div style={{ marginTop: 8 }}>
                  <Button T={T} dark={dark} variant="secondary" size="sm" iconLeft="ti-refresh" onClick={onGerar}>
                    Tentar de novo
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5, marginBottom: onGerar ? 10 : 0 }}>
                {previewTexto || 'A integração com a Claude API ainda não foi configurada nesta tela. Quando ativada, esta seção trará análise contextual dos números — comparações, alertas e sugestões.'}
              </div>
              {onGerar && (
                <Button T={T} dark={dark} variant="primary" size="sm" iconLeft="ti-sparkles" onClick={onGerar}>
                  Gerar análise agora
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

// Renderiza um subset de Markdown (## h2, **negrito**, listas - / *, parágrafos).
// Mantemos inline pra não adicionar dependência (regra: sem npm i sem aprovação).
function MarkdownView({ T, dark, texto }) {
  const azul = corEtapa('blue', dark)
  const blocos = parseMarkdown(texto || '')

  return (
    <div style={{
      fontSize: 12.5, color: T.textPrimary, lineHeight: 1.55,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {blocos.map((b, i) => {
        if (b.tipo === 'h2') {
          return (
            <div key={i} style={{
              fontSize: 13.5, fontWeight: 700, color: corHero(dark),
              borderBottom: `1px solid ${T.border}`,
              paddingBottom: 4, marginTop: i === 0 ? 0 : 6,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ti ti-point-filled" style={{ fontSize: 10, color: azul }} aria-hidden="true" />
              {renderInline(b.texto)}
            </div>
          )
        }
        if (b.tipo === 'h3') {
          return (
            <div key={i} style={{ fontSize: 12.5, fontWeight: 700, color: corHero(dark), marginTop: 4 }}>
              {renderInline(b.texto)}
            </div>
          )
        }
        if (b.tipo === 'ul') {
          return (
            <ul key={i} style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {b.itens.map((it, j) => (
                <li key={j} style={{ color: T.textSecondary }}>
                  {renderInline(it)}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <div key={i} style={{ color: T.textSecondary }}>
            {renderInline(b.texto)}
          </div>
        )
      })}
    </div>
  )
}

function parseMarkdown(md) {
  const linhas = md.replace(/\r\n/g, '\n').split('\n')
  const blocos = []
  let atual = null
  const fechar = () => { if (atual) { blocos.push(atual); atual = null } }
  for (const raw of linhas) {
    const linha = raw.replace(/\s+$/g, '')
    if (linha.startsWith('## ')) { fechar(); blocos.push({ tipo: 'h2', texto: linha.slice(3) }); continue }
    if (linha.startsWith('### ')) { fechar(); blocos.push({ tipo: 'h3', texto: linha.slice(4) }); continue }
    if (linha.startsWith('# ')) { fechar(); blocos.push({ tipo: 'h2', texto: linha.slice(2) }); continue }
    const liMatch = linha.match(/^\s*[-*]\s+(.*)$/)
    if (liMatch) {
      if (!atual || atual.tipo !== 'ul') { fechar(); atual = { tipo: 'ul', itens: [] } }
      atual.itens.push(liMatch[1])
      continue
    }
    if (linha.trim() === '') { fechar(); continue }
    if (!atual || atual.tipo !== 'p') { fechar(); atual = { tipo: 'p', texto: '' } }
    atual.texto += (atual.texto ? ' ' : '') + linha.trim()
  }
  fechar()
  return blocos
}

// Aplica **negrito** e `código` mantendo segurança (sem dangerouslySetInnerHTML).
function renderInline(texto) {
  if (!texto) return null
  const partes = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let ultimo = 0
  let m
  let k = 0
  while ((m = regex.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(<span key={`t${k++}`}>{texto.slice(ultimo, m.index)}</span>)
    const token = m[0]
    if (token.startsWith('**')) {
      partes.push(<strong key={`b${k++}`} style={{ fontWeight: 700 }}>{token.slice(2, -2)}</strong>)
    } else {
      partes.push(<code key={`c${k++}`} style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.92em', padding: '1px 5px', borderRadius: 4,
        background: 'rgba(127,127,127,0.15)',
      }}>{token.slice(1, -1)}</code>)
    }
    ultimo = m.index + token.length
  }
  if (ultimo < texto.length) partes.push(<span key={`t${k}`}>{texto.slice(ultimo)}</span>)
  return partes
}

// =============================================================================
// Estados auxiliares (loading / erro) usados pelos 4 relatórios reais
// =============================================================================
function RelatorioLoading({ T }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 48, color: T.textMuted, fontSize: 13, gap: 8,
    }}>
      <i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
      Carregando dados…
    </div>
  )
}

function RelatorioErro({ T, dark, msg }) {
  return (
    <Card T={T} dark={dark} accent={corEtapa('red', dark)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: corEtapa('red', dark) }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 20 }} aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Falha ao carregar relatório</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: T.textSecondary }}>{msg}</div>
    </Card>
  )
}
