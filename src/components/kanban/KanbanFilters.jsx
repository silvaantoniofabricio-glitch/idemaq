// idemaq-src/components/kanban/KanbanFilters.jsx
// Linha de filtros do Kanban: busca + resp + prazo + ag.peça + recusadas + tipos.

import React from 'react'
import { P } from '../../theme'
import { TIPOS_OS } from '../../utils/osData'
import { corEtapa, bgEtapa } from '../../utils/colors'

export default function KanbanFilters({
  T, dark,
  busca, setBusca,
  statusF, setStatusF,
  verAgPeca, setVerAgPeca, totalAgPeca = 0,
  zona, verRecusados, setVerRecusados, totalRecusados = 0,
  tiposAtivos, toggleTipo,
  totalKanban = 0,
  admin = true,
  buscando = false,
}) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const azulBg = bgEtapa('blue', dark)
  const showRecusadasToggle = zona === 'todos' || zona === 'financeiro'

  return (
    <div style={{
      background: T.card, borderRadius: 10,
      border: `1px solid ${T.border}`,
      padding: '10px 12px',
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
    }}>
      {/* Busca */}
      <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 340 }}>
        <i className="ti ti-search" style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, color: T.textDim,
        }} aria-hidden="true" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar nº, cliente, marca, modelo ou nº série…"
          style={{
            width: '100%', padding: '8px 10px 8px 32px',
            borderRadius: 7, border: `1px solid ${T.border}`,
            background: T.bg, color: T.textPrimary,
            fontSize: 12.5, outline: 'none', boxSizing: 'border-box',
            fontFamily: 'inherit',
          }} />
      </div>

      {/* Prazo */}
      <FilterGroup label="Prazo" T={T}>
        {[['todos', 'Todos'], ['vencido', 'Vencidas'], ['hoje', 'Hoje/amanhã'], ['ok', 'Em dia']].map(([v, l]) => (
          <FilterChip key={v} ativo={statusF === v} onClick={() => setStatusF(v)} T={T} dark={dark}>{l}</FilterChip>
        ))}
      </FilterGroup>

      {/* Ag. peça */}
      <button onClick={() => setVerAgPeca(v => !v)} style={chipStyle(verAgPeca, T, dark)}>
        <i className={`ti ${verAgPeca ? 'ti-package' : 'ti-package-off'}`} style={{ fontSize: 13 }} aria-hidden="true" />
        Aguard. peça ({totalAgPeca})
      </button>

      {/* Recusadas */}
      {showRecusadasToggle && (
        <button onClick={() => setVerRecusados(v => !v)} style={chipStyle(verRecusados, T, dark)}>
          <i className={`ti ${verRecusados ? 'ti-eye' : 'ti-eye-off'}`} style={{ fontSize: 13 }} aria-hidden="true" />
          Recusadas ({totalRecusados})
        </button>
      )}

      {/* Tipos */}
      <FilterGroup label="Tipos" T={T}>
        {Object.entries(TIPOS_OS).map(([id, cfg]) => {
          const ativo = tiposAtivos.has(id)
          return (
            <button key={id} onClick={() => toggleTipo(id)}
              style={{ ...chipStyle(ativo, T, dark), gap: 5 }}
              title={ativo ? `Ocultar ${cfg.label}` : `Mostrar ${cfg.label}`}>
              <i className={`ti ${cfg.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
              {cfg.label}
            </button>
          )
        })}
      </FilterGroup>

      <span style={{
        marginLeft: 'auto', fontSize: 11, color: T.textDim,
        fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {buscando && (
          <span style={{
            padding: '1px 7px', borderRadius: 8,
            background: azulBg, color: azul,
            fontSize: 10, fontWeight: 700,
          }}>Busca ativa — vendo histórico completo</span>
        )}
        {totalKanban} OS {!admin && '· você não vê Pagamento e Concluído'}
      </span>
    </div>
  )
}

function FilterGroup({ label, children, T }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      <span style={{
        fontSize: 11, color: T.textMuted, marginRight: 3,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px',
      }}>{label}</span>
      {children}
    </div>
  )
}

function FilterChip({ ativo, onClick, children, T, dark }) {
  return (
    <button onClick={onClick} style={chipStyle(ativo, T, dark)}>
      {children}
    </button>
  )
}

function chipStyle(ativo, T, dark) {
  const azul = corEtapa('blue', dark)
  const azulBg = bgEtapa('blue', dark)
  return {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px',
    borderRadius: 6,
    border: `1px solid ${ativo ? azul : T.border}`,
    background: ativo ? azulBg : 'transparent',
    color: ativo ? azul : T.textMuted,
    fontSize: 11.5, cursor: 'pointer',
    fontWeight: ativo ? 600 : 500,
    fontFamily: 'inherit',
  }
}
