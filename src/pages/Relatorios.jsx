// idemaq-src/pages/Relatorios.jsx
// Tela de Relatórios — hub + 6 relatórios (Módulo 08 do plano).
// MVP visual: usa Sparkline (já existe) e barras SVG inline pra evitar
// Chart.js neste primeiro passo. IA financeira fica como placeholder.
// Visível pro dono (Toni); RLS no banco vai definir o que cada papel vê.

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

// === Dados mock — todos coerentes com R$ 17.500/mês · 50 OS/mês · ticket R$ 350 ===
const FAT_12M = [13800, 14200, 15100, 15600, 14900, 16200, 17000, 17500, 16800, 17900, 18200, 17500]
const OS_12M  = [42, 45, 47, 48, 46, 50, 51, 50, 49, 52, 53, 50]

// === Página ===
export default function Relatorios({ T, dark }) {
  const notify = useToast()
  const [relAtivo, setRelAtivo] = useState(null) // null = hub
  const [periodo, setPeriodo] = useState('mes')

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
          ? `${RELATORIOS.find(r => r.id === relAtivo)?.label} · período ${PERIODOS.find(p => p.id === periodo)?.label.toLowerCase()}`
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
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tabs T={T} dark={dark}
              options={PERIODOS}
              value={periodo}
              onChange={setPeriodo}
              variant="segmented"
            />
            <div style={{ flex: 1, fontSize: 11, color: T.textMuted, textAlign: 'right' }}>
              <i className="ti ti-info-circle" style={{ marginRight: 4 }} aria-hidden="true" />
              Dados de exemplo — integração com Supabase virá nos próximos chats
            </div>
          </div>
        </Card>
      )}

      {!relAtivo ? (
        <RelatoriosHub T={T} dark={dark} onAbrir={setRelAtivo} />
      ) : (
        <>
          {relAtivo === 'geral'        && <RelatorioGeral        T={T} dark={dark} periodo={periodo} />}
          {relAtivo === 'operacional'  && <RelatorioOperacional  T={T} dark={dark} periodo={periodo} />}
          {relAtivo === 'estoque'      && <RelatorioEstoque      T={T} dark={dark} periodo={periodo} />}
          {relAtivo === 'vendas'       && <RelatorioVendas       T={T} dark={dark} periodo={periodo} />}
          {relAtivo === 'financeiro'   && <RelatorioFinanceiro   T={T} dark={dark} periodo={periodo} />}
          {relAtivo === 'funcionarios' && <RelatorioFuncionarios T={T} dark={dark} periodo={periodo} />}
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
// GERAL
// =============================================================================
function RelatorioGeral({ T, dark, periodo }) {
  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const amarelo = corEtapa('yellow', dark)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}>
        <KPI T={T} dark={dark} label="Faturamento" valor={fmtBRL(17500)} delta={4} cor={azul}
          sparkData={FAT_12M} sparkCor={azul} icon="ti-cash" />
        <KPI T={T} dark={dark} label="OS no período" valor={50} delta={2} cor={corHero(dark)}
          sparkData={OS_12M} sparkCor={azulClaro} icon="ti-clipboard-list" />
        <KPI T={T} dark={dark} label="Ticket médio" valor={fmtBRL(350)} delta={1} cor={corHero(dark)}
          icon="ti-receipt" />
        <KPI T={T} dark={dark} label="Margem operacional" valor="34%" delta={2} cor={azul}
          icon="ti-percentage" />
      </div>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-chart-bar" mb={14}>
          Distribuição por tipo de OS
        </SectionHeader>
        <BarrasCategoria T={T} dark={dark} dados={[
          { label: 'Atendimento', valor: 38, cor: azul },
          { label: 'Fabricação',  valor:  8, cor: amarelo },
          { label: 'Venda',       valor:  4, cor: azulClaro },
        ]} total={50} />
      </Card>

      <InsightIA T={T} dark={dark} disponivel={false} />
    </div>
  )
}

// =============================================================================
// OS OPERACIONAL
// =============================================================================
function RelatorioOperacional({ T, dark, periodo }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Lead time médio" valor="3d 6h" delta={-12} cor={azul}
          icon="ti-clock" deltaInverso />
        <KPI T={T} dark={dark} label="OS concluídas" valor={46} delta={5} cor={corHero(dark)}
          icon="ti-circle-check" />
        <KPI T={T} dark={dark} label="Recusadas" valor={4} delta={-1} cor={amarelo}
          icon="ti-x" deltaInverso />
        <KPI T={T} dark={dark} label="Retrabalho" valor="6%" delta={2} cor={vermelho}
          icon="ti-rotate-clockwise" deltaInverso />
      </div>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-hourglass" mb={14}>
          Tempo médio por etapa
        </SectionHeader>
        <BarrasHorizontais T={T} dark={dark} dados={[
          { label: 'Aguardando agendamento', valor: '1d 4h', pct: 22 },
          { label: 'Agendado',               valor: '0d 6h', pct: 5 },
          { label: 'Recebido',               valor: '0d 8h', pct: 7 },
          { label: 'Diagnóstico',            valor: '1d 2h', pct: 18 },
          { label: 'Orçamento',              valor: '0d 18h', pct: 12 },
          { label: 'Em oficina',             valor: '1d 12h', pct: 25 },
          { label: 'Teste final',            valor: '0d 4h', pct: 4 },
          { label: 'Entrega',                valor: '0d 12h', pct: 7 },
        ]} />
      </Card>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-alert-triangle" mb={14}>
          Gargalos identificados
        </SectionHeader>
        <ListaSimples T={T} dark={dark} itens={[
          { titulo: 'Em oficina', detalhe: 'Concentra 25% do lead time', badge: 'Crítico', badgeVar: 'vermelho' },
          { titulo: 'Aguardando agendamento', detalhe: 'OS ficam paradas 1d4h em média', badge: 'Atenção', badgeVar: 'amarelo' },
          { titulo: 'Diagnóstico', detalhe: 'Tempo aceitável mas com picos', badge: 'OK', badgeVar: 'azul' },
        ]} />
      </Card>
    </div>
  )
}

// =============================================================================
// ESTOQUE
// =============================================================================
function RelatorioEstoque({ T, dark, periodo }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Itens em estoque" valor={53} delta={-3} cor={corHero(dark)}
          icon="ti-package" />
        <KPI T={T} dark={dark} label="Valor parado" valor={fmtBRL(4280)} delta={-5} cor={azul}
          icon="ti-cash" />
        <KPI T={T} dark={dark} label="Estoque baixo" valor={3} delta={1} cor={amarelo}
          icon="ti-alert-triangle" deltaInverso />
        <KPI T={T} dark={dark} label="Giro médio" valor="42d" delta={-8} cor={azul}
          icon="ti-rotate" deltaInverso />
      </div>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-trending-up" mb={14}>
          Peças mais usadas no período
        </SectionHeader>
        <BarrasHorizontais T={T} dark={dark} dados={[
          { label: 'Capa Brastemp 12kg',         valor: '18 un', pct: 95 },
          { label: 'Filtro pluma LG 11kg',       valor: '15 un', pct: 79 },
          { label: 'Mangueira admissão Consul',  valor: '12 un', pct: 63 },
          { label: 'Correia transmissão',        valor:  '8 un', pct: 42 },
          { label: 'Capacitor 8μF',              valor:  '6 un', pct: 31 },
        ]} />
      </Card>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-alert-octagon" mb={14}>
          Peças paradas (sem giro)
        </SectionHeader>
        <ListaSimples T={T} dark={dark} itens={[
          { titulo: 'Placa eletrônica LG WD-1014', detalhe: 'Sem saída há 87 dias · custo R$ 280', badge: '87d', badgeVar: 'amarelo' },
          { titulo: 'Termostato Brastemp 220V',     detalhe: 'Sem saída há 45 dias · custo R$ 55',  badge: '45d', badgeVar: 'azul' },
        ]} />
      </Card>
    </div>
  )
}

// =============================================================================
// VENDAS
// =============================================================================
function RelatorioVendas({ T, dark, periodo }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Conversão orçamento" valor="88%" delta={3} cor={azul}
          icon="ti-target-arrow" />
        <KPI T={T} dark={dark} label="Ticket médio" valor={fmtBRL(350)} delta={4} cor={corHero(dark)}
          sparkData={[320,330,340,335,345,350]} sparkCor={azul} icon="ti-receipt" />
        <KPI T={T} dark={dark} label="Máquinas vendidas" valor={4} delta={2} cor={corHero(dark)}
          icon="ti-device-washing-machine" />
        <KPI T={T} dark={dark} label="Receita máquinas" valor={fmtBRL(2600)} delta={2} cor={azul}
          icon="ti-cash" />
      </div>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-funnel" mb={14}>
          Funil de OS
        </SectionHeader>
        <BarrasHorizontais T={T} dark={dark} dados={[
          { label: 'Agendadas',  valor: '52 OS', pct: 100 },
          { label: 'Recebidas',  valor: '50 OS', pct: 96 },
          { label: 'Orçadas',    valor: '47 OS', pct: 90 },
          { label: 'Aprovadas',  valor: '42 OS', pct: 81 },
          { label: 'Entregues',  valor: '40 OS', pct: 77 },
          { label: 'Pagas',      valor: '38 OS', pct: 73 },
        ]} />
      </Card>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-star" mb={14}>
          Serviços mais vendidos
        </SectionHeader>
        <BarrasCategoria T={T} dark={dark} dados={[
          { label: 'Manutenção',         valor: 32, cor: azul },
          { label: 'Limpeza',            valor: 28, cor: corEtapa('blueLight', dark) },
          { label: 'Limpeza combinada',  valor: 14, cor: amarelo },
          { label: 'Venda de máquina',   valor:  4, cor: corEtapa('green', dark) },
        ]} total={78} />
      </Card>
    </div>
  )
}

// =============================================================================
// FINANCEIRO (DRE) + IA
// =============================================================================
function RelatorioFinanceiro({ T, dark, periodo }) {
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const verde = corEtapa('green', dark)

  const receitas = 17500
  const despesas = 11540
  const lucro = receitas - despesas
  const margem = Math.round((lucro / receitas) * 100)

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

      <InsightIA T={T} dark={dark} disponivel={false}
        previewTexto="Quando ativarmos a integração com a Claude API, este bloco vai trazer análise dos números do DRE — comparação com o mês passado, alertas sobre categorias em desvio e sugestões pra atingir a meta de R$ 20.000." />
    </div>
  )
}

// =============================================================================
// FUNCIONÁRIOS + IA
// =============================================================================
function RelatorioFuncionarios({ T, dark, periodo }) {
  const azul = corEtapa('blue', dark)

  const funcs = [
    { nome: 'Toni',       papel: 'Dono',      osTotal: 50, etapasFeitas: 145, tempoMedio: '0d 8h', pontuacao: 95 },
    { nome: 'Alessandro', papel: 'Logística', osTotal: 38, etapasFeitas:  76, tempoMedio: '0d 6h', pontuacao: 88 },
    { nome: 'Guilherme',  papel: 'Oficina',   osTotal: 42, etapasFeitas: 112, tempoMedio: '1d 4h', pontuacao: 91 },
  ]

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

      <InsightIA T={T} dark={dark} disponivel={false}
        previewTexto="Aqui virá análise individual por funcionário (pontos fortes, etapas que demoram mais, sugestões de treinamento) gerada pela IA a partir do histórico de os_historico." />
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

function InsightIA({ T, dark, disponivel = false, previewTexto }) {
  const azulClaro = corEtapa('blueLight', dark)
  const cor = (d, c) => dark ? d : c
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
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: corHero(dark) }}>
              Insight da IA
            </span>
            <Badge variant="neutro" dark={dark} sm>
              {disponivel ? 'Ativo' : 'Em breve'}
            </Badge>
          </div>
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.5 }}>
            {previewTexto || 'A integração com a Claude API ainda não foi configurada nesta tela. Quando ativada, esta seção trará análise contextual dos números — comparações, alertas e sugestões.'}
          </div>
        </div>
      </div>
    </Card>
  )
}
