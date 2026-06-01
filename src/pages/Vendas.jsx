// src/pages/Vendas.jsx
// Histórico flat de TODAS as OS (sem o filtro de 24h do Kanban).
// Admin-only — funcionário não vê valores/totais.
//
// Layout (estilo Financeiro/Bling):
//   - PageHeader com KPI strip inline
//   - Barra de filtros horizontal (período + chips de tipo + chips de status
//     + busca cliente + chip pagamento)
//   - Tabela densa com colunas ordenáveis
//   - Click numa linha abre OSDetalhe via useOSDetalheModal
//
// Modal "Nova OS antiga" pra registro retroativo (~doaut de Toni — ver
// contexto-vendas.md).

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL } from '../utils/fmt'
import { TIPOS_OS, ETAPAS_TODOS } from '../utils/osData'
import {
  Card, Button, Badge, Input, PageHeader, EmptyState, ChipToggle, useToast,
} from '../components/ui'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'
import NovaOSAntigaModal from '../components/vendas/NovaOSAntigaModal'

// ─── Período (mesmo padrão do Financeiro) ───────────────────────────────────
// `periodo` é objeto: { id: 'mes' } | { id: 'custom', de, ate }
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

function labelPeriodo(periodo) {
  if (periodo.id === 'custom') {
    const fmt = (iso) => iso ? iso.split('-').reverse().join('/') : '?'
    return `${fmt(periodo.de)} → ${fmt(periodo.ate)}`
  }
  return (PERIODOS.find(p => p.id === periodo.id) || PERIODOS[2]).label
}

const FILTROS_TIPO = [
  { id: 'atendimento', label: 'Atendimento', cor: 'blue' },
  { id: 'fabricacao',  label: 'Fabricação',  cor: 'yellow' },
  { id: 'venda',       label: 'Venda',       cor: 'green' },
]

const FILTROS_STATUS = [
  { id: 'concluido', label: 'Concluídas', cor: 'green' },
  { id: 'recusado',  label: 'Recusadas',  cor: 'red' },
  { id: 'aberto',    label: 'Em andamento', cor: 'blue' }, // tudo que não é concluido/recusado
]

const FILTROS_PAGAMENTO = [
  { id: 'total',   label: 'Pago' },
  { id: 'parcial', label: 'Parcial' },
  { id: 'nao',     label: 'Não pago' },
]

// Status amigável de pagamento
function labelPagto(os) {
  if (os.pago === 'total') return 'Pago'
  if (os.pago === 'parcial') return 'Parcial'
  return 'Não pago'
}
function corPagto(os, dark) {
  if (os.pago === 'total') return corEtapa('green', dark)
  if (os.pago === 'parcial') return corEtapa('yellow', dark)
  return corEtapa('red', dark)
}

// Formata data ISO/timestamp → DD/MM/YYYY
function fmtDataBR(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function Vendas({ T, dark, user }) {
  const cor = (d, c) => dark ? d : c
  const notify = useToast()

  // useOSDetalheModal já chama useOS internamente — passamos buscando=true pra
  // bypassa filtro 24h (Vendas mostra tudo, não esconde concluídas antigas).
  // Reusa a mesma instância pra evitar 2 channels Realtime no mesmo nome.

  // ─── Filtros ──────────────────────────────────────────────────────────────
  const [periodo, setPeriodo] = useState({ id: 'mes' })
  const [periodoAberto, setPeriodoAberto] = useState(false)
  const periodoRef = useRef(null)
  const [tiposAtivos, setTiposAtivos] = useState(new Set(['atendimento', 'fabricacao', 'venda']))
  const [statusAtivos, setStatusAtivos] = useState(new Set(['concluido', 'recusado', 'aberto']))
  const [pagamentosAtivos, setPagamentosAtivos] = useState(new Set(['total', 'parcial', 'nao']))
  const [busca, setBusca] = useState('')

  // Click-fora fecha dropdown de período (mesmo padrão Financeiro)
  useEffect(() => {
    function handler(e) {
      if (periodoRef.current && !periodoRef.current.contains(e.target)) {
        setPeriodoAberto(false)
      }
    }
    if (periodoAberto) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [periodoAberto])

  // Modal nova OS antiga
  const [novaOSAntigaAberta, setNovaOSAntigaAberta] = useState(false)

  // OSDetalhe inline + lista de OS (buscando=true bypassa filtro 24h)
  const {
    abrirOSPorId, modalProps: osDetalheProps,
    osList, osLoading: loading, osRefetch,
  } = useOSDetalheModal({ notify, buscando: true })

  // Ordenação
  const [ordemCol, setOrdemCol] = useState('numero')
  const [ordemDir, setOrdemDir] = useState('desc') // 'asc' | 'desc'

  // ─── Cores ────────────────────────────────────────────────────────────────
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  // ─── Range do período (ISO date) ──────────────────────────────────────────
  const range = useMemo(() => rangeDoPeriodo(periodo), [periodo])

  // ─── Filtrar OS ────────────────────────────────────────────────────────────
  const filtradas = useMemo(() => {
    let r = osList

    // Período (regime de competencia): receita conta no mes da ENTREGA.
    //  - OS concluida/recusada: usa data_conclusao
    //  - OS aberta (ainda em andamento): usa criado_em (abertura)
    // Evita "venda fantasma": OS aberta em maio e entregue em junho aparece em junho.
    if (range.ini || range.fim) {
      r = r.filter(os => {
        const ehFechada = os.etapa === 'concluido' || os.etapa === 'recusado'
        const refIso = ehFechada && os.data_conclusao
          ? String(os.data_conclusao).slice(0, 10)
          : (os.abertura || '').slice(0, 10)
        if (!refIso) return false
        if (range.ini && refIso < range.ini) return false
        if (range.fim && refIso > range.fim) return false
        return true
      })
    }

    // Tipo
    if (tiposAtivos.size < 3) {
      r = r.filter(os => tiposAtivos.has(os.tipo))
    }

    // Status — concluído/recusado/aberto
    if (statusAtivos.size < 3) {
      r = r.filter(os => {
        const ehConcluido = os.etapa === 'concluido'
        const ehRecusado = os.etapa === 'recusado'
        if (ehConcluido && !statusAtivos.has('concluido')) return false
        if (ehRecusado && !statusAtivos.has('recusado')) return false
        if (!ehConcluido && !ehRecusado && !statusAtivos.has('aberto')) return false
        return true
      })
    }

    // Pagamento
    if (pagamentosAtivos.size < 3) {
      r = r.filter(os => pagamentosAtivos.has(os.pago || 'nao'))
    }

    // Busca livre (cliente / nº OS / telefone)
    const termo = (busca || '').trim().toLowerCase()
    if (termo) {
      r = r.filter(os =>
        String(os.numero || '').includes(termo) ||
        (os.cliente || '').toLowerCase().includes(termo) ||
        (os.fone || '').toLowerCase().includes(termo) ||
        (os.marca || '').toLowerCase().includes(termo) ||
        (os.modelo || '').toLowerCase().includes(termo)
      )
    }

    // Ordenação
    const sorted = [...r].sort((a, b) => {
      let va = a[ordemCol], vb = b[ordemCol]
      if (ordemCol === 'numero' || ordemCol === 'valor') {
        va = Number(va) || 0; vb = Number(vb) || 0
      } else if (ordemCol === 'abertura') {
        va = a.abertura || ''; vb = b.abertura || ''
      } else {
        va = (va || '').toString().toLowerCase()
        vb = (vb || '').toString().toLowerCase()
      }
      if (va < vb) return ordemDir === 'asc' ? -1 : 1
      if (va > vb) return ordemDir === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [osList, range, tiposAtivos, statusAtivos, pagamentosAtivos, busca, ordemCol, ordemDir])

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    let faturado = 0, pendente = 0, qtdConcluidas = 0
    for (const os of filtradas) {
      const valor = (Number(os.valor) || 0) - (Number(os.desconto) || 0)
      if (os.etapa === 'concluido') {
        faturado += valor
        qtdConcluidas++
      }
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

  // ─── Toggle helpers ───────────────────────────────────────────────────────
  function toggleSet(set, id, setter) {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function ordenarPor(col) {
    if (col === ordemCol) {
      setOrdemDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setOrdemCol(col)
      setOrdemDir(col === 'numero' || col === 'abertura' ? 'desc' : 'asc')
    }
  }

  return (
    <div style={{
      padding: '20px 24px 32px', overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Vendas"
        subtitle={`Histórico de OS · ${labelPeriodo(periodo)}`}
        stats={[
          { label: 'Faturado', value: fmtBRL(kpis.faturado), color: corHero(dark) },
          { label: 'OS no período', value: kpis.total, color: azul },
          { label: 'Ticket médio', value: fmtBRL(kpis.ticket), color: corHero(dark) },
          { label: 'A receber', value: fmtBRL(kpis.pendente),
            color: kpis.pendente > 0 ? amarelo : T.textDim },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="primary" T={T} dark={dark} iconLeft="ti-plus"
              onClick={() => setNovaOSAntigaAberta(true)}>
              Nova OS antiga
            </Button>
          </div>
        }
      />

      {/* Barra de filtros — padrão Financeiro */}
      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>

          {/* Período (dropdown estilo Financeiro) */}
          <div ref={periodoRef} style={{ position: 'relative' }}>
            <button onClick={() => setPeriodoAberto(o => !o)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 8,
                border: `1px solid ${T.border}`,
                background: T.cardAlt, color: T.textPrimary,
                fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                minWidth: 200,
              }}>
              <i className="ti ti-calendar" style={{ fontSize: 15, color: azul }} aria-hidden="true" />
              <span style={{ flex: 1, textAlign: 'left' }}>{labelPeriodo(periodo)}</span>
              <i className={`ti ${periodoAberto ? 'ti-chevron-up' : 'ti-chevron-down'}`}
                style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
            </button>

            {periodoAberto && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
                minWidth: 260,
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                padding: 8,
              }}>
                {PERIODOS.map(p => {
                  const ativo = periodo.id === p.id
                  return (
                    <button key={p.id}
                      onClick={() => { setPeriodo({ id: p.id }); setPeriodoAberto(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '8px 10px', borderRadius: 6,
                        border: 'none',
                        background: ativo ? cor('#0d2035', '#e6f1fb') : 'transparent',
                        color: ativo ? azul : T.textSecondary,
                        fontSize: 12.5, fontWeight: ativo ? 700 : 500,
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      }}>
                      {ativo
                        ? <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" />
                        : <span style={{ width: 13 }} />}
                      {p.label}
                    </button>
                  )
                })}
                <div style={{ height: 1, background: T.border, margin: '6px 4px' }} />
                <div style={{
                  padding: '4px 6px 2px', fontSize: 10.5, color: T.textMuted,
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em',
                }}>
                  Personalizado
                </div>
                <div style={{ display: 'flex', gap: 6, padding: 6 }}>
                  <input type="date" value={periodo.de || ''}
                    onChange={e => setPeriodo({ id: 'custom', de: e.target.value, ate: periodo.ate })}
                    style={inputDate(T, dark)} />
                  <input type="date" value={periodo.ate || ''}
                    onChange={e => setPeriodo({ id: 'custom', de: periodo.de, ate: e.target.value })}
                    style={inputDate(T, dark)} />
                </div>
              </div>
            )}
          </div>

          {/* Tipos chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTROS_TIPO.map(f => (
              <ChipToggle key={f.id}
                T={T} dark={dark}
                ativo={tiposAtivos.has(f.id)}
                onClick={() => toggleSet(tiposAtivos, f.id, setTiposAtivos)}
              >{f.label}</ChipToggle>
            ))}
          </div>

          {/* Status chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTROS_STATUS.map(f => (
              <ChipToggle key={f.id}
                T={T} dark={dark}
                ativo={statusAtivos.has(f.id)}
                onClick={() => toggleSet(statusAtivos, f.id, setStatusAtivos)}
              >{f.label}</ChipToggle>
            ))}
          </div>

          {/* Pagamento chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTROS_PAGAMENTO.map(f => (
              <ChipToggle key={f.id}
                T={T} dark={dark}
                ativo={pagamentosAtivos.has(f.id)}
                onClick={() => toggleSet(pagamentosAtivos, f.id, setPagamentosAtivos)}
              >{f.label}</ChipToggle>
            ))}
          </div>

          {/* Busca */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <Input T={T} dark={dark}
              value={busca}
              onChange={setBusca}
              icon="ti-search"
              placeholder="Cliente, nº OS, telefone ou equipamento"
            />
          </div>
        </div>
      </Card>

      {/* Tabela */}
      {loading ? (
        <Card T={T} dark={dark}>
          <div style={{ padding: '24px', textAlign: 'center', color: T.textMuted, fontSize: 12 }}>
            Carregando OS…
          </div>
        </Card>
      ) : filtradas.length === 0 ? (
        <EmptyState T={T}
          icon="ti-search-off"
          title="Nenhuma OS encontrada"
          description={kpis.total === 0
            ? 'Os filtros não retornaram resultados. Limpa os filtros ou cria uma OS antiga retroativa.'
            : 'Ajusta os filtros pra ver mais.'}
        />
      ) : (
        <Card T={T} dark={dark} padding={0}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%', borderCollapse: 'separate', borderSpacing: 0,
              fontSize: 12.5,
              fontFamily: 'inherit',
            }}>
              <thead>
                <tr style={{ background: T.cardAlt }}>
                  <HeaderCell T={T} col="numero" label="Nº" curr={ordemCol} dir={ordemDir} onClick={ordenarPor} align="right" />
                  <HeaderCell T={T} col="abertura" label="Data" curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                  <HeaderCell T={T} col="cliente" label="Cliente" curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                  <HeaderCell T={T} col="tipo" label="Tipo" curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                  <HeaderCell T={T} col="etapa" label="Etapa" curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                  <HeaderCell T={T} col="valor" label="Valor" curr={ordemCol} dir={ordemDir} onClick={ordenarPor} align="right" />
                  <HeaderCell T={T} col="pago" label="Pagto" curr={ordemCol} dir={ordemDir} onClick={ordenarPor} />
                </tr>
              </thead>
              <tbody>
                {filtradas.map(os => (
                  <LinhaOS key={os.id} os={os} T={T} dark={dark}
                    onClick={() => abrirOSPorId(os.id)} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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

// ─── Sub: cabeçalho de coluna ordenável ────────────────────────────────────
function HeaderCell({ T, col, label, curr, dir, onClick, align = 'left' }) {
  const ativo = curr === col
  return (
    <th onClick={() => onClick(col)}
      style={{
        padding: '9px 12px',
        textAlign: align,
        fontSize: 10.5, fontWeight: 700, color: ativo ? T.textPrimary : T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.4px',
        borderBottom: `1px solid ${T.border}`,
        cursor: 'pointer', userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
      {label}
      {ativo && (
        <i className={`ti ${dir === 'asc' ? 'ti-chevron-up' : 'ti-chevron-down'}`}
          style={{ fontSize: 11, marginLeft: 3 }} aria-hidden="true" />
      )}
    </th>
  )
}

// ─── Sub: linha da OS ──────────────────────────────────────────────────────
function LinhaOS({ os, T, dark, onClick }) {
  const configTipo = TIPOS_OS[os.tipo]
  const corTipo = corEtapa(configTipo?.cor || 'neutro', dark)
  const etapaInfo = ETAPAS_TODOS.find(e => e.id === os.etapa)
  const corEt = corEtapa(etapaInfo?.cor || 'neutro', dark)
  const cPag = corPagto(os, dark)
  const valorLiq = (Number(os.valor) || 0) - (Number(os.desconto) || 0)

  return (
    <tr onClick={onClick}
      style={{
        cursor: 'pointer',
        transition: 'background .12s',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = T.cardAlt}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <td style={{ ...tdStyle(T), textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: corHero(dark) }}>
        #{os.numero}
      </td>
      <td style={{ ...tdStyle(T), color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
        {fmtDataBR(os.abertura)}
      </td>
      <td style={{ ...tdStyle(T), color: corHero(dark), fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
        {os.cliente || (os.tipo === 'fabricacao' ? 'Fabricação' : '—')}
      </td>
      <td style={tdStyle(T)}>
        <Badge dark={dark} color={corTipo} bg={`${corTipo}22`}>
          {configTipo?.label || os.tipo}
        </Badge>
      </td>
      <td style={tdStyle(T)}>
        <span style={{ fontSize: 11.5, color: corEt, fontWeight: 600 }}>
          {etapaInfo?.label || os.etapa}
        </span>
      </td>
      <td style={{ ...tdStyle(T), textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: corHero(dark) }}>
        {fmtBRL(valorLiq)}
      </td>
      <td style={tdStyle(T)}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: cPag,
          padding: '2px 8px', borderRadius: 10,
          background: `${cPag}15`,
          border: `1px solid ${cPag}33`,
        }}>
          {labelPagto(os)}
        </span>
      </td>
    </tr>
  )
}

function inputDate(T, dark) {
  return {
    padding: '6px 8px', fontSize: 12, borderRadius: 6,
    border: `1px solid ${T.border}`, background: T.card, color: T.textPrimary,
    fontFamily: 'inherit', flex: 1, outline: 'none',
    colorScheme: dark ? 'dark' : 'light',
  }
}

function tdStyle(T) {
  return {
    padding: '10px 12px',
    borderBottom: `1px solid ${T.border}`,
    fontSize: 12.5,
    color: T.textPrimary,
    verticalAlign: 'middle',
  }
}
