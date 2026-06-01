// src/pages/ControleFinanceiroPF.jsx
// Controle financeiro pessoal (PF) do Toni — separado da empresa.
// Por enquanto le dados estaticos de src/data/controleFinanceiroPF.js;
// futuramente sera tabela propria (sistema isolado).

import React, { useMemo, useState } from 'react'
import { useIsMobile } from '../theme'
import { corEtapa, bgEtapa, corHero } from '../utils/colors'
import { fmtBRL } from '../utils/fmt'
import {
  Card, SubCard, Badge, EmptyState, PageHeader, SectionHeader, Tabs,
} from '../components/ui'
import {
  DESPESAS_PF_POR_MES,
  CATEGORIAS_FLUXO_INTERNO,
  maeDe,
} from '../data/controleFinanceiroPF'

const MESES_DISPONIVEIS = [
  { id: '2026-05', label: 'Maio/2026' },
]

const RENDA_ESTIMADA_PADRAO = null

export default function ControleFinanceiroPF({ T, dark }) {
  const isMobile = useIsMobile()
  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  const [mesAtivo, setMesAtivo] = useState('2026-05')
  const [pessoaAtiva, setPessoaAtiva] = useState('total') // total | toni | rafa
  const [verSecao, setVerSecao] = useState('dashboard') // dashboard | tabela | conselhos

  const despesas = (DESPESAS_PF_POR_MES[mesAtivo] || {})[pessoaAtiva] || []

  const analise = useMemo(() => analisarDespesas(despesas), [despesas])

  return (
    <div style={{
      padding: '20px 24px 32px', overflowY: 'auto', flex: 1,
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {!isMobile && (
        <PageHeader T={T} dark={dark}
          title="Controle Financeiro PF"
          subtitle="Suas finanças pessoais — separadas da empresa. Sistema isolado em breve."
          stats={[
            { label: 'Gasto total bruto', value: fmtBRL(analise.totalBruto), color: amarelo },
            { label: 'Gasto real (s/ transf)', value: fmtBRL(analise.totalReal), color: corHero(dark) },
            { label: 'Itens', value: analise.totalItens, color: azul },
          ]}
        />
      )}

      <Card T={T} dark={dark}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs T={T} dark={dark}
            options={MESES_DISPONIVEIS}
            value={mesAtivo}
            onChange={setMesAtivo}
            variant="segmented"
          />
          <Tabs T={T} dark={dark}
            options={[
              { id: 'total', label: 'Total (casal)' },
              { id: 'toni',  label: 'Toni (eu)' },
              { id: 'rafa',  label: 'Rafa' },
            ]}
            value={pessoaAtiva}
            onChange={setPessoaAtiva}
            variant="segmented"
          />
          <div style={{ flex: 1 }} />
          <Tabs T={T} dark={dark}
            options={[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'tabela',    label: 'Planilha completa' },
              { id: 'conselhos', label: 'Análise & conselhos' },
            ]}
            value={verSecao}
            onChange={setVerSecao}
            variant="segmented"
          />
        </div>
      </Card>

      {verSecao === 'dashboard' && (
        <Dashboard T={T} dark={dark} analise={analise} />
      )}
      {verSecao === 'tabela' && (
        <PlanilhaCompleta T={T} dark={dark} despesas={despesas} />
      )}
      {verSecao === 'conselhos' && (
        <ConselhosFinanceiros T={T} dark={dark} analise={analise} />
      )}
    </div>
  )
}

// =====================================================================
// Funções de análise
// =====================================================================
function analisarDespesas(despesas) {
  let totalBruto = 0
  let totalReal = 0
  let totalTransferencia = 0
  let totalFaturas = 0

  const porCategoria = {}
  const porCategoriaMae = {}
  const porOrigem = {}
  const porSemana = {}

  for (const d of despesas) {
    const v = Number(d.valor || 0)
    totalBruto += v

    if (d.categoria === 'Transferencia') {
      totalTransferencia += v
      continue
    }
    if (d.categoria === 'Cartao') {
      totalFaturas += v
      continue
    }

    totalReal += v

    porCategoria[d.categoria] = (porCategoria[d.categoria] || 0) + v
    const mae = maeDe(d.categoria)
    porCategoriaMae[mae] = (porCategoriaMae[mae] || 0) + v
    porOrigem[d.origem] = (porOrigem[d.origem] || 0) + v

    const [, , ] = d.data.split('/')
    const dataKey = isoDoDia(d.data)
    const semana = semanaDoMes(d.data)
    porSemana[semana] = (porSemana[semana] || 0) + v
  }

  const maiores = despesas
    .filter(d => !CATEGORIAS_FLUXO_INTERNO.has(d.categoria))
    .slice()
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 15)

  const sortValor = (a, b) => b.valor - a.valor
  const mapObj = (obj) => Object.entries(obj)
    .map(([k, v]) => ({ label: k, valor: v }))
    .sort(sortValor)

  return {
    totalBruto,
    totalReal,
    totalTransferencia,
    totalFaturas,
    totalItens: despesas.length,
    porCategoria: mapObj(porCategoria),
    porCategoriaMae: mapObj(porCategoriaMae),
    porOrigem: mapObj(porOrigem),
    porSemana,
    maiores,
  }
}

function isoDoDia(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/')
  return `${y}-${m}-${d}`
}

function semanaDoMes(ddmmyyyy) {
  const [d] = ddmmyyyy.split('/').map(Number)
  if (d <= 7) return 'Semana 1 (01–07)'
  if (d <= 14) return 'Semana 2 (08–14)'
  if (d <= 21) return 'Semana 3 (15–21)'
  return 'Semana 4 (22–31)'
}

// =====================================================================
// Dashboard
// =====================================================================
function Dashboard({ T, dark, analise }) {
  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPIs */}
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Gasto real efetivo" valor={fmtBRL(analise.totalReal)} cor={amarelo}
          icon="ti-shopping-cart"
          detalhe="Já desconta transferências internas e boletos de fatura" />
        <KPI T={T} dark={dark} label="Transferências entre contas" valor={fmtBRL(analise.totalTransferencia)} cor={azulClaro}
          icon="ti-transfer" detalhe="Não conta como gasto" />
        <KPI T={T} dark={dark} label="Pagamentos de fatura" valor={fmtBRL(analise.totalFaturas)} cor={azulClaro}
          icon="ti-credit-card" detalhe="Já contado item a item" />
        <KPI T={T} dark={dark} label="Total de lançamentos" valor={analise.totalItens} cor={azul}
          icon="ti-list-numbers" detalhe={`em ${analise.porOrigem.length} origens`} />
      </div>

      {/* Por categoria-mãe (macro) */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-chart-pie" mb={14}>
          Gastos por grande categoria
        </SectionHeader>
        <Barras T={T} dark={dark} itens={analise.porCategoriaMae} total={analise.totalReal} cor={amarelo} />
      </Card>

      {/* Por categoria específica */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-tags" mb={14}>
          Detalhado por categoria
        </SectionHeader>
        <Barras T={T} dark={dark} itens={analise.porCategoria} total={analise.totalReal} cor={azul} />
      </Card>

      {/* Por origem (cartão / conta) */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-credit-card" mb={14}>
          Por cartão / conta de origem
        </SectionHeader>
        <Barras T={T} dark={dark} itens={analise.porOrigem} total={analise.totalReal} cor={azulClaro} />
      </Card>

      {/* Top 15 maiores */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-list-numbers" mb={14}>
          Top 15 maiores gastos do mês
        </SectionHeader>
        <ListaMaiores T={T} dark={dark} itens={analise.maiores} />
      </Card>
    </div>
  )
}

// =====================================================================
// Planilha completa
// =====================================================================
function PlanilhaCompleta({ T, dark, despesas }) {
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  // Exclui fluxo interno (transferencias entre contas + pagamento de fatura)
  // pra planilha mostrar so gasto real. Categorias e filtros tambem se
  // baseiam nessa lista enxuta.
  const despesasReais = useMemo(
    () => despesas.filter(d => !CATEGORIAS_FLUXO_INTERNO.has(d.categoria)),
    [despesas]
  )

  const categorias = useMemo(() => {
    const s = new Set(despesasReais.map(d => d.categoria))
    return Array.from(s).sort()
  }, [despesasReais])

  const filtradas = useMemo(() => {
    const buscaLower = busca.toLowerCase().trim()
    return despesasReais.filter(d => {
      if (categoriaFiltro && d.categoria !== categoriaFiltro) return false
      if (buscaLower && !d.descricao.toLowerCase().includes(buscaLower)
          && !d.origem.toLowerCase().includes(buscaLower)) return false
      return true
    })
  }, [despesasReais, busca, categoriaFiltro])

  const totalFiltrado = filtradas.reduce((s, d) => s + d.valor, 0)

  return (
    <Card T={T} dark={dark}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Buscar descrição ou origem…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            flex: 1, minWidth: 200,
            background: T.cardAlt, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '8px 12px',
            color: T.textPrimary, fontSize: 13,
          }}
        />
        <select
          value={categoriaFiltro}
          onChange={e => setCategoriaFiltro(e.target.value)}
          style={{
            background: T.cardAlt, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '8px 12px',
            color: T.textPrimary, fontSize: 13,
          }}
        >
          <option value="">Todas categorias</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{
          padding: '8px 14px', background: bgEtapa('blue', dark),
          border: `1px solid ${corEtapa('blue', dark)}55`, borderRadius: 8,
          fontSize: 13, color: corHero(dark), fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {filtradas.length} itens · {fmtBRL(totalFiltrado, { fr: true })}
        </div>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '90px 1fr 1.5fr 130px 110px',
        gap: 8, padding: '8px 10px',
        background: T.cardAlt, borderRadius: 6,
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        <div>Data</div>
        <div>Origem</div>
        <div>Descrição</div>
        <div>Categoria</div>
        <div style={{ textAlign: 'right' }}>Valor</div>
      </div>

      <div style={{ maxHeight: 600, overflowY: 'auto' }}>
        {filtradas.map((d, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 1.5fr 130px 110px',
            gap: 8, padding: '10px',
            borderBottom: `1px solid ${T.border}`,
            fontSize: 12, color: T.textSecondary,
          }}>
            <div style={{ fontVariantNumeric: 'tabular-nums' }}>{d.data}</div>
            <div style={{ color: T.textMuted }}>{d.origem}</div>
            <div style={{ color: corHero(dark), fontWeight: 500 }}>{d.descricao}</div>
            <div>
              <Badge variant="amarelo" dark={dark} sm>
                {d.categoria}
              </Badge>
            </div>
            <div style={{
              textAlign: 'right', fontWeight: 600,
              color: corHero(dark),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtBRL(d.valor, { fr: true })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// =====================================================================
// Análise & Conselhos
// =====================================================================
function ConselhosFinanceiros({ T, dark, analise }) {
  const conselhos = useMemo(() => gerarConselhos(analise), [analise])
  const amarelo = corEtapa('yellow', dark)
  const azul = corEtapa('blue', dark)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-bulb" mb={14}>
          Análise automática
        </SectionHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conselhos.map((c, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '14px 16px',
              background: T.cardAlt,
              borderLeft: `3px solid ${c.severidade === 'alta' ? amarelo : azul}`,
              borderRadius: 6,
            }}>
              <i className={`ti ${c.icone}`} style={{
                fontSize: 22, color: c.severidade === 'alta' ? amarelo : azul,
                marginTop: 2,
              }} aria-hidden="true" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: corHero(dark), marginBottom: 4,
                }}>
                  {c.titulo}
                </div>
                <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.5 }}>
                  {c.texto}
                </div>
                {c.numero && (
                  <div style={{
                    marginTop: 8, fontSize: 18, fontWeight: 700,
                    color: c.severidade === 'alta' ? amarelo : azul,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {c.numero}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-target" mb={14}>
          Recomendações de ação
        </SectionHeader>
        <ul style={{ paddingLeft: 18, color: T.textSecondary, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          <li><b>Alimentação fora de casa</b>: iFood + Aiqfome + restaurantes pesam — meta de redução de 30% no próximo mês usando refeições em casa nos dias úteis.</li>
          <li><b>Combustível e manutenção do Focus</b>: somar PF dos veículos pra saber custo real ao mês. Se ultrapassar R$ 1k/mês, vale considerar reduzir uso ou planejar troca.</li>
          <li><b>Empréstimos PF</b>: liste cada empréstimo (parcela + saldo). Foco em quitar o de juros mais altos primeiro.</li>
          <li><b>Reserva de emergência</b>: definir % fixo de cada mês (sugestão: 10%) pra conta separada antes de pagar contas — pague-se primeiro.</li>
          <li><b>Cartões PF múltiplos</b>: você usa Elo Grafite + Visa Bradesco + Inter + Nubank + MP. Considere centralizar em 1 ou 2 pra reduzir anuidades e ter visão única.</li>
          <li><b>Doações</b>: parabéns por manter o dízimo. Mantenha previsto no orçamento como linha fixa.</li>
        </ul>
      </Card>
    </div>
  )
}

function gerarConselhos(analise) {
  const out = []
  const total = analise.totalReal

  const pct = (v) => total > 0 ? Math.round((v / total) * 100) : 0
  const valor = (cat) => analise.porCategoria.find(c => c.label === cat)?.valor || 0

  // Alimentação fora vs supermercado
  const alimFora = valor('Alimentacao')
  const superm = valor('Supermercado')
  if (alimFora > 0 || superm > 0) {
    const ratio = superm > 0 ? Math.round(alimFora / superm * 100) / 100 : 999
    out.push({
      icone: 'ti-tools-kitchen-2',
      severidade: alimFora > superm ? 'alta' : 'media',
      titulo: 'Alimentação: fora de casa vs supermercado',
      texto: `Você gastou ${fmtBRL(alimFora)} em alimentação fora (iFood, Aiqfome, restaurantes) e ${fmtBRL(superm)} em supermercado. ${alimFora > superm
        ? `Comer fora custa ${ratio}x o que você gasta em mercado — economia potencial real ao planejar refeições em casa.`
        : 'Boa relação. Continue priorizando mercado.'
      }`,
      numero: `${pct(alimFora)}% do gasto real`,
    })
  }

  // Veículos PF
  const carro = valor('Veiculo PF') + valor('Pedagio')
  if (carro > 0) {
    out.push({
      icone: 'ti-car',
      severidade: pct(carro) > 15 ? 'alta' : 'media',
      titulo: 'Veículos pessoais (Focus + Civic)',
      texto: `Manutenção, peças e pedágios somaram ${fmtBRL(carro)}. Esse valor inclui várias parcelas (peças do Focus, vistoria do Civic). Monitore se vai cair nos próximos meses ou se virou recorrente.`,
      numero: `${pct(carro)}% do gasto real`,
    })
  }

  // Empréstimos
  const empr = valor('Emprestimo')
  if (empr > 0) {
    out.push({
      icone: 'ti-cash-banknote-off',
      severidade: 'alta',
      titulo: 'Empréstimos consumiram parte importante do mês',
      texto: `Você pagou ${fmtBRL(empr)} em parcelas de empréstimo (carro PF). Esse é seu maior dreno fixo. Considere amortizar com receita extra ou refinanciar se juros forem altos.`,
      numero: `${pct(empr)}% do gasto real`,
    })
  }

  // Farmácia
  const farma = valor('Farmacia')
  if (farma > 0) {
    out.push({
      icone: 'ti-pill',
      severidade: pct(farma) > 8 ? 'alta' : 'media',
      titulo: 'Farmácia',
      texto: `Gasto com farmácia foi ${fmtBRL(farma)} (${pct(farma)}% do total). Se há remédios contínuos, considere genéricos ou farmácia popular. Se foram avulsos, sem ação.`,
      numero: `${pct(farma)}% do gasto real`,
    })
  }

  // Doações
  const doa = valor('Doacao/Igreja')
  if (doa > 0) {
    out.push({
      icone: 'ti-gift',
      severidade: 'media',
      titulo: 'Doações / dízimo',
      texto: `Você destinou ${fmtBRL(doa)} para doação/igreja. Bom mantê-lo no orçamento como linha fixa — assim não vira surpresa nem é cortado em apertos.`,
      numero: `${pct(doa)}% do gasto real`,
    })
  }

  // Vestuário & compras
  const vest = (valor('Vestuario') + valor('Compras pessoais'))
  if (vest > 0) {
    out.push({
      icone: 'ti-shopping-bag',
      severidade: pct(vest) > 12 ? 'alta' : 'media',
      titulo: 'Compras de vestuário e itens pessoais',
      texto: `Vestuário + compras pessoais totalizaram ${fmtBRL(vest)}. Muitas parcelas em andamento — vale uma lista de parcelas futuras pra antecipar comprometimento.`,
      numero: `${pct(vest)}% do gasto real`,
    })
  }

  // Tarifas + IOF
  const tarifas = valor('Tarifa banco') + valor('Tarifa cartao') + valor('IOF')
  if (tarifas > 0) {
    out.push({
      icone: 'ti-receipt-tax',
      severidade: tarifas > 100 ? 'alta' : 'media',
      titulo: 'Tarifas, IOF e anuidades',
      texto: `Você pagou ${fmtBRL(tarifas)} em tarifas/IOF/anuidades de cartões e contas. Cada cartão extra cobra anuidade e gera IOF — consolidar reduz isso.`,
      numero: `${pct(tarifas)}% do gasto real`,
    })
  }

  return out.sort((a, b) => (b.severidade === 'alta' ? 1 : 0) - (a.severidade === 'alta' ? 1 : 0))
}

// =====================================================================
// Auxiliares de UI
// =====================================================================
function KPI({ T, dark, label, valor, detalhe, cor, icon }) {
  return (
    <Card T={T} dark={dark}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 14, color: cor }} aria-hidden="true" />}
        {label}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: cor,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
      }}>
        {valor}
      </div>
      {detalhe && (
        <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
          {detalhe}
        </div>
      )}
    </Card>
  )
}

function Barras({ T, dark, itens, total, cor }) {
  if (!itens || itens.length === 0) {
    return <EmptyState T={T} compact icon="ti-chart-bar" title="Sem dados" description="" />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {itens.map(i => {
        const pct = total > 0 ? Math.round((i.valor / total) * 100) : 0
        return (
          <div key={i.label}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 12.5, marginBottom: 4,
            }}>
              <span style={{ color: T.textSecondary }}>{i.label}</span>
              <span style={{
                color: corHero(dark), fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtBRL(i.valor, { fr: true })}
                <span style={{ color: T.textMuted, fontWeight: 400, marginLeft: 6 }}>
                  · {pct}%
                </span>
              </span>
            </div>
            <div style={{
              width: '100%', height: 8, borderRadius: 5,
              background: T.cardAlt, overflow: 'hidden',
            }}>
              <div style={{
                width: `${pct}%`, height: '100%', background: cor,
                transition: 'width .3s',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ListaMaiores({ T, dark, itens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {itens.map((d, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '32px 1fr 130px 110px',
          gap: 12, alignItems: 'center',
          padding: '10px 8px',
          borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: T.textMuted, textAlign: 'center',
          }}>#{i + 1}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: corHero(dark),
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {d.descricao}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              {d.origem} · {d.data}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge variant="amarelo" dark={dark} sm>{d.categoria}</Badge>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: corEtapa('yellow', dark),
            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtBRL(d.valor, { fr: true })}
          </div>
        </div>
      ))}
    </div>
  )
}
