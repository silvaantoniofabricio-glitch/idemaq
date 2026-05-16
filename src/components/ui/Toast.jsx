// idemaq-src/components/ui/Toast.jsx
// Toast notification — chamado via useToast() hook.
// 3 tipos: success | error | info. Some sozinho em 3.2s.

import React, { createContext, useContext, useState, useCallback } from 'react'
import { P } from '../../theme'
import { corEtapa, bgEtapa } from '../../utils/colors'

const ToastContext = createContext(null)

export function ToastProvider({ children, T, dark }) {
  const [toast, setToast] = useState(null)
  const notify = useCallback((tipo, msg) => {
    setToast({ tipo, msg })
    clearTimeout(notify._t)
    notify._t = setTimeout(() => setToast(null), 3200)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toast && <ToastView T={T} dark={dark} toast={toast} />}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const fn = useContext(ToastContext)
  if (!fn) {
    // Fallback: chama console — útil em testes/storybook
    return (tipo, msg) => console.log(`[toast:${tipo}]`, msg)
  }
  return fn
}

function ToastView({ T, dark, toast }) {
  const tipo = toast.tipo
  const isOk    = tipo === 'ok' || tipo === 'success'
  const isErro  = tipo === 'erro' || tipo === 'error'
  const cKey = isOk ? 'green' : isErro ? 'red' : 'blue'
  const c  = corEtapa(cKey, dark)
  const bg = bgEtapa(cKey, dark)
  const ico = isOk ? 'ti-circle-check' : isErro ? 'ti-alert-triangle' : 'ti-info-circle'

  return (
    <div style={{
      position: 'fixed',
      bottom: 22,
      right: 22,
      zIndex: 9999,
      background: T?.card || '#fff',
      border: `1px solid ${T?.border}`,
      borderLeft: `3px solid ${c}`,
      borderRadius: 10,
      padding: '11px 14px',
      boxShadow: '0 10px 28px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: 10,
      maxWidth: 380, minWidth: 240,
      animation: 'idemaq-toast-in .2s ease-out',
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: bg, color: c,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <i className={`ti ${ico}`} style={{ fontSize: 15 }} aria-hidden="true" />
      </div>
      <span style={{ fontSize: 12.5, color: T?.textPrimary, fontWeight: 500 }}>{toast.msg}</span>
      <style>{`@keyframes idemaq-toast-in { from { transform: translateY(10px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </div>
  )
}
