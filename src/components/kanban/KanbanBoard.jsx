// idemaq-src/components/kanban/KanbanBoard.jsx
// Container das colunas — scroll horizontal com wheel.

import React, { useRef } from 'react'
import KanbanColumn from './KanbanColumn'

export default function KanbanBoard({
  etapasVisiveis,
  porEtapa,
  T, dark, tipoCor,
  onCardClick,
  arrastando, colunaHover,
  onDragStart, onDragEnd, onDragOverCol, onDropCol,
  loading, shakingNum,
  buscando = false,
}) {
  const ref = useRef(null)
  function handleWheel(e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault()
      ref.current && (ref.current.scrollLeft += e.deltaY)
    }
  }

  return (
    <div ref={ref} onWheel={handleWheel} style={{
      flex: 1, minHeight: 0,
      overflowX: 'auto', overflowY: 'hidden',
      display: 'flex', gap: 10, paddingBottom: 6,
    }}>
      {etapasVisiveis.map(etapa => (
        <KanbanColumn key={etapa.id}
          etapa={etapa}
          osList={porEtapa[etapa.id] || []}
          T={T} dark={dark} tipoCor={tipoCor}
          modoTodos
          onCardClick={onCardClick}
          arrastando={arrastando} colunaHover={colunaHover}
          loading={loading} shakingNum={shakingNum}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOverCol={onDragOverCol}
          onDropCol={onDropCol}
          concluidoMesAtual={etapa.id === 'concluido' && !buscando}
        />
      ))}
    </div>
  )
}
