// idemaq-src/components/mobile/OSCardMobile.jsx
// Card de OS mobile — espelha o layout denso do KanbanCard desktop.
// Grid 2-col, cliente+valor lado a lado, endereço e tags abaixo.

import React from 'react'
import { P } from '../../theme'
import { TIPOS_OS } from '../../utils/osData'
import { calcStatusPrazo, diasPrazo, estaPagaTotal, estaPagaParcial, totalAPagar } from '../../utils/osHelpers'
import { fmtPrazoCurto } from '../../utils/fmt'
import { corEtapa } from '../../utils/colors'

export default function OSCardMobile({ T, dark, os, onClick, compact = false }) {
  const cor = (d, c) => dark ? d : c
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const tipoCfg = TIPOS_OS[os.tipo] || {}
  const corLinha = corEtapa(tipoCfg.cor || 'blue', dark)
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)
  const mostrarValor = os.valor > 0
  const semPrazo = os.etapa === 'concluido' || os.etapa === 'recusado' || !os.prazo

  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento

  // Pill do prazo — mesma logica do desktop
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

  const tagStyle = (bg, fg) => ({
    padding: '1px 5px', borderRadius: 3,
    fontSize: 9.5, fontWeight: 700,
    background: bg, color: fg,
    display: 'inline-flex', alignItems: 'center', gap: 3,
  })

  const baseStyle = dark
    ? { background: T.card, border: `1px solid ${T.border}`, borderLeft: `3px solid ${corLinha}` }
    : { background: T.card, border: 'none', borderLeft: `3px solid ${corLinha}`, boxShadow: T.shadow }

  const temTags = os.garantia || pagoTotal || pagoParcial || os.aguardando_peca

  return (
    <button onClick={onClick}
      className="idemaq-card"
      style={{
        ...baseStyle,
        borderRadius: 10,
        padding: compact ? '7px 9px' : '10px 12px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textAlign: 'left',
        width: '100%',
        flexShrink: 0,
      }}>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        columnGap: compact ? 6 : 10, rowGap: compact ? 2 : 3,
        alignItems: 'baseline',
      }}>

        {/* Linha 1: tipo + número | prazo pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {tipoCfg.icon && (
            <i className={`ti ${tipoCfg.icon}`}
               style={{ fontSize: 12, color: corEtapa(tipoCfg.cor, dark), flexShrink: 0 }}
               aria-hidden="true" title={tipoCfg.label} />
          )}
          <span style={{
            fontSize: 11, fontWeight: 700, color: T.textMuted,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            fontVariantNumeric: 'tabular-nums',
          }}>#{os.numero}</span>
        </div>
        {prazoPillText ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1px 6px', borderRadius: 3,
            fontSize: 10.5, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            justifySelf: 'end',
            ...prazoPillStyle,
          }}>{prazoPillText}</span>
        ) : <span />}

        {/* Linha 2: cliente | valor */}
        <div style={{
          fontSize: 14, fontWeight: 600, color: T.textPrimary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          minWidth: 0,
        }}>{os.cliente || (os.tipo === 'fabricacao' ? 'Fabricação interna' : '—')}</div>
        {mostrarValor ? (
          <span style={{
            fontSize: 13, color: cor(P.blue, P.blueDark), fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
            justifySelf: 'end',
          }}>R$ {(os.valor - (os.desconto || 0)).toLocaleString('pt-BR')}</span>
        ) : (
          <span style={{
            fontSize: 11.5, color: T.textMuted, fontWeight: 600,
            justifySelf: 'end',
          }}>—</span>
        )}

        {/* Linha 3: equipamento + S/N (span 2) */}
        {linhaEquip && (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: 12, color: T.textSecondary,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {linhaEquip}
            {os.serie && (
              <span style={{
                color: T.textMuted,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                fontSize: 11,
                marginLeft: 6,
              }}>· S/N {os.serie}</span>
            )}
          </div>
        )}

        {/* Linha 4: endereço (span 2) — oculto no modo compact */}
        {!compact && endResumido && (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: 11.5, color: T.textMuted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginTop: 1,
          }}>{endResumido}</div>
        )}

        {/* Linha 5: tags (span 2) — oculto no modo compact */}
        {!compact && temTags && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
            marginTop: 5,
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
          </div>
        )}

      </div>
    </button>
  )
}
