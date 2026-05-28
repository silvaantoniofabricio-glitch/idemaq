// src/pages/LogisticaMobile.jsx
// Reestruturação mobile da página /logistica (pedido 21/05/2026).
// Visual reescrito em Apple HIG (pill filters, large title, flat buttons,
// segmented-style accordion, refined typography). Lógica preservada.
//
// CONCEITO:
//   - Mapa em cima mostra TODAS as OS ativas do Kanban + paradas já em rota.
//   - Filtro de etapas (chips) controla quais OS viram pino.
//   - Tap num pino "disponível" abre card flutuante com dados da OS e botões
//     "+A / +B / +C" pra adicionar direto a uma das 3 rotas do dia.
//   - Embaixo, 3 cards accordion (Rota A / B / C). Click expande a lista.
//   - Tipo da parada derivado da etapa: agendamento → coleta · outras → entrega
//     · pagamento → receber · avulsa → outros.
//   - Pinos em rota mostram código (A1, A2, B1…) em vez de letra do tipo.
//   - Pinos de OS com `data_agendamento` ganham anel amarelo de atenção.

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useToast } from '../components/ui'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { useRotas } from '../hooks/useRotas'
import { useOSLogistica, FILTROS_ETAPA_LOGISTICA, tipoParadaPorEtapa } from '../hooks/useOSLogistica'
import { useGeocodeEnderecos } from '../hooks/useGeocodeEnderecos'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import MapaLogistica from '../components/logistica/MapaLogistica'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

const HOJE = new Date().toISOString().slice(0, 10)

// SF font stack — padrão Apple HIG do projeto
const SF_STACK = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif'

// Exportados pra reuso na versão desktop (mesmo conceito, layout diferente).
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
  coleta:  { cor: '#5B9BD5', label: 'Coleta',  icon: 'ti-arrow-down-circle' },
  entrega: { cor: '#8FBC55', label: 'Entrega', icon: 'ti-truck-delivery' },
  receber: { cor: '#FFD966', label: 'Receber', icon: 'ti-cash' },
  outros:  { cor: '#B8CCE4', label: 'Outros',  icon: 'ti-dots' },
}

const ETAPAS_DEFAULT = ETAPAS_DEFAULT_LOGISTICA

export default function LogisticaMobile({ T, dark }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  // ─── Estado ───────────────────────────────────────────────────────────
  const [etapasAtivas, setEtapasAtivas] = useState(ETAPAS_DEFAULT)
  const [rotaExpandida, setRotaExpandida] = useState('A')
  const [osPopup, setOsPopup] = useState(null)
  const [criandoRotasFalhou, setCriandoRotasFalhou] = useState(false)
  const criandoRotasRef = useRef(false)

  const dataAtiva = HOJE

  // ─── Hooks de dados ───────────────────────────────────────────────────
  const incluirPagamento = etapasAtivas.has('pagamento')
  const { osList } = useOSLogistica({ incluirPagamento })
  const {
    rotas, criar: criarRota, atualizar: atualizarRota,
  } = useRotas()

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
              console.error('[Logistica] UNIQUE violation criando', nome, res.error)
              break
            }
            setCriandoRotasFalhou(true)
            notify('erro', `Falha ${nome}: ${res.error.message}`)
            console.error('[Logistica] erro inesperado criando', nome, res.error)
            break
          }
        }
      } finally {
        criandoRotasRef.current = false
      }
    })()
  }, [dataAtiva, slotsRotas, criandoRotasFalhou, criarRota, notify])

  // ─── Pinos pro mapa ───────────────────────────────────────────────────
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
          lat: Number(p.lat),
          lng: Number(p.lng),
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
      padding: '12px 14px 96px',
      flex: 1, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 12,
      fontFamily: SF_STACK,
    }}>
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
        <div style={{
          borderRadius: 16, overflow: 'hidden',
          background: T.card,
          boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
        }}>
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

      <DiagnosticoMapa
        T={T} dark={dark}
        diagnostico={diagnostico}
        totalOSFiltradas={osFiltradas.length}
        criandoRotasFalhou={criandoRotasFalhou}
      />

      {/* Section header pras rotas, estilo iOS Settings */}
      <SectionLabel T={T}>Rotas de hoje</SectionLabel>

      {/* Grouped card list — 3 rotas num bloco visualmente único */}
      <div style={{
        background: T.card,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
      }}>
        {slotsRotas.map((slot, idx) => (
          <RotaAccordion
            key={slot.nome}
            T={T} dark={dark}
            slot={slot}
            letra={LETRA_POR_SLOT[slot.nome]}
            primeiro={idx === 0}
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
// Subcomponentes (Apple HIG)
// ═══════════════════════════════════════════════════════════════════════

// Large title estilo iOS Settings/Mail
function LargeTitle({ T, dark }) {
  return (
    <div style={{ paddingTop: 4 }}>
      <h1 style={{
        fontSize: 30, fontWeight: 700, margin: 0,
        color: corHero(dark),
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
      }}>
        Logística
      </h1>
      <div style={{
        fontSize: 13, color: T.textMuted, marginTop: 2,
        letterSpacing: '-0.005em',
      }}>
        Planejamento de rotas · hoje
      </div>
    </div>
  )
}

// Section label discreto, estilo iOS Grouped List
function SectionLabel({ T, children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600,
      color: T.textMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      padding: '4px 4px 0',
    }}>
      {children}
    </div>
  )
}

// Pills HIG horizontais — ativo = solid azul, inativo = pill cinza
export function FiltroEtapas({ T, dark, ativas, onToggle }) {
  const azul = corEtapa('blue', dark)
  const bgInativo = dark ? 'rgba(255,255,255,0.07)' : '#e4e4e9'

  return (
    <div style={{
      display: 'flex',
      gap: 5,
      flexWrap: 'wrap',
    }}>
      {FILTROS_ETAPA_LOGISTICA.map(f => {
        const ativo = ativas.has(f.id)
        return (
          <button
            key={f.id}
            onClick={() => onToggle(f.id)}
            style={{
              flexShrink: 0,
              padding: '6px 10px',
              borderRadius: 999,
              border: 'none',
              background: ativo ? azul : bgInativo,
              color: ativo ? '#fff' : T.textPrimary,
              fontSize: 12,
              fontWeight: ativo ? 600 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              minHeight: 28,
              transition: 'background .15s, color .15s',
              WebkitTapHighlightColor: 'transparent',
            }}>
            <i className={`ti ${f.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

export function DiagnosticoMapa({ T, dark, diagnostico, totalOSFiltradas, criandoRotasFalhou }) {
  if (totalOSFiltradas === 0) return null
  const verde = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)
  return (
    <div style={{
      display: 'flex', gap: 6, flexWrap: 'wrap',
      fontSize: 11.5,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {diagnostico.comCoord > 0 && (
        <Pill T={T} cor={verde} icon="ti-map-pin-check">
          {diagnostico.comCoord} no mapa
        </Pill>
      )}
      {diagnostico.geocodificando > 0 && (
        <Pill T={T} cor={T.textMuted} icon="ti-loader-2">
          {diagnostico.geocodificando} geocodificando…
        </Pill>
      )}
      {diagnostico.semEndereco > 0 && (
        <Pill T={T} cor={amarelo} icon="ti-map-pin-off" title="Cliente sem endereço cadastrado">
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
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 9px',
        borderRadius: 999,
        background: cor + '14',
        color: cor,
        fontWeight: 600,
        fontSize: 11.5,
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
      {children}
    </span>
  )
}

// Card flutuante HIG — flat buttons, no gradients, refined typography
export function CardFlutuanteOS({ T, dark, os, onClose, onAdicionar, onAbrirDetalhe }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const tipoUi = tipoUiPorEtapa(os.etapa_db)
  const visual = VISUAL_TIPO[tipoUi]
  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,.32)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 14,
        zIndex: 20, borderRadius: 14,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 16,
          width: '100%', maxWidth: 340,
          boxShadow: '0 8px 28px rgba(0,0,0,.28)',
          display: 'flex', flexDirection: 'column', gap: 12,
          fontFamily: SF_STACK,
        }}
      >
        {/* Header com badge de tipo + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: visual.cor + '22',
            color: visual.cor,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className={`ti ${visual.icon}`} style={{ fontSize: 18 }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: visual.cor,
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {visual.label}
            </div>
            <div style={{
              fontSize: 13, fontWeight: 600, color: corHero(dark),
              fontVariantNumeric: 'tabular-nums', marginTop: 1,
            }}>
              OS #{os.numero}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{
            background: dark ? 'rgba(255,255,255,0.08)' : '#f0f0f3',
            border: 'none',
            borderRadius: '50%',
            width: 28, height: 28,
            color: T.textMuted, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
        </div>

        {/* Cliente em destaque */}
        <div style={{
          fontSize: 16, fontWeight: 600, color: corHero(dark),
          letterSpacing: '-0.01em', lineHeight: 1.2,
        }}>
          {os.cliente_nome || 'Sem cliente'}
        </div>

        {/* Endereço */}
        {os.endereco && (
          <div style={{
            fontSize: 13, color: T.textSecondary,
            display: 'flex', gap: 7, alignItems: 'flex-start',
            lineHeight: 1.35,
          }}>
            <i className="ti ti-map-pin" style={{ fontSize: 14, marginTop: 1, flexShrink: 0, color: T.textMuted }} aria-hidden="true" />
            <span>{os.endereco}</span>
          </div>
        )}

        {/* Metadata em pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Pill T={T} cor={T.textMuted} icon="ti-tag">{os.etapa_label}</Pill>
          {os.data_agendamento && (
            <Pill T={T} cor={amarelo} icon="ti-calendar-event">
              {new Date(os.data_agendamento).toLocaleDateString('pt-BR')}
            </Pill>
          )}
        </div>

        {/* Botões A/B/C — flat azul, HIG */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {['A', 'B', 'C'].map(letra => (
            <button
              key={letra}
              onClick={() => onAdicionar(letra)}
              style={{
                flex: 1,
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: azul,
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
                letterSpacing: '-0.01em',
              }}>
              + {letra}
            </button>
          ))}
        </div>

        {/* Link sutil pra detalhe */}
        <button
          onClick={onAbrirDetalhe}
          style={{
            background: 'transparent', border: 'none',
            padding: '4px 0',
            color: azul, fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            letterSpacing: '-0.005em',
          }}>
          Ver OS completa →
        </button>
      </div>
    </div>
  )
}

// Accordion HIG — item dentro de grouped card, sem bordas individuais
export function RotaAccordion({
  T, dark, slot, letra, primeiro, expandida, onToggle,
  onRemoverParada, onAdicionarAvulsa, onAbrirOSDetalhe,
}) {
  const azul = corEtapa('blue', dark)
  const paradas = slot.rota?.paradas || []
  const indisponivel = !slot.rota
  const [avulsaAberta, setAvulsaAberta] = useState(false)
  const [avulsaNome, setAvulsaNome] = useState('')
  const [avulsaEnd, setAvulsaEnd] = useState('')

  return (
    <div style={{
      borderTop: primeiro ? 'none' : `1px solid ${T.border}`,
      opacity: indisponivel ? 0.55 : 1,
    }}>
      {/* Header da rota — touch target 56px (HIG) */}
      <button
        onClick={indisponivel ? undefined : onToggle}
        disabled={indisponivel}
        style={{
          width: '100%',
          minHeight: 56,
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          display: 'flex', alignItems: 'center', gap: 12,
          cursor: indisponivel ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          WebkitTapHighlightColor: 'transparent',
        }}>
        {/* Badge letra */}
        <div style={{
          width: 34, height: 34,
          borderRadius: 10,
          background: expandida ? azul : (dark ? 'rgba(91,155,213,0.16)' : '#E6F1FB'),
          color: expandida ? '#fff' : azul,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700,
          flexShrink: 0,
          letterSpacing: '-0.01em',
          transition: 'background .15s',
        }}>
          {letra}
        </div>

        {/* Title + subtitle */}
        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 600, color: corHero(dark),
            letterSpacing: '-0.01em', lineHeight: 1.2,
          }}>
            Rota {letra}
            {indisponivel && (
              <span style={{
                fontSize: 11, color: T.textMuted, fontWeight: 500, marginLeft: 6,
              }}>
                · pendente
              </span>
            )}
          </div>
          <div style={{
            fontSize: 12.5, color: T.textMuted,
            fontVariantNumeric: 'tabular-nums', marginTop: 1,
          }}>
            {paradas.length === 0 ? 'Sem paradas' : `${paradas.length} ${paradas.length === 1 ? 'parada' : 'paradas'}`}
          </div>
        </div>

        {/* Chevron HIG — rotaciona em vez de trocar ícone */}
        {!indisponivel && (
          <i
            className="ti ti-chevron-right"
            style={{
              fontSize: 16,
              color: T.textMuted,
              transform: expandida ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform .2s cubic-bezier(0.32, 0.72, 0, 1)',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
        )}
      </button>

      {/* Conteúdo expandido */}
      {expandida && !indisponivel && (
        <div style={{
          borderTop: `1px solid ${T.border}`,
          background: dark ? 'rgba(255,255,255,0.02)' : '#FAFAFC',
        }}>
          {paradas.length === 0 ? (
            <div style={{
              padding: '20px 16px',
              fontSize: 13,
              color: T.textMuted,
              textAlign: 'center',
              letterSpacing: '-0.005em',
            }}>
              Toque num pino do mapa pra adicionar
            </div>
          ) : (
            paradas.map((p, idx) => {
              const tipoUi = normalizarTipoUi(p.tipo)
              const visual = VISUAL_TIPO[tipoUi]
              return (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: 'auto 1fr auto',
                  gap: 12, alignItems: 'center',
                  padding: '12px 16px',
                  borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
                  minHeight: 56,
                }}>
                  {/* Badge código da parada */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: visual.cor + '22',
                    color: visual.cor,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    flexShrink: 0,
                    letterSpacing: '-0.01em',
                  }}>
                    {letra}{idx + 1}
                  </div>

                  <div
                    onClick={p.os_id ? () => onAbrirOSDetalhe(p.os_id) : undefined}
                    style={{ minWidth: 0, cursor: p.os_id ? 'pointer' : 'default' }}
                  >
                    <div style={{
                      fontSize: 14.5, color: corHero(dark), fontWeight: 600,
                      letterSpacing: '-0.005em', lineHeight: 1.25,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.cliente_nome || 'Sem cliente'}
                    </div>
                    <div style={{
                      fontSize: 12, color: T.textMuted,
                      display: 'flex', gap: 6, marginTop: 1,
                    }}>
                      <span style={{ color: visual.cor, fontWeight: 600 }}>{visual.label}</span>
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
                      width: 32, height: 32, borderRadius: 8,
                      background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      border: 'none',
                      color: T.textMuted,
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'inherit',
                      WebkitTapHighlightColor: 'transparent',
                    }}>
                    <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
                  </button>
                </div>
              )
            })
          )}

          {/* Parada avulsa */}
          {avulsaAberta ? (
            <div style={{
              padding: 14,
              borderTop: `1px solid ${T.border}`,
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <HigInput
                T={T} dark={dark}
                value={avulsaNome}
                onChange={(e) => setAvulsaNome(e.target.value)}
                placeholder="Ex.: Buscar peça, Posto…"
                autoFocus
              />
              <HigInput
                T={T} dark={dark}
                value={avulsaEnd}
                onChange={(e) => setAvulsaEnd(e.target.value)}
                placeholder="Endereço (opcional)"
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { setAvulsaAberta(false); setAvulsaNome(''); setAvulsaEnd('') }}
                  style={{
                    flex: 1, height: 40, borderRadius: 10,
                    border: 'none',
                    background: dark ? 'rgba(255,255,255,0.07)' : '#e4e4e9',
                    color: T.textPrimary,
                    fontSize: 14, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    onAdicionarAvulsa(avulsaNome, avulsaEnd)
                    setAvulsaAberta(false); setAvulsaNome(''); setAvulsaEnd('')
                  }}
                  disabled={!avulsaNome.trim()}
                  style={{
                    flex: 1, height: 40, borderRadius: 10,
                    border: 'none',
                    background: azul,
                    color: '#fff',
                    fontSize: 14, fontWeight: 600,
                    cursor: avulsaNome.trim() ? 'pointer' : 'not-allowed',
                    opacity: avulsaNome.trim() ? 1 : 0.5,
                    fontFamily: 'inherit',
                    WebkitTapHighlightColor: 'transparent',
                  }}>
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAvulsaAberta(true)}
              style={{
                width: '100%',
                minHeight: 48,
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderTop: `1px solid ${T.border}`,
                color: azul,
                fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                letterSpacing: '-0.005em',
                WebkitTapHighlightColor: 'transparent',
              }}>
              <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
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
        height: 40, padding: '0 12px',
        borderRadius: 10,
        border: `1px solid ${T.border}`,
        background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
        color: T.textPrimary,
        fontSize: 14,
        outline: 'none',
        fontFamily: 'inherit',
        letterSpacing: '-0.005em',
        ...props.style,
      }}
    />
  )
}
