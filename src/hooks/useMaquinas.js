// idemaq-src/hooks/useMaquinas.js
// CRUD da tabela `maquina` — máquinas refurbish + revenda (Módulo 07).
// Requer sql/12-maquina.sql aplicado no Supabase.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

const SELECT_COLS = [
  'id', 'modelo', 'marca', 'capacidade', 'estado',
  'custo_compra', 'custo_itens', 'custo_servico', 'preco_venda',
  'observacoes', 'criado_em',
].join(', ')

function dbToUi(row) {
  if (!row) return row
  return {
    id:           row.id,
    modelo:       row.modelo       || '',
    marca:        row.marca        || '',
    capacidade:   row.capacidade   || '',
    estado:       row.estado       || 'disponivel',
    custoCompra:  Number(row.custo_compra  ?? 0),
    custoItens:   Number(row.custo_itens   ?? 0),
    custoServico: Number(row.custo_servico ?? 0),
    precoVenda:   Number(row.preco_venda   ?? 0),
    observacoes:  row.observacoes  || '',
    criadoEm:     row.criado_em,
  }
}

function uiToDb(patch) {
  const map = {
    modelo:       'modelo',
    marca:        'marca',
    capacidade:   'capacidade',
    estado:       'estado',
    custoCompra:  'custo_compra',
    custoItens:   'custo_itens',
    custoServico: 'custo_servico',
    precoVenda:   'preco_venda',
    observacoes:  'observacoes',
  }
  const out = {}
  for (const [k, v] of Object.entries(patch || {})) {
    const col = map[k]
    if (!col) continue
    if (typeof v === 'string') out[col] = v.trim() || null
    else out[col] = v
  }
  return out
}

export function useMaquinas() {
  const [maquinas, setMaquinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchMaquinas = useCallback(async () => {
    setLoading(true); setError(null)
    const { data, error: err } = await supabase
      .from('maquina')
      .select(SELECT_COLS)
      .is('deleted_at', null)
      .order('criado_em', { ascending: false })
    if (err) {
      // Tabela ainda não criada — silencia pra não quebrar a tela
      if (err.code === '42P01' || err.code === 'PGRST205' || err.code === 'PGRST204') {
        setMaquinas([])
        setLoading(false)
        return
      }
      setError(err)
      setLoading(false)
      return
    }
    setMaquinas((data || []).map(dbToUi))
    setLoading(false)
  }, [])

  useEffect(() => { fetchMaquinas() }, [fetchMaquinas])

  async function criar(payload) {
    const { data, error: err } = await supabase
      .from('maquina')
      .insert(uiToDb(payload))
      .select(SELECT_COLS)
      .single()
    if (!err) await fetchMaquinas()
    return { data: data ? dbToUi(data) : null, error: err }
  }

  async function atualizar(id, patch) {
    const { data, error: err } = await supabase
      .from('maquina')
      .update(uiToDb(patch))
      .eq('id', id)
      .select(SELECT_COLS)
      .single()
    if (!err) await fetchMaquinas()
    return { data: data ? dbToUi(data) : null, error: err }
  }

  async function excluir(id) {
    const { error: err } = await supabase
      .from('maquina')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (!err) await fetchMaquinas()
    return { error: err }
  }

  return { maquinas, loading, error, refetch: fetchMaquinas, criar, atualizar, excluir }
}

// =============================================================================
// criarMaquinaAoConcluirFabricacao — entrada automática no estoque de Máquinas
// =============================================================================
// Disparada (fire-and-forget) pelo useOS.updateOS quando uma OS tipo
// 'fabricacao' entra em 'concluido'. Espelha o padrão de idempotência de
// baixarItensDaOS (usePecas.js) — claim atômico via coluna dedicada antes de
// mexer em qualquer tabela, então 2 chamadas concorrentes só criam 1 vez.
//
// Preço de venda fica 0 — Fabricação não passa por Orçamento/Pagamento, não
// tem esse valor ainda; Toni preenche na hora de vender (tipo 'venda') ou
// editando a máquina depois. Custo de serviço também fica 0 (Fabricação não
// cobra mão de obra — CLAUDE.md/contexto-estoque).
//
// Pré-requisito de schema: sql/149-os-maquina-criada.sql aplicado. Se não
// tiver, detecta 42703/PGRST204 e retorna motivo sem quebrar nada.
export async function criarMaquinaAoConcluirFabricacao(osId) {
  if (!osId) return { ok: false, motivo: 'osId vazio' }

  // 1) Claim atômico de idempotência.
  const { data: claimed, error: errClaim } = await supabase
    .from('os')
    .update({ maquina_criada: true })
    .eq('id', osId)
    .eq('maquina_criada', false)
    .select('id, numero, tipo, marca_equipamento, modelo_equipamento, valor_total')
    .maybeSingle()

  if (errClaim) {
    if (errClaim.code === '42703' || errClaim.code === 'PGRST204') {
      console.warn('[maquinaAuto] coluna os.maquina_criada não existe — rode sql/149-os-maquina-criada.sql no Supabase')
      return { ok: false, motivo: 'schema-pendente:sql/149' }
    }
    console.error('[maquinaAuto] falha reivindicando maquina_criada:', errClaim)
    return { ok: false, motivo: errClaim.message }
  }

  if (!claimed) return { ok: true, ja_criada: true } // outro side já criou, ou OS não existe

  if (claimed.tipo !== 'fabricacao') return { ok: true, ignorada: true } // não é Fabricação, nada a fazer

  // 2) Soma o CUSTO (não o preço de venda) das peças efetivamente usadas.
  // os_item.valor_unitario é o preço de venda cobrado no orçamento (ver
  // AcaoOrcamentoHIG.escolherPeca: valor = p.precoVenda) — pra custo real
  // da máquina precisa do custo da peça no catálogo (peca.custo_medio,
  // com fallback custo_atual — mesma convenção de sql/140).
  const { data: itens, error: errIt } = await supabase
    .from('os_item')
    .select('categoria, quantidade, valor_unitario, peca_id')
    .eq('os_id', osId)
    .is('deleted_at', null)

  if (errIt) console.warn('[maquinaAuto] falha lendo os_item pra custo:', errIt.message)

  const itensPeca = (itens || []).filter(it => it.categoria === 'peca')
  const pecaIds = [...new Set(itensPeca.map(it => it.peca_id).filter(Boolean))]

  let custoPorPecaId = {}
  if (pecaIds.length) {
    const { data: pecas, error: errPecas } = await supabase
      .from('peca')
      .select('id, custo_medio, custo_atual')
      .in('id', pecaIds)
    if (errPecas) console.warn('[maquinaAuto] falha lendo custo do catálogo de peças:', errPecas.message)
    custoPorPecaId = Object.fromEntries(
      (pecas || []).map(p => [p.id, Number(p.custo_medio) || Number(p.custo_atual) || 0])
    )
  }

  const custoItens = itensPeca.reduce((soma, it) => {
    // Item com peca_id: custo real do catálogo. Item avulso (texto livre,
    // sem peca_id): não tem custo conhecido — usa o valor_unitario como
    // aproximação (melhor que contar 0).
    const custoUnit = it.peca_id != null
      ? (custoPorPecaId[it.peca_id] ?? 0)
      : (Number(it.valor_unitario) || 0)
    return soma + (Number(it.quantidade) || 0) * custoUnit
  }, 0)

  // 3) Cria a máquina — pronta pra vender, preço de venda em branco (Toni define depois).
  const payload = {
    modelo:        claimed.modelo_equipamento || null,
    marca:         claimed.marca_equipamento  || null,
    estado:        'disponivel',
    custo_compra:  Number(claimed.valor_total) || 0,
    custo_itens:   custoItens,
    custo_servico: 0,
    preco_venda:   0,
    observacoes:   `Gerada automaticamente pela OS #${claimed.numero} (Fabricação).`,
  }

  const { error: errIns } = await supabase.from('maquina').insert(payload)
  if (errIns) {
    console.error(`[maquinaAuto] OS #${claimed.numero}: falha criando máquina:`, errIns)
    return { ok: false, motivo: errIns.message, osNumero: claimed.numero }
  }

  console.log(`[maquinaAuto] OS #${claimed.numero}: máquina criada no estoque (custo peças R$ ${custoItens.toFixed(2)})`)
  return { ok: true, osNumero: claimed.numero, custoItens }
}
