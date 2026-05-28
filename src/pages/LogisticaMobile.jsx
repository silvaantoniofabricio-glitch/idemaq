// src/pages/LogisticaMobile.jsx
// Reescrita Apple HIG (27/05/2026 r2) — mantém toda a lógica de useRotas/useOSLogistica
// mas aplica o mesmo design system de PainelMobile/KPIGridMobile:
//   - Cards via T.card + elevation no light (sem border)
//   - Pills compactos (filtros) wrap em vez de scroll horizontal
//   - Section labels iOS Settings (10.5px uppercase tracked)
//   - Grouped lists com hairlines T.border + chevron rotate
//   - Tinted icon containers (34x34 borderRadius 10)
//   - Touch targets ≥44pt, weights 600/700, letterSpacing -0.01em

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useToast } from '../components/ui'
import { corEtapa, corHero } from '../utils/colors'
import { useRotas } from '../hooks/useRotas'
import { useOSLogistica, FILTROS_ETAPA_LOGISTICA } from '../hooks/useOSLogistica'
import { useGeocodeEnderecos } from '../hooks/useGeocodeEnderecos'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import MapaLogistica from '../components/logistica/MapaLogistica'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

const HOJE = new Date().toISOString().slice(0, 10)

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
// Página
// ════════════════════════════════════════════════════════════════════════

export default function LogisticaMobile({ T, dark }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  const [etapasAtivas, setEtapasAtivas] = useState(ETAPAS_DEFAULT_LOGISTICA)
  const [rotaExpandida, setRotaExpandida] = useState('A')
  const [osPopup, setOsPopup] = useState(null)
  const [criandoRotasFalhou, setCriandoRotasFalhou] = useState(false)
  const [arrastando, setArrastando] = useState(null)   // {os} sendo arrastado
  const [hoverRota, setHoverRota] = useState(null)     // letra A/B/C com drag over
  const criandoRotasRef = useRef(false)

  const dataAtiva = HOJE

  const incluirPagamento = etapasAtivas.has('pagamento')
  const { osList } = useOSLogistica({ incluirPagamento })
  const { rotas, criar: criarRota, atualizar: atualizarRota } = useRotas()
  const { abrirOSPorId, modalProps: osDetalheProps } = useOSDetalheModal({ notify })

  const osFiltradas = useMemo(
    () => osList.filter(o => etapasAtivas.has(o.etapa_db)),
    [osList, etapasAtivas]
  )

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

  // OS disponíveis (matching filtros e ainda fora de rota) — usadas pros cards arrastáveis
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
      flex: 1, overflowY: 'auto', background: T.bg,
      minHeight: 0,
    }}>
      <div style={{
        padding: '12px 14px 96px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <FiltroEtapas
          T={T} dark={dark}
          ativas={etapasAtivas}
          onToggle={(id) => setEtapasAtivas(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id); else next.add(id)
            return next
          })}
        />

        <MapaCard T={T} dark={dark}>
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
        </MapaCard>

        <DiagnosticoMapa
          T={T} dark={dark}
          diagnostico={diagnostico}
          totalOSFiltradas={osFiltradas.length}
          criandoRotasFalhou={criandoRotasFalhou}
        />

        <SectionLabel T={T}>Rotas de hoje</SectionLabel>

        <div style={{
          background: T.card,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
        }}>
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
                  if (arrastando?.os) {
                    adicionarOSemRota(arrastando.os, letra)
                  }
                  setArrastando(null)
                  setHoverRota(null)
                }}
              />
            )
          })}
        </div>

        {osDisponiveis.length > 0 && (
          <>
            <SectionLabel T={T}>
              OS disponíveis ({osDisponiveis.length})
            </SectionLabel>
            <OSDisponiveisList
              T={T} dark={dark}
              osList={osDisponiveis}
              arrastando={arrastando}
              onDragStart={(os) => setArrastando({ os })}
              onDragEnd={() => { setArrastando(null); setHoverRota(null) }}
              onTap={(os) => setOsPopup({ ...os })}
            />
          </>
        )}
      </div>

      {osDetalheProps && <OSDetalhe T={T} dark={dark} {...osDetalheProps} />}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
// Subcomponentes HIG
// ════════════════════════════════════════════════════════════════════════

// Section label discreto, estilo iOS Settings
function SectionLabel({ T, children }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700,
      color: T.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      padding: '2px 4px 0',
    }}>
      {children}
    </div>
  )
}

// Card que envolve o mapa
function MapaCard({ T, dark, children }) {
  return (
    <div style={{
      position: 'relative',
      background: T.card,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
    }}>
      {children}
    </div>
  )
}

// Segmented control HIG — estilo iOS UISegmentedControl
// Multi-select: cada segmento ativo fica "elevado" (T.card + shadow);
// inativo fica transparente. Container unico com bg cinza claro.
export function FiltroEtapas({ T, dark, ativas, onToggle }) {
  const bgContainer = dark ? 'rgba(120,120,128,0.24)' : 'rgba(118,118,128,0.12)'

  return (
    <div style={{
      display: 'flex',
      background: bgContainer,
      borderRadius: 9,
      padding: 2,
      gap: 0,
    }}>
      {FILTROS_ETAPA_LOGISTICA.map((f, i) => {
        const ativo = ativas.has(f.id)
        return (
          <button
            key={f.id}
            onClick={() => onToggle(f.id)}
            style={{
              flex: 1,
              minWidth: 0,
              minHeight: 30,
              padding: '5px 4px',
              borderRadius: 7,
              border: 'none',
              background: ativo ? T.card : 'transparent',
              color: T.textPrimary,
              fontSize: 12,
              fontWeight: ativo ? 600 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '-0.01em',
              WebkitTapHighlightColor: 'transparent',
              boxShadow: ativo
                ? (dark
                    ? '0 3px 8px rgba(0,0,0,0.24), 0 1px 2px rgba(0,0,0,0.16)'
                    : '0 3px 8px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)')
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
        <Pill T={T} cor={verde} icon="ti-map-pin-check">{diagnostico.comCoord} no mapa</Pill>
      )}
      {diagnostico.geocodificando > 0 && (
        <Pill T={T} cor={T.textMuted} icon="ti-loader-2">{diagnostico.geocodificando} carregando</Pill>
      )}
      {diagnostico.semEndereco > 0 && (
        <Pill T={T} cor={amarelo} icon="ti-map-pin-off" title="Cliente sem endereço">
          {diagnostico.semEndereco} sem endereço
        </Pill>
      )}
      {criandoRotasFalhou && (
        <Pill T={T} cor={amarelo} icon="ti-database-off" title="Rode sql/17-rota-nome.sql">
          SQL pendente
        </Pill>
      )}
    </div>
  )
}

function Pill({ T, cor, icon, title, children }) {
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 999,
      background: cor + '1f', color: cor,
      fontWeight: 600, fontSize: 11,
      letterSpacing: '-0.005em',
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 11 }} aria-hidden="true" />
      {children}
    </span>
  )
}

// Card flutuante sobre o mapa quando OS é clicada
export function CardFlutuanteOS({ T, dark, os, onClose, onAdicionar, onAbrirDetalhe }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const tipoUi = tipoUiPorEtapa(os.etapa_db)
  const visual = VISUAL_TIPO[tipoUi]
  const corT = corEtapa(visual.corKey, dark)

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0,
      background: 'rgba(0,0,0,.32)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: 14, zIndex: 20, borderRadius: 16,
      backdropFilter: 'blur(2px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: T.card,
        borderRadius: 14,
        padding: 14,
        width: '100%', maxWidth: 340,
        boxShadow: '0 8px 28px rgba(0,0,0,.28)',
        display: 'flex', flexDirection: 'column', gap: 11,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: corT + '22', color: corT,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className={`ti ${visual.icon}`} style={{ fontSize: 18 }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, color: corT,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>{visual.label}</div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: corHero(dark),
              fontVariantNumeric: 'tabular-nums', marginTop: 1,
            }}>OS #{os.numero}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{
            width: 28, height: 28, borderRadius: '50%',
            background: dark ? 'rgba(255,255,255,0.08)' : '#f0f0f3',
            border: 'none', color: T.textMuted, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
        </div>

        <div style={{
          fontSize: 15, fontWeight: 600, color: corHero(dark),
          letterSpacing: '-0.01em', lineHeight: 1.25,
        }}>{os.cliente_nome || 'Sem cliente'}</div>

        {os.endereco && (
          <div style={{
            fontSize: 12.5, color: T.textSecondary,
            display: 'flex', gap: 7, alignItems: 'flex-start',
            lineHeight: 1.35,
          }}>
            <i className="ti ti-map-pin" style={{ fontSize: 13, marginTop: 1, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />
            <span>{os.endereco}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          <Pill T={T} cor={T.textMuted} icon="ti-tag">{os.etapa_label}</Pill>
          {os.data_agendamento && (
            <Pill T={T} cor={amarelo} icon="ti-calendar-event">
              {new Date(os.data_agendamento).toLocaleDateString('pt-BR')}
            </Pill>
          )}
        </div>

        <div style={{ display: 'flex', gap: 7, marginTop: 2 }}>
          {['A', 'B', 'C'].map(letra => (
            <button key={letra} onClick={() => onAdicionar(letra)} style={{
              flex: 1, height: 42, borderRadius: 10,
              border: 'none', background: azul, color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              WebkitTapHighlightColor: 'transparent',
              letterSpacing: '-0.01em',
            }}>+ {letra}</button>
          ))}
        </div>

        <button onClick={onAbrirDetalhe} style={{
          background: 'transparent', border: 'none',
          padding: '2px 0', color: azul,
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit', letterSpacing: '-0.005em',
        }}>Ver OS completa →</button>
      </div>
    </div>
  )
}

// Lista de OS disponíveis pra arrastar/tocar — abaixo das rotas
function OSDisponiveisList({ T, dark, osList, arrastando, onDragStart, onDragEnd, onTap }) {
  return (
    <div style={{
      background: T.card,
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
    }}>
      {osList.map((os, idx) => {
        const tipoUi = tipoUiPorEtapa(os.etapa_db)
        const visual = VISUAL_TIPO[tipoUi]
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
              gap: 11, alignItems: 'center',
              padding: '11px 14px',
              minHeight: 60,
              borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
              cursor: 'grab',
              opacity: sendoArrastado ? 0.4 : 1,
              transition: 'opacity .15s',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              touchAction: 'none',
            }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: corT + '22', color: corT,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={`ti ${visual.icon}`} style={{ fontSize: 17 }} aria-hidden="true" />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 14, color: corHero(dark), fontWeight: 600,
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
                    <i className="ti ti-calendar-event" style={{
                      fontSize: 11, color: corEtapa('yellow', dark),
                    }} aria-hidden="true" />
                  </>
                )}
              </div>
            </div>

            <i className="ti ti-grip-vertical" style={{
              fontSize: 16, color: T.textDim, flexShrink: 0,
            }} aria-hidden="true" />
          </div>
        )
      })}
    </div>
  )
}

// Accordion item de cada rota A/B/C — hairline separators + drop target
export function RotaAccordion({
  T, dark, slot, letra, primeiro, expandida, onToggle,
  onRemoverParada, onAdicionarAvulsa, onAbrirOSDetalhe,
  arrastando, hoverAtiva, onDragOverRota, onDragLeaveRota, onDropRota,
}) {
  const azul = corEtapa('blue', dark)
  const paradas = slot.rota?.paradas || []
  const indisponivel = !slot.rota
  const [avulsaAberta, setAvulsaAberta] = useState(false)
  const [avulsaNome, setAvulsaNome] = useState('')
  const [avulsaEnd, setAvulsaEnd] = useState('')

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
      <button
        onClick={indisponivel ? undefined : onToggle}
        disabled={indisponivel}
        style={{
          width: '100%', minHeight: 52,
          padding: '10px 14px',
          background: 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', gap: 11,
          cursor: indisponivel ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: expandida ? azul : (dark ? 'rgba(91,155,213,0.16)' : '#E6F1FB'),
          color: expandida ? '#fff' : azul,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 700,
          flexShrink: 0, letterSpacing: '-0.01em',
          transition: 'background .15s',
        }}>{letra}</div>

        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
          <div style={{
            fontSize: 14.5, fontWeight: 600, color: corHero(dark),
            letterSpacing: '-0.01em', lineHeight: 1.2,
          }}>
            Rota {letra}
            {indisponivel && (
              <span style={{
                fontSize: 11, color: T.textMuted, fontWeight: 500, marginLeft: 6,
              }}>· pendente</span>
            )}
          </div>
          <div style={{
            fontSize: 12, color: T.textMuted,
            fontVariantNumeric: 'tabular-nums', marginTop: 1,
          }}>
            {paradas.length === 0
              ? 'Sem paradas'
              : `${paradas.length} ${paradas.length === 1 ? 'parada' : 'paradas'}`}
          </div>
        </div>

        {!indisponivel && (
          <i className="ti ti-chevron-right" style={{
            fontSize: 14, color: T.textDim,
            transform: expandida ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform .2s cubic-bezier(0.32, 0.72, 0, 1)',
            flexShrink: 0,
          }} aria-hidden="true" />
        )}
      </button>

      {expandida && !indisponivel && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {paradas.length === 0 ? (
            <div style={{
              padding: '18px 14px',
              fontSize: 12.5, color: T.textMuted,
              textAlign: 'center',
              letterSpacing: '-0.005em',
            }}>
              Toque num pino do mapa pra adicionar
            </div>
          ) : (
            paradas.map((p, idx) => {
              const tipoUi = normalizarTipoUi(p.tipo)
              const visual = VISUAL_TIPO[tipoUi]
              const corT = corEtapa(visual.corKey, dark)
              return (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                  gap: 11, alignItems: 'center',
                  padding: '10px 14px',
                  borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
                  minHeight: 54,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: corT + '22', color: corT,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11.5, fontWeight: 700,
                    flexShrink: 0, letterSpacing: '-0.01em',
                  }}>{letra}{idx + 1}</div>

                  <div
                    onClick={p.os_id ? () => onAbrirOSDetalhe(p.os_id) : undefined}
                    style={{ minWidth: 0, cursor: p.os_id ? 'pointer' : 'default' }}
                  >
                    <div style={{
                      fontSize: 14, color: corHero(dark), fontWeight: 600,
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
                      width: 30, height: 30, borderRadius: 8,
                      background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      border: 'none', color: T.textMuted,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    <i className="ti ti-x" style={{ fontSize: 13 }} aria-hidden="true" />
                  </button>
                </div>
              )
            })
          )}

          {avulsaAberta ? (
            <div style={{
              padding: 12,
              borderTop: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.02)' : '#FAFAFC',
              display: 'flex', flexDirection: 'column', gap: 7,
            }}>
              <HigInput T={T} dark={dark}
                value={avulsaNome}
                onChange={(e) => setAvulsaNome(e.target.value)}
                placeholder="Ex.: Buscar peça, Posto…"
                autoFocus />
              <HigInput T={T} dark={dark}
                value={avulsaEnd}
                onChange={(e) => setAvulsaEnd(e.target.value)}
                placeholder="Endereço (opcional)" />
              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  onClick={() => { setAvulsaAberta(false); setAvulsaNome(''); setAvulsaEnd('') }}
                  style={{
                    flex: 1, height: 38, borderRadius: 10,
                    border: 'none',
                    background: dark ? 'rgba(255,255,255,0.07)' : '#e4e4e9',
                    color: T.textPrimary,
                    fontSize: 13.5, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}>Cancelar</button>
                <button
                  onClick={() => {
                    onAdicionarAvulsa(avulsaNome, avulsaEnd)
                    setAvulsaAberta(false); setAvulsaNome(''); setAvulsaEnd('')
                  }}
                  disabled={!avulsaNome.trim()}
                  style={{
                    flex: 1, height: 38, borderRadius: 10,
                    border: 'none', background: azul, color: '#fff',
                    fontSize: 13.5, fontWeight: 600,
                    cursor: avulsaNome.trim() ? 'pointer' : 'not-allowed',
                    opacity: avulsaNome.trim() ? 1 : 0.5,
                    fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}>Adicionar</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAvulsaAberta(true)}
              style={{
                width: '100%', minHeight: 44,
                padding: '11px 14px',
                background: 'transparent', border: 'none',
                borderTop: `1px solid ${T.border}`,
                color: azul,
                fontSize: 13.5, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                letterSpacing: '-0.005em',
                WebkitTapHighlightColor: 'transparent',
              }}>
              <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
              Parada avulsa
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function HigInput({ T, dark, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%', boxSizing: 'border-box',
        height: 38, padding: '0 11px',
        borderRadius: 10,
        border: `1px solid ${T.border}`,
        background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
        color: T.textPrimary,
        fontSize: 13.5,
        outline: 'none', fontFamily: 'inherit',
        letterSpacing: '-0.005em',
        ...props.style,
      }}
    />
  )
}
