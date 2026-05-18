// src/hooks/useOS.js
// Hook real do Supabase pra lista de OS (Módulo 00c · Lote 1).
// Consolidado em 18/05/2026 — antes era um shim mock que retornava OS_MOCK,
// causando "invalid input syntax for type uuid: 'mock-003'" quando o Kanban
// passava id mock pros hooks reais (useOSItens/useOSHistorico).

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// Traduz etapa do banco (DB) para o valor usado na UI
function dbEtapaToUI(tipo, dbEtapa) {
  if (!dbEtapa) return dbEtapa
  if (dbEtapa === 'aguardando_agendamento') return 'ag_agendamento'
  // 'agendamento' no DB = 'agendado' na UI para atendimento, 'agendamento' para venda
  if (dbEtapa === 'agendamento' && tipo === 'atendimento') return 'agendado'
  if (dbEtapa === 'em_oficina') return 'oficina'
  // 'entrega' no DB = 'entregue' na UI para venda
  if (dbEtapa === 'entrega' && tipo === 'venda') return 'entregue'
  return dbEtapa
}

// Traduz etapa da UI para o valor do banco (para UPDATE)
export function uiEtapaToDb(tipo, uiEtapa) {
  if (!uiEtapa) return uiEtapa
  if (uiEtapa === 'ag_agendamento') return 'aguardando_agendamento'
  if (uiEtapa === 'agendado') return 'agendamento'
  if (uiEtapa === 'oficina') return 'em_oficina'
  if (uiEtapa === 'entregue') return 'entrega'
  return uiEtapa
}

// Converte data UTC para string local de Cuiabá (sem timezone, para exibição)
function toCuiaba(utcStr) {
  if (!utcStr) return null
  return new Date(utcStr)
    .toLocaleString('sv-SE', { timeZone: 'America/Cuiaba' })
    .slice(0, 16)
    .replace('T', ' ')
}

export function useOS(buscando = false) {
  const [osList, setOsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchOS = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('os')
        .select(`
          id, numero, tipo, etapa,
          valor_total, desconto, pago, valor_pago, forma_pagamento,
          garantia, os_origem_id, garantia_dias,
          recusada, aguardando_peca,
          prazo, data_conclusao, criado_em,
          cliente:cliente_id(id, nome, telefone),
          os_historico(id, etapa_de, etapa_para, funcionario_id, criado_em)
        `)
        .is('deleted_at', null)
        .order('criado_em', { ascending: false })

      if (err) throw err

      const limite24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const mapped = (data || [])
        .filter(os => {
          // Ocultar concluídas há mais de 24h (busca escapa esse filtro)
          if (!buscando && os.data_conclusao && new Date(os.data_conclusao) < limite24h) return false
          return true
        })
        .map(os => ({
          id: os.id,
          numero: os.numero,
          tipo: os.tipo,
          etapa: dbEtapaToUI(os.tipo, os.etapa),
          cliente: os.cliente?.nome || '',
          fone: os.cliente?.telefone || '',
          cliente_id: os.cliente?.id || null,
          // Campos não existentes no schema v1 — preenchidos quando maquina_id for adicionado
          equipamento: '',
          marca: '',
          modelo: '',
          serie: '',
          defeito: '',
          endereco: '',
          fotos: 0,
          observacoes: '',
          // Financeiro
          valor: os.valor_total || 0,
          desconto: os.desconto || 0,
          pago: os.pago || 'nao',
          valor_pago: os.valor_pago || 0,
          forma_pagamento: os.forma_pagamento || '',
          // Garantia
          garantia: os.garantia || false,
          os_origem_id: os.os_origem_id || null,
          garantia_dias: os.garantia_dias || 90,
          // Flags
          recusada: os.recusada || false,
          aguardando_peca: os.aguardando_peca || false,
          // Pré-diagnóstico: removido do select (não é coluna direta da `os`,
          // vive na pre_diagnostico ou jsonb que ainda não está mapeado).
          // Componentes que leem `os.pre_diagnostico` recebem null por enquanto.
          pre_diagnostico: null,
          // Datas convertidas para Cuiabá
          prazo: os.prazo ? toCuiaba(os.prazo) : null,
          data_conclusao: os.data_conclusao || null,
          abertura: toCuiaba(os.criado_em),
          // Histórico legado em memória (campo os.historico) pra Header/Timeline.
          // HistoricoPanel e ResumoTab usam hooks reais (useOSHistorico/useOSItens).
          // PostgREST sem alias retorna o nome da tabela: os_historico (array).
          historico: (os.os_historico || [])
            .slice()
            .sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em))
            .map(h => ({
              etapa: dbEtapaToUI(os.tipo, h.etapa_para),
              funcionario: h.funcionario_id,
              data: toCuiaba(h.criado_em),
            })),
        }))

      setOsList(mapped)
    } catch (e) {
      setError(e?.message || 'Erro ao carregar OS')
    } finally {
      setLoading(false)
    }
  }, [buscando])

  useEffect(() => { fetchOS() }, [fetchOS])

  return { osList, setOsList, loading, error, refetch: fetchOS }
}
