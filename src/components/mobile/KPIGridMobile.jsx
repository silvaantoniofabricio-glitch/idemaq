// idemaq-src/components/mobile/KPIGridMobile.jsx
// 4 KPIs em grid 2x2 no PainelMobile. Cálculo igual ao desktop, visual mobile.
// Recebe `os` (lista bruta) ou agregações prontas via prop `kpis`.

import React, { useMemo } from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { calcStatusPrazo } from '../../utils/osHelpers'

export default function KPIGridMobile({ T, dark, osList = [], loading = false }) {
  const kpis = useMemo(() => {
    let abertas = 0, atrasadas = 0, naOficina = 0, agPeca = 0
    for (const os of osList || []) {
      if (os.deleted_at) continue
      if (os.etapa === 'concluido' || os.etapa === 'recusado') continue
      abertas++
      if (os.prazo && calcStatusPrazo(os.prazo, os.etapa) === 'vencido') atrasadas++
      if (os.etapa === 'oficina') naOficina++
      if (os.aguardando_peca) agPeca++
    }
    return { abertas, atrasadas, naOficina, agPeca }
  }, [osList])

  const azul     = corEtapa('blue',   dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red',    dark)

  const items = [
    { label: 'OS abertas',  valor: kpis.abertas,   cor: azul,     icon: 'ti-clipboard-list' },
    { label: 'Atrasadas',   valor: kpis.atrasadas, cor: vermelho, icon: 'ti-alert-triangle', destaque: kpis.atrasadas > 0 },
    { label: 'Na oficina',  valor: kpis.naOficina, cor: amarelo,  icon: 'ti-tool' },
    { label: 'Aguard. peça', valor: kpis.agPeca,   cor: amarelo,  icon: 'ti-package' },
  ]

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
    }}>
      {items.map((k, i) => (
        <KpiCard key={i} T={T} dark={dark} item={k} loading={loading} />
      ))}
    </div>
  )
}

function KpiCard({ T, dark, item, loading }) {
  const valorCor = item.destaque ? item.cor : corHero(dark)
  return (
    <div className="idemaq-card" style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${item.cor}`,
      borderRadius: 12,
      padding: '12px 13px',
      minHeight: 88,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <i className={`ti ${item.icon}`} style={{ fontSize: 16, color: item.cor }} aria-hidden="true" />
        <span style={{
          fontSize: 11, color: T.textMuted, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '.3px',
        }}>{item.label}</span>
      </div>
      {loading ? (
        <div style={{
          height: 26, width: 40, borderRadius: 4,
          background: T.cardAlt,
        }} />
      ) : (
        <div style={{
          fontSize: 26, fontWeight: 800, color: valorCor,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
        }}>{item.valor}</div>
      )}
    </div>
  )
}
