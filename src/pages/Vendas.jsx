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

import React, { useState, useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL } from '../utils/fmt'
import { TIPOS_OS, ETAPAS_TODOS } from '../utils/osData'
import {
  Card, Button, Badge, Input, PageHeader, EmptyState, ChipToggle, useToast,
} from '../components/ui'
import { useOSDetalheModal } from '../hooks/useOSDetalheModal'
import OSDetalhe from '../components/osDetalhe/OSDetalhe'
import NovaOSAntigaModal from '../components/vendas/NovaOSAntigaModal'

// ─── Helpers de período (reusa lógica simples) ───────────────────────────────
function rangeDoPeriodo(periodo, mesEsp, dataIni, dataFim) {
  const hoje = new Date()
  const toIso = d => d.toISOString().slice(0, 10)

  if (periodo === 'custom') {
    return { ini: dataIni || null, fim: dataFim || null, label: `${dataIni || '?'} → ${dataFim || '?'}` }
  }
  if (periodo === 'mes_especifico') {
    if (!mesEsp) return { ini: null, fim: null, label: '?' }
    const [y, m] = mesEsp.split('-').map(Number)
    const ini = new Date(y, m - 1, 1)
    const fim = new Date(y, m, 0)
    return { ini: toIso(ini), fim: toIso(fim), label: mesEsp }
  }
  if (periodo === 'mes_atual') {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    return { ini: toIso(ini), fim: toIso(fim), label: 'Este mês' }
  }
  if (periodo === 'mes_passado') {
    const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
    return { ini: toIso(ini), fim: toIso(fim), label: 'Mês passado' }
  }
  if (periodo === 'ano') {
    const ini = new Date(hoje.getFullYear(), 0, 1)
    const fim = new Date(hoje.getFullYear(), 11, 31)
    return { ini: toIso(ini), fim: toIso(fim), label: `Ano ${hoje.getFullYear()}` }
  }
  // tudo
  return { ini: null, fim: null, label: 'Todas' }
}

const PRESETS_PERIODO = [
  { id: 'mes_atual',    label: 'Este mês' },
  { id: 'mes_passado',  label: 'Mês passado' },
  { id: 'ano',          label: 'Este ano' },
  { id: 'tudo',         label: 'Tudo' },
]

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
  const [periodo, setPeriodo] = useState('mes_atual')
  const [mesEsp, setMesEsp] = useState('')
  const [dataIni, setDataIni] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [tiposAtivos, setTiposAtivos] = useState(new Set(['atendimento', 'fabricacao', 'venda']))
  const [statusAtivos, setStatusAtivos] = useState(new Set(['concluido', 'recusado', 'aberto']))
  const [pagamentosAtivos, setPagamentosAtivos] = useState(new Set(['total', 'parcial', 'nao']))
  const [busca, setBusca] = useState('')

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
  const range = useMemo(
    () => rangeDoPeriodo(periodo, mesEsp, dataIni, dataFim),
    [periodo, mesEsp, dataIni, dataFim]
  )

  // ─── Filtrar OS ────────────────────────────────────────────────────────────
  const filtradas = useMemo(() => {
    let r = osList

    // Período (compara contra criado_em da OS, em formato YYYY-MM-DD)
    if (range.ini || range.fim) {
      r = r.filter(os => {
        const dataRef = (os.abertura || '').slice(0, 10) // toCuiaba já trouxe a data local
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
        subtitle={`Histórico de OS · ${range.label}`}
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

      {/* Barra de filtros */}
      <Card T={T} dark={dark} padding={0}>
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Linha 1: período presets + custom */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px', marginRight: 4 }}>
              Período:
            </span>
            {PRESETS_PERIODO.map(p => (
              <ChipToggle key={p.id}
                T={T} dark={dark}
                ativo={periodo === p.id}
                onClick={() => setPeriodo(p.id)}
              >{p.label}</ChipToggle>
            ))}
            <input type="month" value={mesEsp}
              onChange={(e) => { setMesEsp(e.target.value); setPeriodo('mes_especifico') }}
              style={{
                padding: '5px 8px', borderRadius: 6,
                border: `1px solid ${periodo === 'mes_especifico' ? azul : T.border}`,
                background: T.bg, color: T.textPrimary,
                fontSize: 11.5, fontFamily: 'inherit',
                colorScheme: dark ? 'dark' : 'light',
              }}
            />
            <span style={{ fontSize: 10.5, color: T.textDim }}>ou</span>
            <input type="date" value={dataIni}
              onChange={(e) => { setDataIni(e.target.value); setPeriodo('custom') }}
              style={{
                padding: '5px 8px', borderRadius: 6,
                border: `1px solid ${periodo === 'custom' ? azul : T.border}`,
                background: T.bg, color: T.textPrimary,
                fontSize: 11.5, fontFamily: 'inherit',
                colorScheme: dark ? 'dark' : 'light',
              }} />
            <span style={{ fontSize: 10.5, color: T.textDim }}>→</span>
            <input type="date" value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setPeriodo('custom') }}
              style={{
                padding: '5px 8px', borderRadius: 6,
                border: `1px solid ${periodo === 'custom' ? azul : T.border}`,
                background: T.bg, color: T.textPrimary,
                fontSize: 11.5, fontFamily: 'inherit',
                colorScheme: dark ? 'dark' : 'light',
              }} />
          </div>

          {/* Linha 2: tipos */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px', marginRight: 4 }}>
              Tipo:
            </span>
            {FILTROS_TIPO.map(f => (
              <ChipToggle key={f.id}
                T={T} dark={dark}
                ativo={tiposAtivos.has(f.id)}
                onClick={() => toggleSet(tiposAtivos, f.id, setTiposAtivos)}
              >{f.label}</ChipToggle>
            ))}
          </div>

          {/* Linha 3: status + pagamento + busca */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px', marginRight: 4 }}>
              Status:
            </span>
            {FILTROS_STATUS.map(f => (
              <ChipToggle key={f.id}
                T={T} dark={dark}
                ativo={statusAtivos.has(f.id)}
                onClick={() => toggleSet(statusAtivos, f.id, setStatusAtivos)}
              >{f.label}</ChipToggle>
            ))}

            <span style={{ fontSize: 10.5, color: T.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px', marginLeft: 8, marginRight: 4 }}>
              Pagto:
            </span>
            {FILTROS_PAGAMENTO.map(f => (
              <ChipToggle key={f.id}
                T={T} dark={dark}
                ativo={pagamentosAtivos.has(f.id)}
                onClick={() => toggleSet(pagamentosAtivos, f.id, setPagamentosAtivos)}
              >{f.label}</ChipToggle>
            ))}

            <div style={{ flex: 1, minWidth: 180, marginLeft: 'auto' }}>
              <Input T={T} dark={dark}
                value={busca}
                onChange={setBusca}
                icon="ti-search"
                placeholder="Cliente, nº OS, telefone ou equipamento"
              />
            </div>
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

function tdStyle(T) {
  return {
    padding: '10px 12px',
    borderBottom: `1px solid ${T.border}`,
    fontSize: 12.5,
    color: T.textPrimary,
    verticalAlign: 'middle',
  }
}
