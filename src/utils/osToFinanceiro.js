// src/utils/osToFinanceiro.js
// Integração OS → Financeiro: ao confirmar pagamento na OS, cria os
// lançamentos correspondentes em `lancamento_financeiro`.
//
// Regras de negócio (contexto-financeiro.md §21, 20/05/2026):
//   - Caixa automático ao confirmar pagamento (receita pago = Caixa)
//   - Pagamento misto = N lançamentos separados (1 por forma) — cada
//     confirmação parcial já vira 1 lançamento, então misto é automático
//   - Taxa da maquininha = despesa automática em D+1 útil (pula FDS+feriados)
//   - A prazo = N receitas EM ABERTO, uma por parcela, vencimento = data da parcela
//
// Não falha o pagamento se algo der errado — best-effort com log.

import { supabase } from '../supabase'
import { calcularD1UtilISO } from './financeiro'
import { hojeISO } from './fmt'

// Mapeamento forma → nome da conta bancária (sql/01 seedou 12 contas).
// Lookup roda no insert; se a conta não existir, lança com conta_id=null.
const FORMA_TO_CONTA_NOME = {
  pix:      'Mercado Pago',
  dinheiro: 'Cresol',
  debito:   'InfinitePay',
  credito:  'InfinitePay',
  link:     'InfinitePay',
  aprazo:   null, // a prazo não tem conta definida no recebimento
}

// Classifica o ID de forma do FormRecebimento ('credito_3x' → 'credito').
function classificarForma(forma) {
  if (!forma) return 'pix'
  if (forma.startsWith('credito_')) return 'credito'
  if (forma.startsWith('link_'))    return 'link'
  if (forma.startsWith('aprazo_'))  return 'aprazo'
  return forma
}

// Categoria default conforme tipo da OS. Toni edita depois se quiser.
function categoriaPorTipoOS(tipoOS) {
  if (tipoOS === 'venda' || tipoOS === 'fabricacao') return 'Venda de máquina'
  return 'Manutenção'
}

// Descritivo amigável pra coluna `descricao` do lançamento.
function descricaoOS(os, sufixo = '') {
  const cliente = os.cliente?.nome || os.cliente_nome || 'Cliente'
  return `OS #${os.numero} — ${cliente}${sufixo ? ' · ' + sufixo : ''}`
}

// Resolve conta_id pelo nome — cache simples por sessão pra evitar N queries.
const _cacheContas = new Map()
async function resolverContaId(nome) {
  if (!nome) return null
  if (_cacheContas.has(nome)) return _cacheContas.get(nome)
  const { data, error } = await supabase
    .from('conta_bancaria')
    .select('id')
    .eq('nome', nome)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()
  if (error || !data) {
    console.warn(`[osToFinanceiro] conta "${nome}" não encontrada — lançamento sem conta_id`)
    _cacheContas.set(nome, null)
    return null
  }
  _cacheContas.set(nome, data.id)
  return data.id
}

/**
 * Monta os payloads de lançamento a partir de uma confirmação de pagamento.
 * NÃO insere — retorna o array pra o caller decidir quando/como persistir.
 *
 * @param {object} os - { id, numero, tipo, cliente, ... }
 * @param {object} pagamento
 *   - valor: number — valor confirmado (parcial ou total)
 *   - forma: string — id do FormRecebimento ('pix', 'credito_3x', 'aprazo_2x', etc)
 *   - taxa_pct: number — taxa cobrada pela maquininha (já calculada pelo FormRecebimento)
 *   - parcelasAPrazo?: [{ data: 'YYYY-MM-DD', valor: number }] — só quando forma === 'aprazo_*'
 *
 * @returns {Promise<Array<object>>} payloads prontos pra useFinanceiro.criar()
 */
export async function montarLancamentosDoPagamento(os, { valor, forma, taxa_pct = 0, parcelasAPrazo = [], dataPagamento = null }) {
  const classe = classificarForma(forma)
  const categoria = categoriaPorTipoOS(os.tipo)
  // Data do recebimento: a escolhida no form (pré-preenchida com hoje) ou hoje.
  const hoje = (dataPagamento && /^\d{4}-\d{2}-\d{2}$/.test(dataPagamento))
    ? dataPagamento
    : hojeISO()
  const payloads = []

  // ─── A prazo: N receitas em aberto, uma por parcela ─────────────────────────
  if (classe === 'aprazo') {
    const total = parcelasAPrazo.length
    for (let i = 0; i < total; i++) {
      const p = parcelasAPrazo[i]
      payloads.push({
        tipo: 'receita',
        valor: Number(p.valor) || 0,
        conta_id: null,
        categoria,
        descricao: descricaoOS(os, `${i + 1}ª/${total} a prazo`),
        vencimento: p.data || hoje,
        pago_em: null,
        taxa_pct: 0,
        forma_pagamento: 'a_prazo',
        os_id: os.id,
      })
    }
    return payloads
  }

  // ─── Pagamento à vista (PIX/Dinheiro/Débito/Crédito/Link) ──────────────────
  // 1. Receita já paga (vai pro Caixa imediato)
  const contaReceita = await resolverContaId(FORMA_TO_CONTA_NOME[classe])
  payloads.push({
    tipo: 'receita',
    valor: Number(valor) || 0,
    conta_id: contaReceita,
    categoria,
    descricao: descricaoOS(os),
    vencimento: hoje,
    pago_em: hoje,
    taxa_pct: Number(taxa_pct) || 0,
    forma_pagamento: forma,
    os_id: os.id,
  })

  // 2. Despesa de taxa da maquininha em D+1 útil (só se taxa > 0)
  if (Number(taxa_pct) > 0) {
    const valorTaxa = (Number(valor) * Number(taxa_pct)) / 100
    payloads.push({
      tipo: 'despesa',
      valor: valorTaxa,
      conta_id: contaReceita, // mesma conta da receita (sai dela)
      categoria: 'Taxa maquininha',
      descricao: descricaoOS(os, `taxa ${taxa_pct.toFixed(2).replace('.', ',')}%`),
      vencimento: calcularD1UtilISO(hoje),
      pago_em: calcularD1UtilISO(hoje),
      taxa_pct: 0,
      forma_pagamento: null,
      os_id: os.id,
    })
  }

  return payloads
}

/**
 * Versão "fire-and-forget": monta + insere os lançamentos. Best-effort —
 * loga erros mas não interrompe o fluxo do pagamento na OS.
 *
 * @returns {Promise<{ ok: boolean, criados: number, erros: Array }>}
 */
export async function persistirLancamentosDoPagamento(os, pagamento) {
  try {
    const payloads = await montarLancamentosDoPagamento(os, pagamento)
    if (payloads.length === 0) return { ok: true, criados: 0, erros: [] }

    const { data, error } = await supabase
      .from('lancamento_financeiro')
      .insert(payloads)
      .select('id, tipo, valor')

    if (error) {
      console.error('[osToFinanceiro] insert falhou:', error)
      return { ok: false, criados: 0, erros: [error.message] }
    }

    console.log(`[osToFinanceiro] OS #${os.numero}: ${data.length} lançamento(s) criado(s)`, data)
    return { ok: true, criados: data.length, erros: [] }
  } catch (e) {
    console.error('[osToFinanceiro] exceção:', e)
    return { ok: false, criados: 0, erros: [e.message] }
  }
}
