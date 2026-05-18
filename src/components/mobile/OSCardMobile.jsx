// idemaq-src/components/mobile/OSCardMobile.jsx
// Card de OS otimizado pra toque mobile — vertical, alvo touch ≥44px.
// Mostra: cliente, marca/modelo, etapa colorida, prazo com status.

import React from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { calcStatusPrazo, diasPrazo, estaPagaTotal, estaPagaParcial } from '../../utils/osHelpers'
import { fmtPrazoCurto } from '../../utils/fmt'
import { TIPOS_OS } from '../../utils/osData'

function labelEtapa(os) {
  const cfg = TIPOS_OS[os.tipo]
  const e = cfg?.etapas?.find(x => x.id === os.etapa) || cfg?.lateral
  return e?.curto || e?.label || os.etapa
}

function corDaEtapa(os, dark) {
  const cfg = TIPOS_OS[os.tipo]
  const e = cfg?.etapas?.find(x => x.id === os.etapa) || cfg?.lateral
  return corEtapa(e?.cor || 'neutro', dark)
}

function bgDaEtapa(os, dark) {
  const cfg = TIPOS_OS[os.tipo]
  const e = cfg?.etapas?.find(x => x.id === os.etapa) || cfg?.lateral
  return bgEtapa(e?.cor || 'neutro', dark)
}

export default function OSCardMobile({ T, dark, os, onClick }) {
  const cor = (d, c) => dark ? d : c
  const etapaCor = corDaEtapa(os, dark)
  const etapaBg = bgDaEtapa(os, dark)
  const tipo = TIPOS_OS[os.tipo]
  const tipoCor = corEtapa(tipo?.cor || 'blue', dark)
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const pagaTotal = estaPagaTotal(os)
  const pagaParcial = !pagaTotal && estaPagaParcial(os)

  // Prazo: vermelho vencido / amarelo hoje-amanhã / cinza padrão
  const prazoCor = status === 'vencido' ? corEtapa('red', dark)
                 : status === 'hoje' || status === 'amanha' ? corEtapa('yellow', dark)
                 : T.textMuted
  const prazoIcon = status === 'vencido' ? 'ti-alert-triangle'
                  : status === 'hoje' ? 'ti-clock'
                  : status === 'amanha' ? 'ti-calendar-due'
                  : 'ti-calendar-event'

  return (
    <button onClick={onClick}
      className="idemaq-card"
      style={{
        display: 'flex', flexDirection: 'column',
        gap: 8, padding: '12px 13px',
        background: T.card,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${tipoCor}`,
        borderRadius: 12,
        cursor: 'pointer', fontFamily: 'inherit',
        textAlign: 'left', width: '100%', minHeight: 76,
      }}>
      {/* Linha 1: OS# + etapa + badge pagamento */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 800, color: corHero(dark),
          fontVariantNumeric: 'tabular-nums',
        }}>OS #{os.numero}</span>

        {os.garantia && (
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            padding: '2px 7px', borderRadius: 4,
            background: cor('#0d2035', '#e6f1fb'),
            color: corEtapa('blue', dark),
            display: 'inline-flex', alignItems: 'center', gap: 3,
            textTransform: 'uppercase', letterSpacing: '.3px',
          }}>
            <i className="ti ti-shield-check" style={{ fontSize: 11 }} aria-hidden="true" />
            garantia
          </span>
        )}

        <span style={{
          fontSize: 10, fontWeight: 700,
          padding: '2px 8px', borderRadius: 12,
          background: etapaBg, color: etapaCor,
          textTransform: 'uppercase', letterSpacing: '.3px',
          marginLeft: 'auto',
        }}>{labelEtapa(os)}</span>

        {pagaTotal && (
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            padding: '2px 7px', borderRadius: 4,
            background: cor('#0f2a15', '#e8f5ec'),
            color: corEtapa('green', dark),
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            <i className="ti ti-check" style={{ fontSize: 11 }} aria-hidden="true" />
            pago
          </span>
        )}
        {pagaParcial && (
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            padding: '2px 7px', borderRadius: 4,
            background: cor('#2a2000', '#fdf6dc'),
            color: corEtapa('yellow', dark),
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>parcial</span>
        )}
      </div>

      {/* Linha 2: cliente em destaque */}
      <div style={{
        fontSize: 14.5, fontWeight: 700, color: corHero(dark),
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}>{os.cliente || '— sem cliente —'}</div>

      {/* Linha 3: equipamento + prazo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 10, fontSize: 11.5, color: T.textMuted,
      }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          minWidth: 0, flex: 1,
        }}>
          <i className="ti ti-device-washing-machine" style={{ fontSize: 13, flexShrink: 0 }} aria-hidden="true" />
          {[os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento || 'sem equipamento'}
        </span>

        {os.prazo && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: prazoCor, fontWeight: 600,
            fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
          }}>
            <i className={`ti ${prazoIcon}`} style={{ fontSize: 12 }} aria-hidden="true" />
            {status === 'vencido' ? `${Math.abs(dias)}d atraso` : fmtPrazoCurto(os.prazo)}
          </span>
        )}
      </div>
    </button>
  )
}
