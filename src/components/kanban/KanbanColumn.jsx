// src/components/kanban/KanbanColumn.jsx
// Coluna do Kanban — Apple HIG: stripe topo, header limpo, badge pill, drop zone refinado.

import React from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa } from '../../utils/colors'
import KanbanCard from './KanbanCard'
import KanbanSkeleton from './KanbanSkeleton'

const EMPTY_BY_ETAPA = {
  ag_agendamento: { icon: 'ti-calendar-off',   text: 'Sem agendamentos pendentes' },
  agendamento:    { icon: 'ti-calendar-event', text: 'Sem visitas agendadas' },
  recebido:       { icon: 'ti-package',        text: 'Nada recebido' },
  diagnostico:    { icon: 'ti-stethoscope',    text: 'Sem diagnósticos abertos' },
  orcamento:      { icon: 'ti-file-dollar',    text: 'Sem orçamentos' },
  oficina:        { icon: 'ti-tools',          text: 'Oficina livre' },
  teste_final:    { icon: 'ti-checks',         text: 'Sem testes finais' },
  entrega:        { icon: 'ti-truck-delivery', text: 'Sem entregas pendentes' },
  pagamento:      { icon: 'ti-cash',           text: 'Sem pagamentos em aberto' },
  concluido:      { icon: 'ti-circle-check',   text: 'Nenhuma OS concluída no mês' },
}

export default function KanbanColumn({
  etapa, osList = [], T, dark, tipoCor,
  modoTodos = true,
  onCardClick,
  arrastando, colunaHover,
  onDragStart, onDragEnd, onDragOverCol, onDropCol,
  concluidoMesAtual,
  loading,
  shakingNum,
}) {
  const cor = (d, c) => dark ? d : c
  const c  = corEtapa(etapa.cor, dark)
  const bg = bgEtapa(etapa.cor, dark)
  const isHover = colunaHover === etapa.id && arrastando

  const colBg = dark
    ? (isHover ? bg : 'rgba(255,255,255,0.03)')
    : (isHover ? bg : T.cardAlt)

  const colBorder = dark
    ? (isHover ? `1.5px dashed ${c}` : '1.5px solid transparent')
    : (isHover ? `1.5px dashed ${c}` : `1.5px solid ${T.border}`)

  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOverCol?.(etapa.id) }}
      onDragLeave={() => { if (colunaHover === etapa.id) onDragOverCol?.(null) }}
      onDrop={e => { e.preventDefault(); onDropCol?.(etapa.id) }}
      style={{
        minWidth: 268, maxWidth: 268, flexShrink: 0,
        background: colBg,
        borderRadius: 13,
        border: colBorder,
        display: 'flex', flexDirection: 'column',
        maxHeight: '100%',
        transition: 'background .15s, border-color .15s',
        overflow: 'hidden',
      }}>

      {/* Accent stripe topo */}
      <div style={{
        height: 3,
        background: c,
        opacity: osList.length === 0 ? 0.3 : 0.85,
        flexShrink: 0,
      }} />

      {/* Header */}
      <div style={{
        padding: '8px 12px 9px',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : T.border}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0, opacity: 0.9 }} />
          <span style={{
            fontSize: 12, fontWeight: 600, color: T.textPrimary,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: '-0.01em',
          }}>{etapa.label}</span>
          {etapa.prazo24h && (
            <i className="ti ti-clock-exclamation"
               style={{ fontSize: 12, color: cor(P.yellow, P.yellowDark), flexShrink: 0 }}
               aria-hidden="true" title="Prazo de 24h" />
          )}
          {etapa.adminOnly && (
            <i className="ti ti-lock"
               style={{ fontSize: 11, color: T.textDim, flexShrink: 0 }}
               aria-hidden="true" title="Só o dono vê" />
          )}
          {concluidoMesAtual && (
            <i className="ti ti-calendar-stats"
               style={{ fontSize: 11, color: T.textDim, flexShrink: 0 }}
               aria-hidden="true" title="Mês corrente — use a busca para ver concluídas anteriores" />
          )}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '1.5px 8px', borderRadius: 100,
          background: osList.length > 0 ? bg : (dark ? 'rgba(255,255,255,0.05)' : T.bg),
          color: osList.length > 0 ? c : T.textDim,
          minWidth: 20, textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>{osList.length}</span>
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: 8,
        display: 'flex', flexDirection: 'column', gap: 7,
      }}>
        {loading && <KanbanSkeleton T={T} />}
        {!loading && osList.length === 0 && (() => {
          const empty = EMPTY_BY_ETAPA[etapa.id] || { icon: 'ti-circle-dashed', text: 'Vazio' }
          if (isHover) {
            return (
              <div style={{
                padding: '2rem .5rem', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                color: c,
              }}>
                <i className="ti ti-arrow-down-to-arc" style={{ fontSize: 26, opacity: 0.8 }} aria-hidden="true" />
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>Solte aqui</div>
              </div>
            )
          }
          return (
            <div style={{
              padding: '2rem .5rem', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            }}>
              <i className={`ti ${empty.icon}`} style={{ fontSize: 24, opacity: 0.4, color: T.textDim }} aria-hidden="true" />
              <div style={{ fontSize: 11.5, lineHeight: 1.4, color: T.textMuted }}>{empty.text}</div>
            </div>
          )
        })()}
        {!loading && osList.map(os => (
          <KanbanCard key={os.numero} os={os} T={T} dark={dark}
            tipoCor={tipoCor} modoTodos={modoTodos}
            shaking={shakingNum === os.numero}
            onClick={() => onCardClick?.(os)}
            onDragStart={() => onDragStart?.(os.numero, etapa.id)}
            onDragEnd={onDragEnd} />
        ))}
      </div>
    </div>
  )
}
