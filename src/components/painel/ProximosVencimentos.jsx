// src/components/painel/ProximosVencimentos.jsx
// Widget do Painel (dono): lista as próximas CONTAS A PAGAR (despesas em aberto)
// ordenadas por data de vencimento — vencidas primeiro. Substituiu o "Próximas
// paradas" pra o dono bater o olho e saber o que vence e quando.
//
// Dados: vêm de lancamento_financeiro (tipo=despesa, pago_em IS NULL) já
// carregado no Painel via useFinanceiro. Cada item: { descricao, valor, dia,
// dataLabel, diff, tipo }.
import React from 'react'
import { corEtapa, bgEtapa } from '../../utils/colors'
import { fmtBRL } from '../../utils/fmt'
import Card from '../ui/Card'
import SectionHeader, { SectionAction } from '../ui/SectionHeader'

export default function ProximosVencimentos({ T, dark, vencimentos, onVer }) {
  const redC = corEtapa('red', dark)
  const yellowC = corEtapa('yellow', dark)
  const blueC = corEtapa('blue', dark)

  const corByTipo = (t) => t === 'vencido' ? redC : t === 'hoje' ? yellowC : blueC
  const bgByTipo  = (t) => t === 'vencido' ? bgEtapa('red', dark) : t === 'hoje' ? bgEtapa('yellow', dark) : bgEtapa('blue', dark)
  const badgeLabel = (v) =>
    v.tipo === 'vencido' ? (v.diff === -1 ? 'venceu ontem' : `venceu há ${-v.diff}d`)
    : v.diff === 0 ? 'vence hoje'
    : v.diff === 1 ? 'vence amanhã'
    : `em ${v.diff}d`

  return (
    <Card T={T} dark={dark} radius={14} padding={'18px 20px'} style={{ height: '100%' }}>
      <SectionHeader
        T={T} dark={dark} icon="ti-calendar-dollar"
        action={<SectionAction dark={dark} onClick={onVer}>Ver financeiro</SectionAction>}>
        Próximos vencimentos · {vencimentos.length}
      </SectionHeader>

      {vencimentos.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 6, padding: '28px 12px', textAlign: 'center',
        }}>
          <i className="ti ti-calendar-check" style={{ fontSize: 26, color: T.textDim }} aria-hidden="true" />
          <div style={{ fontSize: 13, fontWeight: 600, color: T.textSecondary }}>Nada vencendo por perto</div>
          <div style={{ fontSize: 11.5, color: T.textMuted, lineHeight: 1.4 }}>
            Contas a pagar em aberto aparecem aqui, da mais próxima pra mais distante.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {vencimentos.map((v, i) => {
            const cor = corByTipo(v.tipo)
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0',
                borderTop: i === 0 ? 'none' : `1px solid ${T.border}`,
              }}>
                {/* Bloco da data — dia grande + mês */}
                <div style={{
                  width: 40, flexShrink: 0, textAlign: 'center',
                  borderRadius: 8, padding: '4px 0',
                  background: bgByTipo(v.tipo), color: cor,
                }}>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v.dia}</div>
                  <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{v.mes}</div>
                </div>

                {/* Descrição + badge */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 600, color: T.textPrimary,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{v.descricao}</div>
                  <span style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 6,
                    background: bgByTipo(v.tipo), color: cor, fontWeight: 600,
                    display: 'inline-block', marginTop: 2,
                  }}>{badgeLabel(v)}</span>
                </div>

                {/* Valor */}
                <div style={{
                  fontSize: 13.5, fontWeight: 700, color: T.textPrimary,
                  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                }}>{fmtBRL(v.valor)}</div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
