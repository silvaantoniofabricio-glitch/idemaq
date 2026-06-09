// idemaq-src/pages/Kanban.jsx
// Redesign Atlassian/Jira-inspired (02/06/2026).
// Layout: page header (título + stats + botão criar) → zone tabs + filtros → board.
// Toda lógica de negócio mantida; só UI reconstruída do zero.

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useOS, uiEtapaToDb } from '../hooks/useOS'
import { duplicarOS } from '../utils/osDerivada'
import { useUsuarios } from '../hooks/useUsuarios'
import { P } from '../theme'
import { TIPOS_OS, ETAPAS_TODOS, ZONAS } from '../utils/osData'
import {
  isAdmin, getRole, totalAPagar,
  estaPagaTotal, estaPagaParcial,
  podeMoverOS, ordenarColuna, dentroMesCorrente,
  calcStatusPrazo, diasPrazo,
} from '../utils/osHelpers'
import { fmtPrazoCurto } from '../utils/fmt'
import { corEtapa, bgEtapa } from '../utils/colors'
import { fetchFaltaPecas, calcManutPecaStatus } from '../utils/pecasStatus'
import KanbanColumn from '../components/kanban/KanbanColumn'
import MentionTextInput from '../components/notas/MentionTextInput'
import { NovaOSModal } from '../_legacy/desktopKanbanModals'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

// ─── Painel Notas do Dia ─────────────────────────────────────────────────────
function NotasDoDia({ T, dark, onClose, osList = [], pessoas = [] }) {
  const hoje = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Cuiaba', year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/').reverse().join('-')
  const chave = `kanban_notas_${hoje}`

  const [linhas, setLinhas]   = useState([''])
  const [status, setStatus]   = useState('idle')
  const [pronto, setPronto]   = useState(false)
  const [menuCtx, setMenuCtx] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const timerRef  = useRef(null)
  const inputRefs = useRef({})
  const _mdb      = useRef(false) // mousedown começou no backdrop? (evita fechar ao arrastar)

  function agendarSave(novas) {
    setStatus('saving')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const val = novas.join('\n')
      const { error } = await supabase
        .from('configuracoes')
        .upsert({ chave, valor: val, descricao: `Notas do dia ${hoje}` }, { onConflict: 'chave' })
      if (error) { setStatus('error'); return }
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    }, 800)
  }

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      const { data } = await supabase
        .from('configuracoes').select('valor')
        .eq('chave', chave).is('deleted_at', null).maybeSingle()
      if (!cancelado) {
        const val = data?.valor
        setLinhas(val && typeof val === 'string' && val.length > 0 ? val.split('\n') : [''])
        setPronto(true)
      }
    })()
    return () => { cancelado = true }
  }, [chave])

  function atualizar(novas) { setLinhas(novas); if (pronto) agendarSave(novas) }
  function editarLinha(idx, val) { const n = [...linhas]; n[idx] = val; atualizar(n) }

  function toggleCheck(idx) {
    const l = linhas[idx]
    if (l.startsWith('☐ '))      editarLinha(idx, '✓ ' + l.slice(2))
    else if (l.startsWith('✓ ')) editarLinha(idx, '☐ ' + l.slice(2))
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const prefixo = (linhas[idx].startsWith('☐ ') || linhas[idx].startsWith('✓ ')) ? '☐ ' : ''
      const novas = [...linhas]; novas.splice(idx + 1, 0, prefixo); atualizar(novas)
      setTimeout(() => {
        const el = inputRefs.current[idx + 1]
        if (el) { el.focus(); el.setSelectionRange(prefixo.length, prefixo.length) }
      }, 20)
    } else if (e.key === 'Backspace' && linhas[idx] === '' && linhas.length > 1) {
      e.preventDefault()
      atualizar(linhas.filter((_, i) => i !== idx))
      setTimeout(() => inputRefs.current[Math.max(0, idx - 1)]?.focus(), 20)
    }
  }

  function inserirTarefaEm(idx) {
    const novas = [...linhas]; novas.splice(idx + 1, 0, '☐ '); atualizar(novas)
    setMenuCtx(null)
    setTimeout(() => { const el = inputRefs.current[idx + 1]; if (el) { el.focus(); el.setSelectionRange(2, 2) } }, 20)
  }

  function onDragStart(e, idx) { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move' }
  function onDragOver(e, idx) { e.preventDefault(); if (dragOver !== idx) setDragOver(idx) }
  function onDrop(e, idx) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOver(null); return }
    const novas = [...linhas]
    const [item] = novas.splice(dragIdx, 1)
    novas.splice(dragIdx < idx ? idx - 1 : idx, 0, item)
    atualizar(novas); setDragIdx(null); setDragOver(null)
  }

  return (
    <div
      onMouseDown={(e) => { _mdb.current = e.target === e.currentTarget }}
      onClick={(e) => { if (e.target === e.currentTarget && _mdb.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        animation: 'os-detalhe-fade .15s ease-out',
      }}>
    <div
      onClick={(e) => e.stopPropagation()}
      className="idemaq-card"
      style={{
        background: T.card, color: T.textPrimary,
        borderRadius: 14,
        width: '100%', maxWidth: 780,
        height: 'auto', maxHeight: 'calc(100vh - 4rem)',
        border: `1px solid ${T.border}`,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'os-detalhe-in .22s cubic-bezier(.2,.7,.2,1)',
      }}>
      <div style={{
        padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 8,
        background: dark ? 'rgba(91,155,213,.10)' : 'rgba(91,155,213,.06)',
        borderRadius: '14px 14px 0 0',
      }}>
        <i className="ti ti-notes" style={{ fontSize: 16, color: '#5B9BD5' }} aria-hidden="true" />
        <span style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary, flex: 1 }}>Notas do Dia</span>
        {status === 'saving' && <span style={{ fontSize: 10.5, color: T.textDim }}>salvando…</span>}
        {status === 'saved' && <span style={{ fontSize: 10.5, color: '#4CAF50', display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-check" style={{ fontSize: 11 }} /> salvo</span>}
        {status === 'error' && <span style={{ fontSize: 10.5, color: '#FF6B6B' }}>erro ao salvar</span>}
        <button onClick={onClose} style={{ width: 22, height: 22, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: T.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-x" style={{ fontSize: 13 }} aria-hidden="true" />
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
        {linhas.map((linha, idx) => {
          const isTarefa = linha.startsWith('☐ ') || linha.startsWith('✓ ')
          const checked  = linha.startsWith('✓ ')
          const textoDisplay = isTarefa ? linha.slice(2) : linha
          return (
            <div key={idx}
              onDragOver={e => onDragOver(e, idx)} onDrop={e => onDrop(e, idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, padding: '1px 8px 1px 4px',
                borderTop: dragOver === idx && dragIdx !== null && dragIdx !== idx ? '2px solid #5B9BD5' : '2px solid transparent',
                opacity: dragIdx === idx ? 0.4 : 1,
              }}>
              {/* Alça de arrasto */}
              <span draggable onDragStart={e => onDragStart(e, idx)} onDragEnd={() => { setDragIdx(null); setDragOver(null) }}
                style={{ cursor: 'grab', color: T.textDim, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '4px 2px', opacity: 0.4 }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#5B9BD5' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = T.textDim }}>
                <i className="ti ti-grip-vertical" style={{ fontSize: 13 }} aria-hidden="true" />
              </span>
              {/* Checkbox clicável — só em linhas de tarefa */}
              {isTarefa && (
                <button onClick={() => toggleCheck(idx)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 1px',
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                  color: checked ? '#5B9BD5' : T.textDim,
                }}>
                  <i className={`ti ${checked ? 'ti-square-check-filled' : 'ti-square'}`} style={{ fontSize: 15 }} aria-hidden="true" />
                </button>
              )}
              {/* Input com @menção */}
              <MentionTextInput
                T={T} dark={dark} osList={osList} pessoas={pessoas}
                inputRef={el => { inputRefs.current[idx] = el }}
                value={textoDisplay}
                onChange={v => editarLinha(idx, isTarefa ? (checked ? '✓ ' : '☐ ') + v : v)}
                onKeyDown={e => handleKeyDown(idx, e)}
                onContextMenu={e => { e.preventDefault(); setMenuCtx({ x: e.clientX, y: e.clientY, idx }) }}
                placeholder={idx === 0 ? 'Anotação, ☐ tarefa ou @pessoa/OS…' : ''}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13, fontFamily: 'inherit', lineHeight: 1.7, padding: '2px 0',
                  color: checked ? T.textDim : T.textPrimary,
                  textDecoration: checked ? 'line-through' : 'none',
                }}
              />
              {/* Botão excluir linha */}
              <button
                onClick={() => atualizar(linhas.filter((_, i) => i !== idx))}
                title="Excluir"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 3px', flexShrink: 0, display: 'flex', alignItems: 'center', color: T.textDim, opacity: 0, transition: 'opacity .15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#FF6B6B' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0'; e.currentTarget.style.color = T.textDim }}
              >
                <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" />
              </button>
            </div>
          )
        })}
        <button onClick={() => inserirTarefaEm(linhas.length - 1)}
          style={{ width: '100%', padding: '6px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 12, color: T.textDim, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', marginTop: 2 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#5B9BD5' }}
          onMouseLeave={e => { e.currentTarget.style.color = T.textDim }}>
          <i className="ti ti-plus" style={{ fontSize: 12 }} aria-hidden="true" /> Nova tarefa
        </button>
      </div>

      {menuCtx && (
        <>
          <div onClick={() => setMenuCtx(null)} style={{ position: 'fixed', inset: 0, zIndex: 70 }} />
          <div style={{ position: 'fixed', top: menuCtx.y, left: menuCtx.x, zIndex: 71, minWidth: 160, padding: 4, background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, boxShadow: dark ? '0 8px 24px rgba(0,0,0,.55)' : '0 8px 24px rgba(0,0,0,.14)' }}>
            <button onClick={() => inserirTarefaEm(menuCtx.idx)} style={{ width: '100%', padding: '8px 11px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 9, borderRadius: 4, fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : '#f0f4ff' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
              <i className="ti ti-checkbox" style={{ fontSize: 14, color: '#5B9BD5' }} aria-hidden="true" /> Nova tarefa abaixo
            </button>
          </div>
        </>
      )}
    </div>
    </div>
  )
}

export default function Kanban({ T, dark, user }) {
  const role = getRole(user)
  const admin = isAdmin(user)

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [buscaAtiva, setBuscaAtiva] = useState(false)
  const [zona, setZona]             = useState('todos')
  const [tiposAtivos, setTiposAtivos] = useState(() => new Set(Object.keys(TIPOS_OS)))
  const [busca, setBusca]           = useState('')
  const [statusF, setStatusF]       = useState('todos')
  const [verRecusados, setVerRecusados] = useState(true)
  const [verAgPeca, setVerAgPeca]   = useState(false)
  const [verLimpeza, setVerLimpeza] = useState(false)
  const [verManutencao, setVerManutencao] = useState(false)
  // Conjuntos de os_id que têm serviço de limpeza / manutenção (1 query separada,
  // pois useOS só traz a contagem de itens — e useOS é "não mexer").
  const [temLimpeza, setTemLimpeza]     = useState(() => new Set())
  const [temManutencao, setTemManutencao] = useState(() => new Set())
  // Falta de peças (alocação global do estoque entre OS de conserto) pro chip Manut.
  const [faltaSet, setFaltaSet]     = useState(() => new Set())
  const [pecasPorOS, setPecasPorOS] = useState(() => new Map())
  const [modalNova, setModalNova]   = useState(false)
  const [detalhe, setDetalhe]       = useState(null)
  const [menuAberto, setMenuAberto] = useState(null)
  const [notasAbertas, setNotasAbertas] = useState(false)

  useEffect(() => { setBuscaAtiva(busca.trim().length > 0) }, [busca])

  function toggleTipo(id) {
    setTiposAtivos(prev => {
      const next = new Set(prev)
      if (next.has(id)) { if (next.size === 1) return prev; next.delete(id) }
      else next.add(id)
      return next
    })
  }

  // Click fora fecha dropdown
  const barraRef = useRef(null)
  useEffect(() => {
    function handler(e) {
      if (barraRef.current && !barraRef.current.contains(e.target)) setMenuAberto(null)
    }
    if (menuAberto) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [menuAberto])

  // ── Dados ────────────────────────────────────────────────────────────────────
  const { osList, setOsList, loading: osLoading, error: osError, refetch: osRefetch, updateOS: updateOSHook } = useOS(buscaAtiva)
  const { usuarios } = useUsuarios()

  // Busca os serviços (1 query) e monta os conjuntos de OS com limpeza/manutenção.
  // Refaz quando a quantidade de OS muda (criou/excluiu OS).
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { data, error } = await supabase
        .from('os_item')
        .select('os_id, nome')
        .eq('categoria', 'servico')
        .is('deleted_at', null)
      if (cancel || error || !data) return
      const limp = new Set(), manu = new Set()
      for (const it of data) {
        const n = (it.nome || '').toLowerCase()
        if (n.includes('limpez')) limp.add(it.os_id)
        if (n.includes('manuten')) manu.add(it.os_id)
      }
      setTemLimpeza(limp)
      setTemManutencao(manu)
    })()
    return () => { cancel = true }
  }, [osList.length])

  // Alocação global do estoque entre as OS de conserto (pro chip Manut.).
  // Refaz quando a lista de OS muda OU quando algum status de compra muda.
  const compraPecasKey = useMemo(
    () => osList.map(o => o.pre_diagnostico?.compra_pecas ? JSON.stringify(o.pre_diagnostico.compra_pecas) : '').join('|'),
    [osList]
  )
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { falta, porOS } = await fetchFaltaPecas()
      if (!cancel) { setFaltaSet(falta); setPecasPorOS(porOS) }
    })()
    return () => { cancel = true }
  }, [osList.length, compraPecasKey])

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  const [arrastando, setArrastando]   = useState(null)
  const [colunaHover, setColunaHover] = useState(null)
  const [shakingNum, setShakingNum]   = useState(null)
  const [toast, setToast]             = useState(null)

  function notify(tipo, msg) {
    setToast({ tipo, msg })
    clearTimeout(notify._t)
    notify._t = setTimeout(() => setToast(null), 3200)
  }

  async function moverOS(numero, etapaAlvo) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const etapaUnif = ETAPAS_TODOS.find(e => e.id === etapaAlvo)
    const alvoReal = etapaUnif?.match?.[os.tipo]
    if (!alvoReal) { notify('erro', `Esta coluna não aceita OS de ${TIPOS_OS[os.tipo].label}`); return }
    const r = podeMoverOS(os, alvoReal, { pularEtapas: true })
    if (!r.ok) { notify('erro', r.motivo); setShakingNum(numero); setTimeout(() => setShakingNum(null), 350); return }
    const etapaFinal = r.alvo || alvoReal
    const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Cuiaba' }).slice(0, 16).replace('T', ' ')
    const osPrev = osList
    setOsList(prev => prev.map(o => o.numero !== numero ? o : {
      ...o, etapa: etapaFinal,
      historico: [...(o.historico || []), { etapa: etapaFinal, funcionario: user?.id, data: agora }]
    }))
    const labelFinal = TIPOS_OS[os.tipo].etapas.find(e => e.id === etapaFinal)?.label || etapaFinal
    if (r.alvo) notify('ok', `OS #${numero} já paga — foi para ${labelFinal}`)
    else notify('ok', `OS #${numero} → ${labelFinal}`)
    try {
      const dbEtapa = uiEtapaToDb(os.tipo, etapaFinal)
      const patch = { etapa: dbEtapa }
      if (etapaFinal === 'concluido' || etapaFinal === 'recusado') patch.data_conclusao = new Date().toISOString()
      else if (os.etapa === 'concluido') patch.data_conclusao = null
      if (etapaFinal === 'recusado') patch.recusada = true
      const { error } = await supabase.from('os').update(patch).eq('id', os.id)
      if (error) throw error
    } catch { setOsList(osPrev); notify('erro', 'Erro ao mover OS — revertido') }
  }

  async function updateOS(numero, patch) {
    const res = await updateOSHook(numero, patch)
    if (!res.ok) notify('erro', 'Erro ao salvar — mudança revertida')
  }

  async function handleDuplicarOS(os) { return duplicarOS(os) }

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
      notify('erro', `Erro ao excluir: ${e?.message || 'desconhecido'}`)
    }
  }

  async function toggleAgPecaOS(numero) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const novoValor = !os.aguardando_peca
    const osPrev = osList
    setOsList(prev => prev.map(o => o.numero === numero ? { ...o, aguardando_peca: novoValor } : o))
    try {
      const { error } = await supabase.from('os').update({ aguardando_peca: novoValor }).eq('id', os.id)
      if (error) throw error
    } catch { setOsList(osPrev); notify('erro', 'Erro ao atualizar peça — revertido') }
  }

  useEffect(() => { if (osError) notify('erro', 'Erro ao carregar OS — tente recarregar') }, [osError])

  // ── Filtragem ─────────────────────────────────────────────────────────────────
  const todasUniverso = osList.filter(o => tiposAtivos.has(o.tipo))
  const buscando = busca.trim().length > 0
  const zonaCfg = ZONAS.find(z => z.id === zona)
  const etapasAtivas = (zona === 'todos' || buscando)
    ? ETAPAS_TODOS
    : ETAPAS_TODOS.filter(e => zonaCfg.etapas.includes(e.id))
  const etapasVisiveis = etapasAtivas.filter(e => admin || !e.adminOnly)

  const osFiltradas = todasUniverso
    .filter(o => buscando ? true : !o.oculta_no_kanban)
    .filter(o => verRecusados ? true : o.etapa !== 'recusado')
    .filter(o => !verAgPeca ? true : !!o.aguardando_peca)
    .filter(o => !verLimpeza ? true : temLimpeza.has(o.id))
    .filter(o => !verManutencao ? true : temManutencao.has(o.id))
    .filter(o => {
      if (statusF === 'todos') return true
      const s = calcStatusPrazo(o.prazo, o.etapa)
      if (statusF === 'vencido') return s === 'vencido'
      if (statusF === 'hoje')    return s === 'hoje' || s === 'amanha'
      if (statusF === 'ok')      return s === 'ok'
      return true
    })
    .filter(o => buscando ? true : dentroMesCorrente(o))
    .filter(o => !buscando ||
      o.cliente.toLowerCase().includes(busca.toLowerCase()) ||
      String(o.numero).includes(busca) ||
      (o.equipamento || '').toLowerCase().includes(busca.toLowerCase()) ||
      (o.marca || '').toLowerCase().includes(busca.toLowerCase()) ||
      (o.modelo || '').toLowerCase().includes(busca.toLowerCase()) ||
      (o.serie || '').toLowerCase().includes(busca.toLowerCase()))

  const porEtapa = {}
  etapasVisiveis.forEach(e => porEtapa[e.id] = [])
  osFiltradas.forEach(os => {
    const ec = etapasVisiveis.find(e => e.match && e.match[os.tipo] === os.etapa)
    if (!ec) return
    // Só a etapa Conserto (oficina) mostra o chip Manut. — calcula a cor da peça.
    const card = os.etapa === 'oficina'
      ? { ...os, manutPecaStatus: calcManutPecaStatus(os, pecasPorOS.get(os.id), faltaSet) }
      : os
    porEtapa[ec.id].push(card)
  })
  Object.keys(porEtapa).forEach(k => { porEtapa[k] = ordenarColuna(k, porEtapa[k]) })

  const totalKanban    = Object.values(porEtapa).reduce((s, a) => s + a.length, 0)
  const totalRecusados = todasUniverso.filter(o => o.etapa === 'recusado').length
  const totalAgPeca    = todasUniverso.filter(o => !!o.aguardando_peca).length
  const totalLimpeza   = todasUniverso.filter(o => temLimpeza.has(o.id)).length
  const totalManutencao = todasUniverso.filter(o => temManutencao.has(o.id)).length
  const totVencidas    = todasUniverso.filter(o => calcStatusPrazo(o.prazo, o.etapa) === 'vencido').length
  const totGarantia    = todasUniverso.filter(o => !!o.garantia).length

  // ── Abas de zona ─────────────────────────────────────────────────────────────
  const abas = [
    { id: 'todos', label: 'Todas', icon: 'ti-layout-kanban' },
    ...ZONAS.map(z => ({ id: z.id, label: z.label, icon: z.icon })),
  ]

  // Contagem por zona (exclui concluídas/recusadas do badge)
  function contarZona(abaId) {
    const zonaA = ZONAS.find(z => z.id === abaId)
    const etapasZona = abaId === 'todos' ? ETAPAS_TODOS : ETAPAS_TODOS.filter(e => zonaA?.etapas.includes(e.id))
    return todasUniverso.filter(o =>
      o.etapa !== 'concluido' && o.etapa !== 'recusado' &&
      etapasZona.some(e => e.match && e.match[o.tipo] === o.etapa)
    ).length
  }

  // ── Wheel scroll horizontal ───────────────────────────────────────────────────
  const kanbanRef = useRef(null)
  function handleWheel(e) {
    if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return
    const root = kanbanRef.current
    let el = e.target
    while (el && el !== root) {
      const oy = getComputedStyle(el).overflowY
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
        const podeDescer = e.deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1
        const podeSubir  = e.deltaY < 0 && el.scrollTop > 0
        if (podeDescer || podeSubir) return
      }
      el = el.parentElement
    }
    e.preventDefault()
    root.scrollLeft += e.deltaY
  }

  const osDetalheAtual = detalhe ? osList.find(o => o.numero === detalhe.numero) || detalhe : null

  // ── Tokens de cor ─────────────────────────────────────────────────────────────
  const azul     = dark ? P.blue    : P.blueDark
  const azulBg   = dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb'
  const vermelho  = dark ? P.red    : P.redDark
  const amarelo   = dark ? P.yellow : P.yellowDark
  const tipoCor   = corEtapa(zona === 'todos' ? 'blue' : (zonaCfg?.cor || 'blue'), dark)

  // Filtro Prazo: label atual
  const lblPrazo = { todos: 'Todos', vencido: 'Vencidas', hoje: 'Hoje/amanhã', ok: 'Em dia' }[statusF]
  const totalTipos = Object.keys(TIPOS_OS).length
  const tiposCount = tiposAtivos.size

  return (
    <>
      <div style={{
        display: 'flex', flexDirection: 'column', flex: 1,
        minHeight: 0, overflow: 'hidden', background: T.bg,
      }}>

        {/* ═══════════════════════════════════════════════════════
            PAGE HEADER — título, stats, botão criar
        ═══════════════════════════════════════════════════════ */}
        <div style={{
          padding: '18px 22px 0',
          borderBottom: `1px solid ${T.border}`,
          background: T.bg,
          flexShrink: 0,
        }}>
          {/* Linha 1: título + botão criar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: azulBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <i className="ti ti-clipboard-list" style={{ fontSize: 16, color: azul }} aria-hidden="true" />
              </div>
              <div>
                <h1 style={{
                  fontSize: 17, fontWeight: 700, color: T.textPrimary,
                  margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2,
                }}>Ordens de serviço</h1>
                {/* Stats row */}
                <div style={{ display: 'flex', gap: 10, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <StatBadge v={totalKanban} label="ativas" color={T.textMuted} />
                  {totVencidas > 0 && <StatBadge v={totVencidas} label="vencidas" color={vermelho} dot />}
                  {totalAgPeca > 0 && <StatBadge v={totalAgPeca} label="ag. peça" color={amarelo} dot />}
                  {totGarantia > 0 && <StatBadge v={totGarantia} label="garantia" color={azul} dot />}
                  {buscando && (
                    <span style={{
                      padding: '1px 8px', borderRadius: 4,
                      background: azulBg, color: azul,
                      fontSize: 10.5, fontWeight: 700,
                    }}>Busca ativa</span>
                  )}
                  {!admin && (
                    <span style={{ fontSize: 10.5, color: T.textDim }}>· você não vê Concluído</span>
                  )}
                </div>
              </div>
            </div>

            {/* Botão criar — estilo Atlassian primary */}
            <button onClick={() => setModalNova(true)}
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
              Criar OS
            </button>
          </div>

          {/* Linha 2: zone tabs + filtros inline */}
          <div ref={barraRef} style={{
            display: 'flex', alignItems: 'stretch',
            justifyContent: 'space-between', gap: 8,
          }}>
            {/* Zone tabs — underline style */}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, flexShrink: 0 }}>
              {abas.map(a => {
                const ativo = a.id === zona
                const n = contarZona(a.id)
                return (
                  <button key={a.id} onClick={() => setZona(a.id)}
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
                    {n > 0 && (
                      <span style={{
                        padding: '1px 6px', borderRadius: 10,
                        background: ativo ? azulBg : (dark ? 'rgba(255,255,255,0.08)' : '#e4e4e9'),
                        color: ativo ? azul : T.textMuted,
                        fontSize: 10.5, fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                      }}>{n}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Filtros à direita */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingBottom: 8, flexShrink: 0, flexWrap: 'wrap' }}>

              {/* Busca */}
              <div style={{ position: 'relative' }}>
                <i className="ti ti-search" style={{
                  position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, color: T.textDim, pointerEvents: 'none',
                }} aria-hidden="true" />
                <input
                  value={busca} onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar…"
                  style={{
                    padding: '5px 10px 5px 28px', width: 190,
                    borderRadius: 4, border: `1px solid ${T.border}`,
                    background: T.card, color: T.textPrimary,
                    fontSize: 12.5, outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color .15s, width .2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = azul; e.target.style.width = '230px' }}
                  onBlur={e => { e.target.style.borderColor = T.border; e.target.style.width = '190px' }}
                />
              </div>

              <Divider dark={dark} T={T} />

              {/* Prazo dropdown */}
              <DropdownFilter
                label={`Prazo: ${lblPrazo}`}
                ativo={statusF !== 'todos'}
                open={menuAberto === 'prazo'}
                onToggle={() => setMenuAberto(m => m === 'prazo' ? null : 'prazo')}
                T={T} dark={dark} azul={azul} azulBg={azulBg}>
                {[['todos', 'Todos'], ['vencido', 'Vencidas'], ['hoje', 'Hoje / amanhã'], ['ok', 'Em dia']].map(([v, l]) => (
                  <DropdownItem key={v} label={l} ativo={statusF === v} azul={azul} azulBg={azulBg} T={T}
                    onClick={() => { setStatusF(v); setMenuAberto(null) }} />
                ))}
              </DropdownFilter>

              {/* Tipos dropdown */}
              <DropdownFilter
                label={tiposCount < totalTipos ? `Tipos (${tiposCount}/${totalTipos})` : 'Tipos'}
                ativo={tiposCount < totalTipos}
                open={menuAberto === 'tipos'}
                onToggle={() => setMenuAberto(m => m === 'tipos' ? null : 'tipos')}
                T={T} dark={dark} azul={azul} azulBg={azulBg}>
                {Object.entries(TIPOS_OS).map(([id, cfg]) => {
                  const ativo = tiposAtivos.has(id)
                  return (
                    <DropdownItem key={id} label={cfg.label} icon={cfg.icon} ativo={ativo}
                      azul={azul} azulBg={azulBg} T={T}
                      onClick={() => toggleTipo(id)} />
                  )
                })}
              </DropdownFilter>

              <Divider dark={dark} T={T} />

              {/* Toggle Peça */}
              <ToggleChip
                ativo={verAgPeca}
                icon={verAgPeca ? 'ti-package' : 'ti-package-off'}
                label={`Peça${totalAgPeca > 0 ? ` (${totalAgPeca})` : ''}`}
                title={verAgPeca ? 'Ocultar filtro peça' : 'Só OS aguardando peça'}
                onClick={() => setVerAgPeca(v => !v)}
                T={T} dark={dark} azul={azul} azulBg={azulBg}
              />

              {/* Toggle Limpeza */}
              <ToggleChip
                ativo={verLimpeza}
                icon="ti-bubble"
                label={`Limpeza${totalLimpeza > 0 ? ` (${totalLimpeza})` : ''}`}
                title={verLimpeza ? 'Ocultar filtro limpeza' : 'Só OS com serviço de limpeza'}
                onClick={() => setVerLimpeza(v => !v)}
                T={T} dark={dark} azul={azul} azulBg={azulBg}
              />

              {/* Toggle Manutenção */}
              <ToggleChip
                ativo={verManutencao}
                icon="ti-tool"
                label={`Manutenção${totalManutencao > 0 ? ` (${totalManutencao})` : ''}`}
                title={verManutencao ? 'Ocultar filtro manutenção' : 'Só OS com serviço de manutenção'}
                onClick={() => setVerManutencao(v => !v)}
                T={T} dark={dark} azul={azul} azulBg={azulBg}
              />

              {/* Toggle Recusadas */}
              {(zona === 'todos' || zona === 'financeiro') && (
                <ToggleChip
                  ativo={verRecusados}
                  icon={verRecusados ? 'ti-eye' : 'ti-eye-off'}
                  label={`Recusadas${totalRecusados > 0 ? ` (${totalRecusados})` : ''}`}
                  title={verRecusados ? 'Ocultar recusadas' : 'Mostrar recusadas'}
                  onClick={() => setVerRecusados(v => !v)}
                  T={T} dark={dark} azul={azul} azulBg={azulBg}
                />
              )}

              <Divider dark={dark} T={T} />

              {/* Notas do dia */}
              <ToggleChip
                ativo={notasAbertas}
                icon="ti-notes"
                label="Notas"
                title="Notas do dia"
                onClick={() => setNotasAbertas(v => !v)}
                T={T} dark={dark} azul={azul} azulBg={azulBg}
              />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            BOARD — colunas kanban
        ═══════════════════════════════════════════════════════ */}
        <div
          ref={kanbanRef}
          onWheel={handleWheel}
          style={{
            flex: 1, minHeight: 0,
            overflowX: 'auto', overflowY: 'hidden',
            display: 'flex', gap: 8,
            padding: '14px 18px 10px',
          }}>
          {etapasVisiveis.map(etapa => (
            <KanbanColumn key={etapa.id} etapa={etapa} osList={porEtapa[etapa.id] || []}
              T={T} dark={dark} tipoCor={tipoCor}
              modoTodos={true} onCardClick={setDetalhe}
              arrastando={arrastando} colunaHover={colunaHover}
              loading={osLoading} shakingNum={shakingNum}
              onDragStart={(n, e) => setArrastando({ numero: n, etapa: e })}
              onDragEnd={() => { setArrastando(null); setColunaHover(null) }}
              onDragOverCol={e => setColunaHover(e)}
              onDropCol={e => { if (arrastando) moverOS(arrastando.numero, e); setArrastando(null); setColunaHover(null) }}
              concluidoMesAtual={etapa.id === 'concluido' && !buscando}
            />
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            padding: '10px 16px', borderRadius: 6,
            background: toast.tipo === 'ok'
              ? (dark ? '#0f2a15' : '#e8f5ec')
              : (dark ? '#2a1515' : '#fde8e8'),
            color: toast.tipo === 'ok'
              ? (dark ? P.green : P.greenDark)
              : (dark ? P.red   : P.redDark),
            border: `1px solid ${toast.tipo === 'ok' ? (dark ? P.green : P.greenDark) : (dark ? P.red : P.redDark)}55`,
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,.2)',
            zIndex: 50, maxWidth: 480,
          }}>
            <i className={`ti ${toast.tipo === 'ok' ? 'ti-circle-check' : 'ti-alert-triangle'}`}
              style={{ fontSize: 16 }} aria-hidden="true" />
            {toast.msg}
          </div>
        )}
      </div>

      {notasAbertas && <NotasDoDia T={T} dark={dark} onClose={() => setNotasAbertas(false)} osList={osList} pessoas={usuarios} />}
      {modalNova && (
        <NovaOSModal T={T} dark={dark} onClose={() => setModalNova(false)}
          tipoInicial="atendimento" notify={notify} onCriada={osRefetch} />
      )}
      {osDetalheAtual && (
        <OSDetalhe T={T} dark={dark} os={osDetalheAtual} user={user}
          osBase={osList} usuarios={usuarios}
          onClose={() => setDetalhe(null)}
          onToggleAgPeca={() => toggleAgPecaOS(osDetalheAtual.numero)}
          onAbrirOS={num => { const o = osList.find(x => x.numero === num); if (o) setDetalhe(o) }}
          onMoverOS={moverOS}
          onUpdateOS={updateOS}
          onExcluir={excluirOS}
          onDuplicar={handleDuplicarOS}
          onRefetchOS={osRefetch} />
      )}
    </>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function StatBadge({ v, label, color, dot }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 12 }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', alignSelf: 'center', flexShrink: 0 }} />}
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
      <span style={{ color: 'inherit', opacity: 0.65 }}>{label}</span>
    </span>
  )
}

function Divider({ dark, T }) {
  return (
    <div style={{
      width: 1, height: 18, flexShrink: 0,
      background: dark ? 'rgba(255,255,255,0.12)' : T.border,
    }} />
  )
}

function DropdownFilter({ label, ativo, open, onToggle, children, T, dark, azul, azulBg }) {
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={onToggle}
        style={{
          padding: '4px 10px', borderRadius: 4,
          border: `1px solid ${ativo ? azul : T.border}`,
          background: ativo ? azulBg : 'transparent',
          color: ativo ? azul : T.textMuted,
          fontSize: 12.5, fontWeight: ativo ? 600 : 500,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          whiteSpace: 'nowrap',
        }}>
        {label}
        <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: 0.7 }} aria-hidden="true" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 5px)', left: 0, minWidth: 160, zIndex: 30,
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 6, padding: 4,
          boxShadow: dark
            ? '0 8px 24px rgba(0,0,0,.5)'
            : '0 6px 20px rgba(0,0,0,.12)',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}

function DropdownItem({ label, icon, ativo, onClick, T, azul, azulBg }) {
  return (
    <div onClick={onClick} style={{
      padding: '6px 10px', borderRadius: 4,
      background: ativo ? azulBg : 'transparent',
      color: ativo ? azul : T.textPrimary,
      fontSize: 12.5, fontWeight: ativo ? 600 : 500,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
    }}
      onMouseEnter={e => { if (!ativo) e.currentTarget.style.background = 'rgba(128,128,128,0.08)' }}
      onMouseLeave={e => { if (!ativo) e.currentTarget.style.background = 'transparent' }}>
      {ativo
        ? <i className="ti ti-check" style={{ fontSize: 12, flexShrink: 0 }} aria-hidden="true" />
        : <span style={{ width: 12, flexShrink: 0 }} />}
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 12, opacity: 0.8 }} aria-hidden="true" />}
      {label}
    </div>
  )
}

function ToggleChip({ ativo, icon, label, title, onClick, T, dark, azul, azulBg }) {
  return (
    <button onClick={onClick} title={title}
      style={{
        padding: '4px 10px', borderRadius: 4,
        border: `1px solid ${ativo ? azul : T.border}`,
        background: ativo ? azulBg : 'transparent',
        color: ativo ? azul : T.textMuted,
        fontSize: 12.5, fontWeight: ativo ? 600 : 500,
        cursor: 'pointer', fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        whiteSpace: 'nowrap',
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
      {label}
    </button>
  )
}
