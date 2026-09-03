// src/components/kanban/KanbanCard.jsx
// Card do Kanban — Apple HIG: elevação, tipografia SF, tags em pill.

import React from 'react'
import OSAcoesMenu from '../osDetalhe/OSAcoesMenu'
import { P } from '../../theme'
import { TIPOS_OS } from '../../utils/osData'
import { calcStatusPrazo, diasPrazo, estaPagaTotal, estaPagaParcial, totalAPagar, statusServicoSub, secoesOficinaVisiveis } from '../../utils/osHelpers'
import { corEtapa } from '../../utils/colors'
import SubStatus from './SubStatus'

// A data marcada com o cliente mora em 2 lugares diferentes conforme a
// etapa: Coleta/A receber gravam em os.data_agendamento (genérico, setado
// pelo menu ⋮), mas Entrega grava em os.pre_diagnostico.entrega.data (fluxo
// dedicado de agendar/reagendar entrega, com o countdown do OSDetalhe).
// Mesmo formato do OSDetalhe: contagem regressiva + data + horário.
function agendamentoInfo(os) {
  // Concluído/Recusado já fecharam o ciclo — prazo/agendamento não importa mais.
  if (os?.etapa === 'concluido' || os?.etapa === 'recusado') return null
  const iso = os?.pre_diagnostico?.entrega?.data || os?.data_agendamento
  if (!iso) return null
  const alvo = new Date(iso)
  if (isNaN(alvo)) return null
  const tz = 'America/Cuiaba'
  const dataCurta = alvo.toLocaleDateString('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit' })
  const hora = alvo.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
  const deltaMs = alvo.getTime() - Date.now()
  const atrasado = deltaMs <= 0

  // A receber: é o PRAZO COMBINADO de pagamento com o cliente, não uma
  // entrega — pode ficar dias/semanas atrasado, então granularidade em
  // horas ("524h atrás") não é legível. Usa dias, igual ao pill de prazo.
  if (os?.etapa === 'pagamento') {
    const opts = { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }
    const hojeStr = new Date().toLocaleDateString('pt-BR', opts).split('/').reverse().join('-')
    const dataStr = alvo.toLocaleDateString('pt-BR', opts).split('/').reverse().join('-')
    const diffDias = Math.round((new Date(dataStr) - new Date(hojeStr)) / 86400000)
    const status = diffDias < 0 ? 'atrasado' : diffDias <= 1 ? 'proximo' : 'futuro'
    const texto = diffDias < 0 ? `${Math.abs(diffDias)}d atrasado · ${dataCurta} ${hora}`
      : diffDias === 0 ? `Hoje ${hora}`
      : diffDias === 1 ? `Amanhã ${hora}`
      : `${dataCurta} ${hora}`
    return { status, texto }
  }

  const min = Math.floor(Math.abs(deltaMs) / 60_000)
  const h = Math.floor(min / 60), m = min % 60
  const contagem = h >= 1 ? `${h}h ${m}min` : `${m}min`
  const status = atrasado ? 'atrasado' : h < 24 ? 'proximo' : 'futuro'
  const texto = `${atrasado ? `${contagem} atrás` : contagem} · ${dataCurta} ${hora}`
  return { status, texto }
}

export default function KanbanCard({
  os, T, dark,
  tipoCor,
  modoTodos = true,
  onClick,
  onCardMouseDown,
  shaking,
  admin = false,
  funcionarios = [],
  roteiroPorOS,
  onUpdateOS, onExcluir, onDuplicar,
}) {
  const cor = (d, c) => dark ? d : c
  const azul = cor(P.blue, P.blueDark)
  // Funcionário a quem a OS foi atribuída no Roteiro de hoje (avatar no card).
  const respRoteiro = roteiroPorOS && roteiroPorOS.get ? roteiroPorOS.get(os.id) : null
  const funcRoteiro = respRoteiro ? funcionarios.find(f => f.id === respRoteiro) : null
  const [hover, setHover] = React.useState(false)
  const [menu, setMenu]   = React.useState(false)
  // Enquanto o ⋮ está visível, limpamos o canto sup. direito (prazo / "Nd aberto")
  // pra ele não ficar por cima do prazo.
  const cantoLimpo = hover || menu
  const status = calcStatusPrazo(os.prazo, os.etapa)
  const dias = diasPrazo(os.prazo)
  const tipoCfg = TIPOS_OS[os.tipo]
  const corLinha = modoTodos ? corEtapa(tipoCfg.cor, dark) : tipoCor
  const dual = os.etapa === 'oficina'
  const pagoTotal = estaPagaTotal(os)
  const pagoParcial = !pagoTotal && estaPagaParcial(os)
  // Só mostra o valor depois que o orçamento foi CONFIRMADO pelo cliente —
  // antes disso é só um rascunho (os.valor já vai sendo preenchido enquanto
  // o orçamento é montado, mesmo sem confirmação ainda).
  const orcamentoStatus = os.pre_diagnostico?.orcamento_status || os.orcamento_status || 'idle'
  const mostrarValor = os.valor > 0 && orcamentoStatus === 'confirmado'
  const semPrazo = ['entrega', 'a_receber', 'concluido', 'recusado'].includes(os.etapa) || !os.prazo

  const endResumido = os.endereco ? os.endereco.split('—')[0].trim() : null
  const linhaEquip = [os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento
  const agendamento = agendamentoInfo(os)

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
      prazoPillText = `${dias}d`
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
      data-num={os.numero}
      className={shaking ? 'idemaq-shake' : undefined}
      style={{
        ...cardStyle,
        position: 'relative',
        borderRadius: 11,
        padding: '10px 12px',
        cursor: 'grab',
        transition: 'box-shadow .18s, transform .15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => {
        setHover(true)
        if (!dark) e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,.1), 0 0 0 .5px rgba(0,0,0,.05)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        setHover(false)
        if (!dark) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.07), 0 0 0 .5px rgba(0,0,0,.04)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      onMouseDown={e => { e.currentTarget.style.cursor = 'grabbing'; onCardMouseDown?.(os, e) }}
      onMouseUp={e => { e.currentTarget.style.cursor = 'grab' }}>

      {/* ⋮ Mesmo menu do OSDetalhe — aparece no hover (organiza no desktop) */}
      {(hover || menu) && (
        <OSAcoesMenu
          T={T} dark={dark} os={os} admin={admin}
          onUpdateOS={onUpdateOS} onExcluir={onExcluir} onDuplicar={onDuplicar}
          variant="card"
          onOpenChange={setMenu}
        />
      )}

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
          {funcRoteiro && (
            <span title={`No roteiro de ${funcRoteiro.nome} hoje`} style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              background: (funcRoteiro.cor || azul) + '33', color: funcRoteiro.cor || azul,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8.5, fontWeight: 700, letterSpacing: '-0.03em',
            }}>{(funcRoteiro.nome || '?').slice(0, 2).toUpperCase()}</span>
          )}
          {os._prioridadeHoje && (
            <i className="ti ti-flag-3-filled" title="Prioridade hoje"
              style={{ fontSize: 12, color: '#FF6B6B', flexShrink: 0 }} aria-hidden="true" />
          )}
          {os.etapa === 'orcamento' && (() => {
            const status = os.pre_diagnostico?.orcamento_status || os.orcamento_status || 'idle'
            if (status !== 'idle' && status !== 'aguardando') return null
            const enviado = status === 'aguardando'
            return (
              <span
                title={enviado ? 'Orçamento enviado — aguardando resposta' : 'Orçamento ainda não enviado'}
                style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: enviado ? corEtapa('yellow', dark) : (dark ? '#5a5f66' : '#B8BEC6'),
                }} />
            )
          })()}
          {!cantoLimpo && (() => {
            // Conta a partir da confirmação de coleta (entrada em 'diagnostico';
            // registros antigos de 'recebido' são mapeados pelo dbEtapaToUI).
            // Para fabricação/venda sem essa etapa, usa a abertura da OS.
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
        {prazoPillText && !cantoLimpo ? (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1.5px 7px', borderRadius: 100,
            fontSize: 10, fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            justifySelf: 'end',
            ...prazoPillStyle,
          }}>
            <i className="ti ti-flag" style={{ fontSize: 10 }} aria-hidden="true" />{prazoPillText}</span>
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

        {/* Linha: agendamento (Entrega/Coleta/Cobrança marcada com o cliente) —
            mesmo formato do OSDetalhe: contagem regressiva + data + horário. */}
        {agendamento && (() => {
          const cores = {
            atrasado: { bg: cor('#3a0e0e', '#fff0f0'), fg: cor('#ff7070', P.redDark) },
            proximo:  { bg: cor('#2e2204', '#fff8d8'), fg: cor(P.yellow, P.yellowDark) },
            futuro:   { bg: cor('#0d2035', '#e6f1fb'), fg: cor(P.blue, P.blueDark) },
          }[agendamento.status]
          return (
            <div style={{ gridColumn: '1 / -1', marginTop: 2 }}>
              <span style={pill(cores.bg, cores.fg)}>
                <i className="ti ti-calendar-event" style={{ fontSize: 10 }} aria-hidden="true" />{agendamento.texto}
              </span>
            </div>
          )
        })()}

        {/* Linha 5: dual status oficina (Limp./Manut.). Visibilidade vem da
            DETECÇÃO REAL de serviços/peças (os._temLimp/_temManut, enriquecido no
            Kanban) — não mostra "Limp." em OS sem limpeza.
            Manut.: status da peça a comprar (vermelho/amarelo) tem prioridade. */}
        {dual && (() => {
          const of = os.pre_diagnostico?.oficina || {}
          const { limp: mostraLimp, manut: mostraManut } = secoesOficinaVisiveis(os)
          if (!mostraLimp && !mostraManut) return null
          return (
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 4, marginTop: 5 }}>
              {mostraLimp  && <SubStatus label="Higien." status={statusServicoSub(of, 'limpeza')} T={T} dark={dark} />}
              {mostraManut && <SubStatus label="Manut." status={os.manutPecaStatus || statusServicoSub(of, 'manutencao')} T={T} dark={dark} />}
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
