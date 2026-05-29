// idemaq-src/pages/mobile/FinanceiroMobile.jsx
// Versão mobile-first da página Financeiro.
// Reutiliza useFinanceiro + LancamentoDetalheModal + NovoLancamentoModal sem
// modificações. Substitui tabelas por cards touch-friendly, filtros em chips
// colapsáveis e abas horizontais com scroll. Sem checkboxes nem tabelas.

import React, { useState, useMemo, useEffect } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { fmtBRL, fmtPrazoCurto } from '../../utils/fmt'
import { Card, Input, EmptyState, useToast } from '../../components/ui'
import LancamentoDetalheModal from '../../components/financeiro/LancamentoDetalheModal'
import NovoLancamentoModal from '../../components/financeiro/NovoLancamentoModal'
import { useFinanceiro } from '../../hooks/useFinanceiro'

// ─── Helpers (espelhados do Financeiro.jsx desktop) ───────────────────────────
const LABEL_FORMA = {
  pix: 'PIX', dinheiro: 'Dinheiro', debito: 'Débito',
  credito_1x: 'Cartão 1x', credito_parcelado: 'Cartão parcelado',
  link_pagamento: 'Link InfinitePay', boleto: 'Boleto',
  transferencia: 'Transferência', a_prazo: 'A prazo',
}
function labelForma(v) { return LABEL_FORMA[v] || v || '' }

const MAPA_FORMA = {
  'pix': 'pix', 'dinheiro': 'dinheiro', 'débito': 'debito', 'debito': 'debito',
  'cartão 1x': 'credito_1x', 'cartao 1x': 'credito_1x',
  'cartão parcelado': 'credito_parcelado', 'cartao parcelado': 'credito_parcelado',
  'link infinitepay': 'link_pagamento', 'link pagamento': 'link_pagamento',
  'boleto': 'boleto', 'transferência': 'transferencia', 'transferencia': 'transferencia',
  'a prazo': 'a_prazo',
}
function mapearFormaUIparaEnum(f) {
  if (!f) return null
  const k = String(f).toLowerCase().trim()
  if (Object.values(MAPA_FORMA).includes(k)) return k
  return MAPA_FORMA[k] || 'pix'
}

function adaptarBancoParaUI(lanc) {
  const ehReceita = lanc.tipo === 'receita'
  const pago = lanc.pago_em != null
  return {
    id: lanc.id, osNum: null,
    cliente: ehReceita ? (lanc.descricao || '').split('—')[0]?.trim() : null,
    descricao: lanc.descricao || '', fornecedor: null,
    categoria: lanc.categoria || 'Outros',
    conta: lanc.conta?.nome || '', conta_id: lanc.conta_id || null,
    valor: Number(lanc.valor) || 0, vencimento: lanc.vencimento,
    forma: labelForma(lanc.forma_pagamento), forma_enum: lanc.forma_pagamento || null,
    taxa_pct: Number(lanc.taxa_pct) || 0,
    status: pago ? 'pago' : 'aberto', dataPag: lanc.pago_em || null,
    recorrente: false, tipo: lanc.tipo,
  }
}

function statusVencimento(isoData) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const d = new Date(isoData + 'T00:00:00')
  const diff = Math.round((d - hoje) / 86400000)
  if (diff < 0)  return { tipo: 'vencido', label: `Venceu há ${-diff}d` }
  if (diff === 0) return { tipo: 'hoje',   label: 'Vence hoje' }
  if (diff === 1) return { tipo: 'amanha', label: 'Amanhã' }
  return               { tipo: 'futuro',  label: `Em ${diff}d` }
}

const PERIODOS = [
  { id: '7d',    label: '7d',    dias: 7 },
  { id: 'mes',   label: 'Mês',   mes: true },
  { id: '30d',   label: '30d',   dias: 30, futuro: true },
  { id: '90d',   label: '90d',   dias: 90, futuro: true },
  { id: 'todos', label: 'Todos', all: true },
]

function filtrarPorPeriodo(itens, periodoId, campoData) {
  if (periodoId === 'todos') return itens
  const cfg = PERIODOS.find(p => p.id === periodoId) || PERIODOS[1]
  if (cfg.all) return itens
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  let de, ate
  if (cfg.mes) {
    de  = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)
  } else if (cfg.futuro) {
    de = hoje; ate = new Date(hoje); ate.setDate(ate.getDate() + cfg.dias)
  } else {
    ate = hoje; de = new Date(hoje); de.setDate(de.getDate() - cfg.dias)
  }
  return itens.filter(it => {
    if (!it[campoData]) return true
    const d = new Date(it[campoData] + 'T00:00:00')
    if (de  && d < de)  return false
    if (ate && d > ate) return false
    return true
  })
}

const META_MES = 20000
const isoHoje = () => new Date().toISOString().slice(0, 10)

// ─── Status chip ──────────────────────────────────────────────────────────────
function StatusChip({ item, dark }) {
  if (item.status === 'pago') {
    const azul = corEtapa('blue', dark)
    return (
      <span style={{
        fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
        background: bgEtapa('blue', dark), color: azul,
        display: 'inline-flex', alignItems: 'center', gap: 4,
      }}>
        <i className="ti ti-circle-check" style={{ fontSize: 11 }} aria-hidden="true" /> Pago
      </span>
    )
  }
  const st = statusVencimento(item.vencimento)
  const map = {
    vencido: { bg: bgEtapa('red', dark),    cor: corEtapa('red', dark),    icon: 'ti-alert-triangle' },
    hoje:    { bg: bgEtapa('yellow', dark), cor: corEtapa('yellow', dark), icon: 'ti-clock' },
    amanha:  { bg: bgEtapa('yellow', dark), cor: corEtapa('yellow', dark), icon: 'ti-calendar-due' },
    futuro:  { bg: bgEtapa('blue', dark),   cor: corEtapa('blue', dark),   icon: 'ti-calendar-event' },
  }
  const cfg = map[st.tipo] || map.futuro
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
      background: cfg.bg, color: cfg.cor,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      <i className={`ti ${cfg.icon}`} style={{ fontSize: 11 }} aria-hidden="true" /> {st.label}
    </span>
  )
}

// ─── Card de lançamento mobile ────────────────────────────────────────────────
function LancamentoCard({ T, dark, item, tipo, onAbrir, onBaixar }) {
  const azul   = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const corT   = tipo === 'receber' ? azul : amarelo
  const icone  = tipo === 'receber' ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'
  const pago   = item.status === 'pago'

  return (
    <div
      onClick={() => onAbrir(item)}
      role="button"
      tabIndex={0}
      style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: '12px 14px',
        display: 'flex', gap: 12, cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Ícone lateral */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: bgEtapa(tipo === 'receber' ? 'blue' : 'yellow', dark),
        border: `1px solid ${corT}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icone}`} style={{ fontSize: 18, color: corT }} aria-hidden="true" />
      </div>

      {/* Conteúdo central */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 700, color: corHero(dark),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {tipo === 'receber' ? (item.cliente || item.descricao) : item.descricao}
        </div>
        <div style={{
          fontSize: 11, color: T.textMuted, marginTop: 3,
          display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtPrazoCurto(item.vencimento)}</span>
          {item.categoria && (
            <span style={{
              background: T.cardAlt, border: `1px solid ${T.border}`,
              borderRadius: 8, padding: '1px 6px', fontSize: 10.5,
            }}>{item.categoria}</span>
          )}
        </div>
        <div style={{ marginTop: 7 }}>
          <StatusChip item={item} dark={dark} />
        </div>
      </div>

      {/* Valor + ação rápida */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        justifyContent: 'space-between', gap: 6, flexShrink: 0,
      }}>
        <span style={{
          fontSize: 14.5, fontWeight: 800, color: pago ? T.textDim : corHero(dark),
          fontVariantNumeric: 'tabular-nums',
          textDecoration: pago ? 'line-through' : 'none',
        }}>
          {fmtBRL(item.valor)}
        </span>
        {!pago && (
          <button
            onClick={e => { e.stopPropagation(); onBaixar(item) }}
            style={{
              background: corT, color: '#fff', border: 'none',
              borderRadius: 8, padding: '6px 11px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            <i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true" />
            {tipo === 'receber' ? 'Receber' : 'Pagar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Filtros colapsáveis ──────────────────────────────────────────────────────
function FiltrosMobile({ T, dark, tipo, periodo, setPeriodo, statusFilt, setStatusFilt, busca, setBusca }) {
  const [aberto, setAberto] = useState(false)
  const azul = corEtapa('blue', dark)
  const cor  = (d, c) => dark ? d : c

  const defaultStatus = tipo === 'caixa' ? 'todos' : 'aberto'
  const statusOpts = tipo === 'caixa'
    ? [{ id: 'todos', label: 'Todos' }, { id: 'receita', label: 'Entradas' }, { id: 'despesa', label: 'Saídas' }]
    : [
        { id: 'todos',   label: 'Todos' },
        { id: 'aberto',  label: tipo === 'receber' ? 'A receber' : 'A pagar' },
        { id: 'vencido', label: 'Vencidas' },
        { id: 'pago',    label: 'Pagas' },
      ]

  const temFiltroAtivo = periodo !== 'mes' || statusFilt !== defaultStatus || busca.trim()

  return (
    <div>
      <button
        onClick={() => setAberto(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px 14px', borderRadius: 10,
          background: T.card, border: `1px solid ${T.border}`,
          color: T.textSecondary, fontSize: 13, cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 500,
        }}
      >
        <i className="ti ti-filter" style={{ fontSize: 15, color: temFiltroAtivo ? azul : T.textMuted }} aria-hidden="true" />
        <span style={{ flex: 1, textAlign: 'left' }}>
          Filtros{temFiltroAtivo && <span style={{ color: azul, fontWeight: 700 }}> · ativos</span>}
        </span>
        <i className={`ti ${aberto ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
      </button>

      {aberto && (
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: '12px 14px', marginTop: 4,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Período */}
          <div>
            <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>
              Período
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PERIODOS.map(p => {
                const ativo = periodo === p.id
                return (
                  <button key={p.id} onClick={() => setPeriodo(p.id)}
                    style={{
                      padding: '6px 13px', borderRadius: 8,
                      border: `1px solid ${ativo ? azul : T.border}`,
                      background: ativo ? cor('#0d2035', '#e6f1fb') : T.cardAlt,
                      color: ativo ? azul : T.textSecondary,
                      fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>
              Status
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {statusOpts.map(s => {
                const ativo = statusFilt === s.id
                return (
                  <button key={s.id} onClick={() => setStatusFilt(s.id)}
                    style={{
                      padding: '6px 13px', borderRadius: 8,
                      border: `1px solid ${ativo ? azul : T.border}`,
                      background: ativo ? cor('#0d2035', '#e6f1fb') : T.cardAlt,
                      color: ativo ? azul : T.textSecondary,
                      fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Busca */}
          <div>
            <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>
              Busca
            </div>
            <Input T={T} dark={dark}
              value={busca} onChange={setBusca}
              icon="ti-search"
              placeholder={tipo === 'receber' ? 'Cliente ou descrição…' : 'Descrição…'}
            />
          </div>

          {temFiltroAtivo && (
            <button
              onClick={() => { setPeriodo('mes'); setStatusFilt(defaultStatus); setBusca('') }}
              style={{
                background: 'transparent', border: `1px solid ${T.border}`,
                color: T.textMuted, borderRadius: 8, padding: '7px 13px',
                fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
              }}>
              <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" /> Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── KPI grid 2×2 ─────────────────────────────────────────────────────────────
function KpiGrid({ T, dark, kpis }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {kpis.map((k, i) => (
        <div key={i} style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: '11px 13px',
        }}>
          <div style={{
            fontSize: 10, color: T.textMuted, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {k.icon && <i className={`ti ${k.icon}`} style={{ fontSize: 12, color: k.iconCor || T.textMuted }} aria-hidden="true" />}
            {k.label}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: k.cor, fontVariantNumeric: 'tabular-nums' }}>
            {k.valor}
          </div>
          {k.sub && (
            <div style={{ fontSize: 10, color: T.textMuted, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{k.sub}</div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Visão Geral mobile ───────────────────────────────────────────────────────
function VisaoGeralMobile({
  T, dark,
  recebidoMes, pagoMes, saldoCaixa,
  pctMeta, faltaMeta, meta,
  vencidos, totalVencido, totalReceber, totalPagar,
  onIrParaReceber,
}) {
  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde   = corEtapa('green', dark)

  const hoje = new Date()
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  let diasUteis = 0
  for (let d = new Date(hoje); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    const dia = d.getDay()
    if (dia !== 0 && dia !== 6) diasUteis++
  }
  const metaDiaria = diasUteis > 0 ? Math.ceil(faltaMeta / diasUteis) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Card meta do mês */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: T.textSecondary }}>
            <i className="ti ti-target" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
            Meta do mês
          </div>
          <span style={{ fontSize: 10.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            {diasUteis} {diasUteis === 1 ? 'dia útil' : 'dias úteis'} restantes
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: corHero(dark), fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
            {fmtBRL(recebidoMes)}
          </span>
          <span style={{ fontSize: 12, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            de {fmtBRL(meta)}
          </span>
        </div>

        <div style={{
          width: '100%', height: 8, borderRadius: 5,
          background: T.cardAlt, border: `1px solid ${T.border}`, overflow: 'hidden', marginBottom: 6,
        }}>
          <div style={{
            width: `${pctMeta}%`, height: '100%',
            background: `linear-gradient(90deg, ${azul}, ${corEtapa('blueLight', dark)})`,
            transition: 'width .4s',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.textMuted, marginBottom: 12 }}>
          <span style={{ color: azul, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pctMeta}% concluído</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>Faltam {fmtBRL(faltaMeta)}</span>
        </div>

        <div style={{
          background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 11.5, color: T.textMuted }}>Meta diária pra bater</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: azul, fontVariantNumeric: 'tabular-nums' }}>
            {fmtBRL(metaDiaria)}
            <span style={{ fontSize: 10.5, fontWeight: 500, color: T.textMuted }}>/dia</span>
          </span>
        </div>
      </div>

      {/* KPIs 2×2 */}
      <KpiGrid T={T} dark={dark} kpis={[
        { label: 'Recebido', valor: fmtBRL(recebidoMes), cor: azul,   icon: 'ti-arrow-down-circle', iconCor: azul },
        { label: 'Pago',     valor: fmtBRL(pagoMes),     cor: amarelo, icon: 'ti-arrow-up-circle',  iconCor: amarelo },
        { label: 'Saldo',    valor: fmtBRL(saldoCaixa),  cor: saldoCaixa >= 0 ? corHero(dark) : vermelho, icon: 'ti-cash-banknote', iconCor: saldoCaixa >= 0 ? verde : vermelho },
        { label: 'Vencidos', valor: vencidos.length,      cor: vencidos.length > 0 ? vermelho : T.textDim, icon: 'ti-alert-triangle', iconCor: vencidos.length > 0 ? vermelho : T.textMuted, sub: vencidos.length > 0 ? fmtBRL(totalVencido) : '' },
      ]} />

      {/* Alerta vencidos — clicável */}
      {vencidos.length > 0 && (
        <button
          onClick={onIrParaReceber}
          style={{
            background: bgEtapa('red', dark), border: `1px solid ${vermelho}44`,
            borderRadius: 10, padding: '12px 14px', width: '100%',
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
          }}
        >
          <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: vermelho, flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: vermelho }}>
              {vencidos.length} conta{vencidos.length > 1 ? 's' : ''} vencida{vencidos.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {fmtBRL(totalVencido)} a receber — toque pra ver
            </div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: 16, color: T.textMuted }} aria-hidden="true" />
        </button>
      )}

      {/* Resumo pendências */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.textSecondary, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-chart-arcs" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
          Pendências
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: T.textSecondary, display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="ti ti-arrow-down-circle" style={{ fontSize: 15, color: azul }} aria-hidden="true" /> A receber
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: azul, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totalReceber)}</span>
          </div>
          <div style={{ height: 1, background: T.border }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: T.textSecondary, display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="ti ti-arrow-up-circle" style={{ fontSize: 15, color: amarelo }} aria-hidden="true" /> A pagar
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: amarelo, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totalPagar)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Lista mobile (A Receber / A Pagar) ──────────────────────────────────────
function ListaMobile({ T, dark, itens, tipo, onAbrir, onBaixar }) {
  const [periodo, setPeriodo]       = useState('mes')
  const [statusFilt, setStatusFilt] = useState('aberto')
  const [busca, setBusca]           = useState('')

  const azul   = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const corT   = tipo === 'receber' ? azul : amarelo

  const filtrados = useMemo(() => {
    let arr = filtrarPorPeriodo(itens, periodo, 'vencimento')
    if (statusFilt === 'aberto')  arr = arr.filter(i => i.status === 'aberto')
    else if (statusFilt === 'pago') arr = arr.filter(i => i.status === 'pago')
    else if (statusFilt === 'vencido') arr = arr.filter(i =>
      i.status === 'aberto' && statusVencimento(i.vencimento).tipo === 'vencido'
    )
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      arr = arr.filter(i =>
        (i.descricao || '').toLowerCase().includes(q) ||
        (i.cliente   || '').toLowerCase().includes(q) ||
        (i.categoria || '').toLowerCase().includes(q)
      )
    }
    return [...arr].sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))
  }, [itens, periodo, statusFilt, busca])

  const totalFiltrado = filtrados.reduce((s, i) => s + i.valor, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <FiltrosMobile T={T} dark={dark} tipo={tipo}
        periodo={periodo} setPeriodo={setPeriodo}
        statusFilt={statusFilt} setStatusFilt={setStatusFilt}
        busca={busca} setBusca={setBusca}
      />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '2px 2px', fontSize: 11.5, color: T.textMuted,
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span>{filtrados.length} lançamento{filtrados.length !== 1 ? 's' : ''}</span>
        <span style={{ fontWeight: 700, color: corT }}>{fmtBRL(totalFiltrado)}</span>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState T={T} icon="ti-search-off"
          title="Nenhum lançamento"
          description="Ajuste os filtros ou o período."
          compact height="auto"
        />
      ) : (
        filtrados.map(it => (
          <LancamentoCard key={it.id} T={T} dark={dark}
            item={it} tipo={tipo}
            onAbrir={onAbrir} onBaixar={onBaixar}
          />
        ))
      )}
    </div>
  )
}

// ─── Caixa mobile ─────────────────────────────────────────────────────────────
function CaixaMobile({ T, dark, itens, onAbrir }) {
  const [periodo, setPeriodo]       = useState('mes')
  const [statusFilt, setStatusFilt] = useState('todos')
  const [busca, setBusca]           = useState('')

  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde   = corEtapa('green', dark)

  const filtrados = useMemo(() => {
    let arr = filtrarPorPeriodo(itens, periodo, 'data')
    if (statusFilt !== 'todos') arr = arr.filter(m => m.tipo === statusFilt)
    if (busca.trim()) {
      const q = busca.trim().toLowerCase()
      arr = arr.filter(m =>
        m.descricao.toLowerCase().includes(q) ||
        (m.categoria || '').toLowerCase().includes(q)
      )
    }
    return [...arr].sort((a, b) => (b.data || '').localeCompare(a.data || ''))
  }, [itens, periodo, statusFilt, busca])

  const comSaldo = useMemo(() => {
    const asc = [...filtrados].reverse()
    let acc = 0
    const map = new Map()
    asc.forEach(m => {
      acc += m.tipo === 'receita' ? m.valor : -m.valor
      map.set(m.id, acc)
    })
    return filtrados.map(m => ({ ...m, saldo: map.get(m.id) }))
  }, [filtrados])

  const totalReceitas = filtrados.filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0)
  const totalDespesas = filtrados.filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0)
  const saldo = totalReceitas - totalDespesas

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <FiltrosMobile T={T} dark={dark} tipo="caixa"
        periodo={periodo} setPeriodo={setPeriodo}
        statusFilt={statusFilt} setStatusFilt={setStatusFilt}
        busca={busca} setBusca={setBusca}
      />

      <KpiGrid T={T} dark={dark} kpis={[
        { label: 'Saldo',      valor: fmtBRL(saldo),         cor: saldo >= 0 ? corHero(dark) : vermelho, icon: saldo >= 0 ? 'ti-trending-up' : 'ti-trending-down', iconCor: saldo >= 0 ? verde : vermelho },
        { label: 'Entradas',   valor: fmtBRL(totalReceitas),  cor: azul,   icon: 'ti-arrow-down-circle', iconCor: azul },
        { label: 'Saídas',     valor: fmtBRL(totalDespesas),  cor: amarelo, icon: 'ti-arrow-up-circle',  iconCor: amarelo },
        { label: 'Movimentos', valor: filtrados.length,        cor: corHero(dark), icon: 'ti-arrows-exchange', iconCor: T.textMuted },
      ]} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: T.cardAlt, border: `1px solid ${T.border}`,
        fontSize: 11.5, color: T.textMuted,
      }}>
        <i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" />
        Movimentações confirmadas — somente leitura.
      </div>

      {comSaldo.length === 0 ? (
        <EmptyState T={T} icon="ti-search-off"
          title="Sem movimentações"
          description="Ajuste os filtros ou o período."
          compact height="auto"
        />
      ) : (
        comSaldo.map(m => {
          const ehReceita = m.tipo === 'receita'
          const corT  = ehReceita ? azul : amarelo
          const icone = ehReceita ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'
          return (
            <div key={m.id}
              onClick={() => onAbrir(m)}
              role="button"
              tabIndex={0}
              style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: '12px 14px',
                display: 'flex', gap: 12, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                background: bgEtapa(ehReceita ? 'blue' : 'yellow', dark),
                border: `1px solid ${corT}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ${icone}`} style={{ fontSize: 16, color: corT }} aria-hidden="true" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: corHero(dark),
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{m.descricao}</div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3, display: 'flex', gap: 5 }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtPrazoCurto(m.data)}</span>
                  {m.forma && <span>· {m.forma}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: corT, fontVariantNumeric: 'tabular-nums' }}>
                  {ehReceita ? '+' : '−'} {fmtBRL(m.valor)}
                </span>
                <span style={{
                  fontSize: 10.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                  color: m.saldo >= 0 ? corHero(dark) : vermelho,
                }}>
                  saldo {fmtBRL(m.saldo)}
                </span>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function FinanceiroMobile({ T, dark }) {
  const notify = useToast()
  const [aba, setAba]                   = useState('visao')
  const [receber, setReceber]           = useState([])
  const [pagar, setPagar]               = useState([])
  const [caixa, setCaixa]               = useState([])
  const [selecionado, setSelecionado]   = useState(null)
  const [novoLancTipo, setNovoLancTipo] = useState(null)

  const {
    lancamentos: lancsReal, contas: contasReais,
    loading: loadingHook, tabelaAusente,
    criar: criarLanc, atualizar: atualizarLanc,
    darBaixa, excluir: excluirReal, refetch,
  } = useFinanceiro()
  const usandoBanco = !tabelaAusente

  useEffect(() => {
    if (loadingHook) return
    const reais = lancsReal.map(adaptarBancoParaUI)
    setReceber(reais.filter(r => r.tipo === 'receita' && r.status !== 'pago'))
    setPagar(reais.filter(r => r.tipo === 'despesa' && r.status !== 'pago'))
    setCaixa(reais.filter(r => r.status === 'pago').map(r => ({ ...r, data: r.dataPag || r.vencimento })))
  }, [lancsReal, loadingHook])

  // KPIs globais
  const recebidoMes  = caixa.filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0)
  const pagoMes      = caixa.filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0)
  const saldoCaixa   = recebidoMes - pagoMes
  const totalReceber = receber.reduce((s, r) => s + r.valor, 0)
  const totalPagar   = pagar.reduce((s, p) => s + p.valor, 0)
  const vencidos     = receber.filter(r => statusVencimento(r.vencimento).tipo === 'vencido')
  const totalVencido = vencidos.reduce((s, r) => s + r.valor, 0)
  const pctMeta      = Math.min(100, Math.round((recebidoMes / META_MES) * 100))
  const faltaMeta    = Math.max(0, META_MES - recebidoMes)

  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const cor     = (d, c) => dark ? d : c

  // ─── Ações ──────────────────────────────────────────────────────────────────
  async function baixarReceber(item) {
    if (usandoBanco) {
      const { error } = await darBaixa(item.id, { forma_pagamento: item.forma_enum || mapearFormaUIparaEnum(item.forma), taxa_pct: item.taxa_pct || 0 })
      if (error) { notify('erro', `Não foi possível baixar: ${error.message}`); return }
      notify('ok', `Recebimento de ${fmtBRL(item.valor)} confirmado`)
      setSelecionado(null); return
    }
    setReceber(prev => prev.filter(r => r.id !== item.id))
    setCaixa(prev => [{ ...item, status: 'pago', dataPag: isoHoje(), data: isoHoje() }, ...prev])
    notify('ok', `Recebimento de ${fmtBRL(item.valor)} confirmado`)
    setSelecionado(null)
  }

  async function baixarPagar(item) {
    if (usandoBanco) {
      const { error } = await darBaixa(item.id, { forma_pagamento: item.forma_enum || mapearFormaUIparaEnum(item.forma), taxa_pct: item.taxa_pct || 0 })
      if (error) { notify('erro', `Não foi possível pagar: ${error.message}`); return }
      notify('ok', `Pagamento de ${fmtBRL(item.valor)} registrado`)
      setSelecionado(null); return
    }
    setPagar(prev => prev.filter(p => p.id !== item.id))
    setCaixa(prev => [{ ...item, tipo: 'despesa', status: 'pago', dataPag: isoHoje(), data: isoHoje() }, ...prev])
    notify('ok', `Pagamento de ${fmtBRL(item.valor)} registrado`)
    setSelecionado(null)
  }

  async function excluirLancamento(item, tipo) {
    if (usandoBanco) {
      const { error } = await excluirReal(item.id)
      if (error) { notify('erro', `Não foi possível excluir: ${error.message}`); return }
    } else {
      if (tipo === 'receber') setReceber(prev => prev.filter(r => r.id !== item.id))
      else if (tipo === 'pagar') setPagar(prev => prev.filter(p => p.id !== item.id))
      else setCaixa(prev => prev.filter(m => m.id !== item.id))
    }
    notify('ok', 'Lançamento excluído')
    setSelecionado(null)
  }

  // ─── Abas ───────────────────────────────────────────────────────────────────
  const ABAS = [
    { id: 'visao',   label: 'Visão geral', icon: 'ti-layout-dashboard' },
    { id: 'receber', label: 'A receber',   icon: 'ti-arrow-down-circle', count: receber.length },
    { id: 'pagar',   label: 'A pagar',     icon: 'ti-arrow-up-circle',   count: pagar.length },
    { id: 'caixa',   label: 'Caixa',       icon: 'ti-cash-banknote' },
  ]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      padding: '14px 14px 80px', gap: 12,
      overflowY: 'auto', background: T.bg,
    }}>
      {/* ── KPIs (titulo "Financeiro" ja esta na topbar) ────────────────── */}
      <div>
        {/* KPI strip 3 colunas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
          {[
            { label: 'Saldo caixa', valor: fmtBRL(saldoCaixa), cor: corHero(dark) },
            { label: 'A receber',   valor: fmtBRL(totalReceber), cor: azul },
            { label: 'A pagar',     valor: fmtBRL(totalPagar),   cor: amarelo },
          ].map((k, i) => (
            <div key={i} style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: '10px 10px',
            }}>
              <div style={{
                fontSize: 9.5, color: T.textMuted, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3,
              }}>
                {k.label}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: k.cor, fontVariantNumeric: 'tabular-nums' }}>
                {k.valor}
              </div>
            </div>
          ))}
        </div>

        {/* Badge de vencidos */}
        {vencidos.length > 0 && (
          <div style={{
            marginTop: 8, padding: '6px 10px', borderRadius: 8,
            background: bgEtapa('red', dark), border: `1px solid ${vermelho}44`,
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11.5, color: vermelho, fontWeight: 700,
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 13 }} aria-hidden="true" />
            {vencidos.length} vencido{vencidos.length > 1 ? 's' : ''}
            <span style={{ fontWeight: 500, color: T.textMuted }}>· {fmtBRL(totalVencido)}</span>
          </div>
        )}
      </div>

      {/* Banner demo */}
      {tabelaAusente && (
        <div style={{
          background: bgEtapa('yellow', dark), border: `1px solid ${amarelo}44`,
          borderRadius: 10, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <i className="ti ti-database-off" style={{ fontSize: 16, color: amarelo, flexShrink: 0 }} aria-hidden="true" />
          <div style={{ fontSize: 11.5, color: T.textSecondary, lineHeight: 1.5 }}>
            <strong style={{ color: corHero(dark) }}>Modo demo</strong> — dados reais chegam após aplicar{' '}
            <code style={{ fontSize: 10.5 }}>sql/01-lancamento-financeiro.sql</code> no Supabase.
          </div>
        </div>
      )}

      {/* ── Abas — segmented Atlassian + botao Novo ──────────────────────── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          flex: 1, minWidth: 0,
          display: 'flex',
          background: dark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
          borderRadius: 3, padding: 2, gap: 0,
        }}>
          {ABAS.map(a => {
            const ativo = a.id === aba
            return (
              <button key={a.id} onClick={() => setAba(a.id)}
                style={{
                  flex: 1, minWidth: 0, minHeight: 30,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '4px 6px',
                  borderRadius: 3, border: 'none',
                  background: ativo ? (dark ? '#22272B' : '#FFFFFF') : 'transparent',
                  color: ativo ? T.textPrimary : T.textMuted,
                  fontSize: 12, fontWeight: ativo ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  letterSpacing: '-0.005em',
                  boxShadow: ativo
                    ? (dark
                        ? '0 1px 2px rgba(0,0,0,.4)'
                        : '0 1px 2px rgba(9,30,66,0.18)')
                    : 'none',
                  transition: 'background .12s, box-shadow .12s',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.label}
                </span>
                {a.count != null && a.count > 0 && (
                  <span style={{
                    background: ativo
                      ? (dark ? 'rgba(255,255,255,0.10)' : '#DFE1E6')
                      : 'transparent',
                    color: ativo ? T.textPrimary : T.textMuted,
                    fontSize: 10.5, fontWeight: 700, padding: '1px 6px',
                    borderRadius: 99, minWidth: 16, textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    flexShrink: 0,
                  }}>{a.count}</span>
                )}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={() => setNovoLancTipo(aba === 'pagar' ? 'despesa' : 'receita')}
          aria-label="Novo lançamento"
          style={{
            width: 34, height: 34, borderRadius: 3,
            border: 'none', background: azul, color: '#fff',
            cursor: 'pointer', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
            WebkitTapHighlightColor: 'transparent',
          }}>
          <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
        </button>
      </div>

      {/* ── Conteúdo da aba ───────────────────────────────────────────────── */}
      {aba === 'visao' && (
        <VisaoGeralMobile T={T} dark={dark}
          recebidoMes={recebidoMes} pagoMes={pagoMes} saldoCaixa={saldoCaixa}
          pctMeta={pctMeta} faltaMeta={faltaMeta} meta={META_MES}
          vencidos={vencidos} totalVencido={totalVencido}
          totalReceber={totalReceber} totalPagar={totalPagar}
          onIrParaReceber={() => setAba('receber')}
        />
      )}

      {aba === 'receber' && (
        <ListaMobile T={T} dark={dark}
          itens={receber} tipo="receber"
          onAbrir={item => setSelecionado({ tipo: 'receber', item })}
          onBaixar={baixarReceber}
        />
      )}

      {aba === 'pagar' && (
        <ListaMobile T={T} dark={dark}
          itens={pagar} tipo="pagar"
          onAbrir={item => setSelecionado({ tipo: 'pagar', item })}
          onBaixar={baixarPagar}
        />
      )}

      {aba === 'caixa' && (
        <CaixaMobile T={T} dark={dark}
          itens={caixa}
          onAbrir={item => setSelecionado({ tipo: 'caixa', item })}
        />
      )}

      {/* ── Modais reutilizados do desktop ────────────────────────────────── */}
      {selecionado && (
        <LancamentoDetalheModal T={T} dark={dark}
          lancamento={selecionado.item} tipo={selecionado.tipo}
          contas={contasReais}
          onClose={() => setSelecionado(null)}
          onBaixar={item => {
            if (selecionado.tipo === 'receber') baixarReceber(item)
            else if (selecionado.tipo === 'pagar') baixarPagar(item)
          }}
          onSalvarEdicao={async (id, patch) => {
            const res = await atualizarLanc(id, patch)
            if (!res.error) { await refetch(); setSelecionado(null) }
            return res
          }}
          onExcluir={item => excluirLancamento(item, selecionado.tipo)}
        />
      )}

      {novoLancTipo && (
        <NovoLancamentoModal T={T} dark={dark}
          tipoInicial={novoLancTipo}
          contas={contasReais}
          onCriar={async payload => {
            const res = await criarLanc(payload)
            if (!res.error) await refetch()
            return res
          }}
          onClose={() => setNovoLancTipo(null)}
        />
      )}
    </div>
  )
}
