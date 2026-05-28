// src/pages/MeuRelatorio.jsx
// Relatório pessoal do funcionário (Alessandro/Guilherme) — Apple HIG.

import React from 'react'
import { useTheme } from '../theme'
import { isAdmin, getRole } from '../utils/osHelpers'
import {
  HIG_SPACE, HIG_RADIUS, HIG_COLOR, HIG_FONT,
  higType, higInsetCard,
} from '../theme-hig'

export default function MeuRelatorio({ user }) {
  const { T, dark } = useTheme()
  const role = getRole(user)

  const azul    = HIG_COLOR.tintIdemaq
  const amarelo = HIG_COLOR.orange
  const verde   = HIG_COLOR.green

  const nome = role === 'func1' ? 'Alessandro'
             : role === 'func2' ? 'Guilherme'
             : isAdmin(user) ? 'Dono' : 'Você'

  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const kpis = [
    { label: 'Horas trabalhadas', valor: '—', cor: azul,    icon: 'ti-clock' },
    { label: 'Faltas no mês',     valor: '—', cor: amarelo, icon: 'ti-x' },
    { label: 'OS concluídas',     valor: '—', cor: verde,   icon: 'ti-check' },
    { label: 'Saldo banco horas', valor: '—', cor: azul,    icon: 'ti-wallet' },
  ]

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      background: dark ? T.bg : HIG_COLOR.bgGrouped,
      paddingBottom: 80,
      fontFamily: HIG_FONT,
    }}>

      {/* Large title */}
      <div style={{ padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px ${HIG_SPACE.xs}px` }}>
        <div style={{ ...higType('largeTitle'), color: T.textPrimary }}>
          Meu relatório
        </div>
        <div style={{ ...higType('footnote'), color: T.textMuted, marginTop: 2 }}>
          {nome} · {mes}
        </div>
      </div>

      {/* KPIs em inset grouped card 2×2 */}
      <div style={{ padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.sm}px` }}>
        <div style={{
          ...higInsetCard(T, dark),
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
        }}>
          {kpis.map((k, i) => {
            const lastRow = i >= kpis.length - 2
            const isRight = i % 2 === 1
            return (
              <div key={i} style={{
                padding: `${HIG_SPACE.sm}px ${HIG_SPACE.md}px`,
                borderBottom: !lastRow ? `0.5px solid ${T.border}` : 'none',
                borderLeft: isRight ? `0.5px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  ...higType('caption2'),
                  color: T.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 4,
                }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: 12, color: k.cor }} aria-hidden="true" />
                  {k.label}
                </div>
                <div style={{
                  ...higType('title2'),
                  fontWeight: 600,
                  color: k.cor,
                  fontVariantNumeric: 'tabular-nums',
                }}>{k.valor}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Banner em construção */}
      <div style={{ padding: `0 ${HIG_SPACE.md}px ${HIG_SPACE.sm}px` }}>
        <div style={{
          ...higInsetCard(T, dark),
          padding: HIG_SPACE.md,
          display: 'flex', gap: HIG_SPACE.sm, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: HIG_RADIUS.card,
            background: amarelo + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-tools" style={{ fontSize: 18, color: amarelo }} aria-hidden="true" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...higType('headline'), color: T.textPrimary }}>
              Relatório em construção
            </div>
            <div style={{ ...higType('subheadline'), color: T.textSecondary, marginTop: 4 }}>
              Quando você começar a bater ponto pelo app, esta tela vai mostrar:
            </div>
            <ul style={{
              margin: `${HIG_SPACE.xs}px 0 0 0`, padding: 0, listStyle: 'none',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {[
                'Horas trabalhadas no mês',
                'Faltas e atrasos',
                'Saldo do banco de horas',
                'OS que você atuou no período',
              ].map((t, i) => (
                <li key={i} style={{
                  ...higType('subheadline'), color: T.textSecondary,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <i className="ti ti-point-filled" style={{ fontSize: 8, color: T.textDim }} aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer text */}
      <div style={{
        ...higType('caption1'),
        color: T.textDim, textAlign: 'center',
        padding: `${HIG_SPACE.xs}px ${HIG_SPACE.md}px`,
        lineHeight: 1.4,
      }}>
        Os dados são pessoais e só você vê.<br />
        O dono tem acesso a um relatório consolidado da equipe.
      </div>
    </div>
  )
}
