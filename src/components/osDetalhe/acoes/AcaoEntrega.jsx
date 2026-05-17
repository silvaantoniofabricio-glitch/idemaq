// src/components/osDetalhe/acoes/AcaoEntrega.jsx
// Etapa Entrega — confirmar data/hora da entrega + responsável.
// Avança pra Pagamento.

import React, { useState } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS, FUNCIONARIOS } from '../../../utils/osData'
import { corEtapa } from '../../../utils/colors'
import { estaPagaTotal } from '../../../utils/osHelpers'
import BlocoAcao from './BlocoAcao'

export default function AcaoEntrega({ T, dark, os, usuarios, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const amarelo = cor(P.yellow, P.yellowDark)
  const verde = corEtapa('green', dark)

  const agora = new Date().toISOString().slice(0, 16)
  const [dataHora, setDataHora] = useState(agora)
  const lista = (usuarios && usuarios.length > 0) ? usuarios : FUNCIONARIOS
  const [responsavel, setResponsavel] = useState(lista[0]?.id || '')
  const [pessoalmente, setPessoalmente] = useState(true)
  const [obs, setObs] = useState('')

  // Se OS já está paga (cliente pagou adiantado), entrega vai DIRETO pra Concluído.
  // Senão, passa por Pagamento. Regra de negócio do CLAUDE.md.
  const jaPaga = estaPagaTotal(os)

  function confirmar() {
    const novoObs = [
      os.observacoes,
      `— Entrega —\nData/hora: ${dataHora}\nResponsável: ${responsavel}\nPessoalmente: ${pessoalmente ? 'sim' : 'não'}${obs ? `\nObs: ${obs}` : ''}`,
    ].filter(Boolean).join('\n\n')
    onUpdateOS(os.numero, { observacoes: novoObs })
    const destino = jaPaga ? 'concluido' : 'pagamento'
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === destino)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-truck-delivery"
      etapa="Entrega"
      descricao={jaPaga
        ? 'OS já está paga — ao confirmar a entrega, vai direto pra Concluído.'
        : 'Confirme a entrega da máquina ao cliente. Depois disso a etapa muda pra Pagamento.'}
      tom={jaPaga ? 'verde' : 'amarelo'}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Campo T={T} label="Data e hora">
          <input
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            style={{ ...inputStyle(T), colorScheme: dark ? 'dark' : 'light' }}
          />
        </Campo>
        <Campo T={T} label="Responsável pela entrega">
          <select
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            style={{ ...inputStyle(T), colorScheme: dark ? 'dark' : 'light' }}
          >
            {lista.map(u => (
              <option key={u.id} value={u.id}>{u.apelido || u.nome || u.id}</option>
            ))}
          </select>
        </Campo>
      </div>

      <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 12, color: T.textSecondary, cursor: 'pointer',
      }}>
        <input
          type="checkbox"
          checked={pessoalmente}
          onChange={(e) => setPessoalmente(e.target.checked)}
          style={{ width: 15, height: 15, accentColor: cor(P.blue, P.blueDark), cursor: 'pointer' }}
        />
        Cliente recebeu pessoalmente
      </label>

      <Campo T={T} label="Observações" opcional>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex: cliente conferiu, ficou satisfeito…"
          style={{ ...inputStyle(T), minHeight: 56, resize: 'vertical' }}
        />
      </Campo>

      <button
        onClick={confirmar}
        style={{
          padding: '11px 16px', borderRadius: 7, border: 'none',
          background: jaPaga ? verde : amarelo,
          color: jaPaga ? '#fff' : '#0a0a0d',
          fontSize: 12.5, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        <i className="ti ti-check" style={{ fontSize: 16 }} aria-hidden="true" />
        {jaPaga
          ? 'Confirmar entrega · concluir OS'
          : 'Confirmar entrega · ir pra Pagamento'}
      </button>
    </BlocoAcao>
  )
}

function Campo({ T, label, opcional, children }) {
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 10.5, color: T.textMuted, fontWeight: 600,
        marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.3px',
      }}>
        {label}
        {opcional && <span style={{ fontSize: 10, color: T.textDim, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>· opcional</span>}
      </label>
      {children}
    </div>
  )
}
function inputStyle(T) {
  return {
    width: '100%', padding: '9px 12px', borderRadius: 7,
    border: `1px solid ${T.border}`, background: T.bg, color: T.textPrimary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
}
