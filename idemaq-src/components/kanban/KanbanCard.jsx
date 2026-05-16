// idemaq-src/components/kanban/KanbanCard.jsx
// Card de OS no kanban — visual idêntico ao App.jsx atual.

import React from 'react'
import { P } from '../../theme'
import { TIPOS_OS } from '../../utils/osData'
import { calcStatusPrazo, diasPrazo, estaPagaTotal, estaPagaParcial, totalAPagar } from '../../utils/osHelpers'
import { fmtPrazoCurto } from '../../utils/fmt'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import Badge from '../ui/Badge'
import SubStatus from './SubStatus'

export default function KanbanCard({
  os, T, dark,
  tipoCor,
  modoTodos = true,
  onClick,
  onDragStart, onDragEnd,
  shaking,
}) {
  const cor = (d, c) => dark ? d : c
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const tipoCfg = TIPOS_OS[os.tipo]
  const corLinha = modoTodos ? corEtapa(tipoCfg.cor, dark) : tipoCor
  const dual = os.etapa === 'oficina'
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)

  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' · ')

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(os.numero))
    onDragStart?.()
  }

  const baseStyle = dark
    ? { background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${corLinha}` }
    : { background: T.card, border: 'none', borderLeft: `3px solid ${corLinha}`, boxShadow: T.shadow }

  return (
    <div onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={shaking ? 'idemaq-shake' : undefined}
      style={{ ...baseStyle, borderRadius: 10, padding: '11px 12px', cursor: 'grab', transition: 'box-shadow .15s, border-color .15s, transform .15s' }}
      onMouseEnter={e => {
        if (dark) { e.currentTarget.style.borderColor = '#3a3a3e'; e.currentTarget.style.borderLeftColor = corLinha }
        else { e.currentTarget.style.boxShadow = T.shadowHover; e.currentTarget.style.transform = 'translateY(-1px)' }
      }}
      onMouseLeave={e => {
        if (dark) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.borderLeftColor = corLinha }
        else { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.transform = 'translateY(0)' }
      }}
      onMouseDown={e => { e.currentTarget.style.cursor = 'grabbing' }}
      onMouseUp={e => { e.currentTarget.style.cursor = 'grab' }}>

      {/* Header: nº OS + tipo + status do prazo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {modoTodos && <i className={`ti ${tipoCfg.icon}`} style={{ fontSize: 12, color: corEtapa(tipoCfg.cor, dark) }} aria-hidden="true" title={tipoCfg.label} />}
          <span style={{
            fontSize: 11, fontWeight: 700, color: T.textMuted,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
          }}>#{os.numero}</span>
          {os.garantia && (
            <span title={`Garantia da OS #${os.os_origem_id}`} style={{
              padding: '1px 6px', borderRadius: 8,
              background: cor('#0d2035', '#e6f1fb'), color: cor(P.blue, P.blueDark),
              fontSize: 9.5, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <i className="ti ti-shield-check" style={{ fontSize: 10 }} aria-hidden="true" />Garantia
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {pagoTotal && (
            <Badge variant="verde" dark={dark}>
              <i className="ti ti-check" style={{ fontSize: 10, marginRight: 2 }} aria-hidden="true" />Pago
            </Badge>
          )}
          {pagoParcial && (
            <Badge variant="amarelo" dark={dark}>
              R$ {(os.valor_pago || 0).toLocaleString('pt-BR')}/{(totalAPagar(os)).toLocaleString('pt-BR')}
            </Badge>
          )}
          {os.aguardando_peca && (
            <Badge color={'#ff9800'} bg={cor('#3a2200', '#fff4e0')} border={'#ff980044'}>
              <i className="ti ti-package" style={{ fontSize: 10, marginRight: 3 }} aria-hidden="true" />peça
            </Badge>
          )}
          {status === 'vencido' && <Badge variant="vermelho" dark={dark}>{Math.abs(dias)}d</Badge>}
          {status === 'hoje'    && <Badge variant="amarelo"  dark={dark}>Hoje</Badge>}
          {status === 'amanha'  && <Badge variant="amarelo"  dark={dark}>Amanhã</Badge>}
          {status === 'ok' && os.etapa !== 'concluido' && os.etapa !== 'recusado' && (
            <Badge variant="verde" dark={dark}>{dias}d</Badge>
          )}
        </div>
      </div>

      {/* Cliente + telefone */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1 }}>{os.cliente}</div>
        {os.fone && <div style={{ fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap' }}>{os.fone}</div>}
      </div>

      {/* Endereço */}
      {endResumido && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7, fontSize: 11.5, color: T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <i className="ti ti-map-pin" style={{ fontSize: 11, color: T.textDim, flexShrink: 0 }} aria-hidden="true" />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{endResumido}</span>
        </div>
      )}

      {/* Marca · modelo · S/N */}
      <div style={{ padding: '6px 8px', background: T.cardAlt, borderRadius: 6, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: T.textPrimary, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <i className="ti ti-device-mobile-cog" style={{ fontSize: 11, color: T.textDim, flexShrink: 0 }} aria-hidden="true" />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{linhaEquip || os.equipamento}</span>
        </div>
        {os.serie && (
          <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 2, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>S/N: {os.serie}</div>
        )}
      </div>

      {/* Dual status (limpeza + manutenção) */}
      {dual && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <SubStatus label="Limp."  status={os.limpeza}    T={T} dark={dark} />
          <SubStatus label="Manut." status={os.manutencao} T={T} dark={dark} />
        </div>
      )}

      {/* Rodapé */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-calendar" style={{ fontSize: 11, color: T.textDim }} aria-hidden="true" />
          <span style={{ fontSize: 11, color: T.textMuted }}>{fmtPrazoCurto(os.prazo)}</span>
        </div>
        {os.valor > 0 && (
          <span style={{
            fontSize: 12, color: corHero(dark), fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
          }}>R$ {(os.valor - (os.desconto || 0)).toLocaleString('pt-BR')}</span>
        )}
      </div>

      {os.horasNaEtapa && os.horasNaEtapa > 24 && (
        <div style={{
          marginTop: 7, padding: '4px 7px', borderRadius: 5,
          background: cor('#2a1515', '#fde8e8'),
          color: cor(P.red, P.redDark),
          fontSize: 10, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} aria-hidden="true" />
          {os.horasNaEtapa}h nesta etapa
        </div>
      )}
    </div>
  )
}
