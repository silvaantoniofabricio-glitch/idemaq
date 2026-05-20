// idemaq-src/pages/Relatorios.jsx
// Tela de Relatórios — hub + 6 relatórios + Ponto (Módulo 08).
//
// 4 relatórios reais (Geral / OS Operacional / Estoque / Vendas): consomem
// hooks de `useRelatorios.js` que agregam Supabase no JS.
// 2 com IA (DRE / Funcionários): ainda mock — dependem da edge function do
// Claude API + (no caso do DRE) do schema parte 2 (`lancamento_financeiro`).
// Visível só pro dono — rota `/relatorios` envolvida em <AdminOnly> no App.jsx.

import React, { useState, useMemo } from 'react'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL } from '../utils/fmt'
import {
  Card, SubCard, Button, Badge, Tabs,
  EmptyState, PageHeader, SectionHeader,
  Sparkline, DeltaPill,
  useToast,
} from '../components/ui'
import RelatorioPontoDono from '../components/ponto/RelatorioPontoDono'
import {
  computeRange,
  useRelatorioGeral,
  useRelatorioOperacional,
  useRelatorioEstoque,
  useRelatorioVendas,
  fmtDuracao,
} from '../hooks/useRelatorios'
import { useRelatorioIA } from '../hooks/useRelatorioIA'

// === Catálogo dos 7 relatórios ===
const RELATORIOS = [
  { id:'geral',         label:'Geral',           icon:'ti-chart-arcs',        desc:'Visão consolidada do negócio', cor:'blue' },
  { id:'operacional',   label:'OS Operacional',  icon:'ti-clipboard-list',    desc:'Tempos por etapa, gargalos, retrabalho', cor:'blue' },
  { id:'estoque',       label:'Estoque',         icon:'ti-package',           desc:'Giro, paradas, projeção', cor:'blue' },
  { id:'vendas',        label:'Vendas',          icon:'ti-shopping-cart',     desc:'Funil, ticket médio, conversão', cor:'blue' },
  { id:'financeiro',    label:'Financeiro (DRE)', icon:'ti-cash-banknote',    desc:'DRE + análise com IA', cor:'blue', ia:true },
  { id:'funcionarios',  label:'Funcionários',    icon:'ti-users',             desc:'Performance individual + IA', cor:'blue', ia:true },
  { id:'ponto',         label:'Relógio de Ponto', icon:'ti-clock-pin',        desc:'Equipe, espelhos, mapa, banco de horas', cor:'blue' },
]

const PERIODOS = [
  { id:'mes',       label:'Mês' },
  { id:'trimestre', label:'Trimestre' },
  { id:'semestre',  label:'Semestre' },
  { id:'ano',       label:'Ano' },
]

// Sparkline 12m vem do hook real (`useRelatorioGeral`). Mantemos só o fallback
// abaixo pros relatórios em mock (DRE/Funcionários), pra evitar tela vazia.
const FAT_12M = [13800, 14200, 15100, 15600, 14900, 16200, 17000, 17500, 16800, 17900, 18200, 17500]

const MESES_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function fmtDataBR(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtMesBR(yyyymm) {
  if (!yyyymm) return ''
  const [y, m] = yyyymm.split('-')
  return `${MESES_PT[Number(m) - 1] || ''}/${y}`
}

// === Página ===
export default function Relatorios({ T, dark }) {
  const notify = useToast()
  const [relAtivo, setRelAtivo] = useState(null) // null = hub
  const [periodo, setPeriodo] = useState('mes')
  const [mesEsp, setMesEsp]   = useState('') // 'YYYY-MM'
  const [dataIni, setDataIni] = useState('') // 'YYYY-MM-DD'
  const [dataFim, setDataFim] = useState('') // 'YYYY-MM-DD'

  const temCustom = !!(mesEsp || dataIni || dataFim)

  // Range ISO do período atual — passado pros hooks reais.
  // Recalcula só quando as deps mudam, evita refetch em qualquer render.
  const { iniIso, fimIso } = useMemo(
    () => computeRange(periodo, mesEsp, dataIni, dataFim),
    [periodo, mesEsp, dataIni, dataFim],
  )

  function escolherPreset(p) {
    setPeriodo(p)
    setMesEsp(''); setDataIni(''); setDataFim('')
  }
  function mudarMesEsp(v) {
    setMesEsp(v); setDataIni(''); setDataFim('')
  }
  function mudarDataIni(v) { setDataIni(v); setMesEsp('') }
  function mudarDataFim(v) { setDataFim(v); setMesEsp('') }
  function limparCustom()  { setMesEsp(''); setDataIni(''); setDataFim('') }

  function labelPeriodo() {
    if (mesEsp) return fmtMesBR(mesEsp)
    if (dataIni && dataFim) return `${fmtDataBR(dataIni)} → ${fmtDataBR(dataFim)}`
    if (dataIni) return `a partir de ${fmtDataBR(dataIni)}`
    if (dataFim) return `até ${fmtDataBR(dataFim)}`
    return PERIODOS.find(p => p.id === periodo)?.label.toLowerCase() || ''
  }

  function placeholder(msg) {
    notify('info', msg || 'Em breve — Módulo 08 do plano')
  }

  return (
    <div style={{
      padding: '20px 24px 32px', overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <PageHeader T={T} dark={dark}
        title="Relatórios"
        subtitle={relAtivo
          ? `${RELATORIOS.find(r => r.id === relAtivo)?.label} · período ${labelPeriodo()}`
          : 'Escolha um relatório pra ver os números'}
        stats={!relAtivo ? [
          { label: '6 relatórios', value: 6, color: corEtapa('blue', dark) },
          { label: 'Com IA',        value: 2, color: corEtapa('blueLight', dark) },
        ] : []}
        actions={relAtivo && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" T={T} dark={dark}
              iconLeft="ti-arrow-left"
              onClick={() => setRelAtivo(null)}>
              Voltar
            </Button>
            <Button variant="secondary" T={T} dark={dark}
              iconLeft="ti-file-export"
              onClick={() => placeholder('Export PDF/Excel em breve')}>
              Exportar
            </Button>
          </div>
        )}
      />

      {relAtivo && (
        <Card T={T} dark={dark}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Tabs T={T} dark={dark}
                options={PERIODOS}
                value={temCustom ? '' : periodo}
                onChange={escolherPreset}
                variant="segmented"
              />
              <div style={{ flex: 1, fontSize: 11, color: T.textMuted, textAlign: 'right' }}>
                {(relAtivo === 'financeiro' || relAtivo === 'funcionarios') ? (
                  <>
                    <i className="ti ti-sparkles" style={{ marginRight: 4 }} aria-hidden="true" />
                    Análise via Claude API — em breve. Dados ainda são de exemplo.
                  </>
                ) : (
                  <>
                    <i className="ti ti-database" style={{ marginRight: 4 }} aria-hidden="true" />
                    Dados em tempo real do Supabase
                  </>
                )}
              </div>
            </div>

            <CalendarioPeriodo T={T} dark={dark}
              mesEsp={mesEsp}   onMesEsp={mudarMesEsp}
              dataIni={dataIni} onDataIni={mudarDataIni}
              dataFim={dataFim} onDataFim={mudarDataFim}
              temCustom={temCustom} onLimpar={limparCustom}
            />
          </div>
        </Card>
      )}

      {!relAtivo ? (
        <RelatoriosHub T={T} dark={dark} onAbrir={setRelAtivo} />
      ) : (
        <>
          {relAtivo === 'geral'        && <RelatorioGeral        T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'operacional'  && <RelatorioOperacional  T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'estoque'      && <RelatorioEstoque      T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'vendas'       && <RelatorioVendas       T={T} dark={dark} iniIso={iniIso} fimIso={fimIso} />}
          {relAtivo === 'financeiro'   && <RelatorioFinanceiro   T={T} dark={dark} />}
          {relAtivo === 'funcionarios' && <RelatorioFuncionarios T={T} dark={dark} />}
          {relAtivo === 'ponto'        && <RelatorioPontoDono    T={T} dark={dark} />}
        </>
      )}
    </div>
  )
}

// =============================================================================
// HUB
// =============================================================================
function RelatoriosHub({ T, dark, onAbrir }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 12,
    }}>
      {RELATORIOS.map(r => (
        <Card key={r.id} T={T} dark={dark} hover accent={azul}
          onClick={() => onAbrir(r.id)}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 11,
              background: bgEtapa('blue', dark),
              border: `1px solid ${azul}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <i className={`ti ${r.icon}`} style={{ fontSize: 22, color: azul }} aria-hidden="true" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 14, fontWeight: 700, color: corHero(dark),
                marginBottom: 4,
              }}>
                {r.label}
                {r.ia && (
                  <Badge variant="azulClaro" dark={dark} sm>
                    <i className="ti ti-sparkles" aria-hidden="true" /> IA
                  </Badge>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.4 }}>
                {r.desc}
              </div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 18, color: T.textDim }} aria-hidden="true" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// =============================================================================
// GERAL — dados reais
// =============================================================================
function RelatorioGeral({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const amarelo = corEtapa('yellow', dark)
  const { data, loading, error } = useRelatorioGeral({ iniIso, fimIso })

  if (loading) return <RelatorioLoading T={T} />
  if (error)   return <RelatorioErro    T={T} dark={dark} msg={error} />
  if (!data)   return null

  const tipoCores = { atendimento: azul, fabricacao: amarelo, venda: azulClaro }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}>
        <KPI T={T} dark={dark} label="Faturamento" valor={fmtBRL(data.faturamento)} cor={azul}
          sparkData={data.sparkFat} sparkCor={azul} icon="ti-cash" />
        <KPI T={T} dark={dark} label="OS concluídas" valor={data.osConcluidas} cor={corHero(dark)}
          sparkData={data.sparkOS} sparkCor={azulClaro} icon="ti-clipboard-list" />
        <KPI T={T} dark={dark} label="Ticket médio" valor={fmtBRL(data.ticketMedio)} cor={corHero(dark)}
          icon="ti-receipt" />
        <KPI T={T} dark={dark} label="OS abertas no período" valor={data.totalAbertas} cor={azul}
          icon="ti-folder-plus" />
      </div>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-chart-bar" mb={14}>
          Distribuição por tipo de OS
        </SectionHeader>
        {data.totalDistribuicao > 0 ? (
          <BarrasCategoria T={T} dark={dark}
            dados={data.porTipo.map(t => ({ label: t.label, valor: t.valor, cor: tipoCores[t.id] || azul }))}
            total={data.totalDistribuicao}
          />
        ) : (
          <EmptyState T={T} compact icon="ti-chart-bar"
            title="Sem OS abertas neste período"
            description="Ajuste o filtro acima pra ver outro intervalo." />
        )}
      </Card>

      <InsightIA T={T} dark={dark} disponivel={false} />
    </div>
  )
}

// =============================================================================
// OS OPERACIONAL — dados reais
// =============================================================================
function RelatorioOperacional({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const { data, loading, error } = useRelatorioOperacional({ iniIso, fimIso })

  if (loading) return <RelatorioLoading T={T} />
  if (error)   return <RelatorioErro    T={T} dark={dark} msg={error} />
  if (!data)   return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Lead time médio" valor={fmtDuracao(data.leadTimeSegs)} cor={azul}
          icon="ti-clock" />
        <KPI T={T} dark={dark} label="OS concluídas" valor={data.osConcluidas} cor={corHero(dark)}
          icon="ti-circle-check" />
        <KPI T={T} dark={dark} label="Recusadas" valor={data.osRecusadas} cor={amarelo}
          icon="ti-x" />
        <KPI T={T} dark={dark} label="Retrabalho (garantia)" valor={`${data.pctRetrabalho}%`} cor={vermelho}
          icon="ti-rotate-clockwise" />
      </div>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-hourglass" mb={14}>
          Tempo médio por etapa
        </SectionHeader>
        {data.tempoMedioPorEtapa.length > 0 ? (
          <BarrasHorizontais T={T} dark={dark} dados={data.tempoMedioPorEtapa} />
        ) : (
          <EmptyState T={T} compact icon="ti-hourglass"
            title="Sem movimentações no período"
            description="OS precisam mudar de etapa pra gerar este dado." />
        )}
      </Card>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-alert-triangle" mb={14}>
          Gargalos identificados
        </SectionHeader>
        {data.gargalos.length > 0 ? (
          <ListaSimples T={T} dark={dark} itens={data.gargalos} />
        ) : (
          <EmptyState T={T} compact icon="ti-alert-triangle"
            title="Sem gargalos detectados"
            description="Volume insuficiente no período pra identificar pontos críticos." />
        )}
      </Card>
    </div>
  )
}

// =============================================================================
// ESTOQUE — dados reais
// =============================================================================
function RelatorioEstoque({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const { data, loading, error } = useRelatorioEstoque({ iniIso, fimIso })

  if (loading) return <RelatorioLoading T={T} />
  if (error)   return <RelatorioErro    T={T} dark={dark} msg={error} />
  if (!data)   return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Itens em estoque" valor={data.totalItens} cor={corHero(dark)}
          icon="ti-package" />
        <KPI T={T} dark={dark} label="Valor parado" valor={fmtBRL(data.valorParado)} cor={azul}
          icon="ti-cash" />
        <KPI T={T} dark={dark} label="Estoque baixo" valor={data.estoqueBaixo} cor={amarelo}
          icon="ti-alert-triangle" />
        <KPI T={T} dark={dark} label="SKUs ativos" valor={data.totalSkus} cor={azul}
          icon="ti-tag" />
      </div>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-trending-up" mb={14}>
          Peças mais usadas no período
        </SectionHeader>
        {data.pecasMaisUsadas.length > 0 ? (
          <BarrasHorizontais T={T} dark={dark} dados={data.pecasMaisUsadas} />
        ) : (
          <EmptyState T={T} compact icon="ti-package"
            title="Sem consumo registrado no período"
            description="Itens consumidos em OS aparecem aqui — verifique se o período cobre OS com peças baixadas." />
        )}
      </Card>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-alert-octagon" mb={14}>
          Peças paradas (sem giro no período)
        </SectionHeader>
        {data.pecasParadas.length > 0 ? (
          <ListaSimples T={T} dark={dark} itens={data.pecasParadas.map(p => ({
            titulo: p.nome,
            detalhe: `${p.qtd} un em estoque · capital parado ${fmtBRL(p.custoTotal)}`,
            badge: p.qtd > 5 ? 'Alto' : 'Médio',
            badgeVar: p.qtd > 5 ? 'amarelo' : 'azul',
          }))} />
        ) : (
          <EmptyState T={T} compact icon="ti-circle-check"
            title="Sem peças paradas"
            description={data.temConsumo
              ? 'Todas as peças com saldo tiveram movimentação.'
              : 'Sem consumo no período — abra um período maior pra avaliar.'} />
        )}
      </Card>
    </div>
  )
}

// =============================================================================
// VENDAS — dados reais
// =============================================================================
function RelatorioVendas({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const { data, loading, error } = useRelatorioVendas({ iniIso, fimIso })

  if (loading) return <RelatorioLoading T={T} />
  if (error)   return <RelatorioErro    T={T} dark={dark} msg={error} />
  if (!data)   return null

  const coresTipo = { servico: azul, peca: azulClaro }
  const totalCat = data.servicosMaisVendidos.reduce((s, r) => s + r.valor, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Conversão orçamento" valor={`${data.conversaoOrcamento}%`} cor={azul}
          icon="ti-target-arrow" />
        <KPI T={T} dark={dark} label="Ticket médio" valor={fmtBRL(data.ticketMedio)} cor={corHero(dark)}
          icon="ti-receipt" />
        <KPI T={T} dark={dark} label="Máquinas vendidas" valor={data.maquinasVendidas} cor={corHero(dark)}
          icon="ti-device-washing-machine" />
        <KPI T={T} dark={dark} label="Receita máquinas" valor={fmtBRL(data.receitaMaquinas)} cor={azul}
          icon="ti-cash" />
      </div>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-funnel" mb={14}>
          Funil de OS
        </SectionHeader>
        {data.totalAbertas > 0 ? (
          <BarrasHorizontais T={T} dark={dark} dados={data.funil} />
        ) : (
          <EmptyState T={T} compact icon="ti-funnel"
            title="Sem OS abertas no período"
            description="Ajuste o filtro pra ver o funil." />
        )}
      </Card>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-star" mb={14}>
          Itens mais vendidos no período
        </SectionHeader>
        {data.servicosMaisVendidos.length > 0 ? (
          <BarrasCategoria T={T} dark={dark}
            dados={data.servicosMaisVendidos.map(r => ({
              label: r.label,
              valor: r.valor,
              cor: coresTipo[r.tipo] || amarelo,
            }))}
            total={totalCat}
          />
        ) : (
          <EmptyState T={T} compact icon="ti-receipt"
            title="Sem itens vendidos no período"
            description="Itens de serviço ou peça em OS criadas no período aparecem aqui." />
        )}
      </Card>
    </div>
  )
}

// =============================================================================
// FINANCEIRO (DRE) + IA — mock
// TODO[ia]: trocar dados deste relatório por:
//   1) Query real em `lancamento_financeiro` (depende do schema parte 2 — sql/01)
//   2) Edge function que chame a Claude API (claude-sonnet-4-6 padrão,
//      claude-opus-4-7 pra análises profundas) com prompt caching ativado.
//      Front NÃO chama a Claude API direto — vaza a chave.
//   Ver `contexto-relatorios.md` seção 4.
// =============================================================================
function RelatorioFinanceiro({ T, dark }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)

  const receitas = 17500
  const despesas = 11540
  const lucro = receitas - despesas
  const margem = Math.round((lucro / receitas) * 100)

  const { markdown, loading, error, gerar } = useRelatorioIA()
  const dadosIA = {
    periodo: 'mock (DRE de exemplo — schema parte 2 pendente)',
    receitas, despesas, lucro, margem,
    receitasDetalhe: {
      manutencao: 5920, limpeza: 5180, vendaMaquinas: 2600, pecas: 2400, taxaDiagnostico: 1400,
    },
    despesasDetalhe: {
      funcionarios: 3300, pecasML: 2840, combustivel: 680, trafegoPago: 500,
      utilidades: 890, impostos: 2400, outras: 930,
    },
    meta: 20000,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Receita bruta" valor={fmtBRL(receitas)} delta={4} cor={azul}
          sparkData={FAT_12M} sparkCor={azul} icon="ti-arrow-down-circle" />
        <KPI T={T} dark={dark} label="Despesas totais" valor={fmtBRL(despesas)} delta={-2} cor={amarelo}
          icon="ti-arrow-up-circle" deltaInverso />
        <KPI T={T} dark={dark} label="Lucro líquido" valor={fmtBRL(lucro)} delta={9} cor={corHero(dark)}
          icon="ti-trending-up" />
        <KPI T={T} dark={dark} label="Margem" valor={`${margem}%`} delta={3} cor={azul}
          icon="ti-percentage" />
      </div>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-file-invoice" mb={14}>
          DRE simplificado
        </SectionHeader>
        <DRELinhas T={T} dark={dark} linhas={[
          { label: 'Receita — Manutenção',        valor:  5920, tipo: 'receita' },
          { label: 'Receita — Limpeza',           valor:  5180, tipo: 'receita' },
          { label: 'Receita — Venda de máquinas', valor:  2600, tipo: 'receita' },
          { label: 'Receita — Peças',             valor:  2400, tipo: 'receita' },
          { label: 'Receita — Taxa diagnóstico',  valor:  1400, tipo: 'receita' },
          { label: 'Subtotal receitas',           valor: receitas, tipo: 'subtotal' },
          { label: 'Despesa — Funcionários',      valor: -3300, tipo: 'despesa' },
          { label: 'Despesa — Peças ML',          valor: -2840, tipo: 'despesa' },
          { label: 'Despesa — Combustível',       valor:  -680, tipo: 'despesa' },
          { label: 'Despesa — Tráfego pago',      valor:  -500, tipo: 'despesa' },
          { label: 'Despesa — Utilidades',        valor:  -890, tipo: 'despesa' },
          { label: 'Despesa — Impostos',          valor: -2400, tipo: 'despesa' },
          { label: 'Despesa — Outras',            valor:  -930, tipo: 'despesa' },
          { label: 'Subtotal despesas',           valor: -despesas, tipo: 'subtotal' },
          { label: 'Lucro líquido',               valor: lucro, tipo: 'total' },
        ]} />
      </Card>

      <InsightIA T={T} dark={dark}
        markdown={markdown} loading={loading} error={error}
        onGerar={() => gerar('dre', dadosIA)}
        previewTexto="A IA vai analisar receitas, despesas e margem — destacando o que puxou pra cima, o que puxou pra baixo e ações pra atingir a meta de R$ 20.000." />
    </div>
  )
}

// =============================================================================
// FUNCIONÁRIOS + IA — mock
// TODO[ia]: trocar dados por agregação real de `os_historico` por
//   funcionario_id (junto com `usuarios`) + edge function Claude API
//   pra análise individual. Ver `contexto-relatorios.md` seção 4.
// =============================================================================
function RelatorioFuncionarios({ T, dark }) {
  const azul = corEtapa('blue', dark)

  const funcs = [
    { nome: 'Toni',       papel: 'Dono',      osTotal: 50, etapasFeitas: 145, tempoMedio: '0d 8h', pontuacao: 95 },
    { nome: 'Alessandro', papel: 'Logística', osTotal: 38, etapasFeitas:  76, tempoMedio: '0d 6h', pontuacao: 88 },
    { nome: 'Guilherme',  papel: 'Oficina',   osTotal: 42, etapasFeitas: 112, tempoMedio: '1d 4h', pontuacao: 91 },
  ]

  const { markdown, loading, error, gerar } = useRelatorioIA()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card T={T} dark={dark} padding={0}>
        <div style={{ padding: '12px 16px 10px' }}>
          <SectionHeader T={T} dark={dark} icon="ti-users" mb={0}>
            Performance da equipe
          </SectionHeader>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 90px 110px 110px 90px',
          gap: 10, padding: '8px 16px',
          borderTop: `1px solid ${T.border}`,
          background: T.cardAlt,
          fontSize: 10.5, color: T.textMuted, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          <div>Pessoa</div>
          <div style={{ textAlign: 'right' }}>OS</div>
          <div style={{ textAlign: 'right' }}>Etapas</div>
          <div style={{ textAlign: 'right' }}>Tempo médio</div>
          <div style={{ textAlign: 'right' }}>Score</div>
        </div>

        {funcs.map(f => (
          <div key={f.nome} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 110px 110px 90px',
            gap: 10, alignItems: 'center',
            padding: '14px 16px',
            borderTop: `1px solid ${T.border}`,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: corHero(dark) }}>{f.nome}</div>
              <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{f.papel}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: corHero(dark), fontVariantNumeric: 'tabular-nums' }}>
              {f.osTotal}
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
              {f.etapasFeitas}
            </div>
            <div style={{ textAlign: 'right', fontSize: 13, color: T.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
              {f.tempoMedio}
            </div>
            <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: azul, fontVariantNumeric: 'tabular-nums' }}>
              {f.pontuacao}
            </div>
          </div>
        ))}
      </Card>

      <InsightIA T={T} dark={dark}
        markdown={markdown} loading={loading} error={error}
        onGerar={() => gerar('funcionarios', { equipe: funcs })}
        previewTexto="A IA vai destacar pontos fortes, gargalos por pessoa e sugestões de treinamento — baseado nos números da tabela acima." />
    </div>
  )
}

// =============================================================================
// CALENDÁRIO (mês específico OU intervalo de datas)
// =============================================================================
function CalendarioPeriodo({
  T, dark,
  mesEsp, onMesEsp,
  dataIni, onDataIni,
  dataFim, onDataFim,
  temCustom, onLimpar,
}) {
  const azul = corEtapa('blue', dark)

  const baseInput = {
    height: 32,
    padding: '0 10px',
    fontSize: 12.5,
    color: T.textPrimary,
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    outline: 'none',
    fontFamily: 'inherit',
    boxShadow: T.shadow,
    colorScheme: dark ? 'dark' : 'light',
    transition: 'border-color .12s, box-shadow .12s',
  }

  function focar(e) {
    e.currentTarget.style.borderColor = azul
    e.currentTarget.style.boxShadow = `0 0 0 3px ${azul}22`
  }
  function desfocar(e) {
    e.currentTarget.style.borderColor = T.border
    e.currentTarget.style.boxShadow = T.shadow
  }

  const labelMini = {
    fontSize: 10.5, color: T.textMuted, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      paddingTop: 10, borderTop: `1px solid ${T.border}`,
    }}>
      <span style={{ ...labelMini, display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-calendar-event" style={{ fontSize: 14, color: azul }} aria-hidden="true" />
        Ou escolha:
      </span>

      {/* Mês específico */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11.5, color: T.textSecondary }}>Mês</span>
        <input type="month"
          value={mesEsp}
          onChange={(e) => onMesEsp(e.target.value)}
          onFocus={focar} onBlur={desfocar}
          style={baseInput}
          aria-label="Selecionar mês específico"
        />
      </label>

      <span style={{ fontSize: 11, color: T.textDim }}>ou</span>

      {/* Intervalo */}
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11.5, color: T.textSecondary }}>De</span>
        <input type="date"
          value={dataIni}
          max={dataFim || undefined}
          onChange={(e) => onDataIni(e.target.value)}
          onFocus={focar} onBlur={desfocar}
          style={baseInput}
          aria-label="Data inicial do período"
        />
      </label>
      <i className="ti ti-arrow-right" style={{ fontSize: 14, color: T.textDim }} aria-hidden="true" />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11.5, color: T.textSecondary }}>Até</span>
        <input type="date"
          value={dataFim}
          min={dataIni || undefined}
          onChange={(e) => onDataFim(e.target.value)}
          onFocus={focar} onBlur={desfocar}
          style={baseInput}
          aria-label="Data final do período"
        />
      </label>

      {temCustom && (
        <Button T={T} dark={dark} variant="ghost" size="sm" iconLeft="ti-x"
          onClick={onLimpar}>
          Limpar
        </Button>
      )}
    </div>
  )
}

// =============================================================================
// PRIMITIVOS REUTILIZÁVEIS
// =============================================================================
function KPI({ T, dark, label, valor, delta, cor, icon, sparkData, sparkCor, deltaInverso = false }) {
  // deltaInverso: pra métricas onde "baixar é bom" (ex: retrabalho, tempo médio).
  // Não muda a cor do badge (verde/vermelho é definido pelo sinal), só inverte se a "subida"
  // é positiva ou negativa pra UX. Como DeltaPill atual define pela aritmética, deixamos como está
  // — o ícone de tendência basta pra leitura.
  return (
    <Card T={T} dark={dark}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{
          fontSize: 10.5, color: T.textMuted, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {icon && <i className={`ti ${icon}`} style={{ fontSize: 14, color: cor }} aria-hidden="true" />}
          {label}
        </div>
        {delta != null && <DeltaPill value={delta} dark={dark} />}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
        marginBottom: sparkData ? 6 : 0,
      }}>
        {valor}
      </div>
      {sparkData && (
        <Sparkline data={sparkData} color={sparkCor || cor} height={32} />
      )}
    </Card>
  )
}

function BarrasCategoria({ T, dark, dados, total }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {dados.map(d => {
        const pct = total > 0 ? Math.round((d.valor / total) * 100) : 0
        return (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>
              <span>{d.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: corHero(dark), fontWeight: 600 }}>
                {d.valor} <span style={{ color: T.textMuted, fontWeight: 400 }}>· {pct}%</span>
              </span>
            </div>
            <div style={{
              width: '100%', height: 8, borderRadius: 5,
              background: T.cardAlt, overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: d.cor, transition: 'width .3s',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BarrasHorizontais({ T, dark, dados }) {
  const azul = corEtapa('blue', dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {dados.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: T.textSecondary, marginBottom: 4 }}>
            <span>{d.label}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: corHero(dark), fontWeight: 600 }}>{d.valor}</span>
          </div>
          <div style={{
            width: '100%', height: 6, borderRadius: 4,
            background: T.cardAlt, overflow: 'hidden',
          }}>
            <div style={{
              width: `${d.pct}%`, height: '100%',
              background: `linear-gradient(90deg, ${azul}, ${corEtapa('blueLight', dark)})`,
              transition: 'width .3s',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ListaSimples({ T, dark, itens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {itens.map((i, idx) => (
        <div key={idx} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '10px 12px',
          background: T.cardAlt,
          borderRadius: 8,
          border: `1px solid ${T.border}`,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: corHero(dark) }}>{i.titulo}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{i.detalhe}</div>
          </div>
          {i.badge && <Badge variant={i.badgeVar || 'neutro'} dark={dark} sm>{i.badge}</Badge>}
        </div>
      ))}
    </div>
  )
}

function DRELinhas({ T, dark, linhas }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {linhas.map((l, idx) => {
        const ehReceita = l.tipo === 'receita'
        const ehDespesa = l.tipo === 'despesa'
        const ehSubtotal = l.tipo === 'subtotal'
        const ehTotal = l.tipo === 'total'
        return (
          <div key={idx} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: ehTotal ? '14px 0 4px' : '8px 0',
            borderTop: idx > 0 && (ehSubtotal || ehTotal) ? `1px solid ${T.border}` : 'none',
            marginTop: ehTotal ? 6 : 0,
          }}>
            <span style={{
              fontSize: ehTotal ? 14 : 12.5,
              color: ehTotal ? corHero(dark) : ehSubtotal ? T.textPrimary : T.textSecondary,
              fontWeight: ehTotal ? 700 : ehSubtotal ? 600 : 400,
              paddingLeft: (ehReceita || ehDespesa) ? 14 : 0,
            }}>
              {l.label}
            </span>
            <span style={{
              fontSize: ehTotal ? 16 : 12.5,
              color: ehTotal ? corHero(dark)
                : ehReceita ? azul
                : ehDespesa ? amarelo
                : corHero(dark),
              fontWeight: ehTotal ? 800 : ehSubtotal ? 700 : 500,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtBRL(l.valor)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function InsightIA({ T, dark, disponivel = false, previewTexto, markdown, loading, error, onGerar }) {
  const azulClaro = corEtapa('blueLight', dark)
  const vermelho = corEtapa('red', dark)
  const cor = (d, c) => dark ? d : c

  // Estado do badge: pronto > gerando > erro > em breve / ativo
  const statusLabel = markdown ? 'Pronto'
    : loading ? 'Gerando…'
    : error ? 'Erro'
    : (disponivel || onGerar) ? 'Pronto pra rodar' : 'Em breve'

  return (
    <Card T={T} dark={dark} accent={azulClaro}
      style={{ background: cor('#0d2035', '#e6f1fb') + '40' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: bgEtapa('blueLight', dark),
          border: `1px solid ${azulClaro}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <i className="ti ti-sparkles" style={{ fontSize: 20, color: azulClaro }} aria-hidden="true" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: corHero(dark) }}>
              Insight da IA
            </span>
            <Badge variant="neutro" dark={dark} sm>{statusLabel}</Badge>
            <span style={{ fontSize: 10.5, color: T.textMuted }}>
              <i className="ti ti-cpu" style={{ marginRight: 3 }} aria-hidden="true" />
              claude-opus-4-7
            </span>
          </div>

          {markdown ? (
            <MarkdownView T={T} dark={dark} texto={markdown} />
          ) : loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textSecondary, fontSize: 12.5, padding: '6px 0' }}>
              <i className="ti ti-loader-2" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              Gerando análise com Claude API…
            </div>
          ) : error ? (
            <div style={{ fontSize: 12.5, color: vermelho, lineHeight: 1.5 }}>
              <i className="ti ti-alert-triangle" style={{ marginRight: 4 }} aria-hidden="true" />
              {error}
              {onGerar && (
                <div style={{ marginTop: 8 }}>
                  <Button T={T} dark={dark} variant="secondary" size="sm" iconLeft="ti-refresh" onClick={onGerar}>
                    Tentar de novo
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5, marginBottom: onGerar ? 10 : 0 }}>
                {previewTexto || 'A integração com a Claude API ainda não foi configurada nesta tela. Quando ativada, esta seção trará análise contextual dos números — comparações, alertas e sugestões.'}
              </div>
              {onGerar && (
                <Button T={T} dark={dark} variant="primary" size="sm" iconLeft="ti-sparkles" onClick={onGerar}>
                  Gerar análise agora
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

// Renderiza um subset de Markdown (## h2, **negrito**, listas - / *, parágrafos).
// Mantemos inline pra não adicionar dependência (regra: sem npm i sem aprovação).
function MarkdownView({ T, dark, texto }) {
  const azul = corEtapa('blue', dark)
  const blocos = parseMarkdown(texto || '')

  return (
    <div style={{
      fontSize: 12.5, color: T.textPrimary, lineHeight: 1.55,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {blocos.map((b, i) => {
        if (b.tipo === 'h2') {
          return (
            <div key={i} style={{
              fontSize: 13.5, fontWeight: 700, color: corHero(dark),
              borderBottom: `1px solid ${T.border}`,
              paddingBottom: 4, marginTop: i === 0 ? 0 : 6,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <i className="ti ti-point-filled" style={{ fontSize: 10, color: azul }} aria-hidden="true" />
              {renderInline(b.texto)}
            </div>
          )
        }
        if (b.tipo === 'h3') {
          return (
            <div key={i} style={{ fontSize: 12.5, fontWeight: 700, color: corHero(dark), marginTop: 4 }}>
              {renderInline(b.texto)}
            </div>
          )
        }
        if (b.tipo === 'ul') {
          return (
            <ul key={i} style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {b.itens.map((it, j) => (
                <li key={j} style={{ color: T.textSecondary }}>
                  {renderInline(it)}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <div key={i} style={{ color: T.textSecondary }}>
            {renderInline(b.texto)}
          </div>
        )
      })}
    </div>
  )
}

function parseMarkdown(md) {
  const linhas = md.replace(/\r\n/g, '\n').split('\n')
  const blocos = []
  let atual = null
  const fechar = () => { if (atual) { blocos.push(atual); atual = null } }
  for (const raw of linhas) {
    const linha = raw.replace(/\s+$/g, '')
    if (linha.startsWith('## ')) { fechar(); blocos.push({ tipo: 'h2', texto: linha.slice(3) }); continue }
    if (linha.startsWith('### ')) { fechar(); blocos.push({ tipo: 'h3', texto: linha.slice(4) }); continue }
    if (linha.startsWith('# ')) { fechar(); blocos.push({ tipo: 'h2', texto: linha.slice(2) }); continue }
    const liMatch = linha.match(/^\s*[-*]\s+(.*)$/)
    if (liMatch) {
      if (!atual || atual.tipo !== 'ul') { fechar(); atual = { tipo: 'ul', itens: [] } }
      atual.itens.push(liMatch[1])
      continue
    }
    if (linha.trim() === '') { fechar(); continue }
    if (!atual || atual.tipo !== 'p') { fechar(); atual = { tipo: 'p', texto: '' } }
    atual.texto += (atual.texto ? ' ' : '') + linha.trim()
  }
  fechar()
  return blocos
}

// Aplica **negrito** e `código` mantendo segurança (sem dangerouslySetInnerHTML).
function renderInline(texto) {
  if (!texto) return null
  const partes = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let ultimo = 0
  let m
  let k = 0
  while ((m = regex.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(<span key={`t${k++}`}>{texto.slice(ultimo, m.index)}</span>)
    const token = m[0]
    if (token.startsWith('**')) {
      partes.push(<strong key={`b${k++}`} style={{ fontWeight: 700 }}>{token.slice(2, -2)}</strong>)
    } else {
      partes.push(<code key={`c${k++}`} style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '0.92em', padding: '1px 5px', borderRadius: 4,
        background: 'rgba(127,127,127,0.15)',
      }}>{token.slice(1, -1)}</code>)
    }
    ultimo = m.index + token.length
  }
  if (ultimo < texto.length) partes.push(<span key={`t${k}`}>{texto.slice(ultimo)}</span>)
  return partes
}

// =============================================================================
// Estados auxiliares (loading / erro) usados pelos 4 relatórios reais
// =============================================================================
function RelatorioLoading({ T }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 48, color: T.textMuted, fontSize: 13, gap: 8,
    }}>
      <i className="ti ti-loader-2" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
      Carregando dados…
    </div>
  )
}

function RelatorioErro({ T, dark, msg }) {
  return (
    <Card T={T} dark={dark} accent={corEtapa('red', dark)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: corEtapa('red', dark) }}>
        <i className="ti ti-alert-triangle" style={{ fontSize: 20 }} aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Falha ao carregar relatório</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: T.textSecondary }}>{msg}</div>
    </Card>
  )
}
