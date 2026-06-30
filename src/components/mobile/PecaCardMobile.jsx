// idemaq-src/components/mobile/PecaCardMobile.jsx
// Card de peça otimizado pra toque mobile — vertical, alvo touch ≥76px.
//
// Layout:
//   Linha 1: nome (bold, truncate) + badge categoria à direita
//   Linha 2: SKU · fornecedor · marca (mute, menor)
//   Linha 3: bloco numérico — Qtd (com /mínimo) · Venda · [Custo se dono] · status badge à direita
//
// Funcionário não vê Custo (mostraValores=false). Border-left colorida no
// status (azul OK / amarelo baixo / vermelho esgotado / cinza catálogo).

import React from 'react'
import { corEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { CATEGORIA_POR_ID } from '../../utils/categoriasPeca'

// Paleta Deutan p/ chips de categoria — espelha desktop
const PALETA_CAT = ['#5B9BD5', '#FFD966', '#FF6B6B', '#B8CCE4']
function corDaCategoria(catId) {
  if (!catId) return PALETA_CAT[0]
  let h = 0
  for (let i = 0; i < catId.length; i++) h = (h * 31 + catId.charCodeAt(i)) | 0
  return PALETA_CAT[Math.abs(h) % PALETA_CAT.length]
}

function nivelEstoque(qtd, min) {
  if (!min || min <= 0) return 'catalogo'
  if (qtd <= 0) return 'esgotado'
  if (qtd <= min) return 'baixo'
  return 'ok'
}

const NIVEL_INFO = {
  catalogo: { label: 'Catálogo',      icon: 'ti-book-2',          cor: 'neutro' },
  esgotado: { label: 'Esgotado',      icon: 'ti-alert-octagon',   cor: 'red' },
  baixo:    { label: 'Baixo',         icon: 'ti-alert-triangle',  cor: 'yellow' },
  ok:       { label: 'OK',            icon: 'ti-check',           cor: 'blue' },
}

function corNivel(n, dark) {
  return corEtapa(NIVEL_INFO[n].cor === 'neutro' ? 'neutro' : NIVEL_INFO[n].cor, dark)
}

export default function PecaCardMobile({ T, dark, peca, mostraValores = true, onClick }) {
  const cat = peca.categoria && CATEGORIA_POR_ID[peca.categoria]
  const catCor = corDaCategoria(peca.categoria)
  const nv = nivelEstoque(peca.qtdAtual, peca.qtdMinima)
  const info = NIVEL_INFO[nv]
  const corStatus = corNivel(nv, dark)

  // Detalhes da segunda linha (SKU · fornecedor · marca) — pula vazios
  const detalhes = [
    peca.sku || null,
    peca.fornecedor || null,
    peca.marca || null,
  ].filter(Boolean)

  return (
    <button onClick={onClick}
      className="idemaq-card"
      style={{
        display: 'flex', flexDirection: 'column',
        gap: 6, padding: '12px 14px',
        background: T.card,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${corStatus}`,
        borderRadius: 12,
        cursor: 'pointer', fontFamily: 'inherit',
        textAlign: 'left', width: '100%', minHeight: 76,
      }}>
      {/* Linha 1: nome + badge categoria */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 14.5, fontWeight: 700,
          color: corHero(dark),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0, lineHeight: 1.25,
        }}>
          {peca.favorito && (
            <i className="ti ti-star-filled"
               title="Favorita"
               style={{ color: '#f59e0b', marginRight: 4, fontSize: 14 }} />
          )}
          {peca.nome}
        </span>
        {cat && (
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            padding: '2px 7px', borderRadius: 4,
            background: catCor + '22',
            color: catCor,
            border: `1px solid ${catCor}55`,
            textTransform: 'uppercase', letterSpacing: '.3px',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}>
            {cat.label}
          </span>
        )}
      </div>

      {/* Linha 2: SKU · fornecedor · marca (apenas se houver) */}
      {detalhes.length > 0 && (
        <div style={{
          fontSize: 11, color: T.textMuted,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {detalhes.join(' · ')}
        </div>
      )}

      {/* Linha 3: stats — Qtd, Venda, [Custo se dono] + status badge à direita.
          Em vez de flexWrap (que pode jogar badge sozinho na 2ª linha de
          forma feia), usa minWidth: 0 + overflow controlado pra truncar
          graciosamente em telas estreitas. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginTop: 2,
        minWidth: 0,
      }}>
        <Stat T={T} dark={dark} label="Qtd"
          value={
            <span style={{ whiteSpace: 'nowrap' }}>
              <span style={{ color: nv === 'esgotado' ? corStatus : nv === 'baixo' ? corStatus : corHero(dark) }}>{peca.qtdAtual}</span>
              <span style={{ color: T.textDim, fontWeight: 500 }}> / {peca.qtdMinima}</span>
            </span>
          }
        />
        <Stat T={T} dark={dark} label="Venda" value={fmtBRL(peca.precoVenda)} corValor={corHero(dark)} />
        {mostraValores && (
          <Stat T={T} dark={dark} label="Custo" value={fmtBRL(peca.custoAtual)} corValor={T.textSecondary} />
        )}
        {mostraValores && peca.custoAtual > 0 && peca.precoVenda > 0 && (
          <Stat T={T} dark={dark} label="Lucro"
            value={`${Math.round(((peca.precoVenda - peca.custoAtual) / peca.custoAtual) * 100)}%`}
            corValor={peca.precoVenda > peca.custoAtual ? corEtapa('blue', dark) : corEtapa('red', dark)} />
        )}

        <span style={{
          marginLeft: 'auto',
          fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 10,
          background: corStatus + '22', color: corStatus,
          border: `1px solid ${corStatus}55`,
          display: 'inline-flex', alignItems: 'center', gap: 4,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase', letterSpacing: '.3px',
          flexShrink: 0,
        }}>
          <i className={`ti ${info.icon}`} style={{ fontSize: 11 }} aria-hidden="true" />
          {info.label}
        </span>
      </div>
    </button>
  )
}

function Stat({ T, label, value, corValor }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 1,
      minWidth: 0,            // permite truncar quando faltar espaço
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
