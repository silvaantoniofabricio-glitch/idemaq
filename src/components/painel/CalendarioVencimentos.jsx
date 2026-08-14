// src/components/painel/CalendarioVencimentos.jsx
// Widget do Painel (dono): calendario FIXO dos compromissos que se repetem todo
// mes — so lembrete, nao gera lancamento nem precisa de baixa.
//
// Diferenca pro "Proximos vencimentos" (ProximosVencimentos.jsx), que fica ao
// lado: aquele le contas a pagar reais do banco (com valor, some quando paga).
// Este aqui e um calendario estatico: sempre mostra os mesmos dias, mes apos
// mes, so pra Toni nao esquecer de pagar. Sem valor de proposito — os valores
// variam e a fatura de cartao so fecha perto do vencimento.
//
// Dias levantados do historico real (mai/jun/jul 2026) na revisao de 08/2026.
// PRA EDITAR: mexa so na lista VENCIMENTOS_FIXOS abaixo.
import React, { useMemo } from 'react'
import { corEtapa, bgEtapa } from '../../utils/colors'
import Card from '../ui/Card'
import SectionHeader from '../ui/SectionHeader'

// dia = dia do mes. cartao = fatura (valor so fecha perto do vencimento).
const VENCIMENTOS_FIXOS = [
  { dia:  2, label: 'Fatura Nubank PF',              cartao: true  },
  { dia:  5, label: 'Salários (Alessandro + Guilherme)'            },
  { dia:  5, label: 'Pacote de serviços Cresol'                    },
  { dia:  6, label: 'Parcela da casa'                              },
  { dia:  7, label: 'Energia'                                      },
  { dia: 10, label: 'Internet (FleetNet)'                          },
  { dia: 10, label: 'Parcela Bradesco Elo Mais',     cartao: true  },
  { dia: 11, label: 'Fatura Elo Grafite',            cartao: true  },
  { dia: 13, label: 'Água (Sanesul)'                               },
  { dia: 14, label: 'Contabilidade (Zion)'                         },
  { dia: 16, label: 'Financiamento Civic'                          },
  { dia: 20, label: 'DAS / impostos'                               },
  { dia: 20, label: 'Fatura Bradesco Neo Visa',      cartao: true  },
  { dia: 20, label: 'Fatura Cresol Mastercard',      cartao: true  },
  { dia: 20, label: 'Fatura Mercado Pago',           cartao: true  },
  { dia: 20, label: 'Empréstimo Cresol PJ'                         },
  { dia: 23, label: 'Fatura Nubank Empresa',         cartao: true  },
  { dia: 25, label: 'Fatura Inter',                  cartao: true  },
]

export default function CalendarioVencimentos({ T, dark }) {
  const amareloC = corEtapa('yellow', dark)
  const azulC    = corEtapa('blue', dark)

  // Ordena por proximidade: hoje primeiro, depois o que ainda vem no mes,
  // e por ultimo o que ja passou (esmaecido, so pra conferencia).
  const itens = useMemo(() => {
    const hoje = new Date().getDate()
    return VENCIMENTOS_FIXOS
      .map(v => {
        const faltam = v.dia - hoje
        const estado = faltam === 0 ? 'hoje' : faltam > 0 ? 'aVir' : 'passou'
        return { ...v, faltam, estado }
      })
      .sort((a, b) => {
        const peso = e => e === 'hoje' ? 0 : e === 'aVir' ? 1 : 2
        return peso(a.estado) - peso(b.estado) || a.dia - b.dia
      })
  }, [])

  const aVir = itens.filter(i => i.estado !== 'passou').length

  const corDe = e => e === 'hoje' ? amareloC : e === 'aVir' ? azulC : T.textDim
  const bgDe  = e => e === 'hoje' ? bgEtapa('yellow', dark) : e === 'aVir' ? bgEtapa('blue', dark) : 'transparent'
  const rotulo = i =>
    i.estado === 'hoje'  ? 'vence hoje'
  : i.estado === 'aVir'  ? (i.faltam === 1 ? 'amanhã' : `em ${i.faltam}d`)
  : 'já passou'

  return (
    <Card T={T} dark={dark} radius={14} padding={'18px 20px'} style={{ height: '100%' }}>
      <SectionHeader T={T} dark={dark} icon="ti-calendar-repeat">
        Vencimentos do mês · {aVir} a vir
      </SectionHeader>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {itens.map((i, idx) => {
          const cor = corDe(i.estado)
          const passou = i.estado === 'passou'
          return (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0',
              borderTop: idx === 0 ? 'none' : `1px solid ${T.border}`,
              opacity: passou ? 0.45 : 1,
            }}>
              {/* Dia do mes */}
              <div style={{
                width: 34, flexShrink: 0, textAlign: 'center',
                borderRadius: 8, padding: '4px 0',
                background: bgDe(i.estado),
                color: passou ? T.textMuted : cor,
                border: passou ? `1px solid ${T.border}` : 'none',
              }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>{String(i.dia).padStart(2, '0')}</div>
              </div>

              {/* Descricao + estado */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 600, color: T.textPrimary,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{i.label}</div>
                <span style={{
                  fontSize: 10, color: passou ? T.textMuted : cor, fontWeight: 600,
                }}>{rotulo(i)}</span>
              </div>

              {/* Fatura de cartao: valor so fecha perto do vencimento */}
              {i.cartao && (
                <i className="ti ti-credit-card"
                   title="Fatura de cartão — confira o valor no app do banco"
                   style={{ fontSize: 14, color: T.textDim, flexShrink: 0 }} aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>

      <div style={{
        marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}`,
        fontSize: 10.5, color: T.textMuted, lineHeight: 1.4,
      }}>
        Datas fixas levantadas do histórico. Sem valor porque variam mês a mês —
        <i className="ti ti-credit-card" style={{ fontSize: 11, margin: '0 3px' }} aria-hidden="true" />
        marca fatura de cartão, que só fecha perto do vencimento.
      </div>
    </Card>
  )
}
