// idemaq-src/pages/Logistica.jsx
// Reconstruída do zero (22/06/2026) — padrão Atlassian idêntico ao Kanban.jsx.
// Layout: flex-column + header sticky (borderBottom) + etapa-tabs + agenda-chips + content scroll.
// Linha 1 header: icon-box 32px · h1 · stats row | icon-btn + primary-btn
// Linha 2 header: etapa tabs underline (multi-select) · divider · agenda chips · divider
// Content: grid mapa (1.4fr) + coluna direita (rotas + agenda do dia) (1fr)

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useIsMobile } from '../theme'
import { corEtapa } from '../utils/colors'
import LogisticaMobile, {
  NOMES_SLOT, LETRA_POR_SLOT,
  ETAPAS_DEFAULT_LOGISTICA, tipoUiPorEtapa,
  CardFlutuanteOS, RotaAccordion, DiagnosticoMapa,
  filtrarPorAgenda,
} from './LogisticaMobile'
import { useToast } from '../components/ui'
import { useRotas } from '../hooks/useRotas'
import { useOSLogistica, FILTROS_ETAPA_LOGISTICA } from '../hooks/useOSLogistica'
import { useGeocodeEnderecos } from '../hooks/useGeocodeEnderecos'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import NovaRotaModal from '../components/logistica/NovaRotaModal'
import RotaDetalheModal from '../components/logistica/RotaDetalheModal'
import MapaLogistica from '../components/logistica/MapaLogistica'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

const HOJE = new Date().toISOString().slice(0, 10)

// Cor de chip por etapa na Agenda do Dia
function corChipEtapa(etapaDb) {
  if (etapaDb === 'agendamento')            return { bg: '#1565C0', text: '#fff' }
  if (etapaDb === 'entrega')                return { bg: '#2E7D32', text: '#fff' }
  if (etapaDb === 'pagamento')              return { bg: '#E65100', text: '#fff' }
  if (etapaDb === 'teste_final')            return { bg: '#558B2F', text: '#fff' }
  if (etapaDb === 'aguardando_agendamento') return { bg: '#546E7A', text: '#fff' }
  return { bg: '#546E7A', text: '#fff' }
}

function horaLocal(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Cuiaba', hour: '2-digit', minute: '2-digit',
    })
  } catch { return null }
}

function dataLocalHoje() {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Cuiaba', year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/').reverse().join('-')
}

function rotaCompletaUrl(enderecos) {
  return `https://www.google.com/maps/dir/${enderecos.map(e => encodeURIComponent(e)).join('/')}`
}

export default function Logistica({ T, dark }) {
  const isMobile = useIsMobile()
  if (isMobile) return <LogisticaMobile T={T} dark={dark} />
  return <LogisticaDesktop T={T} dark={dark} />
}

function LogisticaDesktop({ T, dark }) {
  const notify  = useToast()
  const azul    = corEtapa('blue', dark)
  const azulBg  = dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb'
  const amarelo = corEtapa('yellow', dark)

  // ─── Hooks de dados ──────────────────────────────────────────────────────
  const {
    rotas, loading, error, tabelaAusente,
    criar: criarRota,
    atualizar: atualizarRota,
    excluir: excluirRota,
    concluirParada: concluirParadaHook,
  } = useRotas()

  // ─── Estado ──────────────────────────────────────────────────────────────
  const [etapasAtivas, setEtapasAtivas] = useState(ETAPAS_DEFAULT_LOGISTICA)
  const [filtroAgenda, setFiltroAgenda] = useState('hoje')
  const [rotaExpandida, setRotaExpandida] = useState('A')
  const [osPopup, setOsPopup] = useState(null)
  const [novaRotaAberta, setNovaRotaAberta] = useState(false)
  const [rotaDetalhe, setRotaDetalhe] = useState(null)
  const [criandoRotasFalhou, setCriandoRotasFalhou] = useState(false)
  const criandoRotasRef = useRef(false)

  const dataAtiva = HOJE
  const { abrirOSPorId, modalProps: osDetalheProps } = useOSDetalheModal({ notify })

  const incluirPagamento = etapasAtivas.has('pagamento')
  const { osList } = useOSLogistica({ incluirPagamento })

  const osFiltradas = useMemo(() => {
    const porEtapa = osList.filter(o => etapasAtivas.has(o.etapa_db))
    return filtrarPorAgenda(porEtapa, filtroAgenda)
  }, [osList, etapasAtivas, filtroAgenda])

  const enderecos = useMemo(
    () => osFiltradas.map(o => o.endereco).filter(Boolean),
    [osFiltradas]
  )
  const coordsPorEndereco = useGeocodeEnderecos(enderecos)

  // Slots A/B/C da data ativa
  const slotsRotas = useMemo(() => {
    if (!dataAtiva) return NOMES_SLOT.map(nome => ({ nome, rota: null }))
    return NOMES_SLOT.map(nome => {
      const candidatas = rotas
        .filter(r => r.data === dataAtiva && r.nome === nome)
        .sort((a, b) => {
          const na = (a.paradas?.length || 0)
          const nb = (b.paradas?.length || 0)
          if (na !== nb) return nb - na
          return (a.criado_em || '').localeCompare(b.criado_em || '')
        })
      return { nome, rota: candidatas[0] || null }
    })
  }, [rotas, dataAtiva])

  // Auto-cria Rota A/B/C vazias na 1ª vez que o dia abre
  useEffect(() => {
    if (!dataAtiva || tabelaAusente || criandoRotasRef.current || criandoRotasFalhou) return
    const faltam = slotsRotas.filter(s => !s.rota).map(s => s.nome)
    if (faltam.length === 0) return
    criandoRotasRef.current = true
    ;(async () => {
      try {
        for (const nome of faltam) {
          const res = await criarRota({
            data: dataAtiva, nome, paradas: [],
            status: 'planejada', motorista_id: null,
          })
          if (res?.error) {
            const msg = (res.error.message || '').toLowerCase()
            if (msg.includes('nome') && (msg.includes('column') || msg.includes('does not exist'))) {
              setCriandoRotasFalhou(true)
              notify('erro', 'Coluna `nome` ausente — rode sql/17-rota-nome.sql')
              break
            }
            if (msg.includes('duplicate') || msg.includes('unique') || res.error.code === '23505') {
              setCriandoRotasFalhou(true)
              notify('erro', `Constraint antigo bloqueando ${nome} — rode sql/18-rota-constraint-fix.sql`)
              break
            }
            setCriandoRotasFalhou(true)
            notify('erro', `Falha ao criar ${nome}: ${res.error.message}`)
            break
          }
        }
      } finally {
        criandoRotasRef.current = false
      }
    })()
  }, [dataAtiva, slotsRotas, tabelaAusente, criandoRotasFalhou, criarRota, notify])

  // Pinos do mapa
  const osIdsEmRota = useMemo(() => {
    const ids = new Set()
    for (const s of slotsRotas) {
      for (const p of (s.rota?.paradas || [])) {
        if (p.os_id) ids.add(p.os_id)
      }
    }
    return ids
  }, [slotsRotas])

  const pinosDoMapa = useMemo(() => {
    const lista = []
    for (const s of slotsRotas) {
      if (!s.rota) continue
      const letra = LETRA_POR_SLOT[s.nome]
      const paradas = s.rota.paradas || []
      paradas.forEach((p, idx) => {
        if (p.lat == null || p.lng == null) return
        lista.push({
          lat: Number(p.lat), lng: Number(p.lng),
          tipo: p.tipo,
          ordem: `${letra}${idx + 1}`,
          label: `${letra}${idx + 1} · ${p.cliente_nome || 'Sem cliente'}`,
          onClick: () => setRotaDetalhe(s.rota),
        })
      })
    }
    for (const os of osFiltradas) {
      if (osIdsEmRota.has(os.id)) continue
      const c = os.endereco ? coordsPorEndereco[os.endereco] : null
      if (!c) continue
      lista.push({
        lat: c.lat, lng: c.lng,
        tipo: tipoUiPorEtapa(os.etapa_db),
        tracejado: true,
        agendamento: !!os.data_agendamento,
        ordem: String(os.numero).slice(-2),
        label: `OS #${os.numero} · ${os.cliente_nome} · ${os.etapa_label}`,
        onClick: () => setOsPopup({ ...os, lat: c.lat, lng: c.lng }),
      })
    }
    return lista
  }, [slotsRotas, osFiltradas, coordsPorEndereco, osIdsEmRota])

  const diagnostico = useMemo(() => {
    let comCoord = 0, semEndereco = 0, geocodificando = 0
    for (const os of osFiltradas) {
      if (osIdsEmRota.has(os.id)) continue
      if (!os.endereco) { semEndereco++; continue }
      if (coordsPorEndereco[os.endereco]) comCoord++
      else geocodificando++
    }
    return { comCoord, semEndereco, geocodificando }
  }, [osFiltradas, coordsPorEndereco, osIdsEmRota])

  // Stats para o header
  const rotasAtivas  = slotsRotas.filter(s => (s.rota?.paradas?.length || 0) > 0).length
  const totalSemRota = osFiltradas.filter(o => !osIdsEmRota.has(o.id)).length

  // Contagem por etapa (do osList completo, não filtrado por agenda)
  const countEtapa = useMemo(() => {
    const m = {}
    for (const f of FILTROS_ETAPA_LOGISTICA) {
      m[f.id] = osList.filter(o => o.etapa_db === f.id).length
    }
    return m
  }, [osList])

  // ─── Actions ─────────────────────────────────────────────────────────────
  function toggleEtapa(id) {
    setEtapasAtivas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function adicionarOSemRota(os, letra) {
    const slot = slotsRotas.find(s => LETRA_POR_SLOT[s.nome] === letra)
    if (!slot) { notify('erro', `Rota ${letra} não disponível`); return }
    if (!slot.rota) {
      notify('erro', criandoRotasFalhou
        ? 'Rode sql/19-rota-duplicatas-cleanup.sql pra ativar as rotas A/B/C'
        : `Rota ${letra} ainda sendo criada…`)
      return
    }
    const novaParada = {
      id: crypto.randomUUID(),
      ordem: (slot.rota.paradas || []).length + 1,
      tipo: tipoUiPorEtapa(os.etapa_db),
      os_id: os.id, os_num: os.numero,
      cliente_nome: os.cliente_nome,
      cliente_fone: os.cliente_telefone || null,
      endereco: os.endereco || null,
      lat: os.lat || null, lng: os.lng || null,
      horario_previsto: null, horario_chegada: null,
      status: 'pendente', foto_url: null, observacoes: null,
    }
    const novasParadas = [...(slot.rota.paradas || []), novaParada]
    const { error: err } = await atualizarRota(slot.rota.id, { paradas: novasParadas })
    if (err) { notify('erro', err.message || `Falha ao adicionar a Rota ${letra}`); return }
    notify('ok', `Adicionada a Rota ${letra}`)
    setRotaExpandida(letra)
    setOsPopup(null)
  }

  async function removerParada(slotRota, paradaId) {
    const novasParadas = (slotRota.paradas || []).filter(p => p.id !== paradaId)
    const { error: err } = await atualizarRota(slotRota.id, { paradas: novasParadas })
    if (err) notify('erro', err.message || 'Falha ao remover')
    else notify('ok', 'Parada removida')
  }

  async function adicionarParadaAvulsa(slotRota, nome, endereco) {
    if (!nome.trim()) return
    const novaParada = {
      id: crypto.randomUUID(),
      ordem: (slotRota.paradas || []).length + 1,
      tipo: 'outros', os_id: null, os_num: null,
      cliente_nome: nome.trim(), cliente_fone: null,
      endereco: endereco.trim() || null, lat: null, lng: null,
      horario_previsto: null, horario_chegada: null,
      status: 'pendente', foto_url: null, observacoes: null,
    }
    const novasParadas = [...(slotRota.paradas || []), novaParada]
    const { error: err } = await atualizarRota(slotRota.id, { paradas: novasParadas })
    if (err) notify('erro', err.message || 'Falha ao adicionar')
    else notify('ok', 'Parada avulsa adicionada')
  }

  function abrirRotaCompletaNoMaps() {
    const ends = slotsRotas
      .flatMap(s => (s.rota?.paradas || []))
      .filter(p => p.status !== 'concluida' && p.endereco)
      .map(p => p.endereco)
    if (ends.length === 0) { notify('info', 'Nenhuma parada pendente pra mapear'); return }
    window.open(rotaCompletaUrl(ends), '_blank', 'noopener,noreferrer')
  }

  // ─── Loading / error ─────────────────────────────────────────────────────
  if (loading || tabelaAusente || error) {
    return (
      <LogisticaEstado T={T} dark={dark} azul={azul} azulBg={azulBg}
        icon={loading ? 'ti-loader-2' : tabelaAusente ? 'ti-database-off' : 'ti-alert-triangle'}
        title={loading ? 'Carregando rotas…' : tabelaAusente
          ? 'Tabela `rota` ainda não criada'
          : 'Erro ao carregar'}
        desc={loading ? null : tabelaAusente
          ? 'Aplique sql/06-rota.sql no SQL Editor do Supabase.'
          : (error?.message || 'Falha desconhecida.')}
      />
    )
  }

  // ─── Render principal ────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minHeight: 0, overflow: 'hidden', background: T.bg,
    }}>

      {/* ═══════════════════════════════════════════════════════
          PAGE HEADER — título, stats, etapa tabs, agenda chips
      ═══════════════════════════════════════════════════════ */}
      <div style={{
        padding: '18px 22px 0',
        borderBottom: `1px solid ${T.border}`,
        background: T.bg,
        flexShrink: 0,
      }}>
        {/* Linha 1: icon + título + stats | ações */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: azulBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className="ti ti-route" style={{ fontSize: 16, color: azul }} aria-hidden="true" />
            </div>
            <div>
              <h1 style={{
                fontSize: 17, fontWeight: 700, color: T.textPrimary,
                margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2,
              }}>Logística</h1>
              <div style={{ display: 'flex', gap: 10, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatBadge v={osFiltradas.length} label="OS" color={T.textSecondary} />
                {rotasAtivas > 0 && <StatBadge v={rotasAtivas} label="rotas ativas" color={azul} dot />}
                {totalSemRota > 0 && <StatBadge v={totalSemRota} label="sem rota" color={amarelo} dot />}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <HdrIconBtn T={T} dark={dark}
              icon="ti-external-link"
              title="Abrir rota completa no Google Maps"
              onClick={abrirRotaCompletaNoMaps}
            />
            <button
              onClick={() => setNovaRotaAberta(true)}
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
              Nova rota
            </button>
          </div>
        </div>

        {/* Linha 2: etapa tabs + divider + agenda chips */}
        <div style={{
          display: 'flex', alignItems: 'stretch',
          justifyContent: 'flex-start', gap: 8,
        }}>
          {/* Etapas — underline tab style, multi-select */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, flexShrink: 0 }}>
            {FILTROS_ETAPA_LOGISTICA.map(f => {
              const ativo = etapasAtivas.has(f.id)
              const n = countEtapa[f.id] || 0
              return (
                <button key={f.id} onClick={() => toggleEtapa(f.id)}
                  style={{
                    padding: '8px 12px 10px',
                    border: 'none',
                    borderBottom: `2.5px solid ${ativo ? azul : 'transparent'}`,
                    background: 'transparent',
                    color: ativo ? azul : T.textMuted,
                    fontSize: 13, fontWeight: ativo ? 600 : 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    whiteSpace: 'nowrap',
                    transition: 'color .12s, border-color .12s',
                    marginBottom: -1,
                  }}
                  onMouseEnter={e => { if (!ativo) e.currentTarget.style.color = T.textPrimary }}
                  onMouseLeave={e => { if (!ativo) e.currentTarget.style.color = T.textMuted }}>
                  <i className={`ti ${f.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
                  {f.label}
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

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', paddingBottom: 8 }}>
            <HdrDivider T={T} dark={dark} />
          </div>

          {/* Agenda chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, paddingBottom: 8, flexShrink: 0 }}>
            {[
              { id: 'hoje',   label: 'Hoje / Atrasadas', icon: 'ti-calendar-event' },
              { id: 'amanha', label: 'Amanhã',           icon: 'ti-calendar-plus' },
              { id: 'semana', label: 'Semana',           icon: 'ti-calendar-week' },
            ].map(op => {
              const sel = filtroAgenda === op.id
              return (
                <button key={op.id} onClick={() => setFiltroAgenda(op.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 4,
                    border: `1px solid ${sel ? azul : T.border}`,
                    background: sel ? azulBg : 'transparent',
                    color: sel ? azul : T.textMuted,
                    fontSize: 12.5, fontWeight: sel ? 600 : 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    whiteSpace: 'nowrap',
                  }}>
                  <i className={`ti ${op.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
                  {op.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          CONTENT — grid mapa + rotas + agenda
      ═══════════════════════════════════════════════════════ */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto', overflowX: 'hidden',
        padding: '14px 22px 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(520px, 1.4fr) minmax(360px, 1fr)',
          gap: 14, alignItems: 'start',
        }}>

          {/* ─── Coluna esquerda: mapa ─────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                borderRadius: 4, overflow: 'hidden',
                border: `1px solid ${T.border}`,
                boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
              }}>
                <MapaLogistica T={T} dark={dark} height={580} paradas={pinosDoMapa} />
              </div>
              {osPopup && (
                <CardFlutuanteOS
                  T={T} dark={dark} os={osPopup}
                  onClose={() => setOsPopup(null)}
                  onAdicionar={(letra) => adicionarOSemRota(osPopup, letra)}
                  onAbrirDetalhe={() => { abrirOSPorId(osPopup.id); setOsPopup(null) }}
                />
              )}
            </div>

            <DiagnosticoMapa
              T={T} dark={dark}
              diagnostico={diagnostico}
              totalOSFiltradas={osFiltradas.length}
              criandoRotasFalhou={criandoRotasFalhou}
            />

            {/* Legenda */}
            <div style={{
              display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
              fontSize: 10.5, color: T.textDim, padding: '2px 4px',
            }}>
              <LegendaDot cor={corEtapa('blue', dark)}   titulo="Coleta (agendado)" />
              <LegendaDot cor="#A6C8E5" titulo="Ag. coleta" />
              <LegendaDot cor={corEtapa('green', dark)}  titulo="Entrega" />
              <LegendaDot cor="#C5E0A4" titulo="Teste final" />
              <LegendaDot cor={corEtapa('yellow', dark)} titulo="A receber" />
              <LegendaDot cor="#1a3a6e" titulo="OS disponível" tracejado />
              <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
                Pino tracejado = clique pra adicionar
              </span>
            </div>
          </div>

          {/* ─── Coluna direita: rotas + agenda ───────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* AtlPanel — Rotas de hoje */}
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 4, overflow: 'hidden',
              boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
            }}>
              <div style={{
                padding: '10px 14px', borderBottom: `1px solid ${T.border}`,
                display: 'flex', alignItems: 'center', gap: 10,
                background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
              }}>
                <i className="ti ti-road" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
                <span style={{
                  fontSize: 13, fontWeight: 600, color: T.textPrimary,
                  letterSpacing: '-0.005em', flex: 1,
                }}>Rotas de hoje</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: T.textMuted,
                  background: dark ? 'rgba(255,255,255,0.07)' : '#DFE1E6',
                  padding: '2px 7px', borderRadius: 99,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {slotsRotas.reduce((s, sl) => s + (sl.rota?.paradas?.length || 0), 0)} paradas
                </span>
              </div>
              {slotsRotas.map((slot, idx) => {
                const letra = LETRA_POR_SLOT[slot.nome]
                return (
                  <RotaAccordion
                    key={slot.nome}
                    T={T} dark={dark}
                    slot={slot} letra={letra}
                    primeiro={idx === 0}
                    expandida={rotaExpandida === letra}
                    onToggle={() => setRotaExpandida(rotaExpandida === letra ? null : letra)}
                    onRemoverParada={(paradaId) => removerParada(slot.rota, paradaId)}
                    onReordenarParadas={async (novasParadas) => {
                      if (!slot.rota) return
                      const { error: err } = await atualizarRota(slot.rota.id, { paradas: novasParadas })
                      if (err) notify('erro', err.message || 'Falha ao reordenar')
                    }}
                    onAdicionarAvulsa={(nome, end) => adicionarParadaAvulsa(slot.rota, nome, end)}
                    onAbrirOSDetalhe={abrirOSPorId}
                  />
                )
              })}
            </div>

            {/* Agenda do Dia */}
            <AgendaDia T={T} dark={dark} osList={osList} onAbrirOS={abrirOSPorId} />

            {/* Editar rota (avançado — DnD, status, observações) */}
            {dataAtiva && slotsRotas.some(s => s.rota) && (
              <button
                onClick={() => {
                  const slot = slotsRotas.find(s => LETRA_POR_SLOT[s.nome] === rotaExpandida)
                  if (slot?.rota) setRotaDetalhe(slot.rota)
                  else notify('info', 'Selecione uma rota acima')
                }}
                style={{
                  padding: '8px 12px', borderRadius: 4,
                  border: `1px dashed ${T.border}`,
                  background: 'transparent',
                  color: T.textMuted, fontSize: 11.5, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  transition: 'color .12s, border-color .12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = azul
                  e.currentTarget.style.borderColor = azul
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = T.textMuted
                  e.currentTarget.style.borderColor = T.border
                }}>
                <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true" />
                Editar Rota {rotaExpandida || 'A'} (ordem, status, observações…)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      {novaRotaAberta && (
        <NovaRotaModal T={T} dark={dark}
          onClose={() => setNovaRotaAberta(false)}
          onCriar={criarRota} />
      )}
      {rotaDetalhe && (
        <RotaDetalheModal T={T} dark={dark}
          rota={rotaDetalhe}
          onClose={() => setRotaDetalhe(null)}
          onAtualizar={atualizarRota}
          onExcluir={excluirRota}
          onConcluirParada={concluirParadaHook} />
      )}
      {osDetalheProps && <OSDetalhe T={T} dark={dark} {...osDetalheProps} />}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatBadge({ v, label, color, dot }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 12 }}>
      {dot && (
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: color, display: 'inline-block',
          alignSelf: 'center', flexShrink: 0,
        }} />
      )}
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
      <span style={{ color, opacity: 0.75 }}>{label}</span>
    </span>
  )
}

function HdrDivider({ dark, T }) {
  return (
    <div style={{
      width: 1, height: 18, flexShrink: 0,
      background: dark ? 'rgba(255,255,255,0.12)' : T.border,
    }} />
  )
}

function HdrIconBtn({ T, dark, icon, title, onClick }) {
  return (
    <button
      type="button" onClick={onClick} title={title} aria-label={title}
      style={{
        width: 32, height: 32, borderRadius: 4,
        border: `1px solid ${T?.border}`,
        background: 'transparent', color: T?.textSecondary,
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit',
        transition: 'background .12s, color .12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = T?.cardAlt || T?.card
        e.currentTarget.style.color = T?.textPrimary
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = T?.textSecondary
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
    </button>
  )
}

function LegendaDot({ cor, titulo, tracejado = false }) {
  return (
    <span title={titulo} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{
        width: 9, height: 9, borderRadius: 999,
        background: tracejado ? 'transparent' : cor,
        border: tracejado ? `1.5px dashed ${cor}` : `1.5px solid ${cor}`,
        display: 'inline-block',
      }} />
      {titulo.split(' (')[0]}
    </span>
  )
}

function AgendaDia({ T, dark, osList, onAbrirOS }) {
  const azul = corEtapa('blue', dark)
  const hoje = dataLocalHoje()

  const osHoje = useMemo(() => {
    return osList
      .filter(os => {
        if (!os.data_agendamento) return false
        const dataLocal = new Date(os.data_agendamento).toLocaleDateString('pt-BR', {
          timeZone: 'America/Cuiaba',
          year: 'numeric', month: '2-digit', day: '2-digit',
        }).split('/').reverse().join('-')
        return dataLocal === hoje
      })
      .sort((a, b) => (a.data_agendamento || '').localeCompare(b.data_agendamento || ''))
  }, [osList, hoje])

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 4, overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
        background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
      }}>
        <i className="ti ti-calendar-time" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
        <span style={{
          fontWeight: 600, fontSize: 13, color: T.textPrimary,
          letterSpacing: '-0.005em', flex: 1,
        }}>Agenda do Dia</span>
        {osHoje.length > 0 && (
          <span style={{
            background: azul, color: '#fff',
            borderRadius: 99, padding: '1px 8px',
            fontSize: 11, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}>{osHoje.length}</span>
        )}
      </div>

      {osHoje.length === 0 ? (
        <div style={{ padding: '20px 14px', textAlign: 'center', color: T.textDim, fontSize: 12 }}>
          <i className="ti ti-calendar-off"
            style={{ fontSize: 20, display: 'block', marginBottom: 6 }}
            aria-hidden="true" />
          Nenhum agendamento pra hoje
        </div>
      ) : (
        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {osHoje.map((os, idx) => {
            const hora = horaLocal(os.data_agendamento)
            const chip = corChipEtapa(os.etapa_db)
            return (
              <div
                key={os.id}
                onClick={() => onAbrirOS?.(os.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px',
                  borderBottom: idx < osHoje.length - 1 ? `1px solid ${T.border}` : 'none',
                  cursor: 'pointer',
                  transition: 'background .1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : '#F7F8F9'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                }}>
                <span style={{
                  fontVariantNumeric: 'tabular-nums', fontWeight: 700,
                  fontSize: 13, color: azul,
                  minWidth: 40, flexShrink: 0,
                }}>{hora || '--:--'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: T.textPrimary, lineHeight: 1.3,
                  }}>#{os.numero} · {os.cliente_nome}</div>
                  {os.endereco && (
                    <div style={{
                      fontSize: 11, color: T.textDim,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{os.endereco}</div>
                  )}
                </div>
                <span style={{
                  background: chip.bg, color: chip.text,
                  borderRadius: 3, padding: '2px 7px',
                  fontSize: 10.5, fontWeight: 600, flexShrink: 0,
                }}>{os.etapa_label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Estado de loading / erro / tabela ausente — preserva o header visual
function LogisticaEstado({ T, dark, azul, azulBg, icon, title, desc }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minHeight: 0, overflow: 'hidden', background: T.bg,
    }}>
      <div style={{
        padding: '18px 22px', borderBottom: `1px solid ${T.border}`,
        background: T.bg, flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: azulBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className="ti ti-route" style={{ fontSize: 16, color: azul }} aria-hidden="true" />
        </div>
        <h1 style={{
          fontSize: 17, fontWeight: 700, color: T.textPrimary,
          margin: 0, letterSpacing: '-0.025em',
        }}>Logística</h1>
      </div>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 40,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <i className={`ti ${icon}`} style={{
            fontSize: 40, color: T.textDim,
            display: 'block', marginBottom: 16,
          }} aria-hidden="true" />
          <div style={{
            fontSize: 15, fontWeight: 600, color: T.textPrimary,
            marginBottom: 8, letterSpacing: '-0.01em',
          }}>{title}</div>
          {desc && (
            <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5 }}>{desc}</div>
          )}
        </div>
      </div>
    </div>
  )
}
