// src/components/ui/ModuleHeader.jsx
// Cabeçalho padrão de módulo — 2 linhas fixas.
// L1 (52px): ícone 28px · título 14px bold · separador vertical · stats inline | ações secundárias · CTA
// L2 (min 36px): tabs underline esquerda · divisória · filterSlot direita (filtros compactos)
// children opcionais: L3 full-width para filtros complexos (ex: BarraFiltros do Financeiro)

import React from 'react'
import { corEtapa } from '../../utils/colors'

// ── Stat inline ──────────────────────────────────────────────────────────────
// stat shape: { v, label, color?, dot?, highlight? }
//   v         — valor numérico ou string formatada (ex: "R$ 11.670", 63)
//   label     — texto descritivo após o valor (ex: "ativas", "saldo")
//   color     — cor aplicada ao valor E ao label (padrão T.textMuted)
//   dot       — true: mostra bolinha colorida antes do valor (alertas)
//   highlight — true: valor em cinza médio, label em dim mais pequeno (KPIs monetários)
function StatItem({ stat, T, dark }) {
  const { v, label, color, dot, highlight } = stat

  if (highlight) {
    const dimColor = dark ? '#444' : (T.textMuted || '#999')
    return (
      <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, fontSize: 12 }}>
        <span style={{ fontWeight: 600, color: dark ? '#aaa' : T.textPrimary, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{v}</span>
        {label && <span style={{ color: dimColor, fontSize: 10 }}>{label}</span>}
      </span>
    )
  }

  const resolvedColor = color || (dark ? '#666' : T.textMuted)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 12 }}>
      {dot && (
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: resolvedColor, display: 'inline-block', alignSelf: 'center', flexShrink: 0 }} />
      )}
      <span style={{ fontWeight: 700, color: resolvedColor, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{v}</span>
      {label && <span style={{ color: resolvedColor, opacity: 0.75 }}>{label}</span>}
    </span>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ModuleHeader({
  T, dark,
  // Identidade
  icon,              // string: classe Tabler com prefixo "ti-", ex: "ti-clipboard-list"
  iconBg,            // cor de fundo da caixa de ícone (default: azulBg)
  iconColor,         // cor do ícone (default: azul)
  title,             // string
  stats,             // array de stat objects — ver StatItem acima
  // Navegação
  tabs,              // array de { id, label, icon?, count?, ia? }
  activeTab,         // string: id da tab ativa
  onTabChange,       // (id: string) => void
  // Ações L1 direita
  secondaryActions,  // array de { label, icon, onClick, title? } — ghost button icon+label
  primaryAction,     // { label, icon?, onClick } — botão azul CTA
  // Filtros
  filterSlot,        // ReactNode: lado direito do L2 (filtros compactos, max-height ~28px cada)
  filterRef,         // Ref opcional aplicada ao container do filterSlot
  children,          // ReactNode: L3 full-width (filtros complexos, ex: BarraFiltros)
}) {
  const azul    = corEtapa('blue', dark)
  const defaultIconBg    = dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb'
  const resolvedIconBg   = iconBg    || defaultIconBg
  const resolvedIconColor = iconColor || azul

  const hasL2 = (tabs && tabs.length > 0) || filterSlot

  return (
    <div style={{ borderBottom: `1px solid ${T.border}`, background: T.bg, flexShrink: 0 }}>

      {/* ── L1: Identidade + Ações ──────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 22px', height: 52, gap: 12,
      }}>

        {/* Esquerda: ícone · título · vsep · stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>

          {/* Ícone 28×28 */}
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: resolvedIconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className={`ti ${icon}`} style={{ fontSize: 14, color: resolvedIconColor }} aria-hidden="true" />
          </div>

          {/* Título 14px bold */}
          <span style={{
            fontSize: 14, fontWeight: 700, color: T.textPrimary,
            letterSpacing: '-0.01em', whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {title}
          </span>

          {/* Separador vertical */}
          {stats && stats.length > 0 && (
            <div style={{
              width: 1, height: 14, flexShrink: 0, margin: '0 2px',
              background: dark ? '#2a2a30' : (T.border || '#e0e0e6'),
            }} />
          )}

          {/* Stats inline */}
          {stats && stats.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', minWidth: 0 }}>
              {stats.map((stat, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <span style={{ color: dark ? '#2d2d35' : '#ccc', fontSize: 12, margin: '0 6px', flexShrink: 0, userSelect: 'none' }}>·</span>
                  )}
                  <StatItem stat={stat} T={T} dark={dark} />
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Direita: ações secundárias + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

          {(secondaryActions || []).map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              title={action.title || action.label}
              style={{
                height: 28, padding: '0 10px',
                background: 'transparent',
                border: `1px solid ${dark ? '#2e2e34' : T.border}`,
                borderRadius: 5, cursor: 'pointer',
                color: dark ? '#999' : T.textMuted,
                fontSize: 12, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontFamily: 'inherit', transition: 'border-color .15s, color .15s',
                flexShrink: 0,
                boxShadow: dark ? 'none' : '0 1px 2px rgba(0,0,0,.06)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = azul; e.currentTarget.style.color = azul }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = dark ? '#2e2e34' : T.border; e.currentTarget.style.color = dark ? '#999' : T.textMuted }}>
              {action.icon && <i className={`ti ${action.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />}
              {action.label}
            </button>
          ))}

          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              style={{
                height: 28, padding: '0 12px',
                background: azul, color: '#fff',
                border: 'none', borderRadius: 5,
                cursor: 'pointer', fontSize: 12, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontFamily: 'inherit', transition: 'filter .15s',
                flexShrink: 0,
                boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,.15)',
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
              {primaryAction.icon && <i className={`ti ${primaryAction.icon}`} style={{ fontSize: 13 }} aria-hidden="true" />}
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>

      {/* ── L2: Tabs + filterSlot ───────────────────────────────── */}
      {hasL2 && (
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 22px',
          minHeight: 36,
          borderTop: `1px solid ${T.border}`,
        }}>

          {/* Zone E: tabs underline */}
          {tabs && tabs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, flexShrink: 0, alignSelf: 'stretch' }}>
              {tabs.map((tab) => {
                const ativo = tab.id === activeTab
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange && onTabChange(tab.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      paddingLeft: 0, paddingRight: 14,
                      border: 'none',
                      borderBottom: `2px solid ${ativo ? azul : 'transparent'}`,
                      background: 'transparent',
                      color: ativo ? T.textPrimary : (dark ? '#555' : T.textMuted),
                      fontSize: 12.5, fontWeight: ativo ? 600 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                      whiteSpace: 'nowrap', alignSelf: 'stretch',
                      transition: 'color .12s, border-color .12s',
                      marginBottom: -1,
                    }}
                    onMouseEnter={e => { if (!ativo) e.currentTarget.style.color = dark ? '#aaa' : T.textPrimary }}
                    onMouseLeave={e => { if (!ativo) e.currentTarget.style.color = dark ? '#555' : T.textMuted }}>
                    {tab.ia && <i className="ti ti-sparkles" style={{ fontSize: 11 }} aria-hidden="true" />}
                    {tab.icon && <i className={`ti ${tab.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />}
                    {tab.label}
                    {tab.count != null && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        background: ativo ? `${azul}25` : (dark ? '#1e1e24' : T.cardAlt || '#f0f0f5'),
                        color: ativo ? azul : (dark ? '#444' : T.textMuted),
                        padding: '1px 5px', borderRadius: 8,
                        fontVariantNumeric: 'tabular-nums', lineHeight: 1.5,
                      }}>{tab.count}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Divisória + Zone F: filtros */}
          {filterSlot && (
            <>
              <div style={{
                width: 1, background: dark ? '#222226' : (T.border || '#e0e0e6'),
                alignSelf: 'stretch', margin: '0 10px', flexShrink: 0,
              }} />
              <div
                ref={filterRef}
                style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, padding: '4px 0' }}>
                {filterSlot}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── L3: filtros complexos (passados como children) ──────── */}
      {children && (
        <div style={{ borderTop: `1px solid ${T.border}` }}>
          {children}
        </div>
      )}
    </div>
  )
}
