// src/pages/LogisticaMobile.jsx
// Reestruturação mobile da página /logistica (pedido 21/05/2026).
//
// CONCEITO:
//   - Mapa em cima mostra TODAS as OS ativas do Kanban + paradas já em rota.
//   - Filtro de etapas (chips de etapa do kanban) controla quais OS viram pino.
//   - Tap num pino "disponível" abre card flutuante com dados da OS e botões
//     "+A / +B / +C" pra adicionar direto a uma das 3 rotas do dia.
//   - Embaixo, 3 cards accordion (Rota A / B / C). Click expande a lista.
//   - Tipo da parada derivado da etapa: agendamento → coleta · outras → entrega
//     · pagamento → receber · avulsa → outros.
//   - Pinos em rota mostram código (A1, A2, B1…) em vez de letra do tipo.
//   - Pinos de OS com `data_agendamento` ganham anel amarelo de atenção.
//
// ARQ.:
//   - Mantém hook `useRotas` (mesma tabela `rota` do desktop).
//   - Slots fixos NOMES_SLOT = ['Rota A', 'Rota B', 'Rota C']. Auto-cria se
//     faltam (depende de sql/17 rodado). Fallback se schemaNomeAusente.
//   - Reutiliza `useOSLogistica`, `useGeocodeEnderecos`, `MapaLogistica`.

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useToast } from '../components/ui'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { useRotas } from '../hooks/useRotas'
import { useOSLogistica, FILTROS_ETAPA_LOGISTICA, tipoParadaPorEtapa } from '../hooks/useOSLogistica'
import { useGeocodeEnderecos } from '../hooks/useGeocodeEnderecos'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import MapaLogistica from '../components/logistica/MapaLogistica'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

const HOJE   = new Date().toISOString().slice(0, 10)
const AMANHA = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

const FILTROS_DATA = [
  { id: 'hoje',   label: 'Hoje' },
  { id: 'amanha', label: 'Amanhã' },
  { id: 'semana', label: 'Semana' },
]

const NOMES_SLOT = ['Rota A', 'Rota B', 'Rota C']
const LETRA_POR_SLOT = { 'Rota A': 'A', 'Rota B': 'B', 'Rota C': 'C' }

// Etapas ativas por default — focam no que dá pra rotear AGORA.
const ETAPAS_DEFAULT = new Set(['agendamento', 'entrega'])

// Mapeamento: etapa do kanban → tipo de parada (4 tipos canônicos da UI nova).
// Legacy jsonb com 'cobranca'/'visita'/'avulsa' é mapeado pra UI ao renderizar.
function tipoUiPorEtapa(etapaDb) {
  if (etapaDb === 'agendamento' || etapaDb === 'aguardando_agendamento') return 'coleta'
  if (etapaDb === 'pagamento') return 'receber'
  return 'entrega' // teste_final / oficina / etc — tudo cai em entrega
}

// Normaliza tipo do jsonb (que pode ter legacy) pra um dos 4 tipos da UI nova.
function normalizarTipoUi(tipo) {
  if (tipo === 'coleta')   return 'coleta'
  if (tipo === 'entrega')  return 'entrega'
  if (tipo === 'cobranca' || tipo === 'receber') return 'receber'
  return 'outros' // visita / avulsa / qualquer outro
}

const VISUAL_TIPO = {
  coleta:  { cor: '#5B9BD5', label: 'Coleta',  icon: 'ti-arrow-down-circle' },
  entrega: { cor: '#8FBC55', label: 'Entrega', icon: 'ti-truck-delivery' },
  receber: { cor: '#FFD966', label: 'Receber', icon: 'ti-cash' },
  outros:  { cor: '#B8CCE4', label: 'Outros',  icon: 'ti-dots' },
}

export default function LogisticaMobile({ T, dark }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  // ─── Estado ───────────────────────────────────────────────────────────
  const [filtroData, setFiltroData] = useState('hoje')
  const [etapasAtivas, setEtapasAtivas] = useState(ETAPAS_DEFAULT)
  const [rotaExpandida, setRotaExpandida] = useState('A')
  const [osPopup, setOsPopup] = useState(null)
  const [criandoRotasFalhou, setCriandoRotasFalhou] = useState(false)
  const criandoRotasRef = useRef(false)

  const dataAtiva = filtroData === 'hoje' ? HOJE : filtroData === 'amanha' ? AMANHA : null

  // ─── Hooks de dados ───────────────────────────────────────────────────
  const incluirPagamento = etapasAtivas.has('pagamento')
  const { osList } = useOSLogistica({ incluirPagamento })
  const {
    rotas, criar: criarRota, atualizar: atualizarRota,
  } = useRotas()

  const { abrirOSPorId, modalProps: osDetalheProps } = useOSDetalheModal({ notify })

  // OS filtradas pelas etapas ativas
  const osFiltradas = useMemo(
    () => osList.filter(o => etapasAtivas.has(o.etapa_db)),
    [osList, etapasAtivas]
  )

  // Geocoda os endereços (não bloqueia UI — pins aparecem conforme resolve)
  const enderecos = useMemo(
    () => osFiltradas.map(o => o.endereco).filter(Boolean),
    [osFiltradas]
  )
  const coordsPorEndereco = useGeocodeEnderecos(enderecos)

  // Rotas do dia ativo + map dos slots A/B/C
  const slotsRotas = useMemo(() => {
    if (!dataAtiva) return NOMES_SLOT.map(nome => ({ nome, rota: null }))
    return NOMES_SLOT.map(nome => ({
      nome,
      rota: rotas.find(r => r.data === dataAtiva && r.nome === nome) || null,
    }))
  }, [rotas, dataAtiva])

  // Auto-cria Rota A/B/C vazias pra o dia ativo
  useEffect(() => {
    if (!dataAtiva || criandoRotasRef.current || criandoRotasFalhou) return
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
              break
            }
          }
        }
      } finally {
        criandoRotasRef.current = false
      }
    })()
  }, [dataAtiva, slotsRotas, criandoRotasFalhou, criarRota])

  // ─── Pinos pro mapa ───────────────────────────────────────────────────
  // Set de OS que já estão em alguma rota (não plota duas vezes).
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
    // Paradas em rota (com código A1, B2, …)
    for (const s of slotsRotas) {
      if (!s.rota) continue
      const letra = LETRA_POR_SLOT[s.nome]
      const paradas = s.rota.paradas || []
      paradas.forEach((p, idx) => {
        if (p.lat == null || p.lng == null) return
        lista.push({
          lat: Number(p.lat),
          lng: Number(p.lng),
          tipo: normalizarTipoUi(p.tipo),
          codigo: `${letra}${idx + 1}`,
          label: `${letra}${idx + 1} · ${p.cliente_nome || 'Sem cliente'}`,
        })
      })
    }
    // OS disponíveis (filtradas por etapa, sem rota ainda, com coord)
    for (const os of osFiltradas) {
      if (osIdsEmRota.has(os.id)) continue
      const c = os.endereco ? coordsPorEndereco[os.endereco] : null
      if (!c) continue
      lista.push({
        lat: c.lat, lng: c.lng,
        tipo: tipoUiPorEtapa(os.etapa_db),
        agendamento: !!os.data_agendamento,
        label: `OS #${os.numero} · ${os.cliente_nome}`,
        onClick: () => setOsPopup({ ...os, lat: c.lat, lng: c.lng }),
      })
    }
    return lista
  }, [slotsRotas, osFiltradas, coordsPorEndereco, osIdsEmRota])

  // Diagnóstico — quantas OS aparecem no mapa vs. faltam
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

  // ─── Ações ────────────────────────────────────────────────────────────
  async function adicionarOSemRota(os, letra) {
    const slot = slotsRotas.find(s => LETRA_POR_SLOT[s.nome] === letra)
    if (!slot) {
      notify('erro', `Rota ${letra} não disponível`)
      return
    }
    if (!slot.rota) {
      notify('erro', criandoRotasFalhou
        ? 'Rode sql/17-rota-nome.sql pra ativar as rotas A/B/C'
        : `Rota ${letra} ainda sendo criada…`)
      return
    }
    const tipo = tipoUiPorEtapa(os.etapa_db)
    const novaParada = {
      id: crypto.randomUUID(),
      ordem: (slot.rota.paradas || []).length + 1,
      tipo,
      os_id: os.id,
      os_num: os.numero,
      cliente_nome: os.cliente_nome,
      cliente_fone: os.cliente_telefone || null,
      endereco: os.endereco || null,
      lat: os.lat || null,
      lng: os.lng || null,
      horario_previsto: null,
      horario_chegada: null,
      status: 'pendente',
      foto_url: null,
      observacoes: null,
    }
    const novasParadas = [...(slot.rota.paradas || []), novaParada]
    const { error } = await atualizarRota(slot.rota.id, { paradas: novasParadas })
    if (error) {
      notify('erro', error.message || `Falha ao adicionar a Rota ${letra}`)
      return
    }
    notify('ok', `Adicionada a Rota ${letra}`)
    setRotaExpandida(letra)
    setOsPopup(null)
  }

  async function removerParada(slotRota, paradaId) {
    const novasParadas = (slotRota.paradas || []).filter(p => p.id !== paradaId)
    const { error } = await atualizarRota(slotRota.id, { paradas: novasParadas })
    if (error) notify('erro', error.message || 'Falha ao remover')
    else notify('ok', 'Parada removida')
  }

  async function adicionarParadaAvulsa(slotRota, nome, endereco) {
    if (!nome.trim()) return
    const novaParada = {
      id: crypto.randomUUID(),
      ordem: (slotRota.paradas || []).length + 1,
      tipo: 'outros',
      os_id: null,
      os_num: null,
      cliente_nome: nome.trim(),
      cliente_fone: null,
      endereco: endereco.trim() || null,
      lat: null, lng: null,
      horario_previsto: null,
      horario_chegada: null,
      status: 'pendente',
      foto_url: null,
      observacoes: null,
    }
    const novasParadas = [...(slotRota.paradas || []), novaParada]
    const { error } = await atualizarRota(slotRota.id, { paradas: novasParadas })
    if (error) notify('erro', error.message || 'Falha ao adicionar')
    else notify('ok', 'Parada avulsa adicionada')
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '12px 12px 88px',
      flex: 1, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <HeaderMobile T={T} dark={dark} />

      <PeriodoToggle
        T={T} dark={dark}
        valor={filtroData} onChange={setFiltroData}
      />

      <FiltroEtapas
        T={T} dark={dark}
        ativas={etapasAtivas}
        onToggle={(id) => setEtapasAtivas(prev => {
          const next = new Set(prev)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return next
        })}
      />

      {/* Mapa + popup flutuante quando OS clicada */}
      <div style={{ position: 'relative' }}>
        <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${T.border}` }}>
          <MapaLogistica
            T={T} dark={dark}
            height={Math.max(280, Math.round(window.innerHeight * 0.42))}
            paradas={pinosDoMapa}
          />
        </div>

        {osPopup && (
          <CardFlutuanteOS
            T={T} dark={dark}
            os={osPopup}
            onClose={() => setOsPopup(null)}
            onAdicionar={(letra) => adicionarOSemRota(osPopup, letra)}
            onAbrirDetalhe={() => { abrirOSPorId(osPopup.id); setOsPopup(null) }}
          />
        )}
      </div>

      {/* Diagnóstico do mapa */}
      <DiagnosticoMapa
        T={T} dark={dark}
        diagnostico={diagnostico}
        totalOSFiltradas={osFiltradas.length}
        criandoRotasFalhou={criandoRotasFalhou}
      />

      {/* Accordion 3 rotas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slotsRotas.map(slot => (
          <RotaAccordion
            key={slot.nome}
            T={T} dark={dark}
            slot={slot}
            letra={LETRA_POR_SLOT[slot.nome]}
            expandida={rotaExpandida === LETRA_POR_SLOT[slot.nome]}
            onToggle={() => setRotaExpandida(
              rotaExpandida === LETRA_POR_SLOT[slot.nome] ? null : LETRA_POR_SLOT[slot.nome]
            )}
            onRemoverParada={(paradaId) => removerParada(slot.rota, paradaId)}
            onAdicionarAvulsa={(nome, end) => adicionarParadaAvulsa(slot.rota, nome, end)}
            onAbrirOSDetalhe={abrirOSPorId}
          />
        ))}
      </div>

      {osDetalheProps && <OSDetalhe T={T} dark={dark} {...osDetalheProps} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// Subcomponentes (inline pra ficar contido)
// ═══════════════════════════════════════════════════════════════════════

function HeaderMobile({ T, dark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <h1 style={{
        fontSize: 20, fontWeight: 700, margin: 0,
        color: corHero(dark), letterSpacing: '-0.01em',
      }}>Logística</h1>
      <span style={{ fontSize: 11, color: T.textMuted }}>Planejamento de rotas</span>
    </div>
  )
}

function PeriodoToggle({ T, dark, valor, onChange }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      display: 'flex', gap: 2, padding: 3,
      background: T.cardAlt, borderRadius: 999,
      alignSelf: 'flex-start',
    }}>
      {FILTROS_DATA.map(f => {
        const ativo = valor === f.id
        return (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            style={{
              padding: '5px 12px', borderRadius: 999,
              border: 'none',
              background: ativo ? T.card : 'transparent',
              color: ativo ? azul : T.textMuted,
              fontSize: 12, fontWeight: ativo ? 600 : 500,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: ativo ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
            }}>{f.label}</button>
        )
      })}
    </div>
  )
}

function FiltroEtapas({ T, dark, ativas, onToggle }) {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 5,
      padding: '4px 0',
    }}>
      <span style={{
        fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: T.textDim, alignSelf: 'center', marginRight: 4,
      }}>Etapas</span>
      {FILTROS_ETAPA_LOGISTICA.map(f => {
        const ativo = ativas.has(f.id)
        const corF = corEtapa(f.cor, dark)
        return (
          <button
            key={f.id}
            onClick={() => onToggle(f.id)}
            title={f.label}
            style={{
              padding: '5px 10px', borderRadius: 999,
              border: `1px solid ${ativo ? corF : T.border}`,
              background: ativo ? `${corF}22` : 'transparent',
              color: ativo ? corF : T.textDim,
              fontSize: 11, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
            <i className={`ti ${f.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
            {f.label.split(' ')[0]}
          </button>
        )
      })}
    </div>
  )
}

function DiagnosticoMapa({ T, dark, diagnostico, totalOSFiltradas, criandoRotasFalhou }) {
  if (totalOSFiltradas === 0) return null
  return (
    <div style={{
      display: 'flex', gap: 10, flexWrap: 'wrap',
      fontSize: 10.5, color: T.textDim,
      padding: '0 2px',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {diagnostico.comCoord > 0 && (
        <span style={{ color: corEtapa('green', dark) }}>
          <i className="ti ti-map-pin-check" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
          {diagnostico.comCoord} no mapa
        </span>
      )}
      {diagnostico.geocodificando > 0 && (
        <span><i className="ti ti-loader-2" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
          {diagnostico.geocodificando} geocodificando…
        </span>
      )}
      {diagnostico.semEndereco > 0 && (
        <span style={{ color: corEtapa('yellow', dark) }}
          title="Cliente sem endereço cadastrado">
          <i className="ti ti-map-pin-off" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
          {diagnostico.semEndereco} sem endereço
        </span>
      )}
      {criandoRotasFalhou && (
        <span style={{ color: corEtapa('yellow', dark), marginLeft: 'auto' }}
          title="Rode sql/17-rota-nome.sql">
          <i className="ti ti-database-off" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
          SQL pendente
        </span>
      )}
    </div>
  )
}

// Card flutuante sobre o mapa quando OS é clicada.
// Aparece centralizado em cima, com dados + 3 botões A/B/C.
function CardFlutuanteOS({ T, dark, os, onClose, onAdicionar, onAbrirDetalhe }) {
  const azul = corEtapa('blue', dark)
  const tipoUi = tipoUiPorEtapa(os.etapa_db)
  const visual = VISUAL_TIPO[tipoUi]
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,.25)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '12px',
        zIndex: 20, borderRadius: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 12,
          padding: '12px 14px',
          width: '100%', maxWidth: 320,
          boxShadow: '0 6px 24px rgba(0,0,0,.25)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <i className={`ti ${visual.icon}`} style={{ fontSize: 16, color: visual.cor }} aria-hidden="true" />
            <strong style={{ fontSize: 13, color: corHero(dark) }}>OS #{os.numero}</strong>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: visual.cor, background: `${visual.cor}22`,
              padding: '2px 6px', borderRadius: 8,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>{visual.label}</span>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T.textMuted, padding: 0, fontSize: 18, lineHeight: 1,
          }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div style={{ fontSize: 12.5, color: T.textPrimary, fontWeight: 600 }}>
          {os.cliente_nome || 'Sem cliente'}
        </div>
        {os.endereco && (
          <div style={{ fontSize: 11, color: T.textMuted, display: 'flex', gap: 5, alignItems: 'flex-start' }}>
            <i className="ti ti-map-pin" style={{ fontSize: 12, marginTop: 1 }} aria-hidden="true" />
            <span>{os.endereco}</span>
          </div>
        )}
        <div style={{ fontSize: 11, color: T.textDim, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span><i className="ti ti-tag" style={{ fontSize: 11, marginRight: 3 }} />{os.etapa_label}</span>
          {os.data_agendamento && (
            <span style={{ color: corEtapa('yellow', dark) }}>
              <i className="ti ti-calendar-event" style={{ fontSize: 11, marginRight: 3 }} />
              {new Date(os.data_agendamento).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {['A', 'B', 'C'].map(letra => (
            <button
              key={letra}
              onClick={() => onAdicionar(letra)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8,
                border: 'none',
                background: `linear-gradient(135deg, ${azul}, #3a7bbf)`,
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 1px 2px rgba(91,155,213,.30)',
              }}>+ {letra}</button>
          ))}
        </div>

        <button
          onClick={onAbrirDetalhe}
          style={{
            background: 'transparent', border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '7px 0',
            color: T.textSecondary, fontSize: 11.5, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Ver OS completa</button>
      </div>
    </div>
  )
}

// Accordion item de cada rota (A/B/C). Header sempre visível, lista expandida no toggle.
function RotaAccordion({ T, dark, slot, letra, expandida, onToggle, onRemoverParada, onAdicionarAvulsa, onAbrirOSDetalhe }) {
  const azul = corEtapa('blue', dark)
  const paradas = slot.rota?.paradas || []
  const indisponivel = !slot.rota
  const [avulsaAberta, setAvulsaAberta] = useState(false)
  const [avulsaNome, setAvulsaNome] = useState('')
  const [avulsaEnd, setAvulsaEnd] = useState('')

  return (
    <div style={{
      border: `1px solid ${expandida ? azul : T.border}`,
      borderRadius: 10,
      background: T.card,
      overflow: 'hidden',
      opacity: indisponivel ? 0.55 : 1,
    }}>
      <button
        onClick={indisponivel ? undefined : onToggle}
        disabled={indisponivel}
        style={{
          width: '100%', padding: '11px 14px',
          background: 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: indisponivel ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
        }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: expandida ? azul : T.cardAlt,
          color: expandida ? '#fff' : T.textPrimary,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700,
        }}>{letra}</div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: corHero(dark) }}>
            Rota {letra}
            {indisponivel && (
              <span style={{ fontSize: 10, color: T.textDim, fontWeight: 500, marginLeft: 6 }}>
                (slot pendente)
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
            {paradas.length === 0 ? 'Sem paradas' : `${paradas.length} ${paradas.length === 1 ? 'parada' : 'paradas'}`}
          </div>
        </div>
        {!indisponivel && (
          <i className={`ti ti-chevron-${expandida ? 'up' : 'down'}`}
            style={{ fontSize: 16, color: T.textMuted }} aria-hidden="true" />
        )}
      </button>

      {expandida && !indisponivel && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {paradas.length === 0 ? (
            <div style={{
              padding: '12px 14px', fontSize: 12, color: T.textMuted, textAlign: 'center',
            }}>
              Toque num pino do mapa pra adicionar.
            </div>
          ) : (
            paradas.map((p, idx) => {
              const tipoUi = normalizarTipoUi(p.tipo)
              const visual = VISUAL_TIPO[tipoUi]
              return (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                  gap: 10, alignItems: 'center',
                  padding: '10px 14px',
                  borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: `${visual.cor}22`,
                    color: visual.cor,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>{letra}{idx + 1}</div>
                  <div
                    onClick={p.os_id ? () => onAbrirOSDetalhe(p.os_id) : undefined}
                    style={{ minWidth: 0, cursor: p.os_id ? 'pointer' : 'default' }}
                  >
                    <div style={{
                      fontSize: 12.5, color: corHero(dark), fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.cliente_nome || 'Sem cliente'}</div>
                    <div style={{ fontSize: 10.5, color: T.textMuted, display: 'flex', gap: 6 }}>
                      <span style={{ color: visual.cor, fontWeight: 600 }}>{visual.label}</span>
                      {p.os_num && <span>· OS #{p.os_num}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoverParada(p.id)}
                    aria-label="Remover"
                    style={{
                      background: 'transparent', border: 'none',
                      color: T.textDim, cursor: 'pointer',
                      padding: 6, fontSize: 16, lineHeight: 1,
                    }}>
                    <i className="ti ti-x" aria-hidden="true" />
                  </button>
                </div>
              )
            })
          )}

          {/* Parada avulsa */}
          {avulsaAberta ? (
            <div style={{
              padding: 12, borderTop: `1px solid ${T.border}`,
              background: T.cardAlt,
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <input
                value={avulsaNome}
                onChange={(e) => setAvulsaNome(e.target.value)}
                placeholder="Ex.: Buscar peça, Posto…"
                style={{
                  padding: '7px 10px', fontSize: 12,
                  border: `1px solid ${T.border}`, borderRadius: 6,
                  background: T.card, color: T.textPrimary, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <input
                value={avulsaEnd}
                onChange={(e) => setAvulsaEnd(e.target.value)}
                placeholder="Endereço (opcional)"
                style={{
                  padding: '7px 10px', fontSize: 12,
                  border: `1px solid ${T.border}`, borderRadius: 6,
                  background: T.card, color: T.textPrimary, outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setAvulsaAberta(false); setAvulsaNome(''); setAvulsaEnd('') }}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 6,
                    border: `1px solid ${T.border}`, background: 'transparent',
                    color: T.textSecondary, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Cancelar</button>
                <button
                  onClick={() => {
                    onAdicionarAvulsa(avulsaNome, avulsaEnd)
                    setAvulsaAberta(false); setAvulsaNome(''); setAvulsaEnd('')
                  }}
                  disabled={!avulsaNome.trim()}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 6,
                    border: 'none',
                    background: `linear-gradient(135deg, ${azul}, #3a7bbf)`,
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: avulsaNome.trim() ? 'pointer' : 'not-allowed',
                    opacity: avulsaNome.trim() ? 1 : 0.5,
                    fontFamily: 'inherit',
                  }}>Adicionar</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAvulsaAberta(true)}
              style={{
                width: '100%', padding: '9px 14px',
                background: 'transparent', border: 'none',
                borderTop: `1px solid ${T.border}`,
                color: azul, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
              Parada avulsa
            </button>
          )}
        </div>
      )}
    </div>
  )
}
