// src/components/osDetalhe/CustoMargemModal.jsx
// Custo e margem das peças do orçamento — aberto pelo menu "⋮" do Header
// (só dono). Mostra, item a item, o preço de venda cobrado no orçamento vs
// o custo real da peça no catálogo (custo_medio, fallback custo_atual —
// mesma convenção usada no cálculo de custo da máquina de Fabricação).
//
// Item avulso (texto livre, sem peca_id) não tem custo conhecido — mostra
// "—" e não entra no total de custo/margem (só no total de venda).

import React, { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { Modal, ModalHeader } from '../ui'
import { AtlPanel, ATL_FONT } from './acoes/_AtlassianUI'
import { corEtapa } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'

export default function CustoMargemModal({ T, dark, mobile, os, onClose }) {
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const vermelho = corEtapa('red', dark)

  const [itens, setItens] = useState([])
  const [servicos, setServicos] = useState([])
  const [deslocamentos, setDeslocamentos] = useState([])
  const [taxaJuros, setTaxaJuros] = useState(0)
  const [taxaPct, setTaxaPct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true); setErro(null)

      // Taxa da maquininha — quando o recebimento foi registrado com forma que
      // cobra taxa (crédito, link etc), FormRecebimento já grava uma despesa
      // "Taxa maquininha" separada em lancamento_financeiro, vinculada à OS
      // (osToFinanceiro.js). Soma isso aqui pra tirar do lucro.
      const { data: taxaRows, error: errTaxa } = await supabase
        .from('lancamento_financeiro')
        .select('valor')
        .eq('os_id', os.id)
        .eq('categoria', 'Taxa maquininha')
        .is('deleted_at', null)
      if (!cancel && !errTaxa) {
        setTaxaJuros((taxaRows || []).reduce((s, r) => s + (Number(r.valor) || 0), 0))
      }

      // % da taxa fica gravado na receita (não na despesa) — busca só pra exibir.
      const { data: receitaRows, error: errReceita } = await supabase
        .from('lancamento_financeiro')
        .select('taxa_pct')
        .eq('os_id', os.id)
        .eq('tipo', 'receita')
        .not('taxa_pct', 'is', null)
        .is('deleted_at', null)
      if (!cancel && !errReceita && receitaRows?.length) {
        setTaxaPct(Number(receitaRows[0].taxa_pct) || null)
      }

      const { data: rows, error: errItens } = await supabase
        .from('os_item')
        .select('id, nome, categoria, quantidade, valor_unitario, peca_id')
        .eq('os_id', os.id)
        .is('deleted_at', null)
        .order('criado_em', { ascending: true })
      if (cancel) return
      if (errItens) { setErro(errItens.message); setLoading(false); return }

      const pecaRows = (rows || []).filter(r => r.categoria === 'peca')
      const pecaIds = [...new Set(pecaRows.map(r => r.peca_id).filter(Boolean))]
      let custoPorPecaId = {}
      if (pecaIds.length) {
        const { data: pecas, error: errPecas } = await supabase
          .from('peca')
          .select('id, custo_medio, custo_atual')
          .in('id', pecaIds)
        if (!cancel && !errPecas) {
          custoPorPecaId = Object.fromEntries(
            (pecas || []).map(p => [p.id, Number(p.custo_medio) || Number(p.custo_atual) || 0])
          )
        }
      }

      const montados = pecaRows.map(r => {
        const qtd = Number(r.quantidade) || 0
        const vendaUnit = Number(r.valor_unitario) || 0
        const custoConhecido = r.peca_id != null && custoPorPecaId[r.peca_id] != null
        const custoUnit = custoConhecido ? custoPorPecaId[r.peca_id] : null
        return {
          id: r.id,
          nome: r.nome,
          qtd,
          vendaUnit,
          custoUnit,
          totalVenda: qtd * vendaUnit,
          totalCusto: custoUnit != null ? qtd * custoUnit : null,
        }
      })
      if (!cancel) {
        setItens(montados)
        setServicos((rows || []).filter(r => r.categoria === 'servico'))
        setDeslocamentos((rows || []).filter(r => r.categoria === 'desloc'))
        setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [os.id])

  const totalVenda = itens.reduce((s, i) => s + i.totalVenda, 0)
  const totalCusto = itens.reduce((s, i) => s + (i.totalCusto || 0), 0)
  const totalMargem = totalVenda - totalCusto
  const margemPct = totalVenda > 0 ? (totalMargem / totalVenda) * 100 : 0
  const temItemSemCusto = itens.some(i => i.custoUnit == null)

  // ── Margem total da OS: serviço e deslocamento não têm custo direto
  // conhecido no sistema (não existe "custo de mão de obra" cadastrado),
  // então a receita deles entra inteira como lucro. Peças entram só pelo
  // lucro (venda − custo real). Desconto e taxa da maquininha (se o
  // recebimento foi numa forma com taxa) saem do subtotal.
  const totalServicos = servicos.reduce((s, r) => s + (Number(r.quantidade) || 0) * (Number(r.valor_unitario) || 0), 0)
  const totalDeslocamento = deslocamentos.reduce((s, r) => s + (Number(r.quantidade) || 0) * (Number(r.valor_unitario) || 0), 0)
  const desconto = Number(os?.desconto || 0)
  const subtotalOS = totalServicos + totalDeslocamento + totalMargem
  const margemTotalOS = subtotalOS - desconto - taxaJuros
  const margemTotalPct = subtotalOS > 0 ? (margemTotalOS / subtotalOS) * 100 : 0

  return (
    <Modal T={T} dark={dark} mobile={mobile} onClose={onClose} maxWidth={560}>
      <ModalHeader T={T}
        title="Custo e margem da OS"
        subtitle={`OS #${os?.numero}`}
        icon="ti-report-money"
        onClose={onClose}
      />

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: mobile ? '14px' : '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
        fontFamily: ATL_FONT,
      }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.textMuted, fontSize: 13 }}>
            Calculando…
          </div>
        ) : erro ? (
          <div style={{ padding: 24, textAlign: 'center', color: vermelho, fontSize: 13 }}>
            Erro: {erro}
          </div>
        ) : (
          <>
            {/* Margem total da OS — visão geral: mão de obra + deslocamento
                entram inteiros (sem custo direto conhecido), peças só pelo
                lucro, desconto sai do total. */}
            <AtlPanel T={T} dark={dark} title="Margem total da OS">
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Linha T={T} label="Mão de obra (serviços)" valor={fmtBRL(totalServicos)} cor={T.textPrimary} />
                <Linha T={T} label="Deslocamento" valor={fmtBRL(totalDeslocamento)} cor={T.textPrimary} />
                <Linha T={T} label="Lucro de peças (venda − custo)" valor={fmtBRL(totalMargem)} cor={totalMargem >= 0 ? verde : vermelho} />
                <div style={{ height: 1, background: T.border, margin: '2px 0' }} />
                <Linha T={T} label="Subtotal" valor={fmtBRL(subtotalOS)} cor={T.textPrimary} />
                {desconto > 0 && (
                  <Linha T={T} label="Desconto" valor={`− ${fmtBRL(desconto)}`} cor={vermelho} />
                )}
                {taxaJuros > 0 && (
                  <Linha T={T}
                    label={taxaPct != null ? `Taxa da maquininha (${taxaPct.toFixed(1)}%)` : 'Taxa da maquininha'}
                    valor={`− ${fmtBRL(taxaJuros)}`}
                    cor={vermelho}
                  />
                )}
                <div style={{ height: 1, background: T.border, margin: '2px 0' }} />
                <Linha T={T}
                  label="Margem total"
                  valor={`${fmtBRL(margemTotalOS)} · ${margemTotalPct.toFixed(0)}%`}
                  cor={margemTotalOS >= 0 ? verde : vermelho}
                  grande
                />
              </div>
            </AtlPanel>

            {itens.length === 0 ? (
              <div style={{ padding: '4px 4px 8px', textAlign: 'center', color: T.textMuted, fontSize: 12.5 }}>
                Nenhuma peça no orçamento dessa OS.
              </div>
            ) : (
            <>
            <AtlPanel T={T} dark={dark} title="Peças do orçamento">
              {itens.map((it, i) => {
                const pctItem = it.custoUnit != null && it.vendaUnit > 0
                  ? ((it.vendaUnit - it.custoUnit) / it.vendaUnit) * 100
                  : null
                return (
                  <div key={it.id} style={{
                    padding: '10px 14px',
                    borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, color: T.textPrimary, fontWeight: 600,
                      marginBottom: 6,
                    }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.nome}
                      </span>
                      <span style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, flexShrink: 0 }}>{it.qtd}×</span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                      <span style={{ color: T.textMuted }}>
                        Venda <strong style={{ color: T.textPrimary, fontVariantNumeric: 'tabular-nums' }}>{fmtBRL(it.totalVenda)}</strong>
                      </span>
                      <span style={{ color: T.textMuted }}>
                        Custo <strong style={{ color: it.totalCusto != null ? T.textPrimary : T.textDim, fontVariantNumeric: 'tabular-nums' }}>
                          {it.totalCusto != null ? fmtBRL(it.totalCusto) : '—'}
                        </strong>
                      </span>
                      <span style={{ color: T.textMuted, marginLeft: 'auto' }}>
                        Margem{' '}
                        <strong style={{
                          color: pctItem == null ? T.textDim : pctItem >= 0 ? verde : vermelho,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {pctItem == null ? '—' : `${fmtBRL(it.totalVenda - it.totalCusto)} · ${pctItem.toFixed(0)}%`}
                        </strong>
                      </span>
                    </div>
                  </div>
                )
              })}
              <div style={{
                padding: '10px 14px',
                borderTop: `1px solid ${T.border}`,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <Linha T={T} label="Total de venda" valor={fmtBRL(totalVenda)} cor={T.textPrimary} />
                <Linha T={T} label="Total de custo" valor={fmtBRL(totalCusto)} cor={T.textPrimary} />
                <Linha T={T}
                  label="Subtotal (margem das peças)"
                  valor={`${fmtBRL(totalMargem)} · ${margemPct.toFixed(0)}%`}
                  cor={totalMargem >= 0 ? verde : vermelho}
                />
              </div>
            </AtlPanel>

            {temItemSemCusto && (
              <div style={{
                fontSize: 11.5, color: T.textDim, lineHeight: 1.4,
                display: 'flex', alignItems: 'flex-start', gap: 6,
              }}>
                <i className="ti ti-info-circle" style={{ fontSize: 13, marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
                <span>Item avulso (texto livre, sem vínculo com o catálogo) não tem custo conhecido — aparece com "—" e não entra no total de custo/margem.</span>
              </div>
            )}
            </>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

function Linha({ label, valor, cor, grande, T }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: grande ? 13 : 12.5, color: T.textMuted, fontWeight: 600 }}>{label}</span>
      <span style={{
        fontSize: grande ? 18 : 13.5, fontWeight: 700, color: cor,
        fontVariantNumeric: 'tabular-nums',
      }}>{valor}</span>
    </div>
  )
}
