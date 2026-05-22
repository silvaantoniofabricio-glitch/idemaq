// One-shot: cria OS pro Sargento Ribeiro (telefone 67 99494456).
// Se o cliente nao existir, cria. Agendamento 21/05/2026 08:15.
// Uso: node scripts/criar-os-sargento.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yfbbruxqfzgetapbvrgd.supabase.co',
  'sb_publishable_LjPdeaBlBZ9rBNMT0lk8Nw_oyI01iqP'
)

const TELEFONE_BUSCA = '9494456'  // sufixo unico (formato livre na base Bling)
const NOME_NOVO     = 'Sargento Ribeiro'
const TELEFONE_NOVO = '67 99494-4456'
const ENDERECO_NOVO = 'Av Amambai, 870 — Naviraí/MS'

// 21/05/2026 08:15 horario de Cuiaba (UTC-4)
const DATA_AG_ISO = new Date('2026-05-21T08:15:00-04:00').toISOString()

async function main() {
  // 1. Busca cliente por sufixo do telefone
  const { data: achados, error: errBusca } = await supabase
    .from('cliente')
    .select('id, nome, telefone, endereco')
    .ilike('telefone', `%${TELEFONE_BUSCA}%`)
    .is('deleted_at', null)
    .limit(5)

  if (errBusca) {
    console.error('[busca cliente] ERRO:', errBusca.code, errBusca.message)
    process.exit(1)
  }

  console.log(`busca por "${TELEFONE_BUSCA}" => ${achados.length} cliente(s):`)
  for (const c of achados) console.log(`  - ${c.nome} · ${c.telefone} · ${c.endereco || '(sem endereco)'}`)

  let clienteId
  if (achados.length > 0) {
    clienteId = achados[0].id
    console.log(`\nusando cliente existente: ${achados[0].nome} (id=${clienteId})`)
  } else {
    console.log('\ncliente nao encontrado, criando...')
    const { data, error } = await supabase
      .from('cliente')
      .insert({ nome: NOME_NOVO, telefone: TELEFONE_NOVO, endereco: ENDERECO_NOVO })
      .select()
      .single()
    if (error) {
      console.error('[insert cliente] ERRO:', error.code, error.message)
      process.exit(1)
    }
    clienteId = data.id
    console.log(`cliente criado: ${data.nome} (id=${clienteId})`)
  }

  // 2. Cria OS de atendimento agendada
  const payload = {
    tipo: 'atendimento',
    etapa: 'agendamento',
    cliente_id: clienteId,
    marca_equipamento: null,
    modelo_equipamento: 'Maquina de lavar',
    numero_serie: null,
    defeito_relatado: null,
    data_agendamento: DATA_AG_ISO,
  }
  const { data: os, error: errOS } = await supabase
    .from('os')
    .insert(payload)
    .select('id, numero, etapa, data_agendamento')
    .single()
  if (errOS) {
    console.error('[insert os] ERRO:', errOS.code, errOS.message)
    process.exit(1)
  }
  console.log(`\n✅ OS #${os.numero} criada (etapa=${os.etapa}, agendamento=${os.data_agendamento})`)
}

main()
