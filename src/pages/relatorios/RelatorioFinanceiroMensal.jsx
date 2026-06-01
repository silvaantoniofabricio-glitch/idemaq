// src/pages/relatorios/RelatorioFinanceiroMensal.jsx
// Relatório financeiro completo (mensal). Dados reais do Supabase via
// useRelatorioFinanceiroMensal. Não depende de IA, não depende de edge function.

import React from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import { Card, SubCard, Badge, EmptyState, SectionHeader, DeltaPill } from '../../components/ui'
import { useRelatorioFinanceiroMensal } from '../../hooks/useRelatorios'

const FORMA_LABEL = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  credito_1x: 'Crédito 1x',
  credito_parcelado: 'Crédito parcelado',
  link_pagamento: 'Link InfinitePay',
  debito_automatico: 'Débito automático',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  'Sem forma': 'Sem forma',
}

function fmtDataDDMM(iso) {
  if (!iso) return '—'
  const [, m, d] = String(iso).split('-')
  return `${d}/${m}`
}

export default function RelatorioFinanceiroMensal({ T, dark, iniIso, fimIso }) {
  const azul = corEtapa('blue', dark)
  const azulClaro = corEtapa('blueLight', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)
  const { data, loading, error } = useRelatorioFinanceiroMensal({ iniIso, fimIso })

  if (loading) return <Loading T={T} />
  if (error)   return <Erro T={T} dark={dark} msg={error} />
  if (!data)   return null

  const semDados = data.totalLancamentos === 0

  if (semDados) {
    return (
      <EmptyState T={T} icon="ti-report-money"
        title="Sem lançamentos no período"
        description="Esse relatório usa lançamentos pagos (regime de caixa) e contas em aberto com vencimento no período. Ajuste o filtro acima." />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* === Topo: 6 KPIs === */}
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      }}>
        <KPI T={T} dark={dark} label="Receita bruta" valor={fmtBRL(data.receitas)}
          cor={azul} delta={data.delta.receitas} icon="ti-arrow-down-circle" />
        <KPI T={T} dark={dark} label="Receita líquida" valor={fmtBRL(data.receitaLiquida)}
          cor={azulClaro} icon="ti-cash" detalhe={`(− ${fmtBRL(data.totalTaxasMaq)} em taxas)`} />
        <KPI T={T} dark={dark} label="Despesas pagas" valor={fmtBRL(data.despesas)}
          cor={amarelo} delta={data.delta.despesas} icon="ti-arrow-up-circle" deltaInverso />
        <KPI T={T} dark={dark} label="Resultado" valor={fmtBRL(data.lucro)}
          cor={data.lucro >= 0 ? azul : vermelho} delta={data.delta.lucro} icon="ti-trending-up" />
        <KPI T={T} dark={dark} label="Margem" valor={`${data.margem}%`}
          cor={corHero(dark)} icon="ti-percentage" />
        <KPI T={T} dark={dark} label="A receber" valor={fmtBRL(data.aReceber)}
          cor={azulClaro} icon="ti-clock" detalhe={data.aPagar > 0 ? `A pagar: ${fmtBRL(data.aPagar)}` : null} />
      </div>

      {/* === Receitas por categoria + por forma + por conta === */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-arrow-down-circle" mb={14}>
          Receitas detalhadas
        </SectionHeader>
        <div style={{
          display: 'grid', gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}>
          <TabelaCategorias T={T} dark={dark} titulo="Por categoria"
            itens={data.receitasPorCategoria} total={data.receitas} cor={azul} />
          <TabelaCategorias T={T} dark={dark} titulo="Por forma de pagamento"
            itens={data.receitasPorForma.map(r => ({ ...r, label: FORMA_LABEL[r.label] || r.label }))}
            total={data.receitas} cor={azulClaro} />
          <TabelaCategorias T={T} dark={dark} titulo="Por conta de recebimento"
            itens={data.receitasPorConta} total={data.receitas} cor={azul} />
        </div>
      </Card>

      {/* === Despesas por categoria + por conta === */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-arrow-up-circle" mb={14}>
          Despesas detalhadas
        </SectionHeader>
        <div style={{
          display: 'grid', gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}>
          <TabelaCategorias T={T} dark={dark} titulo="Por categoria"
            itens={data.despesasPorCategoria} total={data.despesas} cor={amarelo} />
          <TabelaCategorias T={T} dark={dark} titulo="Por conta de saída"
            itens={data.despesasPorConta} total={data.despesas} cor={amarelo} />
        </div>
      </Card>

      {/* === Top 10 maiores despesas === */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-list-numbers" mb={14}>
          Top 10 maiores despesas individuais
        </SectionHeader>
        <ListaDespesas T={T} dark={dark} itens={data.maioresDespesas} />
      </Card>

      {/* === A receber + A pagar === */}
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      }}>
        <Card T={T} dark={dark}>
          <SectionHeader T={T} dark={dark} icon="ti-clock" mb={14}>
            A receber no período ({fmtBRL(data.aReceber)})
          </SectionHeader>
          {data.aReceberLista.length === 0 ? (
            <EmptyState T={T} compact icon="ti-check"
              title="Nada em aberto"
              description="Todas as receitas com vencimento no período foram baixadas." />
          ) : (
            <ListaAbertos T={T} dark={dark} itens={data.aReceberLista} cor={azulClaro} />
          )}
        </Card>

        <Card T={T} dark={dark}>
          <SectionHeader T={T} dark={dark} icon="ti-clock" mb={14}>
            A pagar no período ({fmtBRL(data.aPagar)})
          </SectionHeader>
          {data.aPagarLista.length === 0 ? (
            <EmptyState T={T} compact icon="ti-check"
              title="Nada em aberto"
              description="Todas as despesas com vencimento no período foram baixadas." />
          ) : (
            <ListaAbertos T={T} dark={dark} itens={data.aPagarLista} cor={amarelo} />
          )}
        </Card>
      </div>

      {/* === Fluxo diário === */}
      <Card T={T} dark={dark}>
        <SectionHeader T={T} dark={dark} icon="ti-chart-bar" mb={14}>
          Fluxo de caixa por dia
        </SectionHeader>
        <FluxoDiario T={T} dark={dark} dados={data.fluxoDias} />
      </Card>
    </div>
  )
}

// =====================================================================
// Subcomponentes
// =====================================================================

function KPI({ T, dark, label, valor, delta, cor, icon, detalhe, deltaInverso }) {
  return (
    <Card T={T} dark={dark}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 10, marginBottom: 8,
      }}>
        <div style={{
          fontSize: 10.5, color: T.textMuted, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {icon && <i className={`ti ${icon}`} style={{ fontSize: 14, color: cor }} aria-hidden="true" />}
          {label}
        </div>
        {delta != null && <DeltaPill value={deltaInverso ? -delta : delta} dark={dark} />}
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

function TabelaCategorias({ T, dark, titulo, itens, total, cor }) {
  return (
    <SubCard T={T} dark={dark} title={titulo}>
      {itens.length === 0 ? (
        <div style={{ fontSize: 12, color: T.textMuted, padding: '8px 0' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {itens.map(i => {
            const pct = total > 0 ? Math.round((i.valor / total) * 100) : 0
            return (
              <div key={i.label}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 12, marginBottom: 4,
                }}>
                  <span style={{ color: T.textSecondary }}>{i.label}</span>
                  <span style={{
                    color: corHero(dark), fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmtBRL(i.valor)}
                    <span style={{ color: T.textMuted, fontWeight: 400, marginLeft: 6 }}>
                      · {pct}%
                    </span>
                  </span>
                </div>
                <div style={{
                  width: '100%', height: 6, borderRadius: 4,
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
      )}
    </SubCard>
  )
}

function ListaDespesas({ T, dark, itens }) {
  if (itens.length === 0) {
    return <EmptyState T={T} compact icon="ti-list" title="Sem despesas no período" description="" />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {itens.map((d, i) => (
        <div key={d.id} style={{
          display: 'grid', gridTemplateColumns: '32px 1fr 110px 90px',
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
              {d.descricao || d.categoria}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              {d.categoria} · {d.conta} · {fmtDataDDMM(d.pago_em)}
            </div>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: corEtapa('yellow', dark),
            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtBRL(d.valor)}
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge variant="amarelo" dark={dark} sm>{d.conta}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}

function ListaAbertos({ T, dark, itens, cor }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {itens.map((it, i) => (
        <div key={it.id} style={{
          display: 'grid', gridTemplateColumns: '1fr 110px 60px',
          gap: 12, alignItems: 'center',
          padding: '10px 8px',
          borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: corHero(dark),
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {it.descricao || it.categoria}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
              {it.categoria}
            </div>
          </div>
          <div style={{
            fontSize: 13, fontWeight: 700, color: cor,
            textAlign: 'right', fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtBRL(it.valor)}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, textAlign: 'right' }}>
            {fmtDataDDMM(it.vencimento)}
          </div>
        </div>
      ))}
    </div>
  )
}

function FluxoDiario({ T, dark, dados }) {
  if (!dados || dados.length === 0) {
    return <EmptyState T={T} compact icon="ti-chart-bar" title="Sem movimentação" description="" />
  }
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const maxV = Math.max(...dados.map(d => Math.max(d.entrada, d.saida)), 1)

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        padding: '8px 4px 4px', minHeight: 160,
      }}>
        {dados.map(d => {
          const hEntrada = Math.round((d.entrada / maxV) * 130)
          const hSaida = Math.round((d.saida / maxV) * 130)
          return (
            <div key={d.dia} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, minWidth: 36,
            }}
            title={`${d.dia}\nEntrada: ${fmtBRL(d.entrada)}\nSaída: ${fmtBRL(d.saida)}\nSaldo: ${fmtBRL(d.saldo)}`}
            >
              <div style={{
                display: 'flex', alignItems: 'flex-end', gap: 2, height: 130,
              }}>
                <div style={{
                  width: 12, height: hEntrada, background: azul, borderRadius: '3px 3px 0 0',
                }} />
                <div style={{
                  width: 12, height: hSaida, background: amarelo, borderRadius: '3px 3px 0 0',
                }} />
              </div>
              <div style={{ fontSize: 10, color: T.textMuted }}>
                {fmtDataDDMM(d.dia)}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{
        display: 'flex', gap: 16, justifyContent: 'center',
        fontSize: 11, color: T.textMuted, marginTop: 8,
      }}>
        <span><span style={{
          display: 'inline-block', width: 10, height: 10,
          background: azul, borderRadius: 2, marginRight: 4,
        }} />Entradas</span>
        <span><span style={{
          display: 'inline-block', width: 10, height: 10,
          background: amarelo, borderRadius: 2, marginRight: 4,
        }} />Saídas</span>
      </div>
    </div>
  )
}

function Loading({ T }) {
  return (
    <Card T={T}>
      <div style={{ padding: '40px 20px', textAlign: 'center', color: T.textMuted }}>
        <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} aria-hidden="true" />
        <div style={{ marginTop: 10, fontSize: 13 }}>Carregando relatório financeiro…</div>
      </div>
    </Card>
  )
}

function Erro({ T, dark, msg }) {
  return (
    <Card T={T} dark={dark}>
      <EmptyState T={T} icon="ti-alert-triangle" title="Erro ao carregar" description={msg} />
    </Card>
  )
}
