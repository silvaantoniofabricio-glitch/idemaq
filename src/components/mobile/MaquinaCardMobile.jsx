// idemaq-src/components/mobile/MaquinaCardMobile.jsx
// Card de máquina mobile — vertical, touch ≥76px.
//
// Layout:
//   Linha 1: modelo (bold, truncate) + badge estado à direita
//   Linha 2: marca · capacidade (mute)
//   Linha 3: stats — [Custo total se dono] · Venda
//
// Border-left colorida pelo estado (verde disponível / amarelo revisão /
// azul do cliente / cinza vendida).

import React from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'

const ESTADO_INFO = {
  disponivel: { label: 'Disponível', icon: 'ti-circle-check',  cor: 'green'  },
  em_revisao: { label: 'Em revisão', icon: 'ti-tool',          cor: 'yellow' },
  do_cliente: { label: 'Do cliente', icon: 'ti-user',          cor: 'blue'   },
  vendida:    { label: 'Vendida',    icon: 'ti-circle-dashed', cor: 'neutro' },
}

export default function MaquinaCardMobile({ T, dark, maquina, mostraValores = true, onClick }) {
  const est = ESTADO_INFO[maquina.estado] || ESTADO_INFO.disponivel
  const corEst = corEtapa(est.cor, dark)
  const custoTotal = (maquina.custoCompra || 0) + (maquina.custoItens || 0) + (maquina.custoServico || 0)

  return (
    <button onClick={onClick}
      className="idemaq-card"
      style={{
        display: 'flex', flexDirection: 'column',
        gap: 6, padding: '12px 14px',
        background: T.card,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${corEst}`,
        borderRadius: 12,
        cursor: 'pointer', fontFamily: 'inherit',
        textAlign: 'left', width: '100%', minHeight: 76,
      }}>
      {/* Linha 1: modelo + badge estado */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 14.5, fontWeight: 700,
          color: corHero(dark),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0, lineHeight: 1.25,
        }}>
          {maquina.modelo}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 10,
          background: corEst + '22', color: corEst,
          border: `1px solid ${corEst}55`,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          whiteSpace: 'nowrap', flexShrink: 0,
          textTransform: 'uppercase', letterSpacing: '.3px',
        }}>
          <i className={`ti ${est.icon}`} style={{ fontSize: 11 }} aria-hidden="true" />
          {est.label}
        </span>
      </div>

      {/* Linha 2: marca · capacidade */}
      <div style={{
        fontSize: 11, color: T.textMuted,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {[maquina.marca, maquina.capacidade].filter(Boolean).join(' · ')}
      </div>

      {/* Linha 3: stats — minWidth: 0 + truncate no Stat protegem overflow */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginTop: 2,
        minWidth: 0,
      }}>
        {mostraValores && (
          <Stat T={T} label="Custo total"
            value={custoTotal > 0 ? fmtBRL(custoTotal) : '—'}
            corValor={corHero(dark)} />
        )}
        <Stat T={T} label="Venda"
          value={maquina.precoVenda > 0 ? fmtBRL(maquina.precoVenda) : '—'}
          corValor={corHero(dark)} />
      </div>
    </button>
  )
}

function Stat({ T, label, value, corValor }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 1,
      minWidth: 0,
    }}>
      <span style={{
        fontSize: 9.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.3px',
      }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700,
        color: corValor || T.textPrimary,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{value}</span>
    </div>
  )
}
