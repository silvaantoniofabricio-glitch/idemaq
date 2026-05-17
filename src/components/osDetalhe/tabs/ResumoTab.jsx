// src/components/osDetalhe/tabs/ResumoTab.jsx
// Aba Resumo — contexto do caso. Banners de garantia/recusada, cards Cliente e
// Equipamento (clicáveis no hover), mini-cards de prazo, observações.

import React from 'react'
import { P } from '../../../theme'
import { corEtapa, bgEtapa } from '../../../utils/colors'
import { dentroGarantia, calcStatusPrazo, diasPrazo } from '../../../utils/osHelpers'
import { fmtPrazoCurto } from '../../../utils/fmt'

export default function ResumoTab({ T, dark, os, osBase, onAbrirOS }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)

  const osOrigem = os.garantia && osBase ? osBase.find(o => o.numero === os.os_origem_id) : null
  const isRecusado = os.etapa === 'recusado'
  const isConcluido = os.etapa === 'concluido'
  const garantiaAtiva = isConcluido ? dentroGarantia(os) : false
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)

  const diasNaOS = (() => {
    const inicio = new Date(os.criado_em || os.historico?.[0]?.data || Date.now())
    return Math.max(0, Math.round((new Date() - inicio) / 86400000))
  })()

  return (
    <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Banners contextuais */}
      {os.garantia && osOrigem && (
        <Banner
          T={T} dark={dark} cor={azul} bg={bgEtapa('blue', dark)}
          icon="ti-shield-check"
          titulo="OS em garantia"
          texto={<>Referente à <strong>OS #{osOrigem.numero}</strong> de {osOrigem.cliente} ({osOrigem.equipamento}). Peças a preço de custo, sem mão de obra.</>}
          chevron={!!onAbrirOS}
          onClick={() => onAbrirOS?.(osOrigem.numero)}
        />
      )}

      {garantiaAtiva && !os.garantia && (
        <Banner
          T={T} dark={dark} cor={azul} bg={bgEtapa('blue', dark)}
          icon="ti-shield-check"
          titulo="Garantia ativa"
          texto="Se o cliente retornar com o mesmo defeito dentro do prazo, abra uma OS de garantia pela ficha do cliente."
        />
      )}

      {isRecusado && (
        <Banner
          T={T} dark={dark}
          cor={cor(P.red, P.redDark)} bg={cor('#2a1515', '#fde8e8')}
          icon="ti-circle-x"
          titulo="OS recusada pelo cliente"
          texto="Defina o destino da máquina na aba Etapa: converter em fabricação, cobrar taxa de diagnóstico ou devolver."
        />
      )}

      {/* Cliente e Equipamento agora ficam no Header do modal (sempre visíveis) */}

      {/* Mini-cards: aberta em, prazo, dias na OS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <MiniCard T={T} label="Aberta em" valor={fmtPrazoCurto(os.criado_em) || '—'} icon="ti-calendar-plus" />
        <MiniCard
          T={T} label="Prazo" icon="ti-clock"
          valor={fmtPrazoCurto(os.prazo) || '—'}
          tom={status === 'vencido' ? 'vermelho' : status === 'hoje' ? 'amarelo' : status === 'amanha' ? 'amarelo' : 'neutro'}
          extra={status === 'vencido' ? `${Math.abs(dias)}d atraso` : null}
          dark={dark}
        />
        <MiniCard T={T} label="Dias na OS" valor={`${diasNaOS}d`} icon="ti-hourglass" />
      </div>

      {/* Observações */}
      {os.observacoes && (
        <div className="idemaq-card" style={{
          background: T.cardAlt, border: `1px solid ${T.border}`,
          borderRadius: 9, padding: '12px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <i className="ti ti-notes" style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
            <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>
              Observações
            </span>
          </div>
          <div style={{
            fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{os.observacoes}</div>
        </div>
      )}
    </div>
  )
}

function Banner({ T, dark, cor, bg, icon, titulo, texto, chevron, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px', borderRadius: 9,
        background: bg, border: `1px solid ${cor}55`,
        fontSize: 12, color: T.textSecondary,
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: onClick ? 'pointer' : 'default',
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 20, color: cor, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: T.textPrimary, marginBottom: 2 }}>{titulo}</div>
        <div style={{ lineHeight: 1.4 }}>{texto}</div>
      </div>
      {chevron && <i className="ti ti-chevron-right" style={{ fontSize: 18, color: T.textDim }} aria-hidden="true" />}
    </div>
  )
}

function MiniCard({ T, dark, label, valor, icon, tom = 'neutro', extra }) {
  const cor = (d, c) => dark ? d : c
  const cores = {
    neutro: { c: T.textPrimary, bg: T.cardAlt, border: T.border },
    amarelo: { c: cor(P.yellow, P.yellowDark), bg: cor('#2a2000', '#fdf6dc'), border: cor(P.yellow, P.yellowDark) + '55' },
    vermelho: { c: cor(P.red, P.redDark), bg: cor('#2a1515', '#fde8e8'), border: cor(P.red, P.redDark) + '55' },
  }
  const sc = cores[tom] || cores.neutro
  return (
    <div className="idemaq-card" style={{
      background: sc.bg, border: `1px solid ${sc.border}`,
      borderRadius: 9, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 13, color: T.textMuted }} aria-hidden="true" />
        <span style={{ fontSize: 10, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: sc.c, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </div>
      {extra && (
        <div style={{ fontSize: 10, color: sc.c, marginTop: 1, fontWeight: 600 }}>{extra}</div>
      )}
    </div>
  )
}
