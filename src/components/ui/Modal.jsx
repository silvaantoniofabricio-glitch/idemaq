// idemaq-src/components/ui/Modal.jsx
// Modal base reutilizável — overlay + container + fecha com ESC / clique fora.
// Aceita maxWidth e modo mobile (alinha bottom).

import React, { useEffect, useRef } from 'react'

export default function Modal({
  T, dark,
  onClose,
  children,
  maxWidth = 720,
  mobile = false,
  closeOnOverlay = true,
}) {
  const mouseDownOnBackdrop = useRef(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      onMouseDown={closeOnOverlay ? (e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget } : undefined}
      onClick={closeOnOverlay ? (e) => { if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose?.() } : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: mobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: mobile ? 0 : '2rem',
        animation: 'idemaq-modal-fade .15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T?.card || '#fff',
          color: T?.textPrimary || '#0a0a0d',
          borderRadius: mobile ? '16px 16px 0 0' : 14,
          width: '100%',
          maxWidth: mobile ? '100%' : maxWidth,
          maxHeight: mobile ? '92vh' : 'calc(100vh - 4rem)',
          border: `1px solid ${T?.border || '#eaeaee'}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'idemaq-modal-in .2s ease-out',
        }}
      >
        {children}
      </div>

      <style>{`
        @keyframes idemaq-modal-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes idemaq-modal-in   { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}

// ModalHeader — usado dentro do Modal
export function ModalHeader({ T, title, subtitle, icon, onClose, right }) {
  return (
    <div style={{
      padding: '14px 18px 12px',
      borderBottom: `1px solid ${T?.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {icon && <i className={`ti ${icon}`} style={{ fontSize: 20, color: T?.textSecondary }} aria-hidden="true" />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: T?.textPrimary }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: T?.textMuted, marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {right}
        {onClose && (
          <button onClick={onClose} aria-label="Fechar" style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T?.textMuted, padding: 6, borderRadius: 6,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-x" style={{ fontSize: 22 }} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
