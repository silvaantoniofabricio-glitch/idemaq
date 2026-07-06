// src/hooks/useAutorCheck.js
// Carimbo de autoria pros checks das etapas — { uid, em, apelido }.
// Base do sistema de pontuação/prêmio por desempenho: toda ação de check
// numa OS grava QUEM fez e QUANDO.
//
// Uso:
//   const { carimbo } = useAutorCheck()
//   ...
//   novoExec[chave] = carimbo()          // vira { uid, em, apelido }
//
// Onde cada etapa guarda a autoria (tudo dentro de os.pre_diagnostico):
//   · Coleta      → coleta_confirmada = carimbo
//   · Avaliação   → checklist.recebido.itens[].autor
//   · Diagnóstico → componentes_autores[itemId] = carimbo
//   · Conserto    → oficina.execucao.<secao>.<check> = carimbo (o próprio valor)
//   · Teste final → checklist.teste_final.itens[].autor
//   · Entrega     → entrega.realizada_por = carimbo

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useUsuarios } from './useUsuarios'

export function useAutorCheck() {
  const { apelidoDe } = useUsuarios()
  const [uid, setUid] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUid(data?.session?.user?.id || null)
    })
  }, [])

  const carimbo = useCallback(() => ({
    uid,
    em: new Date().toISOString(),
    apelido: uid ? apelidoDe(uid) : 'desconhecido',
  }), [uid, apelidoDe])

  return { uid, carimbo }
}

// Formata o carimbo pra exibição — "Guilherme · 17/06 10:30".
// Aceita tanto o valor-carimbo da oficina quanto o campo `autor` dos
// checklists. Retorna null pra dados antigos (true) ou vazios.
export function fmtAutor(val) {
  if (!val || typeof val !== 'object') return null
  const { apelido, em } = val
  if (!apelido) return null
  let dataFmt = ''
  if (em) {
    const d = new Date(em)
    if (!isNaN(d)) {
      const dia  = String(d.getDate()).padStart(2, '0')
      const mes  = String(d.getMonth() + 1).padStart(2, '0')
      const hora = String(d.getHours()).padStart(2, '0')
      const min  = String(d.getMinutes()).padStart(2, '0')
      dataFmt = ` · ${dia}/${mes} ${hora}:${min}`
    }
  }
  return apelido + dataFmt
}
