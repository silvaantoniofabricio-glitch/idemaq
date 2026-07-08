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

// Detecta troca de dono num check — usado pro rastro de "alertas de
// reatribuição" no relatório de Qualidade (07/07/2026). Dispara sempre que
// quem mexe agora é diferente de quem tinha o carimbo antes, seja marcando
// por cima ou desmarcando — 1 clique já basta pra detectar, não precisa
// rastrear sequência de desmarcar+remarcar.
// Retorna null se não houve troca real (mesma pessoa, ou item nunca teve dono).
export function detectarTrocaAutor(autorAnterior, quemMexeuAgora) {
  if (!autorAnterior?.apelido) return null
  if (!quemMexeuAgora?.apelido) return null
  // Compara por uid quando os dois têm (mais confiável); cai pro apelido só
  // quando falta uid de um dos lados (dado legado) — nunca cruza uid com
  // apelido, senão dado antigo sem uid sempre "parece" pessoa diferente.
  const mesmaPessoa = autorAnterior.uid && quemMexeuAgora.uid
    ? autorAnterior.uid === quemMexeuAgora.uid
    : autorAnterior.apelido === quemMexeuAgora.apelido
  if (mesmaPessoa) return null
  return { autor_anterior: autorAnterior, autor_novo: quemMexeuAgora }
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
