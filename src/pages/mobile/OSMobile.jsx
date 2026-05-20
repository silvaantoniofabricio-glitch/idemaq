// idemaq-src/pages/mobile/OSMobile.jsx
// Página mobile de OS — Lote 1 do mobile-noite.md.
// Substitui o re-export do _legacy. Simplificação consciente: SEM swipe
// horizontal, SEM 2 modos (Painel/Coluna), SEM bottom sheet. Lista vertical
// + filtros inline + busca. Cobre 90% dos casos sem 600 linhas de gesture.
//
// Movimento de etapa acontece dentro do OSDetalhe (botão Avançar/Voltar) —
// não tem drag-and-drop em mobile. moverOS e updateOS são versões enxutas
// da lógica do Kanban (reusam podeMoverOS + uiEtapaToDb pra ficar fiel).

import React, { useState, useMemo } from 'react'
import { supabase } from '../../supabase'
import { useOS, uiEtapaToDb } from '../../hooks/useOS'
import { useUsuarios } from '../../hooks/useUsuarios'
import { useRegisterRouteRefresh } from '../../contexts/RefreshContext'
import { normalizePatchOS } from '../../utils/osPatch'
import {
  podeMoverOS, calcStatusPrazo, dentroMesCorrente, isAdmin,
} from '../../utils/osHelpers'
import { TIPOS_OS, ETAPAS_TODOS, ZONAS } from '../../utils/osData'
import { useToast } from '../../components/ui'
import FiltrosMobile from '../../components/mobile/FiltrosMobile'
import OSCardMobile from '../../components/mobile/OSCardMobile'
import OSDetalhe from '../../components/osDetalhe/OSDetalhe'

// Mantém o named export PullToRefresh — App.jsx ainda importa daqui.
// Por enquanto re-exporta do legacy; refatoração própria fica pra próxima
// rodada mobile (ver logs/mobile-bloqueios.md).
export { PullToRefresh } from '../../_legacy/mobileComponents'

export default function OSMobile({ T, dark, user }) {
  const { osList, setOsList, loading, refetch } = useOS(false)
  const { usuarios } = useUsuarios()
  const notify = useToast()
  const admin = isAdmin(user)
  // Liga o refetch ao PullToRefresh global (App.jsx). Função estável vinda do hook.
  useRegisterRouteRefresh(refetch)

  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState({
    zona: 'todos',
    tipos: new Set(['atendimento', 'fabricacao', 'venda']),
  })
  const [osAberta, setOsAberta] = useState(null)

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
    // Optimistic
    setOsList(arr => arr.map(o => o.numero === numero ? {
      ...o, etapa: etapaFinal,
      historico: [...(o.historico || []), { etapa: etapaFinal, funcionario: user?.id, data: agora }],
    } : o))
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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      overflow: 'hidden', background: T.bg,
    }}>
      {/* Header fixo: busca + filtros */}
      <div style={{
        padding: '12px 14px 10px',
        background: T.bg,
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', gap: 10,
        flexShrink: 0,
      }}>
        {/* Busca */}
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            fontSize: 16, color: T.textDim,
          }} aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar OS, cliente, marca…"
            style={{
              width: '100%', padding: '11px 12px 11px 38px',
              borderRadius: 10, border: `1px solid ${T.border}`,
              background: T.card, color: T.textPrimary,
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit', minHeight: 44,
            }}
          />
        </div>
        <FiltrosMobile T={T} dark={dark} filtros={filtros} setFiltros={setFiltros} />
      </div>

      {/* Lista scrollable */}
      <div style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: '12px 14px 80px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {loading && (
          <SkeletonList T={T} />
        )}

        {!loading && osFiltradas.length === 0 && (
          <EmptyState T={T} busca={busca} />
        )}

        {!loading && osFiltradas.length > 0 && (
          <>
            <div style={{
              fontSize: 11, color: T.textMuted, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '.3px',
              paddingLeft: 2,
            }}>
              {osFiltradas.length} {osFiltradas.length === 1 ? 'OS' : 'OS'} encontrad{osFiltradas.length === 1 ? 'a' : 'as'}
            </div>
            {osFiltradas.map(os => (
              <OSCardMobile key={os.numero} T={T} dark={dark} os={os}
                onClick={() => setOsAberta(os)} />
            ))}
          </>
        )}
      </div>

      {/* OSDetalhe (mesmo do desktop, com mobile=true → bottom-sheet) */}
      {osAberta && (
        <OSDetalhe
          T={T} dark={dark}
          os={osAberta} user={user}
          osBase={osList} usuarios={usuarios}
          mobile
          onClose={() => setOsAberta(null)}
          onToggleAgPeca={() => toggleAgPeca(osAberta.numero)}
          onAbrirOS={(numero) => {
            const o = osList.find(x => x.numero === numero)
            if (o) setOsAberta(o)
          }}
          onMoverOS={moverOS}
          onUpdateOS={updateOS}
          onRefetchOS={refetch}
        />
      )}
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
