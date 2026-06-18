// src/components/roteiro/MandarRoteiroDialog.jsx
// Janela pra revisar/editar a descrição antes de mandar a OS pro roteiro.
// Abre já preenchida com o texto automático da etapa (ex.: "Consertar") — o
// usuário pode acrescentar e confirmar. Usada pelo ⋮ do card e da OS.
//
// Props:
//   T, dark
//   os                 — OS (pra título + texto automático pela etapa)
//   funcionario        — { id, nome, cor } a quem vai
//   diaKey             — 'hoje' | 'amanha' (só pra exibir)
//   onConfirm(texto)   — confirma com o texto editado
//   onClose()          — cancela

import React from 'react'
import { createPortal } from 'react-dom'
import { textoAutoPorEtapa } from '../../utils/roteiroEnvio'

const AZUL = '#5B9BD5'

export default function MandarRoteiroDialog({ T, dark, os, funcionario, diaKey = 'hoje', onConfirm, onClose }) {
  const [texto, setTexto] = React.useState(() => textoAutoPorEtapa(os?.etapa) || '')
  const ref = React.useRef(null)

  // Foca e põe o cursor no FIM (pronto pra acrescentar, sem apagar o pré-texto).
  React.useEffect(() => {
    const t = setTimeout(() => {
      const el = ref.current
      if (el) { el.focus(); const n = el.value.length; el.setSelectionRange(n, n) }
    }, 50)
    return () => clearTimeout(t)
  }, [])

  const quando = diaKey === 'amanha' ? 'amanhã' : 'hoje'
  const cor = funcionario?.cor || AZUL

  function confirmar() { onConfirm((texto || '').trim()) }
  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmar() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  return createPortal(
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        animation: 'os-detalhe-fade .15s ease-out',
      }}>
      <div className="idemaq-card" style={{
        background: T.card, color: T.textPrimary, borderRadius: 12,
        width: '100%', maxWidth: 420, border: `1px solid ${T.border}`,
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
        animation: 'os-detalhe-in .2s cubic-bezier(.2,.7,.2,1)',
      }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', alignItems: 'center', gap: 9,
          background: dark ? 'rgba(91,155,213,.10)' : 'rgba(91,155,213,.06)',
        }}>
          <i className="ti ti-checklist" style={{ fontSize: 16, color: AZUL }} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>Mandar pro roteiro</div>
            <div style={{ fontSize: 11, color: T.textDim, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 16, height: 16, borderRadius: '50%', background: cor + '33', color: cor,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700,
              }}>{(funcionario?.nome || '?').slice(0, 2).toUpperCase()}</span>
              {funcionario?.nome} · {quando}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 24, height: 24, borderRadius: 5, border: 'none', cursor: 'pointer', background: 'transparent', color: T.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-x" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
        </div>

        {/* Corpo */}
        <div style={{ padding: '14px 16px' }}>
          {os && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '2px 8px', borderRadius: 6, background: dark ? 'rgba(91,155,213,0.14)' : 'rgba(91,155,213,0.10)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: AZUL, fontVariantNumeric: 'tabular-nums' }}>#{os.numero}</span>
              <span style={{ fontSize: 11.5, color: T.textPrimary }}>{os.cliente || 'Sem cliente'}</span>
              {os.etapa && <span style={{ fontSize: 10, color: T.textDim }}>· {os.etapa}</span>}
            </div>
          )}
          <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 5 }}>Descrição da tarefa</label>
          <textarea
            ref={ref}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={onKey}
            rows={3}
            placeholder="O que precisa ser feito…"
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              padding: '9px 11px', borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.bg || T.card, color: T.textPrimary,
              fontSize: 13.5, fontFamily: 'inherit', lineHeight: 1.5, outline: 'none',
            }}
          />
          <div style={{ fontSize: 10.5, color: T.textDim, marginTop: 5 }}>Enter pra confirmar · Shift+Enter pula linha</div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '9px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
            background: 'transparent', color: T.textMuted, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Cancelar</button>
          <button onClick={confirmar} style={{
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: AZUL, color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <i className="ti ti-send" style={{ fontSize: 14 }} aria-hidden="true" /> Mandar pro roteiro
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
