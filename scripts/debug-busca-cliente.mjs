import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

// 1. Contagem total — sem nenhum filtro
const { count: total, error: e1 } = await supabase
  .from('cliente').select('*', { count: 'exact', head: true })
console.log('Total (sem filtro):', e1 ? 'ERR=' + e1.message : total)

// 2. Contagem só os com deleted_at NULL
const { count: vivos, error: e2 } = await supabase
  .from('cliente').select('*', { count: 'exact', head: true }).is('deleted_at', null)
console.log('Total deleted_at IS NULL:', e2 ? 'ERR=' + e2.message : vivos)

// 3. Lista 3 primeiros sem filtro
const { data: amostra, error: e3 } = await supabase
  .from('cliente').select('id, nome, telefone, deleted_at').limit(5)
console.log('Amostra:', e3 ? 'ERR=' + e3.message : amostra)

// 4. Tenta useClientes-style — exatamente igual ao hook que diz funcionar pra 782
const { data: hookStyle, error: e4 } = await supabase
  .from('cliente').select('*').is('deleted_at', null).order('nome', { ascending: true })
console.log('Hook-style count:', e4 ? 'ERR=' + e4.message : hookStyle?.length)
