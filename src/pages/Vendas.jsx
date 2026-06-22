// src/pages/Vendas.jsx
// Layout: flex-column + header sticky 2 linhas (icon+KPIs | filtros dropdown) + tabela scroll.
// Filtros: dropdown multi-select com checkbox visual — neutro = sem filtro, ativo = azul + ×.

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { corEtapa, corHero } from '../utils/colors'
import { fmtBRL, semAcento } from '../utils/fmt'
import { TIPOS_OS, ETAPAS_TODOS } from '../utils/osData'
import { Badge, useToast } from '../components/ui'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'
import NovaOSAntigaModal from '../components/vendas/NovaOSAntigaModal'

// ─── Período ─────────────────────────────────────────────────────────────────
const PERIODOS = [
  { id: '7d',          label: 'Últimos 7 dias',  dias: 7 },
  { id: '30d',         label: 'Últimos 30 dias', dias: 30 },
  { id: 'mes',         label: 'Mês atual',        mes: true },
  { id: 'mes_passado', label: 'Mês passado',      mesPassado: true },
  { id: 'ano',         label: 'Este ano',         ano: true },
  { id: 'todos',       label: 'Todos',            all: true },
]

function rangeDoPeriodo(periodo) {
  const hoje = new Date()
  const toIso = d => d.toISOString().slice(0, 10)
  if (periodo.id === 'todos') return { ini: null, fim: null }
  if (periodo.id === 'custom') return { ini: periodo.de || null, fim: periodo.ate || null }
  const cfg = PERIODOS.find(p => p.id === periodo.id) || PERIODOS[2]
  if (cfg.dias) {
    const ini = new Date(hoje); ini.setDate(ini.getDate() - cfg.dias)
    return { ini: toIso(ini), fim: toIso(hoje) }
  }
  if (cfg.mes) return { ini: toIso(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim: toIso(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)) }
  if (cfg.mesPassado) return { ini: toIso(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)), fim: toIso(new Date(hoje.getFullYear(), hoje.getMonth(), 0)) }
  if (cfg.ano) return { ini: toIso(new Date(hoje.getFullYear(), 0, 1)), fim: toIso(new Date(hoje.getFullYear(), 11, 31)) }
  return { ini: null, fim: null }
}

function labelPeriodo(periodo) {
  if (periodo.id === 'custom') {
    const fmt = iso => iso ? iso.split('-').reverse().join('/') : '?'
    return `${fmt(periodo.de)} → ${fmt(periodo.ate)}`
  }
  return (PERIODOS.find(p => p.id === periodo.id) || PERIODOS[2]).label
}

// ─── Opções de filtro ─────────────────────────────────────────────────────────
const OPTS_TIPO = [
  { id: 'atendimento', label: 'Atendimento' },
  { id: 'fabricacao',  label: 'Fabricação'  },
  { id: 'venda',       label: 'Venda'       },
]
const OPTS_STATUS = [
  { id: 'concluido', label: 'Concluídas'   },
  { id: 'recusado',  label: 'Recusadas'    },
  { id: 'aberto',    label: 'Em andamento' },
]
const OPTS_PAGTO = [
  { id: 'total',   label: 'Pago'     },
  { id: 'parcial', label: 'Parcial'  },
  { id: 'nao',     label: 'Não pago' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function labelPagto(os) {
  if (os.pago === 'total') return 'Pago'
  if (os.pago === 'parcial') return 'Parcial'
  return 'Não pago'
}
function corPagto(os, dark) {
  if (os.pago === 'total')   return corEtapa('green', dark)
  if (os.pago === 'parcial') return corEtapa('yellow', dark)
  return corEtapa('red', dark)
}

function dataCompetenciaIso(os) {
  const hist = Array.isArray(os.historico) ? os.historico : []
  const isEntrega = et => et === 'entrega' || et === 'entregue'
  for (let i = hist.length - 1; i >= 1; i--) {
    if (isEntrega(hist[i - 1]?.etapa) && !isEntrega(hist[i]?.etapa)) {
      const d = hist[i].data
      if (d) return String(d).slice(0, 10)
    }
  }
  const ehFechada = os.etapa === 'concluido' || os.etapa === 'recusado'
  if (ehFechada && os.data_conclusao) return String(os.data_conclusao).slice(0, 10)
  return (os.abertura || '').slice(0, 10)
}

function fmtDataBR(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Sub-componentes do header ────────────────────────────────────────────────
function StatBadge({ v, label, color, dot }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, fontSize: 12 }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', alignSelf: 'center', flexShrink: 0 }} />}
      <span style={{ fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{v}</span>
      <span style={{ color, opacity: 0.75 }}>{label}</span>
    </span>
  )
}

function HdrDivider({ T, dark }) {
  return <div style={{ width: 1, height: 16, flexShrink: 0, background: dark ? 'rgba(255,255,255,0.12)' : T.border, alignSelf: 'center' }} />
}

// ─── FilterDropdown ──────────────────────────────────────────────────────────
// Seleção múltipla estilo Jira: Set vazio = sem filtro (mostra tudo).
// Neutro: botão cinza com label genérico.
// Ativo: botão azul com labels das seleções + × pra limpar sem abrir.
function FilterDropdown({ T, dark, azul, label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const isFiltered = selected.size > 0

  // Label do botão
  const btnLabel = !isFiltered
    ? label
    : options.filter(o => selected.has(o.id)).map(o => o.label).join(' · ')

  function toggle(id) {
    onChange(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function clearFilter(e) {
    e.stopPropagation()
    onChange(new Set())
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '0 10px', height: 30, borderRadius: 4,
          border: `1px solid ${isFiltered ? azul + '88' : T.border}`,
          background: isFiltered
            ? (dark ? azul + '22' : '#e8f0fb')
            : (dark ? 'rgba(255,255,255,0.04)' : '#fff'),
          color: isFiltered ? azul : T.textSecondary,
          fontSize: 12.5, fontWeight: isFiltered ? 600 : 500,
          cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          maxWidth: 220, transition: 'all .12s',
        }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
          {btnLabel}
        </span>
        {isFiltered ? (
          <span
            onClick={clearFilter}
            title={`Limpar filtro ${label}`}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 15, height: 15, borderRadius: '50%',
              background: azul, color: '#fff',
              fontSize: 9, flexShrink: 0, cursor: 'pointer',
              marginLeft: -2,
            }}>
            <i className="ti ti-x" style={{ fontSize: 9 }} aria-hidden="true" />
          </span>
        ) : (
          <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }} aria-hidden="true" />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
          minWidth: 170,
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 4,
          boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(9,30,66,0.14)',
          padding: 6,
        }}>
          {/* Todos — limpa o filtro */}
          <button
            onClick={() => { onChange(new Set()); setOpen(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: '5px 6px 8px', marginBottom: 4,
              borderBottom: `1px solid ${T.border}`,
              border: 'none', background: 'transparent',
              color: !isFiltered ? azul : T.textMuted,
              fontSize: 12.5, fontWeight: !isFiltered ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            <span style={{
              width: 14, height: 14, borderRadius: 3, flexShrink: 0,
              border: `1.5px solid ${!isFiltered ? azul : T.border}`,
              background: !isFiltered ? azul : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {!isFiltered && <i className="ti ti-check" style={{ fontSize: 9, color: '#fff' }} aria-hidden="true" />}
            </span>
            Todos
          </button>

          {/* Opções individuais */}
          {options.map(o => {
            const checked = selected.has(o.id)
            return (
              <button key={o.id}
                onClick={() => toggle(o.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '6px 6px', borderRadius: 3,
                  border: 'none',
                  background: checked ? (dark ? azul + '18' : '#e8f0fb') : 'transparent',
                  color: checked ? azul : T.textSecondary,
                  fontSize: 12.5, fontWeight: checked ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background .1s',
                }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${checked ? azul : T.border}`,
                  background: checked ? azul : 'transparent',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked && <i className="ti ti-check" style={{ fontSize: 9, color: '#fff' }} aria-hidden="true" />}
                </span>
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Vendas({ T, dark, user }) {
  const notify  = useToast()
  const azul    = corEtapa('blue', dark)
  const azulBg  = dark ? 'rgba(91,155,213,0.15)' : '#e8f0fb'
  const amarelo = corEtapa('yellow', dark)
  const verde   = corEtapa('green', dark)

  // ─── Estado dos filtros ──────────────────────────────────────────────────────
  // Set vazio = sem filtro (mostra tudo). Non-empty = mostra só os selecionados.
  const [periodo, setPeriodo]             = useState({ id: 'mes' })
  const [periodoAberto, setPeriodoAberto] = useState(false)
  const periodoRef                        = useRef(null)
  const [tiposSel, setTiposSel]           = useState(new Set())
  const [statusSel, setStatusSel]         = useState(new Set())
  const [pagtoSel, setPagtoSel]           = useState(new Set())
  const [busca, setBusca]                 = useState('')
  const [novaOSAntigaAberta, setNovaOSAntigaAberta] = useState(false)

  useEffect(() => {
    if (!periodoAberto) return
    function handler(e) {
      if (periodoRef.current && !periodoRef.current.contains(e.target)) setPeriodoAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [periodoAberto])

  const { abrirOSPorId, modalProps: osDetalheProps, osList, osLoading: loading, osRefetch } =
    useOSDetalheModal({ notify, buscando: true })

  const [ordemCol, setOrdemCol] = useState('numero')
  const [ordemDir, setOrdemDir] = useState('desc')

  // ─── Filtragem ───────────────────────────────────────────────────────────────
  const range = useMemo(() => rangeDoPeriodo(periodo), [periodo])

  const filtradas = useMemo(() => {
    let r = osList

    if (range.ini || range.fim) {
      r = r.filter(os => {
        const refIso = dataCompetenciaIso(os)
        if (!refIso) return false
        if (range.ini && refIso < range.ini) return false
        if (range.fim && refIso > range.fim) return false
        return true
      })
    }

    // Set vazio = sem filtro
    if (tiposSel.size > 0)  r = r.filter(os => tiposSel.has(os.tipo))

    if (statusSel.size > 0) {
      r = r.filter(os => {
        const c = os.etapa === 'concluido', re = os.etapa === 'recusado'
        const key = c ? 'concluido' : re ? 'recusado' : 'aberto'
        return statusSel.has(key)
      })
    }

    if (pagtoSel.size > 0) r = r.filter(os => pagtoSel.has(os.pago || 'nao'))

    const termo = semAcento((busca || '').trim())
    if (termo) {
      r = r.filter(os =>
        String(os.numero || '').includes(termo) ||
        semAcento(os.cliente).includes(termo) ||
        semAcento(os.fone).includes(termo) ||
        semAcento(os.marca).includes(termo) ||
        semAcento(os.modelo).includes(termo)
      )
    }

    return [...r].sort((a, b) => {
      let va = a[ordemCol], vb = b[ordemCol]
      if (ordemCol === 'numero' || ordemCol === 'valor') { va = Number(va) || 0; vb = Number(vb) || 0 }
      else if (ordemCol === 'abertura') { va = dataCompetenciaIso(a) || ''; vb = dataCompetenciaIso(b) || '' }
      else { va = (va || '').toString().toLowerCase(); vb = (vb || '').toString().toLowerCase() }
      if (va < vb) return ordemDir === 'asc' ? -1 : 1
      if (va > vb) return ordemDir === 'asc' ? 1 : -1
      return 0
    })
  }, [osList, range, tiposSel, statusSel, pagtoSel, busca, ordemCol, ordemDir])

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let faturado = 0, pendente = 0, qtdConcluidas = 0
    for (const os of filtradas) {
      const valor = (Number(os.valor) || 0) - (Number(os.desconto) || 0)
      if (os.etapa === 'concluido') { faturado += valor; qtdConcluidas++ }
      if (os.pago !== 'total' && os.etapa !== 'recusado') pendente += valor - (Number(os.valor_pago) || 0)
    }
    return { faturado, total: filtradas.length, ticket: qtdConcluidas > 0 ? faturado / qtdConcluidas : 0, pendente }
  }, [filtradas])

  function ordenarPor(col) {
    if (col === ordemCol) setOrdemDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setOrdemCol(col); setOrdemDir(col === 'numero' || col === 'abertura' ? 'desc' : 'asc') }
  }

  const temFiltroAtivo = tiposSel.size > 0 || statusSel.size > 0 || pagtoSel.size > 0 || busca.trim()

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1,
      minHeight: 0, overflow: 'hidden', background: T.bg,
    }}>

      {/* ══════════════════════════════════════════════════
          PAGE HEADER
      ══════════════════════════════════════════════════ */}
      <div style={{
        padding: '18px 22px 0',
        borderBottom: `1px solid ${T.border}`,
        background: T.bg, flexShrink: 0,
      }}>

        {/* Linha 1: icon + h1 + KPIs | "Nova OS antiga" */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: azulBg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className="ti ti-chart-bar" style={{ fontSize: 16, color: azul }} aria-hidden="true" />
            </div>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700, color: T.textPrimary, margin: 0, letterSpacing: '-0.025em', lineHeight: 1.2 }}>
                Vendas
              </h1>
              <div style={{ display: 'flex', gap: 10, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
                {loading ? (
                  <span style={{ fontSize: 11.5, color: T.textDim }}>Carregando…</span>
                ) : (
                  <>
                    <StatBadge v={fmtBRL(kpis.faturado)} label="faturado" color={verde} />
                    <StatBadge v={kpis.total} label="OS" color={azul} />
                    {kpis.ticket > 0 && <StatBadge v={fmtBRL(kpis.ticket)} label="ticket médio" color={T.textSecondary} />}
                    {kpis.pendente > 0 && <StatBadge v={fmtBRL(kpis.pendente)} label="a receber" color={amarelo} dot />}
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setNovaOSAntigaAberta(true)}
            style={{
              padding: '7px 16px', borderRadius: 4,
              background: azul, color: '#fff', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit', flexShrink: 0,
              boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,.15)',
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter = 'none'}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" />
            Nova OS antiga
          </button>
        </div>

        {/* Linha 2: filtros inline */}
        <div style={{
          display: 'flex', alignItems: 'center',
          gap: 6, paddingBottom: 10, flexWrap: 'wrap',
        }}>

          {/* Período */}
          <div ref={periodoRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setPeriodoAberto(o => !o)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0 10px', height: 30, borderRadius: 4,
                border: `1px solid ${T.border}`,
                background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
                color: T.textSecondary,
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <i className="ti ti-calendar" style={{ fontSize: 13, color: azul }} aria-hidden="true" />
              {labelPeriodo(periodo)}
              <i className={`ti ti-chevron-${periodoAberto ? 'up' : 'down'}`}
                style={{ fontSize: 11, opacity: 0.6 }} aria-hidden="true" />
            </button>

            {periodoAberto && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 200,
                minWidth: 200,
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 4,
                boxShadow: dark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(9,30,66,0.14)',
                padding: 6,
              }}>
                {PERIODOS.map(p => {
                  const ativo = periodo.id === p.id
                  return (
                    <button key={p.id}
                      onClick={() => { setPeriodo({ id: p.id }); setPeriodoAberto(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '7px 10px', borderRadius: 3, border: 'none',
                        background: ativo ? (dark ? '#0d2035' : '#e6f1fb') : 'transparent',
                        color: ativo ? azul : T.textSecondary,
                        fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      {ativo
                        ? <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" />
                        : <span style={{ width: 13 }} />}
                      {p.label}
                    </button>
                  )
                })}
                <div style={{ height: 1, background: T.border, margin: '4px' }} />
                <div style={{ padding: '3px 8px', fontSize: 10, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Personalizado
                </div>
                <div style={{ display: 'flex', gap: 5, padding: '4px 6px 6px' }}>
                  <input type="date" value={periodo.de || ''}
                    onChange={e => setPeriodo({ id: 'custom', de: e.target.value, ate: periodo.ate })}
                    style={inputDateStyle(T, dark)} />
                  <input type="date" value={periodo.ate || ''}
                    onChange={e => setPeriodo({ id: 'custom', de: periodo.de, ate: e.target.value })}
                    style={inputDateStyle(T, dark)} />
                </div>
              </div>
            )}
          </div>

          <HdrDivider T={T} dark={dark} />

          {/* Dropdowns de filtro */}
          <FilterDropdown T={T} dark={dark} azul={azul}
            label="Tipo" options={OPTS_TIPO}
            selected={tiposSel} onChange={setTiposSel} />

          <FilterDropdown T={T} dark={dark} azul={azul}
            label="Status" options={OPTS_STATUS}
            selected={statusSel} onChange={setStatusSel} />

          <FilterDropdown T={T} dark={dark} azul={azul}
            label="Pagto" options={OPTS_PAGTO}
            selected={pagtoSel} onChange={setPagtoSel} />

          <HdrDivider T={T} dark={dark} />

          {/* Busca */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
            <i className="ti ti-search" style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              fontSize: 12, color: T.textDim, pointerEvents: 'none',
            }} aria-hidden="true" />
            <input
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Cliente, nº OS, equipamento…"
              style={{
                width: '100%', boxSizing: 'border-box', height: 30,
                paddingLeft: 27, paddingRight: busca ? 26 : 8,
                borderRadius: 4, border: `1px solid ${busca ? azul + '88' : T.border}`,
                background: dark ? 'rgba(255,255,255,0.04)' : '#fff',
                color: T.textPrimary, fontSize: 12.5,
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color .12s',
              }}
              onFocus={e => e.target.style.borderColor = azul}
              onBlur={e => e.target.style.borderColor = busca ? azul + '88' : T.border}
            />
            {busca && (
              <button onClick={() => setBusca('')} aria-label="Limpar busca"
                style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: T.textDim, padding: 2, display: 'flex' }}>
                <i className="ti ti-x" style={{ fontSize: 11 }} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Limpar todos os filtros */}
          {temFiltroAtivo && (
            <button
              onClick={() => { setTiposSel(new Set()); setStatusSel(new Set()); setPagtoSel(new Set()); setBusca('') }}
              style={{
                height: 30, padding: '0 10px', borderRadius: 4,
                border: 'none', background: 'transparent',
                color: T.textMuted, fontSize: 12, cursor: 'pointer',
                fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4,
                transition: 'color .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = T.textPrimary}
              onMouseLeave={e => e.currentTarget.style.color = T.textMuted}>
              <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          CONTENT — tabela
      ══════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 24px', color: T.textMuted, fontSize: 13 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 20, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
            Carregando OS…
            <style>{`@keyframes spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {!loading && filtradas.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 24px', gap: 12, textAlign: 'center' }}>
            <i className="ti ti-search-off" style={{ fontSize: 40, color: T.textDim }} aria-hidden="true" />
            <div style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, letterSpacing: '-0.01em' }}>Nenhuma OS encontrada</div>
            <div style={{ fontSize: 13, color: T.textMuted, maxWidth: 320 }}>
              {temFiltroAtivo ? 'Tente ajustar ou limpar os filtros.' : 'Nenhuma OS no período selecionado.'}
            </div>
            {temFiltroAtivo && (
              <button
                onClick={() => { setTiposSel(new Set()); setStatusSel(new Set()); setPagtoSel(new Set()); setBusca('') }}
                style={{ padding: '6px 14px', borderRadius: 4, border: `1px solid ${T.border}`, background: 'transparent', color: T.textPrimary, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit' }}>
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {!loading && filtradas.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 12.5, fontFamily: 'inherit' }}>
              <thead>
                <tr style={{ background: dark ? 'rgba(255,255,255,0.03)' : '#F7F8F9', position: 'sticky', top: 0, zIndex: 1 }}>
                  <HeaderCell T={T} col="numero"   label="Nº"      curr={ordemCol} dir={ordemDir} onClick={ordenarPor} align="right" />
                  <HeaderCell T={T} col="abertura"  label="Data"    curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                  <HeaderCell T={T} col="cliente"   label="Cliente" curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                  <HeaderCell T={T} col="tipo"      label="Tipo"    curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                  <HeaderCell T={T} col="etapa"     label="Etapa"   curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                  <HeaderCell T={T} col="valor"     label="Valor"   curr={ordemCol} dir={ordemDir} onClick={ordenarPor} align="right" />
                  <HeaderCell T={T} col="pago"      label="Pagto"   curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                </tr>
              </thead>
              <tbody>
                {filtradas.map(os => (
                  <LinhaOS key={os.id} os={os} T={T} dark={dark}
                    onClick={() => abrirOSPorId(os.id)} />
                ))}
              </tbody>
            </table>

            <div style={{
              padding: '10px 22px',
              borderTop: `1px solid ${T.border}`,
              background: dark ? 'rgba(255,255,255,0.015)' : '#FAFBFC',
              fontSize: 11.5, color: T.textMuted, fontVariantNumeric: 'tabular-nums',
            }}>
              {filtradas.length} OS exibidas
              {filtradas.length !== osList.length && ` · ${osList.length} no total`}
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {novaOSAntigaAberta && (
        <NovaOSAntigaModal T={T} dark={dark}
          onClose={() => setNovaOSAntigaAberta(false)}
          onCriada={() => { setNovaOSAntigaAberta(false); osRefetch() }}
        />
      )}
      {osDetalheProps && <OSDetalhe T={T} dark={dark} {...osDetalheProps} />}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function HeaderCell({ T, col, label, curr, dir, onClick, align = 'left' }) {
  const ativo = curr === col
  return (
    <th onClick={() => onClick(col)}
      style={{
        padding: '9px 12px', textAlign: align,
        fontSize: 10.5, fontWeight: 700,
        color: ativo ? T.textPrimary : T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.4px',
        borderBottom: `1px solid ${T.border}`,
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
      }}>
      {label}
      {ativo && <i className={`ti ${dir === 'asc' ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 11, marginLeft: 3 }} aria-hidden="true" />}
    </th>
  )
}

function LinhaOS({ os, T, dark, onClick }) {
  const configTipo = TIPOS_OS[os.tipo]
  const corTipo    = corEtapa(configTipo?.cor || 'neutro', dark)
  const etapaInfo  = ETAPAS_TODOS.find(e => e.id === os.etapa)
  const corEt      = corEtapa(etapaInfo?.cor || 'neutro', dark)
  const cPag       = corPagto(os, dark)
  const valorLiq   = (Number(os.valor) || 0) - (Number(os.desconto) || 0)

  return (
    <tr onClick={onClick}
      style={{ cursor: 'pointer', transition: 'background .1s' }}
      onMouseEnter={e => e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : '#F7F8F9'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <td style={{ ...tdStyle(T), textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: corHero(dark) }}>
        #{os.numero}
      </td>
      <td style={{ ...tdStyle(T), color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        {fmtDataBR(dataCompetenciaIso(os))}
      </td>
      <td style={{ ...tdStyle(T), color: corHero(dark), fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
        {os.cliente || (os.tipo === 'fabricacao' ? 'Fabricação' : '—')}
      </td>
      <td style={tdStyle(T)}>
        <Badge dark={dark} color={corTipo} bg={`${corTipo}22`}>{configTipo?.label || os.tipo}</Badge>
      </td>
      <td style={tdStyle(T)}>
        <span style={{ fontSize: 11.5, color: corEt, fontWeight: 600 }}>{etapaInfo?.label || os.etapa}</span>
      </td>
      <td style={{ ...tdStyle(T), textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: corHero(dark) }}>
        {fmtBRL(valorLiq)}
      </td>
      <td style={tdStyle(T)}>
        <span style={{ fontSize: 11, fontWeight: 700, color: cPag, padding: '2px 8px', borderRadius: 10, background: `${cPag}15`, border: `1px solid ${cPag}33` }}>
          {labelPagto(os)}
        </span>
      </td>
    </tr>
  )
}

function inputDateStyle(T, dark) {
  return { padding: '5px 7px', fontSize: 12, borderRadius: 4, flex: 1, border: `1px solid ${T.border}`, background: T.card, color: T.textPrimary, fontFamily: 'inherit', outline: 'none', colorScheme: dark ? 'dark' : 'light' }
}

function tdStyle(T) {
  return { padding: '10px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 12.5, color: T.textPrimary, verticalAlign: 'middle' }
}
