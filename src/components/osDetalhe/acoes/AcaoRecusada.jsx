// src/components/osDetalhe/acoes/AcaoRecusada.jsx
// Etapa Recusado — 3 decisões: converter pra Fabricação · cobrar taxa · entregar.
// Hoje só estado local + toast (Módulo 03 plugará as ações reais).

import React from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import BlocoAcao from './BlocoAcao'

export default function AcaoRecusada({ T, dark, os, onMoverOS, onUpdateOS }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const amarelo = corEtapa('yellow', dark)
  const vermelho = corEtapa('red', dark)

  function entregarDeVolta() {
    const entrega = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'entrega')
    if (entrega) onMoverOS(os.numero, entrega.id)
  }

  function cobrarTaxa() {
    onUpdateOS(os.numero, { valor: 30, observacoes: [os.observacoes, '— Cobrança: taxa de diagnóstico R$ 30 —'].filter(Boolean).join('\n') })
    const pagamento = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'pagamento')
    if (pagamento) onMoverOS(os.numero, pagamento.id)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-circle-x"
      etapa="Recusada"
      descricao="O cliente recusou o orçamento. Escolha o destino da máquina."
      tom="vermelho"
    >
      <Decisao
        T={T} cor={azul} bg={cor('#0d2035', '#e6f1fb')}
        icon="ti-building-factory-2"
        titulo="Converter em Fabricação"
        texto="Aproveita as peças e a máquina vira estoque pra venda futura."
        disabled
        disabledMsg="Em breve · Módulo 03"
        onClick={() => {}}
      />
      <Decisao
        T={T} cor={amarelo} bg={cor('#2a2000', '#fdf6dc')}
        icon="ti-cash"
        titulo="Cobrar taxa de diagnóstico (R$ 30)"
        texto="Lança R$ 30 no orçamento e move pra Pagamento."
        onClick={cobrarTaxa}
      />
      <Decisao
        T={T} cor={vermelho} bg={cor('#2a1515', '#fde8e8')}
        icon="ti-truck-return"
        titulo="Devolver máquina ao cliente"
        texto="Move pra Entrega — máquina volta como está, sem cobrança."
        onClick={entregarDeVolta}
      />
    </BlocoAcao>
  )
}

function Decisao({ T, cor: c, bg, icon, titulo, texto, onClick, disabled, disabledMsg }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledMsg : undefined}
      style={{
        background: bg,
        border: `1px solid ${c}55`,
        borderRadius: 8,
        padding: '11px 13px',
        display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit', color: T.textPrimary,
      }}>
      <i className={`ti ${icon}`} style={{ fontSize: 18, color: c, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: c, marginBottom: 2 }}>
          {titulo} {disabled && <span style={{ fontSize: 10, color: T.textDim, fontWeight: 500 }}>· {disabledMsg}</span>}
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.4 }}>{texto}</div>
      </div>
      {!disabled && <i className="ti ti-arrow-right" style={{ fontSize: 16, color: c, flexShrink: 0 }} aria-hidden="true" />}
    </button>
  )
}
