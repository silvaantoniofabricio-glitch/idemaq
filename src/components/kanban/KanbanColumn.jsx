// idemaq-src/components/kanban/KanbanColumn.jsx
import React from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa } from '../../utils/colors'
import KanbanCard from './KanbanCard'
import KanbanSkeleton from './KanbanSkeleton'

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

  // Soma de valor total da coluna
  const totalValor = osList.reduce((s, o) => s + ((o.valor || 0) - (o.desconto || 0)), 0)

  return (
    <div
      onDragOver={e => { e.preventDefault(); onDragOverCol?.(etapa.id) }}
      onDragLeave={() => { if (colunaHover === etapa.id) onDragOverCol?.(null) }}
      onDrop={e => { e.preventDefault(); onDropCol?.(etapa.id) }}
      style={{
        minWidth: 268, maxWidth: 268, flexShrink: 0,
        background: isHover ? bg : T.cardAlt,
        borderRadius: 11,
        border: `2px ${isHover ? 'dashed' : 'solid'} ${isHover ? c : T.border}`,
        display: 'flex', flexDirection: 'column',
        maxHeight: '100%',
        transition: 'background .15s, border-color .15s',
        position: 'relative',
      }}>
      {/* Top stripe colorido */}
      <div style={{
        position: 'absolute', top: 0, left: 12, right: 12,
        height: 2, background: c,
        opacity: osList.length === 0 ? 0.4 : 1,
        borderRadius: 1,
      }} />

      {/* Header */}
      <div style={{ padding: '11px 12px 10px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
            <span style={{
              fontSize: 11.5, fontWeight: 600, color: T.textPrimary,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{etapa.label}</span>
            {etapa.prazo24h && <i className="ti ti-clock-exclamation" style={{ fontSize: 13, color: cor(P.yellow, P.yellowDark) }} aria-hidden="true" title="Prazo de 24h" />}
            {etapa.adminOnly && <i className="ti ti-lock" style={{ fontSize: 11, color: T.textDim }} aria-hidden="true" title="Só o dono vê" />}
            {concluidoMesAtual && <i className="ti ti-calendar-stats" style={{ fontSize: 11, color: T.textDim }} aria-hidden="true" title="Mês corrente — use a busca para ver concluídas anteriores" />}
          </div>
          <span style={{
            fontSize: 10.5, fontWeight: 700,
            padding: '1px 7px', borderRadius: 10,
            background: osList.length > 0 ? bg : T.bg,
            color: osList.length > 0 ? c : T.textDim,
            minWidth: 22, textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}>{osList.length}</span>
        </div>
        {totalValor > 0 && (
          <div style={{
            fontSize: 10.5, color: T.textMuted, marginTop: 4,
            fontVariantNumeric: 'tabular-nums',
          }}>R$ {totalValor.toLocaleString('pt-BR')}</div>
        )}
      </div>

      {/* Body */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: 8, display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {loading && <KanbanSkeleton T={T} />}
        {!loading && osList.length === 0 && (
          <div style={{
            padding: '1.2rem .5rem', textAlign: 'center',
            color: T.textDim, fontSize: 11, fontStyle: 'italic',
          }}>
            {isHover ? 'Solte aqui' : 'vazio'}
          </div>
        )}
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
