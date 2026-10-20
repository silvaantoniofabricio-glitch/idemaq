import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

// Testar sem filtro pra ver se a tabela é acessível
const { data: teste, error: errTeste } = await sb
  .from('ponto_registro')
  .select('id, tipo, bateu_em')
  .limit(3)

console.log('Teste sem filtro:', JSON.stringify({ data: teste, error: errTeste }))
