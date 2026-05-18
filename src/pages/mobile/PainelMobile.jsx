// idemaq-src/pages/mobile/PainelMobile.jsx
// Painel mobile real — Lote 1 do mobile-noite.md.
// Substitui o re-export do _legacy/. Consome useOS + useUsuarios reais.
// Layout: HeroMobile (saudação + faturamento) → KPIGridMobile (4 KPIs 2x2)
//        → PipelineMobile (etapas). Padding bottom 80 pra não esconder atrás
//        da BottomNav.

import React, { useMemo, useState, useEffect } from 'react'
import { useOS } from '../../hooks/useOS'
import { useUsuarios } from '../../hooks/useUsuarios'
import { isAdmin } from '../../utils/osHelpers'
import { supabase } from '../../supabase'
import HeroMobile from '../../components/mobile/HeroMobile'
import KPIGridMobile from '../../components/mobile/KPIGridMobile'
import PipelineMobile from '../../components/mobile/PipelineMobile'

// Data do pagamento da OS — etapa 'pagamento' ou (quando pulou) 'concluido'
function dataPagamento(os) {
  const reg = (os.historico || []).find(h => h.etapa === 'pagamento') ||
              (os.historico || []).find(h => h.etapa === 'concluido')
  return reg ? new Date(reg.data) : null
}
function mesmoMes(d, ref) {
  return d && d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

export default function PainelMobile({ T, dark, user }) {
  const { osList, loading } = useOS(false)
  const { apelidoDe } = useUsuarios()

  // Fallback de user (igual ao Painel desktop — prop pode vir undefined)
  const [authUser, setAuthUser] = useState(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthUser(data?.user || null))
  }, [])
  const idUsuario = user?.id || authUser?.id
  const userEfetivo = user || authUser
  const ap = idUsuario ? apelidoDe(idUsuario) : null
  const apelido = (ap && ap !== 'desconhecido') ? ap : 'parceiro'

  // Faturamento do mês + delta vs mês anterior — agregação compacta
  const agreg = useMemo(() => {
    const hoje = new Date()
    const refAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const refAnt   = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    let fatMes = 0, fatAnt = 0
    for (const os of osList || []) {
      if (os.deleted_at) continue
      const dt = dataPagamento(os)
      if (dt && os.valor_pago > 0) {
        if (mesmoMes(dt, refAtual)) fatMes += os.valor_pago
        if (mesmoMes(dt, refAnt))  fatAnt += os.valor_pago
      }
    }
    const deltaPct = fatAnt > 0 ? Math.round(((fatMes - fatAnt) / fatAnt) * 100) : null
    return { fatMes, deltaPct }
  }, [osList])

  return (
    <div style={{
      padding: '14px 14px 80px',
      display: 'flex', flexDirection: 'column', gap: 12,
      overflowY: 'auto', flex: 1,
      background: T.bg,
    }}>
      <HeroMobile
        T={T} dark={dark}
        apelido={apelido}
        faturamentoMes={agreg.fatMes}
        deltaPct={agreg.deltaPct}
      />

      <KPIGridMobile T={T} dark={dark} osList={osList} loading={loading} />

      <PipelineMobile T={T} dark={dark} osList={osList} admin={isAdmin(userEfetivo)} />
    </div>
  )
}
