// Reproduz EXATAMENTE o SELECT do useOS.js pra ver se o PostgREST aceita
// as 3 colunas novas (marca_equipamento/modelo_equipamento/defeito_relatado).
// Uso: node scripts/probe-useos-select.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

const { data, error } = await supabase
  .from('os')
  .select(`
    id, numero, tipo, etapa,
    valor_total, desconto, pago, valor_pago, forma_pagamento,
    garantia, os_origem_id, garantia_dias,
    recusada, aguardando_peca,
    prazo, data_conclusao, criado_em, atualizado_em,
    cliente_id,
    marca_equipamento, modelo_equipamento, defeito_relatado,
    pre_diagnostico, observacoes,
    cliente:cliente_id(id, nome, telefone, deleted_at),
    os_item(count),
    os_historico(id, etapa_de, etapa_para, funcionario_id, data)
  `)
  .is('deleted_at', null)
  .order('criado_em', { ascending: false })
  .limit(3)

if (error) {
  console.log('ERRO PostgREST:', error.message, '· code:', error.code)
  process.exit(1)
}

console.log(`OK · ${data.length} OS retornadas`)
for (const os of data) {
  console.log(`  #${os.numero} · ${os.tipo}/${os.etapa} · marca=${os.marca_equipamento || '(null)'} · modelo=${os.modelo_equipamento || '(null)'} · defeito=${(os.defeito_relatado || '').slice(0,40)}`)
}
