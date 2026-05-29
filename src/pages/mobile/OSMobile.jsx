// src/pages/mobile/OSMobile.jsx
// Pagina OS mobile — Atlassian Design (reescrito 28/05/2026).
//
// Kanban horizontal scroll-snap estilo Trello:
//   - 1 coluna por viewport (modo normal 88%) ou 2 (compact 50%)
//   - Cada coluna: header Atlassian (dot cor + label + count badge) +
//     scroll vertical de OSCardMobile cards
//   - Movimento entre etapas acontece dentro do OSDetalhe modal
//   - FAB primary embaixo-direita pra alternar compact/normal
//
// Estado persistido em localStorage:
//   - idemaq.osmobile.view (compact/normal)
//   - idemaq.osmobile.etapaAba (etapa visivel)
//
// Logica preservada: useOS + uiEtapaToDb + normalizePatchOS, podeMoverOS,
// optimistic update + rollback em erro, hidratacao da OS aberta via useMemo
// (referencia sempre vinda do osList atualizado).

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useOS, uiEtapaToDb } from '../../hooks/useOS'
import { useUsuarios } from '../../hooks/useUsuarios'
import { normalizePatchOS } from '../../utils/osPatch'
import {
  podeMoverOS, calcStatusPrazo, dentroMesCorrente, isAdmin,
} from '../../utils/osHelpers'
import { ETAPAS_TODOS, ZONAS } from '../../utils/osData'
import { corEtapa } from '../../utils/colors'
import { useToast } from '../../components/ui'
import FiltrosMobile from '../../components/mobile/FiltrosMobile'
import OSCardMobile from '../../components/mobile/OSCardMobile'
import OSDetalhe from '../../components/osDetalhe/OSDetalhe'
import NovaOSMobile from '../../components/os/NovaOSMobile'

const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const ATL_RADIUS = 4

export default function OSMobile({ T, dark, user }) {
  const { osList, setOsList, loading, refetch } = useOS(false)
  const { usuarios } = useUsuarios()
  const notify = useToast()
  const admin = isAdmin(user)

  const azul = corEtapa('blue', dark)

  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState({
    zona: 'todos',
    tipos: new Set(['atendimento', 'fabricacao', 'venda']),
  })

  const VIEW_STORAGE_KEY = 'idemaq.osmobile.view'
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(VIEW_STORAGE_KEY) === 'compact' ? 'compact' : 'normal' }
    catch { return 'normal' }
  })
  useEffect(() => {
    try { localStorage.setItem(VIEW_STORAGE_KEY, viewMode) } catch {}
  }, [viewMode])

  const ETAPA_STORAGE_KEY = 'idemaq.osmobile.etapaAba'
  const [etapaAba, setEtapaAba] = useState(() => {
    try { return localStorage.getItem(ETAPA_STORAGE_KEY) || null } catch { return null }
  })
  const [osAberta, setOsAberta] = useState(null)
  const [modalNova, setModalNova] = useState(false)

  // Reidratacao sincrona via useMemo — referencia sempre do osList atualizado
  const osVigente = useMemo(
    () => osAberta ? (osList.find(o => o.numero === osAberta.numero) || osAberta) : null,
    [osAberta, osList]
  )

  // ─── Filtragem ─────────────────────────────────────────────────────────
  const osFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const buscando = q.length > 0
    const zonaCfg = ZONAS.find(z => z.id === filtros.zona)
    const etapasZona = zonaCfg ? new Set(zonaCfg.etapas) : null

    return (osList || []).filter(os => {
      if (os.deleted_at) return false
      if (!filtros.tipos.has(os.tipo)) return false
      const etapaUni = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === os.etapa)
      if (etapaUni?.adminOnly && !admin) return false
      if (etapasZona && etapaUni && !etapasZona.has(etapaUni.id)) return false
      if (!buscando && !dentroMesCorrente(os)) return false
      if (buscando) {
        const cliente = (os.cliente || '').toLowerCase()
        const eq = (os.equipamento || '').toLowerCase()
        const marca = (os.marca || '').toLowerCase()
        const modelo = (os.modelo || '').toLowerCase()
        const num = String(os.numero || '')
        if (!cliente.includes(q) && !eq.includes(q) && !marca.includes(q)
            && !modelo.includes(q) && !num.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [osList, busca, filtros, admin])

  // ─── Colunas estilo Trello ─────────────────────────────────────────────
  const colunas = useMemo(() => {
    const porEtapa = {}
    for (const os of osFiltradas) {
      const uni = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === os.etapa)
      if (!uni) continue
      if (uni.adminOnly && !admin) continue
      ;(porEtapa[uni.id] = porEtapa[uni.id] || []).push(os)
    }
    const zonaCfg = ZONAS.find(z => z.id === filtros.zona)
    const etapasZonaSet = zonaCfg ? new Set(zonaCfg.etapas) : null

    return ETAPAS_TODOS
      .filter(e => !(e.adminOnly && !admin))
      .filter(e => !etapasZonaSet || etapasZonaSet.has(e.id))
      .map(e => ({
        ...e, cards: porEtapa[e.id] || [], count: (porEtapa[e.id] || []).length,
      }))
  }, [osFiltradas, admin, filtros.zona])

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

  // ─── Update + Mover ────────────────────────────────────────────────────
  async function updateOS(numero, patch) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const prev = osList
    setOsList(arr => arr.map(o => o.numero === numero ? { ...o, ...patch } : o))
    const { dbPatch, skipped } = normalizePatchOS(patch)
    if (Object.keys(dbPatch).length === 0) {
      if (skipped.length) console.warn('[updateOS] sem colunas persistiveis:', skipped)
      return
    }
    try {
      const { error } = await supabase.from('os').update(dbPatch).eq('id', os.id)
      if (error) throw error
    } catch (e) {
      setOsList(prev)
      notify('erro', 'Erro ao salvar — mudança revertida')
      console.error('[updateOS] falha:', e)
    }
  }

  async function moverOS(numero, etapaAlvo) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const etapaUnif = ETAPAS_TODOS.find(e => e.id === etapaAlvo)
    const alvoReal = etapaUnif?.match?.[os.tipo] || etapaAlvo
    const r = podeMoverOS(os, alvoReal)
    if (!r.ok) { notify('erro', r.motivo); return }
    const etapaFinal = r.alvo || alvoReal
    const agora = new Date()
      .toLocaleString('sv-SE', { timeZone: 'America/Cuiaba' })
      .slice(0, 16).replace('T', ' ')
    const prev = osList
    const novoHistorico = [
      ...(os.historico || []),
      { etapa: etapaFinal, funcionario: user?.id, data: agora },
    ]
    setOsList(arr => arr.map(o => o.numero === numero
      ? { ...o, etapa: etapaFinal, historico: novoHistorico }
      : o))
    if (osAberta?.numero === numero) {
      setOsAberta(p => ({ ...p, etapa: etapaFinal, historico: novoHistorico }))
    }
    try {
      const dbEtapa = uiEtapaToDb(os.tipo, etapaFinal)
      const patch = { etapa: dbEtapa }
      if (etapaFinal === 'concluido') patch.data_conclusao = new Date().toISOString()
      else if (os.etapa === 'concluido') patch.data_conclusao = null
      const { error } = await supabase.from('os').update(patch).eq('id', os.id)
      if (error) throw error
      await supabase.from('os_historico').insert({
        os_id: os.id,
        etapa_de: uiEtapaToDb(os.tipo, os.etapa),
        etapa_para: dbEtapa,
        funcionario_id: user?.id,
      })
    } catch {
      setOsList(prev)
      notify('erro', 'Erro ao mover OS — mudança revertida')
    }
  }

  function toggleAgPeca(numero) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    updateOS(numero, { aguardando_peca: !os.aguardando_peca })
  }

  // ─── Scroll horizontal entre colunas ───────────────────────────────────
  const scrollRef = useRef(null)
  const colunaRefs = useRef({})

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
    let maisProxima = null
    let menorDist = Infinity
    for (const col of colunas) {
      const el = colunaRefs.current[col.id]
      if (!el) continue
      const centroCol = el.offsetLeft + el.offsetWidth / 2
      const dist = Math.abs(centro - centroCol)
      if (dist < menorDist) { menorDist = dist; maisProxima = col.id }
    }
    if (maisProxima && maisProxima !== etapaAba) setEtapaAba(maisProxima)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      overflow: 'hidden', background: T.bg,
      fontFamily: ATL_FONT,
    }}>
      {/* Header com filtros */}
      <div style={{
        padding: '8px 12px',
        background: T.bg,
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <FiltrosMobile
          T={T} dark={dark}
          filtros={filtros} setFiltros={setFiltros}
          busca={busca} setBusca={setBusca}
          onNova={() => setModalNova(true)}
        />
      </div>

      {/* Kanban horizontal */}
      {loading ? (
        <div style={{ flex: 1, padding: '12px 14px 80px' }}>
          <SkeletonList T={T} dark={dark} />
        </div>
      ) : (
        <div
          ref={scrollRef}
          onScroll={onScrollColunas}
          className="idemaq-no-scrollbar"
          style={{
            flex: 1, minHeight: 0,
            display: 'flex',
            overflowX: 'auto', overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {colunas.map((col, idx) => {
            const corCol = corEtapa(col.cor || 'blue', dark)
            return (
              <div
                key={col.id}
                ref={(el) => { if (el) colunaRefs.current[col.id] = el }}
                style={{
                  flex: viewMode === 'compact' ? '0 0 50%' : '0 0 88%',
                  scrollSnapAlign: viewMode === 'compact' ? 'start' : 'center',
                  display: 'flex', flexDirection: 'column',
                  padding: viewMode === 'compact'
                    ? '12px 4px 0 4px'
                    : (idx === 0 ? '12px 4px 0 14px' : '12px 4px 0'),
                  minWidth: 0,
                }}
              >
                {/* Header da coluna Atlassian */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px',
                  background: dark ? 'rgba(255,255,255,0.025)' : '#FAFBFC',
                  border: `1px solid ${T.border}`,
                  borderBottom: 'none',
                  borderRadius: `${ATL_RADIUS}px ${ATL_RADIUS}px 0 0`,
                  flexShrink: 0,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: corCol, flexShrink: 0,
                    boxShadow: col.count > 0 ? `0 0 0 3px ${corCol}22` : 'none',
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: T.textPrimary,
                    flex: 1, minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    letterSpacing: '-0.005em',
                  }}>{col.label}</span>
                  <span style={{
                    background: col.count > 0 ? corCol + '22' : (dark ? 'rgba(255,255,255,0.07)' : '#DFE1E6'),
                    color: col.count > 0 ? corCol : T.textMuted,
                    fontSize: 11, fontWeight: 700,
                    minWidth: 22, height: 20, borderRadius: 99,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 7px',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.005em',
                  }}>{col.count}</span>
                </div>

                {/* Cards da coluna */}
                <div style={{
                  flex: 1, minHeight: 0,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  background: dark ? 'rgba(0,0,0,0.18)' : '#F4F5F7',
                  border: `1px solid ${T.border}`,
                  borderTop: `2px solid ${corCol}`,
                  borderRadius: `0 0 ${ATL_RADIUS}px ${ATL_RADIUS}px`,
                  padding: '10px 8px 80px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  touchAction: 'pan-x pan-y',
                }}>
                  {col.cards.length === 0 ? (
                    <div style={{
                      color: T.textMuted, fontSize: 12, fontStyle: 'italic',
                      textAlign: 'center', padding: '24px 8px',
                      letterSpacing: '-0.005em',
                    }}>Sem OS nesta etapa</div>
                  ) : col.cards.map(os => (
                    <OSCardMobile key={os.numero}
                      T={T} dark={dark} os={os}
                      compact={viewMode === 'compact'}
                      onClick={() => setOsAberta(os)} />
                  ))}
                </div>
              </div>
            )
          })}
          <div aria-hidden="true" style={{
            flex: viewMode === 'compact' ? '0 0 4px' : '0 0 6%',
          }} />
        </div>
      )}

      {/* FAB toggle compact/normal */}
      {!loading && (
        <button
          onClick={() => setViewMode(v => v === 'compact' ? 'normal' : 'compact')}
          aria-label={viewMode === 'compact' ? 'Expandir cards' : 'Compactar cards'}
          title={viewMode === 'compact' ? 'Expandir cards' : 'Compactar cards'}
          style={{
            position: 'absolute',
            right: 16, bottom: 80,
            width: 44, height: 44, borderRadius: ATL_RADIUS,
            background: azul, color: '#fff',
            border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(9,30,66,0.3)',
            zIndex: 50, fontFamily: ATL_FONT,
            WebkitTapHighlightColor: 'transparent',
          }}>
          <i className={`ti ${viewMode === 'compact' ? 'ti-arrows-maximize' : 'ti-arrows-minimize'}`}
             style={{ fontSize: 20 }} aria-hidden="true" />
        </button>
      )}

      {/* OSDetalhe modal */}
      {osVigente && (
        <OSDetalhe
          key={`${osVigente.numero}-${osVigente.etapa}`}
          T={T} dark={dark}
          os={osVigente} user={user}
          osBase={osList} usuarios={usuarios}
          mobile
          onClose={() => setOsAberta(null)}
          onToggleAgPeca={() => toggleAgPeca(osVigente.numero)}
          onAbrirOS={(numero) => {
            const o = osList.find(x => x.numero === numero)
            if (o) setOsAberta(o)
          }}
          onMoverOS={moverOS}
          onUpdateOS={updateOS}
          onRefetchOS={refetch}
        />
      )}

      {/* Nova OS modal */}
      {modalNova && (
        <NovaOSMobile
          T={T} dark={dark}
          onClose={() => setModalNova(false)}
          tipoInicial="atendimento"
          notify={notify}
          onCriada={refetch}
        />
      )}
    </div>
  )
}

// ─── Skeleton Atlassian ──────────────────────────────────────────────────
function SkeletonList({ T, dark }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: ATL_RADIUS,
          padding: 14, minHeight: 76,
          display: 'flex', flexDirection: 'column', gap: 8,
          boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
        }}>
          <div style={{
            height: 11, width: 70,
            background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
            borderRadius: 3,
          }} />
          <div style={{
            height: 14, width: '70%',
            background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
            borderRadius: 3,
          }} />
          <div style={{
            height: 10, width: '50%',
            background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
            borderRadius: 3,
          }} />
        </div>
      ))}
    </div>
  )
}
