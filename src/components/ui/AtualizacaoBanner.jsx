// src/components/ui/AtualizacaoBanner.jsx
// Banner que aparece quando o useAutoReload detecta nova versão.
// Auto-reload em 5s ou clique imediato.

import React, { useEffect, useState } from 'react'
import { useTheme } from '../../theme'
import { P } from '../../theme'

export default function AtualizacaoBanner({ onReload }) {
  const { T, dark } = useTheme()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (countdown <= 0) {
      onReload()
      return
    }
    const id = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(id)
  }, [countdown, onReload])

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 14px 10px',
      background: dark ? P.blue : P.blueDark,
      color: '#fff',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 13, fontFamily: 'inherit',
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      animation: 'slideDown .3s ease-out',
    }}>
      <i className="ti ti-refresh" style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true" />
      <span style={{ flex: 1, fontWeight: 600 }}>
        Nova versão disponível
        <span style={{ opacity: 0.85, fontWeight: 400, marginLeft: 6 }}>
          · atualizando em {countdown}s
        </span>
      </span>
      <button onClick={onReload}
        style={{
          padding: '6px 12px', borderRadius: 6,
          background: 'rgba(255,255,255,0.2)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.35)',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          fontFamily: 'inherit', flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        }}>
        Atualizar agora
      </button>
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
