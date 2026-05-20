// src/hooks/useOSLogistica.js
// Lista OS nas etapas que importam pra Logística:
//
//   - aguardando_agendamento: cliente novo, sem data — agendar pra coletar
//   - agendamento:            já agendado — vai BUSCAR (vira parada "coleta")
//   - teste_final:            quase pronta — planejar entrega futura
//   - entrega:                pronta — vai DEVOLVER (vira parada "entrega")
//   - pagamento:              OS quitando — pode virar parada "cobrança"
//
// Mapeamento etapa → tipo de parada sugerido:
//   ag_agendamento + teste_final → genérico (Visita ou aguarda decisão)
//   agendamento                   → coleta
//   entrega                       → entrega
//   pagamento                     → cobranca

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'

// Etapas no schema do banco (não as labels da UI)
const ETAPAS_LOGISTICA_DB = [
  'aguardando_agendamento',
  'agendamento',
  'teste_final',
  'entrega',
]
const ETAPA_PAGAMENTO_DB = 'pagamento'

// Sugere o tipo de parada baseado na etapa atual da OS
export function tipoParadaPorEtapa(etapaDb) {
  if (etapaDb === 'agendamento') return 'coleta'
  if (etapaDb === 'entrega') return 'entrega'
  if (etapaDb === ETAPA_PAGAMENTO_DB) return 'cobranca'
  // ag_agendamento / teste_final / outros → user escolhe (default visita)
  return 'visita'
}

// Label amigável pra UI
export function labelEtapa(etapaDb) {
  switch (etapaDb) {
    case 'aguardando_agendamento': return 'Aguardando agendamento'
    case 'agendamento': return 'Agendado'
    case 'teste_final': return 'Teste final'
    case 'entrega': return 'Entrega'
    case 'pagamento': return 'Pagamento'
    default: return etapaDb
  }
}

/**
 * @param {object} opts
 *   - incluirPagamento: bool — quando true, traz também OS em etapa pagamento
 *                              (pra adicionar como cobrança)
 * @returns {object} { osList, loading, error, refetch }
 *
 * Cada OS no retorno tem:
 *   id, numero, tipo, etapa_db, etapa_label,
 *   cliente_nome, cliente_telefone,
 *   endereco, lat, lng,
 *   prazo, data_agendamento,
 *   tipoParadaSugerido
 */
export function useOSLogistica({ incluirPagamento = false } = {}) {
  const [osList, setOsList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const etapas = incluirPagamento
        ? [...ETAPAS_LOGISTICA_DB, ETAPA_PAGAMENTO_DB]
        : ETAPAS_LOGISTICA_DB

      const { data, error: err } = await supabase
        .from('os')
        .select(`
          id, numero, tipo, etapa,
          prazo, data_agendamento,
          cliente:cliente_id(id, nome, telefone, endereco)
        `)
        .is('deleted_at', null)
        .in('etapa', etapas)
        .order('data_agendamento', { ascending: true, nullsFirst: false })
        .order('criado_em', { ascending: false })

      if (err) throw err

      const mapped = (data || []).map(os => ({
        id: os.id,
        numero: os.numero,
        tipo: os.tipo,
        etapa_db: os.etapa,
        etapa_label: labelEtapa(os.etapa),
        cliente_nome: os.cliente?.nome || (os.tipo === 'fabricacao' ? 'Fabricação' : 'Sem cliente'),
        cliente_telefone: os.cliente?.telefone || '',
        endereco: os.cliente?.endereco || '',
        lat: null, // cliente.endereco é texto livre por enquanto — sem coords
        lng: null,
        prazo: os.prazo,
        data_agendamento: os.data_agendamento,
        tipoParadaSugerido: tipoParadaPorEtapa(os.etapa),
      }))

      setOsList(mapped)
    } catch (e) {
      setError(e?.message || 'Erro ao carregar OS de logística')
      console.error('[useOSLogistica]', e)
    } finally {
      setLoading(false)
    }
  }, [incluirPagamento])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { osList, loading, error, refetch: fetchAll }
}

// Constantes exportadas pra UI de filtros
export const FILTROS_ETAPA_LOGISTICA = [
  { id: 'aguardando_agendamento', label: 'Aguardando agendamento', cor: 'amarelo', icon: 'ti-calendar-question' },
  { id: 'agendamento',            label: 'Agendado',               cor: 'blue',    icon: 'ti-calendar-check' },
  { id: 'teste_final',            label: 'Teste final',            cor: 'yellow',  icon: 'ti-flask' },
  { id: 'entrega',                label: 'Entrega',                cor: 'green',   icon: 'ti-truck-delivery' },
  { id: 'pagamento',              label: 'Pagamento',              cor: 'orange',  icon: 'ti-cash' },
]
