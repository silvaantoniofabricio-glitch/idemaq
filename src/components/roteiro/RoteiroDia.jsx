// src/components/roteiro/RoteiroDia.jsx
// Roteiro do Dia — agenda diária interativa por funcionário.
//
// Dois modos no mesmo componente (decide pelo papel do usuário):
//   • Dono (Toni)        → ORGANIZADOR: uma coluna por funcionário. Monta a
//                          agenda de cada um (add tarefa, vincular OS via @,
//                          marcar urgente, reordenar, excluir).
//   • Funcionário        → MEU DIA: só a própria lista, em ordem, com barra de
//                          progresso e checks grandes. Toca pra marcar feito;
//                          abre a OS vinculada.
//
// Substitui a antiga "Notas do Dia" (texto solto em `configuracoes`).
// Dados: hook useRoteiro (tabela roteiro_item — sql/83). Ao vivo via Realtime.
//
// Props:
//   T, dark            — tema
//   user               — usuário logado (id + papel)
//   onClose            — fecha o painel
//   osList             — lista de OS (pra vincular e mostrar cliente/etapa)
//   pessoas            — usuários (de useUsuarios) — funcionários a organizar
//   onAbrirOS(os)      — opcional: abre o modal de detalhe da OS

import React, { useMemo, useRef, useState } from 'react'
import { getRole } from '../../utils/osHelpers'
import { useRoteiro } from '../../hooks/useRoteiro'
import MentionTextInput from '../notas/MentionTextInput'

const AZUL = '#5B9BD5'

// Remove o token "@<numero>" do texto pra exibição (a OS já vira chip).
function semToken(texto, numero) {
  if (!numero) return texto
  return texto.replace(new RegExp(`@${numero}\\b\\s?`), '').trim()
}

// ════════════════════════════════════════════════════════════════════════════
// CHIP de OS vinculada (cliente + número + etapa)
// ════════════════════════════════════════════════════════════════════════════
function OSChip({ os, T, dark, onAbrir }) {
  if (!os) return null
  return (
    <button
      onClick={onAbrir ? () => onAbrir(os) : undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 3,
        padding: '2px 8px', borderRadius: 6, cursor: onAbrir ? 'pointer' : 'default',
        background: dark ? 'rgba(91,155,213,0.14)' : 'rgba(91,155,213,0.10)',
        border: `1px solid ${dark ? 'rgba(91,155,213,0.3)' : 'rgba(91,155,213,0.25)'}`,
        fontFamily: 'inherit',
      }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: AZUL, fontVariantNumeric: 'tabular-nums' }}>#{os.numero}</span>
      <span style={{ fontSize: 11.5, color: T.textPrimary, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {os.cliente || 'Sem cliente'}
      </span>
      {os.etapa && <span style={{ fontSize: 10, color: T.textDim }}>· {os.etapa}</span>}
      {onAbrir && <i className="ti ti-external-link" style={{ fontSize: 11, color: AZUL }} aria-hidden="true" />}
    </button>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MODO ORGANIZADOR (dono) — coluna por funcionário
// ════════════════════════════════════════════════════════════════════════════
function ColunaFuncionario({ pessoa, itens, osPorId, T, dark, osList, pessoas, R, onAbrirOS }) {
  const [novo, setNovo]   = useState('')
  const [novoOS, setNovoOS] = useState(null) // { id, numero } da OS vinculada à nova tarefa
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const novoRef = useRef(null)

  const feitas = itens.filter(i => i.feito).length

  function submeterNovo() {
    const txt = novo.trim()
    if (!txt && !novoOS) return
    R.adicionar({ responsavelId: pessoa.id, texto: txt, osId: novoOS?.id || null })
    setNovo(''); setNovoOS(null)
    setTimeout(() => novoRef.current?.focus(), 30)
  }

  function onDrop(alvoId) {
    if (!dragId || dragId === alvoId) { setDragId(null); setOverId(null); return }
    const ids = itens.map(i => i.id)
    const from = ids.indexOf(dragId), to = ids.indexOf(alvoId)
    if (from < 0 || to < 0) { setDragId(null); setOverId(null); return }
    ids.splice(to, 0, ids.splice(from, 1)[0])
    R.reordenar(ids)
    setDragId(null); setOverId(null)
  }

  return (
    <div style={{
      flex: '1 1 300px', minWidth: 270, display: 'flex', flexDirection: 'column',
      border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden',
      background: dark ? 'rgba(255,255,255,0.02)' : '#fbfcfe',
    }}>
      {/* Cabeçalho da pessoa */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', borderBottom: `1px solid ${T.border}` }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
          background: (pessoa.cor || AZUL) + '2e', color: pessoa.cor || AZUL,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
        }}>{(pessoa.nome || '?').slice(0, 2).toUpperCase()}</span>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: T.textPrimary }}>{pessoa.nome}</span>
        <span style={{ fontSize: 11, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>
          {feitas}/{itens.length}
        </span>
      </div>

      {/* Lista de tarefas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', minHeight: 40 }}>
        {itens.length === 0 && (
          <div style={{ padding: '14px 12px', fontSize: 11.5, color: T.textDim, textAlign: 'center' }}>
            Sem tarefas. Adicione abaixo.
          </div>
        )}
        {itens.map(item => {
          const os = item.os_id ? osPorId.get(item.os_id) : null
          return (
            <div key={item.id}
              onDragOver={e => { e.preventDefault(); if (overId !== item.id) setOverId(item.id) }}
              onDrop={() => onDrop(item.id)}
              style={{
                display: 'flex', gap: 4, padding: '3px 8px 3px 3px', alignItems: 'flex-start',
                borderTop: overId === item.id && dragId && dragId !== item.id ? `2px solid ${AZUL}` : '2px solid transparent',
                opacity: dragId === item.id ? 0.4 : 1,
              }}>
              <span draggable
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => { setDragId(null); setOverId(null) }}
                style={{ cursor: 'grab', color: T.textDim, padding: '5px 1px', opacity: 0.4, flexShrink: 0 }}>
                <i className="ti ti-grip-vertical" style={{ fontSize: 12 }} aria-hidden="true" />
              </span>
              <button onClick={() => R.marcarFeito(item)} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '3px 1px', flexShrink: 0,
                color: item.feito ? AZUL : T.textDim,
              }} aria-label={item.feito ? 'Desmarcar' : 'Marcar feito'}>
                <i className={`ti ${item.feito ? 'ti-square-check' : 'ti-square'}`} style={{ fontSize: 16 }} aria-hidden="true" />
              </button>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <MentionTextInput
                    T={T} dark={dark} osList={osList} pessoas={pessoas}
                    value={semToken(item.texto, os?.numero)}
                    onChange={v => R.editarTexto(item.id, v)}
                    onPick={p => { if (p.tipo === 'os') { const o = osList.find(x => x.numero === p.numero); if (o) R.setOS(item.id, o.id) } }}
                    placeholder="tarefa…"
                    style={{
                      background: 'transparent', border: 'none', outline: 'none', width: '100%',
                      fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.5, padding: '1px 0',
                      color: item.feito ? T.textDim : T.textPrimary,
                      textDecoration: item.feito ? 'line-through' : 'none',
                    }}
                  />
                  {item.urgente && <i className="ti ti-flag-3" style={{ fontSize: 12, color: '#FF6B6B', flexShrink: 0 }} aria-hidden="true" />}
                </div>
                {os && <OSChip os={os} T={T} dark={dark} onAbrir={onAbrirOS} />}
              </div>
              {/* Ações: urgente + excluir */}
              <button onClick={() => R.setUrgente(item.id, !item.urgente)} title="Marcar urgente"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', flexShrink: 0, color: item.urgente ? '#FF6B6B' : T.textDim, opacity: item.urgente ? 1 : 0.45 }}>
                <i className="ti ti-flag" style={{ fontSize: 12 }} aria-hidden="true" />
              </button>
              <button onClick={() => R.remover(item.id)} title="Excluir"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', flexShrink: 0, color: T.textDim, opacity: 0.45 }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FF6B6B'; e.currentTarget.style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.color = T.textDim; e.currentTarget.style.opacity = '0.45' }}>
                <i className="ti ti-x" style={{ fontSize: 12 }} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Adicionar tarefa */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {novoOS && (
          <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, background: dark ? 'rgba(91,155,213,0.14)' : 'rgba(91,155,213,0.10)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: AZUL }}>#{novoOS.numero}</span>
            <button onClick={() => setNovoOS(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textDim, padding: 0, display: 'flex' }}>
              <i className="ti ti-x" style={{ fontSize: 11 }} aria-hidden="true" />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-plus" style={{ fontSize: 13, color: T.textDim, flexShrink: 0 }} aria-hidden="true" />
          <MentionTextInput
            T={T} dark={dark} osList={osList} pessoas={pessoas}
            inputRef={novoRef}
            value={novo}
            onChange={setNovo}
            onPick={p => { if (p.tipo === 'os') { const o = osList.find(x => x.numero === p.numero); if (o) { setNovoOS({ id: o.id, numero: o.numero }); setNovo(n => semToken(n, o.numero)) } } }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submeterNovo() } }}
            placeholder="Nova tarefa  ·  @OS pra vincular"
            style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: 12.5, fontFamily: 'inherit', lineHeight: 1.6, padding: '3px 0', color: T.textPrimary }}
          />
        </div>
      </div>
    </div>
  )
}

function Organizador({ R, osPorId, osList, pessoas, T, dark, onAbrirOS }) {
  // Só funcionários (dono não tem "Meu Dia" pra organizar).
  const funcionarios = pessoas.filter(p => p.papel !== 'dono')
  if (funcionarios.length === 0) {
    return <div style={{ padding: 24, textAlign: 'center', color: T.textDim, fontSize: 12.5 }}>Nenhum funcionário cadastrado.</div>
  }
  return (
    <div style={{ display: 'flex', gap: 10, padding: 12, flexWrap: 'wrap', alignItems: 'stretch' }}>
      {funcionarios.map(p => (
        <ColunaFuncionario
          key={p.id} pessoa={p}
          itens={R.itens.filter(i => i.responsavel_id === p.id)}
          osPorId={osPorId} osList={osList} pessoas={pessoas} R={R} T={T} dark={dark}
          onAbrirOS={onAbrirOS}
        />
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MODO MEU DIA (funcionário) — própria lista, progresso, checks grandes
// ════════════════════════════════════════════════════════════════════════════
function MeuDia({ R, osPorId, T, dark, pessoa, onAbrirOS }) {
  const itens  = R.itens
  const feitas = itens.filter(i => i.feito).length
  const total  = itens.length
  const pct    = total ? Math.round((feitas / total) * 100) : 0
  // Pendentes primeiro (urgentes no topo), feitas afundam.
  const ordenadas = [...itens].sort((a, b) => {
    if (a.feito !== b.feito) return a.feito ? 1 : -1
    if (a.urgente !== b.urgente) return a.urgente ? -1 : 1
    return a.ordem - b.ordem
  })

  return (
    <div>
      {/* Progresso */}
      <div style={{ padding: '12px 16px 14px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 9, background: dark ? 'rgba(255,255,255,0.08)' : '#e9eef5', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: AZUL, borderRadius: 999, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: T.textDim, fontVariantNumeric: 'tabular-nums' }}>{feitas} de {total}</span>
        </div>
        {total > 0 && feitas === total && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: AZUL, fontSize: 12.5, fontWeight: 700 }}>
            <i className="ti ti-circle-check" style={{ fontSize: 16 }} aria-hidden="true" /> Dia concluído. Bom trabalho!
          </div>
        )}
      </div>

      {/* Lista */}
      <div style={{ padding: '6px 0' }}>
        {total === 0 && (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: T.textDim }}>
            <i className="ti ti-coffee" style={{ fontSize: 26, opacity: 0.5 }} aria-hidden="true" />
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>Nenhuma tarefa pra hoje ainda.</p>
            <p style={{ margin: '2px 0 0', fontSize: 11.5 }}>O Toni organiza seu dia por aqui.</p>
          </div>
        )}
        {ordenadas.map(item => {
          const os = item.os_id ? osPorId.get(item.os_id) : null
          return (
            <button key={item.id} onClick={() => R.marcarFeito(item)}
              style={{
                width: '100%', display: 'flex', gap: 11, alignItems: 'flex-start', textAlign: 'left',
                padding: '11px 16px', background: item.urgente && !item.feito ? (dark ? 'rgba(91,155,213,0.10)' : 'rgba(91,155,213,0.06)') : 'transparent',
                border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', fontFamily: 'inherit',
                opacity: item.feito ? 0.5 : 1,
              }}>
              <i className={`ti ${item.feito ? 'ti-square-check' : 'ti-square'}`} style={{ fontSize: 22, color: item.feito ? AZUL : (item.urgente ? AZUL : T.textDim), flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14.5, color: T.textPrimary, textDecoration: item.feito ? 'line-through' : 'none', fontWeight: item.urgente && !item.feito ? 600 : 400 }}>
                    {semToken(item.texto, os?.numero) || (os ? `OS #${os.numero}` : 'tarefa')}
                  </span>
                  {item.urgente && !item.feito && (
                    <span style={{ fontSize: 10.5, padding: '1px 7px', borderRadius: 999, background: AZUL, color: '#08365e', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <i className="ti ti-flag" style={{ fontSize: 10.5 }} aria-hidden="true" /> urgente
                    </span>
                  )}
                </span>
                {os && (
                  <span style={{ display: 'block', marginTop: 4 }} onClick={e => e.stopPropagation()}>
                    <OSChip os={os} T={T} dark={dark} onAbrir={onAbrirOS} />
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// SHELL (modal) — escolhe o modo pelo papel
// ════════════════════════════════════════════════════════════════════════════
export default function RoteiroDia({ T, dark, user, onClose, osList = [], pessoas = [], onAbrirOS }) {
  const isDono = getRole(user) === 'dono'
  const R = useRoteiro(isDono ? {} : { responsavelId: user?.id })
  const osPorId = useMemo(() => new Map((osList || []).map(o => [o.id, o])), [osList])
  const _mdb = useRef(false)

  const hojeLabel = new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Cuiaba', weekday: 'long', day: '2-digit', month: 'long',
  })
  const pessoaAtual = pessoas.find(p => p.id === user?.id)

  return (
    <div
      onMouseDown={e => { _mdb.current = e.target === e.currentTarget }}
      onClick={e => { if (e.target === e.currentTarget && _mdb.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        animation: 'os-detalhe-fade .15s ease-out',
      }}>
      <div onClick={e => e.stopPropagation()} className="idemaq-card" style={{
        background: T.card, color: T.textPrimary, borderRadius: 14,
        width: '100%', maxWidth: isDono ? 920 : 460, maxHeight: 'calc(100vh - 3rem)',
        border: `1px solid ${T.border}`, boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'os-detalhe-in .22s cubic-bezier(.2,.7,.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 9,
          background: dark ? 'rgba(91,155,213,.10)' : 'rgba(91,155,213,.06)', borderRadius: '14px 14px 0 0',
        }}>
          <i className="ti ti-checklist" style={{ fontSize: 17, color: AZUL }} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary }}>
              {isDono ? 'Roteiro do Dia' : `Meu dia${pessoaAtual ? ' · ' + pessoaAtual.nome : ''}`}
            </div>
            <div style={{ fontSize: 11, color: T.textDim, textTransform: 'capitalize' }}>{hojeLabel}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 24, height: 24, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'transparent', color: T.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {R.tabelaAusente ? (
            <div style={{ padding: '28px 22px', textAlign: 'center', color: T.textDim }}>
              <i className="ti ti-database-off" style={{ fontSize: 26, opacity: 0.5 }} aria-hidden="true" />
              <p style={{ margin: '10px 0 0', fontSize: 13, color: T.textPrimary, fontWeight: 600 }}>Roteiro do Dia ainda não ativado</p>
              <p style={{ margin: '4px 0 0', fontSize: 12 }}>Rode <code>sql/83-roteiro-dia.sql</code> no Supabase pra ligar.</p>
            </div>
          ) : (R.loading && R.itens.length === 0) ? (
            <div style={{ padding: 28, textAlign: 'center', color: T.textDim, fontSize: 12.5 }}>Carregando…</div>
          ) : isDono ? (
            <Organizador R={R} osPorId={osPorId} osList={osList} pessoas={pessoas} T={T} dark={dark} onAbrirOS={onAbrirOS} />
          ) : (
            <MeuDia R={R} osPorId={osPorId} T={T} dark={dark} pessoa={pessoaAtual} onAbrirOS={onAbrirOS} />
          )}
        </div>
      </div>
    </div>
  )
}
