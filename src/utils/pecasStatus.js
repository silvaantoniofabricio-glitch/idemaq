// src/utils/pecasStatus.js
// Status de "peças a comprar" de uma OS, pro chip Manut. do card do Kanban.
//
// Cores do chip Manut.:
//   - 'falta'    (vermelho): tem peça do orçamento zerada e ainda NÃO comprada
//   - 'comprado' (amarelo):  compra feita, peça ainda não chegou
//   - null:                  tem em estoque / já chegou (chip fica neutro)
//
// O status por peça vive em os.pre_diagnostico.compra_pecas[<os_item_id>].status
// e o estoque atual vem do catálogo (peca.qtd_atual), buscado no nível do Kanban.

import { supabase } from '../supabase'

/**
 * Decide a cor do chip Manut. de uma OS.
 * @param {object} os    — objeto da OS (precisa de pre_diagnostico)
 * @param {Array}  parts — [{ itemId, qtd, qtdAtual }] das peças do catálogo da OS
 * @returns {'falta'|'comprado'|null}
 */
export function calcManutPecaStatus(os, parts) {
  if (!parts || !parts.length) return null
  const compra = os?.pre_diagnostico?.compra_pecas || {}
  let falta = false, comprado = false
  for (const p of parts) {
    const st = compra[p.itemId]?.status
    if (st === 'entrega') comprado = true          // comprou, não chegou → amarelo
    else if (st === 'entregue') continue           // chegou e entrou no estoque → neutro
    else if ((p.qtdAtual ?? 0) <= 0) falta = true  // zerada e não comprada → vermelho
  }
  return falta ? 'falta' : comprado ? 'comprado' : null
}

/**
 * Busca, em 2 queries, todas as peças de orçamento vinculadas ao catálogo + o
 * estoque atual de cada uma. Retorna Map(os_id → [{ itemId, qtd, qtdAtual }]).
 * Evita embed/FK-join (PostgREST) — mesmo padrão robusto do baixarItensDaOS.
 */
export async function fetchPartesStockPorOS() {
  const { data: itens, error } = await supabase
    .from('os_item')
    .select('id, os_id, peca_id, quantidade')
    .eq('categoria', 'peca')
    .not('peca_id', 'is', null)
    .is('deleted_at', null)
  if (error || !itens?.length) return new Map()

  const pecaIds = [...new Set(itens.map(i => i.peca_id))]
  const { data: pecas } = await supabase
    .from('peca')
    .select('id, qtd_atual')
    .in('id', pecaIds)
    .is('deleted_at', null)
  const stock = new Map((pecas || []).map(p => [p.id, p.qtd_atual ?? 0]))

  const map = new Map()
  for (const it of itens) {
    const arr = map.get(it.os_id) || []
    arr.push({ itemId: it.id, qtd: it.quantidade, qtdAtual: stock.get(it.peca_id) ?? 0 })
    map.set(it.os_id, arr)
  }
  return map
}
