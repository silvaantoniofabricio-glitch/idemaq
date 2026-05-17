// idemaq-src/pages/Financeiro.jsx
// Tela de Financeiro — Visão / A Receber / A Pagar / Caixa (Módulo 07).
// Reformulada com inspiração no Bling: barra de filtros horizontal compacta,
// KPI strip, tabela real com checkbox + ordenação, bulk action bar flutuante,
// rodapé com totais. Caixa permanece read-only (regra de negócio).
// Tabela `lancamento_financeiro` é Schema parte 2 — ainda em mock.

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL, fmtPrazoCurto } from '../utils/fmt'
import {
  Card, SubCard, Button, Badge, Input, Tabs,
  EmptyState, PageHeader, SectionHeader, ChipToggle,
  useToast,
} from '../components/ui'
import LancamentoDetalheModal from '../components/financeiro/LancamentoDetalheModal'

// ============================================================================
// CENÁRIO + MOCKS
// ============================================================================
const META_MES = 20000

const HOJE = new Date()
const isoMaisDias = (d) => {
  const x = new Date(HOJE)
  x.setDate(x.getDate() + d)
  return x.toISOString().slice(0, 10)
}

const CATEGORIAS_RECEITA = ['Limpeza', 'Manutenção', 'Peças', 'Venda de máquina', 'Taxa diagnóstico', 'Outros']
const CATEGORIAS_DESPESA = ['Funcionários', 'Peças ML', 'Marketing', 'Utilidades', 'Combustível', 'Materiais', 'Impostos', 'Financiamento']
const CONTAS = ['Cresol', 'Bradesco', 'Bradesco PJ', 'Mercado Pago', 'InfinitePay D+1', 'Cartão Inter PJ']
const FORMAS = ['PIX', 'Dinheiro', 'Cartão 1x', 'Cartão 2x', 'Cartão 3x', 'Boleto', 'Link InfinitePay']

// A receber — incluindo algumas já pagas pra demo do filtro de status
const A_RECEBER_MOCK = [
  { id:1, osNum:241, cliente:'Paula Mendes',     descricao:'Manutenção + Limpeza',    categoria:'Manutenção',      conta:'Bradesco',         valor:480, vencimento:isoMaisDias(-15), forma:'Boleto',            status:'aberto' },
  { id:2, osNum:243, cliente:'Maria Silva',      descricao:'Limpeza combinada x2',    categoria:'Limpeza',         conta:'InfinitePay D+1',  valor:330, vencimento:isoMaisDias(-5),  forma:'Cartão 2x',         status:'aberto' },
  { id:3, osNum:245, cliente:'Carlos Lima',      descricao:'Manutenção',              categoria:'Manutenção',      conta:'Cresol',           valor:185, vencimento:isoMaisDias(-1),  forma:'PIX',               status:'aberto' },
  { id:4, osNum:247, cliente:'Ana Reis',         descricao:'Limpeza + capa',          categoria:'Limpeza',         conta:'InfinitePay D+1',  valor:270, vencimento:isoMaisDias(0),   forma:'Link InfinitePay',  status:'aberto' },
  { id:5, osNum:248, cliente:'Roberto Dias',     descricao:'Manutenção + mangueira',  categoria:'Manutenção',      conta:'InfinitePay D+1',  valor:415, vencimento:isoMaisDias(1),   forma:'Cartão 1x',         status:'aberto' },
  { id:6, osNum:249, cliente:'João Costa',       descricao:'Limpeza',                 categoria:'Limpeza',         conta:'Cresol',           valor:185, vencimento:isoMaisDias(3),   forma:'PIX',               status:'aberto' },
  { id:7, osNum:250, cliente:'Igor Vasconcelos', descricao:'Venda máquina reformada', categoria:'Venda de máquina',conta:'InfinitePay D+1',  valor:650, vencimento:isoMaisDias(5),   forma:'Cartão 3x',         status:'aberto' },
  { id:8, osNum:251, cliente:'Pedro Alves',      descricao:'Manutenção + Limpeza',    categoria:'Manutenção',      conta:'Bradesco',         valor:480, vencimento:isoMaisDias(7),   forma:'Boleto',            status:'aberto' },
  { id:9, osNum:239, cliente:'Maria Silva',      descricao:'Limpeza',                 categoria:'Limpeza',         conta:'Bradesco',         valor:185, vencimento:isoMaisDias(-1),  forma:'PIX',               status:'pago', dataPag:isoMaisDias(-1) },
  { id:10,osNum:240, cliente:'Pedro Alves',      descricao:'Manutenção',              categoria:'Manutenção',      conta:'Cresol',           valor:350, vencimento:isoMaisDias(-2),  forma:'PIX',               status:'pago', dataPag:isoMaisDias(-2) },
]

const A_PAGAR_MOCK = [
  { id:1, descricao:'Salário Alessandro',   fornecedor:'Folha',           categoria:'Funcionários', conta:'Cresol',     valor:1650, vencimento:isoMaisDias(2),  forma:'PIX',        recorrente:true,  status:'aberto' },
  { id:2, descricao:'Salário Guilherme',    fornecedor:'Folha',           categoria:'Funcionários', conta:'Cresol',     valor:1650, vencimento:isoMaisDias(2),  forma:'PIX',        recorrente:true,  status:'aberto' },
  { id:3, descricao:'Tráfego pago Meta',    fornecedor:'Meta',            categoria:'Marketing',    conta:'Bradesco PJ',valor:500,  vencimento:isoMaisDias(5),  forma:'Cartão 1x',  recorrente:true,  status:'aberto' },
  { id:4, descricao:'Compra de peças ML',   fornecedor:'Mercado Livre',   categoria:'Peças ML',     conta:'Bradesco PJ',valor:820,  vencimento:isoMaisDias(-2), forma:'Boleto',     recorrente:false, status:'aberto' },
  { id:5, descricao:'Energia elétrica',     fornecedor:'Energisa',        categoria:'Utilidades',   conta:'Cresol',     valor:310,  vencimento:isoMaisDias(8),  forma:'Boleto',     recorrente:true,  status:'aberto' },
  { id:6, descricao:'Internet + telefone',  fornecedor:'Vivo',            categoria:'Utilidades',   conta:'Bradesco',   valor:180,  vencimento:isoMaisDias(10), forma:'Boleto',     recorrente:true,  status:'aberto' },
  { id:7, descricao:'Combustível',          fornecedor:'Posto Shell',     categoria:'Combustível',  conta:'Cartão Inter PJ', valor:420, vencimento:isoMaisDias(0), forma:'Cartão 1x', recorrente:false, status:'aberto' },
  { id:8, descricao:'Material de limpeza',  fornecedor:'Atacado MS',      categoria:'Materiais',    conta:'Cresol',     valor:145,  vencimento:isoMaisDias(12), forma:'PIX',        recorrente:false, status:'aberto' },
  { id:9, descricao:'Peças ML — abril',     fornecedor:'Mercado Livre',   categoria:'Peças ML',     conta:'Bradesco PJ',valor:620,  vencimento:isoMaisDias(-3), forma:'Boleto',     recorrente:false, status:'pago', dataPag:isoMaisDias(-3) },
]

const CAIXA_MOCK = [
  { id:1,  tipo:'receita', descricao:'OS #239 — Maria Silva',     categoria:'Limpeza',     valor:185, data:isoMaisDias(-1), conta:'Bradesco',         forma:'PIX' },
  { id:2,  tipo:'despesa', descricao:'Combustível semana',         categoria:'Combustível', valor:180, data:isoMaisDias(-1), conta:'Cartão Inter PJ',  forma:'Cartão 1x' },
  { id:3,  tipo:'receita', descricao:'OS #240 — Pedro Alves',     categoria:'Manutenção',  valor:350, data:isoMaisDias(-2), conta:'Cresol',           forma:'PIX' },
  { id:4,  tipo:'receita', descricao:'OS #238 — Ana Reis',        categoria:'Manutenção',  valor:480, data:isoMaisDias(-3), conta:'InfinitePay D+1', forma:'Cartão 2x' },
  { id:5,  tipo:'despesa', descricao:'Peças ML — abril',           categoria:'Peças ML',    valor:620, data:isoMaisDias(-3), conta:'Bradesco PJ',     forma:'Boleto' },
  { id:6,  tipo:'receita', descricao:'OS #237 — João Costa',      categoria:'Limpeza',     valor:185, data:isoMaisDias(-4), conta:'Bradesco',         forma:'PIX' },
  { id:7,  tipo:'receita', descricao:'Venda M-201 — Carlos Lima', categoria:'Venda de máquina', valor:650, data:isoMaisDias(-5), conta:'InfinitePay D+1', forma:'Cartão 3x' },
  { id:8,  tipo:'despesa', descricao:'Pró-labore parcial',         categoria:'Funcionários',valor:800, data:isoMaisDias(-6), conta:'Cresol',           forma:'PIX' },
  { id:9,  tipo:'receita', descricao:'OS #236 — Roberto Dias',    categoria:'Manutenção',  valor:295, data:isoMaisDias(-7), conta:'Cresol',           forma:'PIX' },
  { id:10, tipo:'receita', descricao:'OS #235 — Paula Mendes',    categoria:'Manutenção',  valor:415, data:isoMaisDias(-8), conta:'InfinitePay D+1', forma:'Cartão 2x' },
]

const ABAS = [
  { id:'visao',   label:'Visão geral', icon:'ti-layout-dashboard' },
  { id:'receber', label:'A receber',   icon:'ti-arrow-down-circle' },
  { id:'pagar',   label:'A pagar',     icon:'ti-arrow-up-circle' },
  { id:'caixa',   label:'Caixa',       icon:'ti-cash-banknote' },
]

// Presets de período — estilo Bling
const PERIODOS = [
  { id:'7d',     label:'Últimos 7d',  dias:7 },
  { id:'mes',    label:'Mês atual',   mes:true },
  { id:'30d',    label:'Próximos 30d',dias:30, futuro:true },
  { id:'90d',    label:'Próximos 90d',dias:90, futuro:true },
  { id:'todos',  label:'Todos',       all:true },
]

// ============================================================================
// HELPERS
// ============================================================================
function statusVencimento(isoData) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const d = new Date(isoData + 'T00:00:00')
  const diff = Math.round((d - hoje) / 86400000)
  if (diff < 0)   return { tipo:'vencido', dias:-diff, label:`Venceu há ${-diff}d` }
  if (diff === 0) return { tipo:'hoje',    dias:0,     label:'Vence hoje' }
  if (diff === 1) return { tipo:'amanha',  dias:1,     label:'Amanhã' }
  return            { tipo:'futuro',  dias:diff,  label:`Em ${diff}d` }
}

function StatusBadgePag({ item, dark }) {
  if (item.status === 'pago') {
    return (
      <Badge variant="azulClaro" dark={dark} sm>
        <i className="ti ti-circle-check" aria-hidden="true" /> Pago
      </Badge>
    )
  }
  const st = statusVencimento(item.vencimento)
  const map = {
    vencido: { variant:'vermelho', icon:'ti-alert-triangle' },
    hoje:    { variant:'amarelo',  icon:'ti-clock' },
    amanha:  { variant:'amarelo',  icon:'ti-calendar-due' },
    futuro:  { variant:'azul',     icon:'ti-calendar-event' },
  }
  const cfg = map[st.tipo] || map.futuro
  return (
    <Badge variant={cfg.variant} dark={dark} sm>
      <i className={`ti ${cfg.icon}`} aria-hidden="true" /> {st.label}
    </Badge>
  )
}

// Aplica filtro de período (id ou {de, ate})
function filtrarPorPeriodo(itens, periodo, campoData) {
  if (periodo.id === 'todos') return itens
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  let de, ate
  if (periodo.id === 'custom') {
    de = periodo.de  ? new Date(periodo.de  + 'T00:00:00') : null
    ate = periodo.ate ? new Date(periodo.ate + 'T23:59:59') : null
  } else {
    const cfg = PERIODOS.find(p => p.id === periodo.id) || PERIODOS[1]
    if (cfg.mes) {
      de  = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
      ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)
    } else if (cfg.futuro) {
      de = hoje
      ate = new Date(hoje); ate.setDate(ate.getDate() + cfg.dias)
    } else {
      ate = hoje
      de  = new Date(hoje); de.setDate(de.getDate() - cfg.dias)
    }
  }
  return itens.filter(it => {
    if (!it[campoData]) return true
    const d = new Date(it[campoData] + 'T00:00:00')
    if (de  && d < de)  return false
    if (ate && d > ate) return false
    return true
  })
}

function labelPeriodo(periodo) {
  if (periodo.id === 'custom') {
    const fmt = (s) => s ? s.split('-').reverse().join('/') : '...'
    return `${fmt(periodo.de)} → ${fmt(periodo.ate)}`
  }
  return (PERIODOS.find(p => p.id === periodo.id) || PERIODOS[1]).label
}

// ============================================================================
// PÁGINA
// ============================================================================
export default function Financeiro({ T, dark }) {
  const notify = useToast()
  const [aba, setAba] = useState('visao')
  const [receber, setReceber] = useState(A_RECEBER_MOCK)
  const [pagar, setPagar]     = useState(A_PAGAR_MOCK)
  const [caixa, setCaixa]     = useState(CAIXA_MOCK)
  const [selecionado, setSelecionado] = useState(null)

  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde    = corEtapa('green', dark)

  // KPIs de topo (visão geral) e badge contadores na tab
  const recebidoMes  = caixa.filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0)
  const pagoMes      = caixa.filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0)
  const saldoCaixa   = recebidoMes - pagoMes
  const totalReceber = receber.filter(r => r.status === 'aberto').reduce((s, r) => s + r.valor, 0)
  const totalPagar   = pagar.filter(p => p.status === 'aberto').reduce((s, p) => s + p.valor, 0)
  const vencidos     = receber.filter(r => r.status === 'aberto' && statusVencimento(r.vencimento).tipo === 'vencido')
  const totalVencido = vencidos.reduce((s, r) => s + r.valor, 0)
  const pctMeta      = Math.min(100, Math.round((recebidoMes / META_MES) * 100))
  const faltaMeta    = Math.max(0, META_MES - recebidoMes)

  function placeholder(msg) { notify('info', msg || 'Em breve — Módulo 07 do plano') }

  // ─── Ações comuns ────────────────────────────────────────────────────────
  function baixarReceber(item) {
    setReceber(prev => prev.map(r => r.id === item.id ? { ...r, status:'pago', dataPag:isoMaisDias(0) } : r))
    setCaixa(prev => [{
      id:`r-${Date.now()}-${item.id}`, tipo:'receita',
      descricao:`OS #${item.osNum} — ${item.cliente}`,
      categoria:item.categoria, valor:item.valor,
      data:isoMaisDias(0), conta:item.conta, forma:item.forma,
    }, ...prev])
    notify('ok', `Recebimento de ${fmtBRL(item.valor)} confirmado`)
    setSelecionado(null)
  }

  function baixarPagar(item) {
    setPagar(prev => prev.map(p => p.id === item.id ? { ...p, status:'pago', dataPag:isoMaisDias(0) } : p))
    setCaixa(prev => [{
      id:`p-${Date.now()}-${item.id}`, tipo:'despesa',
      descricao:item.descricao, categoria:item.categoria, valor:item.valor,
      data:isoMaisDias(0), conta:item.conta, forma:item.forma,
    }, ...prev])
    notify('ok', `Pagamento de ${fmtBRL(item.valor)} registrado`)
    setSelecionado(null)
  }

  function excluirLancamento(item, tipo) {
    if (tipo === 'receber') setReceber(prev => prev.filter(r => r.id !== item.id))
    else if (tipo === 'pagar') setPagar(prev => prev.filter(p => p.id !== item.id))
    else if (tipo === 'caixa') setCaixa(prev => prev.filter(m => m.id !== item.id))
    notify('ok', 'Lançamento excluído')
    setSelecionado(null)
  }

  function baixarLote(ids, tipo) {
    if (tipo === 'receber') {
      const itens = receber.filter(r => ids.includes(r.id) && r.status === 'aberto')
      itens.forEach(it => baixarReceber(it))
      notify('ok', `${itens.length} recebimentos confirmados`)
    } else {
      const itens = pagar.filter(p => ids.includes(p.id) && p.status === 'aberto')
      itens.forEach(it => baixarPagar(it))
      notify('ok', `${itens.length} pagamentos registrados`)
    }
  }

  // ─── Contadores das tabs ─────────────────────────────────────────────────
  const abasComContador = ABAS.map(a => {
    let count = null
    if (a.id === 'receber') count = receber.filter(r => r.status === 'aberto').length
    if (a.id === 'pagar')   count = pagar.filter(p => p.status === 'aberto').length
    return { ...a, count }
  })

  return (
    <div style={{
      padding:'20px 24px 32px', overflowY:'auto', flex:1,
      display:'flex', flexDirection:'column', gap:14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Financeiro"
        subtitle="Contas a receber, contas a pagar e caixa"
        stats={[
          { label:'Saldo do caixa', value:fmtBRL(saldoCaixa), color:corHero(dark) },
          { label:'A receber',      value:fmtBRL(totalReceber), color:azul },
          { label:'A pagar',        value:fmtBRL(totalPagar),  color:amarelo },
          { label:'Vencidos',       value:vencidos.length,
            color:vencidos.length > 0 ? vermelho : T.textDim },
        ]}
        actions={
          <div style={{ display:'flex', gap:8 }}>
            <Button variant="secondary" T={T} dark={dark} iconLeft="ti-file-import"
              onClick={() => placeholder('Importar OFX/CSV — Módulo 07 chat 5')}>
              Importar
            </Button>
            <Button variant="primary" iconLeft="ti-plus"
              onClick={() => placeholder('Novo lançamento (avulso/parcelado/recorrente) em breve')}>
              Novo lançamento
            </Button>
          </div>
        }
      />

      <Card T={T} dark={dark} padding="6px 8px">
        <TabsComContador T={T} dark={dark} abas={abasComContador} value={aba} onChange={setAba} />
      </Card>

      {aba === 'visao' && (
        <VisaoGeral T={T} dark={dark}
          recebidoMes={recebidoMes} pagoMes={pagoMes} saldoCaixa={saldoCaixa}
          pctMeta={pctMeta} faltaMeta={faltaMeta} meta={META_MES}
          vencidos={vencidos} totalVencido={totalVencido}
          totalReceber={totalReceber} totalPagar={totalPagar}
          onIrParaReceber={() => setAba('receber')}
        />
      )}

      {aba === 'receber' && (
        <ListaLancamentos T={T} dark={dark}
          itens={receber} tipo="receber"
          categorias={CATEGORIAS_RECEITA} contas={CONTAS}
          onAbrir={(item) => setSelecionado({ tipo:'receber', item })}
          onBaixarUm={baixarReceber}
          onBaixarLote={(ids) => baixarLote(ids, 'receber')}
          onExcluir={(item) => excluirLancamento(item, 'receber')}
          notify={notify}
        />
      )}

      {aba === 'pagar' && (
        <ListaLancamentos T={T} dark={dark}
          itens={pagar} tipo="pagar"
          categorias={CATEGORIAS_DESPESA} contas={CONTAS}
          onAbrir={(item) => setSelecionado({ tipo:'pagar', item })}
          onBaixarUm={baixarPagar}
          onBaixarLote={(ids) => baixarLote(ids, 'pagar')}
          onExcluir={(item) => excluirLancamento(item, 'pagar')}
          notify={notify}
        />
      )}

      {aba === 'caixa' && (
        <ListaCaixa T={T} dark={dark}
          itens={caixa} contas={CONTAS}
          onAbrir={(item) => setSelecionado({ tipo:'caixa', item })}
        />
      )}

      {selecionado && (
        <LancamentoDetalheModal T={T} dark={dark}
          lancamento={selecionado.item} tipo={selecionado.tipo}
          onClose={() => setSelecionado(null)}
          onBaixar={(item) => {
            if (selecionado.tipo === 'receber') baixarReceber(item)
            else if (selecionado.tipo === 'pagar') baixarPagar(item)
          }}
          onEditar={() => placeholder('Edição de lançamento em breve — schema parte 2')}
          onExcluir={(item) => excluirLancamento(item, selecionado.tipo)}
        />
      )}
    </div>
  )
}

// ============================================================================
// TABS com contador (badge no canto da label)
// ============================================================================
function TabsComContador({ T, dark, abas, value, onChange }) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c
  return (
    <div style={{ display:'flex', gap:4, padding:2, flexWrap:'wrap' }}>
      {abas.map(a => {
        const ativo = a.id === value
        return (
          <button key={a.id} onClick={() => onChange(a.id)}
            style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'8px 14px', borderRadius:8,
              border:`1px solid ${ativo ? azul : 'transparent'}`,
              background: ativo ? cor('#0d2035', '#e6f1fb') : 'transparent',
              color: ativo ? azul : T.textMuted,
              fontWeight: ativo ? 700 : 500,
              fontSize:13, cursor:'pointer', fontFamily:'inherit',
              transition:'all .12s',
            }}>
            <i className={`ti ${a.icon}`} style={{ fontSize:15 }} aria-hidden="true" />
            {a.label}
            {a.count != null && a.count > 0 && (
              <span style={{
                background: ativo ? azul : T.cardAlt,
                color: ativo ? '#fff' : T.textSecondary,
                fontSize:10.5, fontWeight:700,
                padding:'1px 6px', borderRadius:10,
                fontVariantNumeric:'tabular-nums', minWidth:18, textAlign:'center',
              }}>{a.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ============================================================================
// BARRA DE FILTROS (Bling-style) — período + status + busca + categoria/conta
// ============================================================================
function BarraFiltros({
  T, dark, tipo,
  periodo, setPeriodo,
  statusFilt, setStatusFilt,
  busca, setBusca,
  categoria, setCategoria, categorias,
  conta, setConta, contas,
  onLimpar, podeLimpar,
}) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c
  const [periodoAberto, setPeriodoAberto] = useState(false)
  const periodoRef = useRef(null)

  // Click-fora pra fechar dropdown do período
  useEffect(() => {
    function handler(e) {
      if (periodoRef.current && !periodoRef.current.contains(e.target)) setPeriodoAberto(false)
    }
    if (periodoAberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [periodoAberto])

  const statusOpts = [
    { id:'todos',   label:'Todos' },
    { id:'aberto',  label:tipo === 'receber' ? 'A receber' : 'A pagar' },
    { id:'vencido', label:'Vencidas' },
    { id:'pago',    label:tipo === 'receber' ? 'Recebidas' : 'Pagas' },
  ]

  return (
    <Card T={T} dark={dark}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>

        {/* Período (dropdown) */}
        <div ref={periodoRef} style={{ position:'relative' }}>
          <button onClick={() => setPeriodoAberto(o => !o)}
            style={{
              display:'inline-flex', alignItems:'center', gap:8,
              padding:'8px 12px', borderRadius:8,
              border:`1px solid ${T.border}`,
              background: T.cardAlt, color: T.textPrimary,
              fontSize:12.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
              minWidth:180,
            }}>
            <i className="ti ti-calendar" style={{ fontSize:15, color:azul }} aria-hidden="true" />
            <span style={{ flex:1, textAlign:'left' }}>{labelPeriodo(periodo)}</span>
            <i className={`ti ${periodoAberto ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize:14, color:T.textMuted }} aria-hidden="true" />
          </button>

          {periodoAberto && (
            <div style={{
              position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:50,
              minWidth:260,
              background: T.card, border:`1px solid ${T.border}`,
              borderRadius:10, boxShadow:'0 10px 30px rgba(0,0,0,0.18)',
              padding:8,
            }}>
              {PERIODOS.map(p => {
                const ativo = periodo.id === p.id
                return (
                  <button key={p.id}
                    onClick={() => { setPeriodo({ id:p.id }); setPeriodoAberto(false) }}
                    style={{
                      display:'flex', alignItems:'center', gap:8, width:'100%',
                      padding:'8px 10px', borderRadius:6,
                      border:'none', background: ativo ? cor('#0d2035','#e6f1fb') : 'transparent',
                      color: ativo ? azul : T.textSecondary,
                      fontSize:12.5, fontWeight: ativo ? 700 : 500,
                      cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                    }}>
                    {ativo && <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" />}
                    {!ativo && <span style={{ width:13 }} />}
                    {p.label}
                  </button>
                )
              })}
              <div style={{ height:1, background:T.border, margin:'6px 4px' }} />
              <div style={{ padding:'4px 6px 2px', fontSize:10.5, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>
                Personalizado
              </div>
              <div style={{ display:'flex', gap:6, padding:6 }}>
                <input type="date" value={periodo.de  || ''} onChange={e => setPeriodo({ id:'custom', de:e.target.value,  ate:periodo.ate })}
                  style={inputDate(T)} />
                <input type="date" value={periodo.ate || ''} onChange={e => setPeriodo({ id:'custom', de:periodo.de, ate:e.target.value })}
                  style={inputDate(T)} />
              </div>
            </div>
          )}
        </div>

        {/* Status chips */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {statusOpts.map(s => (
            <ChipToggle key={s.id} T={T} dark={dark}
              ativo={statusFilt === s.id} onClick={() => setStatusFilt(s.id)}>
              {s.label}
            </ChipToggle>
          ))}
        </div>

        <div style={{ flex:1, minWidth:180 }}>
          <Input T={T} dark={dark}
            value={busca} onChange={setBusca}
            icon="ti-search"
            placeholder={tipo === 'receber'
              ? 'Buscar por cliente, OS ou descrição…'
              : 'Buscar por descrição ou fornecedor…'} />
        </div>

        <select value={categoria} onChange={e => setCategoria(e.target.value)} style={selectStyle(T)}>
          <option value="">Categoria (todas)</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={conta} onChange={e => setConta(e.target.value)} style={selectStyle(T)}>
          <option value="">Conta (todas)</option>
          {contas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {podeLimpar && (
          <Button T={T} dark={dark} variant="ghost" size="sm" iconLeft="ti-x" onClick={onLimpar}>
            Limpar
          </Button>
        )}
      </div>
    </Card>
  )
}

function inputDate(T) {
  return {
    padding:'6px 8px', fontSize:12, borderRadius:6,
    border:`1px solid ${T.border}`, background:T.card, color:T.textPrimary,
    fontFamily:'inherit', flex:1, outline:'none',
  }
}

function selectStyle(T) {
  return {
    padding:'8px 10px', borderRadius:8,
    border:`1px solid ${T.border}`, background:T.cardAlt, color:T.textPrimary,
    fontSize:12.5, fontFamily:'inherit', cursor:'pointer', outline:'none',
    minWidth:160,
  }
}

// ============================================================================
// LISTA — A RECEBER / A PAGAR (compartilhada via prop `tipo`)
// ============================================================================
function ListaLancamentos({
  T, dark, itens, tipo,
  categorias, contas,
  onAbrir, onBaixarUm, onBaixarLote, onExcluir, notify,
}) {
  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const corT     = tipo === 'receber' ? azul : amarelo

  const [periodo, setPeriodo]       = useState({ id:'mes' })
  const [statusFilt, setStatusFilt] = useState('aberto')
  const [busca, setBusca]           = useState('')
  const [categoria, setCategoria]   = useState('')
  const [conta, setConta]           = useState('')
  const [selecao, setSelecao]       = useState([])    // ids selecionados
  const [ordem, setOrdem]           = useState({ campo:'vencimento', dir:'asc' })
  const [menuLinha, setMenuLinha]   = useState(null)

  const podeLimpar = periodo.id !== 'mes' || statusFilt !== 'aberto' || busca || categoria || conta
  function limpar() {
    setPeriodo({ id:'mes' }); setStatusFilt('aberto')
    setBusca(''); setCategoria(''); setConta(''); setSelecao([])
  }

  // ─── Filtragem ───────────────────────────────────────────────────────────
  const filtrados = useMemo(() => {
    let arr = filtrarPorPeriodo(itens, periodo, 'vencimento')
    if (statusFilt === 'aberto') arr = arr.filter(i => i.status === 'aberto')
    else if (statusFilt === 'pago') arr = arr.filter(i => i.status === 'pago')
    else if (statusFilt === 'vencido') arr = arr.filter(i =>
      i.status === 'aberto' && statusVencimento(i.vencimento).tipo === 'vencido'
    )
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      arr = arr.filter(i =>
        (i.descricao || '').toLowerCase().includes(q) ||
        (i.cliente   || '').toLowerCase().includes(q) ||
        (i.fornecedor|| '').toLowerCase().includes(q) ||
        (i.categoria || '').toLowerCase().includes(q) ||
        String(i.osNum || '').includes(q)
      )
    }
    if (categoria) arr = arr.filter(i => i.categoria === categoria)
    if (conta)     arr = arr.filter(i => i.conta === conta)
    return arr
  }, [itens, periodo, statusFilt, busca, categoria, conta])

  // ─── Ordenação ───────────────────────────────────────────────────────────
  const ordenados = useMemo(() => {
    const dir = ordem.dir === 'asc' ? 1 : -1
    return [...filtrados].sort((a, b) => {
      let av = a[ordem.campo], bv = b[ordem.campo]
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir
      return ((av || 0) - (bv || 0)) * dir
    })
  }, [filtrados, ordem])

  function toggleOrdem(campo) {
    setOrdem(o => o.campo === campo ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { campo, dir:'asc' })
  }

  // ─── Seleção ─────────────────────────────────────────────────────────────
  const idsFiltrados = ordenados.filter(i => i.status === 'aberto').map(i => i.id)
  const todosMarcados = idsFiltrados.length > 0 && idsFiltrados.every(id => selecao.includes(id))
  function toggleTodos() {
    if (todosMarcados) setSelecao([])
    else setSelecao(idsFiltrados)
  }
  function toggleUm(id) {
    setSelecao(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const totalFiltrado = ordenados.reduce((s, i) => s + i.valor, 0)
  const totalSelecionado = ordenados.filter(i => selecao.includes(i.id)).reduce((s, i) => s + i.valor, 0)

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <BarraFiltros T={T} dark={dark} tipo={tipo}
        periodo={periodo} setPeriodo={setPeriodo}
        statusFilt={statusFilt} setStatusFilt={setStatusFilt}
        busca={busca} setBusca={setBusca}
        categoria={categoria} setCategoria={setCategoria} categorias={categorias}
        conta={conta} setConta={setConta} contas={contas}
        onLimpar={limpar} podeLimpar={podeLimpar}
      />

      {/* KPI strip */}
      <KpiStrip T={T} dark={dark} tipo={tipo} itens={ordenados} corT={corT} />

      {/* Tabela */}
      {ordenados.length === 0 ? (
        <EmptyState T={T}
          icon="ti-search-off"
          title="Nenhum lançamento no filtro"
          description="Ajuste o período ou os filtros."
          compact height="auto"
        />
      ) : (
        <Card T={T} dark={dark} padding={0}>
          <table style={{
            width:'100%', borderCollapse:'separate', borderSpacing:0,
            fontSize:13, color:T.textPrimary,
          }}>
            <thead>
              <tr style={{ background:T.cardAlt }}>
                <Th T={T} style={{ width:36 }}>
                  <input type="checkbox" checked={todosMarcados} onChange={toggleTodos}
                    aria-label="Selecionar tudo" />
                </Th>
                <Th T={T} sortable ativa={ordem.campo === 'vencimento'} dir={ordem.dir}
                  onClick={() => toggleOrdem('vencimento')} style={{ width:120 }}>
                  Vencimento
                </Th>
                <Th T={T} sortable ativa={ordem.campo === (tipo === 'receber' ? 'cliente' : 'descricao')} dir={ordem.dir}
                  onClick={() => toggleOrdem(tipo === 'receber' ? 'cliente' : 'descricao')}>
                  {tipo === 'receber' ? 'Cliente' : 'Fornecedor / descrição'}
                </Th>
                <Th T={T} style={{ width:140 }}>Categoria</Th>
                <Th T={T} style={{ width:120 }}>Conta</Th>
                <Th T={T} style={{ width:110 }}>Status</Th>
                <Th T={T} sortable ativa={ordem.campo === 'valor'} dir={ordem.dir}
                  onClick={() => toggleOrdem('valor')}
                  style={{ width:120, textAlign:'right' }}>
                  Valor
                </Th>
                <Th T={T} style={{ width:48 }} />
              </tr>
            </thead>
            <tbody>
              {ordenados.map(it => {
                const selecionado = selecao.includes(it.id)
                const pago = it.status === 'pago'
                return (
                  <tr key={it.id}
                    onClick={() => onAbrir(it)}
                    style={{
                      cursor:'pointer',
                      background: selecionado ? bgEtapa('blue', dark) : 'transparent',
                      transition:'background .12s',
                    }}
                    onMouseEnter={e => { if (!selecionado) e.currentTarget.style.background = T.cardAlt }}
                    onMouseLeave={e => { if (!selecionado) e.currentTarget.style.background = 'transparent' }}
                  >
                    <Td T={T} onClick={e => e.stopPropagation()}>
                      {!pago && (
                        <input type="checkbox" checked={selecionado} onChange={() => toggleUm(it.id)}
                          aria-label={`Selecionar ${it.descricao}`} />
                      )}
                    </Td>
                    <Td T={T}>
                      <div style={{ fontSize:12.5, fontWeight:600, color:corHero(dark), fontVariantNumeric:'tabular-nums' }}>
                        {fmtPrazoCurto(it.vencimento)}
                      </div>
                      {it.recorrente && (
                        <div style={{ fontSize:10.5, color:T.textMuted, display:'flex', alignItems:'center', gap:3, marginTop:2 }}>
                          <i className="ti ti-rotate-clockwise" style={{ fontSize:11 }} aria-hidden="true" />
                          recorrente
                        </div>
                      )}
                    </Td>
                    <Td T={T}>
                      <div style={{ fontSize:13, fontWeight:600, color:corHero(dark), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:340 }}>
                        {tipo === 'receber' ? it.cliente : it.descricao}
                      </div>
                      <div style={{ fontSize:11, color:T.textMuted, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:340 }}>
                        {tipo === 'receber'
                          ? <>OS #{it.osNum} · {it.descricao}</>
                          : <>{it.fornecedor} · {it.forma}</>}
                      </div>
                    </Td>
                    <Td T={T}>
                      <span style={{
                        display:'inline-block', padding:'2px 8px', borderRadius:10,
                        background:T.cardAlt, border:`1px solid ${T.border}`,
                        fontSize:11, color:T.textSecondary,
                      }}>
                        {it.categoria}
                      </span>
                    </Td>
                    <Td T={T}>
                      <div style={{ fontSize:11.5, color:T.textSecondary, display:'flex', alignItems:'center', gap:5 }}>
                        <i className="ti ti-building-bank" style={{ fontSize:12, color:T.textMuted }} aria-hidden="true" />
                        {it.conta}
                      </div>
                    </Td>
                    <Td T={T}>
                      <StatusBadgePag item={it} dark={dark} />
                    </Td>
                    <Td T={T} style={{ textAlign:'right' }}>
                      <span style={{
                        fontSize:13.5, fontWeight:700,
                        color: pago ? T.textDim : corHero(dark),
                        textDecoration: pago ? 'line-through' : 'none',
                        fontVariantNumeric:'tabular-nums',
                      }}>{fmtBRL(it.valor)}</span>
                    </Td>
                    <Td T={T} onClick={e => e.stopPropagation()} style={{ textAlign:'center' }}>
                      <MenuLinha T={T} dark={dark}
                        aberto={menuLinha === it.id}
                        onToggle={() => setMenuLinha(menuLinha === it.id ? null : it.id)}
                        onClose={() => setMenuLinha(null)}
                        opcoes={[
                          !pago && {
                            id:'baixar',
                            label: tipo === 'receber' ? 'Receber' : 'Pagar',
                            icon:'ti-check', destaque:true,
                            onClick: () => onBaixarUm(it),
                          },
                          { id:'editar',   label:'Editar',     icon:'ti-pencil',
                            onClick: () => { notify('info', 'Edição — schema parte 2') } },
                          { id:'duplicar', label:'Duplicar',   icon:'ti-copy',
                            onClick: () => notify('info', 'Duplicar — schema parte 2') },
                          { id:'excluir',  label:'Excluir',    icon:'ti-trash', perigo:true,
                            onClick: () => onExcluir(it) },
                        ].filter(Boolean)}
                      />
                    </Td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:T.cardAlt }}>
                <Td T={T} colSpan={6} style={{
                  fontSize:11.5, color:T.textMuted, padding:'10px 12px',
                  fontVariantNumeric:'tabular-nums',
                }}>
                  {ordenados.length} lançamento{ordenados.length === 1 ? '' : 's'}
                  {selecao.length > 0 && (
                    <> · <span style={{ color:corT, fontWeight:600 }}>{selecao.length} selecionado{selecao.length === 1 ? '' : 's'}</span></>
                  )}
                </Td>
                <Td T={T} style={{ textAlign:'right', padding:'10px 12px' }}>
                  <span style={{ fontSize:11, color:T.textMuted, marginRight:8 }}>Total filtrado</span>
                  <span style={{ fontSize:14, fontWeight:800, color:corHero(dark), fontVariantNumeric:'tabular-nums' }}>
                    {fmtBRL(totalFiltrado)}
                  </span>
                </Td>
                <Td T={T} />
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      {/* Bulk action bar flutuante */}
      {selecao.length > 0 && (
        <BulkBar T={T} dark={dark} tipo={tipo}
          count={selecao.length} total={totalSelecionado}
          onBaixar={() => { onBaixarLote(selecao); setSelecao([]) }}
          onLimpar={() => setSelecao([])}
        />
      )}
    </>
  )
}

// ============================================================================
// KPI STRIP — 4 cards compactos no topo da lista
// ============================================================================
function KpiStrip({ T, dark, tipo, itens, corT }) {
  const vermelho = corEtapa('red', dark)
  const verde    = corEtapa('green', dark)
  const abertos = itens.filter(i => i.status === 'aberto')
  const pagos   = itens.filter(i => i.status === 'pago')
  const vencs   = abertos.filter(i => statusVencimento(i.vencimento).tipo === 'vencido')
  const hoje    = abertos.filter(i => statusVencimento(i.vencimento).tipo === 'hoje')

  const kpis = [
    { label: tipo === 'receber' ? 'Total a receber' : 'Total a pagar',
      valor: fmtBRL(abertos.reduce((s,i) => s + i.valor, 0)),
      cor: corT },
    { label:'Vencidas', valor:fmtBRL(vencs.reduce((s,i)=>s+i.valor,0)),
      cor: vencs.length > 0 ? vermelho : T.textDim, sub:`${vencs.length} ${vencs.length===1?'conta':'contas'}` },
    { label:'Vence hoje', valor:fmtBRL(hoje.reduce((s,i)=>s+i.valor,0)),
      cor: corHero(dark), sub:`${hoje.length} ${hoje.length===1?'conta':'contas'}` },
    { label: tipo === 'receber' ? 'Recebido no período' : 'Pago no período',
      valor: fmtBRL(pagos.reduce((s,i)=>s+i.valor,0)),
      cor: verde, sub:`${pagos.length} ${pagos.length===1?'baixa':'baixas'}` },
  ]

  return (
    <div style={{
      display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10,
    }}>
      {kpis.map((k, i) => (
        <Card key={i} T={T} dark={dark} padding="12px 14px">
          <div style={{
            fontSize:10.5, color:T.textMuted, fontWeight:600,
            textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4,
          }}>{k.label}</div>
          <div style={{
            fontSize:18, fontWeight:800, color:k.cor,
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.01em',
          }}>{k.valor}</div>
          {k.sub && (
            <div style={{ fontSize:10.5, color:T.textMuted, marginTop:3, fontVariantNumeric:'tabular-nums' }}>
              {k.sub}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

// ============================================================================
// MENU DE LINHA (⋯)
// ============================================================================
function MenuLinha({ T, dark, aberto, onToggle, onClose, opcoes }) {
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    if (aberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [aberto, onClose])

  return (
    <div ref={ref} style={{ position:'relative', display:'inline-block' }}>
      <button onClick={onToggle} aria-label="Ações"
        style={{
          background:'transparent', border:`1px solid ${aberto ? T.border : 'transparent'}`,
          padding:'4px 6px', borderRadius:6, cursor:'pointer',
          color:T.textMuted,
        }}>
        <i className="ti ti-dots-vertical" style={{ fontSize:16 }} aria-hidden="true" />
      </button>
      {aberto && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', right:0, zIndex:60,
          minWidth:170,
          background:T.card, border:`1px solid ${T.border}`,
          borderRadius:8, boxShadow:'0 10px 30px rgba(0,0,0,0.18)',
          padding:4, overflow:'hidden',
        }}>
          {opcoes.map((op, i) => {
            const cor = op.perigo ? corEtapa('red', dark)
                     : op.destaque ? corEtapa('blue', dark)
                     : T.textSecondary
            return (
              <button key={op.id}
                onClick={() => { op.onClick(); onClose() }}
                style={{
                  display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'8px 10px', border:'none',
                  background: 'transparent', color: cor,
                  fontSize:12.5, fontWeight: op.destaque ? 600 : 500,
                  cursor:'pointer', textAlign:'left', fontFamily:'inherit',
                  borderRadius:5,
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <i className={`ti ${op.icon}`} style={{ fontSize:14 }} aria-hidden="true" />
                {op.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// BULK BAR — flutuante quando há seleção
// ============================================================================
function BulkBar({ T, dark, tipo, count, total, onBaixar, onLimpar }) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c
  return (
    <div style={{
      position:'fixed', left:'50%', bottom:24, transform:'translateX(-50%)',
      zIndex:90,
      display:'flex', alignItems:'center', gap:14,
      padding:'10px 14px',
      background: cor('#0d2035', '#1c3e5e'),
      border:`1px solid ${azul}`,
      borderRadius:12, boxShadow:'0 16px 40px rgba(0,0,0,0.35)',
      color:'#fff',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13 }}>
        <span style={{
          background:azul, color:'#fff', borderRadius:14, padding:'3px 9px',
          fontWeight:700, fontSize:12, fontVariantNumeric:'tabular-nums',
        }}>{count}</span>
        <span style={{ opacity:.85 }}>selecionad{count===1?'o':'os'}</span>
        <span style={{ width:1, height:18, background:'rgba(255,255,255,0.2)' }} />
        <span style={{ fontVariantNumeric:'tabular-nums', fontWeight:600 }}>{fmtBRL(total)}</span>
      </div>
      <div style={{ width:1, height:24, background:'rgba(255,255,255,0.18)' }} />
      <button onClick={onBaixar}
        style={{
          display:'inline-flex', alignItems:'center', gap:6,
          padding:'7px 14px', borderRadius:8,
          background:'#fff', color:azul, border:'none',
          fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
        }}>
        <i className="ti ti-check" style={{ fontSize:15 }} aria-hidden="true" />
        {tipo === 'receber' ? 'Receber em lote' : 'Pagar em lote'}
      </button>
      <button onClick={onLimpar}
        style={{
          background:'transparent', border:'none', cursor:'pointer',
          color:'#fff', opacity:.8, padding:6,
        }} aria-label="Limpar seleção">
        <i className="ti ti-x" style={{ fontSize:16 }} aria-hidden="true" />
      </button>
    </div>
  )
}

// ============================================================================
// CAIXA — read-only com saldo running por conta
// ============================================================================
function ListaCaixa({ T, dark, itens, contas, onAbrir }) {
  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde   = corEtapa('green', dark)
  const vermelho= corEtapa('red', dark)

  const [periodo, setPeriodo] = useState({ id:'mes' })
  const [busca, setBusca]     = useState('')
  const [conta, setConta]     = useState('')
  const [tipoFilt, setTipoFilt] = useState('todos') // todos/receita/despesa

  const podeLimpar = periodo.id !== 'mes' || busca || conta || tipoFilt !== 'todos'
  function limpar() {
    setPeriodo({ id:'mes' }); setBusca(''); setConta(''); setTipoFilt('todos')
  }

  const filtrados = useMemo(() => {
    let arr = filtrarPorPeriodo(itens, periodo, 'data')
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      arr = arr.filter(m =>
        m.descricao.toLowerCase().includes(q) ||
        (m.categoria || '').toLowerCase().includes(q) ||
        (m.conta || '').toLowerCase().includes(q)
      )
    }
    if (conta) arr = arr.filter(m => m.conta === conta)
    if (tipoFilt !== 'todos') arr = arr.filter(m => m.tipo === tipoFilt)
    return arr
  }, [itens, periodo, busca, conta, tipoFilt])

  const ordenados = useMemo(
    () => [...filtrados].sort((a, b) => b.data.localeCompare(a.data)),
    [filtrados]
  )

  // Saldo running (do mais antigo pro mais novo)
  const comSaldo = useMemo(() => {
    const asc = [...ordenados].reverse()
    let acc = 0
    const map = new Map()
    asc.forEach(m => {
      acc += m.tipo === 'receita' ? m.valor : -m.valor
      map.set(m.id, acc)
    })
    return ordenados.map(m => ({ ...m, saldo: map.get(m.id) }))
  }, [ordenados])

  const totalReceitas = ordenados.filter(m => m.tipo === 'receita').reduce((s,m) => s + m.valor, 0)
  const totalDespesas = ordenados.filter(m => m.tipo === 'despesa').reduce((s,m) => s + m.valor, 0)
  const saldo = totalReceitas - totalDespesas

  const tipoChips = [
    { id:'todos',   label:'Todos' },
    { id:'receita', label:'Entradas' },
    { id:'despesa', label:'Saídas' },
  ]

  return (
    <>
      {/* Filtros do Caixa (sem status/categoria, só período/tipo/conta/busca) */}
      <Card T={T} dark={dark}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
          <CaixaPeriodo T={T} dark={dark} periodo={periodo} setPeriodo={setPeriodo} />
          <div style={{ display:'flex', gap:6 }}>
            {tipoChips.map(t => (
              <ChipToggle key={t.id} T={T} dark={dark}
                ativo={tipoFilt === t.id} onClick={() => setTipoFilt(t.id)}>
                {t.label}
              </ChipToggle>
            ))}
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <Input T={T} dark={dark}
              value={busca} onChange={setBusca}
              icon="ti-search" placeholder="Buscar movimentação…" />
          </div>
          <select value={conta} onChange={e => setConta(e.target.value)} style={selectStyle(T)}>
            <option value="">Conta (todas)</option>
            {contas.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {podeLimpar && (
            <Button T={T} dark={dark} variant="ghost" size="sm" iconLeft="ti-x" onClick={limpar}>
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {/* KPI strip do Caixa */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10 }}>
        <KpiCaixa T={T} dark={dark} label="Saldo do período"
          valor={fmtBRL(saldo)}
          cor={saldo >= 0 ? corHero(dark) : vermelho}
          icone={saldo >= 0 ? 'ti-trending-up' : 'ti-trending-down'}
          iconeCor={saldo >= 0 ? verde : vermelho} />
        <KpiCaixa T={T} dark={dark} label="Entradas" valor={fmtBRL(totalReceitas)} cor={azul} icone="ti-arrow-down-circle" iconeCor={azul} />
        <KpiCaixa T={T} dark={dark} label="Saídas"   valor={fmtBRL(totalDespesas)} cor={amarelo} icone="ti-arrow-up-circle" iconeCor={amarelo} />
        <KpiCaixa T={T} dark={dark} label="Movimentos" valor={ordenados.length} cor={corHero(dark)} icone="ti-arrows-exchange" iconeCor={T.textMuted} />
      </div>

      {/* Aviso read-only */}
      <Card T={T} dark={dark}>
        <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11.5, color:T.textMuted }}>
          <i className="ti ti-lock" aria-hidden="true" />
          Movimentações confirmadas — read-only. Só exclusão é permitida (clique numa linha).
        </div>
      </Card>

      {ordenados.length === 0 ? (
        <EmptyState T={T} icon="ti-search-off"
          title="Sem movimentações no filtro"
          description="Ajuste o período ou os filtros." compact height="auto" />
      ) : (
        <Card T={T} dark={dark} padding={0}>
          <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:0, fontSize:13, color:T.textPrimary }}>
            <thead>
              <tr style={{ background:T.cardAlt }}>
                <Th T={T} style={{ width:48 }} />
                <Th T={T} style={{ width:110 }}>Data</Th>
                <Th T={T}>Descrição</Th>
                <Th T={T} style={{ width:140 }}>Categoria</Th>
                <Th T={T} style={{ width:160 }}>Conta</Th>
                <Th T={T} style={{ width:110, textAlign:'right' }}>Valor</Th>
                <Th T={T} style={{ width:120, textAlign:'right' }}>Saldo</Th>
              </tr>
            </thead>
            <tbody>
              {comSaldo.map(m => {
                const ehReceita = m.tipo === 'receita'
                const corT = ehReceita ? azul : amarelo
                const iconeT = ehReceita ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'
                return (
                  <tr key={m.id}
                    onClick={() => onAbrir(m)}
                    style={{ cursor:'pointer', transition:'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Td T={T} style={{ textAlign:'center' }}>
                      <div style={{
                        width:28, height:28, borderRadius:7,
                        background: bgEtapa(ehReceita ? 'blue' : 'yellow', dark),
                        border:`1px solid ${corT}33`,
                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                      }}>
                        <i className={`ti ${iconeT}`} style={{ fontSize:14, color:corT }} aria-hidden="true" />
                      </div>
                    </Td>
                    <Td T={T}>
                      <span style={{ fontSize:12, color:T.textSecondary, fontVariantNumeric:'tabular-nums' }}>
                        {fmtPrazoCurto(m.data)}
                      </span>
                    </Td>
                    <Td T={T}>
                      <div style={{ fontSize:13, fontWeight:600, color:corHero(dark), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:380 }}>
                        {m.descricao}
                      </div>
                      <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
                        {m.forma}
                      </div>
                    </Td>
                    <Td T={T}>
                      <span style={{
                        display:'inline-block', padding:'2px 8px', borderRadius:10,
                        background:T.cardAlt, border:`1px solid ${T.border}`,
                        fontSize:11, color:T.textSecondary,
                      }}>
                        {m.categoria}
                      </span>
                    </Td>
                    <Td T={T}>
                      <div style={{ fontSize:11.5, color:T.textSecondary, display:'flex', alignItems:'center', gap:5 }}>
                        <i className="ti ti-building-bank" style={{ fontSize:12, color:T.textMuted }} aria-hidden="true" />
                        {m.conta}
                      </div>
                    </Td>
                    <Td T={T} style={{ textAlign:'right' }}>
                      <span style={{
                        fontSize:13.5, fontWeight:700, color:corT,
                        fontVariantNumeric:'tabular-nums',
                      }}>
                        {ehReceita ? '+' : '−'} {fmtBRL(m.valor)}
                      </span>
                    </Td>
                    <Td T={T} style={{ textAlign:'right' }}>
                      <span style={{
                        fontSize:12.5, fontWeight:600,
                        color: m.saldo >= 0 ? corHero(dark) : vermelho,
                        fontVariantNumeric:'tabular-nums',
                      }}>
                        {fmtBRL(m.saldo)}
                      </span>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:T.cardAlt }}>
                <Td T={T} colSpan={5} style={{ fontSize:11.5, color:T.textMuted, padding:'10px 12px' }}>
                  {ordenados.length} movimento{ordenados.length === 1 ? '' : 's'}
                </Td>
                <Td T={T} style={{ textAlign:'right', padding:'10px 12px' }}>
                  <span style={{ fontSize:11, color:T.textMuted, marginRight:8 }}>Saldo</span>
                  <span style={{ fontSize:14, fontWeight:800, color: saldo >= 0 ? corHero(dark) : vermelho, fontVariantNumeric:'tabular-nums' }}>
                    {fmtBRL(saldo)}
                  </span>
                </Td>
                <Td T={T} />
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </>
  )
}

function CaixaPeriodo({ T, dark, periodo, setPeriodo }) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    if (aberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [aberto])

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setAberto(o => !o)}
        style={{
          display:'inline-flex', alignItems:'center', gap:8,
          padding:'8px 12px', borderRadius:8,
          border:`1px solid ${T.border}`,
          background:T.cardAlt, color:T.textPrimary,
          fontSize:12.5, fontWeight:500, cursor:'pointer', fontFamily:'inherit',
          minWidth:180,
        }}>
        <i className="ti ti-calendar" style={{ fontSize:15, color:azul }} aria-hidden="true" />
        <span style={{ flex:1, textAlign:'left' }}>{labelPeriodo(periodo)}</span>
        <i className={`ti ${aberto ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize:14, color:T.textMuted }} aria-hidden="true" />
      </button>
      {aberto && (
        <div style={{
          position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:50, minWidth:240,
          background:T.card, border:`1px solid ${T.border}`,
          borderRadius:10, boxShadow:'0 10px 30px rgba(0,0,0,0.18)', padding:8,
        }}>
          {PERIODOS.map(p => {
            const ativo = periodo.id === p.id
            return (
              <button key={p.id}
                onClick={() => { setPeriodo({ id:p.id }); setAberto(false) }}
                style={{
                  display:'flex', alignItems:'center', gap:8, width:'100%',
                  padding:'8px 10px', borderRadius:6, border:'none',
                  background: ativo ? cor('#0d2035','#e6f1fb') : 'transparent',
                  color: ativo ? azul : T.textSecondary,
                  fontSize:12.5, fontWeight: ativo ? 700 : 500,
                  cursor:'pointer', fontFamily:'inherit', textAlign:'left',
                }}>
                {ativo ? <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" /> : <span style={{ width:13 }} />}
                {p.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function KpiCaixa({ T, dark, label, valor, cor, icone, iconeCor }) {
  return (
    <Card T={T} dark={dark} padding="12px 14px">
      <div style={{
        display:'flex', alignItems:'center', gap:6,
        fontSize:10.5, color:T.textMuted, fontWeight:600,
        textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4,
      }}>
        <i className={`ti ${icone}`} style={{ fontSize:13, color:iconeCor }} aria-hidden="true" />
        {label}
      </div>
      <div style={{
        fontSize:18, fontWeight:800, color:cor,
        fontVariantNumeric:'tabular-nums', letterSpacing:'-0.01em',
      }}>{valor}</div>
    </Card>
  )
}

// ============================================================================
// VISÃO GERAL (mantém layout anterior + alguns ajustes)
// ============================================================================
function VisaoGeral({
  T, dark,
  recebidoMes, pagoMes, saldoCaixa,
  pctMeta, faltaMeta, meta,
  vencidos, totalVencido,
  totalReceber, totalPagar,
  onIrParaReceber,
}) {
  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde    = corEtapa('green', dark)
  const cor = (d, c) => dark ? d : c

  // Dias úteis restantes no mês (simplificado: corridos sem FDS)
  const hoje = new Date()
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  let diasUteis = 0
  for (let d = new Date(hoje); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    const dia = d.getDay()
    if (dia !== 0 && dia !== 6) diasUteis++
  }
  const metaDiaria = diasUteis > 0 ? Math.ceil(faltaMeta / diasUteis) : 0

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns:'minmax(360px, 1.2fr) 1fr',
      gap:14, alignItems:'start',
    }}>
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-target" mb={14}
          action={
            <span style={{ fontSize:11, color:T.textMuted, fontVariantNumeric:'tabular-nums' }}>
              {diasUteis} {diasUteis === 1 ? 'dia útil' : 'dias úteis'} restantes
            </span>
          }>Meta do mês</SectionHeader>

        <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:6 }}>
          <span style={{
            fontSize:26, fontWeight:800, color:corHero(dark),
            fontVariantNumeric:'tabular-nums', letterSpacing:'-0.02em',
          }}>{fmtBRL(recebidoMes)}</span>
          <span style={{ fontSize:13, color:T.textMuted, fontVariantNumeric:'tabular-nums' }}>
            de {fmtBRL(meta)}
          </span>
        </div>

        <div style={{
          width:'100%', height:10, borderRadius:6,
          background:T.cardAlt, border:`1px solid ${T.border}`,
          overflow:'hidden', marginBottom:6,
        }}>
          <div style={{
            width:`${pctMeta}%`, height:'100%',
            background:`linear-gradient(90deg, ${azul}, ${corEtapa('blueLight', dark)})`,
            transition:'width .4s',
          }} />
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:T.textMuted, marginBottom:14 }}>
          <span style={{ color:azul, fontWeight:600, fontVariantNumeric:'tabular-nums' }}>
            {pctMeta}% concluído
          </span>
          <span style={{ fontVariantNumeric:'tabular-nums' }}>
            Faltam {fmtBRL(faltaMeta)}
          </span>
        </div>

        <SubCard T={T}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
            <div>
              <div style={{
                fontSize:10.5, color:T.textMuted, fontWeight:600,
                textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:3,
              }}>
                <i className="ti ti-calendar-stats" style={{ marginRight:5 }} aria-hidden="true" />
                Meta diária pra bater
              </div>
              <div style={{ fontSize:11, color:T.textSecondary }}>
                Dividindo o que falta pelos dias úteis restantes (sem FDS).
              </div>
            </div>
            <div style={{
              fontSize:20, fontWeight:800, color:azul,
              fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap',
            }}>
              {fmtBRL(metaDiaria)}<span style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>/dia</span>
            </div>
          </div>
        </SubCard>
      </Card>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-chart-arcs" mb={14}>
          Resumo do mês
        </SectionHeader>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <ResumoLinha T={T} dark={dark}
            icon="ti-arrow-down-circle" iconCor={azul}
            label="Recebido no mês" valor={recebidoMes} corValor={corHero(dark)} />
          <ResumoLinha T={T} dark={dark}
            icon="ti-arrow-up-circle" iconCor={amarelo}
            label="Pago no mês" valor={pagoMes} corValor={corHero(dark)} />
          <div style={{ height:1, background:T.border, margin:'4px 0' }} />
          <ResumoLinha T={T} dark={dark}
            icon="ti-cash-banknote" iconCor={saldoCaixa >= 0 ? verde : vermelho}
            iconLabel={saldoCaixa >= 0 ? 'ti-trending-up' : 'ti-trending-down'}
            label="Saldo do caixa" valor={saldoCaixa} corValor={corHero(dark)} destaque />
        </div>

        <div style={{ height:1, background:T.border, margin:'14px 0 10px' }} />

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <ResumoLinha T={T} dark={dark}
            icon="ti-clock-hour-3" iconCor={azul}
            label="A receber" valor={totalReceber} corValor={azul} />
          <ResumoLinha T={T} dark={dark}
            icon="ti-clock-hour-9" iconCor={amarelo}
            label="A pagar" valor={totalPagar} corValor={amarelo} />
        </div>
      </Card>

      {vencidos.length > 0 && (
        <Card T={T} dark={dark} accent={vermelho}
          style={{ gridColumn:'1 / -1', background:cor('#2a1515', '#fde8e8') + '40' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{
              width:38, height:38, borderRadius:10,
              background:bgEtapa('red', dark),
              border:`1px solid ${vermelho}33`,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize:20, color:vermelho }} aria-hidden="true" />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:corHero(dark), marginBottom:3 }}>
                Inadimplência: {vencidos.length} {vencidos.length === 1 ? 'cobrança vencida' : 'cobranças vencidas'}
              </div>
              <div style={{ fontSize:12, color:T.textMuted }}>
                Total em atraso:{' '}
                <strong style={{ color:vermelho, fontVariantNumeric:'tabular-nums' }}>{fmtBRL(totalVencido)}</strong>
                {' '}— alertas D+1, D+5, D+15 e mensal.
              </div>
            </div>
            <Button T={T} dark={dark} variant="secondary" size="sm" iconRight="ti-arrow-right" onClick={onIrParaReceber}>
              Ver contas
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function ResumoLinha({ T, dark, icon, iconCor, iconLabel, label, valor, corValor, destaque }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      gap:12, padding: destaque ? '6px 0' : '4px 0',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <i className={`ti ${icon}`} style={{ fontSize:16, color:iconCor }} aria-hidden="true" />
        <span style={{ fontSize:13, color:T.textSecondary, fontWeight: destaque ? 600 : 500 }}>
          {label}
        </span>
        {iconLabel && (
          <i className={`ti ${iconLabel}`} style={{ fontSize:14, color:iconCor }} aria-hidden="true" />
        )}
      </div>
      <span style={{
        fontSize: destaque ? 16 : 14, fontWeight: destaque ? 700 : 600,
        color: corValor, fontVariantNumeric:'tabular-nums',
      }}>{fmtBRL(valor)}</span>
    </div>
  )
}

// ============================================================================
// PRIMITIVOS DE TABELA (Th/Td) — visual Bling
// ============================================================================
function Th({ T, children, style, sortable, ativa, dir, onClick }) {
  return (
    <th onClick={onClick}
      style={{
        padding:'10px 12px',
        fontSize:10.5, fontWeight:700, color: ativa ? T.textPrimary : T.textMuted,
        textTransform:'uppercase', letterSpacing:'.04em',
        textAlign:'left', borderBottom:`1px solid ${T.border}`,
        cursor: sortable ? 'pointer' : 'default',
        userSelect:'none', whiteSpace:'nowrap',
        ...style,
      }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
        {children}
        {sortable && (
          <i className={`ti ${
            !ativa ? 'ti-arrows-sort'
            : dir === 'asc' ? 'ti-sort-ascending' : 'ti-sort-descending'
          }`} style={{ fontSize:13, opacity: ativa ? 1 : 0.5 }} aria-hidden="true" />
        )}
      </span>
    </th>
  )
}

function Td({ T, children, style, ...rest }) {
  return (
    <td {...rest}
      style={{
        padding:'10px 12px',
        borderBottom:`1px solid ${T.border}`,
        verticalAlign:'middle',
        ...style,
      }}>{children}</td>
  )
}
