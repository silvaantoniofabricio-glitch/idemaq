// src/components/notas/MentionTextInput.jsx
// Input de texto com autocomplete de @menção pra Notas do Dia.
// Ao digitar "@" seguido de número da OS ou nome do cliente, abre um dropdown
// de sugestões. Selecionar insere "@<numero> " no texto.
//
// Compartilhado entre a Notas do Dia desktop (Kanban.jsx) e mobile (OSMobile.jsx).
//
// Props:
//   value, onChange(newValue)  — controlado pelo pai
//   osList                     — [{ numero, cliente, ... }] pra sugestões
//   onKeyDown                  — handler do pai (Enter/Backspace de linha);
//                                só é chamado quando o dropdown NÃO está aberto
//   inputRef                   — ref opcional do <input> (foco/seleção)
//   onPick(os)                 — callback opcional quando escolhe uma OS
//   style, placeholder, onContextMenu, ... — repassados ao <input>

import React, { useMemo, useRef, useState } from 'react'

export default function MentionTextInput({
  value, onChange, osList = [], onKeyDown, inputRef, onPick,
  T, dark, style, ...rest
}) {
  const localRef = useRef(null)
  // Suporta inputRef como callback (ex: el => refs[idx] = el) ou objeto {current}.
  function setRef(el) {
    localRef.current = el
    if (typeof inputRef === 'function') inputRef(el)
    else if (inputRef) inputRef.current = el
  }
  const [mention, setMention] = useState(null) // { start, query } | null
  const [sugIdx, setSugIdx]   = useState(0)

  const azul = '#5B9BD5'

  const suggestions = useMemo(() => {
    if (!mention) return []
    const q = (mention.query || '').toLowerCase()
    return (osList || [])
      .filter(o => {
        if (!q) return true
        const num = String(o.numero || '')
        const cli = (o.cliente || '').toLowerCase()
        return num.includes(q) || cli.includes(q)
      })
      .slice(0, 6)
  }, [mention, osList])

  // Detecta se o cursor está logo após um "@token" (sem espaço no meio).
  function detectar(el) {
    const pos = el.selectionStart ?? el.value.length
    const before = el.value.slice(0, pos)
    const m = before.match(/(?:^|\s)@([^\s@]*)$/)
    if (m) {
      setMention({ start: pos - m[1].length - 1, query: m[1] })
      setSugIdx(0)
    } else {
      setMention(null)
    }
  }

  function handleChange(e) {
    onChange(e.target.value)
    detectar(e.target)
  }

  function escolher(os) {
    if (!os || !mention) return
    const el = localRef.current
    const cur = el ? el.value : value
    const pos = el?.selectionStart ?? cur.length
    const token = `@${os.numero} `
    const novo = cur.slice(0, mention.start) + token + cur.slice(pos)
    onChange(novo)
    setMention(null)
    onPick?.(os)
    requestAnimationFrame(() => {
      if (el) {
        const np = mention.start + token.length
        el.focus()
        el.setSelectionRange(np, np)
      }
    })
  }

  function handleKeyDown(e) {
    if (mention && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSugIdx(i => (i + 1) % suggestions.length); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSugIdx(i => (i - 1 + suggestions.length) % suggestions.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); escolher(suggestions[sugIdx]); return }
      if (e.key === 'Escape')    { e.preventDefault(); setMention(null); return }
    }
    onKeyDown?.(e)
  }

  const aberto = !!mention && suggestions.length > 0

  // Posição fixa calculada pelo input — evita ser cortado pelo overflow da lista.
  let dropStyle = { position: 'absolute', top: '100%', left: 0, marginTop: 4 }
  if (aberto && localRef.current && typeof window !== 'undefined') {
    const r = localRef.current.getBoundingClientRect()
    const alturaEstimada = 40 + suggestions.length * 36
    const abreParaCima = r.bottom + alturaEstimada > window.innerHeight - 8
    dropStyle = abreParaCima
      ? { position: 'fixed', left: r.left, bottom: window.innerHeight - r.top + 4 }
      : { position: 'fixed', left: r.left, top: r.bottom + 4 }
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input
        ref={setRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={(e) => detectar(e.target)}
        onBlur={() => setTimeout(() => setMention(null), 150)}
        style={{ ...style, flex: undefined, width: '100%', boxSizing: 'border-box' }}
        {...rest}
      />
      {aberto && (
        <div style={{
          ...dropStyle,
          minWidth: 240, maxWidth: 320, zIndex: 250,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          boxShadow: dark ? '0 8px 24px rgba(0,0,0,.55)' : '0 8px 24px rgba(0,0,0,.18)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '6px 10px 4px', fontSize: 10, fontWeight: 700,
            color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <i className="ti ti-at" style={{ fontSize: 11 }} aria-hidden="true" />
            Vincular OS
          </div>
          {suggestions.map((o, i) => (
            <button key={o.numero}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(o)}
              onMouseEnter={() => setSugIdx(i)}
              style={{
                width: '100%', padding: '7px 10px',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: i === sugIdx ? (dark ? 'rgba(91,155,213,0.16)' : '#eef5fc') : 'transparent',
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'inherit',
              }}>
              <span style={{
                fontSize: 11.5, fontWeight: 700, color: azul,
                fontVariantNumeric: 'tabular-nums', flexShrink: 0,
                background: dark ? 'rgba(91,155,213,0.14)' : 'rgba(91,155,213,0.10)',
                padding: '1px 6px', borderRadius: 5,
              }}>#{o.numero}</span>
              <span style={{
                flex: 1, minWidth: 0, fontSize: 13, color: T.textPrimary,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{o.cliente || 'Sem cliente'}</span>
              <span style={{ fontSize: 10.5, color: T.textDim, flexShrink: 0 }}>{o.etapa}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
