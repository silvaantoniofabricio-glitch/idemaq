// src/utils/pecasStatus.js
// Status de "peças a comprar" das OS de Conserto, considerando o estoque
// COMPARTILHADO entre todas as OS de conserto.
//
// Uma peça (linha do orçamento = os_item) está em FALTA quando o estoque não
// cobre a necessidade dela, levando em conta:
//   - a quantidade pedida na própria OS (pede 2, tem 1 → falta);
//   - a demanda somada de várias OS pela mesma peça (3 OS × 1, tem 1 → 2 faltam);
//   - peças já compradas/entregues não disputam o estoque atual.
//
// Cores do chip Manut. (card do Kanban):
//   'falta'    (vermelho): tem peça em falta e ainda não comprada
//   'comprado' (amarelo):  comprou, peça ainda não chegou
//   null:                  tudo coberto pelo estoque / já chegou

import { supabase } from '../supabase'

/**
 * Faz a alocação global do estoque entre as OS de conserto e retorna:
 *   - falta: Set<os_item_id> das peças que ficaram SEM estoque
 *   - porOS: Map<os_id, Array<{ itemId }>> das peças (catálogo) de cada OS
 */
export async function fetchFaltaPecas() {
  const vazio = { falta: new Set(), porOS: new Map() }

  // 1. OS em conserto (no banco a etapa é 'em_oficina').
  const { data: oss, error: e1 } = await supabase
    .from('os')
    .select('id, numero, criado_em, pre_diagnostico')
    .in('etapa', ['em_oficina', 'oficina'])
    .is('deleted_at', null)
  if (e1 || !oss?.length) return vazio
  const osMap = new Map(oss.map(o => [o.id, o]))

  // 2. Peças do orçamento (vinculadas ao catálogo) dessas OS.
  const { data: itens, error: e2 } = await supabase
    .from('os_item')
    .select('id, os_id, peca_id, quantidade')
    .in('os_id', oss.map(o => o.id))
    .eq('categoria', 'peca')
    .not('peca_id', 'is', null)
    .is('deleted_at', null)
  if (e2 || !itens?.length) return vazio

  // 3. Estoque atual de cada peça.
  const pecaIds = [...new Set(itens.map(i => i.peca_id))]
  const { data: pecas } = await supabase
    .from('peca').select('id, qtd_atual').in('id', pecaIds).is('deleted_at', null)
  const stock = new Map((pecas || []).map(p => [p.id, Number(p.qtd_atual) || 0]))

  // 4. Agrupa por peça + monta porOS.
  const porPeca = new Map()
  const porOS = new Map()
  for (const it of itens) {
    const os = osMap.get(it.os_id)
    const compraSt = os?.pre_diagnostico?.compra_pecas?.[it.id]?.status

    const arrP = porPeca.get(it.peca_id) || []
    arrP.push({
      itemId: it.id,
      qtd: Math.max(1, Number(it.quantidade) || 1),
      osNum: os?.numero || 0,
      criado: os?.criado_em || '',
      compraSt,
    })
    porPeca.set(it.peca_id, arrP)

    const arrO = porOS.get(it.os_id) || []
    arrO.push({ itemId: it.id })
    porOS.set(it.os_id, arrO)
  }

  // 5. Aloca o estoque por peça:
  //    - 'entregue' → já entrou no estoque pra essa OS: reserva (subtrai do disponível).
  //    - 'entrega'  → vem por compra separada: não disputa nem é falta.
  //    - resto ('comprar'/sem status) → disputa o estoque restante; OS mais
  //      antiga primeiro. Quem não couber, fica em falta.
  const falta = new Set()
  for (const [pid, arr] of porPeca) {
    let avail = stock.get(pid) ?? 0
    for (const a of arr) {
      if (a.compraSt === 'entregue') avail -= a.qtd
    }
    const disputam = arr
      .filter(a => a.compraSt !== 'entrega' && a.compraSt !== 'entregue')
      .sort((a, b) => String(a.criado).localeCompare(String(b.criado)) || a.osNum - b.osNum)
    for (const a of disputam) {
      if (avail >= a.qtd) avail -= a.qtd
      else falta.add(a.itemId)
    }
  }

  return { falta, porOS }
}

/**
 * Decide a cor do chip Manut. de uma OS no card do Kanban.
 * @param {object} os         — objeto da OS (precisa de pre_diagnostico)
 * @param {Array}  parts      — [{ itemId }] das peças do catálogo da OS
 * @param {Set}    faltaSet   — Set<os_item_id> em falta (de fetchFaltaPecas)
 * @returns {'falta'|'comprado'|null}
 */
export function calcManutPecaStatus(os, parts, faltaSet) {
  if (!parts || !parts.length) return null
  const compra = os?.pre_diagnostico?.compra_pecas || {}
  let falta = false, comprado = false
  for (const p of parts) {
    const st = compra[p.itemId]?.status
    if (st === 'entrega') comprado = true          // comprou, não chegou → amarelo
    else if (st === 'entregue') continue           // chegou → neutro
    else if (faltaSet?.has(p.itemId)) falta = true // sem estoque → vermelho
  }
  return falta ? 'falta' : comprado ? 'comprado' : null
}
