// src/components/osDetalhe/acoes/AcaoConcluido.jsx
// Etapa Concluído — OS finalizada. Mostra ações de reabrir e abrir garantia.

import React from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { dentroGarantia } from '../../../utils/osHelpers'
import { corEtapa } from '../../../utils/colors'
import BlocoAcao from './BlocoAcao'

export default function AcaoConcluido({ T, dark, os, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const garantiaAtiva = dentroGarantia(os)

  // Calcula dias restantes da garantia
  let diasGar = 0
  if (garantiaAtiva) {
    const dias = os.garantia_dias || 90
    const reg = (os.historico || []).find(h => h.etapa === 'entrega' || h.etapa === 'entregue')
    if (reg) {
      const limite = new Date(new Date(reg.data).getTime() + dias * 86400000)
      diasGar = Math.max(0, Math.round((limite - new Date()) / 86400000))
    }
  }

  function reabrir() {
    if (!confirm('Tem certeza que quer reabrir esta OS? Ela volta pra etapa de Entrega.')) return
    const entrega = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'entrega')
    if (entrega) onMoverOS(os.numero, entrega.id)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-circle-check"
      etapa="Concluído"
      descricao="OS finalizada com sucesso. Ações abaixo só ficam liberadas pelo dono."
      tom="verde"
    >
      {garantiaAtiva && (
        <div style={{
          background: cor('#0d2035', '#e6f1fb'),
          border: `1px solid ${azul}55`,
          borderRadius: 8, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <i className="ti ti-shield-check" style={{ fontSize: 18, color: azul }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary }}>
              Garantia ativa · {diasGar} {diasGar === 1 ? 'dia restante' : 'dias restantes'}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
              Se o cliente retornar com o mesmo defeito, abra uma nova OS marcando "Garantia" e referenciando esta. A ação fica disponível na ficha do cliente.
            </div>
          </div>
        </div>
      )}

      <button
        onClick={reabrir}
        style={{
          padding: '10px 14px', borderRadius: 7,
          border: `1px solid ${T.border}`, background: 'transparent',
          color: T.textSecondary, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        <i className="ti ti-rotate" style={{ fontSize: 14 }} aria-hidden="true" />
        Reabrir OS (volta pra Entrega)
      </button>
    </BlocoAcao>
  )
}
