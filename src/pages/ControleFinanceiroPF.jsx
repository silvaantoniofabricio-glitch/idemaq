// src/pages/ControleFinanceiroPF.jsx
// Controle financeiro pessoal (PF) do Toni — separado da empresa.
// Por enquanto le dados estaticos de src/data/controleFinanceiroPF.js;
// futuramente sera tabela propria (sistema isolado).

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL } from '../utils/fmt'
import {
  Card, Badge, EmptyState, ModuleHeader,
} from '../components/ui'
import {
  DESPESAS_PF_POR_MES,
  CATEGORIAS_FLUXO_INTERNO,
  maeDe,
} from '../data/controleFinanceiroPF'
import { useFinanceiro } from '../hooks/useFinanceiro'

const MESES_NOME = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Origens que sao cartoes de credito — itens listados individualmente, nao sao Pix/Dinheiro
const ORIGENS_CARTAO = new Set(['Elo Grafite', 'Inter', 'MP Cartao', 'Bradesco PJ ELO', 'Visa Bradesco'])

function periodoToFiltro(periodo) {
  const hoje = new Date()
  let de, ate
  if (periodo.id === 'mes') {
    de = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  } else if (periodo.id === 'mes_ant') {
    de = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    ate = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
  } else if (periodo.id === 'sel_mes' && periodo.ano != null) {
    de = new Date(periodo.ano, periodo.mes, 1)
    ate = new Date(periodo.ano, periodo.mes + 1, 0)
  } else if (periodo.id === 'sel_period' && periodo.de && periodo.ate) {
    de = new Date(periodo.de + 'T00:00:00')
    ate = new Date(periodo.ate + 'T23:59:59')
  } else {
    de = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  }
  const iso = (d) => d.toISOString().slice(0, 10)
  return { tipo: 'despesa', status: 'pago', dataInicio: iso(de), dataFim: iso(ate) }
}

function periodoToMesKey(periodo) {
  const hoje = new Date()
  let ano, mes
  if (periodo.id === 'mes') {
    ano = hoje.getFullYear(); mes = hoje.getMonth()
  } else if (periodo.id === 'mes_ant') {
    mes = hoje.getMonth() - 1; ano = hoje.getFullYear()
    if (mes < 0) { mes = 11; ano-- }
  } else if (periodo.id === 'sel_mes' && periodo.ano != null) {
    ano = periodo.ano; mes = periodo.mes
  } else {
    ano = hoje.getFullYear(); mes = hoje.getMonth()
  }
  return `${ano}-${String(mes + 1).padStart(2, '0')}`
}

function labelPeriodoPF(periodo) {
  if (periodo.id === 'sel_period') {
    const fmt = (s) => s ? s.split('-').reverse().join('/') : '...'
    return `${fmt(periodo.de)} → ${fmt(periodo.ate)}`
  }
  if (periodo.id === 'sel_mes' && periodo.ano != null) {
    return `${MESES_NOME[periodo.mes]} ${periodo.ano}`
  }
  const map = { mes: 'Mês atual', mes_ant: 'Mês passado' }
  return map[periodo.id] || 'Mês atual'
}

function isoParaBR(iso) {
  if (!iso) return '00/00/0000'
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}/${y}`
}

function adaptarEmpresaParaPF(lancs) {
  return (lancs || []).map(l => ({
    data: isoParaBR(l.vencimento || l.pago_em),
    origem: l.conta?.nome || 'Sem conta',
    descricao: l.descricao || '(sem descricao)',
    valor: Number(l.valor || 0),
    categoria: l.categoria || 'Diverso',
  }))
}

const PESSOAS = [
  { id: 'total',   label: 'Total (casal)' },
  { id: 'toni',    label: 'Toni' },
  { id: 'rafa',    label: 'Rafa' },
  { id: 'empresa', label: 'Empresa' },
]

const SECOES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tabela',    label: 'Planilha' },
  { id: 'conselhos', label: 'Análise' },
]

// ─── ExportDropdown ──────────────────────────────────────────────────────────
function ExportDropdown({ T, dark, despesas, analise, mesLabel, pessoaLabel }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  const azul = corEtapa('blue', dark)

  useEffect(() => {
    if (!aberto) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [aberto])

  function gerarCSV() {
    const itens = despesas.filter(d => !CATEGORIAS_FLUXO_INTERNO.has(d.categoria))
    const linhas = [['Data', 'Origem', 'Descrição', 'Categoria', 'Valor'].join(';')]
    for (const d of itens) {
      const v = d.valor.toFixed(2).replace('.', ',')
      linhas.push([d.data, d.origem, `"${d.descricao}"`, d.categoria, v].join(';'))
    }
    const bom = '﻿'
    const blob = new Blob([bom + linhas.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `financeiro-pf-${mesLabel}-${pessoaLabel}.csv`
    a.click(); URL.revokeObjectURL(url)
    setAberto(false)
  }

  function gerarPDF() {
    const itens = despesas.filter(d => !CATEGORIAS_FLUXO_INTERNO.has(d.categoria))
    const rows = itens.map(d => `
      <tr>
        <td>${d.data}</td>
        <td>${d.origem}</td>
        <td>${d.descricao}</td>
        <td>${d.categoria}</td>
        <td class="val">R$ ${d.valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Financeiro PF — ${mesLabel} — ${pessoaLabel}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #666; margin-bottom: 16px; }
  .kpis { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 20px; }
  .kpi { background: #f5f7fa; border-radius: 6px; padding: 10px 16px; min-width: 140px; }
  .kpi-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: .04em; }
  .kpi-val { font-size: 15px; font-weight: 700; color: #1a56db; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #f0f4fa; font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
       padding: 6px 8px; text-align: left; color: #555; border-bottom: 2px solid #dde; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #fafbff; }
  .val { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
  .total-row td { font-weight: 700; border-top: 2px solid #dde; background: #f0f4fa; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>Financeiro Pessoal — ${mesLabel}</h1>
<div class="sub">Pessoa: ${pessoaLabel} &nbsp;·&nbsp; ${itens.length} lançamentos</div>
<div class="kpis">
  <div class="kpi"><div class="kpi-label">Gasto Real Efetivo</div><div class="kpi-val">${fmtBRL(analise.totalReal)}</div></div>
  <div class="kpi"><div class="kpi-label">Pix / Dinheiro</div><div class="kpi-val">${fmtBRL(analise.totalPixDinheiro)}</div></div>
  <div class="kpi"><div class="kpi-label">Pagamentos de Fatura</div><div class="kpi-val">${fmtBRL(analise.totalFaturaItens)}</div></div>
  <div class="kpi"><div class="kpi-label">Dízimo + Oferta</div><div class="kpi-val">${fmtBRL(analise.totalDizimo + analise.totalOferta)}</div></div>
</div>
<table>
  <thead><tr><th>Data</th><th>Origem</th><th>Descrição</th><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead>
  <tbody>${rows}
  <tr class="total-row"><td colspan="4">TOTAL</td><td class="val">R$ ${analise.totalReal.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</td></tr>
  </tbody>
</table>
<script>window.onload = () => window.print()</script>
</body></html>`
    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    setAberto(false)
  }

  const btnStyle = {
    height: 28, padding: '0 10px',
    background: 'transparent',
    border: `1px solid ${dark ? '#2e2e34' : T.border}`,
    borderRadius: 5, cursor: 'pointer',
    color: dark ? '#999' : T.textMuted,
    fontSize: 12, fontWeight: 500,
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontFamily: 'inherit',
    boxShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,.06)',
  }

  const itemStyle = {
    width: '100%', padding: '9px 14px', background: 'transparent',
    border: 'none', cursor: 'pointer', textAlign: 'left',
    fontSize: 13, color: T.textPrimary, fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', gap: 8,
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(o => !o)}
        style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.borderColor = azul; e.currentTarget.style.color = azul }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? '#2e2e34' : T.border; e.currentTarget.style.color = dark ? '#999' : T.textMuted }}>
        <i className="ti ti-file-export" style={{ fontSize: 13 }} aria-hidden="true" />
        Exportar
        <i className={`ti ti-chevron-${aberto ? 'up' : 'down'}`} style={{ fontSize: 11 }} aria-hidden="true" />
      </button>

      {aberto && (
        <div style={{
          position: 'absolute', top: 32, right: 0, zIndex: 200,
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.15)',
          minWidth: 160, overflow: 'hidden',
        }}>
          <button style={itemStyle} onClick={gerarPDF}
            onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <i className="ti ti-file-type-pdf" style={{ fontSize: 15, color: '#e53e3e' }} aria-hidden="true" />
            Exportar PDF
          </button>
          <div style={{ height: 1, background: T.border }} />
          <button style={itemStyle} onClick={gerarCSV}
            onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <i className="ti ti-table-export" style={{ fontSize: 15, color: '#38a169' }} aria-hidden="true" />
            Exportar CSV
          </button>
        </div>
      )}
    </div>
  )
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

// ─── SecHeader local ─────────────────────────────────────────────────────────
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

export default function ControleFinanceiroPF({ T, dark }) {
  const azul     = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const amarelo  = corEtapa('yellow', dark)
  const azulBg   = dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb'

  const [periodo, setPeriodo]         = useState({ id: 'mes' })
  const [pessoaAtiva, setPessoaAtiva] = useState('total')
  const [verSecao, setVerSecao]       = useState('dashboard')

  const filtroEmp = useMemo(() => periodoToFiltro(periodo), [periodo])
  const mesKey    = useMemo(() => periodoToMesKey(periodo), [periodo])

  const { lancamentos: lancsEmpresa } = useFinanceiro(filtroEmp)
  const despesasEmpresa = useMemo(() => adaptarEmpresaParaPF(lancsEmpresa), [lancsEmpresa])

  const despesas = pessoaAtiva === 'empresa'
    ? despesasEmpresa
    : ((DESPESAS_PF_POR_MES[mesKey] || {})[pessoaAtiva] || [])

  const analise = useMemo(() => analisarDespesas(despesas, { isEmpresa: pessoaAtiva === 'empresa' }), [despesas, pessoaAtiva])

  const mesLabel    = labelPeriodoPF(periodo)
  const pessoaLabel = PESSOAS.find(p => p.id === pessoaAtiva)?.label || pessoaAtiva

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minHeight: 0, overflow: 'hidden', background: T.bg,
    }}>

      <ModuleHeader
        T={T} dark={dark}
        icon="ti-home-dollar"
        title="Financeiro PF"
        stats={[
          { v: fmtBRL(analise.totalReal), label: 'gasto real', color: amarelo, highlight: true },
          { v: analise.totalItens, label: 'lançamentos', color: azul },
        ]}
        tabs={SECOES.map(s => ({ id: s.id, label: s.label }))}
        activeTab={verSecao}
        onTabChange={setVerSecao}
        filterSlot={<>
          <CaixaPeriodoPF T={T} dark={dark} periodo={periodo} setPeriodo={setPeriodo} />
          {PESSOAS.map(p => {
            const ativo = pessoaAtiva === p.id
            return (
              <button key={p.id} onClick={() => setPessoaAtiva(p.id)}
                style={{
                  padding: '0 8px', height: 22, borderRadius: 4,
                  border: `1px solid ${ativo ? azul : T.border}`,
                  background: ativo ? azulBg : 'transparent',
                  color: ativo ? azul : T.textMuted,
                  fontSize: 11, fontWeight: ativo ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {p.label}
              </button>
            )
          })}
          <ExportDropdown T={T} dark={dark} despesas={despesas} analise={analise} mesLabel={mesLabel} pessoaLabel={pessoaLabel} />
        </>}
      />

      {/* ══ CONTENT ══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {verSecao === 'dashboard' && <Dashboard T={T} dark={dark} analise={analise} />}
          {verSecao === 'tabela'    && <PlanilhaCompleta T={T} dark={dark} despesas={despesas} />}
          {verSecao === 'conselhos' && <ConselhosFinanceiros T={T} dark={dark} analise={analise} />}
        </div>
      </div>
    </div>
  )
}

// =====================================================================
// Seletor de período (espelho do Financeiro.jsx)
// =====================================================================
function DropdownPeriodoPF({ T, dark, periodo, setPeriodo, onClose }) {
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
      minWidth: 270, background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.18)', padding: 8,
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
    </div>
  )
}

function CaixaPeriodoPF({ T, dark, periodo, setPeriodo }) {
  const azul = corEtapa('blue', dark)
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    if (aberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [aberto])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setAberto(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '0 10px', height: 26, borderRadius: 6,
        border: `1px solid ${T.border}`,
        background: dark ? 'rgba(255,255,255,0.04)' : T.card,
        color: T.textPrimary, fontSize: 11.5, fontWeight: 500,
        cursor: 'pointer', fontFamily: 'inherit', minWidth: 140,
      }}>
        <i className="ti ti-calendar" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
        <span style={{ flex: 1, textAlign: 'left' }}>{labelPeriodoPF(periodo)}</span>
        <i className={`ti ${aberto ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12, color: T.textMuted }} aria-hidden="true" />
      </button>
      {aberto && (
        <DropdownPeriodoPF T={T} dark={dark} periodo={periodo} setPeriodo={setPeriodo} onClose={() => setAberto(false)} />
      )}
    </div>
  )
}

// =====================================================================
// Funções de análise
// =====================================================================
function analisarDespesas(despesas, { isEmpresa = false } = {}) {
  let totalBruto = 0
  let totalReal = 0
  let totalTransferencia = 0
  let totalFaturas = 0
  let totalDizimo = 0
  let totalOferta = 0
  let totalCartaoItens = 0

  const porCategoria = {}
  const porCategoriaMae = {}
  const porOrigem = {}
  const porSemana = {}

  for (const d of despesas) {
    const v = Number(d.valor || 0)
    totalBruto += v

    // Para empresa os lançamentos já vêm item a item do banco — não há
    // boleto de fatura separado, então ORIGENS_CARTAO não se aplica.
    if (!isEmpresa && ORIGENS_CARTAO.has(d.origem)) totalCartaoItens += v

    if (d.categoria === 'Transferencia') {
      totalTransferencia += v
      continue
    }
    if (d.categoria === 'Cartao') {
      totalFaturas += v
      continue
    }
    if (d.categoria === 'Dizimo') {
      totalDizimo += v
      // visivel na lista, mas nao soma no gasto real efetivo
      continue
    }
    if (d.categoria === 'Doacao/Igreja') {
      totalOferta += v
      continue
    }

    totalReal += v

    porCategoria[d.categoria] = (porCategoria[d.categoria] || 0) + v
    const mae = maeDe(d.categoria)
    porCategoriaMae[mae] = (porCategoriaMae[mae] || 0) + v
    porOrigem[d.origem] = (porOrigem[d.origem] || 0) + v

    const [, , ] = d.data.split('/')
    const dataKey = isoDoDia(d.data)
    const semana = semanaDoMes(d.data)
    porSemana[semana] = (porSemana[semana] || 0) + v
  }

  const maiores = despesas
    .filter(d => !CATEGORIAS_FLUXO_INTERNO.has(d.categoria))
    .slice()
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 15)

  const sortValor = (a, b) => b.valor - a.valor
  const mapObj = (obj) => Object.entries(obj)
    .map(([k, v]) => ({ label: k, valor: v }))
    .sort(sortValor)

  return {
    totalBruto,
    totalReal,
    totalTransferencia,
    totalFaturas,
    totalDizimo,
    totalOferta,
    totalFaturaItens: totalCartaoItens,
    totalPixDinheiro: totalBruto - totalTransferencia - totalFaturas - totalCartaoItens,
    totalItens: despesas.length,
    porCategoria: mapObj(porCategoria),
    porCategoriaMae: mapObj(porCategoriaMae),
    porOrigem: mapObj(porOrigem),
    porSemana,
    maiores,
  }
}

function isoDoDia(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/')
  return `${y}-${m}-${d}`
}

function semanaDoMes(ddmmyyyy) {
  const [d] = ddmmyyyy.split('/').map(Number)
  if (d <= 7) return 'Semana 1 (01–07)'
  if (d <= 14) return 'Semana 2 (08–14)'
  if (d <= 21) return 'Semana 3 (15–21)'
  return 'Semana 4 (22–31)'
}

// =====================================================================
// Dashboard
// =====================================================================
function Dashboard({ T, dark, analise }) {
  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPIs */}
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Gasto real efetivo" valor={fmtBRL(analise.totalReal)} cor={amarelo}
          icon="ti-shopping-cart"
          detalhe="Já desconta transferências internas e boletos de fatura" />
        <KPI T={T} dark={dark} label="Pagamentos Pix/Dinheiro" valor={fmtBRL(analise.totalPixDinheiro)} cor={azulClaro}
          icon="ti-cash" detalhe="Exceto boletos de fatura e transferências" />
        <KPI T={T} dark={dark} label="Pagamentos de fatura" valor={fmtBRL(analise.totalFaturaItens)} cor={azulClaro}
          icon="ti-credit-card" detalhe="Já contado item a item" />
        <KPI T={T} dark={dark} label="Dízimo + Oferta" valor={fmtBRL(analise.totalDizimo + analise.totalOferta, { fr: true })} cor={azulClaro}
          icon="ti-church" detalhe="Fora do gasto real" />
        <KPI T={T} dark={dark} label="Total de lançamentos" valor={analise.totalItens} cor={azul}
          icon="ti-list-numbers" detalhe={`em ${analise.porOrigem.length} origens`} />
      </div>

      {/* Por categoria-mãe (macro) */}
      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-chart-pie" cor={amarelo}>
          Gastos por grande categoria
        </SecHeader>
        <Barras T={T} dark={dark} itens={analise.porCategoriaMae} total={analise.totalReal} cor={amarelo} />
      </Card>

      {/* Por categoria específica */}
      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-tags" cor={azul}>
          Detalhado por categoria
        </SecHeader>
        <Barras T={T} dark={dark} itens={analise.porCategoria} total={analise.totalReal} cor={azul} />
      </Card>

      {/* Por origem (cartão / conta) */}
      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-credit-card" cor={azulClaro}>
          Por cartão / conta de origem
        </SecHeader>
        <Barras T={T} dark={dark} itens={analise.porOrigem} total={analise.totalReal} cor={azulClaro} />
      </Card>

      {/* Top 15 maiores */}
      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-list-numbers" cor={azul}>
          Top 15 maiores gastos do mês
        </SecHeader>
        <ListaMaiores T={T} dark={dark} itens={analise.maiores} />
      </Card>
    </div>
  )
}

// =====================================================================
// Planilha completa
// =====================================================================
function PlanilhaCompleta({ T, dark, despesas }) {
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  // Exclui fluxo interno (transferencias entre contas + pagamento de fatura)
  // pra planilha mostrar so gasto real. Categorias e filtros tambem se
  // baseiam nessa lista enxuta.
  const despesasReais = useMemo(
    () => despesas.filter(d => !CATEGORIAS_FLUXO_INTERNO.has(d.categoria)),
    [despesas]
  )

  const categorias = useMemo(() => {
    const s = new Set(despesasReais.map(d => d.categoria))
    return Array.from(s).sort()
  }, [despesasReais])

  const filtradas = useMemo(() => {
    const buscaLower = busca.toLowerCase().trim()
    return despesasReais.filter(d => {
      if (categoriaFiltro && d.categoria !== categoriaFiltro) return false
      if (buscaLower && !d.descricao.toLowerCase().includes(buscaLower)
          && !d.origem.toLowerCase().includes(buscaLower)) return false
      return true
    })
  }, [despesasReais, busca, categoriaFiltro])

  const totalFiltrado = filtradas.reduce((s, d) => s + d.valor, 0)

  return (
    <Card T={T} dark={dark}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Buscar descrição ou origem…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            flex: 1, minWidth: 200,
            background: T.cardAlt, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '8px 12px',
            color: T.textPrimary, fontSize: 13,
          }}
        />
        <select
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
          style={{
            background: T.cardAlt, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '8px 12px',
            color: T.textPrimary, fontSize: 13,
          }}
        >
          <option value="">Todas categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{
          padding: '8px 14px', background: bgEtapa('blue', dark),
          border: `1px solid ${corEtapa('blue', dark)}55`, borderRadius: 8,
          fontSize: 13, color: corHero(dark), fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {filtradas.length} itens · {fmtBRL(totalFiltrado, { fr: true })}
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '90px 1fr 1.5fr 130px 110px',
        gap: 8, padding: '8px 10px',
        background: T.cardAlt, borderRadius: 6,
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        <div>Data</div>
        <div>Origem</div>
        <div>Descrição</div>
        <div>Categoria</div>
        <div style={{ textAlign: 'right' }}>Valor</div>
      </div>

      <div style={{ maxHeight: 600, overflowY: 'auto' }}>
        {filtradas.map((d, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 1.5fr 130px 110px',
            gap: 8, padding: '10px',
            borderBottom: `1px solid ${T.border}`,
            fontSize: 12, color: T.textSecondary,
          }}>
            <div style={{ fontVariantNumeric: 'tabular-nums' }}>{d.data}</div>
            <div style={{ color: T.textMuted }}>{d.origem}</div>
            <div style={{ color: corHero(dark), fontWeight: 500 }}>{d.descricao}</div>
            <div>
              <Badge variant="amarelo" dark={dark} sm>
                {d.categoria}
              </Badge>
            </div>
            <div style={{
              textAlign: 'right', fontWeight: 600,
              color: corHero(dark),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtBRL(d.valor, { fr: true })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// =====================================================================
// Análise & Conselhos
// =====================================================================
function ConselhosFinanceiros({ T, dark, analise }) {
  const conselhos = useMemo(() => gerarConselhos(analise), [analise])
  const amarelo = corEtapa('yellow', dark)
  const azul = corEtapa('blue', dark)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-bulb" cor={amarelo}>
          Análise automática
        </SecHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conselhos.map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '14px 16px',
              background: T.cardAlt,
              borderLeft: `3px solid ${c.severidade === 'alta' ? amarelo : azul}`,
              borderRadius: 6,
            }}>
              <i className={`ti ${c.icone}`} style={{
                fontSize: 22, color: c.severidade === 'alta' ? amarelo : azul,
                marginTop: 2,
              }} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: corHero(dark), marginBottom: 4,
                }}>
                  {c.titulo}
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5 }}>
                  {c.texto}
                </div>
                {c.numero && (
                  <div style={{
                    marginTop: 8, fontSize: 18, fontWeight: 700,
                    color: c.severidade === 'alta' ? amarelo : azul,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {c.numero}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card T={T} dark={dark}>
        <SecHeader T={T} icon="ti-target" cor={azul}>
          Recomendações de ação
        </SecHeader>
        <ul style={{ paddingLeft: 18, color: T.textSecondary, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          <li><b>Alimentação fora de casa</b>: iFood + Aiqfome + restaurantes pesam — meta de redução de 30% no próximo mês usando refeições em casa nos dias úteis.</li>
          <li><b>Combustível e manutenção do Focus</b>: somar PF dos veículos pra saber custo real ao mês. Se ultrapassar R$ 1k/mês, vale considerar reduzir uso ou planejar troca.</li>
          <li><b>Empréstimos PF</b>: liste cada empréstimo (parcela + saldo). Foco em quitar o de juros mais altos primeiro.</li>
          <li><b>Reserva de emergência</b>: definir % fixo de cada mês (sugestão: 10%) pra conta separada antes de pagar contas — pague-se primeiro.</li>
          <li><b>Cartões PF múltiplos</b>: você usa Elo Grafite + Visa Bradesco + Inter + Nubank + MP. Considere centralizar em 1 ou 2 pra reduzir anuidades e ter visão única.</li>
          <li><b>Doações</b>: parabéns por manter o dízimo. Mantenha previsto no orçamento como linha fixa.</li>
        </ul>
      </Card>
    </div>
  )
}

function gerarConselhos(analise) {
  const out = []
  const total = analise.totalReal

  const pct = (v) => total > 0 ? Math.round((v / total) * 100) : 0
  const valor = (cat) => analise.porCategoria.find(c => c.label === cat)?.valor || 0

  // Alimentação fora vs supermercado
  const alimFora = valor('Alimentacao')
  const superm = valor('Supermercado')
  if (alimFora > 0 || superm > 0) {
    const ratio = superm > 0 ? Math.round(alimFora / superm * 100) / 100 : 999
    out.push({
      icone: 'ti-tools-kitchen-2',
      severidade: alimFora > superm ? 'alta' : 'media',
      titulo: 'Alimentação: fora de casa vs supermercado',
      texto: `Você gastou ${fmtBRL(alimFora)} em alimentação fora (iFood, Aiqfome, restaurantes) e ${fmtBRL(superm)} em supermercado. ${alimFora > superm
        ? `Comer fora custa ${ratio}x o que você gasta em mercado — economia potencial real ao planejar refeições em casa.`
        : 'Boa relação. Continue priorizando mercado.'
      }`,
      numero: `${pct(alimFora)}% do gasto real`,
    })
  }

  // Veículos PF
  const carro = valor('Veiculo PF') + valor('Pedagio')
  if (carro > 0) {
    out.push({
      icone: 'ti-car',
      severidade: pct(carro) > 15 ? 'alta' : 'media',
      titulo: 'Veículos pessoais (Focus + Civic)',
      texto: `Manutenção, peças e pedágios somaram ${fmtBRL(carro)}. Esse valor inclui várias parcelas (peças do Focus, vistoria do Civic). Monitore se vai cair nos próximos meses ou se virou recorrente.`,
      numero: `${pct(carro)}% do gasto real`,
    })
  }

  // Empréstimos
  const empr = valor('Emprestimo')
  if (empr > 0) {
    out.push({
      icone: 'ti-cash-banknote-off',
      severidade: 'alta',
      titulo: 'Empréstimos consumiram parte importante do mês',
      texto: `Você pagou ${fmtBRL(empr)} em parcelas de empréstimo (carro PF). Esse é seu maior dreno fixo. Considere amortizar com receita extra ou refinanciar se juros forem altos.`,
      numero: `${pct(empr)}% do gasto real`,
    })
  }

  // Farmácia
  const farma = valor('Farmacia')
  if (farma > 0) {
    out.push({
      icone: 'ti-pill',
      severidade: pct(farma) > 8 ? 'alta' : 'media',
      titulo: 'Farmácia',
      texto: `Gasto com farmácia foi ${fmtBRL(farma)} (${pct(farma)}% do total). Se há remédios contínuos, considere genéricos ou farmácia popular. Se foram avulsos, sem ação.`,
      numero: `${pct(farma)}% do gasto real`,
    })
  }

  // Doações
  const doa = valor('Doacao/Igreja')
  if (doa > 0) {
    out.push({
      icone: 'ti-gift',
      severidade: 'media',
      titulo: 'Doações / dízimo',
      texto: `Você destinou ${fmtBRL(doa)} para doação/igreja. Bom mantê-lo no orçamento como linha fixa — assim não vira surpresa nem é cortado em apertos.`,
      numero: `${pct(doa)}% do gasto real`,
    })
  }

  // Vestuário & compras
  const vest = (valor('Vestuario') + valor('Compras pessoais'))
  if (vest > 0) {
    out.push({
      icone: 'ti-shopping-bag',
      severidade: pct(vest) > 12 ? 'alta' : 'media',
      titulo: 'Compras de vestuário e itens pessoais',
      texto: `Vestuário + compras pessoais totalizaram ${fmtBRL(vest)}. Muitas parcelas em andamento — vale uma lista de parcelas futuras pra antecipar comprometimento.`,
      numero: `${pct(vest)}% do gasto real`,
    })
  }

  // Tarifas + IOF
  const tarifas = valor('Tarifa banco') + valor('Tarifa cartao') + valor('IOF')
  if (tarifas > 0) {
    out.push({
      icone: 'ti-receipt-tax',
      severidade: tarifas > 100 ? 'alta' : 'media',
      titulo: 'Tarifas, IOF e anuidades',
      texto: `Você pagou ${fmtBRL(tarifas)} em tarifas/IOF/anuidades de cartões e contas. Cada cartão extra cobra anuidade e gera IOF — consolidar reduz isso.`,
      numero: `${pct(tarifas)}% do gasto real`,
    })
  }

  return out.sort((a, b) => (b.severidade === 'alta' ? 1 : 0) - (a.severidade === 'alta' ? 1 : 0))
}

// =====================================================================
// Auxiliares de UI
// =====================================================================
function KPI({ T, dark, label, valor, detalhe, cor, icon }) {
  return (
    <Card T={T} dark={dark}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 14, color: cor }} aria-hidden="true" />}
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
      }}>
        {valor}
      </div>
      {detalhe && (
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
          {detalhe}
        </div>
      )}
    </Card>
  )
}

function Barras({ T, dark, itens, total, cor }) {
  if (!itens || itens.length === 0) {
    return <EmptyState T={T} compact icon="ti-chart-bar" title="Sem dados" description="" />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {itens.map(i => {
        const pct = total > 0 ? Math.round((i.valor / total) * 100) : 0
        return (
          <div key={i.label}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12.5, marginBottom: 4,
            }}>
              <span style={{ color: T.textSecondary }}>{i.label}</span>
              <span style={{
                color: corHero(dark), fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtBRL(i.valor, { fr: true })}
                <span style={{ color: T.textMuted, fontWeight: 400, marginLeft: 6 }}>
                  · {pct}%
                </span>
              </span>
            </div>
            <div style={{
              width: '100%', height: 8, borderRadius: 5,
              background: T.cardAlt, overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`, height: '100%', background: cor,
                transition: 'width .3s',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListaMaiores({ T, dark, itens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {itens.map((d, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '32px 1fr 130px 110px',
          gap: 12, alignItems: 'center',
          padding: '10px 8px',
          borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: T.textMuted, textAlign: 'center',
          }}>#{i + 1}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: corHero(dark),
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {d.descricao}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              {d.origem} · {d.data}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge variant="amarelo" dark={dark} sm>{d.categoria}</Badge>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: corEtapa('yellow', dark),
            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtBRL(d.valor, { fr: true })}
          </div>
        </div>
      ))}
    </div>
  )
}
