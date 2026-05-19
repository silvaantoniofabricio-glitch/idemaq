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
  responsavelAtual,
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
  const [respF, setRespF]               = useState('todos')
  const [verRecusados, setVerRecusados] = useState(false)
  const [verAgPeca, setVerAgPeca]       = useState(false)
  const [modalNova, setModalNova] = useState(false)
  const [detalhe, setDetalhe]     = useState(null)
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
    const r = podeMoverOS(os, alvoReal)
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
    .filter(o => {
      if (respF === 'todos') return true
      const resp = responsavelAtual(o)
      if (resp === respF) return true
      // Também considera quem passou pela OS (histórico) — facilita acompanhar tarefa
      return (o.historico || []).some(h => h.funcionario === respF)
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

  // Scroll horizontal com wheel
  const kanbanRef = useRef(null)
  function handleWheel(e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault()
      kanbanRef.current.scrollLeft += e.deltaY
    }
  }

  // OS aberta no detalhe — pega a versão atualizada do estado
  const osDetalheAtual = detalhe ? osList.find(o => o.numero === detalhe.numero) || detalhe : null

  return (
    <>
      <div style={{ padding:'1.1rem 1.25rem 1.1rem', display:'flex', flexDirection:'column', gap:12, flex:1, minHeight:0, overflow:'hidden', position:'relative' }}>

        {/* Cor padrão dos filtros ativos — sempre azul */}
        {(() => null)()}

        {/* Header da página: título + stats inline */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:2 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700, color: dark ? '#f1f5f9' : '#0a0a0d', letterSpacing:'-0.02em', lineHeight:1 }}>
              Ordens de serviço
            </div>
            <div style={{ fontSize:12, color:T.textMuted, marginTop:4 }}>
              {osList.length} OS no sistema · {totalKanban} em andamento
              {!admin && <span> · você não vê Pagamento e Concluído</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:18, alignItems:'flex-end' }}>
            {[
              { lbl:'Ativas',       v: totalKanban,                                                                       c: T.textPrimary },
              { lbl:'Vencidas',     v: todasUniverso.filter(o => calcStatusPrazo(o.prazo, o.etapa) === 'vencido').length, c: cor(P.red, P.redDark) },
              { lbl:'Aguard. peça', v: totalAgPeca,                                                                       c: cor(P.yellow, P.yellowDark) },
              { lbl:'Em garantia',  v: todasUniverso.filter(o => !!o.garantia).length,                                    c: cor(P.blue, P.blueDark) },
            ].map((s, i) => (
              <div key={i} style={{ textAlign:'right' }}>
                <div style={{ fontSize:18, fontWeight:700, color: s.v > 0 ? s.c : T.textDim, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums', lineHeight:1 }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:T.textMuted, marginTop:3, textTransform:'uppercase', letterSpacing:'0.04em', fontWeight:600 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Seletor de aba (zona) + Nova OS */}
        <div style={{ display:'flex', gap:10, alignItems:'stretch' }}>
          <div style={{ display:'flex', gap:6, background:T.card, padding:4, borderRadius:10, border:`1px solid ${T.border}`, flex:1 }}>
            {abas.map(a => {
              const ativo = a.id === zona
              const azul = cor(P.blue, P.blueDark)
              const azulBg = cor('#0d2035', '#e6f1fb')
              // Contagem: OS dos tipos ativos cuja etapa cai nesta zona (exceto concluído e recusado)
              const zonaA = ZONAS.find(z => z.id === a.id)
              const etapasZona = a.id === 'todos' ? ETAPAS_TODOS : ETAPAS_TODOS.filter(e => zonaA.etapas.includes(e.id))
              const n = osList.filter(o => {
                if (!tiposAtivos.has(o.tipo)) return false
                if (o.etapa === 'concluido' || o.etapa === 'recusado') return false
                return etapasZona.some(e => e.match && e.match[o.tipo] === o.etapa)
              }).length
              return (
                <button key={a.id} onClick={()=>setZona(a.id)}
                  style={{ flex:1, padding:'10px 14px', borderRadius:7, border:'none', cursor:'pointer', background:ativo?azulBg:'transparent', color:ativo?azul:T.textMuted, fontSize:13, fontWeight:ativo?700:500, display:'flex', alignItems:'center', justifyContent:'center', gap:8, transition:'background .15s' }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize:16 }} aria-hidden="true" />
                  <span>{a.label}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:10, background:ativo?azul:T.cardAlt, color:ativo?(dark?'#0b1220':'#ffffff'):T.textMuted, minWidth:18, textAlign:'center' }}>{n}</span>
                </button>
              )
            })}
          </div>
          <button onClick={()=>setModalNova(true)}
            style={{ padding:'0 18px', borderRadius:10, border:'none', cursor:'pointer', background:`linear-gradient(135deg,${P.blue},#3a7bbf)`, color:'#fff', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap', boxShadow:dark?'0 2px 8px rgba(91,155,213,.15)':'0 2px 6px rgba(0,0,0,.1)' }}>
            <i className="ti ti-plus" style={{ fontSize:16 }} aria-hidden="true" />
            Nova OS
          </button>
        </div>

        {/* Filtros */}
        <div style={{ background:T.card, borderRadius:10, border:`1px solid ${T.border}`, padding:'10px 12px', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:220, maxWidth:340 }}>
            <i className="ti ti-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:T.textDim }} aria-hidden="true" />
            <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar nº, cliente, marca, modelo ou nº série…"
              style={{ width:'100%', padding:'8px 10px 8px 32px', borderRadius:7, border:`1px solid ${T.border}`, background:T.bg, color:T.textPrimary, fontSize:12.5, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <span style={{ fontSize:11, color:T.textMuted, alignSelf:'center', marginRight:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px' }}>Prazo</span>
            {[['todos','Todos'],['vencido','Vencidas'],['hoje','Hoje/amanhã'],['ok','Em dia']].map(([v,l]) => {
              const ativo = statusF === v
              const azul = cor(P.blue, P.blueDark)
              const azulBg = cor('#0d2035', '#e6f1fb')
              return (
                <button key={v} onClick={()=>setStatusF(v)}
                  style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:'transparent', color:ativo?azul:T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:ativo?600:500 }}>{l}</button>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <span style={{ fontSize:11, color:T.textMuted, alignSelf:'center', marginRight:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px' }}>Resp.</span>
            {[{ id:'todos', apelido:'Todos' }, ...usuarios].map(u => {
              const ativo = respF === u.id
              const azul = cor(P.blue, P.blueDark)
              const azulBg = cor('#0d2035', '#e6f1fb')
              return (
                <button key={u.id} onClick={()=>setRespF(u.id)}
                  title={u.id === 'todos' ? 'Sem filtro de responsável' : `Filtrar por ${u.apelido}`}
                  style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:'transparent', color:ativo?azul:T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:ativo?600:500 }}>{u.apelido}</button>
              )
            })}
          </div>
          <button onClick={()=>setVerAgPeca(v=>!v)}
            style={{ padding:'5px 11px', borderRadius:6, border:`1px solid ${verAgPeca?cor(P.blue,P.blueDark):T.border}`, background:verAgPeca?cor('#0d2035','#e6f1fb'):'transparent', color:verAgPeca?cor(P.blue,P.blueDark):T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
            <i className={`ti ${verAgPeca?'ti-package':'ti-package-off'}`} style={{ fontSize:13 }} aria-hidden="true" />
            Aguard. peça ({totalAgPeca})
          </button>
          {(zona === 'todos' || zona === 'financeiro') && (
            <button onClick={()=>setVerRecusados(v=>!v)}
              style={{ padding:'5px 11px', borderRadius:6, border:`1px solid ${verRecusados?cor(P.blue,P.blueDark):T.border}`, background:verRecusados?cor('#0d2035','#e6f1fb'):'transparent', color:verRecusados?cor(P.blue,P.blueDark):T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
              <i className={`ti ${verRecusados?'ti-eye':'ti-eye-off'}`} style={{ fontSize:13 }} aria-hidden="true" />
              Recusadas ({totalRecusados})
            </button>
          )}
          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            <span style={{ fontSize:11, color:T.textMuted, marginRight:3, fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px' }}>Tipos</span>
            {Object.entries(TIPOS_OS).map(([id, cfg]) => {
              const ativo = tiposAtivos.has(id)
              const azul = cor(P.blue, P.blueDark)
              const azulBg = cor('#0d2035', '#e6f1fb')
              return (
                <button key={id} onClick={()=>toggleTipo(id)}
                  style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${ativo?azul:T.border}`, background:ativo?azulBg:'transparent', color:ativo?azul:T.textMuted, fontSize:11.5, cursor:'pointer', fontWeight:ativo?600:500, display:'flex', alignItems:'center', gap:5 }}
                  title={ativo ? `Ocultar ${cfg.label}` : `Mostrar ${cfg.label}`}>
                  <i className={`ti ${cfg.icon}`} style={{ fontSize:13 }} aria-hidden="true" />
                  {cfg.label}
                </button>
              )
            })}
          </div>
          <span style={{ marginLeft:'auto', fontSize:11, color:T.textDim, fontWeight:500, display:'flex', alignItems:'center', gap:6 }}>
            {buscando && <span style={{ padding:'1px 7px', borderRadius:8, background:cor('#0d2035','#e6f1fb'), color:cor(P.blue,P.blueDark), fontSize:10, fontWeight:700 }}>Busca ativa — vendo histórico completo</span>}
            {totalKanban} OS {!admin && '· você não vê Pagamento e Concluído'}
          </span>
        </div>

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
        onUpdateOS={updateOS} />}
    </>
  )
}
