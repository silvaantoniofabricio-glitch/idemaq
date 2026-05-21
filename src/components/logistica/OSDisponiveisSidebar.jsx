// src/components/logistica/OSDisponiveisSidebar.jsx
// Lista de OS pendentes nas etapas que importam pra Logística.
// Chips de filtro por etapa. Click numa OS → callback onSelecionar (que abre
// modal "adicionar a rota" no parent).

import React, { useMemo, useState, useEffect } from 'react'
import { Card, SectionHeader } from '../ui'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { useOSLogistica, FILTROS_ETAPA_LOGISTICA } from '../../hooks/useOSLogistica'
import { useGeocodeEnderecos } from '../../hooks/useGeocodeEnderecos'

// Default: as 4 etapas logísticas marcadas, Pagamento desmarcado.
const ETAPAS_DEFAULT_ATIVAS = new Set([
  'aguardando_agendamento',
  'agendamento',
  'teste_final',
  'entrega',
])

export default function OSDisponiveisSidebar({
  T, dark,
  onSelecionarOS,         // (os) => abre modal "adicionar a rota"
  onAbrirOSDetalhe,       // (os) => abre OSDetalhe (botão alternativo no card)
  onListaFiltrada,        // (osComCoords) => pai injeta no mapa
  // ─── Filtro por rota (3 slots fixos: Rota 1 / Rota 2 / Rota 3) ──────
  slotsRotas = [],        // [{ nome: 'Rota 1', rota: rotaObj | null }, ...3]
  rotaSelecionadaId = null, // null = "Todas"
  onRotaSelecionada,      // (idOuNull) => void
  schemaNomeAusente = false, // true se sql/17 ainda não rodou
}) {
  const azul = corEtapa('blue', dark)
  const [etapasAtivas, setEtapasAtivas] = useState(ETAPAS_DEFAULT_ATIVAS)
  const incluirPagamento = etapasAtivas.has('pagamento')

  const { osList, loading } = useOSLogistica({ incluirPagamento })

  function toggleEtapa(id) {
    setEtapasAtivas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtradas = useMemo(
    () => osList.filter(os => etapasAtivas.has(os.etapa_db)),
    [osList, etapasAtivas]
  )

  // Geocoda endereços das OS filtradas → mapa de coords cacheado.
  // Não bloqueia a UI: os pins aparecem no mapa conforme cada endereço resolve.
  const enderecos = useMemo(
    () => filtradas.map(o => o.endereco).filter(Boolean),
    [filtradas]
  )
  const coordsPorEndereco = useGeocodeEnderecos(enderecos)

  // Anexa lat/lng (quando disponível) e dispara o callback pro pai.
  // Mantém a mesma referência quando nada mudou pra evitar render loops no pai.
  useEffect(() => {
    if (!onListaFiltrada) return
    const comCoords = filtradas.map(os => {
      const c = os.endereco ? coordsPorEndereco[os.endereco] : null
      return c ? { ...os, lat: c.lat, lng: c.lng } : os
    })
    onListaFiltrada(comCoords)
  }, [filtradas, coordsPorEndereco, onListaFiltrada])

  return (
    <Card T={T} dark={dark} padding={0}>
      <div style={{ padding: '12px 14px 8px' }}>
        <SectionHeader T={T} dark={dark} icon="ti-list-search" mb={6}
          action={
            <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
              {loading ? '…' : `${filtradas.length}`}
            </span>
          }
        >OS disponíveis</SectionHeader>

        {/* Chips de rota — sempre Todas + 3 slots (Rota 1/2/3). Filtra mapa. */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 5,
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <ChipRota
            T={T} dark={dark}
            ativo={rotaSelecionadaId == null}
            onClick={() => onRotaSelecionada?.(null)}
            icon="ti-list"
          >Todas</ChipRota>
          {slotsRotas.map(s => {
            const rota = s.rota
            const ativo = rota && rotaSelecionadaId === rota.id
            const nParadas = rota ? (rota.paradas || []).length : 0
            return (
              <ChipRota
                key={s.nome}
                T={T} dark={dark}
                ativo={ativo}
                disabled={!rota}
                onClick={() => rota && onRotaSelecionada?.(rota.id)}
                icon="ti-route"
                badge={nParadas > 0 ? nParadas : null}
              >
                {s.nome}
              </ChipRota>
            )
          })}
          {schemaNomeAusente && (
            <span style={{
              fontSize: 10, color: T.textDim,
              padding: '4px 6px',
              fontStyle: 'italic',
            }} title="Rode sql/17-rota-nome.sql pra ativar Rota 1/2/3 automáticas">
              <i className="ti ti-database-off" style={{ fontSize: 11, marginRight: 3 }} aria-hidden="true" />
              SQL pendente
            </span>
          )}
        </div>

        {/* Filtro de etapas — icon-only com tooltip. Bem mais magro que chips
            com label. Bolinha colorida vira pílula azul quando ativo. */}
        <div style={{
          display: 'flex', gap: 3, alignItems: 'center',
          fontSize: 10, color: T.textDim,
        }}>
          <span style={{
            fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: T.textDim, marginRight: 4,
          }}>Etapas</span>
          {FILTROS_ETAPA_LOGISTICA.map(f => {
            const ativo = etapasAtivas.has(f.id)
            const corF = corEtapa(f.cor, dark)
            return (
              <button
                key={f.id}
                onClick={() => toggleEtapa(f.id)}
                title={`${f.label}${ativo ? ' (clique pra esconder)' : ' (clique pra mostrar)'}`}
                style={{
                  width: 22, height: 22, borderRadius: 999,
                  border: `1px solid ${ativo ? corF : T.border}`,
                  background: ativo ? `${corF}22` : 'transparent',
                  color: ativo ? corF : T.textDim,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .12s, color .12s, border-color .12s',
                }}>
                <i className={`ti ${f.icon}`} style={{ fontSize: 11 }} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '14px', fontSize: 12, color: T.textMuted }}>
          Carregando…
        </div>
      )}

      {!loading && filtradas.length === 0 && (
        <div style={{ padding: '14px', fontSize: 12, color: T.textMuted, textAlign: 'center' }}>
          <i className="ti ti-circle-check" style={{ fontSize: 16, color: corEtapa('green', dark), marginRight: 6 }} aria-hidden="true" />
          Nenhuma OS pendente com esses filtros
        </div>
      )}

      <div style={{ maxHeight: 480, overflowY: 'auto' }}>
        {filtradas.map(os => (
          <OSCard
            key={os.id}
            os={os}
            T={T} dark={dark}
            onSelecionar={() => onSelecionarOS?.(os)}
            onAbrirDetalhe={() => onAbrirOSDetalhe?.(os)}
          />
        ))}
      </div>
    </Card>
  )
}

function OSCard({ os, T, dark, onSelecionar, onAbrirDetalhe }) {
  const azul = corEtapa('blue', dark)
  const filtro = FILTROS_ETAPA_LOGISTICA.find(f => f.id === os.etapa_db)
  const corEt = corEtapa(filtro?.cor || 'neutro', dark)

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'auto 1fr auto',
      gap: 10, alignItems: 'center',
      padding: '10px 14px',
      borderTop: `1px solid ${T.border}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 7,
        background: bgEtapa(filtro?.cor || 'neutro', dark),
        border: `1px solid ${corEt}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: corEt,
        fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}>
        {String(os.numero).slice(-3)}
      </div>

      <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={onAbrirDetalhe}
        title="Abrir OS pra editar">
        <div style={{
          fontSize: 12.5, fontWeight: 600, color: corHero(dark),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          #{os.numero} · {os.cliente_nome}
        </div>
        <div style={{
          fontSize: 10.5, color: T.textMuted, marginTop: 1,
          display: 'flex', alignItems: 'center', gap: 6,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <i className={`ti ${filtro?.icon || 'ti-circle'}`} style={{ fontSize: 11, color: corEt }} aria-hidden="true" />
          <span>{os.etapa_label}</span>
          {os.endereco && <span style={{ color: T.textDim }}>· {os.endereco.slice(0, 30)}{os.endereco.length > 30 ? '…' : ''}</span>}
        </div>
      </div>

      <button
        onClick={onSelecionar}
        title="Adicionar a uma rota"
        style={{
          padding: '5px 8px', borderRadius: 6,
          border: `1px solid ${azul}`,
          background: 'transparent', color: azul,
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 3,
          flexShrink: 0,
        }}>
        <i className="ti ti-plus" style={{ fontSize: 13 }} aria-hidden="true" />
        Rota
      </button>
    </div>
  )
}

// Chip de seleção de rota (Rota 1 / Rota 2 / Rota 3 / Todas).
// Estilo: ativo = azul cheio · disabled = cinza com hint · inativo = só texto.
function ChipRota({ T, dark, ativo, disabled = false, onClick, icon, badge, children }) {
  const azul = corEtapa('blue', dark)
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? 'Slot vazio — rode sql/17 pra criar' : undefined}
      style={{
        padding: '4px 9px', borderRadius: 12,
        border: `1px solid ${ativo ? azul : disabled ? T.border : T.border}`,
        background: ativo ? `${azul}15` : 'transparent',
        color: ativo ? azul : disabled ? T.textDim : T.textSecondary,
        fontSize: 10.5, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        fontFamily: 'inherit',
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 11 }} aria-hidden="true" />}
      {children}
      {badge != null && (
        <span style={{
          fontSize: 9.5, fontWeight: 700,
          padding: '1px 5px', borderRadius: 8,
          background: ativo ? azul : T.textDim,
          color: '#fff',
          fontVariantNumeric: 'tabular-nums',
        }}>{badge}</span>
      )}
    </button>
  )
}
