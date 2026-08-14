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
// Compacto por pedido do Toni (08/2026): agrupa o mesmo dia numa linha, poe o
// prazo inline e recolhe os ja vencidos atras de um toggle. Antes eram 18
// linhas duplas; agora ~6 linhas simples.
//
// Dias levantados do historico real (mai/jun/jul 2026) na revisao de 08/2026.
// ATENCAO: o historico registra quando o dinheiro SAIU, que nem sempre e o
// vencimento. A contabilidade, por exemplo, aparecia dia 11 e 14 no extrato mas
// vence dia 10 (Toni corrigiu). Quando o Toni informar o dia real de algum
// item, vale mais que o extrato.
//
// PRA EDITAR: mexa so na lista VENCIMENTOS_FIXOS abaixo.
import React, { useMemo, useState } from 'react'
import { corEtapa, bgEtapa } from '../../utils/colors'
import Card from '../ui/Card'
import SectionHeader from '../ui/SectionHeader'

// dia = dia do mes. cartao = fatura (valor so fecha perto do vencimento).
const VENCIMENTOS_FIXOS = [
  { dia:  2, label: 'Nubank PF',                  cartao: true },
  { dia:  5, label: 'Salários'                                 },
  { dia:  5, label: 'Pacote Cresol'                            },
  { dia:  6, label: 'Parcela da casa'                          },
  { dia:  7, label: 'Energia'                                  },
  { dia: 10, label: 'Internet (FleetNet)'                      },
  { dia: 10, label: 'Contabilidade (Zion)'                     },
  { dia: 10, label: 'Bradesco Elo Mais',          cartao: true },
  { dia: 11, label: 'Elo Grafite',                cartao: true },
  { dia: 13, label: 'Água (Sanesul)'                           },
  { dia: 16, label: 'Financiamento Civic'                      },
  { dia: 20, label: 'DAS / impostos'                           },
  { dia: 20, label: 'Bradesco Neo Visa',          cartao: true },
  { dia: 20, label: 'Cresol Mastercard',          cartao: true },
  { dia: 20, label: 'Mercado Pago',               cartao: true },
  { dia: 20, label: 'Empréstimo Cresol PJ'                     },
  { dia: 23, label: 'Nubank Empresa',             cartao: true },
  { dia: 25, label: 'Inter',                      cartao: true },
]

export default function CalendarioVencimentos({ T, dark }) {
  const [verPassados, setVerPassados] = useState(false)
  const amareloC = corEtapa('yellow', dark)
  const azulC    = corEtapa('blue', dark)

  // Agrupa por dia (o dia 20 sozinho tem 5 compromissos) e classifica pelo
  // quanto falta. Ordena: hoje > a vir > ja passou.
  const { aVir, passados } = useMemo(() => {
    const hoje = new Date().getDate()
    const porDia = new Map()
    for (const v of VENCIMENTOS_FIXOS) {
      if (!porDia.has(v.dia)) porDia.set(v.dia, { dia: v.dia, labels: [], cartao: false })
      const g = porDia.get(v.dia)
      g.labels.push(v.label)
      g.cartao = g.cartao || !!v.cartao
    }
    const grupos = [...porDia.values()]
      .map(g => {
        const faltam = g.dia - hoje
        return { ...g, faltam, estado: faltam === 0 ? 'hoje' : faltam > 0 ? 'aVir' : 'passou' }
      })
      .sort((a, b) => a.dia - b.dia)
    return {
      aVir:     grupos.filter(g => g.estado !== 'passou'),
      passados: grupos.filter(g => g.estado === 'passou'),
    }
  }, [])

  const totalAVir = aVir.reduce((s, g) => s + g.labels.length, 0)
  const totalPass = passados.reduce((s, g) => s + g.labels.length, 0)

  function Linha({ g, esmaecido }) {
    const cor = esmaecido ? T.textMuted : g.estado === 'hoje' ? amareloC : azulC
    const bg  = esmaecido ? 'transparent' : g.estado === 'hoje' ? bgEtapa('yellow', dark) : bgEtapa('blue', dark)
    const prazo = esmaecido        ? 'já passou'
                : g.estado === 'hoje' ? 'vence hoje'
                : g.faltam === 1      ? 'amanhã'
                : `em ${g.faltam}d`
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
        borderTop: `1px solid ${T.border}`, opacity: esmaecido ? 0.5 : 1,
      }}>
        <div style={{
          width: 28, flexShrink: 0, textAlign: 'center',
          borderRadius: 6, padding: '2px 0',
          background: bg, color: cor,
          border: esmaecido ? `1px solid ${T.border}` : 'none',
          fontSize: 12.5, fontWeight: 700, lineHeight: 1.35,
          fontVariantNumeric: 'tabular-nums',
        }}>{String(g.dia).padStart(2, '0')}</div>

        <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: T.textPrimary, lineHeight: 1.35 }}>
          {g.labels.join(' · ')}
          {g.cartao && (
            <i className="ti ti-credit-card"
               title="Inclui fatura de cartão — valor só fecha perto do vencimento"
               style={{ fontSize: 12, color: T.textDim, marginLeft: 5, verticalAlign: 'middle' }}
               aria-hidden="true" />
          )}
        </div>

        <div style={{
          flexShrink: 0, fontSize: 11, fontWeight: 600, color: cor,
          whiteSpace: 'nowrap',
        }}>{prazo}</div>
      </div>
    )
  }

  return (
    <Card T={T} dark={dark} radius={14} padding={'16px 20px'}>
      <SectionHeader T={T} dark={dark} icon="ti-calendar-repeat">
        Vencimentos do mês · {totalAVir} a vir
      </SectionHeader>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {aVir.map(g => <Linha key={g.dia} g={g} />)}

        {totalPass > 0 && (
          <>
            <button
              onClick={() => setVerPassados(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 0 5px', marginTop: 2,
                borderTop: `1px solid ${T.border}`,
                background: 'transparent', border: 'none', borderTopStyle: 'solid',
                color: T.textMuted, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
              }}>
              <i className={`ti ti-chevron-${verPassados ? 'down' : 'right'}`}
                 style={{ fontSize: 13 }} aria-hidden="true" />
              {totalPass} {totalPass === 1 ? 'já venceu' : 'já venceram'} este mês
            </button>
            {verPassados && passados.map(g => <Linha key={g.dia} g={g} esmaecido />)}
          </>
        )}
      </div>
    </Card>
  )
}
