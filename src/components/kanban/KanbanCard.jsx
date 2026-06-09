// src/components/kanban/KanbanCard.jsx
// Card do Kanban — Apple HIG: elevação, tipografia SF, tags em pill.

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
  const semPrazo = os.etapa === 'concluido' || os.etapa === 'recusado' || !os.prazo

  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento

  function handleDragStart(e) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(os.numero))
    onDragStart?.()
  }

  // Prazo pill
  let prazoPillText = null
  let prazoPillStyle = null
  if (!semPrazo) {
    if (status === 'vencido') {
      prazoPillStyle = { background: cor('#3a0e0e', '#fff0f0'), color: cor('#ff7070', P.redDark) }
      prazoPillText = `${Math.abs(dias)}d atr.`
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

  const pill = (bg, fg) => ({
    padding: '2px 7px', borderRadius: 100,
    fontSize: 10, fontWeight: 600,
    background: bg, color: fg,
    display: 'inline-flex', alignItems: 'center', gap: 3,
    letterSpacing: '0.01em',
  })

  const cardStyle = dark
    ? { background: '#2a2a2d', borderLeft: `3px solid ${corLinha}` }
    : { background: '#ffffff', borderLeft: `3px solid ${corLinha}`, boxShadow: '0 1px 4px rgba(0,0,0,.07), 0 0 0 .5px rgba(0,0,0,.04)' }

  const temTags = os.garantia || pagoTotal || pagoParcial || os.aguardando_peca || (os.horasNaEtapa && os.horasNaEtapa > 24)

  return (
    <div onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={shaking ? 'idemaq-shake' : undefined}
      style={{
        ...cardStyle,
        borderRadius: 11,
        padding: '10px 12px',
        cursor: 'grab',
        transition: 'box-shadow .18s, transform .15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        if (!dark) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.1), 0 0 0 .5px rgba(0,0,0,.05)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        if (!dark) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.07), 0 0 0 .5px rgba(0,0,0,.04)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      onMouseDown={e => { e.currentTarget.style.cursor = 'grabbing' }}
      onMouseUp={e => { e.currentTarget.style.cursor = 'grab' }}>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', columnGap: 10, rowGap: 3, alignItems: 'baseline' }}>

        {/* Linha 1: tipo + número + dias aberto | prazo pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {modoTodos && (
            <i className={`ti ${tipoCfg.icon}`}
               style={{ fontSize: 11, color: corEtapa(tipoCfg.cor, dark), flexShrink: 0 }}
               aria-hidden="true" title={tipoCfg.label} />
          )}
          <span style={{
            fontSize: 10.5, fontWeight: 500, color: T.textMuted,
            fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
            fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em',
          }}>#{os.numero}</span>
          {(() => {
            // Conta a partir da confirmação de coleta (entrada em 'recebido').
            // Para fabricação/venda sem recebido, usa a abertura da OS.
            const recebido = os.historico?.find(h => h.etapa === 'recebido')
            const base = recebido?.data || os.abertura
            if (!base) return null
            const dias = Math.floor((Date.now() - new Date(base).getTime()) / 86400000)
            if (dias < 0) return null
            return (
              <span style={{
                marginLeft: 'auto', flexShrink: 0,
                fontSize: 10, color: T.textDim,
                fontVariantNumeric: 'tabular-nums',
              }}>{dias}d</span>
            )
          })()}
        </div>
        {prazoPillText ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1.5px 7px', borderRadius: 100,
            fontSize: 10, fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            justifySelf: 'end',
            ...prazoPillStyle,
          }}>{prazoPillText}</span>
        ) : <span />}

        {/* Linha 2: cliente | valor */}
        <div style={{
          fontSize: 13.5, fontWeight: 600, color: T.textPrimary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          minWidth: 0, letterSpacing: '-0.01em',
        }}>{os.cliente}</div>
        {mostrarValor ? (
          <span style={{
            fontSize: 12.5, color: cor(P.blue, P.blueDark), fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
            justifySelf: 'end',
          }}>R$ {(os.valor - (os.desconto || 0)).toLocaleString('pt-BR')}</span>
        ) : (
          <span style={{ fontSize: 11, color: T.textDim, fontWeight: 400, justifySelf: 'end' }}>—</span>
        )}

        {/* Linha 3: equipamento */}
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
                fontFamily: '"SF Mono", ui-monospace, Menlo, monospace',
                fontSize: 10.5, marginLeft: 6,
              }}>· {os.serie}</span>
            )}
          </div>
        )}

        {/* Linha 4: endereço */}
        {endResumido && (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: 11, color: T.textMuted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{endResumido}</div>
        )}

        {/* Linha 5: dual status oficina
            tem_limpeza/tem_manutencao: undefined = form nunca aberto (mostra ambos como padrão)
                                        true/false = definido pelo orçamento ao salvar o Conserto
            Manut.: status da peça a comprar (vermelho/amarelo) tem prioridade sobre o status do serviço. */}
        {dual && (() => {
          const of = os.pre_diagnostico?.oficina || {}
          // Se as flags ainda não foram salvas (OS nunca tocou no Conserto), mostra as duas
          const semFlags = of.tem_limpeza === undefined && of.tem_manutencao === undefined
          const mostraLimp  = semFlags || of.tem_limpeza
          const mostraManut = semFlags || of.tem_manutencao
          if (!mostraLimp && !mostraManut) return null
          return (
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 4, marginTop: 5 }}>
              {mostraLimp  && <SubStatus label="Limp."  status={of.limpeza_status}    T={T} dark={dark} />}
              {mostraManut && <SubStatus label="Manut." status={os.manutPecaStatus || of.manutencao_status} T={T} dark={dark} />}
            </div>
          )
        })()}

        {/* Linha 6: tags */}
        {temTags && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
            marginTop: 6,
          }}>
            {os.garantia && (
              <span title={`Garantia da OS #${os.os_origem_id}`}
                    style={pill(cor('#0d2035', '#e6f1fb'), cor(P.blue, P.blueDark))}>
                <i className="ti ti-shield-check" style={{ fontSize: 10 }} aria-hidden="true" />Garantia
              </span>
            )}
            {pagoTotal && (
              <span style={pill(cor('#0e2818', '#e6f7ed'), cor(P.green, P.greenDark))}>
                <i className="ti ti-check" style={{ fontSize: 10 }} aria-hidden="true" />Pago
              </span>
            )}
            {pagoParcial && (
              <span style={{ ...pill(cor('#2e2204', '#fff8d8'), cor(P.yellow, P.yellowDark)), fontVariantNumeric: 'tabular-nums' }}>
                R$ {(os.valor_pago || 0).toLocaleString('pt-BR')}/{(totalAPagar(os)).toLocaleString('pt-BR')}
              </span>
            )}
            {os.aguardando_peca && (
              <span style={pill(cor('#3a2200', '#fff4e0'), '#ff9800')}>
                <i className="ti ti-package" style={{ fontSize: 10 }} aria-hidden="true" />peça
              </span>
            )}
            {os.horasNaEtapa && os.horasNaEtapa > 24 && (
              <span style={pill(cor('#2a1515', '#fde8e8'), cor(P.red, P.redDark))}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 10 }} aria-hidden="true" />{os.horasNaEtapa}h
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
