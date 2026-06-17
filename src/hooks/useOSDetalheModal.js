// src/hooks/useOSDetalheModal.js
// Encapsula tudo o que precisa pra renderizar o OSDetalhe como modal — user
// autenticado, lista de OS (osList), lista de usuários, callbacks de mover/
// update/excluir/toggleAgPeca.
//
// Uso (em qualquer página que queira abrir OSDetalhe):
//
//   const { abrirOSPorNumero, modalProps } = useOSDetalheModal({ notify })
//   ...
//   <Button onClick={() => abrirOSPorNumero(247)}>Abrir OS</Button>
//   {modalProps && <OSDetalhe {...modalProps} />}
//
// IMPORTANTE: cada instância usa seu próprio useOS internamente. Em prod,
// se 2 páginas montam o hook simultaneamente, são 2 fetches separados.
// Aceitável pro caso atual (Kanban + Logística não ficam abertas ao mesmo
// tempo na prática). Otimizar depois com contexto global se precisar.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useOS, uiEtapaToDb } from './useOS'
import { useUsuarios } from './useUsuarios'
import { podeMoverOS } from '../utils/osHelpers'
import { ETAPAS_TODOS, TIPOS_OS } from '../utils/osData'

export function useOSDetalheModal({ notify, buscando = false } = {}) {
  const [user, setUser] = useState(null)
  const [osDetalhe, setOsDetalhe] = useState(null) // OS aberta no modal
  const {
    osList, setOsList,
    refetch: osRefetch,
    loading: osLoading,
    updateOS: updateOSHook,
  } = useOS(buscando)
  const { usuarios } = useUsuarios()

  // Auth user
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, session) => setUser(session?.user ?? null)
    )
    return () => subscription?.unsubscribe?.()
  }, [])

  // Mantém a OS aberta em sincronia com o osList (após updates/realtime)
  useEffect(() => {
    if (!osDetalhe) return
    const atualizada = osList.find(o => o.id === osDetalhe.id)
    if (atualizada && atualizada !== osDetalhe) setOsDetalhe(atualizada)
  }, [osList, osDetalhe])

  // ─── Callbacks (copy-paste do Kanban — única fonte da verdade futura) ────
  const moverOS = useCallback(async (numero, etapaAlvo) => {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const etapaUnif = ETAPAS_TODOS.find(e => e.id === etapaAlvo)
    const alvoReal = etapaUnif?.match?.[os.tipo]
    if (!alvoReal) {
      notify?.('erro', `Esta coluna não aceita OS de ${TIPOS_OS[os.tipo].label}`)
      return
    }
    const r = podeMoverOS(os, alvoReal, { pularEtapas: true })
    if (!r.ok) {
      notify?.('erro', r.motivo)
      return
    }
    const etapaFinal = r.alvo || alvoReal
    const osPrev = osList
    setOsList(prev => prev.map(o => o.numero === numero ? { ...o, etapa: etapaFinal } : o))

    const dbEtapa = uiEtapaToDb(os.tipo, etapaFinal)
    const patch = { etapa: dbEtapa }
    if (etapaFinal === 'concluido') patch.data_conclusao = new Date().toISOString()
    else if (os.etapa === 'concluido') patch.data_conclusao = null

    const { error: errUp } = await supabase.from('os').update(patch).eq('id', os.id)
    if (errUp) {
      setOsList(osPrev)
      notify?.('erro', 'Erro ao mover OS — mudança revertida')
      return
    }
    const { data: session } = await supabase.auth.getSession()
    const uid = session?.session?.user?.id || null
    await supabase.from('os_historico').insert({
      os_id: os.id,
      etapa_de: uiEtapaToDb(os.tipo, os.etapa),
      etapa_para: dbEtapa,
      funcionario_id: uid,
    })
    const labelFinal = TIPOS_OS[os.tipo].etapas.find(e => e.id === etapaFinal)?.label || etapaFinal
    notify?.('ok', `OS #${numero} movida para ${labelFinal}`)
  }, [osList, setOsList, notify])

  const updateOS = useCallback(async (numero, patch) => {
    const res = await updateOSHook(numero, patch)
    if (!res.ok) notify?.('erro', 'Erro ao salvar — mudança revertida')
  }, [updateOSHook, notify])

  const excluirOS = useCallback(async (numero) => {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const osPrev = osList
    setOsList(prev => prev.filter(o => o.numero !== numero))
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('os').update({
        deleted_at: new Date().toISOString(),
        excluido_por: userData?.user?.id || null,
      }).eq('id', os.id)
      if (error) throw error
      notify?.('ok', `OS #${numero} excluída`)
    } catch (e) {
      setOsList(osPrev)
      notify?.('erro', `Erro ao excluir OS: ${e?.message || 'desconhecido'}`)
    }
  }, [osList, setOsList, notify])

  const toggleAgPecaOS = useCallback(async (numero) => {
    const os = osList.find(o => o.numero === numero)
    if (!os) return
    const novoValor = !os.aguardando_peca
    const osPrev = osList
    setOsList(prev => prev.map(o => o.numero === numero ? { ...o, aguardando_peca: novoValor } : o))
    const { error: errUp } = await supabase.from('os').update({ aguardando_peca: novoValor }).eq('id', os.id)
    if (errUp) {
      setOsList(osPrev)
      notify?.('erro', 'Erro ao alternar "aguardando peça"')
    }
  }, [osList, setOsList, notify])

  // ─── API pública ─────────────────────────────────────────────────────────
  const abrirOSPorNumero = useCallback((numero) => {
    const os = osList.find(o => o.numero === numero)
    if (os) setOsDetalhe(os)
    else notify?.('erro', `OS #${numero} não encontrada na lista`)
  }, [osList, notify])

  const abrirOSPorId = useCallback((id) => {
    const os = osList.find(o => o.id === id)
    if (os) setOsDetalhe(os)
    else notify?.('erro', 'OS não encontrada na lista')
  }, [osList, notify])

  const fechar = useCallback(() => setOsDetalhe(null), [])

  // Props prontas pra spreadar em <OSDetalhe>
  const modalProps = osDetalhe ? {
    os: osDetalhe,
    user,
    osBase: osList,
    usuarios,
    onClose: fechar,
    onToggleAgPeca: () => toggleAgPecaOS(osDetalhe.numero),
    onAbrirOS: abrirOSPorNumero,
    onMoverOS: moverOS,
    onUpdateOS: updateOS,
    onExcluir: excluirOS,
    onRefetchOS: osRefetch,
  } : null

  return {
    abrirOSPorNumero,
    abrirOSPorId,
    fechar,
    modalProps,
    osList,
    osLoading,
    osRefetch,
    user,
  }
}
