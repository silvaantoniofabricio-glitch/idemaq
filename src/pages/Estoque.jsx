// idemaq-src/pages/Estoque.jsx
// Reconstruída do zero (22/06/2026) — padrão Atlassian idêntico ao Kanban.jsx.
// Layout: flex-column + header 3-linhas (icon+stats | tabs+search | chips de categoria) + content scroll.
// Sub-componentes (ListaPecas, ListaMaquinas, ListaCompras, etc.) preservados integralmente.

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { corEtapa, corHero } from '../utils/colors'
import { fmtBRL, semAcento } from '../utils/fmt'
import { isAdmin } from '../utils/osHelpers'
import { useIsMobile } from '../theme'
import {
  Card, Button, Badge,
  EmptyState, SectionHeader,
  useToast,
} from '../components/ui'
import PecaDetalheModal from '../components/estoque/PecaDetalheModal'
import MaquinaDetalheModal from '../components/estoque/MaquinaDetalheModal'
import NovaPecaModal from '../components/estoque/NovaPecaModal'
import NovaMaquinaModal from '../components/estoque/NovaMaquinaModal'
import { CATEGORIAS_PECA, CATEGORIA_POR_ID } from '../utils/categoriasPeca'
import { usePecas } from '../hooks/usePecas'
import { useMaquinas } from '../hooks/useMaquinas'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

const ESTADO_MAQUINA = {
  disponivel: { label: 'Disponível', variant: 'verde',   icon: 'ti-circle-check' },
  em_revisao: { label: 'Em revisão', variant: 'amarelo', icon: 'ti-tool' },
  do_cliente: { label: 'Do cliente', variant: 'azul',    icon: 'ti-user' },
  vendida:    { label: 'Vendida',    variant: 'neutro',  icon: 'ti-circle-dashed' },
}

const ABAS = [
  { id: 'pecas',    label: 'Peças',    icon: 'ti-puzzle' },
  { id: 'maquinas', label: 'Máquinas', icon: 'ti-device-washing-machine' },
]

const PAGE_SIZE = 20

const PALETA_CAT = ['#5B9BD5', '#FFD966', '#FF6B6B', '#B8CCE4']

function corDaCategoria(catId) {
  if (!catId) return PALETA_CAT[0]
  let h = 0
  for (let i = 0; i < catId.length; i++) h = (h * 31 + catId.charCodeAt(i)) | 0
  return PALETA_CAT[Math.abs(h) % PALETA_CAT.length]
}

function nivelEstoque(qtd, min) {
  if (!min || min <= 0) return 'sem_controle'
  if (qtd <= 0) return 'esgotado'
  if (qtd <= min) return 'baixo'
  return 'ok'
}

function NivelBadge({ qtd, min, dark }) {
  const n = nivelEstoque(qtd, min)
  if (n === 'sem_controle') return <Badge variant="neutro" dark={dark} sm><i className="ti ti-book-2" aria-hidden="true" /> Catálogo</Badge>
  if (n === 'esgotado')     return <Badge variant="vermelho" dark={dark} sm><i className="ti ti-alert-octagon" aria-hidden="true" /> Esgotado</Badge>
  if (n === 'baixo')        return <Badge variant="amarelo" dark={dark} sm><i className="ti ti-alert-triangle" aria-hidden="true" /> Baixo</Badge>
  return <Badge variant="azul" dark={dark} sm><i className="ti ti-check" aria-hidden="true" /> OK</Badge>
}

function pctLucro(custo, venda) {
  if (!custo || !venda) return 0
  return Math.round(((venda - custo) / custo) * 100)
}

// ─── Sub-componentes do header ────────────────────────────────────────────────

function StatBadge({ v, label, color, dot }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 12 }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', alignSelf: 'center', flexShrink: 0 }} />}
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
      <span style={{ color, opacity: 0.75 }}>{label}</span>
    </span>
  )
}

function HdrDivider({ T, dark }) {
  return <div style={{ width: 1, height: 18, flexShrink: 0, background: dark ? 'rgba(255,255,255,0.12)' : T.border }} />
}

function HdrIconBtn({ T, dark, icon, title, onClick }) {
  return (
    <button type="button" onClick={onClick} title={title} aria-label={title}
      style={{
        width: 32, height: 32, borderRadius: 4,
        border: `1px solid ${T?.border}`, background: 'transparent',
        color: T?.textSecondary, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit', transition: 'background .12s, color .12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T?.cardAlt || T?.card; e.currentTarget.style.color = T?.textPrimary }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T?.textSecondary }}>
      <i className={`ti ${icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
    </button>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Estoque({ T, dark, user }) {
  const notify   = useToast()
  const isMobile = useIsMobile()
  const azul     = corEtapa('blue', dark)
  const azulBg   = dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb'
  const amarelo  = corEtapa('yellow', dark)
  const verde    = corEtapa('green', dark)

  const { abrirOSPorId, modalProps: osModalProps } = useOSDetalheModal({ notify, buscando: true })

  async function abrirPecaPorId(pecaId) {
    const { data, error } = await supabase.from('peca').select('*').eq('id', pecaId).single()
    if (!error && data) setPecaAberta(data)
  }

  const mostraValores = isAdmin(user)

  const [aba, setAba]                     = useState('pecas')
  const [busca, setBusca]                 = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [categoriaSel, setCategoriaSel]   = useState('todas')
  const [pecaAberta, setPecaAberta]       = useState(null)
  const [maquinaAberta, setMaquinaAberta] = useState(null)
  const [novaPecaAberta, setNovaPecaAberta]     = useState(false)
  const [novaMaquinaAberta, setNovaMaquinaAberta] = useState(false)
  const [refetchKey, setRefetchKey]       = useState(0)
  const [paginaAtual, setPaginaAtual]     = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => { setPaginaAtual(1) }, [categoriaSel, buscaDebounced])

  const {
    pecas, total: totalFiltrado,
    loading: loadingPecas, error: errorPecas,
    criar: criarPeca, atualizar: atualizarPeca,
    ajustarEstoque: ajustarEstoquePeca,
  } = usePecas({ categoria: categoriaSel, busca: buscaDebounced, page: paginaAtual, pageSize: PAGE_SIZE })

  const buscando    = !!buscaDebounced.trim()
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGE_SIZE))

  const [statsRaw, setStatsRaw] = useState([])
  useEffect(() => {
    let alive = true
    supabase.from('peca').select('id, categoria, qtd_atual, qtd_minima, custo_atual').is('deleted_at', null)
      .then(({ data }) => { if (alive) setStatsRaw(data || []) })
    return () => { alive = false }
  }, [refetchKey])

  const [listaCompras, setListaCompras] = useState([])
  useEffect(() => {
    let alive = true
    async function fetchListaCompras() {
      const { data: osAtivas } = await supabase.from('os').select('id, numero').eq('etapa', 'em_oficina').is('deleted_at', null)
      if (!alive) return
      if (!osAtivas?.length) { if (alive) setListaCompras([]); return }
      const osMap = Object.fromEntries(osAtivas.map(o => [o.id, o]))
      const { data: itensFiltrados } = await supabase.from('os_item')
        .select('id, nome, quantidade, peca_id, os_id')
        .in('os_id', osAtivas.map(o => o.id)).is('deleted_at', null)
      if (!alive) return
      if (!itensFiltrados?.length) { if (alive) setListaCompras([]); return }
      const pecaIds = [...new Set(itensFiltrados.filter(i => i.peca_id).map(i => i.peca_id))]
      const pecaMap = {}
      if (pecaIds.length) {
        const { data: pecas } = await supabase.from('peca').select('id, qtd_atual').in('id', pecaIds).is('deleted_at', null)
        for (const p of (pecas || [])) pecaMap[p.id] = p
      }
      const grupos = {}
      for (const item of itensFiltrados) {
        const key = item.peca_id || `avulso:${(item.nome || '').toLowerCase().trim()}`
        if (!grupos[key]) {
          const peca = item.peca_id ? pecaMap[item.peca_id] : null
          const qtdEstoque = peca ? (peca.qtd_atual ?? 0) : null
          grupos[key] = { peca_id: item.peca_id || null, nome: item.nome || '—', qtdTotal: 0, qtdEstoque, temEstoque: qtdEstoque === null ? null : qtdEstoque > 0, os: [] }
        }
        grupos[key].qtdTotal += Number(item.quantidade) || 1
        const os = osMap[item.os_id]
        if (os && !grupos[key].os.find(o => o.id === os.id)) grupos[key].os.push(os)
      }
      const ORDEM = { false: 0, true: 1, null: 2 }
      if (alive) setListaCompras(
        Object.values(grupos).sort((a, b) => {
          const oa = ORDEM[String(a.temEstoque)], ob = ORDEM[String(b.temEstoque)]
          if (oa !== ob) return oa - ob
          return b.qtdTotal - a.qtdTotal
        })
      )
    }
    fetchListaCompras()
    return () => { alive = false }
  }, [refetchKey])

  const { maquinas, criar: criarMaquina, atualizar: atualizarMaquina } = useMaquinas()

  async function adicionarMaquina(payload) { return criarMaquina(payload) }
  async function editarMaquina(id, patch) {
    const { data, error } = await atualizarMaquina(id, patch)
    if (!error && data) setMaquinaAberta(data)
    return { data, error }
  }
  async function adicionarPeca(nova) {
    const res = await criarPeca(nova)
    if (!res.error) setRefetchKey(k => k + 1)
    return res
  }
  async function salvarEdicaoPeca(patch) {
    if (!pecaAberta) return { error: new Error('Sem peça aberta') }
    const { data, error } = await atualizarPeca(pecaAberta.id, patch)
    if (!error && data) { setPecaAberta(data); setRefetchKey(k => k + 1) }
    return { data, error }
  }
  async function ajustarEstoqueDaPeca(payload) {
    if (!pecaAberta) return { error: new Error('Sem peça aberta') }
    const { data, error } = await ajustarEstoquePeca(pecaAberta.id, payload)
    if (!error && data) { setPecaAberta(data); setRefetchKey(k => k + 1) }
    return { data, error }
  }

  // Stats globais
  const contagemCat = useMemo(() => {
    const m = {}
    for (const p of statsRaw) { const k = p.categoria || 'outros'; m[k] = (m[k] || 0) + 1 }
    return m
  }, [statsRaw])

  const maquinasFiltradas = useMemo(() => {
    const q = semAcento(busca.trim())
    if (!q) return maquinas
    return maquinas.filter(m => semAcento(m.modelo).includes(q) || semAcento(m.marca).includes(q) || semAcento(m.capacidade).includes(q))
  }, [maquinas, busca])

  const totalGlobal   = statsRaw.length
  const totalPecasQtd = statsRaw.reduce((s, p) => s + (p.qtd_atual || 0), 0)
  const pecasBaixas   = statsRaw.filter(p => { const n = nivelEstoque(p.qtd_atual, p.qtd_minima); return n === 'esgotado' || n === 'baixo' }).length
  const valorPecas    = statsRaw.reduce((s, p) => s + (p.qtd_atual || 0) * Number(p.custo_atual || 0), 0)
  const disponiveis   = maquinas.filter(m => m.estado === 'disponivel').length
  const emRevisao     = maquinas.filter(m => m.estado === 'em_revisao').length
  const valorMaquinas = maquinas.filter(m => m.estado === 'disponivel' || m.estado === 'em_revisao')
    .reduce((s, m) => s + (m.custoCompra + m.custoItens + m.custoServico), 0)

  const onPecas = aba === 'pecas'

  function placeholder(msg) { notify('info', msg || 'Em breve') }

  async function abrirPedidoOrcamento() {
    const { data, error: err } = await supabase.from('peca')
      .select('nome, sku, modelo, modelos_compativeis, marca, qtd_atual, qtd_minima')
      .is('deleted_at', null).order('nome')
    if (err) { notify('erro', 'Erro ao buscar peças'); return }
    const emFalta = (data || []).filter(p => {
      const qtd = Number(p.qtd_atual ?? 0), min = Number(p.qtd_minima ?? 0)
      return qtd <= 0 || (min > 0 && qtd <= min)
    })
    if (emFalta.length === 0) { notify('info', 'Nenhuma peça com estoque baixo ou esgotado'); return }
    const hoje = new Date().toLocaleDateString('pt-BR')
    const itensMontados = emFalta.map((p, i) => {
      let compat = p.modelos_compativeis
      if (typeof compat === 'string') compat = compat.split(/[,;\n]/).map(s => s.trim()).filter(Boolean)
      else if (!Array.isArray(compat)) compat = []
      const modelos = [p.modelo, ...compat].filter(Boolean).join(', ') || '—'
      const qtdNecessaria = Math.max(1, Number(p.qtd_minima ?? 0) - Number(p.qtd_atual ?? 0))
      return { i: i + 1, nome: p.nome || '', sku: p.sku || '', modelos, qtd: qtdNecessaria }
    })
    const rows = itensMontados.map(it => `<tr><td>${it.i}</td><td><strong>${it.nome}</strong>${it.sku ? `<br><small>SKU: ${it.sku}</small>` : ''}</td><td>${it.modelos}</td><td style="text-align:center">${it.qtd}</td><td></td></tr>`).join('')
    const linhasWpp = [`*Pedido de Orcamento - IDEMAQ*`, `Data: ${hoje}`, '', ...itensMontados.map(it => `${it.i}. ${it.nome}${it.sku ? ` (SKU: ${it.sku})` : ''}\n   Modelo(s): ${it.modelos}\n   Qtd: ${it.qtd}`), '', 'IDEMAQ Assistencia Tecnica - Navirai/MS']
    const wppEscaped = JSON.stringify(linhasWpp.join('\n'))
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Pedido de Orcamento - IDEMAQ - ${hoje}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:28px 32px}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}h1{font-size:20px;font-weight:700}.empresa{font-size:9px;color:#555;margin-top:3px}.sub{font-size:11px;color:#666;margin-top:4px}.btns{display:flex;gap:8px;align-items:center}table{width:100%;border-collapse:collapse;font-size:11.5px}th{background:#1a3a6e;color:#fff;padding:8px 10px;text-align:left;font-size:10.5px;font-weight:700}td{padding:7px 10px;border-bottom:1px solid #e0e0e0;vertical-align:middle}tr:nth-child(even) td{background:#f7f9fc}small{color:#888;font-size:9.5px}.obs{margin-top:22px;font-size:11px;color:#444}.obs-box{width:100%;border:1px solid #ccc;border-radius:4px;padding:6px 8px;font-size:11px;min-height:48px;font-family:inherit;resize:vertical}.footer{margin-top:36px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;font-size:11px;color:#444}.footer-line{border-top:1px solid #333;padding-top:5px;margin-top:28px}@media print{body{padding:8mm 10mm}.no-print{display:none!important}.obs-box{border:none;background:transparent;padding:0}}</style></head><body><div class="header"><div><h1>Pedido de Orcamento</h1><div class="empresa">IDEMAQ Assistencia Tecnica LTDA &nbsp;·&nbsp; Navirai / MS</div><div class="sub">Data: ${hoje} &nbsp;·&nbsp; ${emFalta.length} item${emFalta.length !== 1 ? 's' : ''}</div></div><div class="btns no-print"><button onclick="window.print()" style="padding:8px 16px;background:#1a3a6e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600">Imprimir / Salvar PDF</button><button onclick="enviarWpp()" style="padding:8px 16px;background:#25a244;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600">Enviar via WhatsApp</button></div></div><table><thead><tr><th style="width:28px">#</th><th>Nome da Peca</th><th>Modelo(s) da Maquina</th><th style="width:50px;text-align:center">Qtd</th><th>Valor Unit. R$</th></tr></thead><tbody>${rows}</tbody></table><div class="obs"><strong>Observacoes:</strong><br><br><textarea class="obs-box" placeholder="Condicoes, prazo de entrega, frete..."></textarea></div><div class="footer"><div><div>Fornecedor</div><div class="footer-line">___________________________</div></div><div><div>Responsavel</div><div class="footer-line">___________________________</div></div><div><div>Validade do orcamento</div><div class="footer-line">___________________________</div></div></div><script>var _wppText = ${wppEscaped};function enviarWpp() { window.location.href = 'whatsapp://send?text=' + encodeURIComponent(_wppText); }</script></body></html>`
    const win = window.open('', '_blank')
    if (!win) { notify('erro', 'Popup bloqueado — libere popups neste site'); return }
    win.document.write(html); win.document.close(); win.focus()
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minHeight: 0, overflow: 'hidden', background: T.bg,
    }}>

      {/* ═══════════════════════════════════════════════════════
          PAGE HEADER — 3 linhas: icon+stats | tabs+search | chips
      ═══════════════════════════════════════════════════════ */}
      <div style={{
        padding: '18px 22px 0',
        borderBottom: `1px solid ${T.border}`,
        background: T.bg, flexShrink: 0,
      }}>

        {/* Linha 1: icon-box + h1 + stats | action buttons */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: azulBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className={`ti ${onPecas ? 'ti-puzzle' : 'ti-device-washing-machine'}`}
                style={{ fontSize: 16, color: azul }} aria-hidden="true" />
            </div>
            <div>
              <h1 style={{
                fontSize: 17, fontWeight: 700, color: T.textPrimary,
                margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2,
              }}>Estoque</h1>
              <div style={{ display: 'flex', gap: 10, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                {onPecas ? (
                  <>
                    <StatBadge v={totalGlobal} label="referências" color={T.textSecondary} />
                    <StatBadge v={totalPecasQtd} label="itens" color={azul} />
                    {pecasBaixas > 0 && <StatBadge v={pecasBaixas} label="baixo/esgotado" color={amarelo} dot />}
                    {mostraValores && <StatBadge v={fmtBRL(valorPecas)} label="em peças" color={T.textSecondary} />}
                  </>
                ) : (
                  <>
                    <StatBadge v={disponiveis} label="disponíveis" color={azul} />
                    {emRevisao > 0 && <StatBadge v={emRevisao} label="em revisão" color={amarelo} dot />}
                    {mostraValores && <StatBadge v={fmtBRL(valorMaquinas)} label="capital parado" color={T.textSecondary} />}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            {onPecas && (
              <HdrIconBtn T={T} dark={dark}
                icon="ti-file-text" title="Pedido de Orçamento"
                onClick={abrirPedidoOrcamento} />
            )}
            <HdrIconBtn T={T} dark={dark}
              icon="ti-file-upload" title="Entrada por NF"
              onClick={() => placeholder('Entrada por nota fiscal (IA) — próximos chats')} />
            <button
              onClick={() => onPecas ? setNovaPecaAberta(true) : setNovaMaquinaAberta(true)}
              style={{
                padding: '7px 16px', borderRadius: 4,
                background: azul, color: '#fff',
                border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: 'inherit', flexShrink: 0,
                boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,.15)',
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
              <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
              {onPecas ? 'Nova peça' : 'Nova máquina'}
            </button>
          </div>
        </div>

        {/* Linha 2: aba tabs (Peças | Máquinas) + divider + search */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
          {/* Tabs underline */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, flexShrink: 0 }}>
            {ABAS.map(a => {
              const ativo = a.id === aba
              return (
                <button key={a.id}
                  onClick={() => { setAba(a.id); setBusca(''); setBuscaDebounced(''); setCategoriaSel('todas') }}
                  style={{
                    padding: '8px 14px 10px',
                    border: 'none',
                    borderBottom: `2.5px solid ${ativo ? azul : 'transparent'}`,
                    background: 'transparent',
                    color: ativo ? azul : T.textMuted,
                    fontSize: 13, fontWeight: ativo ? 600 : 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    whiteSpace: 'nowrap',
                    transition: 'color .12s, border-color .12s',
                    marginBottom: -1,
                  }}
                  onMouseEnter={e => { if (!ativo) e.currentTarget.style.color = T.textPrimary }}
                  onMouseLeave={e => { if (!ativo) e.currentTarget.style.color = T.textMuted }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
                  {a.label}
                </button>
              )
            })}
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 8 }}>
            <HdrDivider T={T} dark={dark} />
          </div>

          {/* Search input */}
          <div style={{ position: 'relative', flex: '0 0 280px', paddingBottom: 8 }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 9, top: '50%',
              transform: 'translateY(-55%)',
              fontSize: 13, color: T.textDim, pointerEvents: 'none',
            }} aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder={onPecas ? 'Nome, SKU ou referência…' : 'Modelo, marca ou capacidade…'}
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 30, paddingRight: busca ? 28 : 10,
                paddingTop: 6, paddingBottom: 6,
                borderRadius: 4, border: `1px solid ${T.border}`,
                background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
                color: T.textPrimary, fontSize: 13,
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color .12s',
              }}
              onFocus={e => e.target.style.borderColor = azul}
              onBlur={e => e.target.style.borderColor = T.border}
            />
            {/* Spinner debounce */}
            {onPecas && busca !== buscaDebounced && (
              <span style={{
                position: 'absolute', right: 8, top: '50%',
                transform: 'translateY(-55%)',
                fontSize: 11, color: T.textMuted, pointerEvents: 'none',
              }}>
                <i className="ti ti-loader-2 ti-spin" aria-hidden="true" />
              </span>
            )}
            {/* Limpar */}
            {busca && !(onPecas && busca !== buscaDebounced) && (
              <button onClick={() => { setBusca(''); setBuscaDebounced('') }}
                aria-label="Limpar busca"
                style={{
                  position: 'absolute', right: 6, top: '50%',
                  transform: 'translateY(-55%)',
                  border: 'none', background: 'none',
                  cursor: 'pointer', color: T.textDim,
                  padding: 2, display: 'flex',
                }}>
                <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Linha 3: chips de categoria — só na aba Peças */}
        {onPecas && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            paddingBottom: 10,
            overflowX: 'auto', overflowY: 'hidden',
            scrollbarWidth: 'thin',
          }}>
            <span style={{
              fontSize: 10.5, color: T.textMuted, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.04em',
              flexShrink: 0, marginRight: 2,
            }}>
              <i className="ti ti-category" style={{ fontSize: 12, marginRight: 3, verticalAlign: 'middle' }} aria-hidden="true" />
              Categoria
            </span>

            <ChipCategoria T={T} dark={dark}
              label="Todas" count={totalGlobal}
              ativo={categoriaSel === 'todas'}
              cor={azul}
              onClick={() => setCategoriaSel('todas')}
            />

            {CATEGORIAS_PECA.map(cat => {
              const count = contagemCat[cat.id] || 0
              if (count === 0) return null
              return (
                <ChipCategoria key={cat.id} T={T} dark={dark}
                  label={cat.label} count={count}
                  ativo={categoriaSel === cat.id}
                  cor={corDaCategoria(cat.id)}
                  onClick={() => setCategoriaSel(cat.id)}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          CONTENT — lista scrollável
      ═══════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        padding: '14px 22px 24px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>

        {/* Aviso de compras (peças em conserto sem estoque) */}
        {onPecas && listaCompras.length > 0 && (
          <ListaCompras T={T} dark={dark} itens={listaCompras}
            onClickOS={abrirOSPorId}
            onClickPeca={abrirPecaPorId} />
        )}

        {/* Listagem principal */}
        {onPecas
          ? (loadingPecas
              ? <PecasSkeleton T={T} dark={dark} mostraValores={mostraValores} />
              : errorPecas
                ? <EstoqueErro T={T} dark={dark} mensagem={errorPecas.message} />
                : <ListaPecas T={T} dark={dark} itens={pecas}
                    total={totalGlobal} busca={buscaDebounced}
                    mostraValores={mostraValores}
                    buscando={buscando}
                    totalFiltrado={totalFiltrado}
                    paginaAtual={paginaAtual} totalPaginas={totalPaginas}
                    pageSize={PAGE_SIZE}
                    onPagina={setPaginaAtual}
                    onAbrir={(p) => setPecaAberta(p)} />)
          : <ListaMaquinas T={T} dark={dark} itens={maquinasFiltradas} todos={maquinas} busca={busca}
              mostraValores={mostraValores}
              onAbrir={(m) => setMaquinaAberta(m)} />
        }
      </div>

      {/* Modais */}
      {pecaAberta && (
        <PecaDetalheModal T={T} dark={dark}
          peca={pecaAberta} mostraValores={mostraValores}
          onSalvar={salvarEdicaoPeca} onAjustar={ajustarEstoqueDaPeca}
          onClose={() => setPecaAberta(null)} />
      )}
      {osModalProps && <OSDetalhe {...osModalProps} T={T} dark={dark} mobile={isMobile} />}
      {maquinaAberta && (
        <MaquinaDetalheModal T={T} dark={dark}
          maquina={maquinaAberta} mostraValores={mostraValores}
          onAtualizar={editarMaquina} onClose={() => setMaquinaAberta(null)} />
      )}
      {novaPecaAberta && (
        <NovaPecaModal T={T} dark={dark}
          onClose={() => setNovaPecaAberta(false)} onSalvar={adicionarPeca} />
      )}
      {novaMaquinaAberta && (
        <NovaMaquinaModal T={T} dark={dark}
          mostraValores={mostraValores}
          onClose={() => setNovaMaquinaAberta(false)} onSalvar={adicionarMaquina} />
      )}
    </div>
  )
}

// =============================================================================
// CHIP DE CATEGORIA
// =============================================================================
function ChipCategoria({ T, dark, label, count, ativo, cor, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 9px', borderRadius: 14,
      background: ativo ? cor + '33' : 'transparent',
      border: `1px solid ${ativo ? cor + '88' : T.border}`,
      color: ativo ? cor : T.textMuted,
      fontSize: 11.5, fontWeight: ativo ? 700 : 500,
      cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all .12s', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {label}
      <span style={{
        fontSize: 10, fontWeight: 700,
        padding: '1px 5px', borderRadius: 8,
        background: ativo ? cor : T.cardAlt,
        color: ativo ? '#fff' : T.textMuted,
        fontVariantNumeric: 'tabular-nums',
      }}>{count}</span>
    </button>
  )
}

// =============================================================================
// PEÇAS — listagem
// =============================================================================
function ListaPecas({
  T, dark, itens, total, busca, onAbrir, mostraValores = true,
  buscando = false, totalFiltrado = 0,
  paginaAtual = 1, totalPaginas = 1, pageSize = 20, onPagina,
}) {
  const gridCols = mostraValores ? '1fr 90px 110px 110px 90px 90px' : '1fr 90px 110px 90px'

  if (itens.length === 0) {
    return (
      <EmptyState T={T}
        icon={busca ? 'ti-search-off' : 'ti-puzzle-off'}
        title={busca ? 'Nenhuma peça encontrada' : 'Nenhuma peça cadastrada'}
        description={busca
          ? `Sem resultados para "${busca}".`
          : 'Cadastre a primeira peça pra começar a controlar o estoque.'}
        compact height="auto"
      />
    )
  }

  const contagemHeader = buscando
    ? `${totalFiltrado} resultado${totalFiltrado === 1 ? '' : 's'}`
    : `${itens.length} de ${total}${totalPaginas > 1 ? ` · pág ${paginaAtual}/${totalPaginas}` : ''}`

  const mostraPaginacao = !buscando && totalPaginas > 1

  return (
    <Card T={T} dark={dark} padding={0}>
      <div style={{ padding: '12px 16px 10px' }}>
        <SectionHeader T={T} dark={dark} icon="ti-puzzle" mb={0}
          action={
            <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
              {contagemHeader}
            </span>
          }>Peças</SectionHeader>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: gridCols,
        gap: 10, alignItems: 'center', padding: '8px 16px',
        borderTop: `1px solid ${T.border}`, background: T.cardAlt,
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        <div>Item</div>
        <div style={{ textAlign: 'right' }}>Qtd</div>
        {mostraValores && <div style={{ textAlign: 'right' }}>Custo</div>}
        <div style={{ textAlign: 'right' }}>Venda</div>
        {mostraValores && <div style={{ textAlign: 'right' }}>Lucro</div>}
        <div style={{ textAlign: 'right' }}>Status</div>
      </div>

      {itens.map((p) => {
        const lucro = pctLucro(p.custoAtual, p.precoVenda)
        const catCor = corDaCategoria(p.categoria)
        const catInfo = CATEGORIA_POR_ID[p.categoria]
        return (
          <div key={p.id}
            onClick={() => onAbrir(p)}
            role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAbrir(p) } }}
            style={{
              display: 'grid', gridTemplateColumns: gridCols,
              gap: 10, alignItems: 'center', padding: '12px 16px',
              borderTop: `1px solid ${T.border}`,
              cursor: 'pointer', transition: 'background .12s', outline: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onFocus={e => e.currentTarget.style.background = T.cardAlt}
            onBlur={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: corHero(dark),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {p.favorito && <i className="ti ti-star-filled" title="Peça favorita" style={{ color: '#f59e0b', flexShrink: 0, fontSize: 14 }} />}
                {p.nome}
                {p.categoria && catInfo && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                    background: catCor + '22', color: catCor, border: `1px solid ${catCor}55`,
                    textTransform: 'uppercase', letterSpacing: '.3px', flexShrink: 0,
                  }}>{catInfo.label}</span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2, display: 'flex', gap: 8 }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.sku || '—'}</span>
                {p.fornecedor && <><span>·</span><span>{p.fornecedor}</span></>}
                {p.marca && <><span>·</span><span>{p.marca}</span></>}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>
              {p.qtdAtual}
              <span style={{ color: T.textDim, fontWeight: 400, fontSize: 11 }}> / {p.qtdMinima}</span>
            </div>
            {mostraValores && (
              <div style={{ textAlign: 'right', fontSize: 12.5, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {fmtBRL(p.custoAtual)}
              </div>
            )}
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>
              {fmtBRL(p.precoVenda)}
            </div>
            {mostraValores && (
              <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: lucro > 100 ? corEtapa('blue', dark) : T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {lucro}%
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <NivelBadge qtd={p.qtdAtual} min={p.qtdMinima} dark={dark} />
            </div>
          </div>
        )
      })}

      {mostraPaginacao && (
        <PaginacaoFooter T={T} dark={dark}
          paginaAtual={paginaAtual} totalPaginas={totalPaginas}
          totalItens={total} pageSize={pageSize} onPagina={onPagina} />
      )}
    </Card>
  )
}

// =============================================================================
// PAGINAÇÃO — footer da listagem
// =============================================================================
function PaginacaoFooter({ T, dark, paginaAtual, totalPaginas, totalItens, pageSize, onPagina }) {
  const podeAnterior = paginaAtual > 1
  const podeProxima  = paginaAtual < totalPaginas
  const from = (paginaAtual - 1) * pageSize + 1
  const to   = Math.min(paginaAtual * pageSize, totalItens)
  const azul = corEtapa('blue', dark)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, flexWrap: 'wrap', padding: '10px 16px',
      borderTop: `1px solid ${T.border}`, background: T.cardAlt,
    }}>
      <div style={{ fontSize: 11.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        Exibindo <strong style={{ color: T.textSecondary, fontWeight: 600 }}>{from}–{to}</strong> de{' '}
        <strong style={{ color: T.textSecondary, fontWeight: 600 }}>{totalItens}</strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {[
          { label: 'Anterior', icon: 'ti-chevron-left',  fn: () => onPagina?.(Math.max(1, paginaAtual - 1)),           disabled: !podeAnterior, dir: 'left' },
          { label: 'Próxima',  icon: 'ti-chevron-right', fn: () => onPagina?.(Math.min(totalPaginas, paginaAtual + 1)), disabled: !podeProxima, dir: 'right' },
        ].map(btn => (
          <button key={btn.label} onClick={btn.fn} disabled={btn.disabled}
            style={{
              padding: '5px 10px', borderRadius: 4,
              border: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
              color: btn.disabled ? T.textDim : T.textPrimary,
              fontSize: 12, fontWeight: 500,
              cursor: btn.disabled ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: btn.disabled ? 0.5 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            {btn.dir === 'left' && <i className={`ti ${btn.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />}
            {btn.label}
            {btn.dir === 'right' && <i className={`ti ${btn.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />}
          </button>
        ))}
        <span style={{ fontSize: 11.5, color: T.textMuted, padding: '0 6px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          Pág <strong style={{ color: T.textSecondary, fontWeight: 700 }}>{paginaAtual}</strong> / <strong style={{ color: T.textSecondary, fontWeight: 700 }}>{totalPaginas}</strong>
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// MÁQUINAS — cards grid
// =============================================================================
function ListaMaquinas({ T, dark, itens, todos, busca, onAbrir, mostraValores = true }) {
  const azul = corEtapa('blue', dark)

  if (itens.length === 0) {
    return (
      <EmptyState T={T}
        icon={busca ? 'ti-search-off' : 'ti-device-washing-machine-off'}
        title={busca ? 'Nenhuma máquina encontrada' : 'Nenhuma máquina no estoque'}
        description={busca
          ? `Sem resultados para "${busca}".`
          : 'Máquinas reformadas entram automaticamente ao concluir OS de Fabricação.'}
        compact height="auto"
      />
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {itens.map(m => {
        const est = ESTADO_MAQUINA[m.estado] || ESTADO_MAQUINA.disponivel
        const custoTotal = (m.custoCompra || 0) + (m.custoItens || 0) + (m.custoServico || 0)
        const lucro = pctLucro(custoTotal, m.precoVenda)
        const corEst = corEtapa(
          est.variant === 'verde' ? 'green' : est.variant === 'amarelo' ? 'yellow' : est.variant === 'azul' ? 'blue' : 'neutro',
          dark
        )
        return (
          <Card key={m.id} T={T} dark={dark} hover accent={corEst} onClick={() => onAbrir(m)} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: corHero(dark), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                  {m.modelo}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', gap: 8 }}>
                  <span>{m.marca}</span><span>·</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.capacidade}</span>
                </div>
              </div>
              <Badge variant={est.variant} dark={dark} sm>
                <i className={`ti ${est.icon}`} aria-hidden="true" /> {est.label}
              </Badge>
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: mostraValores ? '1fr 1fr' : '1fr',
              gap: 10, padding: '10px 12px',
              background: T.cardAlt, borderRadius: 8, border: `1px solid ${T.border}`,
            }}>
              {mostraValores && (
                <div>
                  <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Custo total</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>{custoTotal > 0 ? fmtBRL(custoTotal) : '—'}</div>
                </div>
              )}
              <div style={{ textAlign: mostraValores ? 'right' : 'left' }}>
                <div style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Venda</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>{m.precoVenda > 0 ? fmtBRL(m.precoVenda) : '—'}</div>
              </div>
              {mostraValores && custoTotal > 0 && m.precoVenda > 0 && (
                <div style={{ gridColumn: '1 / -1', fontSize: 11, color: T.textMuted, paddingTop: 6, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Margem</span>
                  <span style={{ color: azul, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(m.precoVenda - custoTotal)} · {lucro}%</span>
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// =============================================================================
// PEÇAS EM CONSERTO — relatório de itens das OS em em_oficina
// =============================================================================
function ListaCompras({ T, dark, itens, onClickOS, onClickPeca }) {
  const amarelo  = corEtapa('yellow', dark)
  const azul     = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  const [expandido, setExpandido] = useState(true)

  const faltando   = itens.filter(i => i.temEstoque === false).length
  const temEstoque = itens.filter(i => i.temEstoque === true).length
  const accentColor = faltando > 0 ? amarelo : azul

  return (
    <Card T={T} dark={dark} padding={0} style={{ border: `1.5px solid ${accentColor}44` }}>
      <div
        role="button" tabIndex={0}
        onClick={() => setExpandido(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandido(v => !v) } }}
        style={{
          padding: '10px 16px', background: accentColor + '15',
          borderBottom: expandido ? `1px solid ${accentColor}30` : 'none',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', outline: 'none',
        }}>
        <i className="ti ti-tools" style={{ color: accentColor, fontSize: 15, flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontWeight: 700, fontSize: 13, color: accentColor }}>Peças em Conserto</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 8, background: accentColor + '25', color: accentColor, fontVariantNumeric: 'tabular-nums' }}>
          {itens.length} {itens.length === 1 ? 'item' : 'itens'}
        </span>
        {faltando > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 8, background: vermelho + '20', color: vermelho, border: `1px solid ${vermelho}40`, fontVariantNumeric: 'tabular-nums' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 10, marginRight: 3 }} aria-hidden="true" />
            {faltando} faltando
          </span>
        )}
        {faltando === 0 && temEstoque > 0 && <span style={{ fontSize: 11, color: T.textMuted }}>tudo no estoque</span>}
        <i className={`ti ti-chevron-${expandido ? 'up' : 'down'}`} style={{ color: T.textMuted, fontSize: 13, marginLeft: 'auto' }} aria-hidden="true" />
      </div>

      {expandido && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px', gap: 8, padding: '6px 16px', borderBottom: `1px solid ${T.border}`, background: T.cardAlt, fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <div>Item · OS</div>
          <div style={{ textAlign: 'right' }}>Qtd</div>
          <div style={{ textAlign: 'right' }}>Estoque</div>
        </div>
      )}

      {expandido && itens.map((item, i) => {
        const falta  = item.temEstoque === false
        const avulso = item.temEstoque === null
        const ok     = item.temEstoque === true
        const rowAccent = falta ? vermelho : ok ? azul : T.border
        return (
          <div key={item.peca_id || `avulso-${i}`} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 80px', alignItems: 'center', gap: 8, padding: '9px 16px', borderTop: `1px solid ${T.border}`, borderLeft: `3px solid ${rowAccent}` }}>
            <div style={{ minWidth: 0 }}>
              <div onClick={item.peca_id && onClickPeca ? () => onClickPeca(item.peca_id) : undefined}
                style={{ fontSize: 13, fontWeight: 600, color: corHero(dark), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: item.peca_id && onClickPeca ? 'pointer' : 'default', textDecoration: item.peca_id && onClickPeca ? 'underline' : 'none', textDecorationColor: item.peca_id && onClickPeca ? corHero(dark) + '60' : 'transparent' }}>
                {item.nome}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                {item.os.map(o => (
                  <span key={o.id} onClick={onClickOS ? () => onClickOS(o.id) : undefined}
                    style={{ fontSize: 10, color: T.textMuted, background: T.cardAlt, border: `1px solid ${T.border}`, padding: '1px 5px', borderRadius: 4, fontVariantNumeric: 'tabular-nums', cursor: onClickOS ? 'pointer' : 'default' }}>
                    OS #{o.numero}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>{item.qtdTotal}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {avulso
                ? <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: T.cardAlt, color: T.textMuted, border: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>Avulso</span>
                : falta
                  ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: vermelho + '18', color: vermelho, border: `1px solid ${vermelho}44`, whiteSpace: 'nowrap' }}><i className="ti ti-alert-octagon" style={{ fontSize: 9, marginRight: 3 }} aria-hidden="true" />Faltando</span>
                  : <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: azul + '18', color: azul, border: `1px solid ${azul}44`, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}><i className="ti ti-check" style={{ fontSize: 9, marginRight: 3 }} aria-hidden="true" />{item.qtdEstoque} un.</span>
              }
            </div>
          </div>
        )
      })}
    </Card>
  )
}

// =============================================================================
// SKELETON — placeholder enquanto carrega
// =============================================================================
function PecasSkeleton({ T, dark, mostraValores }) {
  const gridCols = mostraValores ? '1fr 90px 110px 110px 90px 90px' : '1fr 90px 110px 90px'
  const bar = (w) => <div style={{ height: 10, width: w, borderRadius: 4, background: T.cardAlt, border: `1px solid ${T.border}`, opacity: 0.7 }} />
  return (
    <Card T={T} dark={dark} padding={0}>
      <div style={{ padding: '12px 16px 10px' }}>
        <SectionHeader T={T} dark={dark} icon="ti-puzzle" mb={0}>
          <span style={{ opacity: 0.5 }}>Carregando peças…</span>
        </SectionHeader>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, alignItems: 'center', padding: '8px 16px', borderTop: `1px solid ${T.border}`, background: T.cardAlt, fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <div>Item</div><div style={{ textAlign: 'right' }}>Qtd</div>
        {mostraValores && <div style={{ textAlign: 'right' }}>Custo</div>}
        <div style={{ textAlign: 'right' }}>Venda</div>
        {mostraValores && <div style={{ textAlign: 'right' }}>Lucro</div>}
        <div style={{ textAlign: 'right' }}>Status</div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, alignItems: 'center', padding: '14px 16px', borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{bar(`${50 + ((i * 7) % 35)}%`)}{bar('40%')}</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{bar(40)}</div>
          {mostraValores && <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{bar(60)}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{bar(60)}</div>
          {mostraValores && <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{bar(40)}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{bar(70)}</div>
        </div>
      ))}
    </Card>
  )
}

function EstoqueErro({ T, dark, mensagem }) {
  return (
    <Card T={T} dark={dark}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px', color: corEtapa('red', dark), fontSize: 13 }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} aria-hidden="true" />
        <div>
          <div style={{ fontWeight: 600 }}>Erro ao carregar peças</div>
          <div style={{ color: T.textMuted, fontSize: 11.5, marginTop: 2 }}>{mensagem}</div>
        </div>
      </div>
    </Card>
  )
}
