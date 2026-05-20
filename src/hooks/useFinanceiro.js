// idemaq-src/hooks/useFinanceiro.js
// Hook de lançamentos financeiros (contas a receber, a pagar, caixa).
//
// Schema esperado da tabela `lancamento_financeiro` (parte 2):
//   id uuid · tipo text ('receita'|'despesa') · valor numeric
//   conta_id uuid FK conta_bancaria · categoria text · descricao text
//   vencimento date · pago_em date|null · taxa_pct numeric
//   forma_pagamento text · os_id uuid|null · deleted_at timestamptz
//
// Fallback mock: enquanto a tabela ainda não existir no Supabase (terminal
// GERAL aplicando sql/01 em paralelo), retorna lançamentos de demonstração
// no mesmo shape do banco. `tabelaAusente: true` permite a UI sinalizar
// "modo demo" ao usuário. Operações de escrita (criar/darBaixa/excluir)
// retornam `{ error: { code:'OFFLINE' } }` nesse modo — UI faz update local.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabase'

// ─── Detecção de tabela ausente ─────────────────────────────────────────────
// Postgres SQLSTATE 42P01 = undefined_table. Supabase encapsula em error.code.
function isMissingTable(err) {
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('not found'))
}

// ─── Mock fallback ──────────────────────────────────────────────────────────
// Mantém o shape EXATO do banco (snake_case + colunas do schema esperado) pra
// o adapter da página funcionar igual em modo demo e modo real. Ids prefixados
// com `mock-` pra distinguir e proibir mutação via SQL.
function isoMaisDias(dias) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

const MOCK_CONTAS = [
  { id: 'mock-cresol',       nome: 'Cresol',           tipo: 'banco',      ativo: true },
  { id: 'mock-bradesco',     nome: 'Bradesco',         tipo: 'banco',      ativo: true },
  { id: 'mock-bradesco-pj',  nome: 'Bradesco PJ',      tipo: 'cartao',     ativo: true },
  { id: 'mock-mercado-pago', nome: 'Mercado Pago',     tipo: 'banco',      ativo: true },
  { id: 'mock-infinitepay',  nome: 'InfinitePay D+1',  tipo: 'maquininha', ativo: true },
  { id: 'mock-inter-pj',     nome: 'Cartão Inter PJ',  tipo: 'cartao',     ativo: true },
]

// Helper pro mock: anexa o objeto `conta` resolvido (espelha o join do banco)
function comConta(lanc) {
  const conta = MOCK_CONTAS.find(c => c.id === lanc.conta_id) || null
  return { ...lanc, conta }
}

const MOCK_LANCAMENTOS_BRUTO = [
  // ─── A RECEBER (tipo:'receita', pago_em:null) ────────────────────────────
  { id:'m-r-1',  tipo:'receita', valor:480, conta_id:'mock-bradesco',    categoria:'Manutenção',      descricao:'Paula Mendes — Manutenção + Limpeza (OS #241)', vencimento:isoMaisDias(-15), pago_em:null, taxa_pct:0,    forma_pagamento:'boleto',          os_id:null },
  { id:'m-r-2',  tipo:'receita', valor:330, conta_id:'mock-infinitepay', categoria:'Limpeza',         descricao:'Maria Silva — Limpeza combinada x2 (OS #243)',  vencimento:isoMaisDias(-5),  pago_em:null, taxa_pct:6.30, forma_pagamento:'credito_parcelado', os_id:null },
  { id:'m-r-3',  tipo:'receita', valor:185, conta_id:'mock-cresol',      categoria:'Manutenção',      descricao:'Carlos Lima — Manutenção (OS #245)',            vencimento:isoMaisDias(-1),  pago_em:null, taxa_pct:0,    forma_pagamento:'pix',             os_id:null },
  { id:'m-r-4',  tipo:'receita', valor:270, conta_id:'mock-infinitepay', categoria:'Limpeza',         descricao:'Ana Reis — Limpeza + capa (OS #247)',            vencimento:isoMaisDias(0),   pago_em:null, taxa_pct:4.20, forma_pagamento:'link_pagamento',  os_id:null },
  { id:'m-r-5',  tipo:'receita', valor:415, conta_id:'mock-infinitepay', categoria:'Manutenção',      descricao:'Roberto Dias — Manutenção + mangueira (OS #248)',vencimento:isoMaisDias(1),   pago_em:null, taxa_pct:3.15, forma_pagamento:'credito_1x',      os_id:null },
  { id:'m-r-6',  tipo:'receita', valor:185, conta_id:'mock-cresol',      categoria:'Limpeza',         descricao:'João Costa — Limpeza (OS #249)',                vencimento:isoMaisDias(3),   pago_em:null, taxa_pct:0,    forma_pagamento:'pix',             os_id:null },
  { id:'m-r-7',  tipo:'receita', valor:650, conta_id:'mock-infinitepay', categoria:'Venda de máquina',descricao:'Igor Vasconcelos — Venda máquina reformada (OS #250)',vencimento:isoMaisDias(5),pago_em:null,taxa_pct:9.50,forma_pagamento:'credito_parcelado', os_id:null },
  { id:'m-r-8',  tipo:'receita', valor:480, conta_id:'mock-bradesco',    categoria:'Manutenção',      descricao:'Pedro Alves — Manutenção + Limpeza (OS #251)',  vencimento:isoMaisDias(7),   pago_em:null, taxa_pct:0,    forma_pagamento:'boleto',          os_id:null },

  // ─── A PAGAR (tipo:'despesa', pago_em:null) ──────────────────────────────
  { id:'m-p-1', tipo:'despesa', valor:1650, conta_id:'mock-cresol',     categoria:'Funcionários', descricao:'Salário Alessandro',       vencimento:isoMaisDias(2),  pago_em:null, taxa_pct:0, forma_pagamento:'pix',        os_id:null },
  { id:'m-p-2', tipo:'despesa', valor:1650, conta_id:'mock-cresol',     categoria:'Funcionários', descricao:'Salário Guilherme',        vencimento:isoMaisDias(2),  pago_em:null, taxa_pct:0, forma_pagamento:'pix',        os_id:null },
  { id:'m-p-3', tipo:'despesa', valor:500,  conta_id:'mock-bradesco-pj',categoria:'Marketing',    descricao:'Tráfego pago Meta',         vencimento:isoMaisDias(5),  pago_em:null, taxa_pct:0, forma_pagamento:'credito_1x', os_id:null },
  { id:'m-p-4', tipo:'despesa', valor:820,  conta_id:'mock-bradesco-pj',categoria:'Peças',        descricao:'Compra de peças ML',        vencimento:isoMaisDias(-2), pago_em:null, taxa_pct:0, forma_pagamento:'boleto',     os_id:null },
  { id:'m-p-5', tipo:'despesa', valor:310,  conta_id:'mock-cresol',     categoria:'Utilidades',   descricao:'Energia elétrica',          vencimento:isoMaisDias(8),  pago_em:null, taxa_pct:0, forma_pagamento:'boleto',     os_id:null },
  { id:'m-p-6', tipo:'despesa', valor:180,  conta_id:'mock-bradesco',   categoria:'Utilidades',   descricao:'Internet + telefone',       vencimento:isoMaisDias(10), pago_em:null, taxa_pct:0, forma_pagamento:'boleto',     os_id:null },
  { id:'m-p-7', tipo:'despesa', valor:420,  conta_id:'mock-inter-pj',   categoria:'Combustível',  descricao:'Combustível',               vencimento:isoMaisDias(0),  pago_em:null, taxa_pct:0, forma_pagamento:'credito_1x', os_id:null },
  { id:'m-p-8', tipo:'despesa', valor:145,  conta_id:'mock-cresol',     categoria:'Materiais',    descricao:'Material de limpeza',       vencimento:isoMaisDias(12), pago_em:null, taxa_pct:0, forma_pagamento:'pix',        os_id:null },

  // ─── CAIXA (pago_em != null) — receitas e despesas confirmadas ───────────
  { id:'m-c-1', tipo:'receita', valor:185, conta_id:'mock-bradesco',    categoria:'Limpeza',          descricao:'OS #239 — Maria Silva',          vencimento:isoMaisDias(-1), pago_em:isoMaisDias(-1), taxa_pct:0,    forma_pagamento:'pix',         os_id:null },
  { id:'m-c-2', tipo:'despesa', valor:180, conta_id:'mock-inter-pj',    categoria:'Combustível',      descricao:'Combustível semana',              vencimento:isoMaisDias(-1), pago_em:isoMaisDias(-1), taxa_pct:0,    forma_pagamento:'credito_1x',  os_id:null },
  { id:'m-c-3', tipo:'receita', valor:350, conta_id:'mock-cresol',      categoria:'Manutenção',       descricao:'OS #240 — Pedro Alves',           vencimento:isoMaisDias(-2), pago_em:isoMaisDias(-2), taxa_pct:0,    forma_pagamento:'pix',         os_id:null },
  { id:'m-c-4', tipo:'receita', valor:480, conta_id:'mock-infinitepay', categoria:'Manutenção',       descricao:'OS #238 — Ana Reis',              vencimento:isoMaisDias(-3), pago_em:isoMaisDias(-3), taxa_pct:6.30, forma_pagamento:'credito_parcelado', os_id:null },
  { id:'m-c-5', tipo:'despesa', valor:620, conta_id:'mock-bradesco-pj', categoria:'Peças',            descricao:'Peças ML — abril',                 vencimento:isoMaisDias(-3), pago_em:isoMaisDias(-3), taxa_pct:0,    forma_pagamento:'boleto',      os_id:null },
  { id:'m-c-6', tipo:'receita', valor:185, conta_id:'mock-bradesco',    categoria:'Limpeza',          descricao:'OS #237 — João Costa',            vencimento:isoMaisDias(-4), pago_em:isoMaisDias(-4), taxa_pct:0,    forma_pagamento:'pix',         os_id:null },
  { id:'m-c-7', tipo:'receita', valor:650, conta_id:'mock-infinitepay', categoria:'Venda de máquina', descricao:'Venda M-201 — Carlos Lima',       vencimento:isoMaisDias(-5), pago_em:isoMaisDias(-5), taxa_pct:9.50, forma_pagamento:'credito_parcelado', os_id:null },
  { id:'m-c-8', tipo:'despesa', valor:800, conta_id:'mock-cresol',      categoria:'Funcionários',     descricao:'Pró-labore parcial',              vencimento:isoMaisDias(-6), pago_em:isoMaisDias(-6), taxa_pct:0,    forma_pagamento:'pix',         os_id:null },
  { id:'m-c-9', tipo:'receita', valor:295, conta_id:'mock-cresol',      categoria:'Manutenção',       descricao:'OS #236 — Roberto Dias',          vencimento:isoMaisDias(-7), pago_em:isoMaisDias(-7), taxa_pct:0,    forma_pagamento:'pix',         os_id:null },
  { id:'m-c-10',tipo:'receita', valor:415, conta_id:'mock-infinitepay', categoria:'Manutenção',       descricao:'OS #235 — Paula Mendes',          vencimento:isoMaisDias(-8), pago_em:isoMaisDias(-8), taxa_pct:6.30, forma_pagamento:'credito_parcelado', os_id:null },
]

// Aplica filtros DA UI em cima do mock (espelha o que o server-side faria)
function filtrarMockClientSide(lancs, filtros) {
  let r = lancs
  if (filtros.tipo)      r = r.filter(l => l.tipo === filtros.tipo)
  if (filtros.conta_id)  r = r.filter(l => l.conta_id === filtros.conta_id)
  if (filtros.status === 'pago')   r = r.filter(l => l.pago_em != null)
  if (filtros.status === 'aberto') r = r.filter(l => l.pago_em == null)
  if (filtros.dataInicio) r = r.filter(l => l.vencimento >= filtros.dataInicio)
  if (filtros.dataFim)    r = r.filter(l => l.vencimento <= filtros.dataFim)
  // mesma ordem do server-side: vencimento desc
  return [...r].sort((a, b) => (b.vencimento || '').localeCompare(a.vencimento || ''))
}

// Categorias sugeridas (texto livre — não há mais FK pra categoria_financeira).
// Exportadas pra UI usar como autocomplete/select.
export const CATEGORIAS_SUGESTAO = {
  receita: ['Limpeza', 'Manutenção', 'Peças', 'Venda de máquina', 'Taxa diagnóstico', 'Outros'],
  despesa: ['Funcionários', 'Peças', 'Marketing', 'Utilidades', 'Combustível', 'Materiais', 'Impostos', 'Financiamento', 'Outros'],
}

// ─── Hook principal ─────────────────────────────────────────────────────────
/**
 * @param {object} filtros
 *   - tipo?:       'receita' | 'despesa'
 *   - conta_id?:   uuid da conta_bancaria
 *   - status?:     'pago' | 'aberto'   (derivado de pago_em IS NULL ou NOT NULL)
 *   - dataInicio?: 'YYYY-MM-DD' (>= vencimento)
 *   - dataFim?:    'YYYY-MM-DD' (<= vencimento)
 */
export function useFinanceiro(filtros = {}) {
  const [lancamentos, setLancamentos] = useState([])
  const [contas, setContas]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [tabelaAusente, setTabelaAusente] = useState(false)

  // Memoizo a chave dos filtros pra evitar refetch infinito.
  const filtrosKey = useMemo(() => JSON.stringify(filtros), [filtros])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // ─── 1. Lançamentos ──────────────────────────────────────────────────
      // Server-side: filtros por tipo, conta_id, status (via pago_em), e
      // janela de vencimento. Join lateral com conta_bancaria pra ter o nome
      // sem 2ª round-trip.
      let q = supabase
        .from('lancamento_financeiro')
        .select(`
          id, tipo, valor, conta_id, categoria, descricao,
          vencimento, pago_em, taxa_pct, forma_pagamento, os_id,
          deleted_at,
          conta:conta_id ( id, nome, tipo )
        `)
        .is('deleted_at', null)

      if (filtros.tipo)        q = q.eq('tipo', filtros.tipo)
      if (filtros.conta_id)    q = q.eq('conta_id', filtros.conta_id)
      if (filtros.status === 'pago')   q = q.not('pago_em', 'is', null)
      if (filtros.status === 'aberto') q = q.is('pago_em', null)
      if (filtros.dataInicio)  q = q.gte('vencimento', filtros.dataInicio)
      if (filtros.dataFim)     q = q.lte('vencimento', filtros.dataFim)

      q = q.order('vencimento', { ascending: false })

      const { data: lancs, error: errLanc } = await q

      if (errLanc) {
        if (isMissingTable(errLanc)) {
          // Fallback: usa mock com filtros aplicados client-side
          setTabelaAusente(true)
          setLancamentos(filtrarMockClientSide(MOCK_LANCAMENTOS_BRUTO, filtros).map(comConta))
          setContas(MOCK_CONTAS)
          return
        }
        throw errLanc
      }

      setTabelaAusente(false)
      setLancamentos(lancs || [])

      // ─── 2. Contas bancárias (lista pra dropdowns) ───────────────────────
      // Auxiliar — se a tabela `conta_bancaria` também não existir, usa mock.
      const { data: ctas, error: errCta } = await supabase
        .from('conta_bancaria')
        .select('id, nome, tipo, ativo')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (errCta && isMissingTable(errCta)) {
        setContas(MOCK_CONTAS)
      } else if (errCta) {
        throw errCta
      } else {
        setContas(ctas || [])
      }
    } catch (err) {
      setError(err)
      console.error('useFinanceiro:', err)
    } finally {
      setLoading(false)
    }
  }, [filtrosKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── CRUD ──────────────────────────────────────────────────────────────
  // Em modo demo (tabelaAusente), retorna error.code='OFFLINE' pra UI saber
  // que precisa cair no comportamento in-memory.

  async function criar(payload) {
    if (tabelaAusente) return { data: null, error: { code: 'OFFLINE', message: 'Tabela não aplicada' } }
    const limpo = {
      tipo: payload.tipo,                                         // 'receita' | 'despesa'
      valor: Number(payload.valor) || 0,
      conta_id: payload.conta_id || null,
      categoria: payload.categoria?.trim() || null,
      descricao: payload.descricao?.trim() || null,
      vencimento: payload.vencimento || null,
      pago_em: payload.pago_em || null,
      taxa_pct: payload.taxa_pct != null ? Number(payload.taxa_pct) : 0,
      forma_pagamento: payload.forma_pagamento || null,
      os_id: payload.os_id || null,
    }
    const { data, error: err } = await supabase
      .from('lancamento_financeiro')
      .insert(limpo)
      .select()
      .single()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  /**
   * Edita campos arbitrários de um lançamento. Aceita um patch parcial e só
   * envia o que foi passado (não sobrescreve null em campos ausentes).
   *
   * Campos editáveis: tipo, valor, vencimento, pago_em, categoria, descricao,
   * conta_id, forma_pagamento, taxa_pct, os_id.
   *
   * @param {string} id
   * @param {object} patch
   */
  async function atualizar(id, patch) {
    if (tabelaAusente) return { data: null, error: { code: 'OFFLINE', message: 'Tabela não aplicada' } }
    const CAMPOS_EDITAVEIS = [
      'tipo', 'valor', 'vencimento', 'pago_em',
      'categoria', 'descricao', 'conta_id',
      'forma_pagamento', 'taxa_pct', 'os_id',
    ]
    const limpo = {}
    for (const k of CAMPOS_EDITAVEIS) {
      if (patch[k] === undefined) continue
      if (k === 'valor' || k === 'taxa_pct') {
        limpo[k] = patch[k] == null ? null : Number(patch[k])
      } else if (typeof patch[k] === 'string') {
        limpo[k] = patch[k].trim() || null
      } else {
        limpo[k] = patch[k]
      }
    }
    if (Object.keys(limpo).length === 0) {
      return { data: null, error: { code: 'NOOP', message: 'Nada a atualizar' } }
    }
    const { data, error: err } = await supabase
      .from('lancamento_financeiro')
      .update(limpo)
      .eq('id', id)
      .select()
      .single()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  /**
   * Marca como pago. Em modo real, faz UPDATE. Em modo demo, devolve OFFLINE
   * (a Página já tem fallback in-memory pra esse caso).
   *
   * @param {string} id
   * @param {object} opts — { pago_em?, forma_pagamento?, taxa_pct?, conta_id? }
   */
  async function darBaixa(id, opts = {}) {
    if (tabelaAusente) return { data: null, error: { code: 'OFFLINE', message: 'Tabela não aplicada' } }
    const patch = {
      pago_em: opts.pago_em || new Date().toISOString().slice(0, 10),
    }
    if (opts.forma_pagamento)        patch.forma_pagamento = opts.forma_pagamento
    if (opts.taxa_pct != null)       patch.taxa_pct = Number(opts.taxa_pct)
    if (opts.conta_id)               patch.conta_id = opts.conta_id

    const { data, error: err } = await supabase
      .from('lancamento_financeiro')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (!err) await fetchAll()
    return { data, error: err }
  }

  async function excluir(id) {
    if (tabelaAusente) return { error: { code: 'OFFLINE', message: 'Tabela não aplicada' } }
    const { data: user } = await supabase.auth.getUser()
    const { error: err } = await supabase
      .from('lancamento_financeiro')
      .update({
        deleted_at: new Date().toISOString(),
        excluido_por: user?.user?.id || null,
      })
      .eq('id', id)
    if (!err) await fetchAll()
    return { error: err }
  }

  return {
    lancamentos, contas,
    loading, error, tabelaAusente,
    refetch: fetchAll,
    criar, atualizar, darBaixa, excluir,
  }
}
