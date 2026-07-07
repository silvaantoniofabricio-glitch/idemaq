// src/hooks/useOS.js
// Hook real do Supabase pra lista de OS.
// - SELECT com outer join em cliente + os_item(count); soft-delete de cliente
//   filtrado em JS pós-fetch (outer porque fabricação tem cliente_id NULL)
// - Realtime: subscreve a tabela `os` e faz refetch silencioso em qualquer mudança
// - updateOS: optimistic + rollback, persiste via normalizePatchOS (whitelist)

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../supabase'
import { normalizePatchOS } from '../utils/osPatch'
import { baixarItensDaOS } from './usePecas'

// Traduz etapa do banco (DB) para o valor usado na UI
export function dbEtapaToUI(tipo, dbEtapa) {
  if (!dbEtapa) return dbEtapa
  if (dbEtapa === 'aguardando_agendamento') return 'ag_agendamento'
  // 'agendamento' no DB = 'agendado' na UI para atendimento, 'agendamento' para venda
  if (dbEtapa === 'agendamento' && tipo === 'atendimento') return 'agendado'
  // Etapa 'recebido' aposentada (06/07/2026) — Avaliação+Diagnóstico unificadas.
  // Linhas antigas (os.etapa e os_historico) aparecem como Diagnóstico na UI.
  if (dbEtapa === 'recebido') return 'diagnostico'
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
  // Ref pra updateOS enxergar sempre a lista mais recente sem virar dependência
  const osListRef = useRef([])
  useEffect(() => { osListRef.current = osList }, [osList])

  const fetchOS = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('os')
        .select(`
          id, numero, tipo, etapa,
          valor_total, desconto, pago, valor_pago, forma_pagamento,
          garantia, os_origem_id, garantia_dias,
          recusada, aguardando_peca,
          prazo, data_agendamento, data_conclusao, criado_em, atualizado_em,
          cliente_id,
          marca_equipamento, modelo_equipamento, numero_serie, defeito_relatado,
          tipo_equipamento,
          pre_diagnostico, observacoes, oculta_no_kanban,
          cliente:cliente_id(id, nome, telefone, endereco, deleted_at),
          os_item(count),
          os_historico(id, etapa_de, etapa_para, funcionario_id, data)
        `)
        .is('deleted_at', null)
        .order('criado_em', { ascending: false })

      if (err) throw err

      const agora = new Date()
      const inicioMesAtual = new Date(agora.getFullYear(), agora.getMonth(), 1)

      const mapped = (data || [])
        .filter(os => {
          // Ocultar concluídas/recusadas de meses anteriores (busca escapa o filtro).
          // Permanecem visíveis até virar o mês — fechamento mensal.
          if (!buscando && os.etapa === 'concluido') {
            const ref = os.data_conclusao || os.criado_em
            if (ref && new Date(ref) < inicioMesAtual) return false
          }
          // recusado: permanece no kanban até ser entregue ou virar fabricação — sem filtro de mês
          // Ocultar OS de cliente soft-deletado (fabricação tem cliente_id NULL — passa)
          if (os.cliente_id && os.cliente?.deleted_at) return false
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
          equipamento: '',
          tipoEquipamento: os.tipo_equipamento || 'lavadora',
          marca: os.marca_equipamento || '',
          modelo: os.modelo_equipamento || '',
          serie: os.numero_serie || '',
          defeito: os.defeito_relatado || '',
          // Endereço: usa o da OS (selecionado na criação) ou cai pro cliente.
          endereco: os.endereco || os.cliente?.endereco || '',
          fotos: 0,
          observacoes: os.observacoes || '',
          // Contagem de itens da OS (vem de os_item(count) → [{ count: N }])
          itens: os.os_item?.[0]?.count || 0,
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
          oculta_no_kanban: os.oculta_no_kanban || false,
          // Pré-diagnóstico: jsonb com testes + observacoes + foto (marker
          // 'storage' OU base64 legacy). Resolve via resolverFotoUrl().
          pre_diagnostico: os.pre_diagnostico || null,
          // Datas convertidas para Cuiabá
          prazo: os.prazo ? toCuiaba(os.prazo) : null,
          data_agendamento: os.data_agendamento || null,
          data_conclusao: os.data_conclusao || null,
          abertura: toCuiaba(os.criado_em),
          // Histórico legado em memória (campo os.historico) pra Header/Timeline.
          // HistoricoPanel e ResumoTab usam hooks reais (useOSHistorico/useOSItens).
          // PostgREST sem alias retorna pelo nome da tabela (os_historico, array).
          // Campo de data na os_historico é `data` (não `criado_em`).
          historico: (os.os_historico || [])
            .slice()
            .sort((a, b) => new Date(a.data) - new Date(b.data))
            .map(h => ({
              etapa: dbEtapaToUI(os.tipo, h.etapa_para),
              funcionario: h.funcionario_id,
              data: toCuiaba(h.data),
            })),
        }))

      setOsList(mapped)
    } catch (e) {
      setError(e?.message || 'Erro ao carregar OS')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [buscando])

  useEffect(() => { fetchOS() }, [fetchOS])

  // Realtime: refetch silencioso quando qualquer linha de `os` muda.
  // Cobre drag-and-drop entre dispositivos, edições de outro usuário, e novas OS.
  //
  // Channel name UNICO por instância — evita conflito "cannot add callbacks
  // after subscribe()" quando duas páginas (ex: Kanban + Vendas) montam
  // useOS ao mesmo tempo (Supabase JS proibe 2 channels com mesmo nome).
  useEffect(() => {
    const channelName = `os-changes-${Math.random().toString(36).slice(2, 10)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'os' },
        () => { fetchOS(true) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOS])

  // updateOS: optimistic update + persist parcial (whitelist via normalizePatchOS).
  // Retorna { ok, error, skipped } — consumer mostra toast/log conforme precisar.
  // Campos fora da whitelist (diagnostico, oficina_execucao, teste_falhas, entrega_*)
  // ficam só em memória até criarmos colunas pra eles.
  //
  // Baixa automática de estoque: quando o patch leva a OS pra 'concluido' (e
  // ela não estava antes), dispara fire-and-forget `baixarEstoqueAoConcluir`
  // após o UPDATE ter sucesso. Best-effort: erros vão pro console, não
  // travam o avanço da OS.
  const updateOS = useCallback(async (numero, patch) => {
    const lista = osListRef.current
    const os = lista.find(o => o.numero === numero)
    if (!os) return { ok: false, error: 'OS não encontrada', skipped: [] }

    const concluindoAgora = patch?.etapa === 'concluido' && os.etapa !== 'concluido'

    const prev = lista
    setOsList(curr => curr.map(o => o.numero === numero ? { ...o, ...patch } : o))

    const { dbPatch, skipped } = normalizePatchOS(patch)
    if (Object.keys(dbPatch).length === 0) {
      if (skipped.length) console.warn('[updateOS] sem colunas persistíveis, mantido só em memória:', skipped)
      return { ok: true, error: null, skipped }
    }

    try {
      const { error: errUp } = await supabase.from('os').update(dbPatch).eq('id', os.id)
      if (errUp) throw errUp
      if (skipped.length) console.warn('[updateOS] persistido', Object.keys(dbPatch), '— pendente schema:', skipped)
      if (concluindoAgora) baixarEstoqueAoConcluir(os.id, os.numero)
      return { ok: true, error: null, skipped }
    } catch (e) {
      setOsList(prev)
      console.error('[updateOS] falha:', e)
      return { ok: false, error: e?.message || 'Erro ao salvar', skipped }
    }
  }, [])

  return { osList, setOsList, loading, error, refetch: fetchOS, updateOS }
}

// =============================================================================
// baixarEstoqueAoConcluir — delega pro baixarItensDaOS (idempotente via flag DB)
// =============================================================================
// Disparada (fire-and-forget) pelo updateOS quando a OS entra em 'concluido'.
// Best-effort: logs no console — não interrompe o UPDATE da OS nem mostra
// toast (pra não poluir; UX da baixa fica em relatórios/PecaDetalheModal).
//
// Idempotência real: `baixarItensDaOS` reivindica `os.itens_baixados=true` via
// UPDATE atômico antes de mexer em estoque, então 2 chamadas concorrentes
// (race entre devices/tabs) só fazem trabalho uma vez. Pré-requisito:
// sql/07-os-itens-baixados.sql aplicado.
async function baixarEstoqueAoConcluir(osId, osNumero) {
  try {
    const res = await baixarItensDaOS(osId)
    if (!res?.ok) {
      console.warn(`[baixaAuto] OS #${osNumero}: ${res?.motivo || 'falhou'}`)
      return
    }
    if (res.ja_baixado) {
      console.log(`[baixaAuto] OS #${osNumero}: já foi baixada antes (os.itens_baixados=true)`)
      return
    }
    if (res.aplicadas?.length) {
      console.log(`[baixaAuto] OS #${osNumero}: ${res.aplicadas.length} peça(s) baixada(s)`, res.aplicadas)
    } else {
      console.log(`[baixaAuto] OS #${osNumero}: nenhum item com peca_id pra baixar`)
    }
    if (res.erros?.length) {
      console.warn(`[baixaAuto] OS #${osNumero}: erros parciais:`, res.erros)
    }
  } catch (e) {
    console.error(`[baixaAuto] OS #${osNumero} exceção:`, e)
  }
}
