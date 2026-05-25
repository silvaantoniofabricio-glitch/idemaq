// idemaq-src/pages/Kanban.jsx
// Página do Kanban de OS (desktop). Filtros + abas de zona + colunas + drag-and-drop.
// Modais (NovaOSModal, OSDetalhe) ficam em _legacy/ até serem refatorados.

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useOS, uiEtapaToDb } from '../hooks/useOS'
import { useUsuarios } from '../hooks/useUsuarios'
import { P } from '../theme'
import {
  TIPOS_OS, ETAPAS_TODOS, ZONAS,
} from '../utils/osData'
import {
  isAdmin, getRole, totalAPagar,
  estaPagaTotal, estaPagaParcial,
  podeMoverOS, ordenarColuna, dentroMesCorrente,
  calcStatusPrazo, diasPrazo,
} from '../utils/osHelpers'
import { fmtPrazoCurto } from '../utils/fmt'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'

// UI library
import KanbanColumn from '../components/kanban/KanbanColumn'
import { NovaOSModal } from '../_legacy/desktopKanbanModals'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

export default function Kanban({ T, dark, user }) {
  const cor = (d, c) => dark ? d : c
  const role = getRole(user)
  const admin = isAdmin(user)
  const [buscaAtiva, setBuscaAtiva] = useState(false)
  const [zona, setZona]   = useState('todos')
  // Tipos ativos por padrão: TODOS. Mínimo: 1 (proteção no toggle).
  const [tiposAtivos, setTiposAtivos] = useState(() => new Set(Object.keys(TIPOS_OS)))
  function toggleTipo(id) {
    setTiposAtivos(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size === 1) return prev // não permitir desativar o último
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }
  const [busca, setBusca] = useState('')
  // Sincroniza buscaAtiva para que useOS saiba se deve mostrar concluídas >24h
  useEffect(() => { setBuscaAtiva(busca.trim().length > 0) }, [busca])
  const [statusF, setStatusF]         = useState('todos')
  const [verRecusados, setVerRecusados] = useState(false)
  const [verAgPeca, setVerAgPeca]       = useState(false)
  const [modalNova, setModalNova] = useState(false)
  const [detalhe, setDetalhe]     = useState(null)
  // Dropdown aberto na barra de filtros: 'prazo' | 'resp' | 'tipos' | null
  const [menuAberto, setMenuAberto] = useState(null)
  const barraRef = useRef(null)
  // Click fora fecha dropdown
  useEffect(() => {
    function handler(e) {
      if (barraRef.current && !barraRef.current.contains(e.target)) setMenuAberto(null)
    }
    if (menuAberto) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [menuAberto])
  // useOS: busca do banco + estado mutável para optimistic updates
  const { osList, setOsList, loading: osLoading, error: osError, refetch: osRefetch, updateOS: updateOSHook } = useOS(buscaAtiva)
  const { usuarios } = useUsuarios()
  // Drag-and-drop
  const [arrastando, setArrastando] = useState(null) // {numero, etapa}
  const [colunaHover, setColunaHover] = useState(null) // etapaId destino
  const [shakingNum, setShakingNum] = useState(null)
  const [toast, setToast] = useState(null) // {tipo:'ok'|'erro', msg}

  function notify(tipo, msg) {
    setToast({ tipo, msg })
    clearTimeout(notify._t)
    notify._t = setTimeout(()=>setToast(null), 3200)
  }

  // Mover OS — optimistic update + persist no Supabase
  async function moverOS(numero, etapaAlvo) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    // Traduz coluna unificada para etapa do tipo da OS
    const etapaUnif = ETAPAS_TODOS.find(e => e.id === etapaAlvo)
    const alvoReal = etapaUnif?.match?.[os.tipo]
    if (!alvoReal) {
      notify('erro', `Esta coluna não aceita OS de ${TIPOS_OS[os.tipo].label}`)
      return
    }
    const r = podeMoverOS(os, alvoReal, { pularEtapas: true })
    if (!r.ok) {
      notify('erro', r.motivo)
      setShakingNum(numero)
      setTimeout(() => setShakingNum(null), 350)
      return
    }
    const etapaFinal = r.alvo || alvoReal // pode redirecionar (ex: pagamento → concluido se pago)
    const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Cuiaba' }).slice(0, 16).replace('T', ' ')

    // Optimistic update — salva estado anterior para reverter se falhar
    const osPrev = osList
    setOsList(prev => prev.map(o => {
      if (o.numero !== numero) return o
      return {
        ...o,
        etapa: etapaFinal,
        historico: [...(o.historico||[]), { etapa: etapaFinal, funcionario: user?.id, data: agora }]
      }
    }))
    const labelFinal = TIPOS_OS[os.tipo].etapas.find(e => e.id === etapaFinal)?.label || etapaFinal
    if (r.alvo) notify('ok', `OS #${numero} já estava paga — foi direto para ${labelFinal}`)
    else        notify('ok', `OS #${numero} movida para ${labelFinal}`)

    // Persistir no Supabase. Trigger do banco cria o registro em os_historico.
    try {
      const dbEtapa = uiEtapaToDb(os.tipo, etapaFinal)
      // Marca data_conclusao ao concluir; limpa ao sair de concluido (raro,
      // mas garante o filtro "some 24h após" se a OS for reaberta).
      const patch = { etapa: dbEtapa }
      if (etapaFinal === 'concluido') patch.data_conclusao = new Date().toISOString()
      else if (os.etapa === 'concluido') patch.data_conclusao = null
      const { error: errUp } = await supabase.from('os').update(patch).eq('id', os.id)
      if (errUp) throw errUp
    } catch {
      setOsList(osPrev)
      notify('erro', 'Erro ao mover OS — mudança revertida')
    }
  }

  // Atualização genérica de campos da OS — usada pelas ações do OSDetalhe.
  // Lógica (optimistic + rollback + whitelist via osPatch) mora no hook useOS.
  // Aqui só wrapamos pra mostrar toast em caso de erro.
  async function updateOS(numero, patch) {
    const res = await updateOSHook(numero, patch)
    if (!res.ok) notify('erro', 'Erro ao salvar — mudança revertida')
  }

  // Exclusão (soft-delete) — optimistic remove imediato + rollback em erro.
  // Não confia em Realtime pra sumir do Kanban (latência variável e às vezes
  // a publication `os` não está habilitada no Supabase).
  async function excluirOS(numero) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const osPrev = osList
    setOsList(prev => prev.filter(o => o.numero !== numero))
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('os').update({
        deleted_at: new Date().toISOString(),
        excluido_por: userData?.user?.id || null,
      }).eq('id', os.id)
      if (error) throw error
      notify('ok', `OS #${numero} excluída`)
    } catch (e) {
      setOsList(osPrev)
      notify('erro', `Erro ao excluir OS: ${e?.message || 'desconhecido'}`)
      console.error('[Kanban] excluir OS:', e)
    }
  }

  async function toggleAgPecaOS(numero) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const novoValor = !os.aguardando_peca
    const osPrev = osList
    // Optimistic update
    setOsList(prev => prev.map(o => o.numero === numero ? {...o, aguardando_peca: novoValor} : o))
    try {
      const { error: errUp } = await supabase.from('os').update({ aguardando_peca: novoValor }).eq('id', os.id)
      if (errUp) throw errUp
    } catch {
      setOsList(osPrev)
      notify('erro', 'Erro ao atualizar "Aguardando peça" — mudança revertida')
    }
  }

  // Mostrar erro de carregamento via toast (só uma vez por erro)
  useEffect(() => {
    if (osError) notify('erro', 'Erro ao carregar OS — tente recarregar')
  }, [osError])

  // Zona define quais colunas aparecem. 'todos' = todas as colunas de ETAPAS_TODOS.
  const zonaCfg = ZONAS.find(z => z.id === zona)
  const etapasAtivas = zona === 'todos'
    ? ETAPAS_TODOS
    : ETAPAS_TODOS.filter(e => zonaCfg.etapas.includes(e.id))
  const etapasVisiveis = etapasAtivas.filter(e => admin || !e.adminOnly)

  const corPaleta = zona === 'todos' ? 'blue' : zonaCfg.cor
  const tipoCor = corEtapa(corPaleta, dark)
  const tipoBg  = bgEtapa(corPaleta, dark)

  // Universo: sempre TODAS as OS, filtradas pelos tipos ativos (toggle)
  const todasUniverso = osList.filter(o => tiposAtivos.has(o.tipo))
  const buscando = busca.trim().length > 0

  const osFiltradas = todasUniverso
    .filter(o => verRecusados ? true : o.etapa !== 'recusado')
    .filter(o => !verAgPeca ? true : !!o.aguardando_peca)
    .filter(o => {
      if (statusF === 'todos') return true
      const s = calcStatusPrazo(o.prazo, o.etapa)
      if (statusF === 'vencido') return s === 'vencido'
      if (statusF === 'hoje')    return s === 'hoje' || s === 'amanha'
      if (statusF === 'ok')      return s === 'ok'
      return true
    })
    // Filtro mês corrente em Concluído (escapado pela busca)
    .filter(o => buscando ? true : dentroMesCorrente(o))
    .filter(o => !buscando ||
      o.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      String(o.numero).includes(busca) ||
      (o.equipamento||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.marca||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.modelo||'').toLowerCase().includes(busca.toLowerCase()) ||
      (o.serie||'').toLowerCase().includes(busca.toLowerCase()))

  // Distribuir por coluna — SEMPRE via match (visão unificada)
  const porEtapa = {}
  etapasVisiveis.forEach(e => porEtapa[e.id] = [])
  osFiltradas.forEach(os => {
    if (os.etapa === 'recusado') return
    const ec = etapasVisiveis.find(e => e.match && e.match[os.tipo] === os.etapa)
    if (ec) porEtapa[ec.id].push(os)
  })
  // Aplicar ordenação por coluna
  Object.keys(porEtapa).forEach(k => { porEtapa[k] = ordenarColuna(k, porEtapa[k]) })

  const totalKanban = Object.values(porEtapa).reduce((s,arr)=>s+arr.length, 0)
  const totalRecusados = todasUniverso.filter(o => o.etapa === 'recusado').length
  const totalAgPeca    = todasUniverso.filter(o => !!o.aguardando_peca).length

  const abas = [
    { id:'todos', label:'Todos', icon:'ti-layout-kanban', cor:'blue' },
    ...ZONAS.map(z => ({ id:z.id, label:z.label, icon:z.icon, cor:z.cor }))
  ]

  // Scroll horizontal com wheel — mas só quando não há scroll vertical interno
  // disponível na direção do gesto. Se o cursor está sobre uma coluna que
  // gerou barra própria (muitos cards) e ainda dá pra rolar nessa direção,
  // deixa o browser rolar a coluna naturalmente.
  const kanbanRef = useRef(null)
  function handleWheel(e) {
    if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return // gesto já é horizontal — nativo
    const root = kanbanRef.current
    let el = e.target
    while (el && el !== root) {
      const oy = getComputedStyle(el).overflowY
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
        const podeDescer = e.deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1
        const podeSubir  = e.deltaY < 0 && el.scrollTop > 0
        if (podeDescer || podeSubir) return // coluna tem pra onde rolar — deixa nativo
      }
      el = el.parentElement
    }
    e.preventDefault()
    root.scrollLeft += e.deltaY
  }

  // OS aberta no detalhe — pega a versão atualizada do estado
  const osDetalheAtual = detalhe ? osList.find(o => o.numero === detalhe.numero) || detalhe : null

  return (
    <>
      <div style={{ padding:'1.1rem 1.25rem 1.1rem', display:'flex', flexDirection:'column', gap:12, flex:1, minHeight:0, overflow:'hidden', position:'relative' }}>

        {/* Cor padrão dos filtros ativos — sempre azul */}
        {(() => null)()}

        {/* Header: título + stats inline numa única linha */}
        {(() => {
          const totVencidas = todasUniverso.filter(o => calcStatusPrazo(o.prazo, o.etapa) === 'vencido').length
          const totGarantia = todasUniverso.filter(o => !!o.garantia).length
          const azul = cor(P.blue, P.blueDark)
          const vermelho = cor(P.red, P.redDark)
          const amarelo = cor(P.yellow, P.yellowDark)
          const stats = [
            { v: totalKanban,  l: 'ativas',       c: T.textPrimary },
            { v: totVencidas,  l: 'vencidas',     c: vermelho },
            { v: totalAgPeca,  l: 'aguard. peça', c: amarelo },
            { v: totGarantia,  l: 'em garantia',  c: azul },
          ]
          return (
            <div style={{ display:'flex', alignItems:'baseline', gap:14, flexWrap:'wrap' }}>
              <h2 style={{ fontSize:20, fontWeight:700, color: dark ? '#f1f5f9' : '#0a0a0d', letterSpacing:'-0.02em', lineHeight:1, margin:0 }}>
                Ordens de serviço
              </h2>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                {stats.map((s, i) => (
                  <React.Fragment key={s.l}>
                    {i > 0 && <span style={{ color:T.textDim, fontSize:10 }}>·</span>}
                    <span style={{ display:'inline-flex', alignItems:'baseline', gap:5, fontSize:11.5 }}>
                      <span style={{ fontWeight:700, color: s.v > 0 ? s.c : T.textDim, fontVariantNumeric:'tabular-nums' }}>{s.v}</span>
                      <span style={{ color:T.textMuted }}>{s.l}</span>
                    </span>
                  </React.Fragment>
                ))}
                {buscando && (
                  <span style={{ marginLeft:6, padding:'1px 7px', borderRadius:8, background:cor('#0d2035','#e6f1fb'), color:azul, fontSize:10, fontWeight:700 }}>Busca ativa</span>
                )}
                {!admin && <span style={{ color:T.textDim, fontSize:11 }}>· você não vê Concluído</span>}
              </div>
            </div>
          )
        })()}

        {/* Barra única: zonas (tabs) + busca + dropdowns de filtro + Nova OS */}
        {(() => {
          const azul = cor(P.blue, P.blueDark)
          const azulBg = cor('#0d2035', '#e6f1fb')
          const totalTipos = Object.keys(TIPOS_OS).length
          // Labels dinâmicos dos chip-dropdowns
          const lblPrazo = statusF === 'todos' ? 'Todos' : statusF === 'vencido' ? 'Vencidas' : statusF === 'hoje' ? 'Hoje/amanhã' : 'Em dia'
          const tiposCount = tiposAtivos.size
          // Estilo chip dropdown
          const chipBase = { padding:'5px 9px', borderRadius:6, fontSize:11.5, cursor:'pointer', fontWeight:500, display:'inline-flex', alignItems:'center', gap:5, whiteSpace:'nowrap', transition:'all .12s', position:'relative' }
          const chipAtivo = { border:`1px solid ${azul}`, background:azulBg, color:azul, fontWeight:600 }
          const chipNormal = { border:`1px solid ${T.border}`, background:'transparent', color:T.textMuted }
          // Popup
          const popupStyle = { position:'absolute', top:'calc(100% + 6px)', left:0, minWidth:160, padding:6, background:T.card, border:`1px solid ${T.border}`, borderRadius:8, boxShadow:dark?'0 8px 24px rgba(0,0,0,.4)':'0 8px 24px rgba(0,0,0,.12)', zIndex:30 }
          const itemStyle = (ativo) => ({ padding:'7px 10px', borderRadius:5, fontSize:12, cursor:'pointer', background: ativo?azulBg:'transparent', color: ativo?azul:T.textPrimary, fontWeight: ativo?600:500, display:'flex', alignItems:'center', gap:7 })
          // Divider visual
          const div = <div style={{ width:1, height:20, background:T.border, margin:'0 4px' }} />

          return (
            <div ref={barraRef} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:9, padding:'7px 10px', display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', position:'relative' }}>
              {/* Tabs de zona */}
              <div style={{ display:'flex', gap:3 }}>
                {abas.map(a => {
                  const ativo = a.id === zona
                  const zonaA = ZONAS.find(z => z.id === a.id)
                  const etapasZona = a.id === 'todos' ? ETAPAS_TODOS : ETAPAS_TODOS.filter(e => zonaA.etapas.includes(e.id))
                  const n = osList.filter(o => {
                    if (!tiposAtivos.has(o.tipo)) return false
                    if (o.etapa === 'concluido' || o.etapa === 'recusado') return false
                    return etapasZona.some(e => e.match && e.match[o.tipo] === o.etapa)
                  }).length
                  return (
                    <button key={a.id} onClick={()=>setZona(a.id)}
                      style={{ padding:'6px 11px', borderRadius:6, border:'1px solid transparent', cursor:'pointer', background:ativo?azulBg:'transparent', color:ativo?azul:T.textMuted, fontSize:12, fontWeight:ativo?700:500, display:'flex', alignItems:'center', gap:5, transition:'all .12s' }}>
                      <i className={`ti ${a.icon}`} style={{ fontSize:13 }} aria-hidden="true" />
                      <span>{a.label}</span>
                      <span style={{ fontSize:10, fontWeight:700, opacity:.8 }}>{n}</span>
                    </button>
                  )
                })}
              </div>

              {div}

              {/* Busca */}
              <div style={{ position:'relative', flex:'1 1 180px', minWidth:160, maxWidth:280 }}>
                <i className="ti ti-search" style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:13, color:T.textDim }} aria-hidden="true" />
                <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar nº, cliente, marca, modelo, série…"
                  style={{ width:'100%', padding:'6px 9px 6px 27px', borderRadius:6, border:`1px solid ${T.border}`, background:T.bg, color:T.textPrimary, fontSize:12, outline:'none', boxSizing:'border-box' }} />
              </div>

              {/* Atalho rápido: + Nova OS colado na busca (só ícone) */}
              <button onClick={()=>setModalNova(true)}
                aria-label="Nova OS" title="Nova OS"
                style={{ width:28, height:28, borderRadius:6, border:'none', cursor:'pointer', background:azul, color: dark ? '#0b1220' : '#ffffff', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily:'inherit' }}>
                <i className="ti ti-plus" style={{ fontSize:15 }} aria-hidden="true" />
              </button>

              {div}

              {/* Dropdown Prazo */}
              <div style={{ position:'relative' }}>
                <button onClick={()=>setMenuAberto(m => m === 'prazo' ? null : 'prazo')}
                  style={{ ...chipBase, ...(statusF !== 'todos' ? chipAtivo : chipNormal) }}>
                  Prazo: {lblPrazo}
                  <i className="ti ti-chevron-down" style={{ fontSize:11, opacity:.7 }} aria-hidden="true" />
                </button>
                {menuAberto === 'prazo' && (
                  <div style={popupStyle}>
                    {[['todos','Todos'],['vencido','Vencidas'],['hoje','Hoje/amanhã'],['ok','Em dia']].map(([v, l]) => (
                      <div key={v} onClick={()=>{ setStatusF(v); setMenuAberto(null) }} style={itemStyle(statusF === v)}>
                        {statusF === v && <i className="ti ti-check" style={{ fontSize:13 }} aria-hidden="true" />}
                        <span style={{ marginLeft: statusF === v ? 0 : 20 }}>{l}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropdown Tipos (multi-select) */}
              <div style={{ position:'relative' }}>
                <button onClick={()=>setMenuAberto(m => m === 'tipos' ? null : 'tipos')}
                  style={{ ...chipBase, ...(tiposCount < totalTipos ? chipAtivo : chipNormal) }}>
                  Tipos: {tiposCount}/{totalTipos}
                  <i className="ti ti-chevron-down" style={{ fontSize:11, opacity:.7 }} aria-hidden="true" />
                </button>
                {menuAberto === 'tipos' && (
                  <div style={popupStyle}>
                    {Object.entries(TIPOS_OS).map(([id, cfg]) => {
                      const ativo = tiposAtivos.has(id)
                      return (
                        <div key={id} onClick={()=>toggleTipo(id)} style={itemStyle(ativo)}>
                          <i className={`ti ${ativo ? 'ti-check' : 'ti-square'}`} style={{ fontSize:13 }} aria-hidden="true" />
                          <i className={`ti ${cfg.icon}`} style={{ fontSize:13, opacity:.85 }} aria-hidden="true" />
                          {cfg.label}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Toggles diretos: Aguard. peça e Recusadas */}
              <button onClick={()=>setVerAgPeca(v=>!v)}
                title={verAgPeca ? 'Ocultar filtro de aguardando peça' : 'Mostrar só OS aguardando peça'}
                style={{ ...chipBase, ...(verAgPeca ? chipAtivo : chipNormal) }}>
                <i className={`ti ${verAgPeca?'ti-package':'ti-package-off'}`} style={{ fontSize:12 }} aria-hidden="true" />
                Peça ({totalAgPeca})
              </button>
              {(zona === 'todos' || zona === 'financeiro') && (
                <button onClick={()=>setVerRecusados(v=>!v)}
                  title={verRecusados ? 'Ocultar recusadas' : 'Mostrar recusadas'}
                  style={{ ...chipBase, ...(verRecusados ? chipAtivo : chipNormal) }}>
                  <i className={`ti ${verRecusados?'ti-eye':'ti-eye-off'}`} style={{ fontSize:12 }} aria-hidden="true" />
                  Recusadas ({totalRecusados})
                </button>
              )}

              {/* Nova OS — sólido azul, alinhado à direita */}
              <button onClick={()=>setModalNova(true)}
                style={{ marginLeft:'auto', padding:'0 12px', height:28, borderRadius:6, border:'none', cursor:'pointer', background:azul, color: dark ? '#0b1220' : '#ffffff', fontSize:11.5, fontWeight:700, display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                <i className="ti ti-plus" style={{ fontSize:13 }} aria-hidden="true" />
                Nova OS
              </button>
            </div>
          )
        })()}

        {/* Kanban com scroll horizontal + drag-and-drop */}
        <div ref={kanbanRef} onWheel={handleWheel}
          style={{ flex:1, minHeight:0, overflowX:'auto', overflowY:'hidden', display:'flex', gap:10, paddingBottom:6 }}>
          {etapasVisiveis.map(etapa => (
            <KanbanColumn key={etapa.id} etapa={etapa} osList={porEtapa[etapa.id]||[]} T={T} dark={dark} tipoCor={tipoCor}
              modoTodos={true} onCardClick={setDetalhe}
              arrastando={arrastando} colunaHover={colunaHover}
              loading={osLoading}
              shakingNum={shakingNum}
              onDragStart={(numero, etapaOrigem)=>setArrastando({numero, etapa:etapaOrigem})}
              onDragEnd={()=>{ setArrastando(null); setColunaHover(null) }}
              onDragOverCol={(etapaId)=>setColunaHover(etapaId)}
              onDropCol={(etapaId)=>{ if(arrastando) moverOS(arrastando.numero, etapaId); setArrastando(null); setColunaHover(null) }}
              concluidoMesAtual={etapa.id==='concluido' && !buscando}
            />
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{ position:'absolute', bottom:18, left:'50%', transform:'translateX(-50%)', padding:'10px 16px', borderRadius:9, background: toast.tipo==='ok'?cor('#0f2a15','#e8f5ec'):cor('#2a1515','#fde8e8'), color: toast.tipo==='ok'?cor(P.green,P.greenDark):cor(P.red,P.redDark), border:`1px solid ${toast.tipo==='ok'?cor(P.green,P.greenDark):cor(P.red,P.redDark)}55`, fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:8, boxShadow:'0 6px 20px rgba(0,0,0,.25)', zIndex:50, maxWidth:480 }}>
            <i className={`ti ${toast.tipo==='ok'?'ti-circle-check':'ti-alert-triangle'}`} style={{ fontSize:18 }} aria-hidden="true" />
            <span>{toast.msg}</span>
          </div>
        )}
      </div>

      {modalNova && <NovaOSModal T={T} dark={dark} onClose={()=>setModalNova(false)} tipoInicial="atendimento" notify={notify} onCriada={osRefetch} />}
      {osDetalheAtual && <OSDetalhe T={T} dark={dark} os={osDetalheAtual} user={user} osBase={osList} usuarios={usuarios}
        onClose={()=>setDetalhe(null)}
        onToggleAgPeca={()=>toggleAgPecaOS(osDetalheAtual.numero)}
        onAbrirOS={(num)=>{ const o = osList.find(x=>x.numero===num); if(o) setDetalhe(o) }}
        onMoverOS={moverOS}
        onUpdateOS={updateOS}
        onExcluir={excluirOS}
        onRefetchOS={osRefetch} />}
    </>
  )
}
