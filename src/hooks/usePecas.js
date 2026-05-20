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
   * Baixa automatica ao concluir OS. Wrapper sobre `baixarItensDoEstoque`
   * que ainda dispara refetch local pra UI refletir as novas quantidades.
   */
  async function baixarItens(itens, ctx) {
    const res = await baixarItensDoEstoque(itens, ctx)
    if (res.aplicadas.length) await fetchPecas()
    return res
  }

  return { pecas, loading, error, refetch: fetchPecas, criar, atualizar, excluir, baixarItens }
}

// =============================================================================
// baixarItensDoEstoque — standalone, sem hook
// =============================================================================
// Chamado pelo useOS quando uma OS entra em 'concluido' (e tambem disponivel
// via usePecas().baixarItens). Para cada item da OS com tipo='peca', tenta
// achar a peca correspondente por nome (ILIKE exato) e decrementa qtd_atual.
//
// Matching:
//   - nome.ilike '<nome do item>'  (case/diacriticos pelo collation do Postgres)
//   - >1 match  -> erro 'ambiguo', baixa nao aplicada (evita pegar peca errada)
//   - 0 matches -> 'naoEncontradas' (provavelmente item de texto livre criado
//                  no orcamento sem vinculo com o catalogo)
//
// Idempotencia: nao temos tabela peca_movimentacao ainda, entao a protecao
// contra dupla-baixa vem do *caller* (useOS so dispara em transicao real
// para 'concluido', nunca estando ja em 'concluido'). Trade-off documentado
// em PENDENCIAS-ROTAS.md.
//
// Retorno: { aplicadas, naoEncontradas, erros, osId, osNumero }
//
// @param {Array<{nome:string, qtd:number}>} itens
// @param {object} [ctx]  { osId, osNumero } — usados so no log/retorno
export async function baixarItensDoEstoque(itens, ctx = {}) {
  const aplicadas = []
  const naoEncontradas = []
  const erros = []

  for (const item of (itens || [])) {
    const nome = String(item?.nome || '').trim()
    const qtd  = Number(item?.qtd) || 0
    if (!nome || qtd <= 0) continue

    // PostgREST escapa o ILIKE; nome com % ou _ fica literal de qualquer jeito
    const { data: matches, error: errSel } = await supabase
      .from('peca')
      .select('id, nome, qtd_atual')
      .is('deleted_at', null)
      .ilike('nome', nome)
      .limit(2)

    if (errSel) { erros.push({ nome, msg: errSel.message }); continue }
    if (!matches || matches.length === 0) { naoEncontradas.push(nome); continue }
    if (matches.length > 1) {
      erros.push({ nome, msg: `mais de 1 peca com nome "${nome}" — baixa nao aplicada (ambiguo)` })
      continue
    }

    const peca = matches[0]
    const atual = Number(peca.qtd_atual) || 0
    const novo = Math.max(0, atual - qtd)

    const { error: errUp } = await supabase
      .from('peca')
      .update({ qtd_atual: novo })
      .eq('id', peca.id)

    if (errUp) { erros.push({ nome, msg: errUp.message }); continue }

    aplicadas.push({
      peca_id:    peca.id,
      nome:       peca.nome,
      delta:      -qtd,
      qtd_antes:  atual,
      qtd_depois: novo,
    })
  }

  return { aplicadas, naoEncontradas, erros, osId: ctx.osId || null, osNumero: ctx.osNumero || null }
}
