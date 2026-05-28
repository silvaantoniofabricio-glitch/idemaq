// idemaq-src/components/mobile/KPIGridMobile.jsx
// 4 KPIs em grid 2x2 — Apple HIG: ícone em círculo tintado, sem borda superior.
// Aceita `kpis` array (novo) ou recalcula de `osList` (legado).

import React, { useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { calcStatusPrazo } from '../../utils/osHelpers'
import { fmtBRL } from '../../utils/fmt'

export default function KPIGridMobile({ T, dark, kpis: kpisExternas, osList = [], loading = false }) {
  // Compatibilidade: se não receber kpis prontos, calcula de osList (modo legado)
  const kpisCalculadas = useMemo(() => {
    if (kpisExternas) return null
    let abertas = 0, atrasadas = 0, naOficina = 0, agPeca = 0
    for (const os of osList || []) {
      if (os.deleted_at) continue
      if (os.etapa === 'concluido' || os.etapa === 'recusado') continue
      abertas++
      if (os.prazo && calcStatusPrazo(os.prazo, os.etapa) === 'vencido') atrasadas++
      if (os.etapa === 'oficina') naOficina++
      if (os.aguardando_peca) agPeca++
    }
    return [
      { id: 'abertas',   label: 'OS abertas',    icon: 'ti-clipboard-list', valor: abertas,   corKey: 'blue'   },
      { id: 'atrasadas', label: 'Atrasadas',      icon: 'ti-calendar-x',    valor: atrasadas, corKey: 'red',    destaque: atrasadas > 0 },
      { id: 'oficina',   label: 'Na oficina',     icon: 'ti-tool',          valor: naOficina, corKey: 'yellow' },
      { id: 'peca',      label: 'Aguard. peça',   icon: 'ti-package',       valor: agPeca,    corKey: 'yellow' },
    ]
  }, [kpisExternas, osList])

  const kpis = kpisExternas || kpisCalculadas

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {(kpis || []).map((k, i) => (
        <KpiCard key={k.id || i} T={T} dark={dark} item={k} loading={loading} />
      ))}
    </div>
  )
}

function KpiCard({ T, dark, item, loading }) {
  const cor   = corEtapa(item.corKey, dark)
  const bg    = bgEtapa(item.corKey, dark)
  const destaqueAtivo = item.destaque && (item.valor || 0) > 0

  return (
    <div style={{
      background: destaqueAtivo
        ? (dark ? 'rgba(192,66,66,0.12)' : '#fff5f5')
        : T.card,
      borderRadius: 16,
      padding: '14px 14px 16px',
      display: 'flex', flexDirection: 'column', gap: 0,
      minHeight: 90,
      boxShadow: dark ? 'none' : '0 1px 6px rgba(0,0,0,.06), 0 0 0 .5px rgba(0,0,0,.04)',
      overflow: 'hidden',
    }}>
      {/* Ícone em círculo tintado */}
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: destaqueAtivo ? bg : bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, flexShrink: 0,
      }}>
        <i className={`ti ${item.icon}`} style={{ fontSize: 17, color: cor }} aria-hidden="true" />
      </div>

      {/* Valor */}
      {loading ? (
        <div style={{ height: 30, width: 48, borderRadius: 6, background: T.cardAlt, marginBottom: 4 }} />
      ) : (
        <div style={{
          fontSize: item.isBRL ? 18 : 28,
          fontWeight: 800,
          color: destaqueAtivo ? cor : corHero(dark),
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-.02em', lineHeight: 1,
          marginBottom: 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.isBRL ? fmtBRL(item.valor || 0) : (item.valor ?? 0)}
        </div>
      )}

      {/* Label */}
      <div style={{
        fontSize: 11, color: T.textMuted, fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{item.label}</div>
    </div>
  )
}
