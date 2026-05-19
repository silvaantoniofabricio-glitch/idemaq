// src/components/osDetalhe/acoes/AcaoEntrega.jsx
// Etapa Entrega — 2 fases (igual lógica de Aguardando agendamento ↔ Agendado da coleta):
//
//   Fase 1 — AGUARDANDO AGENDAR
//     Card fica esperando o agendamento da entrega com o cliente.
//     Form: data + hora + responsável + observações.
//     Salva em os.entrega_data / os.entrega_responsavel / os.entrega_observacoes.
//
//   Fase 2 — ENTREGA AGENDADA
//     Mostra a data marcada + botão "Confirmar entrega".
//     Botão "Reagendar" pra mudar.
//     Ao confirmar: vai pra Pagamento — ou DIRETO pra Concluído se OS já estiver
//     paga (estaPagaTotal) — mesma regra do CLAUDE.md.

import React, { useState } from 'react'
import { P } from '../../../theme'
import { ETAPAS_TODOS } from '../../../utils/osData'
import { corEtapa, bgEtapa, corHero } from '../../../utils/colors'
import { estaPagaTotal } from '../../../utils/osHelpers'
import { useToast } from '../../ui'
import BlocoAcao from './BlocoAcao'

export default function AcaoEntrega({ T, dark, os, usuarios, onUpdateOS, onMoverOS }) {
  const cor = (d, c) => dark ? d : c
  const azul = corEtapa('blue', dark)
  const amarelo = cor(P.yellow, P.yellowDark)
  const verde = corEtapa('green', dark)
  const notify = useToast()

  const jaPaga = estaPagaTotal(os)
  // Lista vem sempre do useUsuarios (vazia durante carregamento — select com 0
  // opções é OK; o form só salva quando há responsável selecionado).
  const lista = usuarios || []

  // Fase 1 = sem data agendada · Fase 2 = data já marcada
  const [editando, setEditando] = useState(false)
  const dataAgendada = os.entrega_data || null
  const respAgendado = os.entrega_responsavel || null
  const obsAgendada = os.entrega_observacoes || ''

  const emFase2 = !!dataAgendada && !editando

  // Estado do form de agendamento (fase 1 ou reagendar)
  const agora = new Date()
  agora.setHours(agora.getHours() + 24)  // padrão: amanhã no mesmo horário
  const padraoIso = agora.toISOString().slice(0, 16)
  const [dataHora, setDataHora] = useState(dataAgendada || padraoIso)
  const [responsavel, setResponsavel] = useState(respAgendado || lista[0]?.id || '')
  const [obs, setObs] = useState(obsAgendada)

  function agendar() {
    if (!dataHora) {
      notify('erro', 'Defina data e hora da entrega')
      return
    }
    onUpdateOS?.(os.numero, {
      entrega_data: dataHora,
      entrega_responsavel: responsavel,
      entrega_observacoes: obs,
    })
    setEditando(false)
    notify('ok', `Entrega agendada para ${fmtDataHora(dataHora)}`)
  }

  function reagendar() {
    setEditando(true)
  }

  function cancelarReagendar() {
    setDataHora(dataAgendada)
    setResponsavel(respAgendado || lista[0]?.id || '')
    setObs(obsAgendada)
    setEditando(false)
  }

  function confirmarEntrega() {
    if (!window.confirm(jaPaga
      ? 'Confirmar entrega? A OS vai direto pra Concluído (já paga).'
      : 'Confirmar entrega? A OS vai pra Pagamento.')) return

    onUpdateOS?.(os.numero, {
      entrega_realizada_em: new Date().toISOString(),
    })
    const destino = jaPaga ? 'concluido' : 'pagamento'
    const proxima = ETAPAS_TODOS.find(e => e.match?.[os.tipo] === destino)
    if (proxima) onMoverOS(os.numero, proxima.id)
  }

  function enviarWhatsapp() {
    const num = (os.fone || '').replace(/\D/g, '')
    if (!num) { notify('erro', 'Cliente sem telefone cadastrado'); return }
    const texto = `Olá ${os.cliente || ''}! 👋

A entrega da sua OS #${os.numero} (${[os.marca, os.modelo].filter(Boolean).join(' ') || os.equipamento}) está agendada pra:

📅 ${fmtDataHora(dataAgendada)}

${obsAgendada ? `Obs: ${obsAgendada}\n\n` : ''}Qualquer coisa me avisa pra reagendar. Até lá!`
    window.open(`https://wa.me/55${num}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')
  }

  // ============================================================================
  // FASE 2 — Entrega agendada (mostra resumo + ações)
  // ============================================================================
  if (emFase2) {
    return (
      <BlocoAcao
        T={T} dark={dark} icon="ti-truck-delivery"
        etapa="Entrega"
        descricao={jaPaga
          ? 'Entrega agendada. Ao confirmar, OS vai direto pra Concluído (já paga).'
          : 'Entrega agendada com o cliente. Ao confirmar, vai pra Pagamento.'}
        tom={jaPaga ? 'verde' : 'amarelo'}
      >
        {/* Card de resumo do agendamento */}
        <div style={{
          background: bgEtapa('blue', dark),
          border: `1px solid ${azul}55`,
          borderRadius: 9, padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <i className="ti ti-calendar-check" style={{ fontSize: 18, color: azul }} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 10.5, color: T.textMuted, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '.3px',
              }}>
                Entrega agendada
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700, color: corHero(dark),
                marginTop: 2, fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtDataHora(dataAgendada)}
              </div>
            </div>
          </div>

          {respAgendado && (
            <Linha T={T} icon="ti-user-check" label="Responsável"
              valor={(lista.find(u => u.id === respAgendado)?.apelido) || (lista.find(u => u.id === respAgendado)?.nome) || respAgendado} />
          )}
          {obsAgendada && (
            <Linha T={T} icon="ti-notes" label="Observações" valor={obsAgendada} multi />
          )}
        </div>

        {/* Avisar cliente */}
        <button onClick={enviarWhatsapp} style={btnSec(T)}>
          <i className="ti ti-brand-whatsapp" style={{ fontSize: 15 }} aria-hidden="true" />
          Avisar cliente no WhatsApp
        </button>

        {/* Ações principais */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
          <button onClick={confirmarEntrega} style={{
            padding: '12px 16px', borderRadius: 8, border: 'none',
            background: jaPaga ? verde : amarelo,
            color: jaPaga ? '#fff' : '#0a0a0d',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <i className="ti ti-check" style={{ fontSize: 17 }} aria-hidden="true" />
            {jaPaga ? 'Confirmar entrega · concluir OS' : 'Confirmar entrega · ir pra Pagamento'}
          </button>
          <button onClick={reagendar} style={btnSec(T)}>
            <i className="ti ti-calendar-event" style={{ fontSize: 14 }} aria-hidden="true" />
            Reagendar
          </button>
        </div>
      </BlocoAcao>
    )
  }

  // ============================================================================
  // FASE 1 — Aguardando agendar entrega (form)
  // ============================================================================
  return (
    <BlocoAcao
      T={T} dark={dark} icon="ti-calendar-time"
      etapa={dataAgendada ? 'Reagendar entrega' : 'Entrega — aguardando agendar'}
      descricao={dataAgendada
        ? 'Mude a data/hora se o cliente pediu reagendamento.'
        : 'Combine a entrega com o cliente e registre data, hora e responsável.'}
    >
      {!dataAgendada && (
        <div style={{
          padding: '10px 12px', borderRadius: 7,
          background: T.cardAlt, border: `1px solid ${T.border}`,
          fontSize: 12, color: T.textSecondary,
          display: 'flex', alignItems: 'center', gap: 7,
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 14, color: azul, flexShrink: 0 }} aria-hidden="true" />
          O card fica nesta etapa até a entrega ser agendada. Após agendar, mostra o resumo + botão de confirmar entrega.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Campo T={T} label="Data e hora">
          <input
            type="datetime-local"
            value={dataHora}
            onChange={(e) => setDataHora(e.target.value)}
            style={{ ...inputStyle(T), colorScheme: dark ? 'dark' : 'light' }}
          />
        </Campo>
        <Campo T={T} label="Responsável">
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

      <Campo T={T} label="Observações" opcional>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex: entregar pela manhã, prédio 2º andar…"
          style={{ ...inputStyle(T), minHeight: 56, resize: 'vertical' }}
        />
      </Campo>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {dataAgendada && (
          <button onClick={cancelarReagendar} style={btnSec(T)}>
            Cancelar
          </button>
        )}
        <button onClick={agendar} style={{
          padding: '11px 16px', borderRadius: 7, border: 'none',
          background: azul, color: '#fff',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <i className="ti ti-calendar-check" style={{ fontSize: 16 }} aria-hidden="true" />
          {dataAgendada ? 'Salvar novo horário' : 'Agendar entrega'}
        </button>
      </div>
    </BlocoAcao>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDataHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
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

function Linha({ T, icon, label, valor, multi }) {
  return (
    <div style={{
      display: 'flex', flexDirection: multi ? 'column' : 'row',
      gap: multi ? 3 : 8, alignItems: multi ? 'flex-start' : 'center',
      fontSize: 12, color: T.textSecondary,
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        fontSize: 11, color: T.textMuted, fontWeight: 600,
        flexShrink: 0,
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 12 }} aria-hidden="true" />
        {label}
      </span>
      <span style={{ color: T.textPrimary, fontWeight: 500, lineHeight: 1.4 }}>
        {valor}
      </span>
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

function btnSec(T) {
  return {
    padding: '11px 14px', borderRadius: 7,
    background: T.cardAlt, color: T.textPrimary,
    border: `1px solid ${T.border}`,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }
}
