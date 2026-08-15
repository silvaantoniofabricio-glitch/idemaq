// src/utils/roteiroEnvio.js
// "Mandar pro roteiro" — empurra uma OS pro Roteiro do Dia de um funcionário,
// de qualquer lugar (OSDetalhe, card do Kanban) sem precisar abrir o painel.
//
// Cria 1 linha em roteiro_item já vinculada à OS (os_id). Faz anti-duplicata:
// se a OS já está no roteiro de ALGUÉM naquele dia, não cria de novo.
//
// Uso:
//   const r = await enviarOSParaRoteiro({ os, responsavelId, dia, apelidoDe })
//   if (r.jaExiste)  → avisar "já está no roteiro de <r.responsavelNome>"
//   if (r.error)     → avisar erro
//   else             → ok, r.data é o item criado

import { supabase } from '../supabase'
import { diaCuiaba } from '../hooks/useRoteiro'

// Texto automático sugerido pela etapa atual da OS (o usuário pode editar depois
// no Roteiro). Em branco quando não há verbo óbvio — o chip da OS já informa.
const TEXTO_POR_ETAPA = {
  coleta:                 'Buscar máquina',
  agendamento:            'Agendar com o cliente',
  aguardando_agendamento: 'Agendar com o cliente',
  avaliacao:              'Avaliar / diagnosticar',
  diagnostico:            'Avaliar / diagnosticar',
  orcamento:              'Passar orçamento',
  oficina:                'Consertar',
  em_oficina:             'Consertar',
  teste:                  'Testar',
  teste_final:            'Testar',
  entrega:                'Entregar máquina',
}

export function textoAutoPorEtapa(etapa) {
  return TEXTO_POR_ETAPA[etapa] || ''
}

// dia ISO ('YYYY-MM-DD' em America/Cuiaba) deslocado em N dias.
export function diaRelativo(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return diaCuiaba(d)
}

export async function enviarOSParaRoteiro({ os, responsavelId, dia, texto, apelidoDe, urgente = false } = {}) {
  if (!os?.id) return { error: new Error('OS sem id') }
  if (!responsavelId) return { error: new Error('responsavelId obrigatório') }
  const diaAlvo = dia || diaCuiaba()

  // 1) Anti-duplicata: a OS já está no roteiro de alguém nesse dia?
  const { data: existentes, error: errBusca } = await supabase
    .from('roteiro_item')
    .select('id, responsavel_id')
    .eq('dia', diaAlvo)
    .eq('os_id', os.id)
    .is('deleted_at', null)
  if (errBusca) return { error: errBusca }
  if (existentes && existentes.length > 0) {
    const ja = existentes[0]
    return {
      jaExiste: true,
      responsavelId: ja.responsavel_id,
      responsavelNome: apelidoDe ? apelidoDe(ja.responsavel_id) : null,
    }
  }

  // 2) ordem = fim da coluna daquela pessoa nesse dia
  const { data: daPessoa } = await supabase
    .from('roteiro_item')
    .select('ordem')
    .eq('dia', diaAlvo)
    .eq('responsavel_id', responsavelId)
    .is('deleted_at', null)
  const ordem = (daPessoa && daPessoa.length)
    ? Math.max(...daPessoa.map(i => i.ordem ?? 0)) + 1
    : 0

  // 3) insere
  const { data, error } = await supabase
    .from('roteiro_item')
    .insert({
      dia: diaAlvo,
      responsavel_id: responsavelId,
      os_id: os.id,
      texto: texto != null ? texto : textoAutoPorEtapa(os.etapa),
      ordem,
      urgente: !!urgente,
    })
    .select().single()
  if (error) return { error }
  return { data }
}
