// src/pages/mobile/VendasMobile.jsx
// Versão mobile-first da página Vendas.
// Reutiliza useOSDetalheModal + NovaOSAntigaModal sem modificações.
// Substitui tabela por cards touch-friendly, filtros em painel colapsável
// e abas horizontais com scroll por status.

import React, { useState, useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { TIPOS_OS, ETAPAS_TODOS } from '../../utils/osData'
import { Input, EmptyState, useToast } from '../../components/ui'
import { useOSDetalheModal } from '../../hooks/useOSDetalheModal'
import OSDetalhe from '../../components/osDetalhe/OSDetalhe'
import NovaOSAntigaModal from '../../components/vendas/NovaOSAntigaModal'

// ─── Períodos (mesmos do Vendas.jsx desktop) ──────────────────────────────────
const PERIODOS = [
  { id: '7d',          label: '7d',    dias: 7 },
  { id: '30d',         label: '30d',   dias: 30 },
  { id: 'mes',         label: 'Mês',   mes: true },
  { id: 'mes_passado', label: 'Mês ant.', mesPassado: true },
  { id: 'ano',         label: 'Ano',   ano: true },
  { id: 'todos',       label: 'Todos', all: true },
]

function rangeDoPeriodo(periodoId) {
  const hoje = new Date()
  const toIso = d => d.toISOString().slice(0, 10)
  if (periodoId === 'todos') return { ini: null, fim: null }
  const cfg = PERIODOS.find(p => p.id === periodoId) || PERIODOS[2]
  if (cfg.dias) {
    const ini = new Date(hoje); ini.setDate(ini.getDate() - cfg.dias)
    return { ini: toIso(ini), fim: toIso(hoje) }
  }
  if (cfg.mes) {
    return {
      ini: toIso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)),
      fim: toIso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
    }
  }
  if (cfg.mesPassado) {
    return {
      ini: toIso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)),
      fim: toIso(new Date(hoje.getFullYear(), hoje.getMonth(), 0)),
    }
  }
  if (cfg.ano) {
    return {
      ini: toIso(new Date(hoje.getFullYear(), 0, 1)),
      fim: toIso(new Date(hoje.getFullYear(), 11, 31)),
    }
  }
  return { ini: null, fim: null }
}

function fmtDataBR(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function labelPagto(os) {
  if (os.pago === 'total')   return 'Pago'
  if (os.pago === 'parcial') return 'Parcial'
  return 'Não pago'
}
function corPagto(os, dark) {
  if (os.pago === 'total')   return corEtapa('green', dark)
  if (os.pago === 'parcial') return corEtapa('yellow', dark)
  return corEtapa('red', dark)
}

const FILTROS_TIPO = [
  { id: 'atendimento', label: 'Atendimento' },
  { id: 'fabricacao',  label: 'Fabricação' },
  { id: 'venda',       label: 'Venda' },
]

const FILTROS_PAGAMENTO = [
  { id: 'total',   label: 'Pago' },
  { id: 'parcial', label: 'Parcial' },
  { id: 'nao',     label: 'Não pago' },
]

// ─── Abas de status ───────────────────────────────────────────────────────────
const ABAS_STATUS = [
  { id: 'todos',     label: 'Todos',        icon: 'ti-list' },
  { id: 'concluido', label: 'Concluídas',   icon: 'ti-circle-check' },
  { id: 'aberto',    label: 'Em andamento', icon: 'ti-clock' },
  { id: 'recusado',  label: 'Recusadas',    icon: 'ti-circle-x' },
]

// ─── KPI 2×2 grid ─────────────────────────────────────────────────────────────
function KpiGrid({ T, dark, kpis }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {kpis.map((k, i) => (
        <div key={i} style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 10, padding: '11px 13px',
        }}>
          <div style={{
            fontSize: 9.5, color: T.textMuted, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {k.icon && <i className={`ti ${k.icon}`} style={{ fontSize: 12, color: k.iconCor || T.textMuted }} aria-hidden="true" />}
            {k.label}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: k.cor, fontVariantNumeric: 'tabular-nums' }}>
            {k.valor}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Painel de filtros colapsável ─────────────────────────────────────────────
function FiltrosMobile({
  T, dark,
  periodo, setPeriodo,
  tiposAtivos, setTiposAtivos,
  pagamentosAtivos, setPagamentosAtivos,
  busca, setBusca,
}) {
  const [aberto, setAberto] = useState(false)
  const azul = corEtapa('blue', dark)
  const cor  = (d, c) => dark ? d : c

  const temFiltroAtivo =
    periodo !== 'mes' ||
    tiposAtivos.size < 3 ||
    pagamentosAtivos.size < 3 ||
    busca.trim()

  function toggleSet(set, id, setter) {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function limpar() {
    setPeriodo('mes')
    setTiposAtivos(new Set(['atendimento', 'fabricacao', 'venda']))
    setPagamentosAtivos(new Set(['total', 'parcial', 'nao']))
    setBusca('')
  }

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

          {/* Tipo */}
          <div>
            <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>
              Tipo
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTROS_TIPO.map(f => {
                const ativo = tiposAtivos.has(f.id)
                return (
                  <button key={f.id} onClick={() => toggleSet(tiposAtivos, f.id, setTiposAtivos)}
                    style={{
                      padding: '6px 13px', borderRadius: 8,
                      border: `1px solid ${ativo ? azul : T.border}`,
                      background: ativo ? cor('#0d2035', '#e6f1fb') : T.cardAlt,
                      color: ativo ? azul : T.textSecondary,
                      fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Pagamento */}
          <div>
            <div style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>
              Pagamento
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTROS_PAGAMENTO.map(f => {
                const ativo = pagamentosAtivos.has(f.id)
                return (
                  <button key={f.id} onClick={() => toggleSet(pagamentosAtivos, f.id, setPagamentosAtivos)}
                    style={{
                      padding: '6px 13px', borderRadius: 8,
                      border: `1px solid ${ativo ? azul : T.border}`,
                      background: ativo ? cor('#0d2035', '#e6f1fb') : T.cardAlt,
                      color: ativo ? azul : T.textSecondary,
                      fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                    {f.label}
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
              placeholder="Cliente, nº OS, telefone, equipamento…"
            />
          </div>

          {temFiltroAtivo && (
            <button
              onClick={limpar}
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

// ─── Card de OS mobile ────────────────────────────────────────────────────────
function OSCard({ T, dark, os, onClick }) {
  const configTipo  = TIPOS_OS[os.tipo]
  const corTipo     = corEtapa(configTipo?.cor || 'neutro', dark)
  const bgTipo      = bgEtapa(configTipo?.cor || 'neutro', dark)
  const etapaInfo   = ETAPAS_TODOS.find(e => e.id === os.etapa)
  const corEt       = corEtapa(etapaInfo?.cor || 'neutro', dark)
  const bgEt        = bgEtapa(etapaInfo?.cor || 'neutro', dark)
  const cPag        = corPagto(os, dark)
  const valorLiq    = (Number(os.valor) || 0) - (Number(os.desconto) || 0)

  const iconesTipo = {
    atendimento: 'ti-tool',
    fabricacao:  'ti-hammer',
    venda:       'ti-shopping-cart',
  }
  const icone = iconesTipo[os.tipo] || 'ti-file'

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 12, padding: '12px 14px',
        display: 'flex', gap: 12, cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Ícone tipo */}
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: bgTipo, border: `1px solid ${corTipo}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icone}`} style={{ fontSize: 18, color: corTipo }} aria-hidden="true" />
      </div>

      {/* Conteúdo central */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Linha 1: cliente + nº OS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700, color: corHero(dark),
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {os.cliente || (os.tipo === 'fabricacao' ? 'Fabricação' : '—')}
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: corHero(dark),
            fontVariantNumeric: 'tabular-nums', flexShrink: 0,
            opacity: 0.55,
          }}>
            #{os.numero}
          </span>
        </div>

        {/* Linha 2: data + tipo */}
        <div style={{
          fontSize: 11, color: T.textMuted, marginTop: 3,
          display: 'flex', gap: 6, alignItems: 'center',
        }}>
          <i className="ti ti-calendar" style={{ fontSize: 11 }} aria-hidden="true" />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtDataBR(os.abertura)}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ color: corTipo, fontWeight: 600 }}>{configTipo?.label || os.tipo}</span>
        </div>

        {/* Linha 3: etapa + pagamento */}
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
            background: bgEt, color: corEt,
          }}>
            {etapaInfo?.label || os.etapa}
          </span>
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 8,
            background: `${cPag}15`, color: cPag, border: `1px solid ${cPag}33`,
          }}>
            {labelPagto(os)}
          </span>
        </div>
      </div>

      {/* Valor */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-end', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 15, fontWeight: 800, color: corHero(dark),
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtBRL(valorLiq)}
        </span>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function VendasMobile({ T, dark, user }) {
  const notify = useToast()

  const {
    abrirOSPorId, modalProps: osDetalheProps,
    osList, osLoading: loading, osRefetch,
  } = useOSDetalheModal({ notify, buscando: true })

  // Filtros
  const [periodo, setPeriodo]               = useState('mes')
  const [abaStatus, setAbaStatus]           = useState('todos')
  const [tiposAtivos, setTiposAtivos]       = useState(new Set(['atendimento', 'fabricacao', 'venda']))
  const [pagamentosAtivos, setPagamentosAtivos] = useState(new Set(['total', 'parcial', 'nao']))
  const [busca, setBusca]                   = useState('')
  const [novaOSAberta, setNovaOSAberta]     = useState(false)

  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const cor     = (d, c) => dark ? d : c

  // ─── Range do período ────────────────────────────────────────────────────────
  const range = useMemo(() => rangeDoPeriodo(periodo), [periodo])

  // ─── Filtrar + ordenar OS ────────────────────────────────────────────────────
  const filtradas = useMemo(() => {
    let r = osList

    // Período
    if (range.ini || range.fim) {
      r = r.filter(os => {
        const dataRef = (os.abertura || '').slice(0, 10)
        if (!dataRef) return false
        if (range.ini && dataRef < range.ini) return false
        if (range.fim && dataRef > range.fim) return false
        return true
      })
    }

    // Tipo
    if (tiposAtivos.size < 3) {
      r = r.filter(os => tiposAtivos.has(os.tipo))
    }

    // Status (aba)
    if (abaStatus !== 'todos') {
      r = r.filter(os => {
        if (abaStatus === 'concluido') return os.etapa === 'concluido'
        if (abaStatus === 'recusado')  return os.etapa === 'recusado'
        if (abaStatus === 'aberto')    return os.etapa !== 'concluido' && os.etapa !== 'recusado'
        return true
      })
    }

    // Pagamento
    if (pagamentosAtivos.size < 3) {
      r = r.filter(os => pagamentosAtivos.has(os.pago || 'nao'))
    }

    // Busca
    const termo = (busca || '').trim().toLowerCase()
    if (termo) {
      r = r.filter(os =>
        String(os.numero || '').includes(termo) ||
        (os.cliente || '').toLowerCase().includes(termo) ||
        (os.fone    || '').toLowerCase().includes(termo) ||
        (os.marca   || '').toLowerCase().includes(termo) ||
        (os.modelo  || '').toLowerCase().includes(termo)
      )
    }

    return [...r].sort((a, b) => Number(b.numero || 0) - Number(a.numero || 0))
  }, [osList, range, tiposAtivos, abaStatus, pagamentosAtivos, busca])

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let faturado = 0, pendente = 0, qtdConcluidas = 0
    for (const os of filtradas) {
      const valor = (Number(os.valor) || 0) - (Number(os.desconto) || 0)
      if (os.etapa === 'concluido') { faturado += valor; qtdConcluidas++ }
      if (os.pago !== 'total' && os.etapa !== 'recusado') {
        pendente += valor - (Number(os.valor_pago) || 0)
      }
    }
    return {
      faturado,
      total: filtradas.length,
      ticket: qtdConcluidas > 0 ? faturado / qtdConcluidas : 0,
      pendente,
    }
  }, [filtradas])

  // Contagem por status para badge nas abas
  const contaPorStatus = useMemo(() => {
    const base = osList.filter(os => {
      if (!range.ini && !range.fim) return true
      const dataRef = (os.abertura || '').slice(0, 10)
      if (!dataRef) return false
      if (range.ini && dataRef < range.ini) return false
      if (range.fim && dataRef > range.fim) return false
      return true
    })
    return {
      todos:     base.length,
      concluido: base.filter(o => o.etapa === 'concluido').length,
      aberto:    base.filter(o => o.etapa !== 'concluido' && o.etapa !== 'recusado').length,
      recusado:  base.filter(o => o.etapa === 'recusado').length,
    }
  }, [osList, range])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      padding: '14px 14px 80px', gap: 12,
      overflowY: 'auto', background: T.bg,
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: corHero(dark), letterSpacing: '-0.01em' }}>
              Vendas
            </div>
            <div style={{ fontSize: 11.5, color: T.textMuted, marginTop: 2 }}>
              Histórico de ordens de serviço
            </div>
          </div>
          <button
            onClick={() => setNovaOSAberta(true)}
            style={{
              background: azul, color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 16px',
              fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 15 }} aria-hidden="true" />
            Nova
          </button>
        </div>

        {/* KPI 2×2 */}
        <KpiGrid T={T} dark={dark} kpis={[
          { label: 'Faturado',     valor: fmtBRL(kpis.faturado), cor: corHero(dark), icon: 'ti-cash-banknote',  iconCor: azul },
          { label: 'OS no período', valor: kpis.total,             cor: azul,          icon: 'ti-file-description', iconCor: azul },
          { label: 'Ticket médio', valor: fmtBRL(kpis.ticket),    cor: corHero(dark), icon: 'ti-chart-bar',      iconCor: azul },
          { label: 'A receber',    valor: fmtBRL(kpis.pendente),  cor: kpis.pendente > 0 ? amarelo : T.textDim, icon: 'ti-alert-circle', iconCor: kpis.pendente > 0 ? amarelo : T.textMuted },
        ]} />
      </div>

      {/* ── Abas de status (scroll horizontal) ────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2,
        scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {ABAS_STATUS.map(a => {
          const ativo = a.id === abaStatus
          const count = contaPorStatus[a.id] || 0
          return (
            <button key={a.id} onClick={() => setAbaStatus(a.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
                padding: '9px 14px', borderRadius: 10,
                border: `1px solid ${ativo ? azul : T.border}`,
                background: ativo ? cor('#0d2035', '#e6f1fb') : T.card,
                color: ativo ? azul : T.textMuted,
                fontWeight: ativo ? 700 : 500, fontSize: 13,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
              }}>
              <i className={`ti ${a.icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
              {a.label}
              {count > 0 && (
                <span style={{
                  background: ativo ? azul : T.cardAlt,
                  color: ativo ? '#fff' : T.textSecondary,
                  fontSize: 10.5, fontWeight: 700, padding: '1px 6px',
                  borderRadius: 10, minWidth: 18, textAlign: 'center',
                  fontVariantNumeric: 'tabular-nums',
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Filtros colapsáveis ────────────────────────────────────────────── */}
      <FiltrosMobile
        T={T} dark={dark}
        periodo={periodo} setPeriodo={setPeriodo}
        tiposAtivos={tiposAtivos} setTiposAtivos={setTiposAtivos}
        pagamentosAtivos={pagamentosAtivos} setPagamentosAtivos={setPagamentosAtivos}
        busca={busca} setBusca={setBusca}
      />

      {/* ── Contador de resultados ─────────────────────────────────────────── */}
      {!loading && (
        <div style={{
          fontSize: 11.5, color: T.textMuted,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 2px', fontVariantNumeric: 'tabular-nums',
        }}>
          <span>{filtradas.length} OS</span>
          <span style={{ fontWeight: 700, color: azul }}>{fmtBRL(kpis.faturado)} faturado</span>
        </div>
      )}

      {/* ── Lista ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{
          padding: '32px', textAlign: 'center', color: T.textMuted,
          fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
          Carregando OS…
        </div>
      ) : filtradas.length === 0 ? (
        <EmptyState T={T}
          icon="ti-search-off"
          title="Nenhuma OS encontrada"
          description="Ajuste os filtros ou o período."
          compact height="auto"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtradas.map(os => (
            <OSCard key={os.id} T={T} dark={dark} os={os}
              onClick={() => abrirOSPorId(os.id)} />
          ))}
        </div>
      )}

      {/* ── Modais ────────────────────────────────────────────────────────── */}
      {novaOSAberta && (
        <NovaOSAntigaModal T={T} dark={dark}
          onClose={() => setNovaOSAberta(false)}
          onCriada={() => { setNovaOSAberta(false); osRefetch() }}
        />
      )}

      {osDetalheProps && <OSDetalhe T={T} dark={dark} {...osDetalheProps} />}
    </div>
  )
}
