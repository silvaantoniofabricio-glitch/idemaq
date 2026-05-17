// src/components/osDetalhe/acoes/AcaoOficina.jsx
// Etapa Em oficina — checklist de limpeza + manutenção + toggle aguardando peça.
// Avançar pra Teste final só libera quando ambos estão concluídos.

import React from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import BlocoAcao from './BlocoAcao'

const STATUS = ['pendente', 'andamento', 'concluido']
const STATUS_LABEL = {
  pendente: 'Pendente',
  andamento: 'Em andamento',
  concluido: 'Concluído',
}

export default function AcaoOficina({ T, dark, os, onUpdateOS, onMoverOS, onToggleAgPeca }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = cor(P.yellow, P.yellowDark)
  const verde = corEtapa('green', dark)

  const limpeza = os.limpeza || 'pendente'
  const manutencao = os.manutencao || 'pendente'
  const ambosConcluidos = limpeza === 'concluido' && manutencao === 'concluido'

  function avancarStatus(campo, atual) {
    const idx = STATUS.indexOf(atual)
    const proximo = STATUS[(idx + 1) % STATUS.length]
    onUpdateOS(os.numero, { [campo]: proximo })
  }

  function avancarEtapa() {
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === 'teste_final')
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-tool"
      etapa="Em oficina"
      descricao="Limpeza e manutenção podem rodar em paralelo. Avança pra Teste quando ambos terminam."
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <CardChecklist
          T={T} dark={dark} cor={cor}
          icon="ti-bubble"
          titulo="Limpeza"
          status={limpeza}
          onAvancar={() => avancarStatus('limpeza', limpeza)}
        />
        <CardChecklist
          T={T} dark={dark} cor={cor}
          icon="ti-tools"
          titulo="Manutenção"
          status={manutencao}
          onAvancar={() => avancarStatus('manutencao', manutencao)}
        />
      </div>

      {/* Toggle aguardando peça */}
      <button
        onClick={onToggleAgPeca}
        style={{
          padding: '9px 12px', borderRadius: 7,
          border: `1px solid ${os.aguardando_peca ? '#ff9800' : T.border}`,
          background: os.aguardando_peca ? cor('#3a2200', '#fff4e0') : T.bg,
          color: os.aguardando_peca ? '#ff9800' : T.textSecondary,
          fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <i className={`ti ${os.aguardando_peca ? 'ti-package' : 'ti-package-off'}`}
             style={{ fontSize: 14 }} aria-hidden="true" />
          {os.aguardando_peca ? 'Aguardando peça chegar' : 'Marcar como aguardando peça'}
        </span>
        <span style={{ fontSize: 10.5, color: os.aguardando_peca ? '#ff9800' : T.textDim, fontWeight: 500 }}>
          {os.aguardando_peca ? 'clique pra desmarcar' : 'opcional'}
        </span>
      </button>

      {/* Avançar etapa */}
      <button
        onClick={avancarEtapa}
        disabled={!ambosConcluidos}
        title={ambosConcluidos ? 'Avança pra Teste final' : 'Conclua Limpeza E Manutenção antes de avançar'}
        style={{
          padding: '10px 16px', borderRadius: 7, border: 'none',
          background: ambosConcluidos ? amarelo : T.cardAlt,
          color: ambosConcluidos ? '#0a0a0d' : T.textDim,
          fontSize: 12.5, fontWeight: 700,
          cursor: ambosConcluidos ? 'pointer' : 'not-allowed',
          opacity: ambosConcluidos ? 1 : 0.6,
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        {ambosConcluidos
          ? <><i className="ti ti-arrow-right" style={{ fontSize: 16 }} aria-hidden="true" />Concluir oficina · ir pra Teste final</>
          : <><i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" />Conclua Limpeza e Manutenção primeiro</>
        }
      </button>
    </BlocoAcao>
  )
}

function CardChecklist({ T, dark, cor, icon, titulo, status, onAvancar }) {
  const verde = cor('#22c55e', '#16a34a')
  const amarelo = cor('#facc15', '#eab308')
  const cinza = T.textMuted

  const corStatus = status === 'concluido' ? verde : status === 'andamento' ? amarelo : cinza
  const bgStatus = status === 'concluido' ? cor('#0f2a15', '#e8f5ec')
                  : status === 'andamento' ? cor('#2a2000', '#fdf6dc')
                  : T.cardAlt

  return (
    <div style={{
      background: bgStatus,
      border: `1px solid ${corStatus}44`,
      borderRadius: 9, padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 16, color: corStatus }} aria-hidden="true" />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{titulo}</span>
      </div>
      <div style={{ fontSize: 11, color: corStatus, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>
        {STATUS_LABEL[status]}
      </div>
      <button
        onClick={onAvancar}
        style={{
          padding: '7px 10px', borderRadius: 6,
          border: `1px solid ${corStatus}55`,
          background: 'transparent', color: corStatus,
          fontSize: 11, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        }}>
        {status === 'pendente' && <><i className="ti ti-player-play" style={{ fontSize: 12 }} aria-hidden="true" /> Iniciar</>}
        {status === 'andamento' && <><i className="ti ti-check" style={{ fontSize: 12 }} aria-hidden="true" /> Marcar concluído</>}
        {status === 'concluido' && <><i className="ti ti-rotate" style={{ fontSize: 12 }} aria-hidden="true" /> Reabrir</>}
      </button>
    </div>
  )
}
