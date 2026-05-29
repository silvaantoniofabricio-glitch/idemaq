// src/components/ui/Modal.jsx
// Modal base — Atlassian Design.
// overlay rgba(9,30,66,0.5) + container border 1 + radius 4 + shadow.

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
      onMouseDown={closeOnOverlay
        ? (e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget }
        : undefined}
      onClick={closeOnOverlay
        ? (e) => { if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose?.() }
        : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(9,30,66,0.5)',
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
          color: T?.textPrimary || '#091E42',
          borderRadius: mobile ? '8px 8px 0 0' : 4,
          width: '100%',
          maxWidth: mobile ? '100%' : maxWidth,
          maxHeight: mobile ? '92vh' : 'calc(100vh - 4rem)',
          border: `1px solid ${T?.border || '#DFE1E6'}`,
          boxShadow: mobile
            ? '0 -8px 32px rgba(9,30,66,0.35)'
            : '0 12px 32px rgba(9,30,66,0.25)',
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

// ModalHeader — Atlassian: titulo 15px/600 + close radius 3
export function ModalHeader({ T, title, subtitle, icon, onClose, right }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: `1px solid ${T?.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 10, flexShrink: 0,
      background: T?.card,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {icon && (
          <i className={`ti ${icon}`}
             style={{ fontSize: 18, color: T?.textMuted }}
             aria-hidden="true" />
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 600, color: T?.textPrimary,
            letterSpacing: '-0.01em',
          }}>{title}</div>
          {subtitle && (
            <div style={{
              fontSize: 11.5, color: T?.textMuted, marginTop: 2,
              letterSpacing: '-0.005em',
            }}>{subtitle}</div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {right}
        {onClose && (
          <button onClick={onClose} aria-label="Fechar" style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: T?.textMuted, padding: 4, borderRadius: 3,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
            transition: 'background .12s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = T?.cardAlt || 'rgba(0,0,0,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <i className="ti ti-x" style={{ fontSize: 18 }} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
