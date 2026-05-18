// idemaq-src/components/painel/AlertasCriticos.jsx
// 3 níveis de prioridade: crítico (vermelho) · atenção (amarelo) · info (azul).
// Itens clicáveis levam pro /os com query string que o Kanban pode usar pra
// auto-abrir a OS específica (próxima evolução).
import React from 'react'
import { corEtapa, bgEtapa } from '../../utils/colors'
import Card from '../ui/Card'

const NIVEIS = ['critico', 'atencao', 'info']
const LABEL_NIVEL = { critico: 'Crítico', atencao: 'Atenção', info: 'Info' }
const ICON_NIVEL  = { critico: 'ti-alert-octagon-filled', atencao: 'ti-alert-triangle-filled', info: 'ti-info-circle-filled' }
const COR_KEY     = { critico: 'red', atencao: 'yellow', info: 'blue' }

export default function AlertasCriticos({ T, dark, criticos = [], onAbrirOS }) {
  // Empty state — incentiva o "tudo em dia" sem inflar visualmente
  if (!criticos.length) {
    const verdeOk = corEtapa('green', dark)
    return (
      <Card T={T} dark={dark} radius={14}
        style={{ padding: '14px 18px', borderLeft: `3px solid ${verdeOk}`, display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: bgEtapa('green', dark), color: verdeOk,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="ti ti-circle-check-filled" style={{ fontSize: 17 }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>Tudo em dia</div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
            Nenhum alerta crítico no momento.
          </div>
        </div>
      </Card>
    )
  }

  // Contagem por nível (pra coluna lateral) e cor dominante (borda esquerda)
  const contagem = NIVEIS.map(n => ({ nivel: n, n: criticos.filter(c => c.nivel === n).length }))
  const nivelDominante = NIVEIS.find(n => criticos.some(c => c.nivel === n)) || 'info'
  const corDominante = corEtapa(COR_KEY[nivelDominante], dark)

  return (
    <Card T={T} dark={dark} radius={14}
      style={{ padding: 0, overflow: 'hidden', borderLeft: `3px solid ${corDominante}` }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', minHeight: 60 }}>
        {/* Coluna lateral: total + breakdown */}
        <div style={{
          padding: '12px 18px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          borderRight: `1px solid ${T.border}`,
          background: nivelDominante === 'critico'
            ? 'rgba(192,66,66,0.04)'
            : nivelDominante === 'atencao' ? 'rgba(245,180,40,0.05)' : 'rgba(91,155,213,0.05)',
          minWidth: 190,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className={`ti ${ICON_NIVEL[nivelDominante]}`} style={{ fontSize: 17, color: corDominante }} aria-hidden="true" />
            <span style={{ fontSize: 11, fontWeight: 700, color: corDominante, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Alertas · {criticos.length}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 5, fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            {contagem.filter(c => c.n > 0).map(c => (
              <span key={c.nivel} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: corEtapa(COR_KEY[c.nivel], dark),
                  display: 'inline-block',
                }} />
                {c.n} {LABEL_NIVEL[c.nivel].toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Lista de items — auto-fit pra caber sem espremer demais */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
        }}>
          {criticos.map((a, i) => {
            const corItem = corEtapa(COR_KEY[a.nivel], dark)
            const bgItem  = bgEtapa(COR_KEY[a.nivel], dark)
            const clicavel = typeof onAbrirOS === 'function' && a.osNumero != null
            return (
              <div key={i}
                onClick={clicavel ? () => onAbrirOS(a.osNumero) : undefined}
                role={clicavel ? 'button' : undefined}
                tabIndex={clicavel ? 0 : undefined}
                onKeyDown={clicavel ? (e) => { if (e.key === 'Enter' || e.key === ' ') onAbrirOS(a.osNumero) } : undefined}
                style={{
                  padding: '12px 14px',
                  borderLeft: i > 0 ? `1px solid ${T.border}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
                  cursor: clicavel ? 'pointer' : 'default',
                  transition: 'background .12s',
                }}
                onMouseEnter={(e) => { if (clicavel) e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                onMouseLeave={(e) => { if (clicavel) e.currentTarget.style.background = 'transparent' }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: bgItem, color: corItem,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.msg}</div>
                  <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: corItem, background: bgItem,
                      padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '.04em',
                    }}>{LABEL_NIVEL[a.nivel]}</span>
                    {a.sub}
                  </div>
                </div>
                {clicavel && (
                  <i className="ti ti-chevron-right" style={{ fontSize: 14, color: T.textDim, flexShrink: 0 }} aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
