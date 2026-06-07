// src/pages/LogisticaMobile.jsx
// Pagina Logistica — Atlassian Design (reescrito 28/05/2026).
//
// Estrutura:
//   1. Filtros (segmented multi-select Atlassian — Agenda/Coleta/Teste/Entrega/A receber)
//   2. Mapa (AtlPanel com MapaLogistica dentro + CardFlutuanteOS overlay)
//   3. Diagnostico inline (pills com contagem)
//   4. Rotas de hoje (AtlPanel com 3 accordions A/B/C — drop targets)
//   5. OS disponiveis (AtlPanel com lista de cards draggable)
//
// Exports preservados pro desktop (pages/Logistica.jsx):
//   FiltroEtapas, RotaAccordion, CardFlutuanteOS, DiagnosticoMapa,
//   NOMES_SLOT, LETRA_POR_SLOT, ETAPAS_DEFAULT_LOGISTICA,
//   tipoUiPorEtapa, normalizarTipoUi, VISUAL_TIPO.

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useToast } from '../components/ui'
import { corEtapa, corHero } from '../utils/colors'
import { supabase } from '../supabase'
import { useRotas } from '../hooks/useRotas'
import { useOSLogistica, FILTROS_ETAPA_LOGISTICA } from '../hooks/useOSLogistica'
import { useGeocodeEnderecos } from '../hooks/useGeocodeEnderecos'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import MapaLogistica from '../components/logistica/MapaLogistica'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

const HOJE = new Date().toISOString().slice(0, 10)
const AMANHA = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10) })()
// Início e fim da semana corrente (seg–dom)
const SEMANA_INI = (() => { const d = new Date(); const dia = d.getDay(); const diff = (dia === 0 ? -6 : 1 - dia); d.setDate(d.getDate() + diff); return d.toISOString().slice(0, 10) })()
const SEMANA_FIM = (() => { const d = new Date(SEMANA_INI); d.setDate(d.getDate() + 6); return d.toISOString().slice(0, 10) })()

export function filtrarPorAgenda(osList, filtro) {
  if (filtro === 'amanha') return osList.filter(o => o.data_agendamento?.slice(0, 10) === AMANHA)
  if (filtro === 'semana') return osList.filter(o => {
    const d = o.data_agendamento?.slice(0, 10)
    // Sem data tambem entra na semana (OS sem agenda fica visivel em qualquer filtro de planejamento)
    if (!d) return true
    return d >= SEMANA_INI && d <= SEMANA_FIM
  })
  // 'hoje' (default): atrasadas (passado) + hoje + sem data
  // Atrasadas precisam ficar visiveis — sao mais urgentes que as de hoje.
  return osList.filter(o => {
    const d = o.data_agendamento?.slice(0, 10)
    return !d || d <= HOJE
  })
}
const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const ATL_RADIUS = 4

const FUNCIONARIOS_WPP = [
  { nome: 'Guilherme', fone: '556798015187' },
  { nome: 'Alessandro', fone: '556796113427' },
]

function horaLocalStr(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Cuiaba', hour: '2-digit', minute: '2-digit',
    })
  } catch { return null }
}

async function gerarMensagemRota(slot) {
  const rota = slot.rota
  if (!rota) return null
  const paradas = rota.paradas || []
  if (paradas.length === 0) return null

  const osIds = paradas.filter(p => p.os_id).map(p => p.os_id)
  let osMap = {}
  if (osIds.length > 0) {
    const { data } = await supabase
      .from('os')
      .select('id, marca_equipamento, modelo_equipamento, numero_serie, data_agendamento')
      .in('id', osIds)
    if (data) {
      for (const os of data) osMap[os.id] = os
    }
  }

  const dataStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' })
  const linhas = [`📋 *${rota.nome} — ${dataStr}*`, '']

  paradas.forEach((p, idx) => {
    const os = p.os_id ? osMap[p.os_id] : null
    const tipo = normalizarTipoUi(p.tipo)
    const tipoLabel =
      tipo === 'coleta'  ? 'Coleta'    :
      tipo === 'entrega' ? 'Entrega'   :
      tipo === 'receber' ? 'A receber' : 'Visita'

    linhas.push(`*${idx + 1}. ${tipoLabel}*`)
    linhas.push(`👤 ${p.cliente_nome || '—'}`)
    if (p.cliente_fone) linhas.push(`📞 ${p.cliente_fone}`)
    if (p.endereco) linhas.push(`📍 ${p.endereco}`)
    if (os) {
      const maquina = [os.marca_equipamento, os.modelo_equipamento].filter(Boolean).join(' ')
      const serie = os.numero_serie ? ` · Série: ${os.numero_serie}` : ''
      if (maquina || os.numero_serie) linhas.push(`🔧 ${maquina}${serie}`)
    }
    const horario = p.horario_previsto || (os?.data_agendamento ? horaLocalStr(os.data_agendamento) : null)
    if (horario) linhas.push(`⏰ ${horario}`)
    linhas.push('')
  })

  return linhas.join('\n').trim()
}

export const NOMES_SLOT = ['Rota A', 'Rota B', 'Rota C']
export const LETRA_POR_SLOT = { 'Rota A': 'A', 'Rota B': 'B', 'Rota C': 'C' }
export const ETAPAS_DEFAULT_LOGISTICA = new Set(['agendamento', 'entrega'])

export function tipoUiPorEtapa(etapaDb) {
  if (etapaDb === 'agendamento') return 'coleta'
  if (etapaDb === 'aguardando_agendamento') return 'aguardando_coleta'
  if (etapaDb === 'entrega') return 'entrega'
  if (etapaDb === 'teste_final') return 'aguardando_entrega'
  if (etapaDb === 'pagamento') return 'receber'
  return 'entrega'
}

export function normalizarTipoUi(tipo) {
  if (tipo === 'coleta' || tipo === 'aguardando_coleta')   return 'coleta'
  if (tipo === 'entrega' || tipo === 'aguardando_entrega') return 'entrega'
  if (tipo === 'cobranca' || tipo === 'receber')           return 'receber'
  return 'outros'
}

export const VISUAL_TIPO = {
  coleta:  { corKey: 'blue',   label: 'Coleta',  icon: 'ti-arrow-down-circle' },
  entrega: { corKey: 'green',  label: 'Entrega', icon: 'ti-truck-delivery' },
  receber: { corKey: 'yellow', label: 'Receber', icon: 'ti-cash' },
  outros:  { corKey: 'blue',   label: 'Outros',  icon: 'ti-dots' },
}

// ════════════════════════════════════════════════════════════════════════
// Pagina
// ════════════════════════════════════════════════════════════════════════

export default function LogisticaMobile({ T, dark }) {
  const notify = useToast()

  const [etapasAtivas, setEtapasAtivas] = useState(ETAPAS_DEFAULT_LOGISTICA)
  const [filtroAgenda, setFiltroAgenda] = useState('hoje')
  const [rotaExpandida, setRotaExpandida] = useState('A')
  const [osPopup, setOsPopup] = useState(null)
  const [criandoRotasFalhou, setCriandoRotasFalhou] = useState(false)
  const [arrastando, setArrastando] = useState(null)
  const [hoverRota, setHoverRota] = useState(null)
  const criandoRotasRef = useRef(false)

  const dataAtiva = HOJE
  const incluirPagamento = etapasAtivas.has('pagamento')
  const { osList } = useOSLogistica({ incluirPagamento })
  const { rotas, criar: criarRota, atualizar: atualizarRota } = useRotas()
  const { abrirOSPorId, modalProps: osDetalheProps } = useOSDetalheModal({ notify })

  const osFiltradas = useMemo(() => {
    const porEtapa = osList.filter(o => etapasAtivas.has(o.etapa_db))
    return filtrarPorAgenda(porEtapa, filtroAgenda)
  }, [osList, etapasAtivas, filtroAgenda])

  const enderecos = useMemo(
    () => osFiltradas.map(o => o.endereco).filter(Boolean),
    [osFiltradas]
  )
  const coordsPorEndereco = useGeocodeEnderecos(enderecos)

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
              notify('erro', 'Coluna `nome` ausente — rode sql/17')
              break
            }
            if (msg.includes('duplicate') || msg.includes('unique') || res.error.code === '23505') {
              setCriandoRotasFalhou(true)
              notify('erro', `Constraint antigo bloqueando ${nome} — rode sql/18`)
              break
            }
            setCriandoRotasFalhou(true)
            notify('erro', `Falha ${nome}: ${res.error.message}`)
            break
          }
        }
      } finally {
        criandoRotasRef.current = false
      }
    })()
  }, [dataAtiva, slotsRotas, criandoRotasFalhou, criarRota, notify])

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
          codigo: `${letra}${idx + 1}`,
          label: `${letra}${idx + 1} · ${p.cliente_nome || 'Sem cliente'}`,
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
        agendamento: !!os.data_agendamento,
        label: `OS #${os.numero} · ${os.cliente_nome}`,
        onClick: () => setOsPopup({ ...os, lat: c.lat, lng: c.lng }),
      })
    }
    return lista
  }, [slotsRotas, osFiltradas, coordsPorEndereco, osIdsEmRota])

  const osDisponiveis = useMemo(
    () => osFiltradas.filter(o => !osIdsEmRota.has(o.id)),
    [osFiltradas, osIdsEmRota]
  )

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

  async function adicionarOSemRota(os, letra) {
    const slot = slotsRotas.find(s => LETRA_POR_SLOT[s.nome] === letra)
    if (!slot) { notify('erro', `Rota ${letra} não disponível`); return }
    if (!slot.rota) {
      notify('erro', criandoRotasFalhou
        ? 'Rode sql/17-rota-nome.sql pra ativar as rotas A/B/C'
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
    const { error } = await atualizarRota(slot.rota.id, { paradas: novasParadas })
    if (error) { notify('erro', error.message || `Falha ao adicionar a Rota ${letra}`); return }
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
      os_id: null, os_num: null,
      cliente_nome: nome.trim(),
      cliente_fone: null,
      endereco: endereco.trim() || null,
      lat: null, lng: null,
      horario_previsto: null, horario_chegada: null,
      status: 'pendente', foto_url: null, observacoes: null,
    }
    const novasParadas = [...(slotRota.paradas || []), novaParada]
    const { error } = await atualizarRota(slotRota.id, { paradas: novasParadas })
    if (error) notify('erro', error.message || 'Falha ao adicionar')
    else notify('ok', 'Parada avulsa adicionada')
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto', background: T.bg, minHeight: 0,
      fontFamily: ATL_FONT,
    }}>
      <div style={{
        padding: '12px 14px 96px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>

        {/* 1. Filtros — segmented multi-select */}
        <FiltroEtapas
          T={T} dark={dark}
          ativas={etapasAtivas}
          onToggle={(id) => setEtapasAtivas(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
          })}
        />

        {/* 1b. Filtro de agenda */}
        <FiltroAgenda T={T} dark={dark} ativo={filtroAgenda} onChange={setFiltroAgenda} />

        {/* 2. Mapa */}
        <div style={{
          position: 'relative',
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: ATL_RADIUS, overflow: 'hidden',
          boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
        }}>
          <MapaLogistica
            T={T} dark={dark}
            height={Math.max(280, Math.round(window.innerHeight * 0.40))}
            paradas={pinosDoMapa}
          />
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

        {/* 3. Diagnostico inline */}
        <DiagnosticoMapa
          T={T} dark={dark}
          diagnostico={diagnostico}
          totalOSFiltradas={osFiltradas.length}
          criandoRotasFalhou={criandoRotasFalhou}
        />

        {/* 4. Rotas de hoje */}
        <AtlPanel T={T} dark={dark} title="Rotas de hoje">
          {slotsRotas.map((slot, idx) => {
            const letra = LETRA_POR_SLOT[slot.nome]
            return (
              <RotaAccordion
                key={slot.nome}
                T={T} dark={dark}
                slot={slot}
                letra={letra}
                primeiro={idx === 0}
                expandida={rotaExpandida === letra}
                arrastando={arrastando}
                hoverAtiva={hoverRota === letra}
                onToggle={() => setRotaExpandida(rotaExpandida === letra ? null : letra)}
                onRemoverParada={(paradaId) => removerParada(slot.rota, paradaId)}
                onReordenarParadas={async (novasParadas) => {
                  if (!slot.rota) return
                  await atualizarRota(slot.rota.id, { paradas: novasParadas })
                }}
                onAdicionarAvulsa={(nome, end) => adicionarParadaAvulsa(slot.rota, nome, end)}
                onAbrirOSDetalhe={abrirOSPorId}
                onDragOverRota={(e) => {
                  if (!arrastando) return
                  e.preventDefault()
                  setHoverRota(letra)
                }}
                onDragLeaveRota={() => setHoverRota(null)}
                onDropRota={(e) => {
                  e.preventDefault()
                  if (arrastando?.os) adicionarOSemRota(arrastando.os, letra)
                  setArrastando(null)
                  setHoverRota(null)
                }}
              />
            )
          })}
        </AtlPanel>

        {/* 5. OS disponiveis */}
        {osDisponiveis.length > 0 && (
          <AtlPanel
            T={T} dark={dark}
            title="OS disponíveis"
            count={osDisponiveis.length}
            footer="Toque pra ver opções ou arraste pra uma rota.">
            <OSDisponiveisList
              T={T} dark={dark}
              osList={osDisponiveis}
              arrastando={arrastando}
              onDragStart={(os) => setArrastando({ os })}
              onDragEnd={() => { setArrastando(null); setHoverRota(null) }}
              onTap={(os) => setOsPopup({ ...os })}
            />
          </AtlPanel>
        )}
      </div>

      {osDetalheProps && <OSDetalhe T={T} dark={dark} {...osDetalheProps} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Subcomponentes Atlassian
// ════════════════════════════════════════════════════════════════════════

// Panel Atlassian inline (mesma assinatura do _AtlassianUI mas inline pra
// nao adicionar dep cruzado pages -> components/osDetalhe/acoes)
function AtlPanel({ T, dark, title, count, footer, children }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: ATL_RADIUS, overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
    }}>
      {title && (
        <div style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 10,
          background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
        }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: T.textPrimary,
            letterSpacing: '-0.005em', flex: 1,
          }}>{title}</div>
          {count != null && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: T.textMuted,
              background: dark ? 'rgba(255,255,255,0.07)' : '#DFE1E6',
              padding: '2px 7px', borderRadius: 99,
              fontVariantNumeric: 'tabular-nums',
            }}>{count}</span>
          )}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div style={{
          padding: '8px 14px',
          borderTop: `1px solid ${T.border}`,
          background: dark ? 'rgba(255,255,255,0.025)' : '#F7F8F9',
          fontSize: 12, color: T.textMuted,
        }}>{footer}</div>
      )}
    </div>
  )
}

// Segmented multi-select dos filtros — estilo iOS dentro do padrao
// Atlassian (radius 3, padding compacto). Suporta multi-select porque
// o filtro permite combinar etapas.
export function FiltroEtapas({ T, dark, ativas, onToggle }) {
  const bgContainer = dark ? 'rgba(120,120,128,0.24)' : 'rgba(118,118,128,0.12)'
  return (
    <div style={{
      display: 'flex',
      background: bgContainer,
      borderRadius: 3,
      padding: 2, gap: 0,
    }}>
      {FILTROS_ETAPA_LOGISTICA.map(f => {
        const ativo = ativas.has(f.id)
        return (
          <button key={f.id}
            type="button"
            onClick={() => onToggle(f.id)}
            style={{
              flex: 1, minWidth: 0, minHeight: 30,
              padding: '5px 4px',
              borderRadius: 3, border: 'none',
              background: ativo ? T.card : 'transparent',
              color: T.textPrimary,
              fontSize: 12, fontWeight: ativo ? 600 : 500,
              cursor: 'pointer', fontFamily: ATL_FONT,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '-0.005em',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: ativo
                ? (dark
                    ? '0 1px 2px rgba(0,0,0,.4)'
                    : '0 1px 2px rgba(9,30,66,0.18)')
                : 'none',
              transition: 'background .12s, box-shadow .12s',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

const OPCOES_AGENDA = [
  { id: 'hoje',   label: 'Hoje / Atrasadas',  icon: 'ti-calendar-event' },
  { id: 'amanha', label: 'Amanhã',            icon: 'ti-calendar-plus' },
  { id: 'semana', label: 'Semana',            icon: 'ti-calendar-week' },
]

export function FiltroAgenda({ T, dark, ativo, onChange }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {OPCOES_AGENDA.map(op => {
        const sel = ativo === op.id
        return (
          <button key={op.id} type="button"
            onClick={() => onChange(op.id)}
            style={{
              flex: 1, minWidth: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '6px 4px',
              borderRadius: ATL_RADIUS,
              border: `1px solid ${sel ? azul : T.border}`,
              background: sel ? azul + '22' : T.card,
              color: sel ? azul : T.textSecondary,
              fontSize: 11.5, fontWeight: sel ? 700 : 500,
              cursor: 'pointer', fontFamily: ATL_FONT,
              letterSpacing: '-0.005em',
              WebkitTapHighlightColor: 'transparent',
              transition: 'all .12s',
              boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.08)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
            <i className={`ti ${op.icon}`} style={{ fontSize: 13, flexShrink: 0 }} aria-hidden="true" />
            {op.label}
          </button>
        )
      })}
    </div>
  )
}

// Diagnostico — pills inline (verde X no mapa, amarelo X sem endereco etc)
export function DiagnosticoMapa({ T, dark, diagnostico, totalOSFiltradas, criandoRotasFalhou }) {
  if (totalOSFiltradas === 0 && !criandoRotasFalhou) return null
  const verde = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)
  return (
    <div style={{
      display: 'flex', gap: 5, flexWrap: 'wrap',
      fontSize: 11, fontVariantNumeric: 'tabular-nums',
      padding: '0 2px',
    }}>
      {diagnostico.comCoord > 0 && (
        <DiagPill T={T} cor={verde} icon="ti-map-pin-check">{diagnostico.comCoord} no mapa</DiagPill>
      )}
      {diagnostico.geocodificando > 0 && (
        <DiagPill T={T} cor={T.textMuted} icon="ti-loader-2">{diagnostico.geocodificando} carregando</DiagPill>
      )}
      {diagnostico.semEndereco > 0 && (
        <DiagPill T={T} cor={amarelo} icon="ti-map-pin-off" title="Cliente sem endereço">
          {diagnostico.semEndereco} sem endereço
        </DiagPill>
      )}
      {criandoRotasFalhou && (
        <DiagPill T={T} cor={amarelo} icon="ti-database-off" title="Rode sql/17-rota-nome.sql">
          SQL pendente
        </DiagPill>
      )}
    </div>
  )
}

function DiagPill({ T, cor, icon, title, children }) {
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 3,
      background: cor + '1f', color: cor,
      fontWeight: 600, fontSize: 11, letterSpacing: '-0.005em',
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 11 }} aria-hidden="true" />
      {children}
    </span>
  )
}

// Card flutuante (overlay no mapa quando OS clicada)
export function CardFlutuanteOS({ T, dark, os, onClose, onAdicionar, onAbrirDetalhe }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const tipoUi = normalizarTipoUi(tipoUiPorEtapa(os.etapa_db))
  const visual = VISUAL_TIPO[tipoUi] || VISUAL_TIPO.outros
  const corT = corEtapa(visual.corKey, dark)

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,.32)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: 14, zIndex: 20, borderRadius: ATL_RADIUS,
      backdropFilter: 'blur(2px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: ATL_RADIUS,
        padding: 14,
        width: '100%', maxWidth: 340,
        boxShadow: '0 8px 28px rgba(9,30,66,0.28)',
        display: 'flex', flexDirection: 'column', gap: 11,
        fontFamily: ATL_FONT,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: ATL_RADIUS,
            background: corT + '22', color: corT,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className={`ti ${visual.icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, color: corT,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{visual.label}</div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: T.textPrimary,
              fontVariantNumeric: 'tabular-nums', marginTop: 1,
            }}>OS #{os.numero}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{
            width: 26, height: 26, borderRadius: 3,
            background: 'transparent', border: 'none',
            color: T.textMuted, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
        </div>

        <div style={{
          fontSize: 14.5, fontWeight: 600, color: T.textPrimary,
          letterSpacing: '-0.005em', lineHeight: 1.25,
        }}>{os.cliente_nome || 'Sem cliente'}</div>

        {os.endereco && (
          <div style={{
            fontSize: 12.5, color: T.textSecondary,
            display: 'flex', gap: 7, alignItems: 'flex-start',
            lineHeight: 1.35,
          }}>
            <i className="ti ti-map-pin" style={{
              fontSize: 13, marginTop: 1, color: T.textMuted, flexShrink: 0,
            }} aria-hidden="true" />
            <span>{os.endereco}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <DiagPill T={T} cor={T.textMuted} icon="ti-tag">{os.etapa_label}</DiagPill>
          {os.data_agendamento && (
            <DiagPill T={T} cor={amarelo} icon="ti-calendar-event">
              {new Date(os.data_agendamento).toLocaleDateString('pt-BR')}
            </DiagPill>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
          {['A', 'B', 'C'].map(letra => (
            <button key={letra} onClick={() => onAdicionar(letra)} style={{
              flex: 1, height: 36, borderRadius: 3,
              border: 'none', background: azul, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: ATL_FONT,
              WebkitTapHighlightColor: 'transparent',
              letterSpacing: '-0.005em',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
              {letra}
            </button>
          ))}
        </div>

        <button onClick={onAbrirDetalhe} style={{
          background: 'transparent', border: 'none',
          padding: '2px 0', color: azul,
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: ATL_FONT, letterSpacing: '-0.005em',
          textAlign: 'left',
        }}>Ver OS completa →</button>
      </div>
    </div>
  )
}

// Lista de OS disponiveis — cada item draggable + tap
function OSDisponiveisList({ T, dark, osList, arrastando, onDragStart, onDragEnd, onTap }) {
  return (
    <div>
      {osList.map((os, idx) => {
        const tipoUi = normalizarTipoUi(tipoUiPorEtapa(os.etapa_db))
        const visual = VISUAL_TIPO[tipoUi] || VISUAL_TIPO.outros
        const corT = corEtapa(visual.corKey, dark)
        const sendoArrastado = arrastando?.os?.id === os.id

        return (
          <div
            key={os.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', String(os.id))
              onDragStart(os)
            }}
            onDragEnd={onDragEnd}
            onClick={() => onTap(os)}
            style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr auto',
              gap: 10, alignItems: 'center',
              padding: '10px 14px',
              borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
              cursor: 'grab',
              opacity: sendoArrastado ? 0.4 : 1,
              transition: 'opacity .15s',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
            }}>
            <div style={{
              width: 28, height: 28, borderRadius: ATL_RADIUS,
              background: corT + '22', color: corT,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={`ti ${visual.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 13, color: T.textPrimary, fontWeight: 600,
                letterSpacing: '-0.005em', lineHeight: 1.25,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{os.cliente_nome || 'Sem cliente'}</div>
              <div style={{
                fontSize: 11.5, color: T.textMuted,
                display: 'flex', gap: 5, marginTop: 1, alignItems: 'center',
              }}>
                <span style={{ color: corT, fontWeight: 600 }}>{visual.label}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>OS #{os.numero}</span>
                {os.data_agendamento && (
                  <>
                    <span style={{ opacity: 0.5 }}>·</span>
                    <i className="ti ti-calendar-event"
                       style={{ fontSize: 11, color: corEtapa('yellow', dark) }}
                       aria-hidden="true" />
                  </>
                )}
              </div>
            </div>

            <i className="ti ti-grip-vertical" style={{
              fontSize: 14, color: T.textDim, flexShrink: 0,
            }} aria-hidden="true" />
          </div>
        )
      })}
    </div>
  )
}

// Accordion de rota A/B/C com drop target
export function RotaAccordion({
  T, dark, slot, letra, primeiro, expandida, onToggle,
  onRemoverParada, onAdicionarAvulsa, onAbrirOSDetalhe, onReordenarParadas,
  arrastando, hoverAtiva, onDragOverRota, onDragLeaveRota, onDropRota,
}) {
  const azul = corEtapa('blue', dark)
  const paradas = slot.rota?.paradas || []
  const indisponivel = !slot.rota
  const notify = useToast()
  const [avulsaAberta, setAvulsaAberta] = useState(false)
  const [avulsaNome, setAvulsaNome] = useState('')
  const [avulsaEnd, setAvulsaEnd] = useState('')
  const [picker, setPicker] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function handleEnviar(funcionario) {
    setPicker(false)
    setEnviando(true)
    try {
      const texto = await gerarMensagemRota(slot)
      if (!texto) { notify('info', 'Rota sem paradas para enviar'); return }
      const url = `https://wa.me/${funcionario.fone}?text=${encodeURIComponent(texto)}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      notify('erro', 'Erro ao gerar mensagem da rota')
      console.error('[EnviarRota]', err)
    } finally {
      setEnviando(false)
    }
  }

  // Drag-and-drop de reordenação interna
  const dragSrcIdx = useRef(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  function handleDragStart(e, idx) {
    e.stopPropagation() // não aciona o drag de OS→rota externo
    dragSrcIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'reorder') // marca pra distinguir do drag externo
  }

  function handleDragOver(e, idx) {
    if (dragSrcIdx.current === null) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (idx !== dragOverIdx) setDragOverIdx(idx)
  }

  function handleDrop(e, idx) {
    e.preventDefault()
    e.stopPropagation()
    const src = dragSrcIdx.current
    if (src === null || src === idx) { dragSrcIdx.current = null; setDragOverIdx(null); return }
    const novo = [...paradas]
    const [item] = novo.splice(src, 1)
    novo.splice(idx, 0, item)
    onReordenarParadas?.(novo)
    dragSrcIdx.current = null
    setDragOverIdx(null)
  }

  function handleDragEnd() {
    dragSrcIdx.current = null
    setDragOverIdx(null)
  }

  const dropAtivo = !!arrastando && !indisponivel
  const bgHover = hoverAtiva
    ? (dark ? 'rgba(91,155,213,0.16)' : '#E6F1FB')
    : 'transparent'

  return (
    <div
      onDragOver={dropAtivo ? onDragOverRota : undefined}
      onDragLeave={dropAtivo ? onDragLeaveRota : undefined}
      onDrop={dropAtivo ? onDropRota : undefined}
      style={{
        borderTop: primeiro ? 'none' : `1px solid ${T.border}`,
        opacity: indisponivel ? 0.55 : 1,
        background: bgHover,
        transition: 'background .12s',
      }}>
      {/* Header: toggle accordion + botão Enviar Rota */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={indisponivel ? undefined : onToggle}
          disabled={indisponivel}
          style={{
            flex: 1, minWidth: 0, minHeight: 48,
            padding: '10px 14px',
            background: 'transparent', border: 'none',
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: indisponivel ? 'not-allowed' : 'pointer',
            fontFamily: ATL_FONT,
            WebkitTapHighlightColor: 'transparent',
          }}>
          <div style={{
            width: 30, height: 30, borderRadius: ATL_RADIUS,
            background: expandida ? azul : (dark ? 'rgba(91,155,213,0.16)' : '#E6F1FB'),
            color: expandida ? '#fff' : azul,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
            flexShrink: 0, letterSpacing: '-0.01em',
            transition: 'background .15s',
          }}>{letra}</div>

          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 600, color: T.textPrimary,
              letterSpacing: '-0.005em', lineHeight: 1.2,
            }}>
              Rota {letra}
              {indisponivel && (
                <span style={{
                  fontSize: 11, color: T.textMuted, fontWeight: 500, marginLeft: 6,
                }}>· pendente</span>
              )}
            </div>
            <div style={{
              fontSize: 11.5, color: T.textMuted,
              fontVariantNumeric: 'tabular-nums', marginTop: 1,
            }}>
              {paradas.length === 0
                ? 'Sem paradas'
                : `${paradas.length} ${paradas.length === 1 ? 'parada' : 'paradas'}`}
            </div>
          </div>

          {!indisponivel && (
            <i className="ti ti-chevron-right" style={{
              fontSize: 13, color: T.textDim,
              transform: expandida ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform .2s cubic-bezier(0.32, 0.72, 0, 1)',
              flexShrink: 0,
            }} aria-hidden="true" />
          )}
        </button>

        {/* Botão Enviar Rota — só aparece quando tem paradas */}
        {!indisponivel && paradas.length > 0 && (
          <div style={{ position: 'relative', flexShrink: 0, paddingRight: 10 }}>
            <button
              onClick={(e) => { e.stopPropagation(); setPicker(v => !v) }}
              disabled={enviando}
              title="Enviar rota por WhatsApp"
              aria-label="Enviar rota por WhatsApp"
              style={{
                height: 30, padding: '0 9px',
                borderRadius: ATL_RADIUS,
                border: `1px solid ${T.border}`,
                background: 'transparent',
                color: azul,
                cursor: enviando ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600,
                fontFamily: ATL_FONT,
                WebkitTapHighlightColor: 'transparent',
                letterSpacing: '-0.005em',
              }}>
              <i className="ti ti-brand-whatsapp" style={{ fontSize: 14 }} aria-hidden="true" />
              {enviando ? '…' : 'Enviar'}
            </button>

            {picker && (
              <>
                {/* Overlay pra fechar ao clicar fora */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 29 }}
                  onClick={() => setPicker(false)}
                />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, zIndex: 30,
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: ATL_RADIUS,
                  boxShadow: '0 4px 16px rgba(9,30,66,0.22)',
                  marginTop: 4, minWidth: 165,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '7px 12px',
                    borderBottom: `1px solid ${T.border}`,
                    fontSize: 11, fontWeight: 700, color: T.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>Enviar para</div>
                  {FUNCIONARIOS_WPP.map((f, idx) => (
                    <button
                      key={f.nome}
                      onClick={() => handleEnviar(f)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '9px 12px',
                        background: 'transparent', border: 'none',
                        borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
                        color: T.textPrimary,
                        fontSize: 13, fontWeight: 500,
                        cursor: 'pointer',
                        fontFamily: ATL_FONT,
                        letterSpacing: '-0.005em',
                        WebkitTapHighlightColor: 'transparent',
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : '#F4F5F7' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                      <i className="ti ti-user-circle" style={{ fontSize: 15, color: azul, flexShrink: 0 }} aria-hidden="true" />
                      {f.nome}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {expandida && !indisponivel && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {paradas.length === 0 ? (
            <div style={{
              padding: '16px 14px',
              fontSize: 12.5, color: T.textMuted,
              textAlign: 'center', letterSpacing: '-0.005em',
              fontStyle: 'italic',
            }}>
              Sem paradas. Toque num pino do mapa ou arraste uma OS aqui.
            </div>
          ) : (
            paradas.map((p, idx) => {
              const tipoUi = normalizarTipoUi(p.tipo)
              const visual = VISUAL_TIPO[tipoUi] || VISUAL_TIPO.outros
              const corT = corEtapa(visual.corKey, dark)
              const isDragOver = dragOverIdx === idx && dragSrcIdx.current !== null && dragSrcIdx.current !== idx
              return (
                <div
                  key={p.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    display: 'grid', gridTemplateColumns: 'auto auto 1fr auto',
                    gap: 8, alignItems: 'center',
                    padding: '8px 14px',
                    borderTop: isDragOver
                      ? `2px solid #5B9BD5`
                      : (idx === 0 ? 'none' : `1px solid ${T.border}`),
                    cursor: 'grab',
                    userSelect: 'none',
                    transition: 'border-color .1s',
                  }}>
                  {/* Handle de drag */}
                  <i className="ti ti-grip-vertical" style={{
                    fontSize: 14, color: T.textDim,
                    cursor: 'grab', flexShrink: 0,
                  }} aria-hidden="true" />

                  <div style={{
                    width: 28, height: 28, borderRadius: ATL_RADIUS,
                    background: corT + '22', color: corT,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    flexShrink: 0, letterSpacing: '-0.01em',
                  }}>{letra}{idx + 1}</div>

                  <div
                    onClick={p.os_id ? () => onAbrirOSDetalhe(p.os_id) : undefined}
                    style={{ minWidth: 0, cursor: p.os_id ? 'pointer' : 'default' }}>
                    <div style={{
                      fontSize: 13, color: T.textPrimary, fontWeight: 600,
                      letterSpacing: '-0.005em', lineHeight: 1.25,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.cliente_nome || 'Sem cliente'}</div>
                    <div style={{
                      fontSize: 11.5, color: T.textMuted,
                      display: 'flex', gap: 5, marginTop: 1,
                    }}>
                      <span style={{ color: corT, fontWeight: 600 }}>{visual.label}</span>
                      {p.os_num && (
                        <>
                          <span style={{ opacity: 0.5 }}>·</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>OS #{p.os_num}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoverParada(p.id)}
                    aria-label="Remover parada"
                    style={{
                      width: 24, height: 24, borderRadius: 3,
                      background: 'transparent', border: 'none',
                      color: T.textMuted, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    <i className="ti ti-x" style={{ fontSize: 13 }} aria-hidden="true" />
                  </button>
                </div>
              )
            })
          )}

          {/* Parada avulsa */}
          {avulsaAberta ? (
            <div style={{
              padding: 12,
              borderTop: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.025)' : '#F7F8F9',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <AtlInput T={T} dark={dark}
                value={avulsaNome}
                onChange={(e) => setAvulsaNome(e.target.value)}
                placeholder="Ex.: Buscar peça, Posto…"
                autoFocus />
              <AtlInput T={T} dark={dark}
                value={avulsaEnd}
                onChange={(e) => setAvulsaEnd(e.target.value)}
                placeholder="Endereço (opcional)" />
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => { setAvulsaAberta(false); setAvulsaNome(''); setAvulsaEnd('') }}
                  style={{
                    flex: 1, height: 32, borderRadius: 3,
                    border: `1px solid ${T.border}`,
                    background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
                    color: T.textPrimary,
                    fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: ATL_FONT,
                    letterSpacing: '-0.005em',
                    WebkitTapHighlightColor: 'transparent',
                  }}>Cancelar</button>
                <button
                  onClick={() => {
                    onAdicionarAvulsa(avulsaNome, avulsaEnd)
                    setAvulsaAberta(false); setAvulsaNome(''); setAvulsaEnd('')
                  }}
                  disabled={!avulsaNome.trim()}
                  style={{
                    flex: 1, height: 32, borderRadius: 3,
                    border: 'none', background: azul, color: '#fff',
                    fontSize: 13, fontWeight: 600,
                    cursor: avulsaNome.trim() ? 'pointer' : 'not-allowed',
                    opacity: avulsaNome.trim() ? 1 : 0.5,
                    fontFamily: ATL_FONT, letterSpacing: '-0.005em',
                    WebkitTapHighlightColor: 'transparent',
                  }}>Adicionar</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAvulsaAberta(true)}
              style={{
                width: '100%', minHeight: 36,
                padding: '8px 14px',
                background: 'transparent', border: 'none',
                borderTop: `1px solid ${T.border}`,
                color: azul,
                fontSize: 12.5, fontWeight: 500,
                cursor: 'pointer', fontFamily: ATL_FONT,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                letterSpacing: '-0.005em',
                WebkitTapHighlightColor: 'transparent',
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

function AtlInput({ T, dark, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%', boxSizing: 'border-box',
        height: 32, padding: '0 10px',
        borderRadius: 3,
        border: `1px solid ${T.border}`,
        background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
        color: T.textPrimary,
        fontSize: 13, outline: 'none', fontFamily: ATL_FONT,
        letterSpacing: '-0.005em',
        ...props.style,
      }}
    />
  )
}
