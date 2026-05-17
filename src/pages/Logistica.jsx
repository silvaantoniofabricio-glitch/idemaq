// idemaq-src/pages/Logistica.jsx
// Tela de Logística — paradas do dia (coletas + entregas) com placeholder de mapa.
// MVP visual: tabela `rota` e Google Maps API ainda não decididos (Módulo 05 do plano).
// Botões "Maps" abrem Google Maps diretamente via link público (sem chave de API).
// Visível pra Dono + Alessandro (RLS no banco vai bloquear acesso pra Guilherme).

import React, { useState, useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import {
  Card, Button, Badge, Input, Tabs,
  EmptyState, PageHeader, SectionHeader,
  useToast,
} from '../components/ui'
import { ChipToggle } from '../components/ui/Tabs'

// Mock — futuro: lê de OS com coleta_data/entrega_data + tabela `rota`.
// Datas relativas pra ficar coerente independente do dia em que abrir.
const HOJE = new Date().toISOString().slice(0, 10)
const AMANHA = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

const PARADAS_MOCK = [
  { id:1, tipo:'coleta',  osNum:247, cliente:'Ana Reis',         fone:'(67) 9 9911-1010', endereco:'R. das Acácias, 412 — Naviraí/MS', horario:'08:30', status:'pendente',  equipamento:'Lavadora Consul 10kg',     data: HOJE },
  { id:2, tipo:'entrega', osNum:241, cliente:'Paula Mendes',     fone:'(67) 9 9944-4040', endereco:'Av. Cuiabá, 1.020 — Naviraí/MS',   horario:'09:15', status:'pendente',  equipamento:'Lavadora LG 11kg',         data: HOJE },
  { id:3, tipo:'coleta',  osNum:248, cliente:'Roberto Dias',     fone:'(67) 9 9955-5050', endereco:'R. Paraná, 56 — Naviraí/MS',       horario:'10:00', status:'pendente',  equipamento:'Brastemp 12kg',            data: HOJE },
  { id:4, tipo:'entrega', osNum:243, cliente:'Maria Silva',      fone:'(67) 9 9810-1111', endereco:'R. Acre, 88 — Naviraí/MS',         horario:'11:00', status:'concluida', equipamento:'Lavadora Consul 8kg',      data: HOJE },
  { id:5, tipo:'coleta',  osNum:249, cliente:'João Costa',       fone:'(67) 9 9922-2020', endereco:'R. Bahia, 87 — Naviraí/MS',        horario:'14:30', status:'pendente',  equipamento:'Electrolux 13kg',          data: HOJE },
  { id:6, tipo:'entrega', osNum:245, cliente:'Carlos Lima',      fone:'(67) 9 9933-3030', endereco:'R. Goiás, 245 — Naviraí/MS',       horario:'15:45', status:'pendente',  equipamento:'LG 14kg',                  data: HOJE },
  { id:7, tipo:'coleta',  osNum:250, cliente:'Igor Vasconcelos', fone:'(67) 9 9712-3344', endereco:'R. Maranhão, 199 — Naviraí/MS',    horario:'16:30', status:'pendente',  equipamento:'Consul 11kg',              data: HOJE },
  { id:8, tipo:'coleta',  osNum:251, cliente:'Pedro Alves',      fone:'(67) 9 9966-6060', endereco:'R. Ceará, 312 — Naviraí/MS',       horario:'09:00', status:'pendente',  equipamento:'Brastemp Active 11kg',     data: AMANHA },
  { id:9, tipo:'entrega', osNum:246, cliente:'João Costa',       fone:'(67) 9 9922-2020', endereco:'R. Bahia, 87 — Naviraí/MS',        horario:'10:30', status:'pendente',  equipamento:'Lavadora Consul 10kg',     data: AMANHA },
]

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

export default function Logistica({ T, dark }) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()
  const [paradas, setParadas] = useState(PARADAS_MOCK)
  const [filtroData, setFiltroData] = useState('hoje')
  const [verColetas, setVerColetas] = useState(true)
  const [verEntregas, setVerEntregas] = useState(true)
  const [busca, setBusca] = useState('')

  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const verde = corEtapa('green', dark)

  function dataMatch(p) {
    if (filtroData === 'hoje')    return p.data === HOJE
    if (filtroData === 'amanha')  return p.data === AMANHA
    if (filtroData === 'semana')  return true
    return true
  }

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return paradas.filter(p => {
      if (!dataMatch(p)) return false
      if (p.tipo === 'coleta'  && !verColetas)  return false
      if (p.tipo === 'entrega' && !verEntregas) return false
      if (q && !p.cliente.toLowerCase().includes(q)
            && !p.endereco.toLowerCase().includes(q)
            && !String(p.osNum).includes(q)) return false
      return true
    })
  }, [paradas, filtroData, verColetas, verEntregas, busca])

  const ordenadas = useMemo(() => {
    return [...filtradas].sort((a, b) => {
      if (a.data !== b.data) return a.data.localeCompare(b.data)
      return a.horario.localeCompare(b.horario)
    })
  }, [filtradas])

  // Stats sempre do dia visível pelo filtro (não da base toda)
  const baseVisivel = paradas.filter(dataMatch)
  const totalColetas  = baseVisivel.filter(p => p.tipo === 'coleta').length
  const totalEntregas = baseVisivel.filter(p => p.tipo === 'entrega').length
  const concluidas    = baseVisivel.filter(p => p.status === 'concluida').length
  const pendentes     = baseVisivel.filter(p => p.status === 'pendente').length

  function concluirParada(id) {
    setParadas(prev => prev.map(p =>
      p.id === id ? { ...p, status: 'concluida' } : p
    ))
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

  return (
    <div style={{
      padding: '20px 24px 32px',
      overflowY: 'auto',
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Logística"
        subtitle={`${tituloFiltro} · ${ordenadas.length} ${ordenadas.length === 1 ? 'parada' : 'paradas'}`}
        stats={[
          { label: 'Coletas',    value: totalColetas,  color: azul },
          { label: 'Entregas',   value: totalEntregas, color: azulClaro },
          { label: 'Pendentes',  value: pendentes,     color: pendentes > 0 ? corEtapa('yellow', dark) : T.textDim },
          { label: 'Concluídas', value: concluidas,    color: concluidas > 0 ? verde : T.textDim },
        ]}
        actions={
          <Button variant="primary" iconLeft="ti-route" onClick={abrirRotaCompleta}>
            Abrir rota no Maps
          </Button>
        }
      />

      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs T={T} dark={dark}
            options={FILTROS_DATA}
            value={filtroData}
            onChange={setFiltroData}
            variant="segmented"
          />
          <div style={{ width: 1, height: 24, background: T.border }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <ChipToggle T={T} dark={dark}
              ativo={verColetas}
              onClick={() => setVerColetas(v => !v)}
              icon="ti-arrow-down-circle">
              Coletas
            </ChipToggle>
            <ChipToggle T={T} dark={dark}
              ativo={verEntregas}
              onClick={() => setVerEntregas(v => !v)}
              icon="ti-truck-delivery">
              Entregas
            </ChipToggle>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Input T={T} dark={dark}
              value={busca}
              onChange={setBusca}
              icon="ti-search"
              placeholder="Buscar cliente, endereço ou nº OS…"
            />
          </div>
        </div>
      </Card>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(380px, 1fr) 1.1fr',
        gap: 14,
        alignItems: 'start',
      }}>
        {/* Coluna esquerda — lista de paradas */}
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

                  {/* Info principal */}
                  <div style={{ minWidth: 0 }}>
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
                        onClick={() => concluirParada(p.id)}
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

        {/* Coluna direita — placeholder do mapa */}
        <Card T={T} dark={dark} padding={0}>
          <div style={{ padding: '12px 16px 10px' }}>
            <SectionHeader T={T} dark={dark} icon="ti-map" mb={0}
              action={
                <span style={{ fontSize: 11, color: T.textMuted }}>
                  Integração Google Maps · em breve
                </span>
              }
            >Mapa da rota</SectionHeader>
          </div>
          <div style={{
            position: 'relative',
            minHeight: 460,
            background: cor('#1a1a1d', '#f7f7f9'),
            backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 16, padding: 28, textAlign: 'center',
            borderBottomLeftRadius: 11, borderBottomRightRadius: 11,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: bgEtapa('blue', dark),
              border: `1px solid ${azul}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="ti ti-map" style={{ fontSize: 32, color: azul }} aria-hidden="true" />
            </div>
            <div style={{ maxWidth: 380 }}>
              <div style={{
                fontSize: 15, fontWeight: 600,
                color: corHero(dark), marginBottom: 6,
              }}>
                Mapa interativo em breve
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.45 }}>
                A integração com Google Maps Places mostrará pinos de
                {' '}<strong style={{ color: azul }}>coleta</strong> e
                {' '}<strong style={{ color: azulClaro }}>entrega</strong>
                {' '}com rota otimizada. Por enquanto, use os botões em cada parada
                ou abra a rota completa abaixo.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button variant="secondary" T={T} dark={dark}
                iconLeft="ti-external-link"
                onClick={abrirRotaCompleta}>
                Abrir rota completa no Maps
              </Button>
            </div>

            {/* Legenda de cores */}
            <div style={{
              position: 'absolute', bottom: 14, left: 14,
              display: 'flex', gap: 12,
              padding: '6px 10px',
              borderRadius: 8,
              background: T.card,
              border: `1px solid ${T.border}`,
              fontSize: 11,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.textMuted }}>
                <i className="ti ti-arrow-down-circle" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
                Coleta
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: T.textMuted }}>
                <i className="ti ti-truck-delivery" style={{ fontSize: 13, color: azulClaro }} aria-hidden="true" />
                Entrega
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
