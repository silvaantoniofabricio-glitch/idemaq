// src/components/osDetalhe/tabs/RelatorioTab.jsx
// Aba Resumo — reconstruída do zero em Atlassian Design (07/06/2026).
//
// Layout 4 colunas (desktop) / empilhado (mobile):
//   Col 1 — Linha do tempo (datas, prazos, garantia)
//   Col 2 — Fotos (etiqueta · geral · entrega)
//   Col 3 — Financeiro (KPIs + itens)
//   Col 4 — Histórico rico por etapa
//
// Banners contextuais (garantia, OS recusada) ao final.

import React, { useEffect, useMemo, useState } from 'react'
import { corEtapa } from '../../../utils/colors'
import {
  dentroGarantia, calcStatusPrazo, totalAPagar,
  estaPagaTotal, estaPagaParcial,
} from '../../../utils/osHelpers'
import { fmtBRL, fmtPrazoCurto } from '../../../utils/fmt'
import { useOSItens } from '../../../hooks/useOSItens'
import { useChecklistEtapa } from '../../../hooks/useChecklistEtapa'
import { useFalhaTeste } from '../../../hooks/useFalhaTeste'
import { resolverFotoUrl } from '../../../utils/osStorage'
import { CATEGORIAS_PECA } from '../../../utils/categoriasPeca'
import FotoAmpliadaModal from '../FotoAmpliadaModal'
import CustoTerceiroPanel from '../CustoTerceiroPanel'
import {
  AtlPanel, ATL_FONT, atlHover, atlSurfaceSunken,
} from '../acoes/_AtlassianUI'

// ─── Paleta cores por etapa ───────────────────────────────────────────────────
const ETAPA_META = {
  ag_agendamento: { icon: 'calendar-time',    cor: 'blue',   label: 'Agendamento' },
  agendado:       { icon: 'calendar-event',   cor: 'blue',   label: 'Coleta' },
  recebido:       { icon: 'clipboard-check',  cor: 'blue',   label: 'Avaliação' },
  diagnostico:    { icon: 'stethoscope',      cor: 'yellow', label: 'Diagnóstico' },
  orcamento:      { icon: 'receipt',          cor: 'yellow', label: 'Orçamento' },
  oficina:        { icon: 'tool',             cor: 'yellow', label: 'Conserto' },
  em_oficina:     { icon: 'tool',             cor: 'yellow', label: 'Conserto' },
  teste_final:    { icon: 'flask',            cor: 'blue',   label: 'Teste final' },
  entrega:        { icon: 'truck-delivery',   cor: 'blue',   label: 'Entrega' },
  entregue:       { icon: 'truck-delivery',   cor: 'blue',   label: 'Entrega' },
  pagamento:      { icon: 'cash-banknote',    cor: 'blue',   label: 'Pagamento' },
  concluido:      { icon: 'circle-check',     cor: 'green',  label: 'Concluído' },
  recusado:       { icon: 'circle-x',         cor: 'red',    label: 'Recusado' },
}

const MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace'

// ─── Primitivos Atlassian ─────────────────────────────────────────────────────
function ACard({ T, dark, children, style }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 6,
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

function ACardHeader({ T, dark, icon, label, badge }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 12px 7px',
      borderBottom: `1px solid ${T.border}`,
      background: atlSurfaceSunken(dark),
    }}>
      <i className={`ti ti-${icon}`}
        style={{ fontSize: 13, color: T.textMuted, flexShrink: 0 }}
        aria-hidden="true" />
      <span style={{
        fontSize: 11, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        flex: 1,
      }}>
        {label}
      </span>
      {badge !== undefined && badge !== null && (
        <span style={{
          fontSize: 10.5, fontWeight: 700,
          padding: '1px 7px', borderRadius: 99,
          background: T.border, color: T.textMuted,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}

function ARow({ T, label, value, icon, valueCor, mono, first, muted, multiline }) {
  return (
    <div style={{
      display: 'flex', alignItems: multiline ? 'flex-start' : 'center',
      gap: 8, padding: '8px 12px',
      borderTop: first ? 'none' : `1px solid ${T.border}`,
      minHeight: 34,
    }}>
      {icon && (
        <i className={`ti ti-${icon}`}
          style={{ fontSize: 13, color: T.textDim, flexShrink: 0, marginTop: multiline ? 2 : 0 }}
          aria-hidden="true" />
      )}
      <span style={{
        fontSize: 12, color: T.textMuted, flexShrink: 0,
        minWidth: icon ? 0 : 80,
      }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: valueCor || (muted ? T.textMuted : T.textPrimary),
        flex: 1, textAlign: 'right',
        fontFamily: mono ? MONO : 'inherit',
        fontVariantNumeric: mono ? 'tabular-nums' : undefined,
        wordBreak: multiline ? 'break-word' : undefined,
        whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
        overflow: multiline ? undefined : 'hidden',
        textOverflow: multiline ? undefined : 'ellipsis',
      }}>{value}</span>
    </div>
  )
}

function ADivider({ T }) {
  return <div style={{ height: 1, background: T.border }} />
}

// ─── Helpers de dados ─────────────────────────────────────────────────────────
function fmtDuracao(minutos) {
  if (!minutos || minutos <= 0) return null
  const h = Math.floor(minutos / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  return `${h}h`
}

function diffMinutos(de, ate) {
  if (!de || !ate) return 0
  return Math.round((new Date(ate) - new Date(de)) / 60000)
}

// ═══════════════════════════════════════════════════════════════════════════
// COL 1 — LINHA DO TEMPO
// ═══════════════════════════════════════════════════════════════════════════
function ColDatas({ T, dark, os }) {
  const azul   = corEtapa('blue',   dark)
  const verde  = corEtapa('green',  dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red',  dark)
  const hist = os.historico || []

  // Encontra a data de entrada em cada etapa-chave
  function dataEtapa(etapas) {
    const e = Array.isArray(etapas) ? etapas : [etapas]
    const h = hist.find(x => e.includes(x.etapa))
    return h?.data || null
  }

  const dtAbertura  = os.abertura || os.criado_em
  // Coleta confirmada: carimbo novo (06/07/2026) ou entrada no diagnóstico
  // ('recebido' antigo é mapeado pra 'diagnostico' pelo dbEtapaToUI)
  const dtColeta    = os.pre_diagnostico?.coleta_confirmada?.em
    || dataEtapa(['recebido', 'diagnostico'])
  const dtDiag      = dataEtapa(['recebido', 'diagnostico'])
  const dtOrc       = dataEtapa('orcamento')
  const dtOficina   = dataEtapa(['oficina', 'em_oficina'])
  const dtTeste     = dataEtapa('teste_final')
  const dtEntrega   = dataEtapa(['entrega', 'entregue'])
  const dtConclusao = os.data_conclusao

  // Tempo total em etapas internas (diag → concluido)
  const inicioInterno = dtDiag || dtOficina
  const fimInterno    = dtConclusao || dtEntrega || null
  const duracaoInterna = fimInterno && inicioInterno
    ? fmtDuracao(diffMinutos(inicioInterno, fimInterno))
    : null

  const status  = calcStatusPrazo(os.prazo, os.etapa)
  const prazoCor = status === 'vencido' ? vermelho
    : status === 'hoje' || status === 'amanha' ? amarelo
    : verde

  const garantiaDias = os.garantia_dias || 90

  return (
    <ACard T={T} dark={dark}>
      <ACardHeader T={T} dark={dark} icon="calendar-stats" label="Linha do tempo" />

      {dtAbertura && (
        <ARow T={T} first icon="file-plus" label="Abertura"
          value={fmtPrazoCurto(dtAbertura)} />
      )}
      {dtColeta && (
        <ARow T={T} icon="package-import" label="Coleta"
          value={fmtPrazoCurto(dtColeta)} />
      )}
      {dtDiag && (
        <ARow T={T} icon="stethoscope" label="Diagnóstico"
          value={fmtPrazoCurto(dtDiag)} />
      )}
      {dtOrc && (
        <ARow T={T} icon="receipt" label="Orçamento"
          value={fmtPrazoCurto(dtOrc)} />
      )}
      {dtOficina && (
        <ARow T={T} icon="tool" label="Conserto"
          value={fmtPrazoCurto(dtOficina)} />
      )}
      {dtTeste && (
        <ARow T={T} icon="flask" label="Teste"
          value={fmtPrazoCurto(dtTeste)} />
      )}
      {dtEntrega && (
        <ARow T={T} icon="truck-delivery" label="Entrega"
          value={fmtPrazoCurto(dtEntrega)} />
      )}
      {dtConclusao && (
        <ARow T={T} icon="circle-check" label="Concluído"
          value={fmtPrazoCurto(dtConclusao)} valueCor={verde} />
      )}

      {/* Prazo e tempo interno */}
      {(os.prazo || duracaoInterna) && <ADivider T={T} />}
      {os.prazo && (
        <ARow T={T} icon="clock" label="Prazo"
          value={fmtPrazoCurto(os.prazo)} valueCor={prazoCor} />
      )}
      {duracaoInterna && (
        <ARow T={T} icon="hourglass" label="Tempo interno"
          value={duracaoInterna} />
      )}

      {/* Garantia */}
      {(os.etapa === 'concluido' || dtConclusao) && (
        <>
          <ADivider T={T} />
          <ARow T={T} icon="shield-check" label="Garantia"
            value={`${garantiaDias} dias`}
            valueCor={dentroGarantia(os) ? verde : T.textMuted} />
        </>
      )}
    </ACard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COL 2 — FOTOS
// ═══════════════════════════════════════════════════════════════════════════
const FOTO_SLOTS = [
  { key: 'foto_coleta_1', legacyKey: 'foto_coleta', tipo: 'coleta_1', label: 'Etiqueta',     icon: 'tag' },
  { key: 'foto_coleta_2', tipo: 'coleta_2',           label: 'Estado geral', icon: 'camera' },
  { key: 'foto_entrega',  tipo: 'entrega',             label: 'Entrega',      icon: 'truck-delivery' },
]

function ColFotos({ T, dark, os }) {
  const [urls, setUrls]       = useState({ coleta_1: null, coleta_2: null, entrega: null })
  const [ampliada, setAmpliada] = useState(null)
  const pd = os?.pre_diagnostico || {}

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const u1 = await resolverFotoUrl(pd.foto_coleta_1 || pd.foto_coleta || null, os?.id, 'coleta_1')
      const u2 = await resolverFotoUrl(pd.foto_coleta_2 || null, os?.id, 'coleta_2')
      const u3 = await resolverFotoUrl(pd.foto_entrega  || null, os?.id, 'entrega')
      if (!cancel) setUrls({ coleta_1: u1, coleta_2: u2, entrega: u3 })
    })()
    return () => { cancel = true }
  }, [os?.id, pd.foto_coleta_1, pd.foto_coleta, pd.foto_coleta_2, pd.foto_entrega])

  const slotsComFoto = FOTO_SLOTS.filter(s => urls[s.tipo])
  const temFotos = slotsComFoto.length > 0

  return (
    <ACard T={T} dark={dark}>
      <ACardHeader T={T} dark={dark} icon="photo" label="Fotos"
        badge={temFotos ? slotsComFoto.length : null} />

      {!temFotos ? (
        <div style={{
          padding: '20px 12px', textAlign: 'center',
          color: T.textDim, fontSize: 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
          <i className="ti ti-camera-off" style={{ fontSize: 22, opacity: 0.35 }} aria-hidden="true" />
          <span style={{ opacity: 0.6 }}>Sem fotos</span>
        </div>
      ) : (
        <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FOTO_SLOTS.map(slot => {
            const url = urls[slot.tipo]
            if (!url) return null
            return (
              <div key={slot.tipo}
                onClick={() => setAmpliada({ url, alt: slot.label })}
                style={{
                  position: 'relative', borderRadius: 4, overflow: 'hidden',
                  aspectRatio: '16 / 9', cursor: 'zoom-in',
                  background: '#000',
                }}>
                <img src={url} alt={slot.label}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span style={{
                  position: 'absolute', bottom: 5, left: 6,
                  fontSize: 10, fontWeight: 600, color: '#fff',
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
                  padding: '2px 6px', borderRadius: 4,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <i className={`ti ti-${slot.icon}`} style={{ fontSize: 10 }} aria-hidden="true" />
                  {slot.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {ampliada && (
        <FotoAmpliadaModal
          src={ampliada.url}
          alt={ampliada.alt}
          onClose={() => setAmpliada(null)}
        />
      )}
    </ACard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COL 3 — FINANCEIRO
// ═══════════════════════════════════════════════════════════════════════════
function ColFinanceiro({ T, dark, os, itens, admin }) {
  if (!admin) return null

  function unit(i) { return i.valor_unitario ?? i.valor ?? 0 }
  function total(i) { return i.valor_total ?? unit(i) * (i.qtd ?? 1) }

  const subtotal  = itens.reduce((s, i) => s + total(i), 0)
  const desconto  = os.desconto || 0
  const totalLiq  = Math.max(0, subtotal - desconto)
  const pago      = os.valor_pago || 0
  const saldo     = Math.max(0, totalLiq - pago)
  const pagaTotal  = estaPagaTotal(os)
  const pagaParcial = estaPagaParcial(os)

  const verde    = corEtapa('green',  dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red',    dark)

  const statusCor   = pagaTotal ? verde : pagaParcial ? amarelo : vermelho
  const statusLabel = pagaTotal ? 'Pago' : pagaParcial ? 'Parcial' : 'Em aberto'
  const statusIcon  = pagaTotal ? 'circle-check' : pagaParcial ? 'clock-hour-3' : 'circle-dashed'

  return (
    <ACard T={T} dark={dark}>
      <ACardHeader T={T} dark={dark} icon="cash-banknote" label="Financeiro" />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ padding: '10px 12px', borderRight: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            Total
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {fmtBRL(totalLiq)}
          </div>
          {desconto > 0 && (
            <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 2 }}>
              desc. {fmtBRL(desconto)}
            </div>
          )}
        </div>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
            Status
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 700, color: statusCor,
          }}>
            <i className={`ti ti-${statusIcon}`} style={{ fontSize: 13 }} aria-hidden="true" />
            {statusLabel}
          </div>
        </div>
      </div>

      <ARow T={T} first icon="coin" label="Pago"
        value={fmtBRL(pago)} valueCor={pago > 0 ? verde : T.textMuted} mono />
      <ARow T={T} icon="clock-dollar" label="Saldo"
        value={fmtBRL(saldo)}
        valueCor={saldo === 0 ? verde : amarelo} mono />
      {os.forma_pagamento && (
        <ARow T={T} icon="credit-card" label="Forma" value={os.forma_pagamento} />
      )}

      {/* Itens */}
      {itens.length > 0 && (
        <>
          <ADivider T={T} />
          <div style={{
            padding: '6px 12px 4px',
            fontSize: 10, fontWeight: 700, color: T.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Itens ({itens.length})
          </div>
          {itens.map((it, i) => {
            const tot = total(it)
            const icon = it.tipo === 'servico' ? 'tool'
              : it.tipo === 'peca' ? 'puzzle'
              : it.tipo === 'maquina' ? 'device-washing-machine'
              : 'circle'
            return (
              <div key={it.id || i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px',
                borderTop: `1px solid ${T.border}`,
              }}>
                <i className={`ti ti-${icon}`}
                  style={{ fontSize: 12, color: T.textDim, flexShrink: 0 }}
                  aria-hidden="true" />
                <span style={{
                  flex: 1, fontSize: 12, color: T.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {it.nome || '(sem nome)'}
                </span>
                <span style={{ fontSize: 10.5, color: T.textMuted, flexShrink: 0 }}>
                  {it.qtd}×
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600, color: T.textPrimary,
                  fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                  fontFamily: MONO,
                }}>
                  {fmtBRL(tot)}
                </span>
              </div>
            )
          })}
        </>
      )}
    </ACard>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// COL 4 — HISTÓRICO RICO POR ETAPA
// ═══════════════════════════════════════════════════════════════════════════
function EtapaBlock({ T, dark, etapa, data, responsavel, children, first }) {
  const meta = ETAPA_META[etapa] || { icon: 'point', cor: 'blue', label: etapa }
  const cor  = corEtapa(meta.cor, dark)
  return (
    <div style={{
      borderTop: first ? 'none' : `1px solid ${T.border}`,
      padding: '10px 12px',
    }}>
      {/* Cabeçalho da etapa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          background: cor + '22', border: `1.5px solid ${cor}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <i className={`ti ti-${meta.icon}`} style={{ fontSize: 11, color: cor }} aria-hidden="true" />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary, flex: 1 }}>
          {meta.label}
        </span>
        {(data || responsavel) && (
          <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            {data ? fmtPrazoCurto(data) : ''}
            {responsavel ? ` · ${responsavel}` : ''}
          </span>
        )}
      </div>
      {/* Detalhes */}
      <div style={{ paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {children}
      </div>
    </div>
  )
}

function Detail({ T, dark, icon, text, cor }) {
  if (!text) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 5,
      fontSize: 11.5, color: cor || T.textSecondary, lineHeight: 1.4,
    }}>
      {icon && (
        <i className={`ti ti-${icon}`}
          style={{ fontSize: 11, flexShrink: 0, marginTop: 2, color: cor || T.textDim }}
          aria-hidden="true" />
      )}
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  )
}

function TagGroup({ T, dark, label, items, cor }) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
      <span style={{ fontSize: 10.5, color: T.textMuted, flexShrink: 0 }}>{label}:</span>
      {items.map((item, i) => (
        <span key={i} style={{
          fontSize: 10.5, fontWeight: 600,
          padding: '1px 6px', borderRadius: 3,
          background: cor + '22', color: cor,
        }}>
          {item}
        </span>
      ))}
    </div>
  )
}

function ColHistorico({ T, dark, os, admin, checkRecebido, checkOficina, checkTeste, falhas, itens, funcPorId }) {
  const hist = os.historico || []
  const pd   = os.pre_diagnostico || {}

  function dadosEtapa(etapas) {
    const lista = Array.isArray(etapas) ? etapas : [etapas]
    const h = [...hist].reverse().find(x => lista.includes(x.etapa))
    if (!h) return null
    return { data: h.data, responsavel: funcPorId(h.funcionario) }
  }

  function resumoChk(chk) {
    if (!chk?.itens?.length) return null
    const ok = chk.itens.filter(i => i.valor === 'ok' || i.checked === true).length
    const total = chk.itens.length
    const falhou = chk.itens.filter(i => ['defeito', 'barulho'].includes(i.valor))
    return { ok, total, falhou }
  }

  const verde    = corEtapa('green',  dark)
  const amarelo  = corEtapa('yellow', dark)
  const vermelho = corEtapa('red',    dark)
  const azul     = corEtapa('blue',   dark)

  // Componentes marcados no diagnóstico
  const componentesMarcados = useMemo(() => {
    const raw = pd.componentes_marcados || {}
    const trocas = []
    const manuts = []
    for (const grupoObj of Object.values(raw)) {
      for (const [itemId, acao] of Object.entries(grupoObj || {})) {
        const cat = CATEGORIAS_PECA.find(c => c.id === itemId)
        const label = cat?.label || itemId
        if (acao === 'troca') trocas.push(label)
        else if (acao === 'manutencao') manuts.push(label)
      }
    }
    return { trocas, manuts }
  }, [pd.componentes_marcados])

  // Checklist testes recebido
  const testesRec = useMemo(() => {
    return (checkRecebido?.itens || []).filter(t => t.valor && t.valor !== 'na')
  }, [checkRecebido?.itens])

  const vazamentos = pd.vazamentos || {}
  const locaisVaz = [
    vazamentos.entrada  && 'Entrada',
    vazamentos.agitacao && 'Agitação',
    vazamentos.saida    && 'Saída',
  ].filter(Boolean)

  const blocos = []

  // ── Avaliação ── ('recebido' antigo mapeado pra 'diagnostico' pelo dbEtapaToUI)
  const dRec = dadosEtapa(['recebido', 'diagnostico'])
  if (dRec) {
    blocos.push(
      <EtapaBlock key="recebido" T={T} dark={dark} etapa="recebido"
        data={dRec.data} responsavel={dRec.responsavel} first={blocos.length === 0}>
        {pd.equipamento_nao_liga && (
          <Detail T={T} dark={dark} icon="bolt-off" cor={vermelho}
            text={`Não liga${pd.motivo_nao_liga ? `: ${pd.motivo_nao_liga}` : ''}`} />
        )}
        {locaisVaz.length > 0 && (
          <Detail T={T} dark={dark} icon="droplet" cor={amarelo}
            text={`Vazamento: ${locaisVaz.join(' · ')}`} />
        )}
        {testesRec.map(t => {
          const cor = t.valor === 'ok' ? verde : t.valor === 'defeito' ? vermelho : amarelo
          const icon = t.valor === 'ok' ? 'check' : t.valor === 'defeito' ? 'alert-triangle' : 'volume'
          return (
            <Detail key={t.id} T={T} dark={dark} icon={icon} cor={cor}
              text={`${t.label || t.id}: ${t.valor === 'ok' ? 'OK' : t.valor === 'defeito' ? 'Defeito' : 'Barulho'}`} />
          )
        })}
        {os.observacoes && (
          <Detail T={T} dark={dark} icon="notes"
            text={`Obs: ${os.observacoes}`} />
        )}
        {!pd.equipamento_nao_liga && locaisVaz.length === 0 && testesRec.length === 0 && !os.observacoes && (
          <Detail T={T} dark={dark} text="Sem registros de defeito na avaliação." />
        )}
      </EtapaBlock>
    )
  }

  // ── Diagnóstico ──
  const dDiag = dadosEtapa('diagnostico')
  if (dDiag) {
    const causa = pd.causa_diagnostico || os.diagnostico?.causa
    blocos.push(
      <EtapaBlock key="diagnostico" T={T} dark={dark} etapa="diagnostico"
        data={dDiag.data} responsavel={dDiag.responsavel} first={blocos.length === 0}>
        {causa && <Detail T={T} dark={dark} icon="bulb" text={causa} />}
        <TagGroup T={T} dark={dark} label="Troca" items={componentesMarcados.trocas} cor={vermelho} />
        <TagGroup T={T} dark={dark} label="Manut." items={componentesMarcados.manuts} cor={amarelo} />
        {!causa && componentesMarcados.trocas.length === 0 && componentesMarcados.manuts.length === 0 && (
          <Detail T={T} dark={dark} text="Diagnóstico iniciado." />
        )}
      </EtapaBlock>
    )
  }

  // ── Orçamento ──
  const dOrc = dadosEtapa('orcamento')
  if (admin && dOrc) {
    const sub = itens.reduce((s, i) => s + (i.valor_total ?? (i.valor_unitario ?? i.valor ?? 0) * (i.qtd ?? 1)), 0)
    blocos.push(
      <EtapaBlock key="orcamento" T={T} dark={dark} etapa="orcamento"
        data={dOrc.data} responsavel={dOrc.responsavel} first={blocos.length === 0}>
        <Detail T={T} dark={dark} icon="receipt"
          text={`${itens.length} iten${itens.length !== 1 ? 's' : ''} · ${fmtBRL(sub)}${os.desconto > 0 ? ` · desc. ${fmtBRL(os.desconto)}` : ''}`} />
      </EtapaBlock>
    )
  }

  // ── Conserto ──
  const dOf = dadosEtapa(['oficina', 'em_oficina'])
  if (dOf) {
    const chk = resumoChk(checkOficina)
    blocos.push(
      <EtapaBlock key="oficina" T={T} dark={dark} etapa="oficina"
        data={dOf.data} responsavel={dOf.responsavel} first={blocos.length === 0}>
        {chk ? (
          <>
            <Detail T={T} dark={dark} icon="check"
              text={`Checklist: ${chk.ok}/${chk.total} OK`}
              cor={chk.falhou.length === 0 ? verde : amarelo} />
            {chk.falhou.length > 0 && (
              <Detail T={T} dark={dark} icon="alert-triangle" cor={vermelho}
                text={`Problemas: ${chk.falhou.map(f => f.label || f.id).join(' · ')}`} />
            )}
          </>
        ) : (
          <Detail T={T} dark={dark} text="Em conserto." />
        )}
      </EtapaBlock>
    )
  }

  // ── Teste final ──
  const dTeste = dadosEtapa('teste_final')
  if (dTeste) {
    const chk = resumoChk(checkTeste)
    const abertas = (falhas || []).filter(f => !f.resolvida).length
    blocos.push(
      <EtapaBlock key="teste" T={T} dark={dark} etapa="teste_final"
        data={dTeste.data} responsavel={dTeste.responsavel} first={blocos.length === 0}>
        {chk ? (
          <Detail T={T} dark={dark} icon="check"
            text={`${chk.ok}/${chk.total} OK`}
            cor={chk.ok === chk.total ? verde : amarelo} />
        ) : null}
        {abertas > 0 && (
          <Detail T={T} dark={dark} icon="alert-triangle" cor={vermelho}
            text={`${abertas} falha${abertas > 1 ? 's' : ''} em aberto`} />
        )}
        {!chk && abertas === 0 && <Detail T={T} dark={dark} text="Teste realizado." />}
      </EtapaBlock>
    )
  }

  // ── Entrega ──
  const dEnt = dadosEtapa(['entrega', 'entregue'])
  if (dEnt) {
    blocos.push(
      <EtapaBlock key="entrega" T={T} dark={dark} etapa="entrega"
        data={dEnt.data} responsavel={dEnt.responsavel} first={blocos.length === 0}>
        <Detail T={T} dark={dark} icon="circle-check" cor={verde} text="Máquina entregue ao cliente." />
      </EtapaBlock>
    )
  }

  // ── Pagamento ──
  const dPag = dadosEtapa('pagamento')
  if (admin && (dPag || os.valor_pago > 0)) {
    const saldo = Math.max(0, totalAPagar(os) - (os.valor_pago || 0))
    blocos.push(
      <EtapaBlock key="pagamento" T={T} dark={dark} etapa="pagamento"
        data={dPag?.data} responsavel={dPag?.responsavel} first={blocos.length === 0}>
        <Detail T={T} dark={dark} icon="coin" cor={verde}
          text={`Pago ${fmtBRL(os.valor_pago || 0)}${os.forma_pagamento ? ` · ${os.forma_pagamento}` : ''}`} />
        {saldo > 0 && (
          <Detail T={T} dark={dark} icon="clock-dollar" cor={amarelo}
            text={`Saldo: ${fmtBRL(saldo)}`} />
        )}
      </EtapaBlock>
    )
  }

  // ── Concluído ──
  const dConc = dadosEtapa('concluido')
  if (dConc) {
    blocos.push(
      <EtapaBlock key="concluido" T={T} dark={dark} etapa="concluido"
        data={dConc.data} responsavel={dConc.responsavel} first={blocos.length === 0}>
        <Detail T={T} dark={dark} icon="shield-check" cor={verde}
          text={`Garantia de ${os.garantia_dias || 90} dias.`} />
        {os.garantia && <Detail T={T} dark={dark} icon="shield" text="OS executada como garantia." cor={azul} />}
      </EtapaBlock>
    )
  }

  // ── Recusado ──
  const dRej = dadosEtapa('recusado')
  if (dRej) {
    blocos.push(
      <EtapaBlock key="recusado" T={T} dark={dark} etapa="recusado"
        data={dRej.data} responsavel={dRej.responsavel} first={blocos.length === 0}>
        <Detail T={T} dark={dark} icon="circle-x" cor={vermelho} text="OS recusada pelo cliente." />
      </EtapaBlock>
    )
  }

  return (
    <ACard T={T} dark={dark}>
      <ACardHeader T={T} dark={dark} icon="timeline" label="Por etapa"
        badge={blocos.length > 0 ? blocos.length : null} />
      {blocos.length === 0 ? (
        <div style={{
          padding: '20px 12px', textAlign: 'center',
          color: T.textDim, fontSize: 12,
        }}>
          Nenhuma etapa registrada.
        </div>
      ) : blocos}
    </ACard>
  )
}

// ─── Banner contextual ────────────────────────────────────────────────────────
function Banner({ T, dark, cor, icon, titulo, texto, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: 12,
      background: cor + '11',
      border: `1px solid ${cor}33`,
      borderRadius: 6,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 4, flexShrink: 0,
        background: cor + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ti-${icon}`} style={{ fontSize: 18, color: cor }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary }}>{titulo}</div>
        <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>{texto}</div>
      </div>
      {onClick && <i className="ti ti-chevron-right" style={{ fontSize: 15, color: T.textMuted }} aria-hidden="true" />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Componente principal
// ═══════════════════════════════════════════════════════════════════════════
export default function RelatorioTab({ T, dark, os, osBase, usuarios, admin, onAbrirOS, onUpdateOS, mobile }) {
  const { itens, loading: itensLoading } = useOSItens(os?.id)
  const checkRecebido = useChecklistEtapa(os?.id, 'recebido')
  const checkOficina  = useChecklistEtapa(os?.id, 'em_oficina')
  const checkTeste    = useChecklistEtapa(os?.id, 'teste_final')
  const { falhas }    = useFalhaTeste(os?.id)

  const funcPorId = (id) => {
    const u = (usuarios || []).find(x => x.id === id)
    return u ? (u.apelido || u.nome || null) : null
  }

  const isConcluido   = os.etapa === 'concluido'
  const isRecusado    = os.etapa === 'recusado'
  const garantiaAtiva = isConcluido ? dentroGarantia(os) : false
  const osOrigem      = os.garantia && osBase ? osBase.find(o => o.numero === os.os_origem_id) : null

  const azul    = corEtapa('blue',  dark)
  const verde   = corEtapa('green', dark)
  const vermelho = corEtapa('red',  dark)

  // Blocos empilhados verticalmente (um embaixo do outro).
  // Col financeiro só aparece pra admin.

  return (
    <div style={{
      padding: mobile ? '10px 10px 80px' : '12px 12px 24px',
      display: 'flex', flexDirection: 'column', gap: 12,
      fontFamily: ATL_FONT,
    }}>

      {/* Blocos empilhados: datas · fotos · financeiro · histórico */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'stretch',
      }}>
        <ColDatas T={T} dark={dark} os={os} />
        <ColFotos T={T} dark={dark} os={os} />
        {admin && !itensLoading && (
          <ColFinanceiro T={T} dark={dark} os={os} itens={itens} admin={admin} />
        )}
        {admin && itensLoading && (
          <ACard T={T} dark={dark}>
            <ACardHeader T={T} dark={dark} icon="cash-banknote" label="Financeiro" />
            <div style={{ padding: 16, color: T.textDim, fontSize: 12, textAlign: 'center' }}>Carregando…</div>
          </ACard>
        )}
        {admin && os?.id && (
          <CustoTerceiroPanel T={T} dark={dark} os={os} />
        )}
        <ColHistorico
          T={T} dark={dark} os={os} admin={admin}
          checkRecebido={checkRecebido}
          checkOficina={checkOficina}
          checkTeste={checkTeste}
          falhas={falhas}
          itens={itens}
          funcPorId={funcPorId}
        />
      </div>

      {/* Banners contextuais */}
      {os.garantia && osOrigem && (
        <Banner T={T} dark={dark}
          cor={azul} icon="shield-check"
          titulo="OS em garantia"
          texto={`Referente à OS #${osOrigem.numero} — ${osOrigem.cliente}.`}
          onClick={() => onAbrirOS?.(osOrigem.numero)}
        />
      )}
      {garantiaAtiva && !os.garantia && (
        <Banner T={T} dark={dark}
          cor={verde} icon="shield-check"
          titulo="Garantia ativa"
          texto="Se o cliente retornar com o mesmo defeito dentro do prazo, abra uma OS de garantia."
        />
      )}
      {isRecusado && (
        <Banner T={T} dark={dark}
          cor={vermelho} icon="circle-x"
          titulo="OS recusada pelo cliente"
          texto="Defina o destino da máquina na aba Etapa."
        />
      )}
    </div>
  )
}
