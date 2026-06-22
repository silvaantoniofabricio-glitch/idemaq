// src/hooks/usePresenca.js
// Presença "online/offline" ao vivo dos usuários (tabela `presenca`, sql/84).
// Diferente do Ponto: aqui é "está ativo no sistema agora".
//
// Dois usos:
//   • usePresencaHeartbeat(funcionarioId) — chamado no nível do app (AppLayout):
//     bate last_seen a cada ~30s enquanto o usuário usa o app.
//   • usePresencaLista() — chamado onde exibe (Roteiro): retorna porId
//     (funcionario_id → { online, desdeMs }) ao vivo + ticker de duração.

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../supabase'

const HEARTBEAT_MS = 30000   // bate presença a cada 30s
const OFFLINE_MS   = 75000   // sem heartbeat há >75s = offline

function isMissingTable(err) {
  if (!err) return false
  if (err.code === '42P01') return true
  const msg = (err.message || '').toLowerCase()
  return msg.includes('does not exist') || (msg.includes('relation') && msg.includes('not found'))
}

// "há quanto tempo" curto: agora · 12min · 2h · 1h 5min
export function fmtDuracao(ms) {
  if (!ms || ms < 0) ms = 0
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

// ─── Heartbeat (envia presença do usuário logado) ───────────────────────────
export function usePresencaHeartbeat(funcionarioId) {
  useEffect(() => {
    if (!funcionarioId) return
    let cancel = false
    let timer = null

    const agora = () => new Date().toISOString()

    async function iniciar() {
      // online_desde: continua a sessão se ainda estava online há pouco (ex.: só
      // deu refresh); senão começa sessão nova agora.
      const { data, error } = await supabase
        .from('presenca').select('online_desde, last_seen')
        .eq('funcionario_id', funcionarioId).maybeSingle()
      if (isMissingTable(error)) return  // sql/84 ainda não rodou — silencioso
      const recente = data?.last_seen && (Date.now() - new Date(data.last_seen).getTime()) < OFFLINE_MS
      const onlineDesde = (recente && data.online_desde) ? data.online_desde : agora()
      if (cancel) return
      await supabase.from('presenca').upsert(
        { funcionario_id: funcionarioId, online_desde: onlineDesde, last_seen: agora(), atualizado_em: agora() },
        { onConflict: 'funcionario_id' }
      )
    }
    iniciar()

    timer = setInterval(() => {
      supabase.from('presenca').update({ last_seen: agora(), atualizado_em: agora() })
        .eq('funcionario_id', funcionarioId)
    }, HEARTBEAT_MS)

    // Voltar pra aba reativa o heartbeat na hora (não espera 30s).
    function onVisible() {
      if (document.visibilityState === 'visible') {
        supabase.from('presenca').update({ last_seen: agora(), atualizado_em: agora() })
          .eq('funcionario_id', funcionarioId)
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancel = true
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [funcionarioId])
}

// ─── Leitura (quem está online + há quanto tempo) ───────────────────────────
export function usePresencaLista() {
  const [linhas, setLinhas] = useState([])
  const [tabelaAusente, setTabelaAusente] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const canalIdRef = useRef(`presenca_${Math.random().toString(36).slice(2)}`)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('presenca').select('*')
    if (isMissingTable(error)) { setTabelaAusente(true); return }
    if (!error) { setLinhas(data || []); setTabelaAusente(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (tabelaAusente) return
    const canal = supabase.channel(canalIdRef.current)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presenca' }, () => carregar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [tabelaAusente, carregar])

  // Ticker — recomputa as durações conforme o tempo passa (mesmo sem evento).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])

  const porId = useMemo(() => {
    const m = new Map()
    for (const r of linhas) {
      const lastSeen = new Date(r.last_seen).getTime()
      const online = (now - lastSeen) < OFFLINE_MS
      const desdeMs = online
        ? (now - new Date(r.online_desde).getTime())
        : (now - lastSeen)
      m.set(r.funcionario_id, { online, desdeMs })
    }
    return m
  }, [linhas, now])

  return { porId, tabelaAusente }
}
