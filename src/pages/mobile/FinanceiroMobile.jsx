// idemaq-src/pages/mobile/FinanceiroMobile.jsx
// Redesign inspirado no Atlassian Design System:
//   - Abas com underline indicator (sem background fill)
//   - Lozenge de status (radius 3px, uppercase — padrão Atlassian)
//   - Linhas de transação estilo Jira issue row
//   - Filtros em chip rows com scroll horizontal
//   - KPI strip separado por bordas verticais
//   - Section headers uppercase com ícone
//   - Espaçamento grid 8px, paleta Deutan mantida

import React, { useState, useMemo, useEffect } from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { fmtBRL, fmtPrazoCurto, semAcento } from '../../utils/fmt'
import { Input, useToast } from '../../components/ui'
import LancamentoDetalheModal from '../../components/financeiro/LancamentoDetalheModal'
import NovoLancamentoModal from '../../components/financeiro/NovoLancamentoModal'
import { useFinanceiro } from '../../hooks/useFinanceiro'

// ─── Helpers (espelhados do Financeiro.jsx desktop) ───────────────────────────
const LABEL_FORMA = {
  pix: 'PIX', dinheiro: 'Dinheiro', debito: 'Débito',
  credito_1x: 'Cartão 1x', credito_parcelado: 'Cartão parcelado',
  link_pagamento: 'InfinitePay', boleto: 'Boleto',
  transferencia: 'Transferência', a_prazo: 'A prazo',
}
function labelForma(v) { return LABEL_FORMA[v] || v || '' }

function mapearFormaEnum(f) {
  if (!f) return null
  const m = {
    'pix':'pix','dinheiro':'dinheiro','débito':'debito','debito':'debito',
    'cartão 1x':'credito_1x','cartão parcelado':'credito_parcelado',
    'link infinitepay':'link_pagamento','boleto':'boleto',
    'transferência':'transferencia','a prazo':'a_prazo',
  }
  const k = String(f).toLowerCase().trim()
  return m[k] || 'pix'
}

function adaptarBancoParaUI(lanc) {
  const ehReceita = lanc.tipo === 'receita'
  const pago = lanc.pago_em != null
  return {
    id: lanc.id, osNum: null,
    cliente: ehReceita ? (lanc.descricao || '').split('—')[0]?.trim() : null,
    descricao: lanc.descricao || '',
    categoria: lanc.categoria || 'Outros',
    conta: lanc.conta?.nome || '', conta_id: lanc.conta_id || null,
    valor: Number(lanc.valor) || 0, vencimento: lanc.vencimento,
    forma: labelForma(lanc.forma_pagamento), forma_enum: lanc.forma_pagamento || null,
    taxa_pct: Number(lanc.taxa_pct) || 0,
    status: pago ? 'pago' : 'aberto', dataPag: lanc.pago_em || null,
    tipo: lanc.tipo,
  }
}

function statusVenc(isoData) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const d = new Date(isoData + 'T00:00:00')
  const diff = Math.round((d - hoje) / 86400000)
  if (diff < 0)   return { tipo: 'vencido', label: `Venceu há ${-diff}d` }
  if (diff === 0) return { tipo: 'hoje',    label: 'Vence hoje' }
  if (diff === 1) return { tipo: 'amanha',  label: 'Amanhã' }
  return               { tipo: 'futuro',   label: `Em ${diff}d` }
}

const PERIODOS = [
  { id: '7d',    label: '7d' },
  { id: 'mes',   label: 'Mês' },
  { id: '30d',   label: '30d' },
  { id: '90d',   label: '90d' },
  { id: 'todos', label: 'Todos' },
]

function filtrarPorPeriodo(itens, periodoId, campo) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  if (periodoId === 'todos') return itens
  let de, ate
  if (periodoId === 'mes') {
    de  = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    ate = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)
  } else if (periodoId === '30d') {
    de = hoje; ate = new Date(hoje); ate.setDate(ate.getDate() + 30)
  } else if (periodoId === '90d') {
    de = hoje; ate = new Date(hoje); ate.setDate(ate.getDate() + 90)
  } else {
    ate = hoje; de = new Date(hoje); de.setDate(de.getDate() - 7)
  }
  return itens.filter(it => {
    if (!it[campo]) return true
    const d = new Date(it[campo] + 'T00:00:00')
    if (de  && d < de)  return false
    if (ate && d > ate) return false
    return true
  })
}

const META_MES = 20000
const isoHoje = () => new Date().toISOString().slice(0, 10)

// ─── Primitivos Atlassian ─────────────────────────────────────────────────────

function Lozenge({ cor, bg, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 3,
      fontSize: 10.5, fontWeight: 700, letterSpacing: '.02em',
      background: bg, color: cor,
      textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function StatusLozenge({ item, dark }) {
  if (item.status === 'pago') {
    return <Lozenge cor={corEtapa('blue', dark)} bg={bgEtapa('blue', dark)}>Pago</Lozenge>
  }
  const st = statusVenc(item.vencimento)
  const map = {
    vencido: { cor: corEtapa('red', dark),    bg: bgEtapa('red', dark)    },
    hoje:    { cor: corEtapa('yellow', dark), bg: bgEtapa('yellow', dark) },
    amanha:  { cor: corEtapa('yellow', dark), bg: bgEtapa('yellow', dark) },
    futuro:  { cor: corEtapa('blue', dark),   bg: bgEtapa('blue', dark)   },
  }
  const c = map[st.tipo]
  return <Lozenge cor={c.cor} bg={c.bg}>{st.label}</Lozenge>
}

function TabBar({ abas, value, onChange, T, dark }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{ display: 'flex', borderBottom: `2px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
      {abas.map(a => {
        const ativo = a.id === value
        return (
          <button key={a.id} onClick={() => onChange(a.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', border: 'none', background: 'transparent',
              color: ativo ? azul : T.textMuted,
              fontWeight: ativo ? 700 : 500, fontSize: 13.5,
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              borderBottom: ativo ? `2px solid ${azul}` : '2px solid transparent',
              marginBottom: -2, transition: 'color .12s',
            }}>
            {a.label}
            {a.count != null && a.count > 0 && (
              <span style={{
                background: ativo ? azul : T.cardAlt,
                color: ativo ? '#fff' : T.textSecondary,
                fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10,
                fontVariantNumeric: 'tabular-nums',
              }}>{a.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function Chip({ label, ativo, onClick, azul, T }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '5px 12px', borderRadius: 20,
        border: `1px solid ${ativo ? azul : T.border}`,
        background: ativo ? azul : 'transparent',
        color: ativo ? '#fff' : T.textSecondary,
        fontSize: 12, fontWeight: ativo ? 600 : 400,
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        transition: 'all .1s',
      }}>
      {label}
    </button>
  )
}

function KpiCard({ label, valor, cor, icon, iconCor, T }) {
  return (
    <div>
      <div style={{
        fontSize: 9.5, fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 11, color: iconCor }} aria-hidden="true" />}
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: cor, fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </div>
    </div>
  )
}

function Section({ T, title, icon, iconCor, right, children }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 16px', borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          <i className={`ti ${icon}`} style={{ fontSize: 13, color: iconCor || T.textMuted }} aria-hidden="true" />
          {title}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

// ─── Linha de transação estilo Jira ───────────────────────────────────────────
function TxRow({ item, tipo, dark, T, onAbrir, onBaixar }) {
  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const corT    = tipo === 'receber' ? azul : amarelo
  const icone   = tipo === 'receber' ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'
  const pago    = item.status === 'pago'
  const titulo  = tipo === 'receber' ? (item.cliente || item.descricao) : item.descricao

  return (
    <div onClick={() => onAbrir(item)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={e => e.currentTarget.style.background = T.cardAlt}
      onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 6, flexShrink: 0,
        background: bgEtapa(tipo === 'receber' ? 'blue' : 'yellow', dark),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icone}`} style={{ fontSize: 16, color: corT }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, fontWeight: 600, color: pago ? T.textMuted : corHero(dark),
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textDecoration: pago ? 'line-through' : 'none',
        }}>{titulo}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            {fmtPrazoCurto(item.vencimento)}
          </span>
          {item.categoria && <span style={{ fontSize: 11, color: T.textMuted }}>· {item.categoria}</span>}
          <StatusLozenge item={item} dark={dark} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{
          fontSize: 14, fontWeight: 700, color: pago ? T.textMuted : corHero(dark),
          fontVariantNumeric: 'tabular-nums', textDecoration: pago ? 'line-through' : 'none',
        }}>
          {fmtBRL(item.valor)}
        </span>
        {!pago && (
          <button onClick={e => { e.stopPropagation(); onBaixar(item) }}
            style={{
              background: corT, color: '#fff', border: 'none', borderRadius: 4,
              padding: '4px 10px', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {tipo === 'receber' ? 'Receber' : 'Pagar'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Linha de caixa ───────────────────────────────────────────────────────────
function CaixaRow({ m, dark, T, onAbrir }) {
  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const ehR = m.tipo === 'receita'
  const corT = ehR ? azul : amarelo
  return (
    <div onClick={() => onAbrir(m)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={e => e.currentTarget.style.background = T.cardAlt}
      onTouchEnd={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 6, flexShrink: 0,
        background: bgEtapa(ehR ? 'blue' : 'yellow', dark),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${ehR ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'}`} style={{ fontSize: 16, color: corT }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: corHero(dark), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.descricao}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>
          {fmtPrazoCurto(m.data)}{m.forma ? ` · ${m.forma}` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: corT, fontVariantNumeric: 'tabular-nums' }}>
          {ehR ? '+' : '−'} {fmtBRL(m.valor)}
        </span>
        <span style={{ fontSize: 10.5, color: m.saldo >= 0 ? T.textMuted : vermelho, fontVariantNumeric: 'tabular-nums' }}>
          saldo {fmtBRL(m.saldo)}
        </span>
      </div>
    </div>
  )
}

// ─── Visão Geral ──────────────────────────────────────────────────────────────
function VisaoGeralMobile({ T, dark, recebidoMes, pagoMes, saldoCaixa, pctMeta, faltaMeta, meta, vencidos, totalVencido, totalReceber, totalPagar, onIrParaReceber }) {
  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde   = corEtapa('green', dark)

  const hoje = new Date()
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  let diasUteis = 0
  for (let d = new Date(hoje); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6) diasUteis++
  }
  const metaDiaria = diasUteis > 0 ? Math.ceil(faltaMeta / diasUteis) : 0

  return (
    <div>
      <Section T={T} title="Meta do mês" icon="ti-target" iconCor={azul}
        right={<span style={{ fontSize: 11, color: T.textMuted }}>{diasUteis} dias úteis</span>}>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: corHero(dark), fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
              {fmtBRL(recebidoMes)}
            </span>
            <span style={{ fontSize: 12, color: T.textMuted }}>de {fmtBRL(meta)}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: T.cardAlt, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${pctMeta}%`, height: '100%', background: `linear-gradient(90deg, ${azul}, ${corEtapa('blueLight', dark)})` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.textMuted, marginBottom: 14 }}>
            <span style={{ color: azul, fontWeight: 700 }}>{pctMeta}%</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>faltam {fmtBRL(faltaMeta)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 6, background: T.cardAlt, border: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 12, color: T.textMuted }}>
              <i className="ti ti-calendar-stats" style={{ marginRight: 5 }} aria-hidden="true" />
              Meta diária
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: azul, fontVariantNumeric: 'tabular-nums' }}>
              {fmtBRL(metaDiaria)}<span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted }}>/dia</span>
            </span>
          </div>
        </div>
      </Section>

      <Section T={T} title="Resumo do mês" icon="ti-chart-arcs" iconCor={azul}>
        <div>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}` }}>
              <KpiCard T={T} label="Recebido" valor={fmtBRL(recebidoMes)} cor={azul} icon="ti-arrow-down-circle" iconCor={azul} />
            </div>
            <div style={{ flex: 1, padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
              <KpiCard T={T} label="Pago" valor={fmtBRL(pagoMes)} cor={amarelo} icon="ti-arrow-up-circle" iconCor={amarelo} />
            </div>
          </div>
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${T.border}` }}>
              <KpiCard T={T} label="Saldo caixa" valor={fmtBRL(saldoCaixa)} cor={saldoCaixa >= 0 ? corHero(dark) : vermelho} icon="ti-cash-banknote" iconCor={saldoCaixa >= 0 ? verde : vermelho} />
            </div>
            <div style={{ flex: 1, padding: '12px 16px' }}>
              <KpiCard T={T} label="Vencidos" valor={vencidos.length} cor={vencidos.length > 0 ? vermelho : T.textDim} icon="ti-alert-triangle" iconCor={vencidos.length > 0 ? vermelho : T.textMuted} />
            </div>
          </div>
        </div>
      </Section>

      {vencidos.length > 0 && (
        <button onClick={onIrParaReceber}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', width: '100%', marginBottom: 8,
            background: bgEtapa('red', dark), border: `1px solid ${vermelho}33`, borderRadius: 8,
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 20, color: vermelho, flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: vermelho }}>
              {vencidos.length} conta{vencidos.length > 1 ? 's' : ''} vencida{vencidos.length > 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
              {fmtBRL(totalVencido)} em aberto — toque pra ver
            </div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: 14, color: T.textMuted }} aria-hidden="true" />
        </button>
      )}

      <Section T={T} title="Pendências" icon="ti-clock" iconCor={T.textMuted}>
        <div style={{ display: 'flex' }}>
          <div style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${T.border}` }}>
            <KpiCard T={T} label="A receber" valor={fmtBRL(totalReceber)} cor={azul} icon="ti-arrow-down-circle" iconCor={azul} />
          </div>
          <div style={{ flex: 1, padding: '12px 16px' }}>
            <KpiCard T={T} label="A pagar" valor={fmtBRL(totalPagar)} cor={amarelo} icon="ti-arrow-up-circle" iconCor={amarelo} />
          </div>
        </div>
      </Section>
    </div>
  )
}

// ─── Lista lançamentos ────────────────────────────────────────────────────────
function ListaMobile({ T, dark, itens, tipo, onAbrir, onBaixar }) {
  const [periodo, setPeriodo]         = useState('mes')
  const [statusFilt, setStatusFilt]   = useState('aberto')
  const [busca, setBusca]             = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)

  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const corT    = tipo === 'receber' ? azul : amarelo

  const statusOpts = [
    { id: 'todos',   label: 'Todos' },
    { id: 'aberto',  label: tipo === 'receber' ? 'A receber' : 'A pagar' },
    { id: 'vencido', label: 'Vencidas' },
    { id: 'pago',    label: 'Pagas' },
  ]

  const filtrados = useMemo(() => {
    let arr = filtrarPorPeriodo(itens, periodo, 'vencimento')
    if (statusFilt === 'aberto')       arr = arr.filter(i => i.status === 'aberto')
    else if (statusFilt === 'pago')    arr = arr.filter(i => i.status === 'pago')
    else if (statusFilt === 'vencido') arr = arr.filter(i => i.status === 'aberto' && statusVenc(i.vencimento).tipo === 'vencido')
    if (busca.trim()) {
      const q = semAcento(busca.trim())
      arr = arr.filter(i =>
        semAcento(i.descricao).includes(q) ||
        semAcento(i.cliente).includes(q) ||
        semAcento(i.categoria).includes(q)
      )
    }
    return [...arr].sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))
  }, [itens, periodo, statusFilt, busca])

  const total = filtrados.reduce((s, i) => s + i.valor, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {PERIODOS.map(p => (
            <Chip key={p.id} label={p.label} azul={azul} T={T}
              ativo={periodo === p.id} onClick={() => setPeriodo(p.id)} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {statusOpts.map(s => (
            <Chip key={s.id} label={s.label} azul={azul} T={T}
              ativo={statusFilt === s.id} onClick={() => setStatusFilt(s.id)} />
          ))}
          <button onClick={() => setBuscaAberta(o => !o)}
            style={{ marginLeft: 'auto', flexShrink: 0, background: 'transparent', border: 'none', color: buscaAberta ? azul : T.textMuted, cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-search" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
        </div>
        {buscaAberta && (
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}` }}>
            <Input T={T} dark={dark} value={busca} onChange={setBusca} icon="ti-search"
              placeholder={tipo === 'receber' ? 'Buscar cliente ou descrição…' : 'Buscar descrição…'} />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 11.5, color: T.textMuted }}>
          <span>{filtrados.length} lançamento{filtrados.length !== 1 ? 's' : ''}</span>
          <span style={{ fontWeight: 700, color: corT, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(total)}</span>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '32px 16px', textAlign: 'center' }}>
          <i className="ti ti-search-off" style={{ fontSize: 28, color: T.textDim, display: 'block', marginBottom: 8 }} aria-hidden="true" />
          <div style={{ fontSize: 13, color: T.textMuted }}>Nenhum lançamento com esses filtros</div>
        </div>
      ) : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {filtrados.map(it => (
            <TxRow key={it.id} item={it} tipo={tipo} dark={dark} T={T}
              onAbrir={onAbrir} onBaixar={onBaixar} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Caixa mobile ─────────────────────────────────────────────────────────────
function CaixaMobile({ T, dark, itens, onAbrir }) {
  const [periodo, setPeriodo]         = useState('mes')
  const [tipoFilt, setTipoFilt]       = useState('todos')
  const [busca, setBusca]             = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)

  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde   = corEtapa('green', dark)

  const filtrados = useMemo(() => {
    let arr = filtrarPorPeriodo(itens, periodo, 'data')
    if (tipoFilt !== 'todos') arr = arr.filter(m => m.tipo === tipoFilt)
    if (busca.trim()) {
      const q = semAcento(busca.trim())
      arr = arr.filter(m => semAcento(m.descricao).includes(q))
    }
    return [...arr].sort((a, b) => (b.data || '').localeCompare(a.data || ''))
  }, [itens, periodo, tipoFilt, busca])

  const comSaldo = useMemo(() => {
    const asc = [...filtrados].reverse()
    let acc = 0; const map = new Map()
    asc.forEach(m => { acc += m.tipo === 'receita' ? m.valor : -m.valor; map.set(m.id, acc) })
    return filtrados.map(m => ({ ...m, saldo: map.get(m.id) }))
  }, [filtrados])

  const totalRec = filtrados.filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0)
  const totalDes = filtrados.filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0)
  const saldo    = totalRec - totalDes

  const tipoOpts = [
    { id: 'todos',   label: 'Todos' },
    { id: 'receita', label: 'Entradas' },
    { id: 'despesa', label: 'Saídas' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, display: 'flex' }}>
        <div style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${T.border}` }}>
          <KpiCard T={T} label="Saldo" valor={fmtBRL(saldo)} cor={saldo >= 0 ? corHero(dark) : vermelho} icon={saldo >= 0 ? 'ti-trending-up' : 'ti-trending-down'} iconCor={saldo >= 0 ? verde : vermelho} />
        </div>
        <div style={{ flex: 1, padding: '12px 16px', borderRight: `1px solid ${T.border}` }}>
          <KpiCard T={T} label="Entradas" valor={fmtBRL(totalRec)} cor={azul} icon="ti-arrow-down-circle" iconCor={azul} />
        </div>
        <div style={{ flex: 1, padding: '12px 16px' }}>
          <KpiCard T={T} label="Saídas" valor={fmtBRL(totalDes)} cor={amarelo} icon="ti-arrow-up-circle" iconCor={amarelo} />
        </div>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {PERIODOS.map(p => (
            <Chip key={p.id} label={p.label} azul={azul} T={T} ativo={periodo === p.id} onClick={() => setPeriodo(p.id)} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {tipoOpts.map(t => (
            <Chip key={t.id} label={t.label} azul={azul} T={T} ativo={tipoFilt === t.id} onClick={() => setTipoFilt(t.id)} />
          ))}
          <button onClick={() => setBuscaAberta(o => !o)}
            style={{ marginLeft: 'auto', flexShrink: 0, background: 'transparent', border: 'none', color: buscaAberta ? azul : T.textMuted, cursor: 'pointer', padding: 4 }}>
            <i className="ti ti-search" style={{ fontSize: 16 }} aria-hidden="true" />
          </button>
        </div>
        {buscaAberta && (
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}` }}>
            <Input T={T} dark={dark} value={busca} onChange={setBusca} icon="ti-search" placeholder="Buscar movimentação…" />
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', fontSize: 11.5, color: T.textMuted }}>
          <span>{filtrados.length} movimento{filtrados.length !== 1 ? 's' : ''}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <i className="ti ti-lock" style={{ fontSize: 12 }} aria-hidden="true" /> Read-only
          </span>
        </div>
      </div>

      {comSaldo.length === 0 ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: '32px 16px', textAlign: 'center' }}>
          <i className="ti ti-search-off" style={{ fontSize: 28, color: T.textDim, display: 'block', marginBottom: 8 }} aria-hidden="true" />
          <div style={{ fontSize: 13, color: T.textMuted }}>Sem movimentações nesse período</div>
        </div>
      ) : (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
          {comSaldo.map(m => (
            <CaixaRow key={m.id} m={m} dark={dark} T={T} onAbrir={onAbrir} />
          ))}
        </div>
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

  const recebidoMes  = caixa.filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0)
  const pagoMes      = caixa.filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0)
  const saldoCaixa   = recebidoMes - pagoMes
  const totalReceber = receber.reduce((s, r) => s + r.valor, 0)
  const totalPagar   = pagar.reduce((s, p) => s + p.valor, 0)
  const vencidos     = receber.filter(r => statusVenc(r.vencimento).tipo === 'vencido')
  const totalVencido = vencidos.reduce((s, r) => s + r.valor, 0)
  const pctMeta      = Math.min(100, Math.round((recebidoMes / META_MES) * 100))
  const faltaMeta    = Math.max(0, META_MES - recebidoMes)

  const azul    = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  async function baixarReceber(item) {
    if (usandoBanco) {
      const { error } = await darBaixa(item.id, { forma_pagamento: item.forma_enum || mapearFormaEnum(item.forma), taxa_pct: item.taxa_pct || 0 })
      if (error) { notify('erro', `Erro: ${error.message}`); return }
      notify('ok', `${fmtBRL(item.valor)} recebido`); setSelecionado(null); return
    }
    setReceber(prev => prev.filter(r => r.id !== item.id))
    setCaixa(prev => [{ ...item, status: 'pago', dataPag: isoHoje(), data: isoHoje() }, ...prev])
    notify('ok', `${fmtBRL(item.valor)} recebido`); setSelecionado(null)
  }

  async function baixarPagar(item) {
    if (usandoBanco) {
      const { error } = await darBaixa(item.id, { forma_pagamento: item.forma_enum || mapearFormaEnum(item.forma), taxa_pct: item.taxa_pct || 0 })
      if (error) { notify('erro', `Erro: ${error.message}`); return }
      notify('ok', `${fmtBRL(item.valor)} pago`); setSelecionado(null); return
    }
    setPagar(prev => prev.filter(p => p.id !== item.id))
    setCaixa(prev => [{ ...item, tipo: 'despesa', status: 'pago', dataPag: isoHoje(), data: isoHoje() }, ...prev])
    notify('ok', `${fmtBRL(item.valor)} pago`); setSelecionado(null)
  }

  async function excluirLancamento(item, tipo) {
    if (usandoBanco) {
      const { error } = await excluirReal(item.id)
      if (error) { notify('erro', `Erro: ${error.message}`); return }
    } else {
      if (tipo === 'receber')    setReceber(prev => prev.filter(r => r.id !== item.id))
      else if (tipo === 'pagar') setPagar(prev => prev.filter(p => p.id !== item.id))
      else                       setCaixa(prev => prev.filter(m => m.id !== item.id))
    }
    notify('ok', 'Excluído'); setSelecionado(null)
  }

  const ABAS = [
    { id: 'visao',   label: 'Visão geral' },
    { id: 'receber', label: 'A receber',  count: receber.length },
    { id: 'pagar',   label: 'A pagar',    count: pagar.length },
    { id: 'caixa',   label: 'Caixa' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', background: T.bg, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: corHero(dark), margin: 0, letterSpacing: '-0.01em' }}>
              Financeiro
            </h1>
            <p style={{ fontSize: 11.5, color: T.textMuted, margin: '3px 0 0' }}>
              Contas a receber, pagar e caixa
            </p>
          </div>
          <button
            onClick={() => setNovoLancTipo(aba === 'pagar' ? 'despesa' : 'receita')}
            style={{
              background: azul, color: '#fff', border: 'none', borderRadius: 4,
              padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
            }}
          >
            <i className="ti ti-plus" style={{ fontSize: 14 }} aria-hidden="true" /> Novo
          </button>
        </div>

        {/* KPI strip 3 colunas */}
        <div style={{ display: 'flex', paddingBottom: 12 }}>
          {[
            { label: 'Saldo',     valor: fmtBRL(saldoCaixa),  cor: corHero(dark) },
            { label: 'A receber', valor: fmtBRL(totalReceber), cor: azul },
            { label: 'A pagar',   valor: fmtBRL(totalPagar),   cor: amarelo },
          ].map((k, i) => (
            <div key={i} style={{
              flex: 1, paddingLeft: i > 0 ? 14 : 0,
              borderLeft: i > 0 ? `1px solid ${T.border}` : 'none',
              marginLeft: i > 0 ? 14 : 0,
            }}>
              <div style={{ fontSize: 9.5, color: T.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: k.cor, fontVariantNumeric: 'tabular-nums' }}>
                {k.valor}
              </div>
            </div>
          ))}
        </div>

        {vencidos.length > 0 && (
          <div style={{ paddingBottom: 10 }}>
            <Lozenge cor={vermelho} bg={bgEtapa('red', dark)}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 10, marginRight: 3 }} aria-hidden="true" />
              {vencidos.length} vencido{vencidos.length > 1 ? 's' : ''} · {fmtBRL(totalVencido)}
            </Lozenge>
          </div>
        )}

        <TabBar abas={ABAS} value={aba} onChange={setAba} T={T} dark={dark} />
      </div>

      {tabelaAusente && (
        <div style={{
          margin: '8px 16px 0', background: bgEtapa('yellow', dark),
          border: `1px solid ${amarelo}44`, borderRadius: 6, padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: T.textSecondary,
        }}>
          <i className="ti ti-database-off" style={{ fontSize: 14, color: amarelo, flexShrink: 0 }} aria-hidden="true" />
          <span>
            <strong style={{ color: corHero(dark) }}>Modo demo</strong> — aplique{' '}
            <code style={{ fontSize: 10.5 }}>sql/01-lancamento-financeiro.sql</code> para dados reais.
          </span>
        </div>
      )}

      <div style={{ padding: '12px 16px', flex: 1 }}>
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
          <ListaMobile T={T} dark={dark} itens={receber} tipo="receber"
            onAbrir={item => setSelecionado({ tipo: 'receber', item })}
            onBaixar={baixarReceber}
          />
        )}
        {aba === 'pagar' && (
          <ListaMobile T={T} dark={dark} itens={pagar} tipo="pagar"
            onAbrir={item => setSelecionado({ tipo: 'pagar', item })}
            onBaixar={baixarPagar}
          />
        )}
        {aba === 'caixa' && (
          <CaixaMobile T={T} dark={dark} itens={caixa}
            onAbrir={item => setSelecionado({ tipo: 'caixa', item })}
          />
        )}
      </div>

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
          tipoInicial={novoLancTipo} contas={contasReais}
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
