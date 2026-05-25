// idemaq-src/pages/mobile/OSMobile.jsx
// Página mobile de OS — Lote 1 do mobile-noite.md.
// Substitui o re-export do _legacy. Simplificação consciente: SEM swipe
// horizontal, SEM 2 modos (Painel/Coluna), SEM bottom sheet. Lista vertical
// + filtros inline + busca. Cobre 90% dos casos sem 600 linhas de gesture.
//
// Movimento de etapa acontece dentro do OSDetalhe (botão Avançar/Voltar) —
// não tem drag-and-drop em mobile. moverOS e updateOS são versões enxutas
// da lógica do Kanban (reusam podeMoverOS + uiEtapaToDb pra ficar fiel).

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { supabase } from '../../supabase'
import { useOS, uiEtapaToDb } from '../../hooks/useOS'
import { useUsuarios } from '../../hooks/useUsuarios'
import { normalizePatchOS } from '../../utils/osPatch'
import {
  podeMoverOS, calcStatusPrazo, dentroMesCorrente, isAdmin,
} from '../../utils/osHelpers'
import { TIPOS_OS, ETAPAS_TODOS, ZONAS } from '../../utils/osData'
import { useToast } from '../../components/ui'
import FiltrosMobile from '../../components/mobile/FiltrosMobile'
import OSCardMobile from '../../components/mobile/OSCardMobile'
import OSDetalhe from '../../components/osDetalhe/OSDetalhe'
import NovaOSMobile from '../../components/os/NovaOSMobile'

// Cores das etapas — usadas pelo header de cada coluna kanban
const COR_ETAPA = {
  yellow: '#b8860b', red: '#c04242', blue: '#5B9BD5',
  blueLight: '#5B9BD5', neutro: '#6b7280', green: '#2e7d5e',
}
const BG_ETAPA = {
  yellow: 'rgba(255,217,102,.18)', red: 'rgba(255,107,107,.18)',
  blue: 'rgba(91,155,213,.18)', blueLight: 'rgba(91,155,213,.18)',
  neutro: 'rgba(107,114,128,.18)', green: 'rgba(46,125,94,.18)',
}

export default function OSMobile({ T, dark, user }) {
  const { osList, setOsList, loading, refetch } = useOS(false)
  const { usuarios } = useUsuarios()
  const notify = useToast()
  const admin = isAdmin(user)

  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState({
    zona: 'todos',
    tipos: new Set(['atendimento', 'fabricacao', 'venda']),
  })
  // Modo de visualização: 'normal' (1 coluna por vez) ou 'compact' (2 colunas
  // estreitas, igual o botão de "afastar" do Trello mobile). Persiste no LS.
  const VIEW_STORAGE_KEY = 'idemaq.osmobile.view'
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem(VIEW_STORAGE_KEY) === 'compact' ? 'compact' : 'normal' } catch { return 'normal' }
  })
  useEffect(() => {
    try { localStorage.setItem(VIEW_STORAGE_KEY, viewMode) } catch {}
  }, [viewMode])
  // Etapa selecionada nas abas. Sempre tem que existir uma (regra de UX).
  // Estado inicial:
  //  - lê do localStorage se houver entrada válida
  //  - senão começa null e o useEffect logo abaixo seta a primeira aba
  //    disponível assim que `abasDisponiveis` carrega.
  const ETAPA_STORAGE_KEY = 'idemaq.osmobile.etapaAba'
  const [etapaAba, setEtapaAba] = useState(() => {
    try { return localStorage.getItem(ETAPA_STORAGE_KEY) || null } catch { return null }
  })
  const [osAberta, setOsAberta] = useState(null)
  const [modalNova, setModalNova] = useState(false)

  // Reidratação síncrona da OS aberta a partir do osList. Quando moverOS faz
  // optimistic update, osList ganha referência nova com a etapa atualizada.
  // useMemo recomputa NO MESMO render — sem ciclo extra de effect que o React
  // pode adiar. Esse é o pattern do Kanban (linha 274). O setOsAberta inicial
  // serve só pra "lembrar" qual OS está aberta (pelo numero); a versão vigente
  // sempre sai do osList.
  const osVigente = useMemo(
    () => osAberta ? (osList.find(o => o.numero === osAberta.numero) || osAberta) : null,
    [osAberta, osList]
  )

  // ─── Filtragem ─────────────────────────────────────────────────────────────
  const osFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const buscando = q.length > 0
    const zonaCfg = ZONAS.find(z => z.id === filtros.zona)
    const etapasZona = zonaCfg ? new Set(zonaCfg.etapas) : null

    return (osList || []).filter(os => {
      if (os.deleted_at) return false
      if (!filtros.tipos.has(os.tipo)) return false
      // Esconder adminOnly de quem não é admin
      const etapaUni = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === os.etapa)
      if (etapaUni?.adminOnly && !admin) return false
      // Zona: filtra etapa unificada
      if (etapasZona && etapaUni && !etapasZona.has(etapaUni.id)) return false
      // Mês corrente em Concluído (busca escapa)
      if (!buscando && !dentroMesCorrente(os)) return false
      // Busca livre
      if (buscando) {
        const cliente = (os.cliente || '').toLowerCase()
        const eq = (os.equipamento || '').toLowerCase()
        const marca = (os.marca || '').toLowerCase()
        const modelo = (os.modelo || '').toLowerCase()
        const num = String(os.numero || '')
        if (!cliente.includes(q) && !eq.includes(q) && !marca.includes(q) && !modelo.includes(q) && !num.includes(q)) {
          return false
        }
      }
      return true
    })
  }, [osList, busca, filtros, admin])

  // ─── Colunas estilo Trello mobile ──────────────────────────────────────────
  // Cada etapa vira uma coluna com seus cards. Mostra todas as etapas visíveis
  // pro papel do usuário (admin vê concluído/recusado, funcionário não).
  // Quando uma zona está selecionada, exibe APENAS as colunas daquela zona.
  const colunas = useMemo(() => {
    // Agrupa OS por etapa unificada
    const porEtapa = {}
    for (const os of osFiltradas) {
      const uni = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === os.etapa)
      if (!uni) continue
      if (uni.adminOnly && !admin) continue
      ;(porEtapa[uni.id] = porEtapa[uni.id] || []).push(os)
    }
    // Etapas permitidas pela zona (se 'todos', mostra todas)
    const zonaCfg = ZONAS.find(z => z.id === filtros.zona)
    const etapasZonaSet = zonaCfg ? new Set(zonaCfg.etapas) : null

    return ETAPAS_TODOS
      .filter(e => !(e.adminOnly && !admin))
      .filter(e => !etapasZonaSet || etapasZonaSet.has(e.id))
      .map(e => ({ ...e, cards: porEtapa[e.id] || [], count: (porEtapa[e.id] || []).length }))
  }, [osFiltradas, admin, filtros.zona])

  // Compat com refs antigas (Swipe/persistência) — abasDisponiveis = colunas com >0
  const abasDisponiveis = useMemo(() => colunas.filter(c => c.count > 0), [colunas])

  // Garante que uma etapa sempre fica selecionada — regra de UX. Roda quando
  // abasDisponiveis muda (load inicial, troca de filtro/zona, novo dado via
  // Realtime). Mantém a salva no localStorage se ainda existir; senão cai pra
  // primeira aba disponível.
  useEffect(() => {
    if (abasDisponiveis.length === 0) return
    if (etapaAba && abasDisponiveis.some(a => a.id === etapaAba)) return
    setEtapaAba(abasDisponiveis[0].id)
  }, [abasDisponiveis, etapaAba])

  // Persiste a etapa escolhida pra próxima entrada na página.
  useEffect(() => {
    if (!etapaAba) return
    try { localStorage.setItem(ETAPA_STORAGE_KEY, etapaAba) } catch {}
  }, [etapaAba])

  // ─── Atualização genérica de campos (usada pelas ações do OSDetalhe) ───────
  // UI sempre recebe patch completo (optimistic). Persistência filtrada via
  // normalizePatchOS (whitelist em utils/osPatch.js) — campos sem coluna no banco
  // ficam só em memória até criarmos schema pra eles.
  async function updateOS(numero, patch) {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const prev = osList
    setOsList(arr => arr.map(o => o.numero === numero ? { ...o, ...patch } : o))
    const { dbPatch, skipped } = normalizePatchOS(patch)
    if (Object.keys(dbPatch).length === 0) {
      if (skipped.length) console.warn('[updateOS] sem colunas persistíveis, mantido só em memória:', skipped)
      return
    }
    try {
      const { error } = await supabase.from('os').update(dbPatch).eq('id', os.id)
      if (error) throw error
      if (skipped.length) console.warn('[updateOS] persistido', Object.keys(dbPatch), '— pendente schema:', skipped)
    } catch (e) {
      setOsList(prev)
      notify('erro', 'Erro ao salvar — mudança revertida')
      console.error('[updateOS] falha:', e)
    }
  }

  // ─── Mover OS de etapa (versão enxuta — reusa podeMoverOS) ────────────────
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
    // Optimistic — atualiza lista e também osAberta pra que osVigente (useMemo)
    // reflita a nova etapa imediatamente, antes do Realtime refetch sobrescrever.
    const novoHistorico = [...(os.historico || []), { etapa: etapaFinal, funcionario: user?.id, data: agora }]
    setOsList(arr => arr.map(o => o.numero === numero ? {
      ...o, etapa: etapaFinal, historico: novoHistorico,
    } : o))
    if (osAberta?.numero === numero) {
      setOsAberta(prev => ({ ...prev, etapa: etapaFinal, historico: novoHistorico }))
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

  // ─── Scroll horizontal nativo entre colunas (estilo Trello) ───────────────
  // Cada coluna ocupa ~88% da tela. CSS scroll-snap garante que para no centro
  // de uma coluna por vez. Refs pra (a) auto-scrollar pra etapa salva no mount
  // e (b) detectar qual coluna está visível pra persistir no localStorage.
  const scrollRef = useRef(null)
  const colunaRefs = useRef({})

  // Mount inicial: scroll horizontal pra coluna salva (etapaAba)
  useEffect(() => {
    if (loading) return
    const el = colunaRefs.current[etapaAba]
    const root = scrollRef.current
    if (!el || !root) return
    // sem animação no primeiro paint pra evitar flash
    root.scrollLeft = el.offsetLeft - 12
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // Atualiza etapaAba conforme o usuário rola horizontalmente — debounced
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
    }}>
      {/* Header fixo: filtros (busca e Nova OS ficam dentro do sheet "Mais") */}
      <div style={{
        padding: '6px 10px',
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

      {/* Kanban horizontal estilo Trello — scroll-snap entre colunas */}
      {loading ? (
        <div style={{ flex: 1, padding: '12px 14px 80px' }}>
          <SkeletonList T={T} />
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
            const corCol = COR_ETAPA[col.cor] || COR_ETAPA.neutro
            const bgCol = BG_ETAPA[col.cor] || BG_ETAPA.neutro
            return (
              <div
                key={col.id}
                ref={(el) => { if (el) colunaRefs.current[col.id] = el }}
                style={{
                  flex: viewMode === 'compact' ? '0 0 52%' : '0 0 88%',
                  scrollSnapAlign: viewMode === 'compact' ? 'start' : 'center',
                  display: 'flex', flexDirection: 'column',
                  padding: idx === 0 ? '12px 4px 0 14px' : '12px 4px 0',
                  minWidth: 0,
                }}
              >
                {/* Header da coluna */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px',
                  background: dark ? '#1a1d28' : '#f5f7fa',
                  borderRadius: '10px 10px 0 0',
                  borderBottom: `2px solid ${corCol}`,
                  flexShrink: 0,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: corCol, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: T.textPrimary,
                    flex: 1, minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{col.label}</span>
                  <span style={{
                    background: bgCol, color: corCol,
                    fontSize: 11, fontWeight: 800,
                    minWidth: 22, height: 20, borderRadius: 10,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 7px', fontVariantNumeric: 'tabular-nums',
                  }}>{col.count}</span>
                </div>

                {/* Cards da coluna - scroll vertical interno.
                    touchAction 'pan-x pan-y' permite que swipe horizontal
                    iniciado DENTRO da coluna passe pro container pai (que
                    rola horizontalmente entre colunas). */}
                <div style={{
                  flex: 1, minHeight: 0,
                  overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                  background: dark ? '#0f1118' : '#eef1f5',
                  borderRadius: '0 0 10px 10px',
                  padding: '10px 8px 80px',
                  display: 'flex', flexDirection: 'column', gap: 8,
                  touchAction: 'pan-x pan-y',
                }}>
                  {col.cards.length === 0 ? (
                    <div style={{
                      color: T.textMuted, fontSize: 12, fontStyle: 'italic',
                      textAlign: 'center', padding: '24px 8px',
                    }}>Sem OS nesta etapa</div>
                  ) : col.cards.map(os => (
                    <OSCardMobile key={os.numero} T={T} dark={dark} os={os}
                      compact={viewMode === 'compact'}
                      onClick={() => setOsAberta(os)} />
                  ))}
                </div>
              </div>
            )
          })}
          {/* Spacer final pra última coluna conseguir centralizar */}
          <div aria-hidden="true" style={{ flex: '0 0 6%' }} />
        </div>
      )}

      {/* Botão flutuante: alterna entre 1-coluna (normal) e 2-colunas (compact)
          — equivalente ao botão "afastar/aproximar" do Trello mobile. */}
      {!loading && (
        <button
          onClick={() => setViewMode(v => v === 'compact' ? 'normal' : 'compact')}
          aria-label={viewMode === 'compact' ? 'Expandir cards' : 'Compactar cards'}
          title={viewMode === 'compact' ? 'Expandir cards' : 'Compactar cards'}
          style={{
            position: 'absolute',
            right: 16, bottom: 80,
            width: 48, height: 48, borderRadius: 24,
            background: dark ? '#5B9BD5' : '#5B9BD5',
            color: '#fff', border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 50, fontFamily: 'inherit',
          }}>
          <i
            className={`ti ${viewMode === 'compact' ? 'ti-arrows-maximize' : 'ti-arrows-minimize'}`}
            style={{ fontSize: 22 }} aria-hidden="true" />
        </button>
      )}

      {/* OSDetalhe — usa `osVigente` (derivado via useMemo do osList).
          Toda mudança em osList que atinge a OS aberta vira nova referência
          de `osVigente` → OSDetalhe re-renderiza → useEffect interno troca aba. */}
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

      {/* Nova OS — versão mobile-first dedicada (21/05/2026) */}
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

// ─── Abas por etapa ───────────────────────────────────────────────────────
// Quando a aba ativa muda (por click OU swipe), a barra rola suavemente pra
// centralizar a ativa no meio da tela. Layout fica:
//   [anterior]  [ATIVA]  [próxima]   ← ativa sempre no centro
function AbasEtapa({ T, dark, abas, ativa, onSelect }) {
  const azul = dark ? '#5B9BD5' : '#5B9BD5'
  const corBadge = { yellow: '#b8860b', red: '#c04242', blue: '#5B9BD5', blueLight: '#5B9BD5', neutro: '#6b7280', green: '#2e7d5e' }
  const bgBadge  = { yellow: dark ? 'rgba(255,217,102,.18)' : '#fff8e1', red: dark ? 'rgba(255,107,107,.18)' : '#fff0f0', blue: dark ? 'rgba(91,155,213,.18)' : '#e8f0fb', blueLight: dark ? 'rgba(91,155,213,.18)' : '#e8f0fb', neutro: dark ? '#2a2d3a' : '#f0f2f5', green: dark ? 'rgba(46,125,94,.18)' : '#e8f8f0' }

  const trilhoRef = useRef(null)
  const abaRefs = useRef({})  // { [id]: HTMLButtonElement }

  // Carrossel mobile: 3 abas visíveis por vez. Cada aba ocupa 1/3 da largura
  // do trilho. Spacers laterais de 1/3 antes/depois deixam a primeira e a
  // última aba se centralizarem (com lado vazio quando nos extremos). Snap
  // mandatory + align center = a aba ativa fica sempre no MEIO do trilho.
  // Cada arrasto paginal exatamente 1 aba.
  useEffect(() => {
    const trilho = trilhoRef.current
    const ativoEl = abaRefs.current[ativa]
    if (!trilho || !ativoEl) return
    // Centraliza o botão ativo no centro do viewport do trilho.
    const trilhoW = trilho.clientWidth
    const alvoLeft = ativoEl.offsetLeft + (ativoEl.offsetWidth / 2) - (trilhoW / 2)
    trilho.scrollTo({ left: Math.max(0, alvoLeft), behavior: 'smooth' })
  }, [ativa, abas.length])

  return (
    <div style={{
      borderBottom: `1px solid ${T.border}`,
      flexShrink: 0,
    }}>
      <div
        ref={trilhoRef}
        className="idemaq-no-scrollbar"
        style={{
          display: 'flex', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          scrollSnapType: 'x mandatory',
        }}>
        {/* Spacer esquerdo: deixa a primeira aba centralizar com lado vazio */}
        <div aria-hidden="true" style={{ flex: '0 0 calc(100% / 3)' }} />

        {abas.map(aba => {
          const isAtiva = ativa === aba.id
          const cor = corBadge[aba.cor] || '#6b7280'
          const bg  = bgBadge[aba.cor]  || (dark ? '#2a2d3a' : '#f0f2f5')
          return (
            <button
              key={aba.id}
              ref={(el) => { if (el) abaRefs.current[aba.id] = el }}
              onClick={() => onSelect(aba.id)}
              style={{
                flex: '0 0 calc(100% / 3)',
                minWidth: 0,
                padding: '10px 6px',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${isAtiva ? azul : 'transparent'}`,
                color: isAtiva ? azul : T.textMuted,
                fontSize: 12.5, fontWeight: isAtiva ? 700 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'color .15s, border-color .15s',
                scrollSnapAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {aba.curto}
              </span>
              <span style={{
                background: isAtiva ? azul : bg,
                color: isAtiva ? '#fff' : cor,
                fontSize: 10, fontWeight: 800,
                minWidth: 18, height: 18, borderRadius: 9,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '0 5px', flexShrink: 0,
              }}>{aba.count}</span>
            </button>
          )
        })}

        {/* Spacer direito: deixa a última aba centralizar com lado vazio */}
        <div aria-hidden="true" style={{ flex: '0 0 calc(100% / 3)' }} />
      </div>
    </div>
  )
}

// ─── Skeleton + Empty ──────────────────────────────────────────────────────
function SkeletonList({ T }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12, padding: 14, minHeight: 76,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ height: 12, width: 80, background: T.cardAlt, borderRadius: 4 }} />
          <div style={{ height: 16, width: '70%', background: T.cardAlt, borderRadius: 4 }} />
          <div style={{ height: 11, width: '50%', background: T.cardAlt, borderRadius: 4 }} />
        </div>
      ))}
    </>
  )
}

function EmptyState({ T, busca }) {
  return (
    <div style={{
      padding: '40px 20px',
      textAlign: 'center',
      color: T.textMuted,
    }}>
      <i className="ti ti-clipboard-off" style={{
        fontSize: 42, color: T.textDim, marginBottom: 12, display: 'block',
      }} aria-hidden="true" />
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: T.textSecondary }}>
        {busca ? 'Nenhuma OS encontrada' : 'Nenhuma OS no filtro atual'}
      </div>
      <div style={{ fontSize: 12 }}>
        {busca
          ? `Sem resultados para "${busca}"`
          : 'Ajuste os filtros acima ou crie uma OS nova.'}
      </div>
    </div>
  )
}
