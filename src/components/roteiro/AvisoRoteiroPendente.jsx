// src/components/roteiro/AvisoRoteiroPendente.jsx
// Faixa de aviso na tela de OS do FUNCIONÁRIO: lembra das OS que estão no
// Roteiro do Dia dele e ainda não foram marcadas como feitas.
//
// Só aparece pra quem não é dono, só conta itens de HOJE com OS ligada
// (os_id) e feito = false. Some sozinho quando tudo for marcado.
// Amarelo + ícone (nunca depende só de cor — paleta Deutan).

import React from 'react'
import { corEtapa, bgEtapa } from '../../utils/colors'
import { isAdmin } from '../../utils/osHelpers'

export default function AvisoRoteiroPendente({
  T, dark, user, itens = [], osList = [],
  onAbrirRoteiro, onAbrirOS, compact = false,
}) {
  if (!user || isAdmin(user)) return null

  const pendentes = itens.filter(i => i.responsavel_id === user.id && i.os_id && !i.feito)
  if (pendentes.length === 0) return null

  const amarelo = corEtapa('yellow', dark)
  const MAX_CHIPS = compact ? 2 : 4
  const oss = pendentes.map(i => ({ item: i, os: osList.find(o => o.id === i.os_id) }))
  const mostrar = oss.slice(0, MAX_CHIPS)
  const resto = oss.length - mostrar.length

  return (
    <div role="status" style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      margin: compact ? '8px 12px 0' : '10px 18px 0',
      padding: compact ? '8px 10px' : '9px 14px',
      borderRadius: 6,
      background: bgEtapa('yellow', dark),
      border: `1.5px solid ${amarelo}`,
      flexShrink: 0,
    }}>
      <i className="ti ti-alert-triangle" style={{ fontSize: 18, color: amarelo, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {pendentes.length === 1
            ? 'Você tem 1 OS em aberto no Roteiro de hoje'
            : `Você tem ${pendentes.length} OS em aberto no Roteiro de hoje`}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
          {mostrar.map(({ item, os }) => (
            <button key={item.id} type="button"
              onClick={() => os && onAbrirOS?.(os)}
              disabled={!os}
              title={os ? 'Abrir OS' : 'OS não está na lista atual'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '2px 8px', borderRadius: 4,
                background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(9,30,66,0.06)',
                border: `1px solid ${T.border}`,
                color: T.textPrimary, fontSize: 11.5, fontWeight: 600,
                cursor: os ? 'pointer' : 'default',
                fontVariantNumeric: 'tabular-nums',
              }}>
              {item.urgente && <i className="ti ti-flame" style={{ fontSize: 12, color: amarelo }} aria-hidden="true" />}
              {os ? `#${os.numero}` : 'OS'}
              {os?.cliente ? ` · ${os.cliente}` : ''}
            </button>
          ))}
          {resto > 0 && (
            <span style={{ fontSize: 11.5, color: T.textMuted, alignSelf: 'center' }}>+{resto}</span>
          )}
        </div>
      </div>
      <button type="button" onClick={onAbrirRoteiro} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 4,
        background: amarelo, color: '#1a1a1d', border: 'none',
        fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
      }}>
        <i className="ti ti-checklist" style={{ fontSize: 14 }} aria-hidden="true" />
        Abrir roteiro
      </button>
    </div>
  )
}
