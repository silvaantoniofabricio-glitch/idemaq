// src/components/kanban/KanbanColumn.jsx
// Coluna Kanban — estilo Atlassian/Jira (02/06/2026).
// Fundo cinza neutro, header compacto uppercase, sem stripe colorida no topo.

import React from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
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
  concluido:      { icon: 'ti-circle-check',   text: 'Nenhuma concluída no mês' },
}

export default function KanbanColumn({
  etapa, osList = [], T, dark, tipoCor,
  modoTodos = true, onCardClick,
  arrastando, colunaHover,
  onCardMouseDown,
  concluidoMesAtual, loading, shakingNum,
  admin = false, funcionarios = [], onMandarRoteiro, roteiroPorOS,
  vencimentoPorOS,
  onUpdateOS, onExcluir, onDuplicar,
}) {
  const c  = corEtapa(etapa.cor, dark)
  const bg = bgEtapa(etapa.cor, dark)
  const isHover = colunaHover === etapa.id && arrastando

  // Colapso automático (estilo Jira): coluna vazia vira um filete vertical.
  // NÃO expande durante o arraste — isso empurrava as colunas pro lado no meio
  // do drag e fazia o card cair na coluna errada. O filete continua aceitando
  // drop (tem data-etapa).
  const vazia     = !loading && osList.length === 0

  // Soma dos orçamentos da coluna (valor líquido = valor - desconto)
  const totalColuna = osList.reduce((acc, os) => acc + ((os.valor || 0) - (os.desconto || 0)), 0)
  const colapsada = vazia

  // Cores da coluna — estilo Atlassian: fundo sólido neutro
  const colBg = dark
    ? (isHover ? 'rgba(91,155,213,0.08)' : 'rgba(255,255,255,0.04)')
    : (isHover ? 'rgba(91,155,213,0.07)' : '#f4f5f7')

  const colBorder = isHover
    ? `1.5px dashed ${c}`
    : `1.5px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e4e5e9'}`

  // ── Coluna colapsada: filete vertical ────────────────────────────────────
  if (colapsada) {
    return (
      <div
        data-etapa={etapa.id}
        title={`${etapa.label} — vazio`}
        style={{
          minWidth: 44, maxWidth: 44, flexShrink: 0,
          background: colBg,
          borderRadius: 6,
          border: colBorder,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          maxHeight: '100%',
          padding: '10px 0',
          gap: 8,
          transition: 'background .15s, border-color .15s',
          overflow: 'hidden',
          cursor: 'default',
        }}>
        {/* Badge de contagem (0) */}
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '1px 6px', borderRadius: 10,
          background: dark ? 'rgba(255,255,255,0.07)' : '#e4e5e9',
          color: T.textDim,
          minWidth: 20, textAlign: 'center',
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>0</span>

        {/* Dot da etapa */}
        <div style={{
          width: 8, height: 8, borderRadius: 2,
          background: c, flexShrink: 0, opacity: 0.45,
        }} />

        {/* Label na vertical */}
        <span style={{
          writingMode: 'vertical-rl',
          fontSize: 11, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxHeight: '100%',
        }}>{etapa.label}</span>

        {/* Ícones de contexto (na base) */}
        <div style={{
          marginTop: 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        }}>
          {etapa.prazo24h && (
            <i className="ti ti-clock-exclamation"
              style={{ fontSize: 11, color: dark ? P.yellow : P.yellowDark }}
              aria-hidden="true" title="Prazo de 24h" />
          )}
          {etapa.adminOnly && (
            <i className="ti ti-lock"
              style={{ fontSize: 10, color: T.textDim }}
              aria-hidden="true" title="Só o dono vê" />
          )}
          {concluidoMesAtual && (
            <i className="ti ti-calendar-stats"
              style={{ fontSize: 10, color: T.textDim }}
              aria-hidden="true" title="Mês corrente" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      data-etapa={etapa.id}
      style={{
        minWidth: 270, maxWidth: 270, flexShrink: 0,
        background: colBg,
        borderRadius: 6,
        border: colBorder,
        display: 'flex', flexDirection: 'column',
        maxHeight: '100%',
        transition: 'background .15s, border-color .15s',
        overflow: 'hidden',
      }}>

      {/* Header estilo Jira */}
      <div style={{
        padding: '9px 11px 8px',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#e4e5e9'}`,
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {/* Dot de cor da etapa */}
          <div style={{
            width: 8, height: 8, borderRadius: 2,
            background: c, flexShrink: 0,
            opacity: osList.length === 0 ? 0.4 : 1,
          }} />
          <span style={{
            fontSize: 11, fontWeight: 700, color: T.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{etapa.label}</span>

          {/* Ícones de contexto */}
          {etapa.prazo24h && (
            <i className="ti ti-clock-exclamation"
              style={{ fontSize: 11, color: dark ? P.yellow : P.yellowDark, flexShrink: 0 }}
              aria-hidden="true" title="Prazo de 24h" />
          )}
          {etapa.adminOnly && (
            <i className="ti ti-lock"
              style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }}
              aria-hidden="true" title="Só o dono vê" />
          )}
          {concluidoMesAtual && (
            <i className="ti ti-calendar-stats"
              style={{ fontSize: 10, color: T.textDim, flexShrink: 0 }}
              aria-hidden="true" title="Mês corrente — busque para ver anteriores" />
          )}
        </div>

        {/* Soma dos orçamentos dos cards da coluna */}
        {totalColuna > 0 && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 11.5, fontWeight: 700,
            color: dark ? T.textPrimary : '#000',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap', flexShrink: 0,
          }} title="Soma dos orçamentos desta coluna">{fmtBRL(totalColuna, { fr: true })}</span>
        )}

        {/* Badge de contagem */}
        <span style={{
          fontSize: 11, fontWeight: 700,
          padding: '1px 7px', borderRadius: 10,
          background: osList.length > 0 ? bg : (dark ? 'rgba(255,255,255,0.07)' : '#e4e5e9'),
          color: osList.length > 0 ? c : T.textDim,
          minWidth: 20, textAlign: 'center',
          fontVariantNumeric: 'tabular-nums', flexShrink: 0,
        }}>{osList.length}</span>
      </div>

      {/* Body — lista de cards */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '8px 6px',
        display: 'flex', flexDirection: 'column', gap: 6,
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
                <div style={{ fontSize: 12, fontWeight: 600 }}>Solte aqui</div>
              </div>
            )
          }
          return (
            <div style={{
              padding: '2rem .5rem', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
            }}>
              <i className={`ti ${empty.icon}`} style={{ fontSize: 22, opacity: 0.3, color: T.textDim }} aria-hidden="true" />
              <div style={{ fontSize: 11.5, lineHeight: 1.4, color: T.textMuted }}>{empty.text}</div>
            </div>
          )
        })()}

        {!loading && osList.map(os => (
          <KanbanCard key={os.numero} os={os} T={T} dark={dark}
            tipoCor={tipoCor} modoTodos={modoTodos}
            shaking={shakingNum === os.numero}
            admin={admin} funcionarios={funcionarios} onMandarRoteiro={onMandarRoteiro}
            roteiroPorOS={roteiroPorOS}
            vencimentoPorOS={vencimentoPorOS}
            onUpdateOS={onUpdateOS} onExcluir={onExcluir} onDuplicar={onDuplicar}
            onClick={() => onCardClick?.(os)}
            onCardMouseDown={(osArg, e) => onCardMouseDown?.(osArg, etapa.id, e)} />
        ))}
      </div>
    </div>
  )
}
