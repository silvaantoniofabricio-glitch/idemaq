// src/components/ponto/ResumoDia.jsx
// Resumo das 4 batidas do dia atual em linha — entrada / saída almoço /
// volta almoço / saída. Cada slot mostra o horário ou "—" se ainda não
// bateu. O próximo slot esperado fica destacado em azul (paleta Deutan).
//
// Props:
//   T, dark        — tokens de tema (passados pelo painel)
//   batidas        — array de batidas do dia (shape ponto_registro)
//   proxTipo       — string opcional: tipo da próxima batida esperada
//                    (pra destacar visualmente o slot)
//
// Uso típico no PainelFuncionario:
//   <ResumoDia T={T} dark={dark} batidas={batidasHoje} proxTipo={prox} />

import React from 'react'
import { corEtapa, bgEtapa, corHero } from '../../utils/colors'
import { TIPOS_BATIDA, fmtHora } from './_mocks'

const SLOTS = [
  { tipo: 'entrada',      label: 'Entrada',  icon: 'ti-clock-play' },
  { tipo: 'saida_almoco', label: 'Almoço',   icon: 'ti-coffee' },
  { tipo: 'volta_almoco', label: 'Voltou',   icon: 'ti-clock-play' },
  { tipo: 'saida',        label: 'Saída',    icon: 'ti-clock-stop' },
]

export default function ResumoDia({ T, dark, batidas = [], proxTipo = null }) {
  const azul = corEtapa('blue', dark)

  // Mapa tipo → bateu_em (pega a primeira batida de cada tipo no dia)
  const porTipo = {}
  for (const b of batidas) {
    if (!porTipo[b.tipo]) porTipo[b.tipo] = b.bateu_em
  }

  return (
    <div className="idemaq-card" style={{
      background: T.card, borderRadius: 14,
      border: `1px solid ${T.border}`,
      padding: '14px 16px',
      boxShadow: T.shadow,
    }}>
      <div style={{
        fontSize: 11, color: T.textMuted, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.5px',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <i className="ti ti-calendar-time" style={{ fontSize: 13 }} aria-hidden="true" />
        Marcações de hoje
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
      }}>
        {SLOTS.map(slot => {
          const hora = porTipo[slot.tipo]
          const ativo = !!hora
          const destacado = proxTipo === slot.tipo

          // Cor da borda/ícone: ativo (já bateu) usa cor própria do tipo;
          // destacado (próxima esperada) fica azul; inativo fica neutro.
          const corBase = ativo
            ? corEtapa(TIPOS_BATIDA[slot.tipo].cor, dark)
            : destacado
              ? azul
              : T.textMuted

          return (
            <div key={slot.tipo} style={{
              padding: '10px 10px',
              borderRadius: 10,
              background: destacado && !ativo
                ? bgEtapa('blue', dark)
                : ativo
                  ? `${corBase}10`
                  : T.cardAlt,
              border: `1px solid ${destacado && !ativo ? azul + '55' : ativo ? corBase + '33' : T.border}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', gap: 4,
              minHeight: 64,
              transition: 'all .2s',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 10, fontWeight: 700,
                color: corBase,
                textTransform: 'uppercase', letterSpacing: '.3px',
              }}>
                <i className={`ti ${slot.icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
                {slot.label}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 700,
                color: ativo ? corHero(dark) : T.textDim,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
              }}>
                {ativo ? fmtHora(hora) : '—'}
              </div>
              {destacado && !ativo && (
                <div style={{
                  fontSize: 9, fontWeight: 700, color: azul,
                  textTransform: 'uppercase', letterSpacing: '.4px',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  <i className="ti ti-arrow-right" style={{ fontSize: 10 }} aria-hidden="true" />
                  Próxima
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
