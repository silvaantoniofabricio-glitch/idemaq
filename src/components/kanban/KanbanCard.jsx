// src/components/kanban/KanbanCard.jsx
// Card do kanban — layout v3 (denso): grid 2-col, cliente+valor lado a lado,
// equipamento e endereço em linha simples, telefone/SN só no detalhe.

import React from 'react'
import { P } from '../../theme'
import { TIPOS_OS } from '../../utils/osData'
import { calcStatusPrazo, diasPrazo, estaPagaTotal, estaPagaParcial, totalAPagar } from '../../utils/osHelpers'
import { fmtPrazoCurto } from '../../utils/fmt'
import { corEtapa } from '../../utils/colors'
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
  const mostrarValor = os.valor > 0
  const semPrazo = os.etapa === 'concluido' || os.etapa === 'recusado'

  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(os.numero))
    onDragStart?.()
  }

  // Pill do prazo — cor por status, "ok" fica discreto (sem fundo)
  let prazoPillText = null
  let prazoPillStyle = null
  if (!semPrazo) {
    if (status === 'vencido') {
      prazoPillStyle = { background: cor('#2e0e0e', '#fde8e8'), color: cor(P.red, P.redDark) }
      prazoPillText = `${Math.abs(dias)}d atras.`
    } else if (status === 'hoje') {
      prazoPillStyle = { background: cor('#2e2204', '#fff8d8'), color: cor(P.yellow, P.yellowDark) }
      prazoPillText = 'Hoje'
    } else if (status === 'amanha') {
      prazoPillStyle = { background: cor('#2e2204', '#fff8d8'), color: cor(P.yellow, P.yellowDark) }
      prazoPillText = 'Amanhã'
    } else if (status === 'ok') {
      prazoPillStyle = { background: 'transparent', color: T.textMuted, padding: '1px 0' }
      prazoPillText = `${fmtPrazoCurto(os.prazo)} · ${dias}d`
    }
  }

  // Badge base (tags do rodapé)
  const tagStyle = (bg, fg) => ({
    padding: '1px 5px', borderRadius: 3,
    fontSize: 9.5, fontWeight: 700,
    background: bg, color: fg,
    display: 'inline-flex', alignItems: 'center', gap: 3,
  })

  const baseStyle = dark
    ? { background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${corLinha}` }
    : { background: T.card, border: 'none', borderLeft: `3px solid ${corLinha}`, boxShadow: T.shadow }

  const temTags = os.garantia || pagoTotal || pagoParcial || os.aguardando_peca || (os.horasNaEtapa && os.horasNaEtapa > 24)

  return (
    <div onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={shaking ? 'idemaq-shake' : undefined}
      style={{ ...baseStyle, borderRadius: 10, padding: '9px 11px', cursor: 'grab', transition: 'box-shadow .15s, border-color .15s, transform .15s' }}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 10, rowGap: 2, alignItems: 'baseline' }}>

        {/* Linha 1: tipo + número | prazo pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {modoTodos && (
            <i className={`ti ${tipoCfg.icon}`}
               style={{ fontSize: 11, color: corEtapa(tipoCfg.cor, dark), flexShrink: 0 }}
               aria-hidden="true" title={tipoCfg.label} />
          )}
          <span style={{
            fontSize: 10.5, fontWeight: 700, color: T.textMuted,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
          }}>#{os.numero}</span>
        </div>
        {prazoPillText ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1px 6px', borderRadius: 3,
            fontSize: 10, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            justifySelf: 'end',
            ...prazoPillStyle,
          }}>{prazoPillText}</span>
        ) : <span />}

        {/* Linha 2: cliente | valor */}
        <div style={{
          fontSize: 13, fontWeight: 600, color: T.textPrimary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          minWidth: 0,
        }}>{os.cliente}</div>
        {mostrarValor ? (
          <span style={{
            fontSize: 12.5, color: cor(P.blue, P.blueDark), fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
            justifySelf: 'end',
          }}>R$ {(os.valor - (os.desconto || 0)).toLocaleString('pt-BR')}</span>
        ) : (
          <span style={{
            fontSize: 11, color: T.textMuted, fontWeight: 600,
            justifySelf: 'end',
          }}>—</span>
        )}

        {/* Linha 3: equipamento + S/N (span 2) */}
        <div style={{
          gridColumn: '1 / -1',
          fontSize: 11.5, color: T.textSecondary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {linhaEquip}
          {os.serie && (
            <span style={{
              color: T.textMuted,
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
              fontSize: 10.5,
              marginLeft: 6,
            }}>· S/N {os.serie}</span>
          )}
        </div>

        {/* Linha 4: endereço (span 2, sem ícone) */}
        {endResumido && (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: 11, color: T.textMuted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginTop: 1,
          }}>{endResumido}</div>
        )}

        {/* Linha 5: dual status oficina (span 2) */}
        {dual && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 4, marginTop: 6 }}>
            <SubStatus label="Limp."  status={os.limpeza}    T={T} dark={dark} />
            <SubStatus label="Manut." status={os.manutencao} T={T} dark={dark} />
          </div>
        )}

        {/* Linha 6: tags (span 2) */}
        {temTags && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
            marginTop: 6,
          }}>
            {os.garantia && (
              <span title={`Garantia da OS #${os.os_origem_id}`}
                    style={tagStyle(cor('#0d2035', '#e6f1fb'), cor(P.blue, P.blueDark))}>
                <i className="ti ti-shield-check" style={{ fontSize: 10 }} aria-hidden="true" />Garantia
              </span>
            )}
            {pagoTotal && (
              <span style={tagStyle(cor('#0e2818', '#e6f7ed'), cor(P.green, P.greenDark))}>
                <i className="ti ti-check" style={{ fontSize: 10 }} aria-hidden="true" />Pago
              </span>
            )}
            {pagoParcial && (
              <span style={{
                ...tagStyle(cor('#2e2204', '#fff8d8'), cor(P.yellow, P.yellowDark)),
                fontVariantNumeric: 'tabular-nums',
              }}>
                R$ {(os.valor_pago || 0).toLocaleString('pt-BR')}/{(totalAPagar(os)).toLocaleString('pt-BR')}
              </span>
            )}
            {os.aguardando_peca && (
              <span style={tagStyle(cor('#3a2200', '#fff4e0'), '#ff9800')}>
                <i className="ti ti-package" style={{ fontSize: 10 }} aria-hidden="true" />peça
              </span>
            )}
            {os.horasNaEtapa && os.horasNaEtapa > 24 && (
              <span style={tagStyle(cor('#2a1515', '#fde8e8'), cor(P.red, P.redDark))}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 10 }} aria-hidden="true" />{os.horasNaEtapa}h
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
