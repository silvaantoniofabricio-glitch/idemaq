// src/components/osDetalhe/tabs/RelatorioTab.jsx
// Aba Resumo — visão completa da OS numa coluna.
// Seções (de cima pra baixo):
//   1. Foto + dados do cliente e equipamento (compacto, um card)
//   2. Resumo financeiro — total / pago / saldo (admin)
//   3. Linha do tempo das etapas (visual, com tempo em cada etapa)
//   4. O que foi feito em cada etapa (checklist + observações + falhas)
//   5. Banners contextuais (garantia, recusada)

import React, { useState, useEffect } from 'react'
import { P } from '../../../theme'
import { corEtapa, bgEtapa } from '../../../utils/colors'
import {
  dentroGarantia, calcStatusPrazo, diasPrazo,
  totalAPagar, estaPagaTotal, estaPagaParcial,
} from '../../../utils/osHelpers'
import { fmtBRL, fmtPrazoCurto, fmtDataHora } from '../../../utils/fmt'
import { TIPOS_OS, ETAPAS_TODOS } from '../../../utils/osData'
import { useOSItens } from '../../../hooks/useOSItens'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import { useFalhaTeste } from '../../../hooks/useFalhaTeste'
import { resolverFotoUrl, FOTO_STORAGE_MARKER } from '../../../utils/osStorage'

// ─── Mapeamento de etapas pra ícone + cor ────────────────────────────────────
const ETAPA_META = {
  ag_agendamento:  { icon: 'ti-calendar-time',      cor: 'neutro', label: 'Ag. agendamento' },
  agendado:        { icon: 'ti-calendar-event',      cor: 'blue',   label: 'Agendado' },
  recebido:        { icon: 'ti-clipboard-check',     cor: 'blue',   label: 'Recebido' },
  diagnostico:     { icon: 'ti-stethoscope',         cor: 'yellow', label: 'Diagnóstico' },
  orcamento:       { icon: 'ti-receipt',             cor: 'yellow', label: 'Orçamento' },
  oficina:         { icon: 'ti-tool',                cor: 'yellow', label: 'Em oficina' },
  teste_final:     { icon: 'ti-flask',               cor: 'blue',   label: 'Teste final' },
  entrega:         { icon: 'ti-truck-delivery',      cor: 'blue',   label: 'Entrega' },
  pagamento:       { icon: 'ti-cash-banknote',       cor: 'blue',   label: 'Pagamento' },
  concluido:       { icon: 'ti-circle-check',        cor: 'green',  label: 'Concluído' },
  recusado:        { icon: 'ti-circle-x',            cor: 'red',    label: 'Recusada' },
}

export default function RelatorioTab({ T, dark, os, osBase, usuarios, admin, onAbrirOS }) {
  const cor = (d, c) => dark ? d : c

  const azul    = corEtapa('blue', dark)
  const verde   = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  const isRecusado = os.etapa === 'recusado'
  const isConcluido = os.etapa === 'concluido'
  const garantiaAtiva = isConcluido ? dentroGarantia(os) : false
  const osOrigem = os.garantia && osBase ? osBase.find(o => o.numero === os.os_origem_id) : null

  const { itens, loading: itensLoading } = useOSItens(os?.id)
  const checkRecebido = useChecklistEtapa(os?.id, 'recebido')
  const checkOficina  = useChecklistEtapa(os?.id, 'em_oficina')
  const checkTeste    = useChecklistEtapa(os?.id, 'teste_final')
  const { falhas }    = useFalhaTeste(os?.id)

  const funcPorId = (id) => {
    const u = (usuarios || []).find(x => x.id === id)
    return u ? (u.apelido || u.nome || null) : null
  }

  // Dias em cada etapa, baseado no historico
  const historico = os.historico || []

  return (
    <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── 1. CLIENTE + EQUIPAMENTO ── */}
      <CardCliente T={T} dark={dark} os={os} azul={azul} cor={cor} />

      {/* ── 2. FINANCEIRO (admin only) ── */}
      {admin && (
        <CardFinanceiro
          T={T} dark={dark} os={os} itens={itens} loading={itensLoading}
          verde={verde} amarelo={amarelo} azul={azul} cor={cor}
        />
      )}

      {/* ── 3. LINHA DO TEMPO ── */}
      <CardTimeline T={T} dark={dark} os={os} historico={historico} funcPorId={funcPorId} />

      {/* ── 4. O QUE FOI FEITO ── */}
      <CardEtapas
        T={T} dark={dark} os={os} admin={admin} usuarios={usuarios}
        checkRecebido={checkRecebido} checkOficina={checkOficina} checkTeste={checkTeste}
        falhas={falhas} itens={itens}
        azul={azul} verde={verde} amarelo={amarelo} vermelho={vermelho} cor={cor}
        funcPorId={funcPorId}
      />

      {/* ── 5. BANNERS CONTEXTUAIS ── */}
      {os.garantia && osOrigem && (
        <Banner T={T} cor={azul} bg={bgEtapa('blue', dark)}
          icon="ti-shield-check" titulo="OS em garantia"
          texto={<>Referente à <strong>OS #{osOrigem.numero}</strong> de {osOrigem.cliente}.</>}
          onClick={() => onAbrirOS?.(osOrigem.numero)} chevron={!!onAbrirOS}
        />
      )}
      {garantiaAtiva && !os.garantia && (
        <Banner T={T} cor={azul} bg={bgEtapa('blue', dark)}
          icon="ti-shield-check" titulo="Garantia ativa"
          texto="Se o cliente retornar com o mesmo defeito dentro do prazo, abra uma OS de garantia."
        />
      )}
      {isRecusado && (
        <Banner T={T} cor={vermelho} bg={cor('#2a1515', '#fde8e8')}
          icon="ti-circle-x" titulo="OS recusada pelo cliente"
          texto="Defina o destino da máquina na aba Etapa."
        />
      )}
    </div>
  )
}

// ─── 1. CLIENTE + EQUIPAMENTO ────────────────────────────────────────────────
function CardCliente({ T, dark, os, azul, cor }) {
  const [fotoUrl, setFotoUrl] = useState(null)

  useEffect(() => {
    const raw = os?.pre_diagnostico?.foto
    if (!raw) { setFotoUrl(null); return }
    if (raw === FOTO_STORAGE_MARKER || raw?.startsWith?.(FOTO_STORAGE_MARKER)) {
      resolverFotoUrl(os.id).then(url => setFotoUrl(url || null))
    } else {
      setFotoUrl(raw)
    }
  }, [os?.id, os?.pre_diagnostico?.foto])

  const temCliente = os.cliente || os.fone || os.endereco
  const temEquipamento = os.marca || os.modelo || os.serie || os.defeito

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Cabeçalho do card */}
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-id-badge-2" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          Cliente &amp; Equipamento
        </span>
        {/* OS número + tipo */}
        <span style={{
          marginLeft: 'auto',
          fontSize: 11, fontWeight: 700, color: azul,
          background: bgEtapa('blue', dark),
          padding: '2px 8px', borderRadius: 10,
          border: `1px solid ${azul}33`,
        }}>
          OS #{os.numero} · {TIPOS_OS[os.tipo]?.label || os.tipo}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 0 }}>
        {/* Foto da máquina */}
        {fotoUrl && (
          <div style={{
            width: 80, flexShrink: 0,
            borderRight: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'stretch',
          }}>
            <img
              src={fotoUrl} alt="Foto da máquina"
              style={{
                width: '100%', objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        )}

        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Dados do cliente */}
          {temCliente && (
            <div>
              <RowLabel T={T} dark={dark} icon="ti-user" label="Cliente" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                {os.cliente && <DadoLinha T={T} valor={os.cliente} destaque />}
                {os.fone && (
                  <DadoLinha T={T} icon="ti-phone" valor={os.fone} />
                )}
                {os.endereco && (
                  <DadoLinha T={T} icon="ti-map-pin" valor={os.endereco} />
                )}
              </div>
            </div>
          )}

          {/* Divisor */}
          {temCliente && temEquipamento && (
            <div style={{ height: 1, background: T.border }} />
          )}

          {/* Dados do equipamento */}
          {temEquipamento && (
            <div>
              <RowLabel T={T} dark={dark} icon="ti-device-washing-machine" label="Equipamento" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
                {(os.marca || os.modelo) && (
                  <DadoLinha T={T}
                    valor={[os.marca, os.modelo].filter(Boolean).join(' ')}
                    destaque
                  />
                )}
                {os.serie && (
                  <DadoLinha T={T} icon="ti-barcode" valor={`Série: ${os.serie}`} />
                )}
                {os.defeito && (
                  <DadoLinha T={T} icon="ti-alert-triangle" valor={os.defeito} muted />
                )}
              </div>
            </div>
          )}

          {/* Datas rápidas */}
          <div style={{
            display: 'flex', gap: 16, flexWrap: 'wrap',
            paddingTop: 6, borderTop: `1px solid ${T.border}`,
          }}>
            <DataKV T={T} label="Abertura" valor={fmtPrazoCurto(os.abertura || os.criado_em)} />
            {os.prazo && (
              <DataKV T={T} label="Prazo" valor={fmtPrazoCurto(os.prazo)}
                alerta={calcStatusPrazo(os.prazo, os.etapa) === 'vencido'}
              />
            )}
            {os.data_conclusao && (
              <DataKV T={T} label="Concluída" valor={fmtPrazoCurto(os.data_conclusao)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 2. FINANCEIRO ───────────────────────────────────────────────────────────
function CardFinanceiro({ T, dark, os, itens, loading, verde, amarelo, azul, cor }) {
  if (loading) return null

  function unit(i) { return i.valor_unitario ?? i.valor ?? 0 }
  function total(i) { return i.valor_total ?? unit(i) * (i.qtd ?? 1) }

  const subtotal = itens.reduce((s, i) => s + total(i), 0)
  const desconto = os.desconto || 0
  const totalLiq = Math.max(0, subtotal - desconto)
  const pago = os.valor_pago || 0
  const saldo = Math.max(0, totalLiq - pago)
  const pagaTotal = estaPagaTotal(os)
  const pagaParcial = estaPagaParcial(os)

  const statusCor = pagaTotal ? verde : pagaParcial ? amarelo : T.textMuted
  const statusLabel = pagaTotal ? 'Pago' : pagaParcial ? 'Parcial' : 'Não pago'
  const statusIcon = pagaTotal ? 'ti-circle-check' : pagaParcial ? 'ti-clock-hour-3' : 'ti-circle-dashed'

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-cash-banknote" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          Financeiro
        </span>
        <span style={{
          marginLeft: 'auto',
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10.5, fontWeight: 700, color: statusCor,
          background: statusCor + '18', padding: '2px 8px', borderRadius: 10,
          border: `1px solid ${statusCor}33`,
        }}>
          <i className={`ti ${statusIcon}`} style={{ fontSize: 11 }} aria-hidden="true" />
          {statusLabel}
        </span>
      </div>

      {/* 3 KPIs horizontais */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        borderBottom: itens.length > 0 ? `1px solid ${T.border}` : 'none',
      }}>
        <KPI T={T} label="Total orçado" valor={fmtBRL(totalLiq)}
          sub={desconto > 0 ? `desc. ${fmtBRL(desconto)}` : `${itens.length} iten${itens.length !== 1 ? 's' : ''}`}
          border={false}
        />
        <KPI T={T} label="Pago" valor={fmtBRL(pago)} cor={pago > 0 ? verde : T.textMuted}
          sub={os.forma_pagamento || '—'} border
        />
        <KPI T={T} label="Saldo" valor={fmtBRL(saldo)}
          cor={saldo === 0 ? verde : amarelo}
          sub={saldo === 0 ? 'Quitado' : 'Em aberto'} border
        />
      </div>

      {/* Lista compacta de itens */}
      {itens.length > 0 && (
        <div style={{ padding: '8px 14px 10px' }}>
          {itens.map((it, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 0',
              borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
            }}>
              <i className={`ti ${tipoIcone(it.tipo)}`}
                style={{ fontSize: 12, color: T.textMuted, flexShrink: 0 }} aria-hidden="true" />
              <span style={{
                flex: 1, fontSize: 12.5, color: T.textPrimary,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{it.nome || '(sem nome)'}</span>
              <span style={{
                fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
              }}>{it.qtd}×</span>
              <span style={{
                fontSize: 12.5, fontWeight: 600, color: T.textPrimary,
                fontVariantNumeric: 'tabular-nums', minWidth: 64, textAlign: 'right',
              }}>{fmtBRL(total(it))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 3. LINHA DO TEMPO ───────────────────────────────────────────────────────
function CardTimeline({ T, dark, os, historico, funcPorId }) {
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  if (historico.length === 0) return null

  // Calcula tempo gasto em cada etapa
  const eventos = historico.map((h, i) => {
    const inicio = new Date(h.data)
    const proximo = historico[i + 1]
    const fim = proximo ? new Date(proximo.data) : new Date()
    const minutos = Math.round((fim - inicio) / 60000)
    return { ...h, minutos, fim }
  })

  function fmtTempo(min) {
    if (min < 60) return `${min}min`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h}h`
    const d = Math.floor(h / 24)
    return `${d}d`
  }

  function corPonto(etapa) {
    const meta = ETAPA_META[etapa]
    if (!meta) return azul
    return corEtapa(meta.cor, dark)
  }

  const ultimo = eventos[eventos.length - 1]
  const isFinal = os.etapa === 'concluido' || os.etapa === 'recusado'

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-timeline" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          Linha do tempo
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {historico.length} moviment{historico.length === 1 ? 'ação' : 'ações'}
        </span>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {eventos.map((ev, i) => {
          const meta = ETAPA_META[ev.etapa] || { icon: 'ti-circle', cor: 'neutro', label: ev.etapa }
          const cponto = corPonto(ev.etapa)
          const isLast = i === eventos.length - 1
          const resp = funcPorId(ev.funcionario)

          return (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              {/* Ponto + linha */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                flexShrink: 0, width: 20,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: cponto + '22', border: `2px solid ${cponto}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, zIndex: 1,
                }}>
                  <i className={`ti ${meta.icon}`}
                    style={{ fontSize: 10, color: cponto }} aria-hidden="true" />
                </div>
                {!isLast && (
                  <div style={{
                    width: 2, flex: 1, minHeight: 18,
                    background: T.border, margin: '3px 0',
                  }} />
                )}
              </div>

              {/* Conteúdo */}
              <div style={{
                flex: 1, paddingBottom: isLast ? 0 : 14,
                paddingTop: 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
                    {meta.label}
                  </span>
                  {/* Tempo gasto */}
                  {(!isLast || !isFinal) && (
                    <span style={{
                      fontSize: 10.5, color: T.textMuted,
                      background: T.cardAlt, border: `1px solid ${T.border}`,
                      padding: '1px 6px', borderRadius: 8,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {fmtTempo(ev.minutos)}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtPrazoCurto(ev.data)}
                  </span>
                  {resp && (
                    <span style={{ fontSize: 11, color: T.textMuted }}>
                      · {resp}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Ponto final — etapa atual (se não concluída/recusada, mostra "em andamento") */}
        {!isFinal && (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 20, display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%', marginTop: 4,
                background: T.border, border: `2px dashed ${T.textDim}`,
              }} />
            </div>
            <div style={{ paddingTop: 2 }}>
              <span style={{ fontSize: 12, color: T.textMuted, fontStyle: 'italic' }}>
                Em andamento…
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 4. O QUE FOI FEITO ──────────────────────────────────────────────────────
function CardEtapas({
  T, dark, os, admin, checkRecebido, checkOficina, checkTeste, falhas,
  itens, azul, verde, amarelo, vermelho, cor, funcPorId,
}) {
  const historico = os.historico || []

  function dadosEtapa(etapaDb) {
    const hist = historico.filter(h => {
      if (etapaDb === 'em_oficina') return h.etapa === 'oficina'
      if (etapaDb === 'entrega') return h.etapa === 'entrega' || h.etapa === 'entregue'
      return h.etapa === etapaDb
    })
    if (hist.length === 0) return null
    const u = hist[hist.length - 1]
    return { data: u.data, responsavel: funcPorId(u.funcionario) }
  }

  function resumirChecklist(itens) {
    if (!itens?.length) return null
    const total = itens.length
    const ok = itens.filter(i => i.valor === 'ok' || i.checked === true).length
    const problemas = itens
      .filter(i => i.valor === 'defeito' || i.valor === 'barulho')
      .map(i => ({ label: i.label || i.id, tipo: i.valor }))
    return { total, ok, problemas }
  }

  const blocos = []

  // Recebido
  const dadosRecebido = dadosEtapa('recebido')
  if ((checkRecebido.itens.length > 0 || dadosRecebido) && !checkRecebido.loading) {
    const res = resumirChecklist(checkRecebido.itens)
    blocos.push({ key: 'recebido', meta: ETAPA_META.recebido, dados: dadosRecebido, conteudo: (
      <>
        {res && <ChkResumo res={res} T={T} verde={verde} vermelho={vermelho} />}
        {checkRecebido.observacoes && <ObsTexto T={T} texto={checkRecebido.observacoes} />}
        {!res && !checkRecebido.observacoes && <Vazio T={T} />}
      </>
    )})
  }

  // Diagnóstico
  const dadosDiag = dadosEtapa('diagnostico')
  const causa = os.diagnostico?.causa
  if (dadosDiag || causa) {
    blocos.push({ key: 'diagnostico', meta: ETAPA_META.diagnostico, dados: dadosDiag, conteudo: (
      causa
        ? <ObsTexto T={T} label="Causa apontada" texto={causa} />
        : <Vazio T={T} />
    )})
  }

  // Orçamento (admin)
  const dadosOrc = dadosEtapa('orcamento')
  if (admin && dadosOrc) {
    const subtotal = itens.reduce((s, i) => s + (i.valor_total ?? (i.valor_unitario ?? i.valor ?? 0) * (i.qtd ?? 1)), 0)
    blocos.push({ key: 'orcamento', meta: ETAPA_META.orcamento, dados: dadosOrc, conteudo: (
      <span style={{ fontSize: 12, color: T.textMuted }}>
        {itens.length} iten{itens.length !== 1 ? 's' : ''} · {fmtBRL(subtotal)}
        {os.desconto > 0 ? ` · desc. ${fmtBRL(os.desconto)}` : ''}
      </span>
    )})
  }

  // Em oficina
  const dadosOficina = dadosEtapa('em_oficina')
  if ((checkOficina.itens.length > 0 || dadosOficina) && !checkOficina.loading) {
    const res = resumirChecklist(checkOficina.itens)
    blocos.push({ key: 'oficina', meta: ETAPA_META.oficina, dados: dadosOficina, conteudo: (
      <>
        {res && <ChkResumo res={res} T={T} verde={verde} vermelho={vermelho} />}
        {checkOficina.observacoes && <ObsTexto T={T} texto={checkOficina.observacoes} />}
        {!res && !checkOficina.observacoes && <Vazio T={T} />}
      </>
    )})
  }

  // Teste final
  const dadosTeste = dadosEtapa('teste_final')
  if ((checkTeste.itens.length > 0 || dadosTeste || falhas.length > 0) && !checkTeste.loading) {
    const res = resumirChecklist(checkTeste.itens)
    blocos.push({ key: 'teste', meta: ETAPA_META.teste_final, dados: dadosTeste, conteudo: (
      <>
        {res && <ChkResumo res={res} T={T} verde={verde} vermelho={vermelho} />}
        {checkTeste.observacoes && <ObsTexto T={T} texto={checkTeste.observacoes} />}
        {falhas.length > 0 && <FalhasLista T={T} falhas={falhas} vermelho={vermelho} verde={verde} />}
        {!res && !checkTeste.observacoes && falhas.length === 0 && <Vazio T={T} />}
      </>
    )})
  }

  // Entrega
  const dadosEntrega = dadosEtapa('entrega')
  if (dadosEntrega) {
    blocos.push({ key: 'entrega', meta: ETAPA_META.entrega, dados: dadosEntrega, conteudo: (
      <Vazio T={T} texto="Máquina entregue ao cliente." />
    )})
  }

  // Pagamento (admin)
  const dadosPag = dadosEtapa('pagamento')
  if (admin && (dadosPag || os.valor_pago > 0)) {
    const pagaTotal = estaPagaTotal(os)
    const saldo = Math.max(0, totalAPagar(os) - (os.valor_pago || 0))
    blocos.push({ key: 'pagamento', meta: ETAPA_META.pagamento, dados: dadosPag, conteudo: (
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <KVinline T={T} label="Pago" valor={fmtBRL(os.valor_pago || 0)} cor={os.valor_pago > 0 ? verde : T.textMuted} />
        <KVinline T={T} label="Forma" valor={os.forma_pagamento || '—'} />
        <KVinline T={T} label="Saldo" valor={fmtBRL(saldo)} cor={saldo === 0 ? verde : amarelo} />
      </div>
    )})
  }

  // Concluído
  const dadosConcluido = dadosEtapa('concluido')
  if (dadosConcluido) {
    blocos.push({ key: 'concluido', meta: ETAPA_META.concluido, dados: dadosConcluido, conteudo: (
      <Vazio T={T} texto={`Garantia de ${os.garantia_dias || 90} dias.`} />
    )})
  }

  // Recusado
  const dadosRecusado = dadosEtapa('recusado')
  if (dadosRecusado) {
    blocos.push({ key: 'recusado', meta: ETAPA_META.recusado, dados: dadosRecusado, conteudo: (
      <Vazio T={T} texto="OS recusada pelo cliente." />
    )})
  }

  const carregando = checkRecebido.loading || checkOficina.loading || checkTeste.loading
  if (carregando) return null
  if (blocos.length === 0) return null

  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <i className="ti ti-list-check" style={{ fontSize: 14, color: corEtapa('blue', false) }} aria-hidden="true" />
        <span style={{
          fontSize: 10.5, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          O que foi feito
        </span>
      </div>

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blocos.map(({ key, meta, dados, conteudo }) => {
          const c = corEtapa(meta.cor, false)
          return (
            <div key={key} style={{
              borderLeft: `3px solid ${c}`,
              paddingLeft: 10,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                marginBottom: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className={`ti ${meta.icon}`} style={{ fontSize: 13, color: c }} aria-hidden="true" />
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textPrimary }}>
                    {meta.label}
                  </span>
                </div>
                {dados && (
                  <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtPrazoCurto(dados.data)}
                    {dados.responsavel ? ` · ${dados.responsavel}` : ''}
                  </span>
                )}
              </div>
              <div>{conteudo}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Primitivos internos ──────────────────────────────────────────────────────

function RowLabel({ T, dark, icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 11, color: T.textMuted }} aria-hidden="true" />
      <span style={{
        fontSize: 10, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.05em',
      }}>{label}</span>
    </div>
  )
}

function DadoLinha({ T, icon, valor, destaque, muted }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
      {icon && (
        <i className={`ti ${icon}`}
          style={{ fontSize: 11, color: T.textMuted, marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
      )}
      <span style={{
        fontSize: destaque ? 13.5 : 12.5,
        fontWeight: destaque ? 700 : 400,
        color: muted ? T.textMuted : T.textPrimary,
        lineHeight: 1.3,
        wordBreak: 'break-word',
      }}>{valor}</span>
    </div>
  )
}

function DataKV({ T, label, valor, alerta }) {
  return (
    <div>
      <div style={{
        fontSize: 9.5, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.05em',
      }}>{label}</div>
      <div style={{
        fontSize: 12, fontWeight: 600,
        color: alerta ? '#E53935' : T.textPrimary,
        fontVariantNumeric: 'tabular-nums',
      }}>{valor || '—'}</div>
    </div>
  )
}

function KPI({ T, label, valor, cor, sub, border }) {
  return (
    <div style={{
      padding: '10px 14px',
      borderLeft: border ? `1px solid ${T.border}` : 'none',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 700,
        color: cor || T.textPrimary,
        fontVariantNumeric: 'tabular-nums',
      }}>{valor}</div>
      {sub && (
        <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}

function KVinline({ T, label, valor, cor }) {
  return (
    <div>
      <div style={{
        fontSize: 9.5, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.04em',
      }}>{label}</div>
      <div style={{
        fontSize: 12.5, fontWeight: 600,
        color: cor || T.textPrimary,
        fontVariantNumeric: 'tabular-nums',
      }}>{valor}</div>
    </div>
  )
}

function ChkResumo({ res, T, verde, vermelho }) {
  const { total, ok, problemas } = res
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Chip cor={verde} icon="ti-check" label={`${ok}/${total} OK`} />
        {problemas.length > 0 && (
          <Chip cor={vermelho} icon="ti-alert-triangle" label={`${problemas.length} prob.`} />
        )}
      </div>
      {problemas.map((p, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11.5, color: T.textSecondary,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: vermelho, flexShrink: 0,
          }} />
          {p.label}{p.tipo ? ` — ${p.tipo}` : ''}
        </div>
      ))}
    </div>
  )
}

function FalhasLista({ T, falhas, vermelho, verde }) {
  const abertas = falhas.filter(f => !f.resolvida)
  const resolvidas = falhas.filter(f => f.resolvida)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        Falhas ({falhas.length})
      </span>
      {abertas.map(f => (
        <div key={f.id} style={{ fontSize: 11.5, color: vermelho, display: 'flex', gap: 5, alignItems: 'center' }}>
          <i className="ti ti-circle-dot" style={{ fontSize: 11 }} aria-hidden="true" />
          {f.descricao}
        </div>
      ))}
      {resolvidas.map(f => (
        <div key={f.id} style={{
          fontSize: 11.5, color: T.textMuted,
          display: 'flex', gap: 5, alignItems: 'center', textDecoration: 'line-through',
        }}>
          <i className="ti ti-circle-check" style={{ fontSize: 11, color: verde }} aria-hidden="true" />
          {f.descricao}
        </div>
      ))}
    </div>
  )
}

function ObsTexto({ T, label, texto }) {
  return (
    <div>
      {label && (
        <div style={{
          fontSize: 10, fontWeight: 700, color: T.textMuted,
          textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2,
        }}>{label}</div>
      )}
      <div style={{
        fontSize: 12, color: T.textSecondary, lineHeight: 1.45,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>{texto}</div>
    </div>
  )
}

function Vazio({ T, texto = 'Sem dados registrados.' }) {
  return (
    <span style={{ fontSize: 11.5, color: T.textMuted, fontStyle: 'italic' }}>{texto}</span>
  )
}

function Chip({ cor, icon, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
      background: cor + '18', color: cor, border: `1px solid ${cor}33`,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 11 }} aria-hidden="true" />
      {label}
    </span>
  )
}

function Banner({ T, cor, bg, icon, titulo, texto, chevron, onClick }) {
  return (
    <div onClick={onClick} style={{
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

function tipoIcone(tipo) {
  if (tipo === 'servico') return 'ti-tool'
  if (tipo === 'peca') return 'ti-puzzle'
  if (tipo === 'maquina') return 'ti-device-washing-machine'
  return 'ti-circle'
}
