// idemaq-src/pages/Logistica.jsx
// Tela de Logística — paradas do dia (coletas + entregas) com placeholder de mapa.
// MVP visual: tabela `rota` desenhada em sql/06-rota.sql (não aplicada).
// Botões "Maps" abrem Google Maps diretamente via link público (sem chave de API).
// Visível pra Dono + Alessandro (RLS no banco vai bloquear acesso pra Guilherme).

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useIsMobile } from '../theme'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import {
  Card, Button, Badge, Input,
  EmptyState, PageHeader, SectionHeader,
  useToast,
} from '../components/ui'
import { useRotas } from '../hooks/useRotas'
import NovaRotaModal from '../components/logistica/NovaRotaModal'
import RotaDetalheModal from '../components/logistica/RotaDetalheModal'
import MapaLogistica from '../components/logistica/MapaLogistica'
import OSDisponiveisSidebar from '../components/logistica/OSDisponiveisSidebar'
import AdicionarOSARotaModal from '../components/logistica/AdicionarOSARotaModal'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'

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
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  const isMobile = useIsMobile()
  const {
    rotas, loading, error, tabelaAusente,
    concluirParada: concluirParadaHook,
    criar: criarRota,
    atualizar: atualizarRota,
    excluir: excluirRota,
  } = useRotas()
  const [filtroData, setFiltroData] = useState('hoje')
  // Antes existiam ChipToggle pra esconder coletas/entregas — removidos por
  // serem ruído (usuário quase nunca usava). Defaults `true` mantidos pra
  // não quebrar o `filtradas` e as mensagens de empty state.
  const verColetas = true
  const verEntregas = true
  const [busca, setBusca] = useState('')
  const [novaRotaAberta, setNovaRotaAberta] = useState(false)
  const [rotaDetalhe, setRotaDetalhe] = useState(null) // rota selecionada p/ edição
  const [osParaAdicionarARota, setOsParaAdicionarARota] = useState(null) // OS da sidebar selecionada
  const [paradaAvulsaAberta, setParadaAvulsaAberta] = useState(false) // modal de parada avulsa
  // Slot fixo selecionado (Rota 1/2/3) — null = mostra todas. Filtra mapa + lista.
  const [rotaSelecionadaId, setRotaSelecionadaId] = useState(null)
  // Aba ativa no mobile (desktop ignora). 3 seções não cabem lado a lado em 360px,
  // então viram tabs: mapa cheio | lista cheia | OS disponíveis cheio.
  const [abaMobile, setAbaMobile] = useState('mapa')
  // Guard pra não criar as 3 rotas em loop enquanto o fetchAll converge
  const criandoRotasRef = useRef(false)
  // Avisa se a coluna `nome` ainda não existe no banco (sql/17 não rodado)
  const [schemaNomeAusente, setSchemaNomeAusente] = useState(false)
  // OS "disponíveis" filtradas no Sidebar — atualizadas via callback junto com
  // lat/lng geocodados. Usadas pra plotar pins extras no mapa (tipo 'disponivel').
  const [osDisponiveisFiltradas, setOsDisponiveisFiltradas] = useState([])
  const handleListaFiltrada = useCallback((lista) => {
    setOsDisponiveisFiltradas(lista)
  }, [])

  // OSDetalhe acessível de dentro da Logística — abre OS pra editar sem trocar de tela
  const { abrirOSPorId, modalProps: osDetalheProps } = useOSDetalheModal({ notify })

  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const verde = corEtapa('green', dark)

  // Achata { rotas: [{ paradas: [...] }] } pra lista plana de paradas + data,
  // mantendo o `rotaId` + `rotaNome` + `ordem` p/ filtros e pinos numerados.
  const paradas = useMemo(() => {
    const out = []
    for (const r of rotas) {
      const lista = Array.isArray(r.paradas) ? r.paradas : []
      // Normaliza `ordem` baseado na posição no array, pra pinos do mapa
      // sempre terem número mesmo se o campo `ordem` estiver inconsistente.
      lista.forEach((p, idx) => {
        out.push({
          ...p,
          rotaId: r.id,
          rotaNome: r.nome || null,
          ordem: p.ordem ?? (idx + 1),
          data: r.data,
          osNum: p.os_num,
          cliente: p.cliente_nome,
          fone: p.cliente_fone,
          horario: p.horario_previsto,
        })
      })
    }
    return out
  }, [rotas])

  function dataMatch(p) {
    if (filtroData === 'hoje')    return p.data === HOJE
    if (filtroData === 'amanha')  return p.data === AMANHA
    if (filtroData === 'semana')  return true
    return true
  }

  // Data ISO ativa (hoje/amanhã). `null` quando filtro é "semana" — aí não
  // faz sentido pré-criar slots de rota porque slot é por-dia.
  const dataAtiva = filtroData === 'hoje' ? HOJE
                  : filtroData === 'amanha' ? AMANHA
                  : null

  // Rotas da data ativa (qualquer nome, inclusive null/legacy).
  const rotasDoDia = useMemo(() => {
    if (!dataAtiva) return []
    return rotas
      .filter(r => r.data === dataAtiva)
      .sort((a, b) => {
        const na = a.nome || 'zzz'
        const nb = b.nome || 'zzz'
        if (na !== nb) return na.localeCompare(nb)
        return (a.criado_em || '').localeCompare(b.criado_em || '')
      })
  }, [rotas, dataAtiva])

  // Slots fixos do filtro — sempre 3 chips, mesmo se faltar a rota correspondente.
  // Rotas legacy (sem `nome` ou com outro nome) NÃO viram chip — ficam visíveis
  // apenas em "Todas" e via click em parada no mapa/lista.
  const NOMES_SLOT = ['Rota 1', 'Rota 2', 'Rota 3']
  const slotsRotas = useMemo(
    () => NOMES_SLOT.map(nome => ({
      nome,
      rota: rotasDoDia.find(r => r.nome === nome) || null,
    })),
    [rotasDoDia]
  )

  // Garante que existem Rota 1 / Rota 2 / Rota 3 vazias pra dataAtiva.
  // Se o sql/17-rota-nome.sql ainda não foi aplicado, a coluna `nome` não
  // existe e o insert falha — capturamos isso e setamos `schemaNomeAusente`.
  useEffect(() => {
    if (!dataAtiva || tabelaAusente || criandoRotasRef.current || schemaNomeAusente) return
    const NOMES = ['Rota 1', 'Rota 2', 'Rota 3']
    const existentes = new Set(rotasDoDia.map(r => r.nome).filter(Boolean))
    const faltam = NOMES.filter(n => !existentes.has(n))
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
              setSchemaNomeAusente(true)
              break
            }
          }
        }
      } finally {
        criandoRotasRef.current = false
      }
    })()
  }, [dataAtiva, rotasDoDia, tabelaAusente, schemaNomeAusente, criarRota])

  // Reset rotaSelecionada quando muda de dia (id pertence a outro dia)
  useEffect(() => {
    if (rotaSelecionadaId && !rotasDoDia.some(r => r.id === rotaSelecionadaId)) {
      setRotaSelecionadaId(null)
    }
  }, [rotasDoDia, rotaSelecionadaId])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return paradas.filter(p => {
      if (!dataMatch(p)) return false
      if (rotaSelecionadaId && p.rotaId !== rotaSelecionadaId) return false
      if (p.tipo === 'coleta'  && !verColetas)  return false
      if (p.tipo === 'entrega' && !verEntregas) return false
      if (q && !p.cliente.toLowerCase().includes(q)
            && !p.endereco.toLowerCase().includes(q)
            && !String(p.osNum).includes(q)) return false
      return true
    })
  }, [paradas, filtroData, verColetas, verEntregas, busca, rotaSelecionadaId])

  const ordenadas = useMemo(() => {
    return [...filtradas].sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data)
      return a.horario.localeCompare(b.horario)
    })
  }, [filtradas])

  // Stats do dia visível — usadas inline na toolbar (mais magras que stats[] do PageHeader)
  const baseVisivel = paradas.filter(dataMatch)
  const concluidas  = baseVisivel.filter(p => p.status === 'concluida').length
  const pendentes   = baseVisivel.filter(p => p.status === 'pendente').length

  function concluirParada(rotaId, paradaId) {
    concluirParadaHook(rotaId, paradaId)
    notify('ok', 'Parada concluída')
  }

  function abrirRotaCompleta() {
    const pendentesVisiveis = ordenadas.filter(p => p.status === 'pendente')
    if (pendentesVisiveis.length === 0) {
      notify('info', 'Nenhuma parada pendente pra mapear')
      return
    }
    window.open(rotaCompletaUrl(pendentesVisiveis.map(p => p.endereco)), '_blank', 'noopener,noreferrer')
  }

  const tituloFiltro = filtroData === 'hoje' ? 'Rota de hoje'
                     : filtroData === 'amanha' ? 'Rota de amanhã'
                     : 'Rota da semana'

  // Estados especiais — vêm antes da UI normal de filtros/lista.
  if (loading) {
    return (
      <div style={{ padding: '20px 24px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeader T={T} dark={dark}
          title="Logística"
          subtitle="Carregando rotas…"
        />
        <Card T={T} dark={dark}>
          <EmptyState T={T} icon="ti-loader-2" title="Carregando rotas…"
            description="Buscando paradas do dia." compact />
        </Card>
      </div>
    )
  }

  if (tabelaAusente) {
    return (
      <div style={{ padding: '20px 24px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeader T={T} dark={dark}
          title="Logística"
          subtitle="Tabela `rota` ainda não criada no banco"
        />
        <Card T={T} dark={dark}>
          <EmptyState T={T} icon="ti-database-off"
            title="Tabela `rota` ainda não foi criada"
            description="Aplique o arquivo sql/06-rota.sql no SQL Editor do Supabase pra liberar este módulo."
            compact
          />
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px 24px 32px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PageHeader T={T} dark={dark}
          title="Logística"
          subtitle="Erro ao carregar rotas"
        />
        <Card T={T} dark={dark}>
          <EmptyState T={T} icon="ti-alert-triangle"
            title="Erro ao carregar rotas"
            description={error.message || 'Falha desconhecida ao consultar a tabela `rota`.'}
            compact
          />
        </Card>
      </div>
    )
  }

  return (
    <div style={{
      padding: isMobile ? '12px 12px 88px' : '20px 24px 32px',
      overflowY: 'auto',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: isMobile ? 10 : 14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Logística"
        subtitle={isMobile ? undefined : tituloFiltro}
        actions={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <IconButton T={T} dark={dark}
              icon="ti-map-pin-plus"
              title="Adicionar parada avulsa"
              onClick={() => setParadaAvulsaAberta(true)}
            />
            <IconButton T={T} dark={dark}
              icon="ti-external-link"
              title="Abrir rota completa no Google Maps"
              onClick={abrirRotaCompleta}
            />
            {!isMobile && (
              <Button T={T} dark={dark} variant="primary" size="sm" iconLeft="ti-plus" onClick={() => setNovaRotaAberta(true)}>
                Nova rota
              </Button>
            )}
          </div>
        }
      />

      {/* Toolbar magra (sem Card) — período + busca + contador inline.
          Mobile: período full-width em cima, busca embaixo, contador some. */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 6 : 12,
        alignItems: isMobile ? 'stretch' : 'center',
        flexWrap: 'wrap',
        padding: isMobile ? '0 2px' : '6px 4px',
      }}>
        <div style={{
          display: 'flex', gap: 2,
          padding: 2,
          background: T.cardAlt,
          borderRadius: 999,
          alignSelf: isMobile ? 'flex-start' : 'auto',
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

        <div style={{
          flex: isMobile ? 'none' : 1,
          width: isMobile ? '100%' : undefined,
          minWidth: isMobile ? 0 : 220,
          maxWidth: isMobile ? '100%' : 380,
        }}>
          <Input T={T} dark={dark}
            value={busca}
            onChange={setBusca}
            icon="ti-search"
            placeholder={isMobile ? 'Buscar…' : 'Buscar cliente, endereço ou nº OS…'}
            size="sm"
          />
        </div>

        {/* Contador inline — só no desktop (no mobile vai pras tabs como badge) */}
        {!isMobile && (
          <div style={{
            marginLeft: 'auto',
            display: 'flex', alignItems: 'center', gap: 14,
            fontSize: 11.5, color: T.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <span><strong style={{ color: T.textPrimary, fontWeight: 600 }}>{ordenadas.length}</strong> {ordenadas.length === 1 ? 'parada' : 'paradas'}</span>
            {pendentes > 0 && (
              <span style={{ color: corEtapa('yellow', dark) }}>
                {pendentes} pendente{pendentes === 1 ? '' : 's'}
              </span>
            )}
            {concluidas > 0 && (
              <span style={{ color: verde }}>
                {concluidas} concluída{concluidas === 1 ? '' : 's'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs mobile — Mapa / Lista / OS Disponíveis. Cada uma toma tela inteira. */}
      {isMobile && (
        <div style={{
          display: 'flex', gap: 2, padding: 3,
          background: T.cardAlt, borderRadius: 999,
        }}>
          {[
            { id: 'mapa',  label: 'Mapa',  icon: 'ti-map' },
            { id: 'lista', label: 'Lista', icon: 'ti-list', badge: ordenadas.length },
            { id: 'os',    label: 'OS',    icon: 'ti-search' },
          ].map(t => {
            const ativo = abaMobile === t.id
            return (
              <button
                key={t.id}
                onClick={() => setAbaMobile(t.id)}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 999,
                  border: 'none',
                  background: ativo ? T.card : 'transparent',
                  color: ativo ? azul : T.textMuted,
                  fontWeight: ativo ? 600 : 500,
                  fontSize: 12, fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  boxShadow: ativo ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
                  transition: 'background .12s, color .12s, box-shadow .12s',
                }}
              >
                <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} aria-hidden="true" />
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    padding: '1px 6px', borderRadius: 8,
                    background: ativo ? azul : T.textDim,
                    color: '#fff',
                    fontVariantNumeric: 'tabular-nums',
                  }}>{t.badge}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(380px, 1fr) 1.1fr',
        gap: isMobile ? 10 : 14,
        alignItems: 'start',
      }}>
        {/* Coluna esquerda — OS disponíveis (planejamento) + lista de paradas/rotas.
            Mobile: cada filha controlada pela aba (Lista | OS). */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14,
        }}>
          {/* Sub-bloco da Sidebar — visible se desktop OU aba 'os' */}
          <div style={{ display: isMobile && abaMobile !== 'os' ? 'none' : 'block' }}>
          <OSDisponiveisSidebar
            T={T} dark={dark}
            onSelecionarOS={(os) => setOsParaAdicionarARota(os)}
            onAbrirOSDetalhe={(os) => abrirOSPorId(os.id)}
            onListaFiltrada={handleListaFiltrada}
            slotsRotas={slotsRotas}
            rotaSelecionadaId={rotaSelecionadaId}
            onRotaSelecionada={setRotaSelecionadaId}
            schemaNomeAusente={schemaNomeAusente}
          />
          </div>

          {/* Sub-bloco da Lista — visible se desktop OU aba 'lista' */}
          <div style={{ display: isMobile && abaMobile !== 'lista' ? 'none' : 'block' }}>
          {/* Lista de paradas das rotas */}
        {ordenadas.length === 0 ? (
          <EmptyState T={T}
            icon={busca || !verColetas || !verEntregas ? 'ti-search-off' : 'ti-map-off'}
            title={busca || (!verColetas && !verEntregas)
              ? 'Nenhuma parada encontrada'
              : `Sem paradas em ${filtroData === 'hoje' ? 'hoje' : filtroData === 'amanha' ? 'amanhã' : 'na semana'}`}
            description={busca
              ? `Sem resultados para "${busca}".`
              : (!verColetas && !verEntregas)
                ? 'Ative ao menos um tipo de parada nos filtros acima.'
                : 'Crie OS com coleta ou entrega agendadas pra ver aqui.'}
            height="auto"
            compact
          />
        ) : (
          <Card T={T} dark={dark} padding={0}>
            <div style={{ padding: '12px 16px 10px' }}>
              <SectionHeader T={T} dark={dark} icon="ti-route" mb={0}
                action={
                  <span style={{
                    fontSize: 11, color: T.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {ordenadas.length} {ordenadas.length === 1 ? 'parada' : 'paradas'}
                  </span>
                }
              >Sequência sugerida</SectionHeader>
            </div>

            {ordenadas.map((p, idx) => {
              const ehColeta  = p.tipo === 'coleta'
              const corTipo   = ehColeta ? azul : azulClaro
              const bgTipo    = ehColeta ? bgEtapa('blue', dark) : bgEtapa('blueLight', dark)
              const iconeTipo = ehColeta ? 'ti-arrow-down-circle' : 'ti-truck-delivery'
              const labelTipo = ehColeta ? 'Coleta' : 'Entrega'
              const concluida = p.status === 'concluida'

              return (
                <div key={p.id} style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderTop: `1px solid ${T.border}`,
                  opacity: concluida ? 0.55 : 1,
                  background: concluida ? T.cardAlt : 'transparent',
                  transition: 'background .12s, opacity .12s',
                }}>
                  {/* Ordem + ícone do tipo */}
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 4,
                    minWidth: 36,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: bgTipo,
                      border: `1px solid ${corTipo}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: corTipo,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {idx + 1}
                    </div>
                    <i className={`ti ${iconeTipo}`} aria-hidden="true"
                       style={{ fontSize: 16, color: corTipo }} />
                  </div>

                  {/* Info principal (click abre RotaDetalheModal) */}
                  <div
                    onClick={() => {
                      const rotaAlvo = rotas.find(r => r.id === p.rotaId)
                      if (rotaAlvo) setRotaDetalhe(rotaAlvo)
                    }}
                    style={{ minWidth: 0, cursor: 'pointer' }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 4, flexWrap: 'wrap',
                    }}>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px',
                        textTransform: 'uppercase', color: corTipo,
                      }}>
                        {labelTipo}
                      </span>
                      <span style={{
                        fontSize: 11, color: T.textMuted,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        OS #{p.osNum} · {p.horario}
                        {p.data !== HOJE && filtroData === 'semana' && (
                          <> · {new Date(p.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</>
                        )}
                      </span>
                      {concluida && (
                        <Badge variant="azul" dark={dark} sm>
                          <i className="ti ti-check" /> Concluída
                        </Badge>
                      )}
                    </div>
                    <div style={{
                      fontSize: 13.5, fontWeight: 600,
                      color: corHero(dark),
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.cliente}
                    </div>
                    <div style={{
                      fontSize: 11, color: T.textMuted, marginTop: 3,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <i className="ti ti-map-pin" style={{ fontSize: 12 }} aria-hidden="true" />
                      <span style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: 320,
                      }}>{p.endereco}</span>
                    </div>
                    <div style={{
                      fontSize: 11, color: T.textDim, marginTop: 2,
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <i className="ti ti-device-washing-machine" style={{ fontSize: 12 }} aria-hidden="true" />
                      {p.equipamento}
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <a
                      href={whatsappUrl(p.fone)}
                      target="_blank" rel="noopener noreferrer"
                      title={`Conversar com ${p.cliente}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 8,
                        background: 'transparent',
                        border: `1px solid ${T.border}`,
                        color: azul,
                        textDecoration: 'none',
                      }}
                    >
                      <i className="ti ti-brand-whatsapp" style={{ fontSize: 15 }} aria-hidden="true" />
                    </a>
                    <a
                      href={mapsUrl(p.endereco)}
                      target="_blank" rel="noopener noreferrer"
                      title="Abrir no Google Maps"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 32, height: 32, borderRadius: 8,
                        background: 'transparent',
                        border: `1px solid ${T.border}`,
                        color: T.textPrimary,
                        textDecoration: 'none',
                      }}
                    >
                      <i className="ti ti-map-pin" style={{ fontSize: 15 }} aria-hidden="true" />
                    </a>
                    {!concluida && (
                      <Button variant="secondary" T={T} dark={dark}
                        size="sm" iconLeft="ti-check"
                        onClick={() => concluirParada(p.rotaId, p.id)}
                      >
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
        )}
          </div>{/* fim sub-bloco Lista */}
        </div>{/* fim coluna esquerda */}

        {/* Coluna direita — Mapa Google Maps real (Naviraí-MS).
            Mobile: só visível quando aba === 'mapa'. */}
        <div style={{ display: isMobile && abaMobile !== 'mapa' ? 'none' : 'block' }}>
        <Card T={T} dark={dark} padding={0}>
          <div style={{ padding: '12px 16px 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <SectionHeader T={T} dark={dark} icon="ti-map" mb={0}>Mapa</SectionHeader>
            <Button variant="ghost" size="sm" T={T} dark={dark}
              iconLeft="ti-external-link"
              onClick={abrirRotaCompleta}>
              Rota no Maps
            </Button>
          </div>

          <MapaLogistica
            T={T} dark={dark}
            height={isMobile ? 380 : 460}
            paradas={[
              // Paradas oficiais das rotas (coleta/entrega/cobrança/visita/avulsa)
              // Quando uma rota está selecionada, esconde paradas das outras.
              ...paradas
                .filter(p => p.lat != null && p.lng != null)
                .filter(p => !rotaSelecionadaId || p.rotaId === rotaSelecionadaId)
                .map(p => ({
                  lat: p.lat,
                  lng: p.lng,
                  tipo: p.tipo,
                  ordem: p.ordem, // pino mostra o número da ordem dentro da rota
                  label: `${p.rotaNome ? p.rotaNome + ' · ' : ''}${p.tipo === 'avulsa' ? 'Avulsa' : `OS #${p.osNum}`} · ${p.cliente_nome || p.cliente || 'Sem cliente'}`,
                  onClick: () => {
                    const rotaAlvo = rotas.find(r => r.id === p.rotaId)
                    if (rotaAlvo) setRotaDetalhe(rotaAlvo)
                  },
                })),
              // OS "disponíveis" filtradas no Sidebar — pins tracejados.
              // Só aparecem quando NÃO tem rota selecionada (modo "ver tudo").
              ...(rotaSelecionadaId ? [] : osDisponiveisFiltradas
                .filter(o => o.lat != null && o.lng != null)
                .map(o => ({
                  lat: o.lat,
                  lng: o.lng,
                  tipo: 'disponivel',
                  label: `OS #${o.numero} · ${o.cliente_nome} · ${o.etapa_label}`,
                  onClick: () => abrirOSPorId(o.id),
                }))),
            ]}
          />

          {/* Legenda — 1 linha compacta, sem labels longos. Tooltip nos pontos. */}
          <div style={{
            padding: '8px 14px',
            borderTop: `1px solid ${T.border}`,
            display: 'flex', gap: 14, alignItems: 'center',
            fontSize: 10.5, color: T.textDim,
            fontVariantNumeric: 'tabular-nums',
          }}>
            <LegendaDot cor="#5B9BD5" titulo="Coleta" />
            <LegendaDot cor="#8FBC55" titulo="Entrega" />
            <LegendaDot cor="#B8CCE4" titulo="Outro (cobrança / visita / avulsa)" />
            <LegendaDot cor="#1a3a6e" titulo="OS disponível (sem rota)" tracejado />
            <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
              Número no pino = ordem da parada
            </span>
          </div>
        </Card>
        </div>{/* fim wrapper mapa */}
      </div>

      {/* FAB Nova Rota (só mobile) — flutua acima do BottomNav */}
      {isMobile && (
        <button
          onClick={() => setNovaRotaAberta(true)}
          aria-label="Nova rota"
          title="Nova rota"
          style={{
            position: 'fixed', bottom: 80, right: 16,
            width: 54, height: 54, borderRadius: '50%',
            background: `linear-gradient(135deg, ${corEtapa('blue', dark)}, #3a7bbf)`,
            color: '#fff', border: 'none',
            boxShadow: '0 6px 18px rgba(91,155,213,.45), 0 2px 4px rgba(0,0,0,.15)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 90,
          }}
        >
          <i className="ti ti-plus" style={{ fontSize: 26 }} aria-hidden="true" />
        </button>
      )}

      {novaRotaAberta && (
        <NovaRotaModal
          T={T} dark={dark} mobile={isMobile}
          onClose={() => setNovaRotaAberta(false)}
          onCriar={criarRota}
        />
      )}

      {rotaDetalhe && (
        <RotaDetalheModal
          T={T} dark={dark} mobile={isMobile}
          rota={rotaDetalhe}
          onClose={() => setRotaDetalhe(null)}
          onAtualizar={atualizarRota}
          onExcluir={excluirRota}
          onConcluirParada={concluirParadaHook}
        />
      )}

      {osParaAdicionarARota && (
        <AdicionarOSARotaModal
          T={T} dark={dark} mobile={isMobile}
          os={osParaAdicionarARota}
          rotas={rotas}
          onClose={() => setOsParaAdicionarARota(null)}
          onCriarRota={criarRota}
          onAtualizarRota={atualizarRota}
        />
      )}

      {paradaAvulsaAberta && (
        <AdicionarOSARotaModal
          T={T} dark={dark} mobile={isMobile}
          modo="avulsa"
          rotas={rotas}
          onClose={() => setParadaAvulsaAberta(false)}
          onCriarRota={criarRota}
          onAtualizarRota={atualizarRota}
        />
      )}

      {osDetalheProps && <OSDetalhe T={T} dark={dark} {...osDetalheProps} />}
    </div>
  )
}
