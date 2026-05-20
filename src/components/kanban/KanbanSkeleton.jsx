import React from 'react'

function SkeletonCard({ T, variant = 0 }) {
  const widths = [
    { cliente: 110, equip: 130, endereco: 90 },
    { cliente: 90,  equip: 105, endereco: 70 },
    { cliente: 130, equip: 95,  endereco: 110 },
    { cliente: 100, equip: 120, endereco: 60 },
  ]
  const w = widths[variant % widths.length]
  return (
    <div style={{
      borderLeft: `3px solid ${T.border}`,
      background: T.card,
      border: `1px solid ${T.border}`,
      borderLeftColor: T.border,
      borderRadius: 8,
      padding: '9px 11px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {/* Header: #OS + pill prazo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="idemaq-shimmer" style={{ height: 10, width: 50 }} />
        <div className="idemaq-shimmer" style={{ height: 14, width: 32, borderRadius: 7 }} />
      </div>
      {/* Cliente + valor */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="idemaq-shimmer" style={{ height: 11, width: w.cliente }} />
        <div className="idemaq-shimmer" style={{ height: 11, width: 54 }} />
      </div>
      {/* Equipamento */}
      <div className="idemaq-shimmer" style={{ height: 9, width: w.equip }} />
      {/* Endereço */}
      <div className="idemaq-shimmer" style={{ height: 9, width: w.endereco }} />
    </div>
  )
}

export default function KanbanSkeleton({ T }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0, 1, 2, 3].map(i => <SkeletonCard key={i} T={T} variant={i} />)}
    </div>
  )
}
