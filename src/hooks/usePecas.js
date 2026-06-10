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
import { semAcento } from '../utils/fmt'

const SELECT_COLS = [
  'id', 'nome', 'sku', 'categoria',
  'marca', 'tipo', 'referencia', 'modelo', 'modelos_compativeis',
  'qtd_atual', 'qtd_minima', 'qtd_maxima',
  'custo_atual', 'custo_medio', 'preco_venda',
  'fornecedor', 'favorito',
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
    favorito:           Boolean(row.favorito),
  }
}

// =============================================================================
// peca_movimentacao — histórico real de mudanças em peca.qtd_atual
// =============================================================================
// Helper standalone que registra UMA movimentação. Idempotência fica por conta
// do chamador (claim atômico em baixarItensDaOS, ajuste delta!=0 no modal).
// Silencia 42P01 (tabela ainda não criada) — convivência com bases que ainda
// não rodaram sql/11. Outros erros sobem como console.warn pra não atrapalhar
// o fluxo principal (a movimentação é auditoria; o estoque já mudou).
//
// @param {{ peca_id: string, tipo: 'baixa_os'|'ajuste_manual'|'entrada_compra'|'devolucao',
//           delta: number, qtd_antes: number, qtd_depois: number,
//           motivo?: string|null, observacao?: string|null, os_id?: string|null }} mov
async function logMovimentacao(mov) {
  if (!mov?.peca_id || !mov?.tipo) return { ok: false, motivo: 'payload incompleto' }
  const { error } = await supabase.from('peca_movimentacao').insert({
    peca_id:    mov.peca_id,
    tipo:       mov.tipo,
    delta:      Math.trunc(Number(mov.delta) || 0),
    qtd_antes:  Math.max(0, Math.trunc(Number(mov.qtd_antes)  || 0)),
    qtd_depois: Math.max(0, Math.trunc(Number(mov.qtd_depois) || 0)),
    motivo:     mov.motivo     ?? null,
    observacao: mov.observacao ?? null,
    os_id:      mov.os_id      ?? null,
  })
  if (error) {
    // 42P01 = tabela não existe. PGRST205/PGRST204 = schema cache PostgREST.
    if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST204') {
      // silencioso — quando rodarem sql/11, passa a gravar automaticamente
      return { ok: false, motivo: 'schema-pendente:sql/11' }
    }
    console.warn('[peca_movimentacao] INSERT falhou:', error)
    return { ok: false, motivo: error.message }
  }
  return { ok: true }
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
    favorito:           'favorito',
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
 * Hook do estoque de peças. Re-fetcha quando { categoria, busca, page, pageSize } mudam.
 *
 * Paginação server-side via `.range(from, to)` + `count: 'exact'` na primeira
 * query (sem 2ª round-trip). **Quando há busca, ignora `page` e traz TODOS
 * os matches** — busca varre o resultset inteiro, não fica presa numa página
 * (UX: você não quer "achar peça X" e ela aparecer só na pág 3).
 *
 * @param {object} args
 * @param {string|null} args.categoria  id da categoria (null/'' = todas)
 * @param {string}      args.busca      termo livre (vazio = sem filtro)
 * @param {number}      args.page       página atual, base 1 (default 1)
 * @param {number}      args.pageSize   itens por página (default 20)
 */
export function usePecas({ categoria = null, busca = '', page = 1, pageSize = 20 } = {}) {
  const [pecas, setPecas] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const termo = (busca || '').trim()
  const cat = categoria && categoria !== 'todas' ? categoria : null
  const pg = Math.max(1, Math.trunc(Number(page) || 1))
  const sz = Math.max(1, Math.trunc(Number(pageSize) || 20))

  const fetchPecas = useCallback(async () => {
    setLoading(true); setError(null)
    let query = supabase
      .from('peca')
      .select(SELECT_COLS, { count: 'exact' })
      .is('deleted_at', null)
      .order('favorito', { ascending: false })
      .order('nome', { ascending: true })

    if (cat) query = query.eq('categoria', cat)

    // Busca SEM acento ("valvula" acha "Válvula"): quando há termo, traz o
    // conjunto (já filtrado por categoria no banco) e filtra no cliente
    // normalizando acentos. ~680 peças — leve. Sem termo, pagina no servidor.
    if (termo) {
      query = query.range(0, 4999) // teto de segurança; varre tudo que casa
    } else {
      const from = (pg - 1) * sz
      const to = from + sz - 1
      query = query.range(from, to)
    }

    const { data, error: err, count } = await query
    if (err) {
      setError(err)
      setLoading(false)
      return
    }

    let rows = data || []
    if (termo) {
      const q = semAcento(termo)
      rows = rows.filter(p =>
        semAcento(p.nome).includes(q) ||
        semAcento(p.sku).includes(q) ||
        semAcento(p.referencia).includes(q)
      )
    }
    setPecas(rows.map(dbToUi))
    setTotal(termo ? rows.length : (count ?? rows.length))
    setLoading(false)
  }, [cat, termo, pg, sz])

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

  /**
   * Ajuste manual de estoque (contagem / perda / ganho / devolução / outro).
   * Faz o UPDATE de `qtd_atual` e registra a movimentação em
   * `peca_movimentacao` (tipo='ajuste_manual'). Se a tabela ainda não existir
   * (sql/11 não rodou), o INSERT do histórico é silencioso — o UPDATE em
   * peca segue valendo, só não temos auditoria até o SQL ser aplicado.
   *
   * @param {string} pecaId
   * @param {{ qtdNova: number, motivo: string, observacao?: string|null }} payload
   * @returns {Promise<{ data: object|null, error: any }>}
   */
  async function ajustarEstoque(pecaId, { qtdNova, motivo, observacao = null, fornecedor = null, custoAtual = null } = {}) {
    if (!pecaId) return { data: null, error: new Error('pecaId vazio') }
    const nova = Math.max(0, Math.trunc(Number(qtdNova) || 0))

    // SELECT antes — captura qtd_antes pro registro de auditoria e evita
    // basear o delta em valor stale da UI (outra sessão pode ter mexido).
    const { data: antes, error: errSel } = await supabase
      .from('peca')
      .select('id, nome, qtd_atual')
      .eq('id', pecaId)
      .is('deleted_at', null)
      .maybeSingle()
    if (errSel) return { data: null, error: errSel }
    if (!antes) return { data: null, error: new Error('Peça não encontrada') }

    const qtdAntes = Number(antes.qtd_atual) || 0
    const delta = nova - qtdAntes

    // Monta patch: só inclui fornecedor/custo quando fornecidos.
    const updateData = { qtd_atual: nova }
    if (fornecedor && String(fornecedor).trim()) updateData.fornecedor = String(fornecedor).trim()
    if (custoAtual !== null && Number.isFinite(Number(custoAtual))) updateData.custo_atual = Number(custoAtual)

    const { data, error: err } = await supabase
      .from('peca')
      .update(updateData)
      .eq('id', pecaId)
      .select(SELECT_COLS)
      .single()
    if (err) return { data: null, error: err }

    // Auditoria — best-effort. Falha aqui não desfaz o UPDATE.
    await logMovimentacao({
      peca_id:    pecaId,
      tipo:       'ajuste_manual',
      delta,
      qtd_antes:  qtdAntes,
      qtd_depois: nova,
      motivo,
      observacao,
    })

    await fetchPecas()
    return { data: dbToUi(data), error: null }
  }

  return { pecas, total, loading, error, refetch: fetchPecas, criar, atualizar, excluir, baixarItens, ajustarEstoque }
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

  // 2) Itens elegíveis: peca_id NOT NULL (item avulso/serviço fica de fora).
  // Onda 4 removeu a coluna `tipo` do os_item — agora a discriminação é só por
  // peca_id IS NOT NULL. Coluna de quantidade chama `quantidade` (não `qtd`).
  const { data: itens, error: errIt } = await supabase
    .from('os_item')
    .select('peca_id, nome, quantidade')
    .eq('os_id', osId)
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
    const qtd = Number(item.quantidade) || 0
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

    // Auditoria — best-effort. Silenciosa se sql/11 ainda não rodou.
    await logMovimentacao({
      peca_id:    peca.id,
      tipo:       'baixa_os',
      delta:      -qtd,
      qtd_antes:  atual,
      qtd_depois: novo,
      observacao: osNumero ? `OS #${osNumero}` : null,
      os_id:      osId,
    })

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
