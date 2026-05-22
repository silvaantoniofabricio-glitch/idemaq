// idemaq-src/pages/Logistica.jsx
// Tela de Logística — versão desktop alinhada conceitualmente com o mobile
// (reestruturada em 21/05/2026 noite, pedido do Toni): mapa central + 3
// accordions Rota A/B/C lateral + card flutuante no click do pino.
//
// Diferenças vs mobile:
//   - Mapa ocupa metade esquerda (vs full-width no mobile)
//   - Accordions A/B/C empilhados na coluna direita (vs full-width no mobile)
//   - Botão "Nova rota" no header pra criar uma rota extra fora dos 3 slots
//     (RotaDetalheModal continua disponível pra edição avançada por accordion)

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useIsMobile } from '../theme'
import { corEtapa, corHero } from '../utils/colors'
import LogisticaMobile, {
  NOMES_SLOT, LETRA_POR_SLOT,
  ETAPAS_DEFAULT_LOGISTICA, tipoUiPorEtapa, normalizarTipoUi, VISUAL_TIPO,
  CardFlutuanteOS, RotaAccordion, FiltroEtapas, DiagnosticoMapa,
} from './LogisticaMobile'
import {
  Card, Button, Input,
  EmptyState, PageHeader,
  useToast,
} from '../components/ui'
import { useRotas } from '../hooks/useRotas'
import { useOSLogistica } from '../hooks/useOSLogistica'
import { useGeocodeEnderecos } from '../hooks/useGeocodeEnderecos'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import NovaRotaModal from '../components/logistica/NovaRotaModal'
import RotaDetalheModal from '../components/logistica/RotaDetalheModal'
import MapaLogistica from '../components/logistica/MapaLogistica'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'

// Datas-âncora pro filtro (hoje / amanhã / semana) — coerentes em qualquer dia.
const HOJE = new Date().toISOString().slice(0, 10)
const AMANHA = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

const FILTROS_DATA = [
  { id: 'hoje',    label: 'Hoje',    icon: 'ti-calendar-event' },
  { id: 'amanha',  label: 'Amanhã',  icon: 'ti-calendar-due' },
  { id: 'semana',  label: 'Semana',  icon: 'ti-calendar-week' },
]

function whatsappUrl(fone) {
  const num = (fone || '').replace(/\D/g, '')
  return `https://wa.me/55${num}`
}

function mapsUrl(endereco) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
}

function rotaCompletaUrl(enderecos) {
  return `https://www.google.com/maps/dir/${enderecos.map(e => encodeURIComponent(e)).join('/')}`
}

// Botão icon-only com tooltip — usado pras ações secundárias do header
// (mantém a UI minimalista sem perder a função).
function IconButton({ T, dark, icon, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 32, height: 32, borderRadius: 8,
        border: `1px solid ${T?.border}`,
        background: 'transparent',
        color: T?.textSecondary,
        cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit',
        transition: 'background .12s, color .12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T?.cardAlt
        e.currentTarget.style.color = T?.textPrimary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = T?.textSecondary
      }}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
    </button>
  )
}

// Ponto da legenda do mapa — 10px de bola colorida + label. Tracejado pra
// pinos "disponível" (OS sem rota ainda).
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

// Pílula de período (Hoje / Amanhã / Semana) — substituição minimalista do
// Tabs segmented. Estilo "ativo = pílula azul cheia", "inativo = texto puro".
function PillPeriodo({ T, dark, ativo, onClick, children }) {
  const azul = corEtapa('blue', dark)
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 11px', borderRadius: 999,
        border: 'none',
        background: ativo ? `${azul}15` : 'transparent',
        color: ativo ? azul : T?.textMuted,
        fontSize: 12, fontWeight: ativo ? 600 : 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'background .12s, color .12s',
      }}
    >{children}</button>
  )
}

export default function Logistica({ T, dark }) {
  const isMobile = useIsMobile()
  // Mobile usa página reestruturada (mapa + filtros etapa + 3 rotas A/B/C
  // accordion + card flutuante). Pedido 21/05/2026. Desktop intocado.
  if (isMobile) return <LogisticaMobile T={T} dark={dark} />
  return <LogisticaDesktop T={T} dark={dark} />
}

function LogisticaDesktop({ T, dark }) {
  const notify = useToast()
  const azul = corEtapa('blue', dark)

  // ─── Hooks de dados ──────────────────────────────────────────────────────
  const {
    rotas, loading, error, tabelaAusente,
    criar: criarRota,
    atualizar: atualizarRota,
    excluir: excluirRota,
    concluirParada: concluirParadaHook,
  } = useRotas()

  // ─── Estado ──────────────────────────────────────────────────────────────
  const [filtroData, setFiltroData] = useState('hoje')
  const [etapasAtivas, setEtapasAtivas] = useState(ETAPAS_DEFAULT_LOGISTICA)
  const [rotaExpandida, setRotaExpandida] = useState('A')  // letra A/B/C ou null
  const [osPopup, setOsPopup] = useState(null)             // OS clicada no mapa
  const [novaRotaAberta, setNovaRotaAberta] = useState(false)
  const [rotaDetalhe, setRotaDetalhe] = useState(null)
  const [criandoRotasFalhou, setCriandoRotasFalhou] = useState(false)
  const criandoRotasRef = useRef(false)

  const dataAtiva = filtroData === 'hoje' ? HOJE
                  : filtroData === 'amanha' ? AMANHA
                  : null

  // OSDetalhe inline (abre OS pra editar sem trocar de rota)
  const { abrirOSPorId, modalProps: osDetalheProps } = useOSDetalheModal({ notify })

  // ─── OS disponíveis (etapas relevantes + filtro do usuário) ──────────────
  const incluirPagamento = etapasAtivas.has('pagamento')
  const { osList } = useOSLogistica({ incluirPagamento })

  const osFiltradas = useMemo(
    () => osList.filter(o => etapasAtivas.has(o.etapa_db)),
    [osList, etapasAtivas]
  )

  // Geocoda os endereços das OS filtradas (Photon/Google decidem em runtime)
  const enderecos = useMemo(
    () => osFiltradas.map(o => o.endereco).filter(Boolean),
    [osFiltradas]
  )
  const coordsPorEndereco = useGeocodeEnderecos(enderecos)

  // ─── Slots A/B/C da data ativa ───────────────────────────────────────────
  const slotsRotas = useMemo(() => {
    if (!dataAtiva) return NOMES_SLOT.map(nome => ({ nome, rota: null }))
    return NOMES_SLOT.map(nome => ({
      nome,
      rota: rotas.find(r => r.data === dataAtiva && r.nome === nome) || null,
    }))
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
              break
            }
          }
        }
      } finally {
        criandoRotasRef.current = false
      }
    })()
  }, [dataAtiva, slotsRotas, tabelaAusente, criandoRotasFalhou, criarRota])

  // ─── Pinos do mapa ───────────────────────────────────────────────────────
  // Set de OS já alocadas em alguma rota — não plota duas vezes.
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
    // Paradas já em rota → pinos cheios com código A1, B2…
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
          ordem: `${letra}${idx + 1}`,
          label: `${letra}${idx + 1} · ${p.cliente_nome || 'Sem cliente'}`,
          onClick: () => setRotaDetalhe(s.rota),
        })
      })
    }
    // OS disponíveis (filtro etapas + sem rota + com coord) → pinos tracejados
    for (const os of osFiltradas) {
      if (osIdsEmRota.has(os.id)) continue
      const c = os.endereco ? coordsPorEndereco[os.endereco] : null
      if (!c) continue
      lista.push({
        lat: c.lat, lng: c.lng,
        tipo: os.tipoParadaSugerido || 'visita',
        tracejado: true,
        agendamento: !!os.data_agendamento,
        ordem: String(os.numero).slice(-2),
        label: `OS #${os.numero} · ${os.cliente_nome} · ${os.etapa_label}`,
        onClick: () => setOsPopup({ ...os, lat: c.lat, lng: c.lng }),
      })
    }
    return lista
  }, [slotsRotas, osFiltradas, coordsPorEndereco, osIdsEmRota])

  // ─── Diagnóstico ─────────────────────────────────────────────────────────
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

  // ─── Ações ───────────────────────────────────────────────────────────────
  async function adicionarOSemRota(os, letra) {
    const slot = slotsRotas.find(s => LETRA_POR_SLOT[s.nome] === letra)
    if (!slot) { notify('erro', `Rota ${letra} não disponível`); return }
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
    const { error: err } = await atualizarRota(slot.rota.id, { paradas: novasParadas })
    if (err) {
      notify('erro', err.message || `Falha ao adicionar a Rota ${letra}`)
      return
    }
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
    const { error: err } = await atualizarRota(slotRota.id, { paradas: novasParadas })
    if (err) notify('erro', err.message || 'Falha ao adicionar')
    else notify('ok', 'Parada avulsa adicionada')
  }

  function abrirRotaCompletaNoMaps() {
    const enderecos = slotsRotas
      .flatMap(s => (s.rota?.paradas || []))
      .filter(p => p.status !== 'concluida' && p.endereco)
      .map(p => p.endereco)
    if (enderecos.length === 0) {
      notify('info', 'Nenhuma parada pendente pra mapear')
      return
    }
    window.open(rotaCompletaUrl(enderecos), '_blank', 'noopener,noreferrer')
  }

  // ─── Estados especiais (loading / sem tabela / erro) ─────────────────────
  if (loading) {
    return (
      <div style={{ padding: '20px 24px 32px', flex: 1 }}>
        <PageHeader T={T} dark={dark} title="Logística" subtitle="Carregando rotas…" />
        <Card T={T} dark={dark}>
          <EmptyState T={T} icon="ti-loader-2" title="Carregando rotas…"
            description="Buscando paradas do dia." compact />
        </Card>
      </div>
    )
  }
  if (tabelaAusente) {
    return (
      <div style={{ padding: '20px 24px 32px', flex: 1 }}>
        <PageHeader T={T} dark={dark} title="Logística"
          subtitle="Tabela `rota` ainda não criada no banco" />
        <Card T={T} dark={dark}>
          <EmptyState T={T} icon="ti-database-off"
            title="Tabela `rota` ainda não foi criada"
            description="Aplique sql/06-rota.sql no SQL Editor do Supabase pra liberar este módulo."
            compact />
        </Card>
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ padding: '20px 24px 32px', flex: 1 }}>
        <PageHeader T={T} dark={dark} title="Logística" subtitle="Erro ao carregar rotas" />
        <Card T={T} dark={dark}>
          <EmptyState T={T} icon="ti-alert-triangle"
            title="Erro ao carregar rotas"
            description={error.message || 'Falha desconhecida ao consultar a tabela `rota`.'}
            compact />
        </Card>
      </div>
    )
  }

  // ─── Render principal ────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '20px 24px 32px',
      overflowY: 'auto',
      flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Logística"
        subtitle="Planejamento de rotas"
        actions={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <IconButton T={T} dark={dark}
              icon="ti-external-link"
              title="Abrir rota completa no Google Maps"
              onClick={abrirRotaCompletaNoMaps}
            />
            <Button T={T} dark={dark} variant="primary" size="sm" iconLeft="ti-plus"
              onClick={() => setNovaRotaAberta(true)}>
              Nova rota
            </Button>
          </div>
        }
      />

      {/* Toolbar — período + filtro etapas */}
      <div style={{
        display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap',
        padding: '4px 4px',
      }}>
        <div style={{
          display: 'flex', gap: 2, padding: 2,
          background: T.cardAlt, borderRadius: 999,
        }}>
          {FILTROS_DATA.map(f => (
            <PillPeriodo
              key={f.id}
              T={T} dark={dark}
              ativo={filtroData === f.id}
              onClick={() => setFiltroData(f.id)}
            >{f.label}</PillPeriodo>
          ))}
        </div>

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
      </div>

      {/* Grid principal — mapa à esquerda, accordions à direita */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(520px, 1.4fr) minmax(360px, 1fr)',
        gap: 14, alignItems: 'start',
      }}>
        {/* ─── Coluna esquerda: mapa + diagnóstico ──────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${T.border}`,
            }}>
              <MapaLogistica
                T={T} dark={dark}
                height={580}
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

          {/* Legenda enxuta */}
          <div style={{
            display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
            fontSize: 10.5, color: T.textDim,
            padding: '2px 4px',
          }}>
            <LegendaDot cor={VISUAL_TIPO.coleta.cor}  titulo="Coleta" />
            <LegendaDot cor={VISUAL_TIPO.entrega.cor} titulo="Entrega" />
            <LegendaDot cor={VISUAL_TIPO.receber.cor} titulo="Receber" />
            <LegendaDot cor={VISUAL_TIPO.outros.cor}  titulo="Outros" />
            <LegendaDot cor="#1a3a6e" titulo="OS disponível (sem rota)" tracejado />
            <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
              Pino tracejado = clique pra adicionar
            </span>
          </div>
        </div>

        {/* ─── Coluna direita: accordions Rota A/B/C ────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {slotsRotas.map(slot => {
            const letra = LETRA_POR_SLOT[slot.nome]
            return (
              <RotaAccordion
                key={slot.nome}
                T={T} dark={dark}
                slot={slot}
                letra={letra}
                expandida={rotaExpandida === letra}
                onToggle={() => setRotaExpandida(
                  rotaExpandida === letra ? null : letra
                )}
                onRemoverParada={(paradaId) => removerParada(slot.rota, paradaId)}
                onAdicionarAvulsa={(nome, end) => adicionarParadaAvulsa(slot.rota, nome, end)}
                onAbrirOSDetalhe={abrirOSPorId}
              />
            )
          })}

          {/* Atalho pra abrir RotaDetalheModal (edição avançada / DnD) */}
          {dataAtiva && slotsRotas.some(s => s.rota) && (
            <button
              onClick={() => {
                const letra = rotaExpandida
                const slot = slotsRotas.find(s => LETRA_POR_SLOT[s.nome] === letra)
                if (slot?.rota) setRotaDetalhe(slot.rota)
                else notify('info', 'Selecione uma rota acima')
              }}
              style={{
                padding: '8px 12px', borderRadius: 8,
                border: `1px dashed ${T.border}`,
                background: 'transparent',
                color: T.textMuted, fontSize: 11.5, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = azul; e.currentTarget.style.borderColor = azul }}
              onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.border }}
            >
              <i className="ti ti-pencil" style={{ fontSize: 13 }} aria-hidden="true" />
              Editar Rota {rotaExpandida || 'A'} (motorista, ordem, status…)
            </button>
          )}
        </div>
      </div>

      {/* Modais */}
      {novaRotaAberta && (
        <NovaRotaModal
          T={T} dark={dark}
          onClose={() => setNovaRotaAberta(false)}
          onCriar={criarRota}
        />
      )}
      {rotaDetalhe && (
        <RotaDetalheModal
          T={T} dark={dark}
          rota={rotaDetalhe}
          onClose={() => setRotaDetalhe(null)}
          onAtualizar={atualizarRota}
          onExcluir={excluirRota}
          onConcluirParada={concluirParadaHook}
        />
      )}
      {osDetalheProps && <OSDetalhe T={T} dark={dark} {...osDetalheProps} />}
    </div>
  )
}
