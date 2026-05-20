// src/components/logistica/OSDisponiveisSidebar.jsx
// Lista de OS pendentes nas etapas que importam pra Logística.
// Chips de filtro por etapa. Click numa OS → callback onSelecionar (que abre
// modal "adicionar a rota" no parent).

import React, { useMemo, useState } from 'react'
import { Card, SectionHeader } from '../ui'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { useOSLogistica, FILTROS_ETAPA_LOGISTICA } from '../../hooks/useOSLogistica'

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

        {/* Chips de filtro de etapa */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {FILTROS_ETAPA_LOGISTICA.map(f => {
            const ativo = etapasAtivas.has(f.id)
            const corF = corEtapa(f.cor, dark)
            return (
              <button
                key={f.id}
                onClick={() => toggleEtapa(f.id)}
                title={f.label}
                style={{
                  padding: '4px 9px', borderRadius: 12,
                  border: `1px solid ${ativo ? azul : T.border}`,
                  background: ativo ? `${azul}15` : 'transparent',
                  color: ativo ? azul : T.textSecondary,
                  fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                <i className={`ti ${f.icon}`} style={{ fontSize: 11, color: ativo ? azul : corF }} aria-hidden="true" />
                {f.label}
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
