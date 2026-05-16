// idemaq-src/components/kanban/KanbanSkeleton.jsx
import React from 'react'

export default function KanbanSkeleton({ T }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
      {[68, 80, 60, 72].map((h, i) => (
        <div key={i} className="idemaq-skeleton" style={{ height: h, background: T?.border, opacity: 0.6 }} />
      ))}
    </div>
  )
}
