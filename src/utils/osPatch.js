// src/utils/osPatch.js
// Normaliza patches do updateOS (UI → DB) e filtra pra colunas existentes na tabela `os`.
//
// Por que existe: as Ações do OSDetalhe chamam onUpdateOS com nomes de UI
// (ex: { valor, marca, defeito }). A tabela `os` no Supabase usa nomes diferentes
// (valor_total, marca_equipamento, defeito_relatado) e ainda não tem colunas pra
// vários campos novos (diagnostico, oficina_execucao, teste_falhas, entrega_*).
// Este normalizador faz a tradução + filtra fora o que ainda não persiste,
// pra UI continuar usando os nomes naturais sem quebrar o INSERT/UPDATE.

// Mapa UI → DB (campos com nome diferente)
const UI_TO_DB = {
  valor: 'valor_total',
  marca: 'marca_equipamento',
  modelo: 'modelo_equipamento',
  defeito: 'defeito_relatado',
}

// Whitelist de colunas que sabemos existir na tabela `os` (do SELECT em useOS).
// Quando criar novas colunas no banco, basta adicionar aqui.
const COLUNAS_SAFE = new Set([
  'etapa',
  'valor_total', 'desconto', 'pago', 'valor_pago', 'forma_pagamento',
  'garantia', 'os_origem_id', 'garantia_dias',
  'recusada', 'aguardando_peca',
  'prazo', 'data_conclusao',
  'cliente_id',
  'marca_equipamento', 'modelo_equipamento', 'defeito_relatado',
  'data_agendamento',
])

/**
 * Recebe um patch do updateOS (UI fields) e retorna { dbPatch, skipped }.
 * - dbPatch: pronto pra mandar pro supabase.update()
 * - skipped: array de chaves que não foram persistidas (pra log/debug)
 */
export function normalizePatchOS(patch) {
  const dbPatch = {}
  const skipped = []
  for (const [k, v] of Object.entries(patch || {})) {
    const dbKey = UI_TO_DB[k] || k
    if (COLUNAS_SAFE.has(dbKey)) {
      dbPatch[dbKey] = v
    } else {
      skipped.push(k)
    }
  }
  return { dbPatch, skipped }
}
