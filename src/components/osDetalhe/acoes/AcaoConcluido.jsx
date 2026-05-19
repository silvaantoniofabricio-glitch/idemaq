// src/components/osDetalhe/acoes/AcaoConcluido.jsx
// Etapa Concluído — OS finalizada.
// Mostra: resumo final (cliente + equipamento + itens + valores + tempo total),
// status de garantia com dias restantes, botão "Abrir OS de garantia" (placeholder)
// e botão "Reabrir OS" (volta pra Entrega).

import React from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { dentroGarantia, totalAPagar } from '../../../utils/osHelpers'
import { corEtapa, bgEtapa, corHero } from '../../../utils/colors'
import { useOSItens } from '../../../hooks/useOSItens'
import { fmtBRL } from '../../../utils/fmt'
import { useToast } from '../../ui'
import BlocoAcao from './BlocoAcao'

export default function AcaoConcluido({ T, dark, os, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const verde = corEtapa('green', dark)
  const notify = useToast()

  const garantiaAtiva = dentroGarantia(os)

  // === Resumo: tempo total + itens + total ===
  const { itens, loading: loadingItens } = useOSItens(os.id)
  const subtotal = itens.reduce((s, i) => s + i.valor * i.qtd, 0)
  const total = totalAPagar(os) || (subtotal - (os.desconto || 0))

  // Tempo total de execução (abertura → conclusão)
  const aberturaStr = os.abertura || os.criado_em
  const regConclusao = (os.historico || []).find(h => h.etapa === 'concluido')
  const fimStr = regConclusao?.data || null
  let diasExec = null
  if (aberturaStr && fimStr) {
    diasExec = Math.max(0, Math.round((new Date(fimStr) - new Date(aberturaStr)) / 86400000))
  } else if (aberturaStr) {
    diasExec = Math.max(0, Math.round((new Date() - new Date(aberturaStr)) / 86400000))
  }

  // Dias restantes da garantia
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

  function abrirGarantia() {
    notify('info', `Em breve: vai abrir Nova OS com garantia=true e os_origem_id=${os.numero}`)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-circle-check"
      etapa="Concluído"
      descricao="OS finalizada com sucesso."
      tom="verde"
    >
      {/* === RESUMO FINAL === */}
      <div style={{
        background: T.cardAlt, borderRadius: 8,
        border: `1px solid ${T.border}`,
        padding: '12px 14px',
      }}>
        <div style={{
          fontSize: 10.5, color: T.textMuted, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.4px',
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
        }}>
          <i className="ti ti-file-check" style={{ fontSize: 12, color: verde }} aria-hidden="true" />
          Resumo final
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <ResumoLinha T={T} label="Cliente" valor={os.cliente || '—'} />
          <ResumoLinha T={T} label="Equipamento"
            valor={[os.marca, os.modelo].filter(Boolean).join(' · ') || os.equipamento || '—'} />
          {itens.length > 0 && (
            <ResumoLinha T={T} label="Itens" valor={`${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`} />
          )}
          {diasExec != null && (
            <ResumoLinha T={T} label="Tempo total"
              valor={`${diasExec} ${diasExec === 1 ? 'dia' : 'dias'}`} />
          )}
        </div>

        {total > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`,
          }}>
            <span style={{
              fontSize: 11, color: T.textMuted, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '.3px',
            }}>
              Total
            </span>
            <span style={{
              fontSize: 18, fontWeight: 800, color: corHero(dark),
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-.02em',
            }}>
              {fmtBRL(total, { fr: true })}
            </span>
          </div>
        )}
      </div>

      {/* === GARANTIA === */}
      {garantiaAtiva && (
        <div style={{
          background: bgEtapa('blue', dark),
          border: `1px solid ${azul}55`,
          borderRadius: 8, padding: '10px 12px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <i className="ti ti-shield-check" style={{ fontSize: 18, color: azul, flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.textPrimary }}>
              Garantia ativa · {diasGar} {diasGar === 1 ? 'dia restante' : 'dias restantes'}
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>
              Se o cliente retornar com o mesmo defeito, abra uma nova OS de garantia abaixo (cobra-se R$ 0 e peças saem do estoque a custo).
            </div>
          </div>
        </div>
      )}

      {/* === AÇÕES === */}
      <div style={{ display: 'grid', gridTemplateColumns: garantiaAtiva ? '1fr 1fr' : '1fr', gap: 8 }}>
        {garantiaAtiva && (
          <button onClick={abrirGarantia} style={{
            padding: '11px 14px', borderRadius: 7, border: 'none',
            background: `linear-gradient(135deg, ${azul}, ${azul}cc)`,
            color: '#fff', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: `0 2px 8px ${azul}33`,
          }}>
            <i className="ti ti-shield-plus" style={{ fontSize: 15 }} aria-hidden="true" />
            Abrir OS de garantia
          </button>
        )}

        <button onClick={reabrir} style={{
          padding: '10px 14px', borderRadius: 7,
          border: `1px solid ${T.border}`, background: 'transparent',
          color: T.textSecondary, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <i className="ti ti-rotate" style={{ fontSize: 14 }} aria-hidden="true" />
          Reabrir OS (volta pra Entrega)
        </button>
      </div>
    </BlocoAcao>
  )
}

function ResumoLinha({ T, label, valor }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        fontSize: 10, color: T.textMuted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 12.5, fontWeight: 600, color: T.textPrimary,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {valor}
      </div>
    </div>
  )
}
