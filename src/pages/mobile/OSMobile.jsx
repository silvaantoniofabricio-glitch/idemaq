// src/pages/mobile/OSMobile.jsx
// Página OS mobile — Atlassian Design sincronizado com desktop (02/06/2026).
//
// Kanban horizontal scroll-snap:
//   - 1 coluna por viewport (modo normal 88%) ou 2 (compact 50%)
//   - Colunas: fundo neutro #f4f5f7 + header uppercase + dot quadrado
//     (mesmo visual do KanbanColumn desktop)
//   - Stats strip no header: ativas · vencidas · ag. peça
//   - FABs: compact/normal + notas do dia

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useOS, uiEtapaToDb } from '../../hooks/useOS'
import { useUsuarios } from '../../hooks/useUsuarios'
import { normalizePatchOS } from '../../utils/osPatch'
import {
  podeMoverOS, calcStatusPrazo, dentroMesCorrente, isAdmin, ordenarColuna,
} from '../../utils/osHelpers'
import { fetchFaltaPecas, calcManutPecaStatus } from '../../utils/pecasStatus'
import { semAcento } from '../../utils/fmt'
import { ETAPAS_TODOS, ZONAS } from '../../utils/osData'
import { corEtapa, bgEtapa } from '../../utils/colors'
import { P } from '../../theme'
import { useToast } from '../../components/ui'
import FiltrosMobile from '../../components/mobile/FiltrosMobile'
import OSCardMobile from '../../components/mobile/OSCardMobile'
import OSDetalhe from '../../components/osDetalhe/OSDetalhe'
import NovaOSMobile from '../../components/os/NovaOSMobile'
import RoteiroDia from '../../components/roteiro/RoteiroDia'

// ─── Componente principal ───────────────────────────────────────────────────
export default function OSMobile({ T, dark, user }) {
  const { osList, setOsList, loading, refetch } = useOS(false)
  const { usuarios } = useUsuarios()
  const notify = useToast()
  const admin = isAdmin(user)

  const azul     = corEtapa('blue', dark)
  const vermelho  = dark ? P.red    : P.redDark
  const amarelo   = dark ? P.yellow : P.yellowDark

  const [busca, setBusca]   = useState('')
  const [filtros, setFiltros] = useState({
    zona: 'todos',
    tipos: new Set(['atendimento', 'fabricacao', 'venda']),
    limpeza: false,
    manutencao: false,
  })

  // Conjuntos de os_id com serviço de limpeza / manutenção (1 query separada —
  // useOS só traz a contagem de itens e é "não mexer").
  const [temLimpeza, setTemLimpeza]     = useState(() => new Set())
  const [temManutencao, setTemManutencao] = useState(() => new Set())
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

  // Falta de peças (alocação global do estoque entre OS de conserto) pro chip Manut.
  const [faltaSet, setFaltaSet]     = useState(() => new Set())
  const [pecasPorOS, setPecasPorOS] = useState(() => new Map())
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

  const VIEW_STORAGE_KEY = 'idemaq.osmobile.view'
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(VIEW_STORAGE_KEY) === 'compact' ? 'compact' : 'normal' }
    catch { return 'normal' }
  })
  useEffect(() => { try { localStorage.setItem(VIEW_STORAGE_KEY, viewMode) } catch {} }, [viewMode])

  const ETAPA_STORAGE_KEY = 'idemaq.osmobile.etapaAba'
  const [etapaAba, setEtapaAba] = useState(() => {
    try { return localStorage.getItem(ETAPA_STORAGE_KEY) || null } catch { return null }
  })
  const [osAberta, setOsAberta]       = useState(null)
  const [modalNova, setModalNova]     = useState(false)
  const [notasAbertas, setNotasAbertas] = useState(false)

  const osVigente = useMemo(
    () => osAberta ? (osList.find(o => o.numero === osAberta.numero) || osAberta) : null,
    [osAberta, osList]
  )

  // ─── Filtragem ───────────────────────────────────────────────────────────
  const osFiltradas = useMemo(() => {
    const q = semAcento(busca.trim())
    const buscando = q.length > 0
    const zonaCfg = ZONAS.find(z => z.id === filtros.zona)
    const etapasZona = zonaCfg ? new Set(zonaCfg.etapas) : null
    return (osList || []).filter(os => {
      if (os.deleted_at) return false
      if (!filtros.tipos.has(os.tipo)) return false
      if (filtros.limpeza && !temLimpeza.has(os.id)) return false
      if (filtros.manutencao && !temManutencao.has(os.id)) return false
      const etapaUni = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === os.etapa)
      if (etapaUni?.adminOnly && !admin) return false
      if (etapasZona && etapaUni && !etapasZona.has(etapaUni.id)) return false
      if (!buscando && !dentroMesCorrente(os)) return false
      if (buscando) {
        const c = semAcento(os.cliente)
        const e = semAcento(os.equipamento)
        const m = semAcento(os.marca)
        const mo = semAcento(os.modelo)
        const n = String(os.numero || '')
        if (!c.includes(q) && !e.includes(q) && !m.includes(q) && !mo.includes(q) && !n.includes(q)) return false
      }
      return true
    })
  }, [osList, busca, filtros, admin, temLimpeza, temManutencao])

  // ─── Colunas ─────────────────────────────────────────────────────────────
  const colunas = useMemo(() => {
    const porEtapa = {}
    for (const os of osFiltradas) {
      const uni = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === os.etapa)
      if (!uni) continue
      if (uni.adminOnly && !admin) continue
      // Só a etapa Conserto (oficina): cor da peça (Manut.) + detecção real de
      // limpeza/manutenção (evita mostrar "Limp." em OS que não tem limpeza).
      const card = os.etapa === 'oficina'
        ? { ...os,
            manutPecaStatus: calcManutPecaStatus(os, pecasPorOS.get(os.id), faltaSet),
            _temLimp: temLimpeza.has(os.id),
            _temManut: temManutencao.has(os.id) || (pecasPorOS.get(os.id)?.length > 0),
          }
        : os
      ;(porEtapa[uni.id] = porEtapa[uni.id] || []).push(card)
    }
    const zonaCfg = ZONAS.find(z => z.id === filtros.zona)
    const etapasZonaSet = zonaCfg ? new Set(zonaCfg.etapas) : null
    return ETAPAS_TODOS
      .filter(e => !(e.adminOnly && !admin))
      .filter(e => !etapasZonaSet || etapasZonaSet.has(e.id))
      .map(e => {
        const cards = ordenarColuna(e.id, porEtapa[e.id] || [])
        return { ...e, cards, count: cards.length }
      })
  }, [osFiltradas, admin, filtros.zona, faltaSet, pecasPorOS, temLimpeza, temManutencao])

  const abasDisponiveis = useMemo(() => colunas.filter(c => c.count > 0), [colunas])

  useEffect(() => {
    if (abasDisponiveis.length === 0) return
    if (etapaAba && abasDisponiveis.some(a => a.id === etapaAba)) return
    setEtapaAba(abasDisponiveis[0].id)
  }, [abasDisponiveis, etapaAba])

  useEffect(() => {
    if (!etapaAba) return
    try { localStorage.setItem(ETAPA_STORAGE_KEY, etapaAba) } catch {}
  }, [etapaAba])

  // ─── Stats ───────────────────────────────────────────────────────────────
  const totalKanban = useMemo(() => colunas.reduce((s, c) => s + c.count, 0), [colunas])
  const totVencidas  = useMemo(() => osFiltradas.filter(o => calcStatusPrazo(o.prazo, o.etapa) === 'vencido').length, [osFiltradas])
  const totalAgPeca  = useMemo(() => osFiltradas.filter(o => !!o.aguardando_peca).length, [osFiltradas])

  // ─── Update + Mover ───────────────────────────────────────────────────────
  async function updateOS(numero, patch) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const prev = osList
    setOsList(arr => arr.map(o => o.numero === numero ? { ...o, ...patch } : o))
    const { dbPatch, skipped } = normalizePatchOS(patch)
    if (Object.keys(dbPatch).length === 0) { if (skipped.length) console.warn('[updateOS]', skipped); return }
    try {
      const { error } = await supabase.from('os').update(dbPatch).eq('id', os.id)
      if (error) throw error
    } catch (e) { setOsList(prev); notify('erro', 'Erro ao salvar — mudança revertida'); console.error(e) }
  }

  async function moverOS(numero, etapaAlvo) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const etapaUnif = ETAPAS_TODOS.find(e => e.id === etapaAlvo)
    const alvoReal = etapaUnif?.match?.[os.tipo] || etapaAlvo
    const r = podeMoverOS(os, alvoReal)
    if (!r.ok) { notify('erro', r.motivo); return }
    const etapaFinal = r.alvo || alvoReal
    const agora = new Date().toLocaleString('sv-SE', { timeZone: 'America/Cuiaba' }).slice(0, 16).replace('T', ' ')
    const prev = osList
    const novoHistorico = [...(os.historico || []), { etapa: etapaFinal, funcionario: user?.id, data: agora }]
    setOsList(arr => arr.map(o => o.numero === numero ? { ...o, etapa: etapaFinal, historico: novoHistorico } : o))
    if (osAberta?.numero === numero) setOsAberta(p => ({ ...p, etapa: etapaFinal, historico: novoHistorico }))
    try {
      const dbEtapa = uiEtapaToDb(os.tipo, etapaFinal)
      const patch = { etapa: dbEtapa }
      if (etapaFinal === 'concluido') patch.data_conclusao = new Date().toISOString()
      else if (os.etapa === 'concluido') patch.data_conclusao = null
      const { error } = await supabase.from('os').update(patch).eq('id', os.id)
      if (error) throw error
      await supabase.from('os_historico').insert({ os_id: os.id, etapa_de: uiEtapaToDb(os.tipo, os.etapa), etapa_para: dbEtapa, funcionario_id: user?.id })
    } catch { setOsList(prev); notify('erro', 'Erro ao mover OS — revertido') }
  }

  function toggleAgPeca(numero) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    updateOS(numero, { aguardando_peca: !os.aguardando_peca })
  }

  // ─── Scroll horizontal ────────────────────────────────────────────────────
  const scrollRef   = useRef(null)
  const colunaRefs  = useRef({})

  useEffect(() => {
    if (loading) return
    const el = colunaRefs.current[etapaAba]
    const root = scrollRef.current
    if (!el || !root) return
    root.scrollLeft = el.offsetLeft - 12
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  function onScrollColunas() {
    const root = scrollRef.current
    if (!root) return
    const centro = root.scrollLeft + root.clientWidth / 2
    let maisProxima = null, menorDist = Infinity
    for (const col of colunas) {
      if (col.count === 0) continue // colunas colapsadas não viram aba ativa
      const el = colunaRefs.current[col.id]
      if (!el) continue
      const dist = Math.abs(centro - (el.offsetLeft + el.offsetWidth / 2))
      if (dist < menorDist) { menorDist = dist; maisProxima = col.id }
    }
    if (maisProxima && maisProxima !== etapaAba) setEtapaAba(maisProxima)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: T.bg }}>

      {/* ── Header: filtros de zona + stats ── */}
      <div style={{ padding: '8px 12px 6px', background: T.bg, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <FiltrosMobile
          T={T} dark={dark}
          filtros={filtros} setFiltros={setFiltros}
          busca={busca} setBusca={setBusca}
          onNova={() => setModalNova(true)}
        />
        {/* Stats strip — mesmo padrão do desktop */}
        {!loading && (
          <div style={{ display: 'flex', gap: 10, marginTop: 5, alignItems: 'center' }}>
            <MiniStat v={totalKanban} label="ativas" color={T.textMuted} />
            {totVencidas > 0 && <MiniStat v={totVencidas} label="vencidas" color={vermelho} dot />}
            {totalAgPeca > 0 && <MiniStat v={totalAgPeca} label="ag. peça" color={amarelo} dot />}
            {busca.trim().length > 0 && (
              <span style={{ padding: '1px 6px', borderRadius: 3, background: azul + '22', color: azul, fontSize: 10, fontWeight: 700 }}>
                Busca ativa
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Kanban horizontal scroll-snap ── */}
      {loading ? (
        <div style={{ flex: 1, padding: '12px 12px 80px' }}>
          <SkeletonList T={T} dark={dark} />
        </div>
      ) : (
        <div ref={scrollRef} onScroll={onScrollColunas} className="idemaq-no-scrollbar"
          style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {colunas.map((col, idx) => {
            const c  = corEtapa(col.cor || 'blue', dark)
            const bg = bgEtapa(col.cor || 'blue', dark)
            // Cores idênticas ao KanbanColumn desktop
            const colBg     = dark ? 'rgba(255,255,255,0.04)' : '#f4f5f7'
            const colBorder = dark ? 'rgba(255,255,255,0.08)' : '#e4e5e9'

            // Coluna vazia → filete vertical (estilo Jira), não vira alvo de snap.
            if (col.count === 0) {
              return (
                <div key={col.id} ref={el => { if (el) colunaRefs.current[col.id] = el }}
                  style={{
                    flex: '0 0 auto', width: 46,
                    scrollSnapAlign: 'none',
                    display: 'flex', flexDirection: 'column',
                    padding: idx === 0 ? '10px 3px 0 12px' : '10px 3px 0',
                    minWidth: 0,
                  }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    flex: 1, minHeight: 0, background: colBg,
                    border: `1.5px solid ${colBorder}`, borderRadius: 6,
                    overflow: 'hidden', padding: '10px 0', gap: 8,
                  }}>
                    <span style={{
                      padding: '1px 6px', borderRadius: 10,
                      background: dark ? 'rgba(255,255,255,0.07)' : '#dfe1e6',
                      color: T.textDim, fontSize: 10.5, fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                    }}>0</span>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0, opacity: 0.4 }} />
                    <span style={{
                      writingMode: 'vertical-rl',
                      fontSize: 10.5, fontWeight: 700, color: T.textMuted,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      maxHeight: '100%',
                    }}>{col.label}</span>
                  </div>
                </div>
              )
            }

            return (
              <div key={col.id} ref={el => { if (el) colunaRefs.current[col.id] = el }}
                style={{
                  flex: viewMode === 'compact' ? '0 0 50%' : '0 0 88%',
                  scrollSnapAlign: viewMode === 'compact' ? 'start' : 'center',
                  display: 'flex', flexDirection: 'column',
                  padding: viewMode === 'compact'
                    ? '10px 4px 0 4px'
                    : (idx === 0 ? '10px 4px 0 12px' : '10px 4px 0'),
                  minWidth: 0,
                }}>

                {/* Coluna — idêntica ao KanbanColumn desktop */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: colBg, border: `1.5px solid ${colBorder}`, borderRadius: 6, overflow: 'hidden' }}>

                  {/* Header: dot quadrado + uppercase + badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px 7px', borderBottom: `1px solid ${colBorder}`, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0, opacity: col.count === 0 ? 0.35 : 1 }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {col.label}
                    </span>
                    {col.prazo24h && <i className="ti ti-clock-exclamation" style={{ fontSize: 10, color: amarelo, flexShrink: 0 }} aria-hidden="true" />}
                    {col.adminOnly && <i className="ti ti-lock" style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }} aria-hidden="true" />}
                    <span style={{ padding: '1px 6px', borderRadius: 10, background: col.count > 0 ? bg : (dark ? 'rgba(255,255,255,0.07)' : '#dfe1e6'), color: col.count > 0 ? c : T.textDim, fontSize: 10.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {col.count}
                    </span>
                  </div>

                  {/* Body: cards */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '7px 6px 80px', display: 'flex', flexDirection: 'column', gap: 6, touchAction: 'pan-x pan-y' }}>
                    {col.cards.length === 0 ? (
                      <div style={{ color: T.textMuted, fontSize: 11.5, textAlign: 'center', padding: '28px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <i className="ti ti-circle-dashed" style={{ fontSize: 20, opacity: 0.3, color: T.textDim }} aria-hidden="true" />
                        Sem OS nesta etapa
                      </div>
                    ) : col.cards.map(os => (
                      <OSCardMobile key={os.numero} T={T} dark={dark} os={os}
                        compact={viewMode === 'compact'} onClick={() => setOsAberta(os)} />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          <div aria-hidden="true" style={{ flex: viewMode === 'compact' ? '0 0 4px' : '0 0 6%' }} />
        </div>
      )}

      {/* FAB Roteiro do dia */}
      {!loading && (
        <button onClick={() => setNotasAbertas(v => !v)} aria-label="Roteiro do dia"
          style={{ position: 'absolute', right: 14, bottom: 124, width: 38, height: 38, borderRadius: 6, background: notasAbertas ? azul : (dark ? '#1e293b' : '#fff'), color: notasAbertas ? '#fff' : azul, border: `1.5px solid ${azul}`, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 50, WebkitTapHighlightColor: 'transparent' }}>
          <i className="ti ti-checklist" style={{ fontSize: 18 }} aria-hidden="true" />
        </button>
      )}

      {/* FAB compact/normal */}
      {!loading && (
        <button onClick={() => setViewMode(v => v === 'compact' ? 'normal' : 'compact')}
          aria-label={viewMode === 'compact' ? 'Expandir' : 'Compactar'}
          style={{ position: 'absolute', right: 14, bottom: 76, width: 38, height: 38, borderRadius: 6, background: azul, color: '#fff', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.25)', zIndex: 50, WebkitTapHighlightColor: 'transparent' }}>
          <i className={`ti ${viewMode === 'compact' ? 'ti-arrows-maximize' : 'ti-arrows-minimize'}`} style={{ fontSize: 18 }} aria-hidden="true" />
        </button>
      )}

      {/* Roteiro do dia */}
      {notasAbertas && <RoteiroDia T={T} dark={dark} user={user} onClose={() => setNotasAbertas(false)} osList={osList} pessoas={usuarios} onAbrirOS={(os) => { setNotasAbertas(false); setOsAberta(os) }} />}

      {/* OSDetalhe modal */}
      {osVigente && (
        <OSDetalhe key={`${osVigente.numero}-${osVigente.etapa}`}
          T={T} dark={dark} os={osVigente} user={user}
          osBase={osList} usuarios={usuarios} mobile
          onClose={() => setOsAberta(null)}
          onToggleAgPeca={() => toggleAgPeca(osVigente.numero)}
          onAbrirOS={numero => { const o = osList.find(x => x.numero === numero); if (o) setOsAberta(o) }}
          onMoverOS={moverOS} onUpdateOS={updateOS} onRefetchOS={refetch}
        />
      )}

      {/* Nova OS modal */}
      {modalNova && (
        <NovaOSMobile T={T} dark={dark}
          onClose={() => setModalNova(false)}
          tipoInicial="atendimento" notify={notify} onCriada={refetch}
        />
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function MiniStat({ v, label, color, dot }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, fontSize: 11 }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', alignSelf: 'center', flexShrink: 0 }} />}
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
      <span style={{ color, opacity: 0.65 }}>{label}</span>
    </span>
  )
}

function SkeletonList({ T, dark }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: 14, minHeight: 76, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,0.08)' }}>
          <div style={{ height: 10, width: 70, background: dark ? 'rgba(255,255,255,0.05)' : '#e4e5e9', borderRadius: 3 }} />
          <div style={{ height: 14, width: '70%', background: dark ? 'rgba(255,255,255,0.05)' : '#e4e5e9', borderRadius: 3 }} />
          <div style={{ height: 10, width: '50%', background: dark ? 'rgba(255,255,255,0.05)' : '#e4e5e9', borderRadius: 3 }} />
        </div>
      ))}
    </div>
  )
}
