// idemaq-src/_legacy/mobileComponents.jsx
//
// Componentes mobile do App.jsx monolítico — extraídos verbatim em 14/05/2026.
// Visual e comportamento 100% idênticos. Pendente de refatoração futura.
//
// Inclui:
//   - PainelMobile   (painel resumido pra mobile)
//   - OSMobile       (kanban mobile com 2 modos: Painel/Coluna + swipe)
//   - PullToRefresh  (gesto de "puxe para atualizar")
//   - BottomSheet    (sheet de filtros mobile)
//   - OSCardMobile   (card de OS otimizado pra toque)

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { P } from '../theme'
import {
  TIPOS_OS, ETAPAS_TODOS, ZONAS, FUNCIONARIOS,
} from '../utils/osData'
import {
  isAdmin, getRole, responsavelAtual,
  totalAPagar, estaPagaTotal, estaPagaParcial,
  calcStatusPrazo, diasPrazo,
  dentroMesCorrente,
} from '../utils/osHelpers'
import { fmtPrazoCurto } from '../utils/fmt'
import { corEtapa, bgEtapa } from '../utils/colors'
import { useOS } from '../hooks/useOS'
import { useUsuarios } from '../hooks/useUsuarios'
import { NovaOSModal, OSDetalhe } from './desktopKanbanModals'

function PainelMobile({ T, dark }) {
  const cor = (d, c) => dark ? d : c
  const kpis = [
    { label:'Faturamento mai', valor:'R$ 14.260', cor:cor(P.blue,P.blueDark),           ico:'ti-cash' },
    { label:'Saldo líquido',   valor:'R$ 4.420',  cor:cor(P.blueLight,P.blueLightDark), ico:'ti-trending-up' },
    { label:'A pagar hoje',    valor:'R$ 2.090',  cor:cor(P.red,P.redDark),             ico:'ti-receipt' },
    { label:'Máq. na oficina', valor:'18',         cor:cor(P.yellow,P.yellowDark),       ico:'ti-building-warehouse' },
  ]
  const agendamentos = [
    { hr:'08:30', tipo:'urgente', nm:'Ana Reis · Lavadora LG',              svc:'Diagnóstico', tempo:'1h 20min' },
    { hr:'10:00', tipo:'hoje',    nm:'João Costa · Geladeira Consul',        svc:'Manutenção',  tempo:'2h 50min' },
    { hr:'14:00', tipo:'hoje',    nm:'Maria Silva · Fogão Brastemp',         svc:'Limpeza',     tempo:'6h 50min' },
    { hr:'09:00', tipo:'proximo', nm:'Carlos Lima · Micro-ondas Electrolux', svc:'Orçamento',   tempo:'amanhã' },
  ]
  const calCor = t => t==='urgente'?cor(P.red,P.redDark):t==='hoje'?cor(P.yellow,P.yellowDark):cor(P.green,P.greenDark)
  const calBg  = t => t==='urgente'?cor('#2a1515','#fde8e8'):t==='hoje'?cor('#2a2000','#fdf6dc'):cor('#0f2a15','#e8f5ec')
  const alertas = [
    { dot:cor(P.red,P.redDark),       msg:'OS #1031 · João Costa · R$ 320 vencido',  badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Vencido</Badge> },
    { dot:cor(P.red,P.redDark),       msg:'OS #1036 · Ana Reis · R$ 215 vencido',    badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Vencido</Badge> },
    { dot:cor(P.yellow,P.yellowDark), msg:'Aluguel vence amanhã · R$ 1.200',         badge:<Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Amanhã</Badge> },
    { dot:cor(P.red,P.redDark),       msg:'OS #1037 · Diagnóstico há 31h',           badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>31h</Badge> },
    { dot:cor(P.red,P.redDark),       msg:'OS #1036 · Ana Reis · 2 dias atrasado',   badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Atrasada</Badge> },
    { dot:cor(P.red,P.redDark),       msg:'Rolamento do cesto · Esgotado',           badge:<Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>Esgotado</Badge> },
  ]
  const sep = dark ? '#1e1e20' : '#f0f0f2'
  const card = { background:T.card, borderRadius:12, padding:'14px 15px', border:`1px solid ${T.border}` }

  return (
    <div style={{ padding:'1rem', overflowY:'auto', flex:1, display:'flex', flexDirection:'column', gap:10, paddingBottom:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {kpis.map((k,i) => (
          <div key={i} style={{ background:T.card, borderRadius:12, border:`1px solid ${T.border}`, overflow:'hidden' }}>
            <div style={{ height:3, background:k.cor }} />
            <div style={{ padding:'12px 13px' }}>
              <i className={`ti ${k.ico}`} style={{ fontSize:18, color:k.cor, marginBottom:6, display:'block' }} aria-hidden="true" />
              <div style={{ fontSize:18, fontWeight:700, color:k.cor, letterSpacing:'-.5px' }}>{k.valor}</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={card}>
        <SecTitle icon="ti-calendar-event" T={T}>Agendamentos de hoje</SecTitle>
        {agendamentos.map((a,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:i<agendamentos.length-1?`1px solid ${sep}`:'none' }}>
            <div style={{ width:3, height:36, borderRadius:2, flexShrink:0, background:calCor(a.tipo) }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, color:T.textSecondary, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.nm}</div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>{a.hr} · {a.svc}</div>
            </div>
            <Badge color={calCor(a.tipo)} bg={calBg(a.tipo)} border={calCor(a.tipo)+'33'}>{a.tempo}</Badge>
          </div>
        ))}
      </div>
      <div style={card}>
        <SecTitle icon="ti-alert-triangle" T={T} right={<CountBadge n="6" red T={T} dark={dark} />}>Alertas</SecTitle>
        {alertas.map((a,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0', borderBottom:i<alertas.length-1?`1px solid ${sep}`:'none' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:a.dot }} />
            <div style={{ flex:1, fontSize:13, color:T.textSecondary }}>{a.msg}</div>
            {a.badge}
          </div>
        ))}
      </div>
      <div style={card}>
        <SecTitle icon="ti-clipboard-list" T={T}>Situação das OS</SecTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:6 }}>
          {[
            { label:'Ag.',         n:2, cor:T.osNeutroT,                  bg:T.osNeutro },
            { label:'Diagnóstico', n:2, cor:cor(P.yellow,P.yellowDark),   bg:cor('#2a2000','#fdf6dc') },
            { label:'Orçamento',   n:2, cor:cor(P.red,P.redDark),         bg:cor('#2a1515','#fde8e8') },
            { label:'Finalizado',  n:1, cor:cor(P.green,P.greenDark),     bg:cor('#0f2a15','#e8f5ec') },
          ].map((os,i) => (
            <div key={i} style={{ borderRadius:8, padding:'9px 6px', textAlign:'center', background:os.bg }}>
              <div style={{ fontSize:18, fontWeight:700, color:os.cor }}>{os.n}</div>
              <div style={{ fontSize:10, marginTop:2, color:os.cor, opacity:.85 }}>{os.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── OS Mobile ─────────────────────────────────────────────────────────────
// Reescrito do zero com referência Trello: 2 modos (Painel + Coluna) + swipe lateral.
// Totalmente isolado do OS desktop. Compartilha apenas mocks/helpers/configs.

function OSMobile({ T, dark, user, onSetRefetch }) {
  const cor = (d, c) => dark ? d : c
  const admin = isAdmin(user)

  // ── Modo de visualização: 'coluna' (1 etapa por vez + swipe) ou 'painel' (visão geral)
  const [modo, setModo] = useState('coluna')
  const [colIdx, setColIdx] = useState(0)

  // ── Filtros
  const [zona, setZona] = useState('externo')
  const [tiposAtivos, setTiposAtivos] = useState(() => new Set(Object.keys(TIPOS_OS)))
  function toggleTipo(id) {
    setTiposAtivos(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  const [filtro, setFiltro]             = useState('todas')
  const [funcionario, setFuncionario]   = useState('todos')
  const [verAgPeca, setVerAgPeca]       = useState(false)
  const [verRecusados, setVerRecusados] = useState(false)
  const [busca, setBusca]               = useState('')

  // ── Modais e sheets
  const [modalNova, setModalNova] = useState(false)
  const [detalhe, setDetalhe]     = useState(null)
  const [sheet, setSheet]         = useState(null)
  const [verRecusadasList, setVerRecusadasList] = useState(false)

  // Ref pro scroll area da coluna (usado pra detectar topo do scroll)
  const scrollAreaRef = useRef(null)

  const buscando = busca.trim().length > 0
  // useOS para mobile — conectado ao Supabase
  const { osList, loading: osLoading, refetch: osRefetch } = useOS(buscando)
  const { usuarios } = useUsuarios()

  // Expõe refetch para o pull-to-refresh do pai (App)
  useEffect(() => {
    if (onSetRefetch) onSetRefetch(() => osRefetch)
  }, [osRefetch, onSetRefetch])

  // ── Etapas visíveis
  // No modo Lista: só as etapas da zona selecionada.
  // No modo Painel: TODAS as etapas (independente da zona).
  const zonaCfg = ZONAS.find(z => z.id === zona)
  const etapasZonaLista = ETAPAS_TODOS.filter(e => zonaCfg.etapas.includes(e.id))
  const etapasListaVisiveis  = etapasZonaLista.filter(e => admin || !e.adminOnly)
  const etapasPainelVisiveis = ETAPAS_TODOS.filter(e => admin || !e.adminOnly)
  // Compat (algumas partes do código antigo ainda usam etapasVisiveis)
  const etapasVisiveis = modo === 'painel' ? etapasPainelVisiveis : etapasListaVisiveis

  // Encontra a zona de uma etapa (pra navegação cruzada do Painel)
  function zonaDaEtapa(etapaId) {
    return (ZONAS.find(z => z.etapas.includes(etapaId)) || ZONAS[0]).id
  }

  // ── Universo base (sem filtrar por etapa)
  const universoBase = osList
    .filter(o => tiposAtivos.has(o.tipo))
    .filter(o => admin || (o.etapa !== 'pagamento' && o.etapa !== 'concluido'))
    .filter(o => !verAgPeca ? true : !!o.aguardando_peca)
    .filter(o => {
      if (funcionario === 'todos') return true
      const resp = responsavelAtual(o)
      return resp === funcionario || (o.historico||[]).some(h => h.funcionario === funcionario)
    })
    .filter(o => {
      const s = calcStatusPrazo(o.prazo, o.etapa)
      if (filtro === 'todas')    return true
      if (filtro === 'vencido')  return s === 'vencido'
      if (filtro === 'hoje')     return s === 'hoje' || s === 'amanha'
      if (filtro === 'ok')       return s === 'ok'
      return true
    })
    .filter(o => !buscando ||
      o.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      String(o.numero).includes(busca) ||
      (o.equipamento||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.marca||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.modelo||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.serie||'').toLowerCase().includes(busca.toLowerCase()))

  // ── Distribuir por etapa (visão unificada via match)
  // Sempre distribui em TODAS as etapas — o modo Lista filtra na renderização.
  // Isso permite o Painel mostrar contagem correta mesmo trocando de zona.
  const porEtapa = {}
  etapasPainelVisiveis.forEach(e => porEtapa[e.id] = [])
  universoBase.forEach(o => {
    if (o.etapa === 'recusado') return
    const ec = etapasPainelVisiveis.find(e => e.match && e.match[o.tipo] === o.etapa)
    if (ec) porEtapa[ec.id].push(o)
  })
  // Concluído: só mês corrente (busca escapa)
  if (porEtapa['concluido'] && !buscando) {
    porEtapa['concluido'] = porEtapa['concluido'].filter(dentroMesCorrente)
  }
  // Sort por prazo dentro de cada coluna
  Object.keys(porEtapa).forEach(k => {
    porEtapa[k].sort((a,b) => new Date(a.prazo) - new Date(b.prazo))
  })

  // ── Recusadas (separadas) — só na zona financeiro
  const recusadasList = (verRecusados && zona === 'financeiro')
    ? universoBase.filter(o => o.etapa === 'recusado')
    : []

  // ── Etapa atual no modo Lista (clampada)
  const totalCols = etapasListaVisiveis.length + (recusadasList.length > 0 ? 1 : 0)
  const colIdxClamp = Math.max(0, Math.min(colIdx, totalCols - 1))
  const olharRecusadas = recusadasList.length > 0 && colIdxClamp === etapasListaVisiveis.length
  const etapaAtual = olharRecusadas ? null : etapasListaVisiveis[colIdxClamp]
  const osDaColuna = olharRecusadas
    ? recusadasList
    : (etapaAtual ? (porEtapa[etapaAtual.id] || []) : [])

  // ── Swipe lateral
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)
  const touchEndX   = useRef(null)
  const touchEndY   = useRef(null)
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    touchEndX.current = null
    touchEndY.current = null
  }
  function onTouchMove(e) {
    touchEndX.current = e.touches[0].clientX
    touchEndY.current = e.touches[0].clientY
  }
  function onTouchEnd() {
    if (touchStartX.current == null || touchEndX.current == null) return
    const dx = touchEndX.current - touchStartX.current
    const dy = touchEndY.current - touchStartY.current
    // Só conta swipe horizontal: dx > 60px e maior que dy (não confundir com scroll vertical)
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) {
      touchStartX.current = null; touchEndX.current = null
      return
    }
    if (dx > 0 && colIdxClamp > 0) setColIdx(colIdxClamp - 1)
    if (dx < 0 && colIdxClamp < totalCols - 1) setColIdx(colIdxClamp + 1)
    touchStartX.current = null
    touchEndX.current = null
  }

  // ── Helpers visuais
  const azul = cor(P.blue, P.blueDark)
  const azulBg = cor('#0d2035', '#e6f1fb')

  // ── Estados de filtros para badges (zona NÃO conta — virou navegação primária na barra do topo)
  const tiposAtivo  = tiposAtivos.size !== Object.keys(TIPOS_OS).length
  const prazoAtivo  = filtro !== 'todas'
  const respAtivo   = funcionario !== 'todos'
  const totalFiltrosAtivos = (tiposAtivo?1:0) + (prazoAtivo?1:0) + (respAtivo?1:0) + (verAgPeca?1:0) + (verRecusados?1:0)

  // ── Cor da etapa atual (modo coluna)
  const corEtapaAtual = olharRecusadas
    ? cor(P.red, P.redDark)
    : (etapaAtual ? corEtapa(etapaAtual.cor, dark) : T.textMuted)

  return (
    <>
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:T.bg }}>

        {/* ─── TOPO FIXO: busca + nova ─── */}
        <div style={{ padding:'.85rem 1rem 0', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ flex:1, position:'relative' }}>
              <i className="ti ti-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textDim }} aria-hidden="true" />
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar OS, cliente, modelo…"
                style={{ width:'100%', padding:'10px 10px 10px 32px', borderRadius:9, border:`1px solid ${T.border}`, background:T.card, color:T.textPrimary, fontSize:13, outline:'none', boxSizing:'border-box', boxShadow: dark ? 'none' : T.shadow }} />
            </div>
            <button onClick={()=>setModalNova(true)}
              style={{ padding:'0 14px', borderRadius:9, border:'none', cursor:'pointer', background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, color:'#fff', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
              <i className="ti ti-plus" style={{ fontSize:15 }} aria-hidden="true" /> Nova
            </button>
          </div>

          {/* Switch de modo + Zonas + Filtros (só ícone) */}
          <div style={{ display:'flex', gap:6, alignItems:'stretch' }}>
            {/* Modo: Painel / Lista */}
            <div style={{ display:'flex', gap:0, background:T.card, padding:3, borderRadius:9, border:`1px solid ${T.border}`, boxShadow: dark ? 'none' : T.shadow, flexShrink:0 }}>
              <button onClick={()=>setModo('painel')} aria-label="Modo painel" title="Painel"
                style={{ padding:'8px 10px', borderRadius:6, border:'none', cursor:'pointer', background: modo==='painel' ? azulBg : 'transparent', color: modo==='painel' ? azul : T.textMuted, fontSize:12, fontWeight: modo==='painel' ? 700 : 500, display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-layout-grid" style={{ fontSize:14 }} aria-hidden="true" />
              </button>
              <button onClick={()=>setModo('coluna')} aria-label="Modo lista" title="Lista"
                style={{ padding:'8px 10px', borderRadius:6, border:'none', cursor:'pointer', background: modo==='coluna' ? azulBg : 'transparent', color: modo==='coluna' ? azul : T.textMuted, fontSize:12, fontWeight: modo==='coluna' ? 700 : 500, display:'flex', alignItems:'center', gap:5 }}>
                <i className="ti ti-list-details" style={{ fontSize:14 }} aria-hidden="true" />
              </button>
            </div>

            {/* Zonas: Externo / Interno / Financeiro (atalho direto) — só no modo Lista */}
            {modo === 'coluna' && (
              <div style={{ display:'flex', gap:0, background:T.card, padding:3, borderRadius:9, border:`1px solid ${T.border}`, boxShadow: dark ? 'none' : T.shadow, flex:1, minWidth:0, overflowX:'auto' }}>
                {ZONAS.map(z => {
                  const ativo = z.id === zona
                  return (
                    <button key={z.id} onClick={()=>{ setZona(z.id); setColIdx(0) }}
                      style={{ flex:'1 1 0', minWidth:0, padding:'8px 6px', borderRadius:6, border:'none', cursor:'pointer', background: ativo ? azulBg : 'transparent', color: ativo ? azul : T.textMuted, fontSize:11.5, fontWeight: ativo ? 700 : 500, display:'flex', alignItems:'center', justifyContent:'center', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {z.label}
                    </button>
                  )
                })}
              </div>
            )}
            {/* Espaço flexível quando estiver no Painel (mantém alinhamento) */}
            {modo === 'painel' && <div style={{ flex:1 }} />}

            {/* Filtros (só ícone) */}
            <button onClick={()=>setSheet('filtros')} aria-label="Mais filtros" title="Filtros"
              style={{ padding:'9px 11px', borderRadius:9, border:`1px solid ${totalFiltrosAtivos>0?azul:T.border}`, background: totalFiltrosAtivos>0?azulBg:T.card, color: totalFiltrosAtivos>0?azul:T.textSecondary, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', boxShadow: !dark && totalFiltrosAtivos===0 ? T.shadow : 'none', flexShrink:0 }}>
              <i className="ti ti-filter" style={{ fontSize:16 }} aria-hidden="true" />
              {totalFiltrosAtivos > 0 && (
                <span style={{ position:'absolute', top:-4, right:-4, background:azul, color:dark?'#0b1220':'#fff', fontSize:9.5, fontWeight:800, borderRadius:10, minWidth:16, height:16, padding:'0 4px', display:'flex', alignItems:'center', justifyContent:'center', border:`2px solid ${T.bg}` }}>{totalFiltrosAtivos}</span>
              )}
            </button>
          </div>
        </div>

        {/* ─── MODO PAINEL: grid 2 colunas com cards-resumo ─── */}
        {modo === 'painel' && (
          <div style={{ flex:1, overflowY:'auto', padding:'12px 1rem 16px' }}>
            <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginBottom:10, paddingLeft:2 }}>
              Toque numa etapa para ver as OS
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {etapasPainelVisiveis.map(e => {
                const list = porEtapa[e.id] || []
                // Filtra concluído por mês corrente (busca escapa)
                const listFiltrada = (e.id === 'concluido' && !buscando) ? list.filter(dentroMesCorrente) : list
                const etapaC = corEtapa(e.cor, dark)
                const etapaBgC = bgEtapa(e.cor, dark)
                // Ao tocar: vai pra Lista na zona correta, na coluna certa
                function abrirEtapa() {
                  const zAlvo = zonaDaEtapa(e.id)
                  const etapasAlvo = ETAPAS_TODOS.filter(et => ZONAS.find(z=>z.id===zAlvo).etapas.includes(et.id)).filter(et => admin || !et.adminOnly)
                  const idx = etapasAlvo.findIndex(et => et.id === e.id)
                  setZona(zAlvo)
                  setColIdx(Math.max(0, idx))
                  setModo('coluna')
                }
                // ── Estatísticas de urgência (vencidas, paradas +24h, hoje/amanhã, ag. peça)
                const nVencidas = listFiltrada.filter(o => calcStatusPrazo(o.prazo, o.etapa) === 'vencido').length
                const nHoje     = listFiltrada.filter(o => { const s = calcStatusPrazo(o.prazo, o.etapa); return s === 'hoje' || s === 'amanha' }).length
                const nParadas  = listFiltrada.filter(o => (o.horasNaEtapa || 0) > 24).length
                const nAgPeca   = listFiltrada.filter(o => !!o.aguardando_peca).length
                const chips = []
                if (nVencidas > 0) chips.push({ icon:'ti-alert-triangle',     n:nVencidas, c:cor(P.red,P.redDark),         bg:cor('#2a1515','#fde8e8'), title:`${nVencidas} OS vencida(s)` })
                if (nParadas  > 0) chips.push({ icon:'ti-clock-exclamation',  n:nParadas,  c:cor('#f59e0b','#b45309'),     bg:cor('#2a1c00','#fdf0d8'), title:`${nParadas} parada(s) há +24h` })
                if (nHoje     > 0) chips.push({ icon:'ti-calendar-event',     n:nHoje,     c:cor(P.yellow,P.yellowDark),   bg:cor('#2a2000','#fdf6dc'), title:`${nHoje} para hoje/amanhã` })
                if (nAgPeca   > 0) chips.push({ icon:'ti-package',            n:nAgPeca,   c:cor('#ff9800','#b45309'),     bg:cor('#3a2200','#fff4e0'), title:`${nAgPeca} aguardando peça` })
                const temUrgencia = nVencidas > 0 || nParadas > 0
                return (
                  <button key={e.id} onClick={abrirEtapa}
                    style={{ background:T.card, borderStyle:'solid', borderWidth:'1px 1px 1px 1px', borderTopWidth:'4px', borderColor:temUrgencia ? cor(P.red,P.redDark)+'55' : T.border, borderTopColor:etapaC, borderRadius:12, padding:'14px 12px', cursor:'pointer', textAlign:'left', display:'flex', flexDirection:'column', gap:4, minHeight:124, boxShadow: dark ? 'none' : T.shadow }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:6, minHeight:28 }}>
                      <div style={{ fontSize:11.5, color:T.textMuted, fontWeight:600, lineHeight:1.2, flex:1 }}>{e.label}</div>
                      {temUrgencia && <i className="ti ti-alert-circle-filled" style={{ fontSize:13, color:cor(P.red,P.redDark), flexShrink:0, marginTop:1 }} aria-hidden="true" title="Há OS urgentes nesta etapa" />}
                    </div>
                    <div style={{ fontSize:32, fontWeight:800, color: listFiltrada.length > 0 ? T.textPrimary : T.textDim, lineHeight:1, marginTop:4 }}>{listFiltrada.length}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, alignItems:'center', marginTop:4 }}>
                      <div style={{ fontSize:10.5, color: listFiltrada.length > 0 ? etapaC : T.textDim, fontWeight:600, padding:'2px 7px', background: listFiltrada.length > 0 ? etapaBgC : 'transparent', borderRadius:4 }}>
                        {listFiltrada.length === 0 ? 'Vazio' : listFiltrada.length === 1 ? '1 OS' : `${listFiltrada.length} OSs`}
                      </div>
                      {chips.map((ch, k) => (
                        <span key={k} title={ch.title}
                          style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:10, fontWeight:700, color:ch.c, background:ch.bg, padding:'2px 5px', borderRadius:4, border:`1px solid ${ch.c}22` }}>
                          <i className={`ti ${ch.icon}`} style={{ fontSize:11 }} aria-hidden="true" />
                          {ch.n}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── MODO COLUNA: 1 etapa por vez + swipe lateral ─── */}
        {modo === 'coluna' && totalCols > 0 && (
          <>
            {/* Header da coluna ativa */}
            <div style={{ padding:'12px 1rem 6px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexShrink:0 }}>
              <button onClick={()=>setColIdx(Math.max(0, colIdxClamp - 1))} disabled={colIdxClamp===0} aria-label="Coluna anterior"
                style={{ width:38, height:38, borderRadius:9, border:`1px solid ${T.border}`, background:T.card, color: colIdxClamp===0 ? T.textDim : T.textPrimary, cursor: colIdxClamp===0?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: colIdxClamp===0 ? .35 : 1, flexShrink:0, boxShadow: dark ? 'none' : T.shadow }}>
                <i className="ti ti-chevron-left" style={{ fontSize:18 }} aria-hidden="true" />
              </button>

              <button onClick={()=>setSheet('colunas')} aria-label="Trocar coluna" title="Tocar para selecionar coluna"
                style={{ flex:1, minWidth:0, padding:'4px 8px', borderRadius:10, border:'none', background:'transparent', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'4px 12px', borderRadius:14, background: olharRecusadas ? cor('#2a1515','#fde8e8') : (etapaAtual ? bgEtapa(etapaAtual.cor, dark) : T.cardAlt), maxWidth:'100%' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:corEtapaAtual, flexShrink:0 }} />
                  <span style={{ fontSize:14, fontWeight:700, color: corEtapaAtual, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {olharRecusadas ? 'Recusadas' : etapaAtual.label}
                  </span>
                  <i className="ti ti-chevron-down" style={{ fontSize:14, color:corEtapaAtual, opacity:.75, flexShrink:0 }} aria-hidden="true" />
                </div>
                <div style={{ fontSize:11, color:T.textMuted, marginTop:3 }}>
                  {osDaColuna.length} {osDaColuna.length===1?'OS':'OSs'} · {colIdxClamp+1} de {totalCols}
                </div>
              </button>

              <button onClick={()=>setColIdx(Math.min(totalCols-1, colIdxClamp + 1))} disabled={colIdxClamp===totalCols-1} aria-label="Próxima coluna"
                style={{ width:38, height:38, borderRadius:9, border:`1px solid ${T.border}`, background:T.card, color: colIdxClamp===totalCols-1 ? T.textDim : T.textPrimary, cursor: colIdxClamp===totalCols-1?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: colIdxClamp===totalCols-1 ? .35 : 1, flexShrink:0, boxShadow: dark ? 'none' : T.shadow }}>
                <i className="ti ti-chevron-right" style={{ fontSize:18 }} aria-hidden="true" />
              </button>
            </div>

            {/* Pontos indicadores */}
            <div style={{ display:'flex', gap:4, justifyContent:'center', alignItems:'center', padding:'0 1rem 8px', flexWrap:'wrap', flexShrink:0 }}>
              {Array.from({ length: totalCols }).map((_, i) => (
                <button key={i} onClick={()=>setColIdx(i)} aria-label={`Ir para coluna ${i+1}`}
                  style={{ width: i===colIdxClamp?22:6, height:6, borderRadius:3, border:'none', cursor:'pointer', padding:0, background: i===colIdxClamp ? azul : T.border, transition:'width .25s, background .25s' }} />
              ))}
            </div>

            {/* Lista da coluna ativa (com swipe lateral apenas — pull-to-refresh é no nível da página) */}
            <div ref={scrollAreaRef} data-no-pull-refresh="true"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{ flex:1, overflowY:'auto', padding:'4px 1rem 16px', display:'flex', flexDirection:'column', gap:10, WebkitOverflowScrolling:'touch' }}>
              {osDaColuna.length === 0 ? (
                <div style={{ background:T.card, border:`1px dashed ${T.border}`, borderRadius:12, padding:'2.5rem 1rem', textAlign:'center', color:T.textMuted, fontSize:13, marginTop:30 }}>
                  <i className="ti ti-clipboard-off" style={{ fontSize:38, display:'block', marginBottom:10, color:T.textDim }} aria-hidden="true" />
                  Nenhuma OS em<br/>
                  <strong style={{ color:T.textSecondary }}>{olharRecusadas ? 'Recusadas' : etapaAtual.label}</strong>
                  <div style={{ marginTop:14, fontSize:11, color:T.textDim }}>
                    <i className="ti ti-hand-finger" style={{ fontSize:14, marginRight:4 }} aria-hidden="true" />
                    Arraste para o lado para trocar de coluna
                  </div>
                </div>
              ) : (
                osDaColuna.map(os => <OSCardMobile key={os.numero} os={os} T={T} dark={dark} onClick={()=>setDetalhe(os)} />)
              )}
            </div>
          </>
        )}

        {modo === 'coluna' && totalCols === 0 && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', color:T.textMuted, fontSize:13, textAlign:'center' }}>
            <div>
              <i className="ti ti-filter-off" style={{ fontSize:38, display:'block', marginBottom:10, color:T.textDim }} aria-hidden="true" />
              Nenhuma coluna disponível com os filtros atuais
            </div>
          </div>
        )}

      </div>

      {/* ─── BOTTOM SHEET de seleção de coluna ─── */}
      {sheet === 'colunas' && (
        <BottomSheet T={T} dark={dark} onClose={()=>setSheet(null)} titulo={`Colunas de ${zonaCfg.label}`} icon={zonaCfg.icon}
          subtitulo="Toque para ir direto à coluna">
          {etapasListaVisiveis.map((e, i) => {
            const ativo = i === colIdxClamp && !olharRecusadas
            const etapaC = corEtapa(e.cor, dark)
            const etapaBgC = bgEtapa(e.cor, dark)
            const list = porEtapa[e.id] || []
            const count = (e.id === 'concluido' && !buscando) ? list.filter(dentroMesCorrente).length : list.length
            return (
              <button key={e.id} onClick={()=>{ setColIdx(i); setSheet(null) }}
                style={{ width:'100%', padding:'14px 14px', borderRadius:10, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:T.cardAlt, color:ativo?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:11, textAlign:'left', fontSize:14, fontWeight:ativo?700:500 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background:etapaC, flexShrink:0 }} />
                <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>{e.label}</span>
                <span style={{ fontSize:11.5, fontWeight:700, padding:'3px 9px', borderRadius:11, background:etapaBgC, color:etapaC, minWidth:24, textAlign:'center' }}>{count}</span>
                {ativo && <i className="ti ti-check" style={{ fontSize:18, color:azul }} aria-hidden="true" />}
              </button>
            )
          })}
          {recusadasList.length > 0 && (
            <button onClick={()=>{ setColIdx(etapasListaVisiveis.length); setSheet(null) }}
              style={{ width:'100%', padding:'14px 14px', borderRadius:10, border:`1px solid ${olharRecusadas?azul:T.border}`, background:olharRecusadas?azulBg:T.cardAlt, color:olharRecusadas?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:11, textAlign:'left', fontSize:14, fontWeight:olharRecusadas?700:500 }}>
              <span style={{ width:10, height:10, borderRadius:'50%', background:cor(P.red,P.redDark), flexShrink:0 }} />
              <span style={{ flex:1 }}>Recusadas</span>
              <span style={{ fontSize:11.5, fontWeight:700, padding:'3px 9px', borderRadius:11, background:cor('#2a1515','#fde8e8'), color:cor(P.red,P.redDark), minWidth:24, textAlign:'center' }}>{recusadasList.length}</span>
              {olharRecusadas && <i className="ti ti-check" style={{ fontSize:18, color:azul }} aria-hidden="true" />}
            </button>
          )}
        </BottomSheet>
      )}

      {/* ─── BOTTOM SHEET de filtros (todos em um) ─── */}
      {sheet === 'filtros' && (
        <BottomSheet T={T} dark={dark} onClose={()=>setSheet(null)} titulo="Filtros" icon="ti-filter"
          subtitulo="Configure como ver suas OS">

          {/* TIPOS */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginBottom:4 }}>Tipos de OS</div>
          {Object.entries(TIPOS_OS).map(([id, cfg]) => {
            const ativo = tiposAtivos.has(id)
            return (
              <button key={id} onClick={()=>toggleTipo(id)}
                style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:T.cardAlt, color:ativo?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:11, textAlign:'left', fontSize:13.5, fontWeight:ativo?700:500 }}>
                <i className={`ti ${cfg.icon}`} style={{ fontSize:18 }} aria-hidden="true" />
                <span style={{ flex:1 }}>{cfg.label}</span>
                <div style={{ width:36, height:22, borderRadius:11, background:ativo?azul:T.border, position:'relative', flexShrink:0, transition:'background .15s' }}>
                  <div style={{ position:'absolute', top:2, left:ativo?16:2, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transition:'left .15s' }} />
                </div>
              </button>
            )
          })}

          {/* PRAZO */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginTop:12, marginBottom:4 }}>Prazo</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {[['todas','Todos','ti-list'],['vencido','Atrasadas','ti-alert-triangle'],['hoje','Hoje/amanhã','ti-calendar-event'],['ok','Em dia','ti-circle-check']].map(([v,l,ico]) => {
              const ativo = filtro === v
              return (
                <button key={v} onClick={()=>setFiltro(v)}
                  style={{ flex:'1 1 calc(50% - 3px)', padding:'11px 12px', borderRadius:9, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:T.cardAlt, color:ativo?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:7, textAlign:'left', fontSize:13, fontWeight:ativo?700:500 }}>
                  <i className={`ti ${ico}`} style={{ fontSize:15 }} aria-hidden="true" />
                  <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>{l}</span>
                </button>
              )
            })}
          </div>

          {/* RESPONSÁVEL */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginTop:12, marginBottom:4 }}>Responsável</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {[{id:'todos', nome:'Todos', apelido:'TD', cor:null}, ...usuarios].map(f => {
              const ativo = funcionario === f.id
              return (
                <button key={f.id} onClick={()=>setFuncionario(f.id)}
                  style={{ flex:'1 1 calc(50% - 3px)', padding:'11px 12px', borderRadius:9, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:T.cardAlt, color:ativo?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:ativo?700:500 }}>
                  {f.cor
                    ? <span style={{ width:20, height:20, borderRadius:'50%', background:f.cor+'33', color:f.cor, fontSize:9.5, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{f.apelido}</span>
                    : <i className="ti ti-users" style={{ fontSize:15 }} aria-hidden="true" />}
                  <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis' }}>{f.id==='todos' ? 'Todos' : (f.nome?.split(' ')[0] || f.apelido)}</span>
                </button>
              )
            })}
          </div>

          {/* OUTROS */}
          <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px', marginTop:12, marginBottom:4 }}>Outros</div>
          <button onClick={()=>setVerAgPeca(v=>!v)}
            style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1px solid ${verAgPeca?azul:T.border}`, background:verAgPeca?azulBg:T.cardAlt, color:verAgPeca?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:11, fontSize:13.5, fontWeight:verAgPeca?700:500 }}>
            <i className="ti ti-package" style={{ fontSize:18 }} aria-hidden="true" />
            <span style={{ flex:1, textAlign:'left' }}>Aguardando peça</span>
            <div style={{ width:36, height:22, borderRadius:11, background:verAgPeca?azul:T.border, position:'relative', flexShrink:0, transition:'background .15s' }}>
              <div style={{ position:'absolute', top:2, left:verAgPeca?16:2, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transition:'left .15s' }} />
            </div>
          </button>
          {zona === 'financeiro' && (
            <button onClick={()=>setVerRecusados(v=>!v)}
              style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:`1px solid ${verRecusados?azul:T.border}`, background:verRecusados?azulBg:T.cardAlt, color:verRecusados?azul:T.textPrimary, cursor:'pointer', display:'flex', alignItems:'center', gap:11, fontSize:13.5, fontWeight:verRecusados?700:500 }}>
              <i className="ti ti-eye" style={{ fontSize:18 }} aria-hidden="true" />
              <span style={{ flex:1, textAlign:'left' }}>Mostrar recusadas</span>
              <div style={{ width:36, height:22, borderRadius:11, background:verRecusados?azul:T.border, position:'relative', flexShrink:0, transition:'background .15s' }}>
                <div style={{ position:'absolute', top:2, left:verRecusados?16:2, width:18, height:18, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,.3)', transition:'left .15s' }} />
              </div>
            </button>
          )}

          {/* LIMPAR */}
          {totalFiltrosAtivos > 0 && (
            <button onClick={()=>{ setTiposAtivos(new Set(Object.keys(TIPOS_OS))); setFiltro('todas'); setFuncionario('todos'); setVerAgPeca(false); setVerRecusados(false) }}
              style={{ width:'100%', padding:'12px', marginTop:12, borderRadius:10, border:`1px solid ${T.border}`, background:T.cardAlt, color:T.textPrimary, cursor:'pointer', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
              <i className="ti ti-x" style={{ fontSize:14 }} aria-hidden="true" />
              Limpar todos os filtros
            </button>
          )}
        </BottomSheet>
      )}

      {modalNova && <NovaOSModal T={T} dark={dark} onClose={()=>setModalNova(false)} tipoInicial="atendimento" mobile />}
      {detalhe && <OSDetalhe T={T} dark={dark} os={detalhe} user={user} onClose={()=>setDetalhe(null)} mobile />}
    </>
  )
}

// ─── Pull-to-refresh reutilizável (envelopa qualquer página mobile) ────────
// Gesto detectado na ÁREA DE HEADER da página — NÃO dentro de scrolls de cards.
// Áreas internas que precisam ser ignoradas (listas com scroll próprio, swipe lateral, etc)
// devem marcar o elemento com data-no-pull-refresh="true".

function PullToRefresh({ T, dark, onRefresh, children }) {
  const cor = (d, c) => dark ? d : c
  const [pullDist, setPullDist]     = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const startX = useRef(null)
  const ativo  = useRef(false) // se este pull está ativo (gesto começou em área válida)
  const azul = cor(P.blue, P.blueDark)

  function dentroDeAreaBloqueada(target) {
    let el = target
    while (el && el !== document.body) {
      if (el.dataset && el.dataset.noPullRefresh === 'true') return true
      el = el.parentElement
    }
    return false
  }

  function onTouchStart(e) {
    if (refreshing) return
    if (dentroDeAreaBloqueada(e.target)) {
      ativo.current = false
      return
    }
    // Só inicia se a página inteira estiver scrollada pro topo
    if (window.scrollY > 0) {
      ativo.current = false
      return
    }
    ativo.current = true
    startY.current = e.touches[0].clientY
    startX.current = e.touches[0].clientX
  }

  function onTouchMove(e) {
    if (!ativo.current || refreshing || startY.current == null) return
    const dy = e.touches[0].clientY - startY.current
    const dx = e.touches[0].clientX - startX.current
    // Tem que ser pull pra BAIXO e bem mais vertical que horizontal
    if (dy <= 0 || Math.abs(dy) < Math.abs(dx) * 2) return
    setPullDist(Math.min(90, dy * 0.55))
  }

  function onTouchEnd() {
    if (!ativo.current) return
    if (pullDist >= 60 && !refreshing) {
      setRefreshing(true)
      setPullDist(60)
      Promise.resolve(onRefresh && onRefresh()).finally(() => {
        // Espera no mínimo 600ms pra feedback visual decente
        setTimeout(() => { setRefreshing(false); setPullDist(0) }, 600)
      })
    } else {
      setPullDist(0)
    }
    ativo.current = false
    startY.current = null
    startX.current = null
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, position:'relative', overflow:'hidden' }}>
      {/* Indicador no topo (sobreposto, não empurra conteúdo) */}
      {pullDist > 0 && (
        <div style={{
          position:'absolute', top:0, left:0, right:0, zIndex:50,
          height: pullDist,
          display:'flex', alignItems:'center', justifyContent:'center',
          background: dark ? 'rgba(11,18,32,.92)' : 'rgba(236,236,239,.92)',
          backdropFilter:'blur(4px)',
          color: azul, fontSize:12, fontWeight:600,
          transition: refreshing ? 'none' : 'height .2s',
          pointerEvents:'none',
          overflow:'hidden'
        }}>
          <i className={`ti ${refreshing ? 'ti-loader-2' : (pullDist >= 60 ? 'ti-arrow-up' : 'ti-arrow-down')}`}
             style={{ fontSize:18, marginRight:7, animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
             aria-hidden="true" />
          {refreshing ? 'Atualizando…' : (pullDist >= 60 ? 'Solte para atualizar' : 'Puxe para atualizar')}
        </div>
      )}
      {/* Conteúdo da página */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0, transform: pullDist > 0 ? `translateY(${pullDist * 0.35}px)` : 'none', transition: refreshing ? 'none' : 'transform .2s' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Bottom sheet reutilizável para filtros mobile ─────────────────────────

function BottomSheet({ T, dark, onClose, titulo, subtitulo, icon, children }) {
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div onClick={onClose}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', backdropFilter:'blur(2px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:T.card, borderRadius:'16px 16px 0 0', width:'100%', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 -8px 32px rgba(0,0,0,.4)', border:`1px solid ${T.border}`, borderBottom:'none', overflow:'hidden', paddingBottom:'env(safe-area-inset-bottom, 0px)' }}>
        {/* Grip */}
        <div style={{ display:'flex', justifyContent:'center', padding:'8px 0 0' }}>
          <div style={{ width:40, height:4, borderRadius:2, background:T.border }} />
        </div>
        {/* Header */}
        <div style={{ padding:'10px 18px 14px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
            {icon && <i className={`ti ${icon}`} style={{ fontSize:20, color:T.textSecondary }} aria-hidden="true" />}
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary }}>{titulo}</div>
              {subtitulo && <div style={{ fontSize:11.5, color:T.textMuted, marginTop:2 }}>{subtitulo}</div>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            style={{ background:'transparent', border:'none', color:T.textMuted, cursor:'pointer', padding:6, borderRadius:6, fontSize:0, lineHeight:0, flexShrink:0 }}>
            <i className="ti ti-x" style={{ fontSize:22 }} aria-hidden="true" />
          </button>
        </div>
        {/* Conteúdo */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 14px 18px', display:'flex', flexDirection:'column', gap:8 }}>
          {children}
        </div>
      </div>
    </div>
  )
}


function OSCardMobile({ os, T, dark, onClick }) {
  const cor = (d, c) => dark ? d : c
  const tipoCfg = TIPOS_OS[os.tipo]
  const tipoCor = corEtapa(tipoCfg.cor, dark)
  const etapa = tipoCfg.etapas.find(e => e.id === os.etapa)
                || (tipoCfg.lateral && os.etapa === 'recusado' && tipoCfg.lateral)
  const etapaC = corEtapa(etapa?.cor || 'neutro', dark)
  const etapaBgC = bgEtapa(etapa?.cor || 'neutro', dark)
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' · ')
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)

  const baseStyle = dark
    ? { background:T.card, border:`1px solid ${T.border}`, borderLeft:`3px solid ${tipoCor}` }
    : { background:T.card, border:'none', borderLeft:`3px solid ${tipoCor}`, boxShadow:T.shadow }

  return (
    <div onClick={onClick}
      style={{ ...baseStyle, borderRadius:12, padding:'12px 14px', cursor:'pointer' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <i className={`ti ${tipoCfg.icon}`} style={{ fontSize:12, color:tipoCor }} aria-hidden="true" title={tipoCfg.label} />
          <span style={{ fontSize:12, fontWeight:700, color:T.textMuted }}>#{os.numero}</span>
          {os.garantia && (
            <span style={{ padding:'1px 6px', borderRadius:8, background:cor('#0d2035','#e6f1fb'), color:cor(P.blue,P.blueDark), fontSize:9, fontWeight:700, display:'flex', alignItems:'center', gap:3 }}>
              <i className="ti ti-shield-check" style={{ fontSize:10 }} aria-hidden="true" />Garantia
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {pagoTotal && <Badge color={cor(P.green,P.greenDark)} bg={cor('#0f2a15','#e8f5ec')} border={cor(P.green,P.greenDark)+'33'}>✓ Pago</Badge>}
          {pagoParcial && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>R$ {(os.valor_pago||0)}/{totalAPagar(os)}</Badge>}
          {os.aguardando_peca && <Badge color={'#ff9800'} bg={cor('#3a2200','#fff4e0')} border={'#ff980044'}>peça</Badge>}
          {status==='vencido' && <Badge color={cor(P.red,P.redDark)} bg={cor('#2a1515','#fde8e8')} border={cor(P.red,P.redDark)+'33'}>{Math.abs(dias)}d</Badge>}
          {status==='hoje'    && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Hoje</Badge>}
          {status==='amanha'  && <Badge color={cor(P.yellow,P.yellowDark)} bg={cor('#2a2000','#fdf6dc')} border={cor(P.yellow,P.yellowDark)+'33'}>Amanhã</Badge>}
        </div>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:6, marginBottom:3 }}>
        <div style={{ fontSize:14, fontWeight:700, color:T.textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', minWidth:0, flex:1 }}>{os.cliente}</div>
        {os.fone && <div style={{ fontSize:11, color:T.textMuted, whiteSpace:'nowrap' }}>{os.fone}</div>}
      </div>

      {endResumido && (
        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11.5, color:T.textMuted, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:6 }}>
          <i className="ti ti-map-pin" style={{ fontSize:11, color:T.textDim, flexShrink:0 }} aria-hidden="true" />
          <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{endResumido}</span>
        </div>
      )}

      <div style={{ padding:'6px 8px', background:T.cardAlt, borderRadius:6, marginBottom:8 }}>
        <div style={{ fontSize:11.5, color:T.textPrimary, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{linhaEquip || os.equipamento}</div>
        {os.serie && <div style={{ fontSize:10, color:T.textDim, marginTop:1, fontFamily:'ui-monospace, monospace' }}>S/N: {os.serie}</div>}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
          <span style={{ fontSize:11, padding:'3px 9px', borderRadius:6, background:etapaBgC, color:etapaC, fontWeight:600, whiteSpace:'nowrap' }}>{etapa?.curto || os.etapa}</span>
          <span style={{ fontSize:11, color:T.textMuted, whiteSpace:'nowrap' }}>· {fmtPrazoCurto(os.prazo)}</span>
        </div>
        {os.valor > 0 && <span style={{ fontSize:12, color: dark ? '#f1f5f9' : '#0a0a0d', fontWeight:700, fontVariantNumeric:'tabular-nums', letterSpacing:'-0.01em' }}>R$ {(os.valor - (os.desconto||0)).toLocaleString('pt-BR')}</span>}
      </div>
    </div>
  )
}

// ─── Helpers visuais usados por PainelMobile e OSCardMobile ───────────────

function Badge({ color, bg, border, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 8,
      fontSize: 10, fontWeight: 700,
      color, background: bg,
      border: `1px solid ${border || color + '33'}`,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function CountBadge({ n, red, T, dark }) {
  const bg = red ? (dark ? '#2a1515' : '#fde8e8') : (dark ? '#0d2035' : '#e6f1fb')
  const cor = red ? (dark ? '#ff6b6b' : '#c04242') : (dark ? '#5B9BD5' : '#3a7bbf')
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 18, height: 18, borderRadius: 9,
      fontSize: 10, fontWeight: 700,
      color: cor, background: bg,
      padding: '0 5px',
    }}>
      {n}
    </span>
  )
}

function SecTitle({ icon, T, children, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />}
        <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.4px' }}>
          {children}
        </span>
      </div>
      {right}
    </div>
  )
}

// ─── Exports ────────────────────────────────────────────────────────────
export { PainelMobile, OSMobile, PullToRefresh, BottomSheet, OSCardMobile }
