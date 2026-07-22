// src/utils/osDerivada.js
// Helper standalone pra criar uma OS NOVA derivada de outra (garantia ou
// conversão de Recusada→Fabricação). Não depende do hook useOS — o Realtime
// dele detecta a nova linha e leva pro Kanban automaticamente.
//
// Por que existir:
//   - useOS.js é compartilhado e mexido em paralelo (Estoque etc.) → evitar
//     adicionar mutators de criação lá.
//   - Mesma filosofia do criarClientePersist do useClientes.js.
//
// Estratégia: 1 SELECT na OS origem pra puxar marca/modelo/defeito/cliente +
// 1 INSERT na `os` com overrides. Trigger do banco gera numero/criado_em/_por
// e os_historico (sem etapa_de, etapa_para=etapa inicial).

import { supabase } from '../supabase'

const CAMPOS_ORIGEM = 'id, cliente_id, marca_equipamento, modelo_equipamento, numero_serie, defeito_relatado, garantia_dias'

/**
 * Duplica uma OS existente: copia cliente + tipo + equipamento + defeito +
 * observações e abre nova OS do zero (etapa inicial, sem financeiro, sem garantia).
 * Recebe o objeto `os` já mapeado pelo useOS (não precisa de SELECT extra).
 * Devolve { data, error, numero }.
 */
export async function duplicarOS(os) {
  if (!os?.id) return { data: null, error: new Error('os.id obrigatório'), numero: null }

  const payload = {
    cliente_id:         os.cliente_id   || null,
    tipo:               os.tipo         || 'atendimento',
    etapa:              'diagnostico', // 'recebido' aposentado — Avaliação+Diagnóstico unificados
    marca_equipamento:  os.marca        || null,
    modelo_equipamento: os.modelo       || null,
    numero_serie:       os.serie        || null,
    defeito_relatado:   os.defeito      || null,
    observacoes:        os.observacoes  || null,
  }

  const { data, error } = await supabase
    .from('os').insert(payload).select('id, numero').single()
  if (error) return { data: null, error, numero: null }
  return { data, error: null, numero: data?.numero ?? null }
}

/**
 * Cria OS nova derivada de `osOrigemId`. Devolve { data, error, numero }.
 * `overrides` substitui qualquer campo do payload (tipo, etapa, garantia, …).
 *
 * Exemplo — converter Recusada em Fabricação:
 *   criarOSDerivada(os.id, { tipo: 'fabricacao', etapa: 'diagnostico', cliente_id: null })
 *
 * Exemplo — abrir OS de garantia:
 *   criarOSDerivada(os.id, { tipo: 'atendimento', etapa: 'recebido',
 *                            garantia: true, valor_total: 0, garantia_dias: 90 })
 */
export async function criarOSDerivada(osOrigemId, overrides = {}) {
  if (!osOrigemId) return { data: null, error: new Error('osOrigemId obrigatório'), numero: null }

  const { data: origem, error: errSel } = await supabase
    .from('os').select(CAMPOS_ORIGEM)
    .eq('id', osOrigemId).single()
  if (errSel) return { data: null, error: errSel, numero: null }

  const payload = {
    cliente_id: origem.cliente_id,
    marca_equipamento: origem.marca_equipamento,
    modelo_equipamento: origem.modelo_equipamento,
    numero_serie: origem.numero_serie,
    defeito_relatado: origem.defeito_relatado,
    os_origem_id: origem.id,
    ...overrides,
  }

  const { data, error } = await supabase
    .from('os').insert(payload).select('id, numero').single()
  if (error) return { data: null, error, numero: null }
  return { data, error: null, numero: data?.numero ?? null }
}
