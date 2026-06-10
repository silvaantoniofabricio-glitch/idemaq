// idemaq-src/pages/Estoque.jsx
// Tela de Estoque — Peças + Máquinas (Módulo 06 do plano).
// Peças: ligadas à tabela `peca` via usePecas() (filtros server-side).
// Máquinas: ainda em mock — depende do Módulo 07 (chassi + revenda).

import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'
import { corEtapa, corHero } from '../utils/colors'
import { fmtBRL, semAcento } from '../utils/fmt'
import { isAdmin } from '../utils/osHelpers'
import { useIsMobile } from '../theme'
import {
  Card, Button, Badge, Input, Tabs,
  EmptyState, PageHeader, SectionHeader,
  useToast,
} from '../components/ui'
import PecaDetalheModal from '../components/estoque/PecaDetalheModal'
import MaquinaDetalheModal from '../components/estoque/MaquinaDetalheModal'
import NovaPecaModal from '../components/estoque/NovaPecaModal'
import { CATEGORIAS_PECA, CATEGORIA_POR_ID } from '../utils/categoriasPeca'
import { usePecas } from '../hooks/usePecas'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

const MAQUINAS_MOCK = [
  { id:1, modelo:'Lavadora Consul CWE10',     marca:'Consul',     capacidade:'10kg', estado:'disponivel', custoCompra:150, custoItens:180, custoServico:50,  precoVenda:650 },
  { id:2, modelo:'Lavadora LG WD-1014',       marca:'LG',         capacidade:'11kg', estado:'disponivel', custoCompra:180, custoItens:200, custoServico:40,  precoVenda:650 },
  { id:3, modelo:'Brastemp Active BWL12',     marca:'Brastemp',   capacidade:'12kg', estado:'em_revisao', custoCompra:120, custoItens:120, custoServico:55,  precoVenda:650 },
  { id:4, modelo:'Lavadora Consul Maré 8kg',  marca:'Consul',     capacidade:'8kg',  estado:'do_cliente',custoCompra:0,   custoItens:0,   custoServico:0,   precoVenda:0 },
  { id:5, modelo:'Electrolux LAC11',          marca:'Electrolux', capacidade:'11kg', estado:'vendida',   custoCompra:165, custoItens:155, custoServico:45,  precoVenda:650 },
]

const ESTADO_MAQUINA = {
  disponivel: { label:'Disponível', variant:'verde',   icon:'ti-circle-check' },
  em_revisao: { label:'Em revisão', variant:'amarelo', icon:'ti-tool' },
  do_cliente: { label:'Do cliente', variant:'azul',    icon:'ti-user' },
  vendida:    { label:'Vendida',    variant:'neutro',  icon:'ti-circle-dashed' },
}

const ABAS = [
  { id:'pecas',    label:'Peças',    icon:'ti-puzzle' },
  { id:'maquinas', label:'Máquinas', icon:'ti-device-washing-machine' },
]

// Tamanho da página da listagem de peças (paginação server-side via .range()).
// 20 cabe bem no viewport sem precisar scroll na maior parte das resoluções.
// Busca ignora a paginação (varre tudo que casa).
const PAGE_SIZE = 20

// Paleta Deutan-safe (sem verde puro / vermelho puro sem reforço). O badge
// da categoria sempre vem com label de texto, então o vermelho aqui não fere
// a regra "nunca cor isolada como significado".
const PALETA_CAT = ['#5B9BD5', '#FFD966', '#FF6B6B', '#B8CCE4']

// Hash determinístico de string → 0..N. Mesma categoria sempre mapeia pra
// mesma cor (estável entre sessões).
function corDaCategoria(catId) {
  if (!catId) return PALETA_CAT[0]
  let h = 0
  for (let i = 0; i < catId.length; i++) {
    h = (h * 31 + catId.charCodeAt(i)) | 0
  }
  return PALETA_CAT[Math.abs(h) % PALETA_CAT.length]
}

// Quando qtdMinima = 0 a peça está em modo "catálogo" — não controlamos
// estoque (caso das 680 peças importadas do BCM). Pra não poluir a tela
// com 680 "esgotado", devolvemos um nível neutro.
function nivelEstoque(qtd, min) {
  if (!min || min <= 0) return 'sem_controle'
  if (qtd <= 0) return 'esgotado'
  if (qtd <= min) return 'baixo'
  return 'ok'
}

function NivelBadge({ qtd, min, dark }) {
  const n = nivelEstoque(qtd, min)
  if (n === 'sem_controle') {
    return (
      <Badge variant="neutro" dark={dark} sm>
        <i className="ti ti-book-2" aria-hidden="true" /> Catálogo
      </Badge>
    )
  }
  if (n === 'esgotado') {
    return (
      <Badge variant="vermelho" dark={dark} sm>
        <i className="ti ti-alert-octagon" aria-hidden="true" /> Esgotado
      </Badge>
    )
  }
  if (n === 'baixo') {
    return (
      <Badge variant="amarelo" dark={dark} sm>
        <i className="ti ti-alert-triangle" aria-hidden="true" /> Baixo
      </Badge>
    )
  }
  return (
    <Badge variant="azul" dark={dark} sm>
      <i className="ti ti-check" aria-hidden="true" /> OK
    </Badge>
  )
}

function pctLucro(custo, venda) {
  if (!custo || !venda) return 0
  return Math.round(((venda - custo) / custo) * 100)
}

export default function Estoque({ T, dark, user }) {
  const notify = useToast()
  const isMobile = useIsMobile()
  const { abrirOSPorId, modalProps: osModalProps } = useOSDetalheModal({ notify, buscando: true })

  // Abre o cartão da peça a partir de um peca_id (usado pela ListaCompras)
  async function abrirPecaPorId(pecaId) {
    const { data, error } = await supabase.from('peca').select('*').eq('id', pecaId).single()
    if (!error && data) setPecaAberta(data)
  }

  // Funcionário não enxerga valores financeiros (custo, lucro, capital).
  // Só vê preço de venda + quantidade. Toggle único usado em todos os blocos.
  const mostraValores = isAdmin(user)

  const [aba, setAba] = useState('pecas')
  const [busca, setBusca] = useState('')
  const [buscaDebounced, setBuscaDebounced] = useState('')
  const [categoriaSel, setCategoriaSel] = useState('todas')
  const [pecaAberta, setPecaAberta] = useState(null)
  const [maquinaAberta, setMaquinaAberta] = useState(null)
  const [novaPecaAberta, setNovaPecaAberta] = useState(false)
  const [refetchKey, setRefetchKey] = useState(0)
  const [paginaAtual, setPaginaAtual] = useState(1)

  // Debounce 300ms na busca pra não bombardear o banco a cada tecla
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300)
    return () => clearTimeout(t)
  }, [busca])

  // Resetar pra página 1 sempre que mudar filtro (categoria ou busca).
  // Sem isso, ficar na pág 5 com categoria nova pode mostrar lista vazia.
  useEffect(() => {
    setPaginaAtual(1)
  }, [categoriaSel, buscaDebounced])

  // Hook principal — filtros server-side + paginação server-side
  const {
    pecas,
    total: totalFiltrado,
    loading: loadingPecas,
    error: errorPecas,
    criar: criarPeca,
    atualizar: atualizarPeca,
    ajustarEstoque: ajustarEstoquePeca,
  } = usePecas({
    categoria: categoriaSel,
    busca: buscaDebounced,
    page: paginaAtual,
    pageSize: PAGE_SIZE,
  })

  const buscando = !!buscaDebounced.trim()
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrado / PAGE_SIZE))

  // Stats globais (independem do filtro). Query light: só campos necessários
  // pra contagem por categoria e KPIs do header. Recarrega quando inserimos
  // ou atualizamos uma peça (via `refetchKey`).
  const [statsRaw, setStatsRaw] = useState([])
  useEffect(() => {
    let alive = true
    supabase
      .from('peca')
      .select('id, categoria, qtd_atual, qtd_minima, custo_atual')
      .is('deleted_at', null)
      .then(({ data }) => {
        if (!alive) return
        setStatsRaw(data || [])
      })
    return () => { alive = false }
  }, [refetchKey])

  // Relatório de peças em conserto: todos os itens de OS em em_oficina,
  // com indicação de quais têm estoque e quais estão faltando.
  const [listaCompras, setListaCompras] = useState([])

  useEffect(() => {
    let alive = true
    async function fetchListaCompras() {
      // Passo 1: OS em conserto (em_oficina) — query pequena, sem risco de limite
      const { data: osAtivas } = await supabase
        .from('os')
        .select('id, numero')
        .eq('etapa', 'em_oficina')
        .is('deleted_at', null)

      if (!alive) return
      if (!osAtivas?.length) { if (alive) setListaCompras([]); return }

      const osMap = Object.fromEntries(osAtivas.map(o => [o.id, o]))

      // Passo 2: itens dessas OS específicas (filtra no banco, evita limit 1000)
      const { data: itensFiltrados } = await supabase
        .from('os_item')
        .select('id, nome, quantidade, peca_id, os_id')
        .in('os_id', osAtivas.map(o => o.id))
        .is('deleted_at', null)

      if (!alive) return
      if (!itensFiltrados?.length) { if (alive) setListaCompras([]); return }

      // Passo 4: verifica estoque das peças vinculadas ao catálogo
      const pecaIds = [...new Set(itensFiltrados.filter(i => i.peca_id).map(i => i.peca_id))]
      const pecaMap = {}
      if (pecaIds.length) {
        const { data: pecas } = await supabase
          .from('peca').select('id, qtd_atual').in('id', pecaIds).is('deleted_at', null)
        for (const p of (pecas || [])) pecaMap[p.id] = p
      }

      // Passo 5: agrupa por peca_id (ou por nome p/ itens avulsos sem peca_id)
      // Cada grupo tem { nome, qtdTotal, qtdEstoque, temEstoque, os[] }
      const grupos = {}
      for (const item of itensFiltrados) {
        const key = item.peca_id || `avulso:${(item.nome || '').toLowerCase().trim()}`
        if (!grupos[key]) {
          const peca = item.peca_id ? pecaMap[item.peca_id] : null
          const qtdEstoque = peca ? (peca.qtd_atual ?? 0) : null  // null = avulso sem controle
          grupos[key] = {
            peca_id: item.peca_id || null,
            nome: item.nome || '—',
            qtdTotal: 0,
            qtdEstoque,
            temEstoque: qtdEstoque === null ? null : qtdEstoque > 0,
            os: [],
          }
        }
        grupos[key].qtdTotal += Number(item.quantidade) || 1
        const os = osMap[item.os_id]
        if (os && !grupos[key].os.find(o => o.id === os.id)) grupos[key].os.push(os)
      }

      // Ordena: faltando primeiro, depois ok, depois avulsos; dentro de cada grupo por qtd desc
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

  const [maquinas] = useState(MAQUINAS_MOCK)

  // CREATE — retorna { error } pro modal decidir se fecha ou continua
  async function adicionarPeca(nova) {
    const res = await criarPeca(nova)
    if (!res.error) setRefetchKey(k => k + 1)
    return res
  }

  // UPDATE — usado pelo PecaDetalheModal
  async function salvarEdicaoPeca(patch) {
    if (!pecaAberta) return { error: new Error('Sem peça aberta') }
    const { data, error } = await atualizarPeca(pecaAberta.id, patch)
    if (!error && data) {
      setPecaAberta(data)
      setRefetchKey(k => k + 1)
    }
    return { data, error }
  }

  // AJUSTE MANUAL — usado pelo AjusteEstoqueModal dentro do PecaDetalheModal
  async function ajustarEstoqueDaPeca(payload) {
    if (!pecaAberta) return { error: new Error('Sem peça aberta') }
    const { data, error } = await ajustarEstoquePeca(pecaAberta.id, payload)
    if (!error && data) {
      setPecaAberta(data)
      setRefetchKey(k => k + 1)
    }
    return { data, error }
  }

  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)

  // Contagem por categoria — usa snapshot global, não a lista filtrada
  const contagemCat = useMemo(() => {
    const m = {}
    for (const p of statsRaw) {
      const k = p.categoria || 'outros'
      m[k] = (m[k] || 0) + 1
    }
    return m
  }, [statsRaw])

  const maquinasFiltradas = useMemo(() => {
    const q = semAcento(busca.trim())
    if (!q) return maquinas
    return maquinas.filter(m =>
      semAcento(m.modelo).includes(q) ||
      semAcento(m.marca).includes(q) ||
      semAcento(m.capacidade).includes(q)
    )
  }, [maquinas, busca])

  // Stats globais (do snapshot completo)
  const totalGlobal  = statsRaw.length
  const totalPecas   = statsRaw.reduce((s, p) => s + (p.qtd_atual || 0), 0)
  const pecasBaixas  = statsRaw.filter(p => {
    const n = nivelEstoque(p.qtd_atual, p.qtd_minima)
    return n === 'esgotado' || n === 'baixo'
  }).length
  const valorPecas   = statsRaw.reduce(
    (s, p) => s + (p.qtd_atual || 0) * Number(p.custo_atual || 0),
    0
  )

  const disponiveis = maquinas.filter(m => m.estado === 'disponivel').length
  const emRevisao   = maquinas.filter(m => m.estado === 'em_revisao').length
  const valorMaquinas = maquinas
    .filter(m => m.estado === 'disponivel' || m.estado === 'em_revisao')
    .reduce((s, m) => s + (m.custoCompra + m.custoItens + m.custoServico), 0)

  const onPecas = aba === 'pecas'

  const headerStats = onPecas
    ? [
        { label: 'Itens em estoque', value: totalPecas,    color: azul },
        { label: 'Estoque baixo',    value: pecasBaixas,   color: pecasBaixas > 0 ? amarelo : T.textDim },
        // Valor em peças = custo × quantidade — só pro dono
        mostraValores && { label: 'Valor em peças', value: fmtBRL(valorPecas), color: corHero(dark) },
      ].filter(Boolean)
    : [
        { label: 'Disponíveis',  value: disponiveis,            color: disponiveis > 0 ? verde : T.textDim },
        { label: 'Em revisão',   value: emRevisao,              color: emRevisao > 0 ? amarelo : T.textDim },
        // Capital parado = soma dos custos das máquinas disponíveis/revisão — só pro dono
        mostraValores && { label: 'Capital parado', value: fmtBRL(valorMaquinas), color: corHero(dark) },
      ].filter(Boolean)

  function placeholder(msg) {
    notify('info', msg || 'Em breve — Módulo 06 do plano')
  }

  async function abrirPedidoOrcamento() {
    const { data, error: err } = await supabase
      .from('peca')
      .select('nome, sku, modelo, modelos_compativeis, marca, qtd_atual, qtd_minima')
      .is('deleted_at', null)
      .order('nome')

    if (err) { notify('erro', 'Erro ao buscar peças'); return }

    // Inclui: esgotadas (qtd=0, independente de qtd_minima) +
    //         baixo (qtd_minima>0 e qtd<=min)
    const emFalta = (data || []).filter(p => {
      const qtd = Number(p.qtd_atual ?? 0)
      const min = Number(p.qtd_minima ?? 0)
      return qtd <= 0 || (min > 0 && qtd <= min)
    })

    if (emFalta.length === 0) {
      notify('info', 'Nenhuma peça com estoque baixo ou esgotado no momento')
      return
    }

    const hoje = new Date().toLocaleDateString('pt-BR')

    // Monta dados por peça (reutilizado tanto no HTML quanto no texto WPP)
    const itensMontados = emFalta.map((p, i) => {
      let compat = p.modelos_compativeis
      if (typeof compat === 'string') compat = compat.split(/[,;\n]/).map(s => s.trim()).filter(Boolean)
      else if (!Array.isArray(compat)) compat = []
      const modelos = [p.modelo, ...compat].filter(Boolean).join(', ') || '—'
      const qtdNecessaria = Math.max(1, Number(p.qtd_minima ?? 0) - Number(p.qtd_atual ?? 0))
      return { i: i + 1, nome: p.nome || '', sku: p.sku || '', modelos, qtd: qtdNecessaria }
    })

    const rows = itensMontados.map(it => `
        <tr>
          <td>${it.i}</td>
          <td><strong>${it.nome}</strong>${it.sku ? `<br><small>SKU: ${it.sku}</small>` : ''}</td>
          <td>${it.modelos}</td>
          <td style="text-align:center">${it.qtd}</td>
          <td></td>
        </tr>`).join('')

    // Texto para WhatsApp (embutido no HTML como variável JS)
    const linhasWpp = [
      `*Pedido de Orcamento - IDEMAQ*`,
      `Data: ${hoje}`,
      '',
      ...itensMontados.map(it =>
        `${it.i}. ${it.nome}${it.sku ? ` (SKU: ${it.sku})` : ''}\n   Modelo(s): ${it.modelos}\n   Qtd: ${it.qtd}`
      ),
      '',
      'IDEMAQ Assistencia Tecnica - Navirai/MS',
    ]
    const wppEscaped = JSON.stringify(linhasWpp.join('\n'))

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Pedido de Orcamento - IDEMAQ - ${hoje}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:28px 32px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px}
  h1{font-size:20px;font-weight:700}
  .empresa{font-size:9px;color:#555;margin-top:3px}
  .sub{font-size:11px;color:#666;margin-top:4px}
  .btns{display:flex;gap:8px;align-items:center}
  table{width:100%;border-collapse:collapse;font-size:11.5px}
  th{background:#1a3a6e;color:#fff;padding:8px 10px;text-align:left;font-size:10.5px;font-weight:700}
  td{padding:7px 10px;border-bottom:1px solid #e0e0e0;vertical-align:middle}
  tr:nth-child(even) td{background:#f7f9fc}
  small{color:#888;font-size:9.5px}
  .obs{margin-top:22px;font-size:11px;color:#444}
  .obs-box{width:100%;border:1px solid #ccc;border-radius:4px;padding:6px 8px;font-size:11px;min-height:48px;font-family:inherit;resize:vertical}
  .footer{margin-top:36px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;font-size:11px;color:#444}
  .footer-line{border-top:1px solid #333;padding-top:5px;margin-top:28px}
  @media print{
    body{padding:8mm 10mm}
    .no-print{display:none!important}
    .obs-box{border:none;background:transparent;padding:0}
  }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>Pedido de Orcamento</h1>
    <div class="empresa">IDEMAQ Assistencia Tecnica LTDA &nbsp;·&nbsp; Navirai / MS</div>
    <div class="sub">Data: ${hoje} &nbsp;·&nbsp; ${emFalta.length} item${emFalta.length !== 1 ? 's' : ''}</div>
  </div>
  <div class="btns no-print">
    <button onclick="window.print()"
      style="padding:8px 16px;background:#1a3a6e;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600">
      Imprimir / Salvar PDF
    </button>
    <button onclick="enviarWpp()"
      style="padding:8px 16px;background:#25a244;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600">
      Enviar via WhatsApp
    </button>
  </div>
</div>
<table>
  <thead>
    <tr>
      <th style="width:28px">#</th>
      <th>Nome da Peca</th>
      <th>Modelo(s) da Maquina</th>
      <th style="width:50px;text-align:center">Qtd</th>
      <th>Valor Unit. R$</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
<div class="obs">
  <strong>Observacoes:</strong><br><br>
  <textarea class="obs-box" placeholder="Condicoes, prazo de entrega, frete..."></textarea>
</div>
<div class="footer">
  <div><div>Fornecedor</div><div class="footer-line">___________________________</div></div>
  <div><div>Responsavel</div><div class="footer-line">___________________________</div></div>
  <div><div>Validade do orcamento</div><div class="footer-line">___________________________</div></div>
</div>
<script>
  var _wppText = ${wppEscaped};
  function enviarWpp() { window.location.href = 'whatsapp://send?text=' + encodeURIComponent(_wppText); }
</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) { notify('erro', 'Popup bloqueado — libere popups neste site'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
  }

  // Texto do subtítulo:
  // - loading: "Carregando…"
  // - buscando: "N resultado(s) para 'termo'" (varre tudo, sem paginar)
  // - sem busca: "página A de B · N de Y peças" (Y = totalGlobal)
  const sufixoBaixas = pecasBaixas > 0 ? ` · ${pecasBaixas} precisam de reposição` : ''
  const subtitlePecas = loadingPecas
    ? 'Carregando peças…'
    : buscando
      ? `${totalFiltrado} resultado${totalFiltrado === 1 ? '' : 's'} para "${buscaDebounced}"${sufixoBaixas}`
      : `página ${paginaAtual} de ${totalPaginas} · ${pecas.length} de ${totalGlobal} peças${sufixoBaixas}`

  return (
    <div style={{
      padding: '20px 24px 32px',
      overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Estoque"
        subtitle={onPecas ? subtitlePecas : `${maquinasFiltradas.length} de ${maquinas.length} máquinas`}
        stats={headerStats}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {onPecas && (
              <Button variant="secondary" T={T} dark={dark}
                iconLeft="ti-file-text"
                onClick={abrirPedidoOrcamento}>
                Pedido de Orçamento
              </Button>
            )}
            <Button variant="secondary" T={T} dark={dark}
              iconLeft="ti-file-upload"
              onClick={() => placeholder('Entrada por nota fiscal (IA) — próximos chats')}>
              Por NF
            </Button>
            <Button variant="primary" iconLeft="ti-plus"
              onClick={() => onPecas
                ? setNovaPecaAberta(true)
                : placeholder('Cadastro de máquina em breve')}>
              {onPecas ? 'Cadastro de Peças' : 'Nova máquina'}
            </Button>
          </div>
        }
      />

      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs T={T} dark={dark}
            options={ABAS}
            value={aba}
            onChange={(v) => { setAba(v); setBusca(''); setBuscaDebounced(''); setCategoriaSel('todas') }}
            variant="segmented"
          />
          <div style={{ width: 1, height: 24, background: T.border }} />
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Input T={T} dark={dark}
              value={busca} onChange={setBusca}
              icon="ti-search"
              placeholder={onPecas
                ? 'Buscar por nome, SKU ou referência…'
                : 'Buscar máquina por modelo, marca ou capacidade…'}
            />
            {/* Indicador discreto de "buscando" enquanto o debounce ainda não disparou */}
            {onPecas && busca !== buscaDebounced && (
              <span style={{
                position: 'absolute', right: 10, top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 11, color: T.textMuted,
                pointerEvents: 'none',
              }}>
                <i className="ti ti-loader-2 ti-spin" aria-hidden="true" />
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Chips de categoria — só na aba Peças. Espelha o checklist do diagnóstico
          pra técnico achar peças por tipo (eletrobomba, válvula, trava da porta, etc.). */}
      {onPecas && (
        <FiltroCategorias T={T} dark={dark}
          categoriaSel={categoriaSel}
          onSelecionar={setCategoriaSel}
          contagem={contagemCat}
          total={totalGlobal}
        />
      )}

      {/* Aviso de compras: itens de OS confirmadas que estão sem estoque */}
      {onPecas && listaCompras.length > 0 && (
        <ListaCompras T={T} dark={dark} itens={listaCompras}
          onClickOS={abrirOSPorId}
          onClickPeca={abrirPecaPorId} />
      )}

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
            onAbrir={(m) => setMaquinaAberta(m)} />}

      {pecaAberta && (
        <PecaDetalheModal T={T} dark={dark}
          peca={pecaAberta}
          mostraValores={mostraValores}
          onSalvar={salvarEdicaoPeca}
          onAjustar={ajustarEstoqueDaPeca}
          onClose={() => setPecaAberta(null)} />
      )}

      {osModalProps && (
        <OSDetalhe {...osModalProps} T={T} dark={dark} mobile={isMobile} />
      )}

      {maquinaAberta && (
        <MaquinaDetalheModal T={T} dark={dark}
          maquina={maquinaAberta}
          mostraValores={mostraValores}
          onClose={() => setMaquinaAberta(null)} />
      )}

      {novaPecaAberta && (
        <NovaPecaModal T={T} dark={dark}
          onClose={() => setNovaPecaAberta(false)}
          onSalvar={adicionarPeca} />
      )}
    </div>
  )
}

// =============================================================================
// PEÇAS — listagem
// =============================================================================
// Quando NÃO está buscando: pagina (PAGE_SIZE por vez). Header mostra
// "página A de B · N de totalFiltrado". Footer com botões anterior/próximo.
// Quando está buscando: traz tudo que casa (sem paginar). Header mostra só
// a contagem de resultados.
function ListaPecas({
  T, dark, itens, total, busca, onAbrir, mostraValores = true,
  buscando = false,
  totalFiltrado = 0,
  paginaAtual = 1, totalPaginas = 1, pageSize = 20,
  onPagina,
}) {
  // Grid muda conforme o papel: dono vê 6 colunas, funcionário 4 (sem Custo + Lucro)
  const gridCols = mostraValores
    ? '1fr 90px 110px 110px 90px 90px'
    : '1fr 90px 110px 90px'

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

  // Texto da contagem no header: "N de M" (M=totalFiltrado quando buscando,
  // M=total global quando não). Mostra também a página quando aplicável.
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
          }
        >Peças</SectionHeader>
      </div>

      {/* Cabeçalho da "tabela" */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: 10, alignItems: 'center',
        padding: '8px 16px',
        borderTop: `1px solid ${T.border}`,
        background: T.cardAlt,
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
              display: 'grid',
              gridTemplateColumns: gridCols,
              gap: 10, alignItems: 'center',
              padding: '12px 16px',
              borderTop: `1px solid ${T.border}`,
              cursor: 'pointer',
              transition: 'background .12s',
              outline: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.cardAlt}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            onFocus={e => e.currentTarget.style.background = T.cardAlt}
            onBlur={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: corHero(dark),
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {p.favorito && (
                  <i className="ti ti-star-filled"
                     title="Peça favorita"
                     style={{ color: '#f59e0b', flexShrink: 0, fontSize: 14 }} />
                )}
                {p.nome}
                {p.categoria && catInfo && (
                  <span style={{
                    fontSize: 9.5, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 4,
                    background: catCor + '22',
                    color: catCor,
                    border: `1px solid ${catCor}55`,
                    textTransform: 'uppercase', letterSpacing: '.3px',
                    flexShrink: 0,
                  }}>
                    {catInfo.label}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2, display: 'flex', gap: 8 }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.sku || '—'}</span>
                {p.fornecedor && (<>
                  <span>·</span>
                  <span>{p.fornecedor}</span>
                </>)}
                {p.marca && (<>
                  <span>·</span>
                  <span>{p.marca}</span>
                </>)}
              </div>
            </div>

            <div style={{
              textAlign: 'right', fontSize: 13, fontWeight: 600,
              color: corHero(dark),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {p.qtdAtual}
              <span style={{ color: T.textDim, fontWeight: 400, fontSize: 11 }}> / {p.qtdMinima}</span>
            </div>

            {mostraValores && (
              <div style={{
                textAlign: 'right', fontSize: 12.5,
                color: T.textSecondary,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtBRL(p.custoAtual)}
              </div>
            )}

            <div style={{
              textAlign: 'right', fontSize: 13, fontWeight: 600,
              color: corHero(dark),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtBRL(p.precoVenda)}
            </div>

            {mostraValores && (
              <div style={{
                textAlign: 'right', fontSize: 12, fontWeight: 600,
                color: lucro > 100 ? corEtapa('blue', dark) : T.textSecondary,
                fontVariantNumeric: 'tabular-nums',
              }}>
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
          paginaAtual={paginaAtual}
          totalPaginas={totalPaginas}
          totalItens={total}
          pageSize={pageSize}
          onPagina={onPagina}
        />
      )}
    </Card>
  )
}

// =============================================================================
// PAGINAÇÃO — footer da listagem
// =============================================================================
// Aparece só quando NÃO está buscando E totalPaginas > 1. Mostra range
// (ex: "21–40 de 680") + botões anterior/próximo. Padrão Idemaq: ghost
// buttons + ícones Tabler.
function PaginacaoFooter({ T, dark, paginaAtual, totalPaginas, totalItens, pageSize, onPagina }) {
  const podeAnterior = paginaAtual > 1
  const podeProxima = paginaAtual < totalPaginas
  const from = (paginaAtual - 1) * pageSize + 1
  const to = Math.min(paginaAtual * pageSize, totalItens)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, flexWrap: 'wrap',
      padding: '10px 16px',
      borderTop: `1px solid ${T.border}`,
      background: T.cardAlt,
    }}>
      <div style={{
        fontSize: 11.5, color: T.textMuted,
        fontVariantNumeric: 'tabular-nums',
      }}>
        Exibindo <strong style={{ color: T.textSecondary, fontWeight: 600 }}>{from}–{to}</strong> de <strong style={{ color: T.textSecondary, fontWeight: 600 }}>{totalItens}</strong>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Button T={T} dark={dark} variant="ghost" size="sm"
          iconLeft="ti-chevron-left"
          disabled={!podeAnterior}
          onClick={() => onPagina?.(Math.max(1, paginaAtual - 1))}>
          Anterior
        </Button>
        <span style={{
          fontSize: 11.5, color: T.textMuted,
          padding: '0 8px',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}>
          Página <strong style={{ color: T.textSecondary, fontWeight: 700 }}>{paginaAtual}</strong> de <strong style={{ color: T.textSecondary, fontWeight: 700 }}>{totalPaginas}</strong>
        </span>
        <Button T={T} dark={dark} variant="ghost" size="sm"
          iconRight="ti-chevron-right"
          disabled={!podeProxima}
          onClick={() => onPagina?.(Math.min(totalPaginas, paginaAtual + 1))}>
          Próxima
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// MÁQUINAS — mock (Módulo 07)
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
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 12,
    }}>
      {itens.map(m => {
        const est = ESTADO_MAQUINA[m.estado] || ESTADO_MAQUINA.disponivel
        const custoTotal = (m.custoCompra || 0) + (m.custoItens || 0) + (m.custoServico || 0)
        const lucro = pctLucro(custoTotal, m.precoVenda)
        const corEst = corEtapa(
          est.variant === 'verde' ? 'green'
          : est.variant === 'amarelo' ? 'yellow'
          : est.variant === 'azul' ? 'blue'
          : 'neutro',
          dark
        )

        return (
          <Card key={m.id} T={T} dark={dark} hover
            accent={corEst}
            onClick={() => onAbrir(m)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: corHero(dark),
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 3,
                }}>
                  {m.modelo}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', gap: 8 }}>
                  <span>{m.marca}</span>
                  <span>·</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{m.capacidade}</span>
                </div>
              </div>
              <Badge variant={est.variant} dark={dark} sm>
                <i className={`ti ${est.icon}`} aria-hidden="true" /> {est.label}
              </Badge>
            </div>

            {/* Bloco de números — funcionário vê só Venda; dono vê custo + margem */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: mostraValores ? '1fr 1fr' : '1fr',
              gap: 10,
              padding: '10px 12px',
              background: T.cardAlt,
              borderRadius: 8,
              border: `1px solid ${T.border}`,
            }}>
              {mostraValores && (
                <div>
                  <div style={{
                    fontSize: 10, color: T.textMuted, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    marginBottom: 2,
                  }}>
                    Custo total
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700,
                    color: corHero(dark),
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {custoTotal > 0 ? fmtBRL(custoTotal) : '—'}
                  </div>
                </div>
              )}
              <div style={{ textAlign: mostraValores ? 'right' : 'left' }}>
                <div style={{
                  fontSize: 10, color: T.textMuted, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  marginBottom: 2,
                }}>
                  Venda
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: corHero(dark),
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {m.precoVenda > 0 ? fmtBRL(m.precoVenda) : '—'}
                </div>
              </div>
              {mostraValores && custoTotal > 0 && m.precoVenda > 0 && (
                <div style={{ gridColumn: '1 / -1', fontSize: 11, color: T.textMuted, paddingTop: 6, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Margem</span>
                  <span style={{ color: azul, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtBRL(m.precoVenda - custoTotal)} · {lucro}%
                  </span>
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
// PEÇAS EM CONSERTO — relatório geral de itens das OS em em_oficina
// =============================================================================
// Mostra TODOS os itens das OS em conserto, com badge de status:
//   • Azul   = tem estoque suficiente
//   • Vermelho = faltando (sem estoque ou qtd insuficiente)
//   • Cinza  = item avulso (sem vínculo no catálogo)
// Ordenado: faltando primeiro → com estoque → avulsos.
function ListaCompras({ T, dark, itens, onClickOS, onClickPeca }) {
  const amarelo = corEtapa('yellow', dark)
  const azul    = corEtapa('blue', dark)
  const vermelho = corEtapa('red', dark)
  const [expandido, setExpandido] = useState(true)

  const faltando = itens.filter(i => i.temEstoque === false).length
  const temEstoque = itens.filter(i => i.temEstoque === true).length
  const accentColor = faltando > 0 ? amarelo : azul

  return (
    <Card T={T} dark={dark} padding={0} style={{ border: `1.5px solid ${accentColor}44` }}>
      {/* Header colapsável */}
      <div
        role="button" tabIndex={0}
        onClick={() => setExpandido(v => !v)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandido(v => !v) } }}
        style={{
          padding: '10px 16px',
          background: accentColor + '15',
          borderBottom: expandido ? `1px solid ${accentColor}30` : 'none',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', outline: 'none',
        }}
      >
        <i className="ti ti-tools" style={{ color: accentColor, fontSize: 15, flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontWeight: 700, fontSize: 13, color: accentColor }}>
          Peças em Conserto
        </span>
        {/* Contador total */}
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '1px 7px', borderRadius: 8,
          background: accentColor + '25', color: accentColor,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {itens.length} {itens.length === 1 ? 'item' : 'itens'}
        </span>
        {/* Indicador de faltas */}
        {faltando > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 700,
            padding: '1px 7px', borderRadius: 8,
            background: vermelho + '20', color: vermelho,
            border: `1px solid ${vermelho}40`,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 10, marginRight: 3 }} aria-hidden="true" />
            {faltando} faltando
          </span>
        )}
        {faltando === 0 && temEstoque > 0 && (
          <span style={{ fontSize: 11, color: T.textMuted }}>tudo no estoque</span>
        )}
        <i
          className={`ti ti-chevron-${expandido ? 'up' : 'down'}`}
          style={{ color: T.textMuted, fontSize: 13, marginLeft: 'auto' }}
          aria-hidden="true"
        />
      </div>

      {/* Cabeçalho da tabela */}
      {expandido && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 70px 80px',
          gap: 8, padding: '6px 16px',
          borderBottom: `1px solid ${T.border}`,
          background: T.cardAlt,
          fontSize: 10, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          <div>Item · OS</div>
          <div style={{ textAlign: 'right' }}>Qtd</div>
          <div style={{ textAlign: 'right' }}>Estoque</div>
        </div>
      )}

      {/* Linhas de itens */}
      {expandido && itens.map((item, i) => {
        const falta = item.temEstoque === false
        const avulso = item.temEstoque === null
        const ok = item.temEstoque === true
        const rowAccent = falta ? vermelho : ok ? azul : T.border

        return (
          <div key={item.peca_id || `avulso-${i}`} style={{
            display: 'grid', gridTemplateColumns: '1fr 70px 80px',
            alignItems: 'center', gap: 8,
            padding: '9px 16px',
            borderTop: `1px solid ${T.border}`,
            borderLeft: `3px solid ${rowAccent}`,
          }}>
            {/* Nome + OS */}
            <div style={{ minWidth: 0 }}>
              <div
                onClick={item.peca_id && onClickPeca ? () => onClickPeca(item.peca_id) : undefined}
                style={{
                  fontSize: 13, fontWeight: 600, color: corHero(dark),
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  cursor: item.peca_id && onClickPeca ? 'pointer' : 'default',
                  textDecoration: item.peca_id && onClickPeca ? 'underline' : 'none',
                  textDecorationColor: item.peca_id && onClickPeca ? corHero(dark) + '60' : 'transparent',
                }}
              >
                {item.nome}
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
                {item.os.map(o => (
                  <span
                    key={o.id}
                    onClick={onClickOS ? () => onClickOS(o.id) : undefined}
                    style={{
                      fontSize: 10, color: T.textMuted,
                      background: T.cardAlt, border: `1px solid ${T.border}`,
                      padding: '1px 5px', borderRadius: 4,
                      fontVariantNumeric: 'tabular-nums',
                      cursor: onClickOS ? 'pointer' : 'default',
                    }}
                  >
                    OS #{o.numero}
                  </span>
                ))}
              </div>
            </div>

            {/* Quantidade necessária */}
            <div style={{
              textAlign: 'right', fontSize: 13, fontWeight: 700,
              color: corHero(dark), fontVariantNumeric: 'tabular-nums',
            }}>
              {item.qtdTotal}
            </div>

            {/* Badge de status */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {avulso ? (
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  padding: '2px 7px', borderRadius: 6,
                  background: T.cardAlt, color: T.textMuted,
                  border: `1px solid ${T.border}`,
                  whiteSpace: 'nowrap',
                }}>
                  Avulso
                </span>
              ) : falta ? (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 6,
                  background: vermelho + '18', color: vermelho,
                  border: `1px solid ${vermelho}44`,
                  whiteSpace: 'nowrap',
                }}>
                  <i className="ti ti-alert-octagon" style={{ fontSize: 9, marginRight: 3 }} aria-hidden="true" />
                  Faltando
                </span>
              ) : (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 6,
                  background: azul + '18', color: azul,
                  border: `1px solid ${azul}44`,
                  whiteSpace: 'nowrap',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  <i className="ti ti-check" style={{ fontSize: 9, marginRight: 3 }} aria-hidden="true" />
                  {item.qtdEstoque} un.
                </span>
              )}
            </div>
          </div>
        )
      })}
    </Card>
  )
}

// =============================================================================
// FILTRO DE CATEGORIAS — chips horizontais (scroll quando excede)
// =============================================================================
function FiltroCategorias({ T, dark, categoriaSel, onSelecionar, contagem, total }) {
  return (
    <Card T={T} dark={dark} padding="10px 14px">
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        overflowX: 'auto', overflowY: 'hidden',
        scrollbarWidth: 'thin',
      }}>
        <span style={{
          fontSize: 10.5, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.04em',
          flexShrink: 0, marginRight: 4,
        }}>
          <i className="ti ti-category" style={{ fontSize: 12, marginRight: 4, verticalAlign: 'middle' }} aria-hidden="true" />
          Categoria
        </span>

        <ChipCategoria T={T} dark={dark}
          label="Todas" count={total}
          ativo={categoriaSel === 'todas'}
          cor={corEtapa('blue', dark)}
          onClick={() => onSelecionar('todas')}
        />

        {CATEGORIAS_PECA.map(cat => {
          const count = contagem[cat.id] || 0
          if (count === 0) return null  // só mostra categorias com pelo menos 1 peça
          return (
            <ChipCategoria key={cat.id} T={T} dark={dark}
              label={cat.label} count={count}
              ativo={categoriaSel === cat.id}
              cor={corDaCategoria(cat.id)}
              onClick={() => onSelecionar(cat.id)}
            />
          )
        })}
      </div>
    </Card>
  )
}

function ChipCategoria({ T, dark, label, count, ativo, cor, onClick }) {
  const bg = ativo ? cor + '33' : 'transparent'
  const corT = ativo ? cor : T.textMuted
  const borderC = ativo ? cor + '88' : T.border

  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '5px 10px', borderRadius: 14,
      background: bg, border: `1px solid ${borderC}`,
      color: corT,
      fontSize: 11.5, fontWeight: ativo ? 700 : 500,
      cursor: 'pointer', fontFamily: 'inherit',
      transition: 'all .12s',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {label}
      <span style={{
        fontSize: 10, fontWeight: 700,
        padding: '1px 5px', borderRadius: 8,
        background: ativo ? cor : T.cardAlt,
        color: ativo ? '#fff' : T.textMuted,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {count}
      </span>
    </button>
  )
}

// =============================================================================
// SKELETON — placeholder enquanto a query inicial carrega
// =============================================================================
function PecasSkeleton({ T, dark, mostraValores }) {
  const gridCols = mostraValores
    ? '1fr 90px 110px 110px 90px 90px'
    : '1fr 90px 110px 90px'
  const bar = (w) => (
    <div style={{
      height: 10, width: w, borderRadius: 4,
      background: T.cardAlt,
      border: `1px solid ${T.border}`,
      opacity: 0.7,
    }} />
  )
  return (
    <Card T={T} dark={dark} padding={0}>
      <div style={{ padding: '12px 16px 10px' }}>
        <SectionHeader T={T} dark={dark} icon="ti-puzzle" mb={0}>
          <span style={{ opacity: 0.5 }}>Carregando peças…</span>
        </SectionHeader>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: 10, alignItems: 'center',
        padding: '8px 16px',
        borderTop: `1px solid ${T.border}`,
        background: T.cardAlt,
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
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: 10, alignItems: 'center',
          padding: '14px 16px',
          borderTop: `1px solid ${T.border}`,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {bar(`${50 + ((i * 7) % 35)}%`)}
            {bar('40%')}
          </div>
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '20px 16px',
        color: corEtapa('red', dark),
        fontSize: 13,
      }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 18 }} aria-hidden="true" />
        <div>
          <div style={{ fontWeight: 600 }}>Erro ao carregar peças</div>
          <div style={{ color: T.textMuted, fontSize: 11.5, marginTop: 2 }}>{mensagem}</div>
        </div>
      </div>
    </Card>
  )
}
