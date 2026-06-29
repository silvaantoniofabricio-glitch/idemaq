// idemaq-src/pages/Financeiro.jsx
// Tela de Financeiro — Visão / A Receber / A Pagar / Caixa (Módulo 07).
// Reformulada com inspiração no Bling: barra de filtros horizontal compacta,
// KPI strip, tabela real com checkbox + ordenação, bulk action bar flutuante,
// rodapé com totais. Caixa permanece read-only (regra de negócio).
// Tabela `lancamento_financeiro` é Schema parte 2 — ainda em mock.

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL, fmtPrazoCurto, hojeISO } from '../utils/fmt'
import {
  Card, SubCard, Button, Badge, Input,
  EmptyState, SectionHeader, ChipToggle,
  useToast, ModuleHeader,
} from '../components/ui'
import LancamentoDetalheModal from '../components/financeiro/LancamentoDetalheModal'
import NovoLancamentoModal from '../components/financeiro/NovoLancamentoModal'
import { useFinanceiro } from '../hooks/useFinanceiro'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

// ============================================================================
// ADAPTADOR de shape: banco/hook → UI atual (Bling-style)
// ============================================================================
// O hook traz o shape do banco (snake_case + colunas do schema esperado:
// vencimento, pago_em, categoria text, conta_id+conta{}, taxa_pct,
// forma_pagamento). A UI espera camelCase com strings amigáveis pra forma de
// pagamento. Esse adapter normaliza. Em modo demo (tabelaAusente=true) o hook
// devolve mocks no MESMO shape — mesmo adapter, mesmo resultado.

// Enum do banco → label amigável pra UI ("pix" → "PIX", "credito_1x" → "Cartão 1x")
const LABEL_FORMA = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito_1x: 'Cartão 1x',
  credito_parcelado: 'Cartão parcelado',
  link_pagamento: 'Link InfinitePay',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  a_prazo: 'A prazo',
}
function labelForma(enumVal) {
  if (!enumVal) return ''
  return LABEL_FORMA[enumVal] || enumVal
}

// Label UI → enum do banco (caminho inverso, usado em mutações)
const MAPA_FORMA_UI_BANCO = {
  'pix':'pix', 'dinheiro':'dinheiro', 'débito':'debito', 'debito':'debito',
  'cartão 1x':'credito_1x', 'cartao 1x':'credito_1x',
  'cartão 2x':'credito_parcelado', 'cartão 3x':'credito_parcelado',
  'cartao 2x':'credito_parcelado', 'cartao 3x':'credito_parcelado',
  'cartão parcelado':'credito_parcelado', 'cartao parcelado':'credito_parcelado',
  'link infinitepay':'link_pagamento', 'link pagamento':'link_pagamento',
  'boleto':'boleto', 'transferência':'transferencia', 'transferencia':'transferencia',
  'a prazo':'a_prazo',
}
function mapearFormaUIparaEnum(formaUI) {
  if (!formaUI) return null
  const k = String(formaUI).toLowerCase().trim()
  // se já é um enum válido, retorna direto
  if (Object.values(MAPA_FORMA_UI_BANCO).includes(k)) return k
  return MAPA_FORMA_UI_BANCO[k] || 'pix' // fallback seguro
}

// Extrai número da OS e nome do cliente a partir do campo descricao.
// Suporta dois formatos usados no banco:
//   "OS #470 — Nome Cliente · 1ª/1 a prazo"  (formato real)
//   "Nome Cliente — Serviço (OS #241)"         (formato mock)
function extrairOsInfo(descricao) {
  if (!descricao) return { osNum: null, clienteNome: null }
  const m1 = descricao.match(/^OS\s*#(\d+)\s*[—–-]\s*([^·\n]+)/)
  if (m1) return { osNum: Number(m1[1]), clienteNome: m1[2].trim() }
  const m2 = descricao.match(/^(.+?)\s*[—–-].*OS\s*#(\d+)/)
  if (m2) return { osNum: Number(m2[2]), clienteNome: m2[1].trim() }
  const m3 = descricao.match(/OS\s*#(\d+)/)
  return { osNum: m3 ? Number(m3[1]) : null, clienteNome: (descricao.split('—')[0] || descricao).trim() }
}

function adaptarBancoParaUI(lanc) {
  const ehReceita = lanc.tipo === 'receita'
  const pago = lanc.pago_em != null
  const { osNum, clienteNome } = ehReceita ? extrairOsInfo(lanc.descricao) : { osNum: null, clienteNome: null }
  return {
    id: lanc.id,
    os_id: lanc.os_id || null,
    osNum,
    cliente: ehReceita ? clienteNome : null,
    descricao: lanc.descricao || '',
    fornecedor: !ehReceita ? null : undefined,
    categoria: lanc.categoria || 'Outros',
    conta: lanc.conta?.nome || '',
    conta_id: lanc.conta_id || null,
    valor: Number(lanc.valor) || 0,
    vencimento: lanc.vencimento,
    forma: labelForma(lanc.forma_pagamento),
    forma_enum: lanc.forma_pagamento || null,
    taxa_pct: Number(lanc.taxa_pct) || 0,
    status: pago ? 'pago' : 'aberto',
    dataPag: lanc.pago_em || null,
    recorrente: false, // schema simplificado não tem natureza recorrente — reserva pra futuro
    tipo: lanc.tipo,
  }
}

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

// Listas pra dropdowns de filtro. Categorias agora são text livre no banco;
// estas constantes são apenas SUGESTÕES pros selects (mesmas exportadas pelo
// hook em `CATEGORIAS_SUGESTAO`). Contas vem do hook dinamicamente.
const CATEGORIAS_RECEITA = ['Limpeza', 'Manutenção', 'Peças', 'Venda de máquina', 'Taxa diagnóstico', 'Outros']
const CATEGORIAS_DESPESA = ['Funcionários', 'Peças', 'Marketing', 'Utilidades', 'Combustível', 'Materiais', 'Impostos', 'Financiamento']
const FORMAS = ['PIX', 'Dinheiro', 'Cartão 1x', 'Cartão 2x', 'Cartão 3x', 'Boleto', 'Link InfinitePay']

// Mocks de lançamentos vivem dentro do hook (`useFinanceiro`) e são devolvidos
// quando a tabela `lancamento_financeiro` ainda não existir no Supabase. A
// página consome `lancamentos` do hook → adapter → split em receber/pagar/caixa.

const ABAS = [
  { id:'caixa',   label:'Caixa',       icon:'ti-cash-banknote' },
  { id:'receber', label:'A receber',   icon:'ti-arrow-down-circle' },
  { id:'pagar',   label:'A pagar',     icon:'ti-arrow-up-circle' },
]

// Presets de período
const PERIODOS = [
  { id:'mes',       label:'Mês atual',    mesAtual:true },
  { id:'mes_ant',   label:'Mês passado',  mesAnterior:true },
  { id:'sel_mes',   label:'Selecionar mês',    selMes:true },
  { id:'sel_period',label:'Selecionar período', selPeriod:true },
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
  const lozengeStyle = (bg, color) => ({
    display: 'inline-block',
    background: bg,
    color,
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 3,
    textTransform: 'uppercase',
    letterSpacing: '.04em',
    whiteSpace: 'nowrap',
  })
  if (item.status === 'pago') {
    return <span style={lozengeStyle(
      dark ? 'rgba(91,155,213,0.18)' : '#DEEBFF',
      dark ? '#7ab3e0' : '#185FA5'
    )}>Pago</span>
  }
  const st = statusVencimento(item.vencimento)
  if (st.tipo === 'vencido') return <span style={lozengeStyle(
    dark ? 'rgba(192,66,66,0.2)' : '#FFEBE6',
    dark ? '#e07a7a' : '#BF2600'
  )}>{st.label}</span>
  if (st.tipo === 'hoje') return <span style={lozengeStyle(
    dark ? 'rgba(255,217,102,0.18)' : '#FFFAE6',
    dark ? '#e6c05a' : '#FF8B00'
  )}>Vence hoje</span>
  if (st.tipo === 'amanha') return <span style={lozengeStyle(
    dark ? 'rgba(255,180,60,0.15)' : '#FFF3E0',
    dark ? '#d4a843' : '#E65100'
  )}>Amanhã</span>
  return <span style={lozengeStyle(
    dark ? 'rgba(91,155,213,0.12)' : '#E6F1FB',
    dark ? '#7ab3e0' : '#185FA5'
  )}>{st.label}</span>
}

// Aplica filtro de período
function filtrarPorPeriodo(itens, periodo, campoData) {
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  let de, ate
  if (periodo.id === 'mes') {
    de  = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)
  } else if (periodo.id === 'mes_ant') {
    de  = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    ate = new Date(hoje.getFullYear(), hoje.getMonth(), 0, 23, 59, 59)
  } else if (periodo.id === 'sel_mes' && periodo.ano != null && periodo.mes != null) {
    de  = new Date(periodo.ano, periodo.mes, 1)
    ate = new Date(periodo.ano, periodo.mes + 1, 0, 23, 59, 59)
  } else if (periodo.id === 'sel_period') {
    de  = periodo.de  ? new Date(periodo.de  + 'T00:00:00') : null
    ate = periodo.ate ? new Date(periodo.ate + 'T23:59:59') : null
  } else {
    return itens
  }
  return itens.filter(it => {
    if (!it[campoData]) return true
    const d = new Date(it[campoData] + 'T00:00:00')
    if (de  && d < de)  return false
    if (ate && d > ate) return false
    return true
  })
}

const MESES_NOME = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function labelPeriodo(periodo) {
  if (periodo.id === 'sel_period') {
    const fmt = (s) => s ? s.split('-').reverse().join('/') : '...'
    return `${fmt(periodo.de)} → ${fmt(periodo.ate)}`
  }
  if (periodo.id === 'sel_mes' && periodo.ano != null && periodo.mes != null) {
    return `${MESES_NOME[periodo.mes]} ${periodo.ano}`
  }
  return (PERIODOS.find(p => p.id === periodo.id) || PERIODOS[0]).label
}

// ─── StatBadge local ────────────────────────────────────────────────────────
function StatBadge({ v, label, color, dot }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'baseline', gap:4, fontSize:12 }}>
      {dot && <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block', alignSelf:'center', flexShrink:0 }} />}
      <span style={{ fontWeight:700, color, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.01em' }}>{v}</span>
      <span style={{ color, opacity:.75 }}>{label}</span>
    </span>
  )
}

// ============================================================================
// PÁGINA
// ============================================================================
export default function Financeiro({ T, dark }) {
  const notify = useToast()
  const { abrirOSPorNumero, abrirOSPorId, modalProps: osModalProps } = useOSDetalheModal({ notify })
  const [aba, setAba] = useState('caixa')
  const [receber, setReceber] = useState([])
  const [pagar, setPagar]     = useState([])
  const [caixa, setCaixa]     = useState([])
  const [selecionado, setSelecionado] = useState(null)
  // Modal de novo lançamento: null=fechado, 'receita'|'despesa'=aberto com tipo inicial
  const [novoLancTipo, setNovoLancTipo] = useState(null)
  // Modal confirmação de baixa com data: null=fechado, { item, tipo, ids? }=aberto
  const [confirmBaixa, setConfirmBaixa] = useState(null)

  // Hook real do Supabase. Schema parte 2 (`lancamento_financeiro`) ainda
  // pode não existir — o hook trata graciosamente via `tabelaAusente` e
  // devolve mocks no mesmo shape do banco. A página consome igual nos 2 casos.
  const {
    lancamentos: lancsReal, contas: contasReais,
    loading: loadingHook, tabelaAusente,
    criar: criarLanc, atualizar: atualizarLanc,
    darBaixa, excluir: excluirReal, refetch,
  } = useFinanceiro()
  const usandoBanco = !tabelaAusente

  // Sincroniza states locais a partir do hook (real OU mock — mesmo shape).
  // Split por tipo/status:
  //   - receber  = receita não paga (pago_em null)
  //   - pagar    = despesa não paga
  //   - caixa    = tudo já pago (receita E despesa), com `data` = pago_em
  // Em modo demo, baixarReceber/baixarPagar fazem update otimista local; como
  // o hook não refaz fetch sem filtros mudando, o local não é resetado.
  useEffect(() => {
    if (loadingHook) return
    const reais = lancsReal.map(adaptarBancoParaUI)
    setReceber(reais.filter(r => r.tipo === 'receita' && r.status !== 'pago'))
    setPagar(reais.filter(r => r.tipo === 'despesa' && r.status !== 'pago'))
    setCaixa(reais.filter(r => r.status === 'pago').map(r => ({
      ...r,
      data: r.dataPag || r.vencimento,
    })))
  }, [lancsReal, loadingHook])

  // Lista de contas pra dropdowns dos filtros (vem do hook — real ou mock)
  const CONTAS = useMemo(() => contasReais.map(c => c.nome), [contasReais])

  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde    = corEtapa('green', dark)

  // KPIs de topo (visão geral) — filtra pelo MÊS DE REFERÊNCIA:
  // mês corrente se tiver pagamentos; senão último mês com pagamento.
  // Antes somava o caixa inteiro (histórico todo) e gerava números inflados.
  const mesRef = (() => {
    const mesAtual = new Date().toISOString().slice(0, 7)
    const mesesComDados = new Set(
      caixa.map(m => (m.data || m.vencimento || '').slice(0, 7)).filter(Boolean)
    )
    if (mesesComDados.has(mesAtual)) return mesAtual
    const sorted = [...mesesComDados].sort()
    return sorted[sorted.length - 1] || mesAtual
  })()
  const caixaMes = caixa.filter(m => (m.data || '').startsWith(mesRef))
  const recebidoMes  = caixaMes.filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0)
  const pagoMes      = caixaMes.filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0)
  const saldoCaixa   = recebidoMes - pagoMes
  const totalReceber = receber.filter(r => r.status === 'aberto').reduce((s, r) => s + r.valor, 0)
  const totalPagar   = pagar.filter(p => p.status === 'aberto').reduce((s, p) => s + p.valor, 0)
  const vencidos     = receber.filter(r => r.status === 'aberto' && statusVencimento(r.vencimento).tipo === 'vencido')
  const totalVencido = vencidos.reduce((s, r) => s + r.valor, 0)
  const pctMeta      = Math.min(100, Math.round((recebidoMes / META_MES) * 100))
  const faltaMeta    = Math.max(0, META_MES - recebidoMes)

  function placeholder(msg) { notify('info', msg || 'Em breve — Módulo 07 do plano') }

  // ─── Ações comuns ────────────────────────────────────────────────────────
  // Quando `usandoBanco`: chamam hook real (darBaixa/excluirReal) e o refetch
  // sincroniza a UI. Quando em modo demo: comportamento in-memory de sempre.
  async function baixarReceber(item, opts = {}) {
    if (usandoBanco) {
      const valorTotal = Number(item.valor) || 0
      const valorRecebido = opts.valorRecebido != null
        ? Math.min(Number(opts.valorRecebido) || 0, valorTotal)
        : valorTotal
      const ehParcial = valorRecebido > 0 && valorRecebido < valorTotal

      if (ehParcial) {
        // Parcial: reduz o original e cria um lancamento novo ja pago com o
        // valor recebido. O original continua em "A receber" pelo restante.
        const restante = valorTotal - valorRecebido
        const { error: errUpd } = await atualizarLanc(item.id, { valor: restante })
        if (errUpd) { notify('erro', `Falha ao reduzir o lancamento: ${errUpd.message}`); return }
        const { error: errCria } = await criarLanc({
          tipo: 'receita',
          valor: valorRecebido,
          conta_id: item.conta_id || null,
          categoria: item.categoria || null,
          descricao: `${item.descricao || ''} (parcial)`.trim(),
          vencimento: item.vencimentoIso || item.vencimento || hojeISO(),
          pago_em: opts.pago_em || hojeISO(),
          forma_pagamento: opts.forma_pagamento || item.forma_enum || mapearFormaUIparaEnum(item.forma),
          taxa_pct: item.taxa_pct || 0,
          os_id: item.os_id || null,
        })
        if (errCria) { notify('erro', `Parcial salvo, mas baixa falhou: ${errCria.message}`); return }
        notify('ok', `Parcial de ${fmtBRL(valorRecebido, { fr: true })} recebido — sobra ${fmtBRL(restante, { fr: true })}`)
        setSelecionado(null)
        return
      }

      const { error } = await darBaixa(item.id, {
        pago_em: opts.pago_em || undefined,
        forma_pagamento: opts.forma_pagamento || item.forma_enum || mapearFormaUIparaEnum(item.forma),
        taxa_pct: item.taxa_pct || 0,
      })
      if (error) { notify('erro', `Não foi possível baixar: ${error.message}`); return }
      notify('ok', `Recebimento de ${fmtBRL(item.valor)} confirmado`)
      setSelecionado(null)
      return
    }
    // Demo (mock in-memory) — usado enquanto schema parte 2 não está aplicado.
    // Move item de `receber` pra `caixa`; hook não refaz fetch sem filtros.
    setReceber(prev => prev.filter(r => r.id !== item.id))
    setCaixa(prev => [{
      ...item,
      status: 'pago',
      dataPag: isoMaisDias(0),
      data: isoMaisDias(0),
    }, ...prev])
    notify('ok', `Recebimento de ${fmtBRL(item.valor)} confirmado`)
    setSelecionado(null)
  }

  async function baixarPagar(item, opts = {}) {
    if (usandoBanco) {
      const valorTotal = Number(item.valor) || 0
      const valorPago = opts.valorRecebido != null
        ? Math.min(Number(opts.valorRecebido) || 0, valorTotal)
        : valorTotal
      const ehParcial = valorPago > 0 && valorPago < valorTotal

      if (ehParcial) {
        const restante = valorTotal - valorPago
        const { error: errUpd } = await atualizarLanc(item.id, { valor: restante })
        if (errUpd) { notify('erro', `Falha ao reduzir: ${errUpd.message}`); return }
        const { error: errCria } = await criarLanc({
          tipo: 'despesa',
          valor: valorPago,
          conta_id: item.conta_id || null,
          categoria: item.categoria || null,
          descricao: `${item.descricao || ''} (parcial)`.trim(),
          vencimento: item.vencimentoIso || item.vencimento || hojeISO(),
          pago_em: opts.pago_em || hojeISO(),
          forma_pagamento: opts.forma_pagamento || item.forma_enum || mapearFormaUIparaEnum(item.forma),
          taxa_pct: item.taxa_pct || 0,
          os_id: item.os_id || null,
        })
        if (errCria) { notify('erro', `Parcial salvo, mas baixa falhou: ${errCria.message}`); return }
        notify('ok', `Parcial de ${fmtBRL(valorPago, { fr: true })} pago — sobra ${fmtBRL(restante, { fr: true })}`)
        setSelecionado(null)
        return
      }

      const { error } = await darBaixa(item.id, {
        pago_em: opts.pago_em || undefined,
        forma_pagamento: opts.forma_pagamento || item.forma_enum || mapearFormaUIparaEnum(item.forma),
        taxa_pct: item.taxa_pct || 0,
      })
      if (error) { notify('erro', `Não foi possível pagar: ${error.message}`); return }
      notify('ok', `Pagamento de ${fmtBRL(item.valor)} registrado`)
      setSelecionado(null)
      return
    }
    setPagar(prev => prev.filter(p => p.id !== item.id))
    setCaixa(prev => [{
      ...item,
      tipo: 'despesa',
      status: 'pago',
      dataPag: isoMaisDias(0),
      data: isoMaisDias(0),
    }, ...prev])
    notify('ok', `Pagamento de ${fmtBRL(item.valor)} registrado`)
    setSelecionado(null)
  }

  async function excluirLancamento(item, tipo) {
    if (usandoBanco) {
      const { error } = await excluirReal(item.id)
      if (error) { notify('erro', `Não foi possível excluir: ${error.message}`); return }
      notify('ok', 'Lançamento excluído')
      setSelecionado(null)
      return
    }
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

  // ─── Filtros por aba (lifted state) ──────────────────────────────────────
  const [cPeriodo,   setCPeriodo]   = useState({ id:'mes' })
  const [cTipo,      setCTipo]      = useState('todos')
  const [cBusca,     setCBusca]     = useState('')
  const [cConta,     setCConta]     = useState('')
  function limparCaixa() { setCPeriodo({ id:'mes' }); setCTipo('todos'); setCBusca(''); setCConta('') }
  const cPodeLimpar = cPeriodo.id !== 'mes' || cTipo !== 'todos' || cBusca || cConta

  const [rPeriodo,   setRPeriodo]   = useState({ id:'mes' })
  const [rStatus,    setRStatus]    = useState('aberto')
  const [rBusca,     setRBusca]     = useState('')
  const [rCategoria, setRCategoria] = useState('')
  const [rConta,     setRConta]     = useState('')
  function limparReceber() { setRPeriodo({ id:'mes' }); setRStatus('aberto'); setRBusca(''); setRCategoria(''); setRConta('') }
  const rPodeLimpar = rPeriodo.id !== 'mes' || rStatus !== 'aberto' || rBusca || rCategoria || rConta

  const [pPeriodo,   setPPeriodo]   = useState({ id:'mes' })
  const [pStatus,    setPStatus]    = useState('aberto')
  const [pBusca,     setPBusca]     = useState('')
  const [pCategoria, setPCategoria] = useState('')
  const [pConta,     setPConta]     = useState('')
  function limparPagar() { setPPeriodo({ id:'mes' }); setPStatus('aberto'); setPBusca(''); setPCategoria(''); setPConta('') }
  const pPodeLimpar = pPeriodo.id !== 'mes' || pStatus !== 'aberto' || pBusca || pCategoria || pConta

  // ─── Contadores das tabs ─────────────────────────────────────────────────
  const abasComContador = ABAS.map(a => {
    let count = null
    if (a.id === 'receber') count = receber.filter(r => r.status === 'aberto').length
    if (a.id === 'pagar')   count = pagar.filter(p => p.status === 'aberto').length
    return { ...a, count }
  })

  const azulBg = dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb'

  return (
    <div style={{
      display:'flex', flexDirection:'column', flex:1,
      minHeight:0, overflow:'hidden', background:T.bg,
    }}>

      <ModuleHeader
        T={T} dark={dark}
        icon="ti-cash-banknote"
        title="Financeiro"
        stats={[
          { v: fmtBRL(saldoCaixa), label: 'saldo', color: corHero(dark), highlight: true },
          { v: fmtBRL(totalReceber), label: 'a receber', color: azul },
          { v: fmtBRL(totalPagar), label: 'a pagar', color: amarelo },
          ...(vencidos.length > 0 ? [{ v: vencidos.length, label: 'vencidas', color: vermelho, dot: true }] : []),
        ]}
        tabs={abasComContador.map(a => ({ id: a.id, label: a.label, icon: a.icon, count: a.count > 0 ? a.count : undefined }))}
        activeTab={aba}
        onTabChange={setAba}
        primaryAction={{ label: 'Novo lançamento', icon: 'ti-plus', onClick: () => setNovoLancTipo(aba === 'pagar' ? 'despesa' : 'receita') }}
      >
        <div style={{ padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {aba === 'caixa' && (
            <>
              <CaixaPeriodo T={T} dark={dark} periodo={cPeriodo} setPeriodo={setCPeriodo} />
              <div style={{ display:'flex', gap:6 }}>
                {[{ id:'todos', label:'Todos' }, { id:'receita', label:'Entradas' }, { id:'despesa', label:'Saídas' }].map(t => (
                  <ChipToggle key={t.id} T={T} dark={dark} ativo={cTipo === t.id} onClick={() => setCTipo(t.id)}>
                    {t.label}
                  </ChipToggle>
                ))}
              </div>
              <div style={{ flex:1, minWidth:180 }}>
                <Input T={T} dark={dark} value={cBusca} onChange={setCBusca} icon="ti-search" placeholder="Buscar movimentação…" />
              </div>
              <select value={cConta} onChange={e => setCConta(e.target.value)} style={selectStyle(T)}>
                <option value="">Conta (todas)</option>
                {CONTAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {cPodeLimpar && (
                <Button T={T} dark={dark} variant="ghost" size="sm" iconLeft="ti-x" onClick={limparCaixa}>Limpar</Button>
              )}
            </>
          )}
          {(aba === 'receber' || aba === 'pagar') && (
            <BarraFiltros T={T} dark={dark} tipo={aba}
              periodo={aba === 'receber' ? rPeriodo : pPeriodo}
              setPeriodo={aba === 'receber' ? setRPeriodo : setPPeriodo}
              statusFilt={aba === 'receber' ? rStatus : pStatus}
              setStatusFilt={aba === 'receber' ? setRStatus : setPStatus}
              busca={aba === 'receber' ? rBusca : pBusca}
              setBusca={aba === 'receber' ? setRBusca : setPBusca}
              categoria={aba === 'receber' ? rCategoria : pCategoria}
              setCategoria={aba === 'receber' ? setRCategoria : setPCategoria}
              categorias={aba === 'receber' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA}
              conta={aba === 'receber' ? rConta : pConta}
              setConta={aba === 'receber' ? setRConta : setPConta}
              contas={CONTAS}
              onLimpar={aba === 'receber' ? limparReceber : limparPagar}
              podeLimpar={aba === 'receber' ? rPodeLimpar : pPodeLimpar}
            />
          )}
        </div>
      </ModuleHeader>

      {/* ══════════════════════════════════════════════════
          CONTENT — scrollable
      ══════════════════════════════════════════════════ */}
      <div style={{ flex:1, minHeight:0, overflowY:'auto' }}>
        <div style={{ padding:'16px 22px', display:'flex', flexDirection:'column', gap:12 }}>

          {/* Banner sutil quando schema parte 2 ainda não foi aplicado. */}
          {tabelaAusente && (
            <Card T={T} dark={dark} accent={amarelo}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <i className="ti ti-database-off" style={{ fontSize:18, color:amarelo }} aria-hidden="true" />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:corHero(dark) }}>
                    Schema parte 2 ainda não aplicado
                  </div>
                  <div style={{ fontSize:11, color:T.textMuted, marginTop:2, lineHeight:1.4 }}>
                    Exibindo dados de demonstração. Quando o SQL de
                    {' '}<code style={{ background:T.cardAlt, padding:'1px 5px', borderRadius:4, fontSize:10.5 }}>sql/01-lancamento-financeiro.sql</code>
                    {' '}for aplicado no Supabase, esta tela passa a ler/escrever dados reais.
                  </div>
                </div>
              </div>
            </Card>
          )}

          {aba === 'receber' && (
            <ListaLancamentos T={T} dark={dark}
              itens={receber} tipo="receber"
              categorias={CATEGORIAS_RECEITA} contas={CONTAS}
              periodo={rPeriodo} statusFilt={rStatus} busca={rBusca} categoria={rCategoria} conta={rConta}
              onAbrir={(item) => setSelecionado({ tipo:'receber', item })}
              onBaixarUm={(it) => setConfirmBaixa({ item: it, tipo: 'receber' })}
              onBaixarLote={(ids) => setConfirmBaixa({ ids, tipo: 'receber' })}
              onExcluir={(item) => excluirLancamento(item, 'receber')}
              onAbrirOS={abrirOSPorNumero}
              notify={notify}
            />
          )}

          {aba === 'pagar' && (
            <ListaLancamentos T={T} dark={dark}
              itens={pagar} tipo="pagar"
              categorias={CATEGORIAS_DESPESA} contas={CONTAS}
              periodo={pPeriodo} statusFilt={pStatus} busca={pBusca} categoria={pCategoria} conta={pConta}
              onAbrir={(item) => setSelecionado({ tipo:'pagar', item })}
              onBaixarUm={(it) => setConfirmBaixa({ item: it, tipo: 'pagar' })}
              onBaixarLote={(ids) => setConfirmBaixa({ ids, tipo: 'pagar' })}
              onExcluir={(item) => excluirLancamento(item, 'pagar')}
              onAbrirOS={abrirOSPorNumero}
              notify={notify}
            />
          )}

          {aba === 'caixa' && (
            <ListaCaixa T={T} dark={dark}
              itens={caixa} contas={CONTAS}
              periodo={cPeriodo} tipoFilt={cTipo} busca={cBusca} conta={cConta}
              onAbrir={(item) => setSelecionado({ tipo:'caixa', item })}
            />
          )}

        </div>
      </div>

      {/* Modal confirmação de baixa com data */}
      {confirmBaixa && (
        <ConfirmarBaixaModal T={T} dark={dark}
          confirmBaixa={confirmBaixa}
          receber={receber} pagar={pagar}
          onConfirmar={(pago_em) => {
            const { item, ids, tipo } = confirmBaixa
            if (ids) {
              // lote
              if (tipo === 'receber') {
                const itens = receber.filter(r => ids.includes(r.id) && r.status === 'aberto')
                itens.forEach(it => baixarReceber(it, { pago_em }))
                notify('ok', `${itens.length} recebimentos confirmados`)
              } else {
                const itens = pagar.filter(p => ids.includes(p.id) && p.status === 'aberto')
                itens.forEach(it => baixarPagar(it, { pago_em }))
                notify('ok', `${itens.length} pagamentos registrados`)
              }
            } else {
              if (tipo === 'receber') baixarReceber(item, { pago_em })
              else baixarPagar(item, { pago_em })
            }
            setConfirmBaixa(null)
          }}
          onClose={() => setConfirmBaixa(null)}
        />
      )}

      {/* Modais */}
      {selecionado && (
        <LancamentoDetalheModal T={T} dark={dark}
          lancamento={selecionado.item} tipo={selecionado.tipo}
          contas={contasReais}
          onClose={() => setSelecionado(null)}
          onBaixar={(item, opts) => {
            if (selecionado.tipo === 'receber') baixarReceber(item, opts || {})
            else if (selecionado.tipo === 'pagar') baixarPagar(item, opts || {})
          }}
          onSalvarEdicao={async (id, patch) => {
            const res = await atualizarLanc(id, patch)
            if (!res.error) {
              await refetch()
              setSelecionado(null)
            }
            return res
          }}
          onExcluir={(item) => excluirLancamento(item, selecionado.tipo)}
        />
      )}

      {novoLancTipo && (
        <NovoLancamentoModal T={T} dark={dark}
          tipoInicial={novoLancTipo}
          contas={contasReais}
          onCriar={async (payload) => {
            const res = await criarLanc(payload)
            if (!res.error) await refetch()
            return res
          }}
          onClose={() => setNovoLancTipo(null)}
        />
      )}

      {osModalProps && <OSDetalhe T={T} dark={dark} {...osModalProps} />}
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
// DROPDOWN DE PERÍODO — compartilhado entre BarraFiltros e CaixaPeriodo
// ============================================================================
function DropdownPeriodo({ T, dark, periodo, setPeriodo, onClose }) {
  const azul = corEtapa('blue', dark)
  const cor = (d, c) => dark ? d : c
  const hoje = new Date()
  // estado do seletor de mês
  const [selMesAno, setSelMesAno] = useState(
    periodo.id === 'sel_mes' && periodo.ano != null
      ? { ano: periodo.ano, mes: periodo.mes }
      : { ano: hoje.getFullYear(), mes: hoje.getMonth() }
  )

  const itemStyle = (ativo) => ({
    display:'flex', alignItems:'center', gap:8, width:'100%',
    padding:'8px 10px', borderRadius:6, border:'none',
    background: ativo ? cor('#0d2035','#e6f1fb') : 'transparent',
    color: ativo ? azul : T.textSecondary,
    fontSize:12.5, fontWeight: ativo ? 700 : 500,
    cursor:'pointer', fontFamily:'inherit', textAlign:'left',
  })

  return (
    <div style={{
      position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:50,
      minWidth:270,
      background: T.card, border:`1px solid ${T.border}`,
      borderRadius:10, boxShadow:'0 10px 30px rgba(0,0,0,0.18)',
      padding:8,
    }}>
      {/* Mês atual */}
      <button style={itemStyle(periodo.id === 'mes')}
        onClick={() => { setPeriodo({ id:'mes' }); onClose() }}>
        {periodo.id === 'mes' ? <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" /> : <span style={{ width:13 }} />}
        Mês atual
      </button>

      {/* Mês passado */}
      <button style={itemStyle(periodo.id === 'mes_ant')}
        onClick={() => { setPeriodo({ id:'mes_ant' }); onClose() }}>
        {periodo.id === 'mes_ant' ? <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" /> : <span style={{ width:13 }} />}
        Mês passado
      </button>

      {/* Selecionar mês — expande inline */}
      <button style={itemStyle(periodo.id === 'sel_mes')}
        onClick={() => setPeriodo(p => p.id === 'sel_mes' ? p : { id:'sel_mes', ano:selMesAno.ano, mes:selMesAno.mes })}>
        {periodo.id === 'sel_mes' ? <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" /> : <span style={{ width:13 }} />}
        Selecionar mês
        <i className={`ti ti-chevron-${periodo.id === 'sel_mes' ? 'up' : 'down'}`} style={{ fontSize:12, marginLeft:'auto', color:T.textMuted }} aria-hidden="true" />
      </button>

      {periodo.id === 'sel_mes' && (
        <div style={{ padding:'6px 10px 8px', display:'flex', alignItems:'center', gap:6 }}>
          <button onClick={() => {
            const novo = selMesAno.mes === 0 ? { ano: selMesAno.ano - 1, mes: 11 } : { ano: selMesAno.ano, mes: selMesAno.mes - 1 }
            setSelMesAno(novo); setPeriodo({ id:'sel_mes', ...novo })
          }} style={{ background:'none', border:'none', cursor:'pointer', color:T.textMuted, padding:2 }}>
            <i className="ti ti-chevron-left" style={{ fontSize:14 }} aria-hidden="true" />
          </button>
          <span style={{ flex:1, textAlign:'center', fontSize:13, fontWeight:600, color:T.textPrimary }}>
            {MESES_NOME[selMesAno.mes]} {selMesAno.ano}
          </span>
          <button onClick={() => {
            const novo = selMesAno.mes === 11 ? { ano: selMesAno.ano + 1, mes: 0 } : { ano: selMesAno.ano, mes: selMesAno.mes + 1 }
            setSelMesAno(novo); setPeriodo({ id:'sel_mes', ...novo })
          }} style={{ background:'none', border:'none', cursor:'pointer', color:T.textMuted, padding:2 }}>
            <i className="ti ti-chevron-right" style={{ fontSize:14 }} aria-hidden="true" />
          </button>
          <button onClick={onClose}
            style={{ background:azul, border:'none', cursor:'pointer', color:'#fff', padding:'3px 10px', borderRadius:5, fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
            OK
          </button>
        </div>
      )}

      {/* Selecionar período — expande inline */}
      <button style={itemStyle(periodo.id === 'sel_period')}
        onClick={() => setPeriodo(p => p.id === 'sel_period' ? p : { id:'sel_period', de:'', ate:'' })}>
        {periodo.id === 'sel_period' ? <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" /> : <span style={{ width:13 }} />}
        Selecionar período
        <i className={`ti ti-chevron-${periodo.id === 'sel_period' ? 'up' : 'down'}`} style={{ fontSize:12, marginLeft:'auto', color:T.textMuted }} aria-hidden="true" />
      </button>

      {periodo.id === 'sel_period' && (
        <div style={{ padding:'4px 8px 8px', display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:11, color:T.textMuted, minWidth:24 }}>De</span>
            <input type="date" value={periodo.de || ''} onChange={e => setPeriodo({ id:'sel_period', de:e.target.value, ate:periodo.ate })}
              style={inputDate(T)} />
          </div>
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:11, color:T.textMuted, minWidth:24 }}>Até</span>
            <input type="date" value={periodo.ate || ''} onChange={e => setPeriodo({ id:'sel_period', de:periodo.de, ate:e.target.value })}
              style={inputDate(T)} />
          </div>
          {periodo.de && periodo.ate && (
            <button onClick={onClose}
              style={{ alignSelf:'flex-end', background:azul, border:'none', cursor:'pointer', color:'#fff', padding:'3px 12px', borderRadius:5, fontSize:12, fontWeight:600, fontFamily:'inherit' }}>
              OK
            </button>
          )}
        </div>
      )}
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
    <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', width:'100%' }}>

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
            <DropdownPeriodo T={T} dark={dark} periodo={periodo} setPeriodo={setPeriodo} onClose={() => setPeriodoAberto(false)} />
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
  periodo, statusFilt, busca, categoria, conta,
  onAbrir, onBaixarUm, onBaixarLote, onExcluir, notify,
  onAbrirOS,
}) {
  const azul     = corEtapa('blue', dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const corT     = tipo === 'receber' ? azul : amarelo

  const [selecao, setSelecao] = useState([])
  const [ordem, setOrdem]     = useState({ campo:'vencimento', dir:'asc' })
  const [menuLinha, setMenuLinha] = useState(null)

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
                        {tipo === 'receber' ? (it.cliente || it.descricao) : it.descricao}
                      </div>
                      <div style={{ marginTop:3, display:'flex', alignItems:'center', gap:5 }}>
                        {tipo === 'receber' ? (
                          it.osNum ? (
                            <button
                              onClick={e => { e.stopPropagation(); onAbrirOS?.(it.osNum) }}
                              style={{
                                background: dark ? 'rgba(91,155,213,0.14)' : '#DEEBFF',
                                color: dark ? '#7ab3e0' : '#185FA5',
                                border: `1px solid ${dark ? 'rgba(91,155,213,0.3)' : '#B3D4FF'}`,
                                borderRadius: 3,
                                padding: '1px 6px',
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                lineHeight: 1.5,
                                flexShrink: 0,
                              }}
                            >
                              OS #{it.osNum}
                            </button>
                          ) : (
                            <span style={{ fontSize:11, color:T.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300 }}>
                              {it.descricao}
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize:11, color:T.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:340 }}>
                            {it.fornecedor ? `${it.fornecedor} · ` : ''}{it.forma}
                          </span>
                        )}
                        {tipo === 'receber' && it.osNum && it.forma && (
                          <span style={{ fontSize:11, color:T.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            · {it.forma}
                          </span>
                        )}
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
function ListaCaixa({ T, dark, itens, contas, periodo, tipoFilt, busca, conta, onAbrir }) {
  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde   = corEtapa('green', dark)
  const vermelho= corEtapa('red', dark)

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

  return (
    <>
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
        <DropdownPeriodo T={T} dark={dark} periodo={periodo} setPeriodo={setPeriodo} onClose={() => setAberto(false)} />
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
  mesRef,
}) {
  const labelMes = (() => {
    if (!mesRef) return 'mês'
    const [y, m] = mesRef.split('-')
    const nomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
    return `${nomes[Number(m)-1] || ''}/${y}`
  })()
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
            label={`Recebido em ${labelMes}`} valor={recebidoMes} corValor={corHero(dark)} />
          <ResumoLinha T={T} dark={dark}
            icon="ti-arrow-up-circle" iconCor={amarelo}
            label={`Pago em ${labelMes}`} valor={pagoMes} corValor={corHero(dark)} />
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

// ─── Modal de confirmação de baixa com data ───────────────────────────────────
function ConfirmarBaixaModal({ T, dark, confirmBaixa, receber, pagar, onConfirmar, onClose }) {
  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const { item, ids, tipo } = confirmBaixa

  // Data padrão: vencimento do item (individual) ou hoje (lote)
  const defaultDate = ids
    ? hojeISO()
    : item?.vencimentoIso || item?.vencimento || hojeISO()

  const [dataBaixa, setDataBaixa] = useState(defaultDate)

  // Informações resumidas pro lote
  const lotItens = ids
    ? (tipo === 'receber' ? receber : pagar).filter(r => ids.includes(r.id) && r.status === 'aberto')
    : null
  const lotTotal = lotItens ? lotItens.reduce((s, i) => s + Number(i.valor || 0), 0) : 0

  const labelAcao  = tipo === 'receber' ? 'Recebimento' : 'Pagamento'
  const labelBotao = tipo === 'receber' ? 'Confirmar recebimento' : 'Confirmar pagamento'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: T.card, borderRadius: 12,
        border: `1px solid ${T.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: 24, width: 360, display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className={`ti ${tipo === 'receber' ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'}`}
            style={{ fontSize: 20, color: tipo === 'receber' ? azul : amarelo }} aria-hidden="true" />
          <span style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>
            {ids ? `Baixa em lote — ${lotItens?.length} itens` : `Confirmar ${labelAcao}`}
          </span>
        </div>

        {/* Resumo */}
        {ids ? (
          <div style={{ fontSize: 13, color: T.textSecondary }}>
            Total: <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(lotTotal)}</strong>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 13, color: T.textMuted }}>{item?.descricao}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
              {fmtBRL(Number(item?.valor || 0))}
            </div>
          </div>
        )}

        {/* Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Data do pagamento
          </label>
          <input
            type="date"
            value={dataBaixa}
            onChange={e => setDataBaixa(e.target.value)}
            style={{
              background: T.cardAlt, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: '9px 12px',
              color: T.textPrimary, fontSize: 14,
              fontFamily: 'inherit', width: '100%',
            }}
          />
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 8,
            border: `1px solid ${T.border}`, background: 'transparent',
            color: T.textMuted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Cancelar
          </button>
          <button
            onClick={() => dataBaixa && onConfirmar(dataBaixa)}
            disabled={!dataBaixa}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: 'none', background: tipo === 'receber' ? azul : amarelo,
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: dataBaixa ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            }}>
            {labelBotao}
          </button>
        </div>
      </div>
    </div>
  )
}
