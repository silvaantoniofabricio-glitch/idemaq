// src/components/osDetalhe/tabs/ResumoTab.jsx
// Aba Resumo — contexto do caso. Banners de garantia/recusada, mini-cards de
// prazo, diagnóstico (defeito + causa), orçamento (admin-only com totais),
// histórico recente das últimas 3 mudanças de etapa, observações.
// Cliente/equipamento já vivem no Header do modal (sempre visíveis).

import React from 'react'
import { P } from '../../../theme'
import { corEtapa, bgEtapa } from '../../../utils/colors'
import { dentroGarantia, calcStatusPrazo, diasPrazo, totalAPagar, estaPagaTotal } from '../../../utils/osHelpers'
import { fmtBRL, fmtPrazoCurto } from '../../../utils/fmt'
import { funcPorId, TIPOS_OS } from '../../../utils/osData'
import { useOSItens } from '../../../hooks/useOSItens'
import RelatorioDiagnostico from '../RelatorioDiagnostico'

export default function ResumoTab({ T, dark, os, osBase, admin, onAbrirOS }) {
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

  // Itens reais da OS (Módulo 00c — Lote 1) — substituiu OS_ITENS_MOCK.
  // Quando os.id não existe (rascunho/novo), retorna [] sem buscar.
  const { itens, loading: itensLoading } = useOSItens(os?.id)
  const temItens = itens.length > 0

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

      {/* Diagnóstico — componente compartilhado com AcaoOrcamento e AcaoOficina.
          Mostra defeito do cliente + causa do técnico + chips dos itens marcados
          (troca/manutenção) + badge "Diag por XX". Esconde se OS ainda nem
          chegou no Diagnóstico. */}
      {(os.defeito || os.diagnostico?.causa || os.diagnostico?.checklist) && (
        <RelatorioDiagnostico T={T} dark={dark} os={os} />
      )}

      {/* Orçamento — só admin (regra: funcionário não vê valores financeiros) */}
      {admin && itensLoading && (
        <div className="idemaq-card" style={{
          background: T.cardAlt, border: `1px solid ${T.border}`,
          borderRadius: 9, padding: '14px',
          fontSize: 12, color: T.textMuted, textAlign: 'center',
        }}>
          <i className="ti ti-loader" style={{ fontSize: 14, marginRight: 6, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
          Carregando itens…
        </div>
      )}
      {admin && !itensLoading && temItens && (
        <OrcamentoBloco T={T} dark={dark} os={os} itens={itens} />
      )}
      {admin && !itensLoading && !temItens && (
        <div className="idemaq-card" style={{
          background: T.cardAlt, border: `1px dashed ${T.border}`,
          borderRadius: 9, padding: '12px 14px',
          fontSize: 12, color: T.textMuted, fontStyle: 'italic',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className="ti ti-receipt-off" style={{ fontSize: 14 }} aria-hidden="true" />
          Nenhum item lançado nesta OS.
        </div>
      )}

      {/* Histórico recente — últimas 3 mudanças */}
      <HistoricoRecenteBloco T={T} dark={dark} os={os} />

      {/* Observações */}
      {os.observacoes && (
        <div className="idemaq-card" style={{
          background: T.cardAlt, border: `1px solid ${T.border}`,
          borderRadius: 9, padding: '12px 14px',
        }}>
          <SectionLabel T={T} icon="ti-notes" label="Observações" />
          <div style={{
            fontSize: 12, color: T.textSecondary, lineHeight: 1.5,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            marginTop: 8,
          }}>{os.observacoes}</div>
        </div>
      )}
    </div>
  )
}

// ─── Orçamento (admin-only) — itens + Total/Pago/Saldo ──────────────────────
function OrcamentoBloco({ T, dark, os, itens }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const amarelo = corEtapa('yellow', dark)

  // Aceita ambos os formatos: tabela `os_item` real (valor_unitario + valor_total)
  // e mock legado (valor). Prefere valor_total quando vier do banco.
  function unit(i)  { return i.valor_unitario ?? i.valor ?? 0 }
  function total(i) { return i.valor_total ?? unit(i) * (i.qtd ?? 1) }
  const subtotal = itens.reduce((s, i) => s + total(i), 0)
  const desconto = os.desconto || 0
  const totalLiq = Math.max(0, subtotal - desconto)
  const pago = os.valor_pago || 0
  const saldo = Math.max(0, totalLiq - pago)
  const pct = totalLiq > 0 ? Math.round((pago / totalLiq) * 100) : 0
  const pagaTotal = estaPagaTotal(os)
  const pagaParcial = !pagaTotal && pago > 0

  const statusPag = pagaTotal
    ? { label: 'Pago', cor: verde, icon: 'ti-circle-check', bg: bgEtapa('green', dark) }
    : pagaParcial
      ? { label: 'Pago parcial', cor: amarelo, icon: 'ti-clock-hour-3', bg: bgEtapa('yellow', dark) }
      : { label: 'Não pago', cor: T.textMuted, icon: 'ti-circle-dashed', bg: T.cardAlt }

  return (
    <div className="idemaq-card" style={{
      background: T.cardAlt, border: `1px solid ${T.border}`,
      borderRadius: 9, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <SectionLabel T={T} icon="ti-receipt" label={`Orçamento · ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 10.5, fontWeight: 700,
          padding: '2px 8px', borderRadius: 12,
          background: statusPag.bg, color: statusPag.cor,
          border: `1px solid ${statusPag.cor}33`,
        }}>
          <i className={`ti ${statusPag.icon}`} aria-hidden="true" />
          {statusPag.label}
        </span>
      </div>

      {/* Lista compacta de itens */}
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 7, overflow: 'hidden',
      }}>
        {itens.map((it, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr auto auto',
            gap: 10, alignItems: 'center',
            padding: '7px 10px',
            borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
            fontSize: 12,
          }}>
            <div style={{
              color: T.textPrimary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <i className={`ti ${tipoIcone(it.tipo)}`} style={{
                fontSize: 12, color: T.textMuted, marginRight: 5,
              }} aria-hidden="true" />
              {it.nome || '(sem nome)'}
            </div>
            <span style={{
              fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}>
              {it.qtd}× {fmtBRL(unit(it))}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: T.textPrimary,
              fontVariantNumeric: 'tabular-nums',
              minWidth: 70, textAlign: 'right',
            }}>
              {fmtBRL(total(it))}
            </span>
          </div>
        ))}
      </div>

      {/* Totais em 3 colunas */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
        marginTop: 10,
      }}>
        <TotalCard T={T} label="Total" valor={fmtBRL(totalLiq)} cor={T.textPrimary}
          sub={desconto > 0 ? `subtotal ${fmtBRL(subtotal)} · desc ${fmtBRL(desconto)}` : null} />
        <TotalCard T={T} label="Pago" valor={fmtBRL(pago)} cor={pago > 0 ? verde : T.textMuted}
          sub={totalLiq > 0 ? `${pct}% do total` : null} />
        <TotalCard T={T} label="Saldo" valor={fmtBRL(saldo)}
          cor={saldo > 0 ? amarelo : verde}
          sub={saldo === 0 ? 'quitado' : os.forma_pagamento ? `via ${os.forma_pagamento}` : null} />
      </div>
    </div>
  )
}

function TotalCard({ T, label, valor, cor, sub }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 7, padding: '8px 10px',
    }}>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 3,
      }}>{label}</div>
      <div style={{
        fontSize: 14, fontWeight: 700, color: cor,
        fontVariantNumeric: 'tabular-nums',
      }}>{valor}</div>
      {sub && (
        <div style={{
          fontSize: 10, color: T.textMuted, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{sub}</div>
      )}
    </div>
  )
}

function tipoIcone(tipo) {
  if (tipo === 'servico') return 'ti-tool'
  if (tipo === 'peca') return 'ti-puzzle'
  if (tipo === 'maquina') return 'ti-device-washing-machine'
  return 'ti-circle'
}

// ─── Histórico recente — últimas 3 mudanças de etapa ────────────────────────
function HistoricoRecenteBloco({ T, dark, os }) {
  const historico = os.historico || []
  if (historico.length === 0) return null

  const azul = corEtapa('blue', dark)

  // Pega as últimas 3 entradas (já vem cronológico, então slice no final)
  const ultimas = historico.slice(-3).reverse()
  const cfgTipo = TIPOS_OS[os.tipo]
  const todasEtapas = [...(cfgTipo?.etapas || []), cfgTipo?.lateral].filter(Boolean)

  function labelEtapa(id) {
    const e = todasEtapas.find(x => x.id === id)
    return e?.curto || e?.label || id
  }

  return (
    <div className="idemaq-card" style={{
      background: T.cardAlt, border: `1px solid ${T.border}`,
      borderRadius: 9, padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <SectionLabel T={T} icon="ti-history" label="Histórico recente" />
        <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {historico.length} {historico.length === 1 ? 'evento' : 'eventos'} · ver tudo no ícone do header
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ultimas.map((h, i) => {
          const f = funcPorId(h.funcionario)
          const etapaLabel = labelEtapa(h.etapa)
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr auto',
              gap: 10, alignItems: 'center',
              padding: '7px 10px',
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 7,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: bgEtapa('blue', dark),
                color: azul,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13,
              }} aria-hidden="true">
                <i className="ti ti-arrow-right" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600, color: T.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  → {etapaLabel}
                </div>
                {f && (
                  <div style={{ fontSize: 10.5, color: T.textMuted, marginTop: 1 }}>
                    por {f.nome}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}>
                {fmtPrazoCurto(h.data)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Helpers visuais compartilhados ──────────────────────────────────────────
function SectionLabel({ T, icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <i className={`ti ${icon}`} style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
      <span style={{
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.3px',
      }}>{label}</span>
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
