// idemaq-src/hooks/usePecas.js
// CRUD da tabela `peca` no Supabase — Módulo 06 (Estoque).
// Filtros (categoria + busca) aplicados server-side via .eq()/.or().ilike().
//
// Schema da tabela:
//   nome · sku · categoria · marca · tipo · referencia
//   modelo · modelos_compativeis (text[]) · fornecedor
//   qtd_atual · qtd_minima · qtd_maxima
//   custo_atual · custo_medio · preco_venda
//   deleted_at · criado_em · ...
//
// `modelos_compativeis` é ARRAY no banco (text[]) — chega como array JS.
// A UI usa camelCase: `dbToUi` mapeia ida, `uiToDb` mapeia volta.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const SELECT_COLS = [
  'id', 'nome', 'sku', 'categoria',
  'marca', 'tipo', 'referencia', 'modelo', 'modelos_compativeis',
  'qtd_atual', 'qtd_minima', 'qtd_maxima',
  'custo_atual', 'custo_medio', 'preco_venda',
  'fornecedor',
].join(', ')

function dbToUi(row) {
  if (!row) return row
  // modelos_compativeis pode vir como array (text[]) ou string (legado).
  // Normaliza sempre pra array de strings limpas.
  let compat = row.modelos_compativeis
  if (typeof compat === 'string') {
    compat = compat.split(/[,/\n;]/).map(s => s.trim()).filter(Boolean)
  } else if (!Array.isArray(compat)) {
    compat = []
  }
  return {
    id:                 row.id,
    nome:               row.nome,
    sku:                row.sku || '',
    categoria:          row.categoria || 'outros',
    marca:              row.marca || '',
    tipo:               row.tipo || '',
    referencia:         row.referencia || '',
    modelo:             row.modelo || '',
    modelosCompativeis: compat,
    qtdAtual:           row.qtd_atual ?? 0,
    qtdMinima:          row.qtd_minima ?? 0,
    qtdMaxima:          row.qtd_maxima ?? 0,
    custoAtual:         Number(row.custo_atual ?? 0),
    custoMedio:         Number(row.custo_medio ?? 0),
    precoVenda:         Number(row.preco_venda ?? 0),
    fornecedor:         row.fornecedor || '',
  }
}

function uiToDb(patch) {
  const map = {
    nome:               'nome',
    sku:                'sku',
    categoria:          'categoria',
    marca:              'marca',
    tipo:               'tipo',
    referencia:         'referencia',
    modelo:             'modelo',
    modelosCompativeis: 'modelos_compativeis',
    fornecedor:         'fornecedor',
    qtdAtual:           'qtd_atual',
    qtdMinima:          'qtd_minima',
    qtdMaxima:          'qtd_maxima',
    custoAtual:         'custo_atual',
    custoMedio:         'custo_medio',
    precoVenda:         'preco_venda',
  }
  const out = {}
  for (const [k, v] of Object.entries(patch || {})) {
    const col = map[k]
    if (!col) continue
    if (col === 'modelos_compativeis') {
      // Sempre envia array (text[]). Array vazio vira null pra não poluir.
      if (Array.isArray(v)) {
        const arr = v.map(s => String(s).trim()).filter(Boolean)
        out[col] = arr.length ? arr : null
      } else if (typeof v === 'string') {
        const arr = v.split(/[,/\n;]/).map(s => s.trim()).filter(Boolean)
        out[col] = arr.length ? arr : null
      } else {
        out[col] = null
      }
      continue
    }
    if (typeof v === 'string') out[col] = v.trim() || null
    else out[col] = v
  }
  return out
}

/**
 * Hook do estoque de peças. Re-fetcha quando { categoria, busca } mudam.
 *
 * @param {object} args
 * @param {string|null} args.categoria  id da categoria (null/'' = todas)
 * @param {string}      args.busca      termo livre (vazio = sem filtro)
 */
export function usePecas({ categoria = null, busca = '' } = {}) {
  const [pecas, setPecas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const termo = (busca || '').trim()
  const cat = categoria && categoria !== 'todas' ? categoria : null

  const fetchPecas = useCallback(async () => {
    setLoading(true); setError(null)
    let query = supabase
      .from('peca')
      .select(SELECT_COLS)
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (cat) query = query.eq('categoria', cat)

    if (termo) {
      // Escapa caracteres do PostgREST .or() (vírgula). ILIKE não diferencia case.
      const t = termo.replace(/[,()*]/g, ' ').trim()
      if (t) {
        query = query.or(
          `nome.ilike.%${t}%,sku.ilike.%${t}%,referencia.ilike.%${t}%`
        )
      }
    }

    const { data, error: err } = await query
    if (err) {
      setError(err)
      setLoading(false)
      return
    }
    setPecas((data || []).map(dbToUi))
    setLoading(false)
  }, [cat, termo])

  useEffect(() => { fetchPecas() }, [fetchPecas])

  /**
   * Cria nova peça. Aceita payload em camelCase do NovaPecaModal.
   * `modelosCompativeis` pode chegar como array ou string CSV — uiToDb normaliza.
   */
  async function criar(payload) {
    const { data, error: err } = await supabase
      .from('peca')
      .insert(uiToDb(payload))
      .select(SELECT_COLS)
      .single()
    if (!err) await fetchPecas()
    return { data: data ? dbToUi(data) : null, error: err }
  }

  /**
   * Atualiza peça existente. Patch parcial em camelCase.
   */
  async function atualizar(id, patch) {
    const { data, error: err } = await supabase
      .from('peca')
      .update(uiToDb(patch))
      .eq('id', id)
      .select(SELECT_COLS)
      .single()
    if (!err) await fetchPecas()
    return { data: data ? dbToUi(data) : null, error: err }
  }

  /**
   * Soft-delete: marca deleted_at + excluido_por.
   */
  async function excluir(id) {
    const { data: userData } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('peca')
      .update({
        deleted_at: new Date().toISOString(),
        excluido_por: userData?.user?.id || null,
      })
      .eq('id', id)
    if (!err) await fetchPecas()
    return { error: err }
  }

  /**
   * Wrapper de `baixarItensDaOS` que ainda dispara refetch local pra UI
   * refletir as novas quantidades sem precisar trocar de página.
   */
  async function baixarItens(osId) {
    const res = await baixarItensDaOS(osId)
    if (res?.aplicadas?.length) await fetchPecas()
    return res
  }

  return { pecas, loading, error, refetch: fetchPecas, criar, atualizar, excluir, baixarItens }
}

// =============================================================================
// baixarItensDaOS — standalone, sem hook
// =============================================================================
// Chamada pelo useOS quando uma OS entra em 'concluido' (e também exposta via
// usePecas().baixarItens). Faz 3 passos:
//
//   1) CLAIM ATÔMICO de idempotência:
//      UPDATE os SET itens_baixados=true WHERE id=$1 AND itens_baixados=false
//      Se ninguém casou → outro side já baixou → retorna { ja_baixado: true }
//      sem tocar em estoque.
//
//   2) Busca itens da OS com tipo='peca' E peca_id NOT NULL
//      (item avulso = peca_id NULL = texto livre criado no orçamento, ignora).
//
//   3) Para cada item: SELECT peca pelo id (filtra deleted_at) e
//      UPDATE peca SET qtd_atual = max(0, qtd_atual - qtd_do_item).
//
// Pré-requisito de schema: sql/07-os-itens-baixados.sql aplicado
// (colunas os.itens_baixados + os_item.peca_id). Se não tiver, a função
// detecta o erro 42703 e retorna { ok:false, motivo:'schema-pendente:sql/07' }
// sem quebrar nada.
//
// Retorno:
//   { ok, ja_baixado?, motivo?, aplicadas, erros, osId, osNumero? }
//   - aplicadas: [{ peca_id, nome, delta, qtd_antes, qtd_depois }]
//   - erros:     [{ peca_id?, nome?, msg }]
//
// @param {string} osId  UUID da OS
export async function baixarItensDaOS(osId) {
  if (!osId) return { ok: false, motivo: 'osId vazio', aplicadas: [], erros: [] }

  // 1) Claim atômico — só prossegue quem conseguir virar a flag false→true.
  const { data: claimed, error: errClaim } = await supabase
    .from('os')
    .update({ itens_baixados: true })
    .eq('id', osId)
    .eq('itens_baixados', false)
    .select('id, numero')
    .maybeSingle()

  if (errClaim) {
    if (errClaim.code === '42703' || errClaim.code === 'PGRST204') {
      console.warn('[baixaAuto] coluna os.itens_baixados não existe — rode sql/07-os-itens-baixados.sql no Supabase')
      return { ok: false, motivo: 'schema-pendente:sql/07', aplicadas: [], erros: [] }
    }
    console.error('[baixaAuto] falha reivindicando itens_baixados:', errClaim)
    return { ok: false, motivo: errClaim.message, aplicadas: [], erros: [] }
  }

  if (!claimed) {
    // ninguém casou: já tava true antes, ou OS não existe
    return { ok: true, ja_baixado: true, osId, aplicadas: [], erros: [] }
  }

  const osNumero = claimed.numero
  const aplicadas = []
  const erros = []

  // 2) Itens elegíveis: tipo='peca' E peca_id NOT NULL (avulsos ficam de fora).
  const { data: itens, error: errIt } = await supabase
    .from('os_item')
    .select('peca_id, nome, qtd')
    .eq('os_id', osId)
    .eq('tipo', 'peca')
    .not('peca_id', 'is', null)
    .is('deleted_at', null)

  if (errIt) {
    if (errIt.code === '42703' || errIt.code === 'PGRST204') {
      console.warn('[baixaAuto] coluna os_item.peca_id não existe — rode sql/07-os-itens-baixados.sql')
      return { ok: false, ja_baixado: false, motivo: 'schema-pendente:sql/07', aplicadas: [], erros: [], osId, osNumero }
    }
    return { ok: false, ja_baixado: false, motivo: errIt.message, aplicadas: [], erros: [], osId, osNumero }
  }

  if (!itens || itens.length === 0) {
    return { ok: true, ja_baixado: false, aplicadas: [], erros: [], osId, osNumero }
  }

  // 3) Debita cada peça.
  for (const item of itens) {
    const qtd = Number(item.qtd) || 0
    if (qtd <= 0) continue

    const { data: peca, error: errSel } = await supabase
      .from('peca')
      .select('id, nome, qtd_atual')
      .eq('id', item.peca_id)
      .is('deleted_at', null)
      .maybeSingle()

    if (errSel) { erros.push({ peca_id: item.peca_id, nome: item.nome, msg: errSel.message }); continue }
    if (!peca)  { erros.push({ peca_id: item.peca_id, nome: item.nome, msg: 'peça não encontrada (soft-deletada?)' }); continue }

    const atual = Number(peca.qtd_atual) || 0
    const novo = Math.max(0, atual - qtd)

    const { error: errUp } = await supabase
      .from('peca')
      .update({ qtd_atual: novo })
      .eq('id', peca.id)

    if (errUp) { erros.push({ peca_id: peca.id, nome: peca.nome, msg: errUp.message }); continue }

    aplicadas.push({
      peca_id:    peca.id,
      nome:       peca.nome,
      delta:      -qtd,
      qtd_antes:  atual,
      qtd_depois: novo,
    })
  }

  return { ok: true, ja_baixado: false, aplicadas, erros, osId, osNumero }
}
