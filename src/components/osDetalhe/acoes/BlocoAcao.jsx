// src/components/osDetalhe/acoes/BlocoAcao.jsx
// Wrapper visual padrão de toda Ação por etapa.
// Cabeçalho amarelo "FAZER AGORA — {etapa}" + área de conteúdo dentro.

import React from 'react'
import { P } from '../../../theme'
import { corEtapa } from '../../../utils/colors'

export default function BlocoAcao({ T, dark, icon, etapa, descricao, children, tom = 'azul' }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = cor(P.yellow, P.yellowDark)
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  const tons = {
    amarelo: {
      bg: dark ? 'rgba(255,217,102,0.06)' : 'rgba(255,217,102,0.12)',
      border: `${amarelo}66`,
      headerColor: amarelo,
    },
    azul: {
      bg: cor('#0d2035', '#e6f1fb'),
      border: `${azul}55`,
      headerColor: azul,
    },
    verde: {
      bg: cor('#0f2a15', '#e8f5ec'),
      border: `${verde}55`,
      headerColor: verde,
    },
    vermelho: {
      bg: cor('#2a1515', '#fde8e8'),
      border: `${vermelho}55`,
      headerColor: vermelho,
    },
  }
  const c = tons[tom] || tons.amarelo

  // DEV ONLY: zera o fundo tonalizado quando rodando local (npm run dev)
  // pra facilitar comparação visual com a versão do Vercel. Build de
  // produção (import.meta.env.DEV === false) mantém o tom original.
  const bgFinal = import.meta.env.DEV ? 'transparent' : c.bg

  return (
    <div style={{
      background: bgFinal,
      border: `1.5px solid ${c.border}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 18, color: c.headerColor }} aria-hidden="true" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: c.headerColor,
            textTransform: 'uppercase', letterSpacing: '.6px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            FAZER AGORA
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ color: c.headerColor }}>{etapa}</span>
          </div>
          {descricao && (
            <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 3 }}>
              {descricao}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  )
}
