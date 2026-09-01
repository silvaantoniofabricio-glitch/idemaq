// src/components/mobile/OSCardMobile.jsx
// Card de OS mobile — Atlassian Design (reescrito 28/05/2026).
// Layout denso 2 colunas (cliente+valor), border-left colorida por tipo,
// border 1px + radius 4 + shadow sutil padrao Atlassian.

import React from 'react'
import { TIPOS_OS } from '../../utils/osData'
import {
  calcStatusPrazo, diasPrazo, estaPagaTotal, estaPagaParcial, totalAPagar,
  statusServicoSub, secoesOficinaVisiveis,
} from '../../utils/osHelpers'
import { corEtapa } from '../../utils/colors'
import SubStatus from '../kanban/SubStatus'

const ATL_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, sans-serif'
const MONO_FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

export default function OSCardMobile({ T, dark, os, onClick, compact = false }) {
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const tipoCfg = TIPOS_OS[os.tipo] || {}
  const corLinha = corEtapa(tipoCfg.cor || 'blue', dark)
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)
  // Só mostra o valor depois que o orçamento foi CONFIRMADO pelo cliente —
  // antes disso é só um rascunho (os.valor já vai sendo preenchido enquanto
  // o orçamento é montado, mesmo sem confirmação ainda).
  const orcamentoStatus = os.pre_diagnostico?.orcamento_status || os.orcamento_status || 'idle'
  const mostrarValor = os.valor > 0 && orcamentoStatus === 'confirmado'
  const semPrazo = os.etapa === 'concluido' || os.etapa === 'recusado' || !os.prazo

  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)
  const amarelo = corEtapa('yellow', dark)

  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento

  // Pill do prazo
  let prazoPillText = null
  let prazoPillCor = null
  if (!semPrazo) {
    if (status === 'vencido') {
      prazoPillCor = vermelho
      prazoPillText = `${Math.abs(dias)}d atrás`
    } else if (status === 'hoje') {
      prazoPillCor = amarelo
      prazoPillText = 'Hoje'
    } else if (status === 'amanha') {
      prazoPillCor = amarelo
      prazoPillText = 'Amanhã'
    } else if (status === 'ok') {
      prazoPillCor = T.textMuted
      prazoPillText = `${dias}d`
    }
  }

  const tagStyle = (cor) => ({
    padding: '1px 6px', borderRadius: 3,
    fontSize: 10, fontWeight: 700,
    background: cor + '22', color: cor,
    display: 'inline-flex', alignItems: 'center', gap: 3,
    letterSpacing: '-0.005em',
  })

  const temTags = os.garantia || pagoTotal || pagoParcial || os.aguardando_peca

  // Conserto: chips Limp./Manut. — visibilidade pela DETECÇÃO REAL de serviços/
  // peças (os._temLimp/_temManut, enriquecido no OSMobile). Não mostra "Limp."
  // em OS sem limpeza.
  const dual = os.etapa === 'oficina'
  const of = os.pre_diagnostico?.oficina || {}
  const { limp: mostraLimpRaw, manut: mostraManutRaw } = secoesOficinaVisiveis(os)
  const mostraLimp = dual && mostraLimpRaw
  const mostraManut = dual && mostraManutRaw

  return (
    <button onClick={onClick}
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${corLinha}`,
        borderRadius: 4,
        padding: compact ? '7px 9px' : '10px 12px',
        cursor: 'pointer',
        fontFamily: ATL_FONT,
        textAlign: 'left',
        width: '100%',
        flexShrink: 0,
        boxShadow: dark ? 'none' : '0 1px 1px rgba(9,30,66,0.10)',
        WebkitTapHighlightColor: 'transparent',
      }}>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto',
        columnGap: compact ? 6 : 10, rowGap: compact ? 2 : 3,
        alignItems: 'baseline',
      }}>
        {/* Linha 1: tipo + numero + dias aberto | prazo pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
          {tipoCfg.icon && (
            <i className={`ti ${tipoCfg.icon}`}
               style={{ fontSize: 12, color: corEtapa(tipoCfg.cor, dark), flexShrink: 0 }}
               aria-hidden="true" title={tipoCfg.label} />
          )}
          <span style={{
            fontSize: 11, fontWeight: 700, color: T.textMuted,
            fontFamily: MONO_FONT,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.005em',
          }}>#{os.numero}</span>
          {os.etapa === 'orcamento' && (() => {
            const st = os.pre_diagnostico?.orcamento_status || os.orcamento_status || 'idle'
            if (st !== 'idle' && st !== 'aguardando') return null
            const enviado = st === 'aguardando'
            return (
              <span
                title={enviado ? 'Orçamento enviado — aguardando resposta' : 'Orçamento ainda não enviado'}
                style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: enviado ? corEtapa('yellow', dark) : (dark ? '#5a5f66' : '#B8BEC6'),
                }} />
            )
          })()}
          {(() => {
            const recebido = os.historico?.find(h => h.etapa === 'diagnostico')
            const base = recebido?.data || os.abertura
            if (!base) return null
            const dias = Math.floor((Date.now() - new Date(base).getTime()) / 86400000)
            if (dias < 0) return null
            return (
              <span title="Aberta há" style={{
                marginLeft: 'auto', flexShrink: 0,
                display: 'inline-flex', alignItems: 'center', gap: 2,
                fontSize: 10, color: T.textDim,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <i className="ti ti-clock" style={{ fontSize: 10 }} aria-hidden="true" />{dias}d</span>
            )
          })()}
        </div>
        {prazoPillText ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1px 7px', borderRadius: 3,
            fontSize: 10.5, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            justifySelf: 'end',
            background: status === 'ok' ? 'transparent' : prazoPillCor + '22',
            color: prazoPillCor,
            letterSpacing: '-0.005em',
          }}>
            <i className="ti ti-flag" style={{ fontSize: 10 }} aria-hidden="true" />{prazoPillText}</span>
        ) : <span />}

        {/* Linha 2: cliente | valor */}
        <div style={{
          fontSize: 13.5, fontWeight: 600, color: T.textPrimary,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          minWidth: 0, letterSpacing: '-0.005em',
        }}>
          {os.cliente || (os.tipo === 'fabricacao' ? 'Fabricação interna' : '—')}
        </div>
        {mostrarValor ? (
          <span style={{
            fontSize: 13, color: azul, fontWeight: 700,
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
            justifySelf: 'end',
          }}>R$ {(os.valor - (os.desconto || 0)).toLocaleString('pt-BR')}</span>
        ) : (
          <span style={{
            fontSize: 11.5, color: T.textMuted, fontWeight: 600,
            justifySelf: 'end',
          }}>—</span>
        )}

        {/* Linha 3: equipamento + S/N */}
        {linhaEquip && (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: 12, color: T.textSecondary,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: '-0.005em',
          }}>
            {linhaEquip}
            {os.serie && (
              <span style={{
                color: T.textMuted, fontFamily: MONO_FONT, fontSize: 11,
                marginLeft: 6,
              }}>· S/N {os.serie}</span>
            )}
          </div>
        )}

        {/* Linha 4: endereco */}
        {endResumido && (
          <div style={{
            gridColumn: '1 / -1',
            fontSize: compact ? 10.5 : 11.5, color: T.textMuted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginTop: 1,
          }}>{endResumido}</div>
        )}

        {/* Linha 5: tags — oculto em compact */}
        {!compact && temTags && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
            marginTop: 5,
          }}>
            {os.garantia && (
              <span title={`Garantia da OS #${os.os_origem_id}`} style={tagStyle(azul)}>
                <i className="ti ti-shield-check" style={{ fontSize: 10 }} aria-hidden="true" />Garantia
              </span>
            )}
            {pagoTotal && (
              <span style={tagStyle(verde)}>
                <i className="ti ti-check" style={{ fontSize: 10 }} aria-hidden="true" />Pago
              </span>
            )}
            {pagoParcial && (
              <span style={{
                ...tagStyle(amarelo),
                fontVariantNumeric: 'tabular-nums',
              }}>
                R$ {(os.valor_pago || 0).toLocaleString('pt-BR')}/{totalAPagar(os).toLocaleString('pt-BR')}
              </span>
            )}
            {os.aguardando_peca && (
              <span style={tagStyle(amarelo)}>
                <i className="ti ti-package" style={{ fontSize: 10 }} aria-hidden="true" />peça
              </span>
            )}
          </div>
        )}

        {/* Linha 6: dual status oficina (Limp. / Manut.) */}
        {(mostraLimp || mostraManut) && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 4, marginTop: 5 }}>
            {mostraLimp  && <SubStatus label="Higien." status={statusServicoSub(of, 'limpeza')} T={T} dark={dark} />}
            {mostraManut && <SubStatus label="Manut." status={os.manutPecaStatus || statusServicoSub(of, 'manutencao')} T={T} dark={dark} />}
          </div>
        )}
      </div>
    </button>
  )
}
