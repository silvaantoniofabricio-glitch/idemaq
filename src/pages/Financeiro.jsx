// idemaq-src/pages/Financeiro.jsx
// Tela de Financeiro — Visão geral / A receber / A pagar / Caixa (Módulo 07).
// MVP visual: tabela `lancamento_financeiro` é Schema parte 2 — ainda não existe.
// Etapas Pagamento e Caixa só visíveis pro dono (RLS no banco vai bloquear).
// Cores: Verde sempre com ícone (acessibilidade Deutan). Nenhum vermelho/verde puro sem reforço.

import React, { useState, useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL, fmtPrazoCurto } from '../utils/fmt'
import {
  Card, SubCard, Button, Badge, Input, Tabs,
  EmptyState, PageHeader, SectionHeader,
  useToast,
} from '../components/ui'

// === Cenário ===
// Meta R$ 20.000/mês · faturamento médio R$ 17.500 · ~50 OS/mês · ticket R$ 350
const META_MES = 20000

// Datas relativas pra ficar coerente independente do dia
const HOJE = new Date()
const isoMaisDias = (d) => {
  const x = new Date(HOJE)
  x.setDate(x.getDate() + d)
  return x.toISOString().slice(0, 10)
}

// === Mocks ===
const A_RECEBER_MOCK = [
  { id:1,  osNum:241, cliente:'Paula Mendes',  descricao:'Manutenção + Limpeza',     valor: 480, vencimento: isoMaisDias(-15), forma:'Boleto' },
  { id:2,  osNum:243, cliente:'Maria Silva',   descricao:'Limpeza combinada x2',     valor: 330, vencimento: isoMaisDias(-5),  forma:'Cartão 2x' },
  { id:3,  osNum:245, cliente:'Carlos Lima',   descricao:'Manutenção',               valor: 185, vencimento: isoMaisDias(-1),  forma:'PIX' },
  { id:4,  osNum:247, cliente:'Ana Reis',      descricao:'Limpeza + capa',           valor: 270, vencimento: isoMaisDias(0),   forma:'Link InfinitePay' },
  { id:5,  osNum:248, cliente:'Roberto Dias',  descricao:'Manutenção + mangueira',   valor: 415, vencimento: isoMaisDias(1),   forma:'Cartão 1x' },
  { id:6,  osNum:249, cliente:'João Costa',    descricao:'Limpeza',                  valor: 185, vencimento: isoMaisDias(3),   forma:'PIX' },
  { id:7,  osNum:250, cliente:'Igor Vasconcelos', descricao:'Venda máquina reformada', valor: 650, vencimento: isoMaisDias(5), forma:'Cartão 3x' },
  { id:8,  osNum:251, cliente:'Pedro Alves',   descricao:'Manutenção + Limpeza',     valor: 480, vencimento: isoMaisDias(7),   forma:'Boleto' },
]

const A_PAGAR_MOCK = [
  { id:1,  descricao:'Salário Alessandro',  categoria:'Funcionários', valor:1650, vencimento: isoMaisDias(2),  recorrente:true },
  { id:2,  descricao:'Salário Guilherme',   categoria:'Funcionários', valor:1650, vencimento: isoMaisDias(2),  recorrente:true },
  { id:3,  descricao:'Tráfego pago Meta',   categoria:'Marketing',    valor: 500, vencimento: isoMaisDias(5),  recorrente:true },
  { id:4,  descricao:'Compra de peças ML',  categoria:'Peças ML',     valor: 820, vencimento: isoMaisDias(-2), recorrente:false },
  { id:5,  descricao:'Energia elétrica',    categoria:'Utilidades',   valor: 310, vencimento: isoMaisDias(8),  recorrente:true },
  { id:6,  descricao:'Internet + telefone', categoria:'Utilidades',   valor: 180, vencimento: isoMaisDias(10), recorrente:true },
  { id:7,  descricao:'Combustível',         categoria:'Combustível',  valor: 420, vencimento: isoMaisDias(0),  recorrente:false },
  { id:8,  descricao:'Material de limpeza', categoria:'Materiais',    valor: 145, vencimento: isoMaisDias(12), recorrente:false },
]

const CAIXA_MOCK = [
  { id:1,  tipo:'receita',  descricao:'OS #239 — Maria Silva',     valor: 185, data: isoMaisDias(-1),  banco:'PIX Bradesco' },
  { id:2,  tipo:'despesa',  descricao:'Combustível semana',         valor: 180, data: isoMaisDias(-1),  banco:'Cartão Inter PJ' },
  { id:3,  tipo:'receita',  descricao:'OS #240 — Pedro Alves',     valor: 350, data: isoMaisDias(-2),  banco:'PIX Cresol' },
  { id:4,  tipo:'receita',  descricao:'OS #238 — Ana Reis',        valor: 480, data: isoMaisDias(-3),  banco:'InfinitePay D+1' },
  { id:5,  tipo:'despesa',  descricao:'Peças ML — abril',           valor: 620, data: isoMaisDias(-3),  banco:'Bradesco PJ' },
  { id:6,  tipo:'receita',  descricao:'OS #237 — João Costa',      valor: 185, data: isoMaisDias(-4),  banco:'PIX Bradesco' },
  { id:7,  tipo:'receita',  descricao:'Venda M-201 — Carlos Lima', valor: 650, data: isoMaisDias(-5),  banco:'InfinitePay D+1' },
  { id:8,  tipo:'despesa',  descricao:'Pró-labore parcial',         valor: 800, data: isoMaisDias(-6),  banco:'Cresol' },
  { id:9,  tipo:'receita',  descricao:'OS #236 — Roberto Dias',    valor: 295, data: isoMaisDias(-7),  banco:'PIX Cresol' },
  { id:10, tipo:'receita',  descricao:'OS #235 — Paula Mendes',    valor: 415, data: isoMaisDias(-8),  banco:'Cartão 2x InfinitePay' },
]

const ABAS = [
  { id:'visao',    label:'Visão geral', icon:'ti-layout-dashboard' },
  { id:'receber',  label:'A receber',   icon:'ti-arrow-down-circle' },
  { id:'pagar',    label:'A pagar',     icon:'ti-arrow-up-circle' },
  { id:'caixa',    label:'Caixa',       icon:'ti-cash-banknote' },
]

// === Helpers ===
function statusVencimento(isoData) {
  const hoje = new Date(); hoje.setHours(0,0,0,0)
  const d = new Date(isoData + 'T00:00:00')
  const diff = Math.round((d - hoje) / 86400000)
  if (diff < 0)   return { tipo: 'vencido', dias: -diff, label: `Venceu há ${-diff}d` }
  if (diff === 0) return { tipo: 'hoje',    dias: 0,     label: 'Vence hoje' }
  if (diff === 1) return { tipo: 'amanha',  dias: 1,     label: 'Amanhã' }
  return { tipo: 'futuro', dias: diff, label: `Em ${diff}d` }
}

function StatusBadgeVenc({ status, dark }) {
  const map = {
    vencido: { variant: 'vermelho', icon: 'ti-alert-triangle' },
    hoje:    { variant: 'amarelo',  icon: 'ti-clock' },
    amanha:  { variant: 'amarelo',  icon: 'ti-calendar-due' },
    futuro:  { variant: 'azul',     icon: 'ti-calendar-event' },
  }
  const cfg = map[status.tipo] || map.futuro
  return (
    <Badge variant={cfg.variant} dark={dark} sm>
      <i className={`ti ${cfg.icon}`} aria-hidden="true" /> {status.label}
    </Badge>
  )
}

// === Página ===
export default function Financeiro({ T, dark }) {
  const notify = useToast()
  const [aba, setAba] = useState('visao')
  const [busca, setBusca] = useState('')
  const [receber] = useState(A_RECEBER_MOCK)
  const [pagar] = useState(A_PAGAR_MOCK)
  const [caixa] = useState(CAIXA_MOCK)

  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)

  // Totais
  const totalReceber = receber.reduce((s, r) => s + r.valor, 0)
  const totalPagar = pagar.reduce((s, p) => s + p.valor, 0)
  const saldoCaixa = caixa.reduce((s, m) => s + (m.tipo === 'receita' ? m.valor : -m.valor), 0)
  const recebidoMes = caixa.filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0)
  const pagoMes     = caixa.filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0)
  const vencidos    = receber.filter(r => statusVencimento(r.vencimento).tipo === 'vencido')
  const totalVencido = vencidos.reduce((s, r) => s + r.valor, 0)

  // Meta
  const pctMeta = Math.min(100, Math.round((recebidoMes / META_MES) * 100))
  const faltaMeta = Math.max(0, META_MES - recebidoMes)

  function placeholder(msg) {
    notify('info', msg || 'Em breve — Módulo 07 do plano')
  }

  return (
    <div style={{
      padding: '20px 24px 32px', overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Financeiro"
        subtitle={`Mês corrente · Meta ${fmtBRL(META_MES)}`}
        stats={[
          { label: 'Saldo do caixa', value: fmtBRL(saldoCaixa), color: corHero(dark) },
          { label: 'A receber',      value: fmtBRL(totalReceber), color: azul },
          { label: 'A pagar',        value: fmtBRL(totalPagar),  color: amarelo },
          { label: 'Vencidos',       value: vencidos.length,
            color: vencidos.length > 0 ? vermelho : T.textDim },
        ]}
        actions={
          <Button variant="primary" iconLeft="ti-plus"
            onClick={() => placeholder('Novo lançamento (avulso/parcelado/recorrente) em breve')}>
            Novo lançamento
          </Button>
        }
      />

      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs T={T} dark={dark}
            options={ABAS}
            value={aba}
            onChange={(v) => { setAba(v); setBusca('') }}
            variant="segmented"
          />
          {aba !== 'visao' && (
            <>
              <div style={{ width: 1, height: 24, background: T.border }} />
              <div style={{ flex: 1, minWidth: 220 }}>
                <Input T={T} dark={dark}
                  value={busca} onChange={setBusca}
                  icon="ti-search"
                  placeholder={
                    aba === 'receber' ? 'Buscar por cliente, OS ou descrição…'
                    : aba === 'pagar' ? 'Buscar por descrição ou categoria…'
                    : 'Buscar movimentação…'
                  }
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {aba === 'visao'   && <VisaoGeral T={T} dark={dark}
        recebidoMes={recebidoMes} pagoMes={pagoMes} saldoCaixa={saldoCaixa}
        pctMeta={pctMeta} faltaMeta={faltaMeta} meta={META_MES}
        vencidos={vencidos} totalVencido={totalVencido}
        totalReceber={totalReceber} totalPagar={totalPagar}
      />}
      {aba === 'receber' && <ListaReceber T={T} dark={dark} itens={receber} busca={busca}
        onBaixa={() => placeholder('Baixa de recebimento em breve')} />}
      {aba === 'pagar'   && <ListaPagar   T={T} dark={dark} itens={pagar}   busca={busca}
        onBaixa={() => placeholder('Baixa de pagamento em breve')} />}
      {aba === 'caixa'   && <ListaCaixa   T={T} dark={dark} itens={caixa}   busca={busca} />}
    </div>
  )
}

// =============================================================================
// VISÃO GERAL
// =============================================================================
function VisaoGeral({
  T, dark,
  recebidoMes, pagoMes, saldoCaixa,
  pctMeta, faltaMeta, meta,
  vencidos, totalVencido,
  totalReceber, totalPagar,
}) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const verde = corEtapa('green', dark)
  const cor = (d, c) => dark ? d : c

  // Meta diária — dias úteis restantes no mês (simplificado: dias corridos exclui FDS)
  const hoje = new Date()
  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  let diasUteis = 0
  for (let d = new Date(hoje); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    const dia = d.getDay()
    if (dia !== 0 && dia !== 6) diasUteis++
  }
  const metaDiaria = diasUteis > 0 ? Math.ceil(faltaMeta / diasUteis) : 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(360px, 1.2fr) 1fr',
      gap: 14,
      alignItems: 'start',
    }}>
      {/* Meta do mês */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-target" mb={14}
          action={
            <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
              {diasUteis} {diasUteis === 1 ? 'dia útil' : 'dias úteis'} restantes
            </span>
          }
        >Meta do mês</SectionHeader>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 26, fontWeight: 800, color: corHero(dark),
            fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
          }}>
            {fmtBRL(recebidoMes)}
          </span>
          <span style={{ fontSize: 13, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
            de {fmtBRL(meta)}
          </span>
        </div>

        {/* Barra de progresso */}
        <div style={{
          width: '100%', height: 10, borderRadius: 6,
          background: T.cardAlt, border: `1px solid ${T.border}`,
          overflow: 'hidden', marginBottom: 6,
        }}>
          <div style={{
            width: `${pctMeta}%`, height: '100%',
            background: `linear-gradient(90deg, ${azul}, ${corEtapa('blueLight', dark)})`,
            transition: 'width .4s',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.textMuted, marginBottom: 14 }}>
          <span style={{ color: azul, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {pctMeta}% concluído
          </span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            Faltam {fmtBRL(faltaMeta)}
          </span>
        </div>

        <SubCard T={T}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{
                fontSize: 10.5, color: T.textMuted, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3,
              }}>
                <i className="ti ti-calendar-stats" style={{ marginRight: 5 }} aria-hidden="true" />
                Meta diária pra bater
              </div>
              <div style={{ fontSize: 11, color: T.textSecondary }}>
                Dividindo o que falta pelos dias úteis restantes (sem FDS).
              </div>
            </div>
            <div style={{
              fontSize: 20, fontWeight: 800, color: azul,
              fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
            }}>
              {fmtBRL(metaDiaria)}<span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>/dia</span>
            </div>
          </div>
        </SubCard>
      </Card>

      {/* Resumo do mês */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-chart-arcs" mb={14}>
          Resumo do mês
        </SectionHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ResumoLinha T={T} dark={dark}
            icon="ti-arrow-down-circle" iconCor={azul}
            label="Recebido no mês" valor={recebidoMes} corValor={corHero(dark)} />
          <ResumoLinha T={T} dark={dark}
            icon="ti-arrow-up-circle" iconCor={amarelo}
            label="Pago no mês" valor={pagoMes} corValor={corHero(dark)} />
          <div style={{ height: 1, background: T.border, margin: '4px 0' }} />
          <ResumoLinha T={T} dark={dark}
            icon="ti-cash-banknote" iconCor={saldoCaixa >= 0 ? verde : vermelho}
            iconLabel={saldoCaixa >= 0 ? 'ti-trending-up' : 'ti-trending-down'}
            label="Saldo do caixa" valor={saldoCaixa} corValor={corHero(dark)} destaque />
        </div>

        <div style={{ height: 1, background: T.border, margin: '14px 0 10px' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ResumoLinha T={T} dark={dark}
            icon="ti-clock-hour-3" iconCor={azul}
            label="A receber" valor={totalReceber} corValor={azul} />
          <ResumoLinha T={T} dark={dark}
            icon="ti-clock-hour-9" iconCor={amarelo}
            label="A pagar" valor={totalPagar} corValor={amarelo} />
        </div>
      </Card>

      {/* Alerta de inadimplência (full-width) */}
      {vencidos.length > 0 && (
        <Card T={T} dark={dark} accent={vermelho}
          style={{ gridColumn: '1 / -1', background: cor('#2a1515', '#fde8e8') + '40' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: bgEtapa('red', dark),
              border: `1px solid ${vermelho}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: vermelho }} aria-hidden="true" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 700, color: corHero(dark), marginBottom: 3,
              }}>
                Inadimplência: {vencidos.length} {vencidos.length === 1 ? 'cobrança vencida' : 'cobranças vencidas'}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted }}>
                Total em atraso: <strong style={{
                  color: vermelho, fontVariantNumeric: 'tabular-nums',
                }}>{fmtBRL(totalVencido)}</strong>
                {' '}— alertas configurados pra D+1, D+5, D+15 e mensal.
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function ResumoLinha({ T, dark, icon, iconCor, iconLabel, label, valor, corValor, destaque }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: destaque ? '6px 0' : '4px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: iconCor }} aria-hidden="true" />
        <span style={{ fontSize: 13, color: T.textSecondary, fontWeight: destaque ? 600 : 500 }}>
          {label}
        </span>
        {iconLabel && (
          <i className={`ti ${iconLabel}`} style={{ fontSize: 14, color: iconCor }} aria-hidden="true" />
        )}
      </div>
      <span style={{
        fontSize: destaque ? 16 : 14, fontWeight: destaque ? 700 : 600,
        color: corValor, fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtBRL(valor)}
      </span>
    </div>
  )
}

// =============================================================================
// A RECEBER
// =============================================================================
function ListaReceber({ T, dark, itens, busca, onBaixa }) {
  const azul = corEtapa('blue', dark)
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return itens
    return itens.filter(r =>
      r.cliente.toLowerCase().includes(q) ||
      r.descricao.toLowerCase().includes(q) ||
      String(r.osNum).includes(q)
    )
  }, [itens, busca])

  const ordenados = useMemo(() =>
    [...filtrados].sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  , [filtrados])

  const total = ordenados.reduce((s, r) => s + r.valor, 0)

  if (ordenados.length === 0) {
    return (
      <EmptyState T={T}
        icon={busca ? 'ti-search-off' : 'ti-clock-check'}
        title={busca ? 'Nenhum lançamento encontrado' : 'Nada a receber'}
        description={busca ? `Sem resultados para "${busca}".` : 'Tudo em dia.'}
        compact height="auto"
      />
    )
  }

  return (
    <Card T={T} dark={dark} padding={0}>
      <div style={{ padding: '12px 16px 10px' }}>
        <SectionHeader T={T} dark={dark} icon="ti-arrow-down-circle" mb={0}
          action={
            <span style={{ fontSize: 12, color: corHero(dark), fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              Total: {fmtBRL(total)}
            </span>
          }
        >Contas a receber</SectionHeader>
      </div>

      {ordenados.map(r => {
        const st = statusVencimento(r.vencimento)
        return (
          <div key={r.id} style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: 12, alignItems: 'center',
            padding: '12px 16px',
            borderTop: `1px solid ${T.border}`,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: corHero(dark),
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.cliente}
                </span>
                <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  · OS #{r.osNum}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted, display: 'flex', gap: 8 }}>
                <span>{r.descricao}</span>
                <span>·</span>
                <span><i className="ti ti-credit-card" style={{ fontSize: 12, marginRight: 3 }} aria-hidden="true" />{r.forma}</span>
              </div>
            </div>

            <StatusBadgeVenc status={st} dark={dark} />

            <span style={{
              fontSize: 14, fontWeight: 700, color: corHero(dark),
              fontVariantNumeric: 'tabular-nums', minWidth: 90, textAlign: 'right',
            }}>
              {fmtBRL(r.valor)}
            </span>

            <Button variant="secondary" T={T} dark={dark}
              size="sm" iconLeft="ti-check"
              onClick={() => onBaixa(r)}>
              Baixar
            </Button>
          </div>
        )
      })}
    </Card>
  )
}

// =============================================================================
// A PAGAR
// =============================================================================
function ListaPagar({ T, dark, itens, busca, onBaixa }) {
  const amarelo = corEtapa('yellow', dark)
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return itens
    return itens.filter(p =>
      p.descricao.toLowerCase().includes(q) ||
      p.categoria.toLowerCase().includes(q)
    )
  }, [itens, busca])

  const ordenados = useMemo(() =>
    [...filtrados].sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  , [filtrados])

  const total = ordenados.reduce((s, p) => s + p.valor, 0)

  if (ordenados.length === 0) {
    return (
      <EmptyState T={T}
        icon={busca ? 'ti-search-off' : 'ti-check'}
        title={busca ? 'Nenhuma despesa encontrada' : 'Nada a pagar'}
        description={busca ? `Sem resultados para "${busca}".` : 'Tudo em dia.'}
        compact height="auto"
      />
    )
  }

  return (
    <Card T={T} dark={dark} padding={0}>
      <div style={{ padding: '12px 16px 10px' }}>
        <SectionHeader T={T} dark={dark} icon="ti-arrow-up-circle" mb={0}
          action={
            <span style={{ fontSize: 12, color: corHero(dark), fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              Total: {fmtBRL(total)}
            </span>
          }
        >Contas a pagar</SectionHeader>
      </div>

      {ordenados.map(p => {
        const st = statusVencimento(p.vencimento)
        return (
          <div key={p.id} style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto auto auto',
            gap: 12, alignItems: 'center',
            padding: '12px 16px',
            borderTop: `1px solid ${T.border}`,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: corHero(dark),
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.descricao}
                </span>
                {p.recorrente && (
                  <Badge variant="neutro" dark={dark} sm>
                    <i className="ti ti-rotate-clockwise" aria-hidden="true" /> Recorrente
                  </Badge>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted }}>
                <i className="ti ti-tag" style={{ fontSize: 12, marginRight: 3 }} aria-hidden="true" />
                {p.categoria}
              </div>
            </div>

            <StatusBadgeVenc status={st} dark={dark} />

            <span style={{
              fontSize: 14, fontWeight: 700, color: corHero(dark),
              fontVariantNumeric: 'tabular-nums', minWidth: 90, textAlign: 'right',
            }}>
              {fmtBRL(p.valor)}
            </span>

            <Button variant="secondary" T={T} dark={dark}
              size="sm" iconLeft="ti-check"
              onClick={() => onBaixa(p)}>
              Pagar
            </Button>
          </div>
        )
      })}
    </Card>
  )
}

// =============================================================================
// CAIXA — read only (regra de negócio)
// =============================================================================
function ListaCaixa({ T, dark, itens, busca }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return itens
    return itens.filter(m =>
      m.descricao.toLowerCase().includes(q) ||
      (m.banco || '').toLowerCase().includes(q)
    )
  }, [itens, busca])

  const ordenados = useMemo(() =>
    [...filtrados].sort((a, b) => b.data.localeCompare(a.data))
  , [filtrados])

  const totalReceitas = ordenados.filter(m => m.tipo === 'receita').reduce((s, m) => s + m.valor, 0)
  const totalDespesas = ordenados.filter(m => m.tipo === 'despesa').reduce((s, m) => s + m.valor, 0)
  const saldo = totalReceitas - totalDespesas

  if (ordenados.length === 0) {
    return (
      <EmptyState T={T}
        icon={busca ? 'ti-search-off' : 'ti-cash-off'}
        title={busca ? 'Nenhuma movimentação' : 'Caixa vazio'}
        description={busca
          ? `Sem resultados para "${busca}".`
          : 'Movimentações confirmadas aparecem aqui (recebimentos e pagamentos).'}
        compact height="auto"
      />
    )
  }

  return (
    <>
      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: T.textMuted }}>
            <i className="ti ti-lock" aria-hidden="true" />
            Movimentações confirmadas — read-only. Só exclusão é permitida.
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <span style={{ fontSize: 11.5, color: T.textMuted }}>
              Entradas: <strong style={{ color: azul, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totalReceitas)}</strong>
            </span>
            <span style={{ fontSize: 11.5, color: T.textMuted }}>
              Saídas: <strong style={{ color: amarelo, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(totalDespesas)}</strong>
            </span>
            <span style={{ fontSize: 11.5, color: T.textMuted }}>
              Saldo:{' '}
              <strong style={{ color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>
                <i className={`ti ${saldo >= 0 ? 'ti-trending-up' : 'ti-trending-down'}`}
                   style={{ marginRight: 4, color: saldo >= 0 ? verde : corEtapa('red', dark) }} aria-hidden="true" />
                {fmtBRL(saldo)}
              </strong>
            </span>
          </div>
        </div>
      </Card>

      <Card T={T} dark={dark} padding={0}>
        <div style={{ padding: '12px 16px 10px' }}>
          <SectionHeader T={T} dark={dark} icon="ti-cash-banknote" mb={0}
            action={
              <span style={{ fontSize: 11, color: T.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                {ordenados.length} movimentos
              </span>
            }
          >Movimentações</SectionHeader>
        </div>

        {ordenados.map(m => {
          const ehReceita = m.tipo === 'receita'
          const corT = ehReceita ? azul : amarelo
          const iconeT = ehReceita ? 'ti-arrow-down-circle' : 'ti-arrow-up-circle'
          return (
            <div key={m.id} style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto auto',
              gap: 12, alignItems: 'center',
              padding: '11px 16px',
              borderTop: `1px solid ${T.border}`,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: bgEtapa(ehReceita ? 'blue' : 'yellow', dark),
                border: `1px solid ${corT}33`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ${iconeT}`} style={{ fontSize: 15, color: corT }} aria-hidden="true" />
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: corHero(dark),
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {m.descricao}
                </div>
                <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                  <i className="ti ti-building-bank" style={{ fontSize: 12, marginRight: 3 }} aria-hidden="true" />
                  {m.banco}
                </div>
              </div>

              <span style={{
                fontSize: 11, color: T.textMuted,
                fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
              }}>
                {fmtPrazoCurto(m.data)}
              </span>

              <span style={{
                fontSize: 14, fontWeight: 700, color: corT,
                fontVariantNumeric: 'tabular-nums',
                minWidth: 100, textAlign: 'right',
              }}>
                {ehReceita ? '+' : '−'} {fmtBRL(m.valor)}
              </span>
            </div>
          )
        })}
      </Card>
    </>
  )
}
