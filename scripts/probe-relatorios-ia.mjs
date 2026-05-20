// Confere as queries reais dos novos hooks: useRelatorioDRE + useRelatorioFuncionarios.
// Roda contra a publishable key — se RLS bloquear, os dois SELECTS vão voltar []
// (silencioso). Sem erro = schema OK; com erro = ajustar.
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

// Mês corrente (mesmo padrão do preset 'mes')
const hoje = new Date()
const ini = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
const iniIso = ini.toISOString()
const fimIso = hoje.toISOString()
const iniDate = iniIso.slice(0, 10)
const fimDate = fimIso.slice(0, 10)

console.log('--- DRE: SELECT em lancamento_financeiro ---')
const dre = await supabase
  .from('lancamento_financeiro')
  .select('tipo, valor, categoria, pago_em, taxa_pct')
  .is('deleted_at', null)
  .not('pago_em', 'is', null)
  .gte('pago_em', iniDate)
  .lte('pago_em', fimDate)
console.log('error:', dre.error)
console.log('count:', dre.data?.length)
if (dre.data?.length) {
  const r = dre.data.filter(d => d.tipo === 'receita').reduce((s, d) => s + Number(d.valor), 0)
  const d = dre.data.filter(d => d.tipo === 'despesa').reduce((s, d) => s + Number(d.valor), 0)
  console.log('receitas:', r, 'despesas:', d, 'lucro:', r - d)
}

console.log('\n--- Funcionários: SELECT em os_historico + join usuarios ---')
const hist = await supabase
  .from('os_historico')
  .select(`
    os_id, etapa_de, etapa_para, duracao_segundos, data, funcionario_id,
    usuarios:funcionario_id ( id, apelido, papel )
  `)
  .gte('data', iniIso)
  .lte('data', fimIso)
  .not('funcionario_id', 'is', null)
console.log('error:', hist.error)
console.log('count:', hist.data?.length)
if (hist.data?.length) {
  const porFunc = {}
  for (const h of hist.data) {
    const k = h.usuarios?.apelido || 'desconhecido'
    porFunc[k] = (porFunc[k] || 0) + 1
  }
  console.log('por funcionário:', porFunc)
}

console.log('\n--- OS concluídas no período ---')
const os = await supabase
  .from('os')
  .select('id, valor_total, desconto, data_conclusao')
  .is('deleted_at', null)
  .eq('etapa', 'concluido')
  .not('data_conclusao', 'is', null)
  .gte('data_conclusao', iniIso)
  .lte('data_conclusao', fimIso)
console.log('error:', os.error)
console.log('count:', os.data?.length)
