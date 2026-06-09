// src/components/ui/Modal.jsx
// Modal base — Atlassian Design.
// overlay rgba(9,30,66,0.5) + container border 1 + radius 4 + shadow.

import React, { useEffect, useRef, useState } from 'react'

export default function Modal({
  T, dark,
  onClose,
  children,
  maxWidth = 720,
  mobile = false,
  closeOnOverlay = true,
}) {
  const mouseDownOnBackdrop = useRef(false)
  const mobileDragRef = useRef(null)
  const [mobileDragY, setMobileDragY] = useState(0)

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

  // Swipe-to-close handlers (mobile only)
  function onMobileDragStart(e) {
    const t = e.touches?.[0]
    if (!t) return
    mobileDragRef.current = { y0: t.clientY, active: true }
  }
  function onMobileDragMove(e) {
    if (!mobileDragRef.current?.active) return
    const t = e.touches?.[0]
    if (!t) return
    const dy = Math.max(0, t.clientY - mobileDragRef.current.y0)
    setMobileDragY(dy)
  }
  function onMobileDragEnd() {
    if (!mobileDragRef.current?.active) return
    const dy = mobileDragY
    mobileDragRef.current = null
    if (dy > 100) {
      setMobileDragY(window.innerHeight)
      setTimeout(() => onClose?.(), 200)
    } else {
      setMobileDragY(0)
    }
  }

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
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: mobile ? 'stretch' : 'center',
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
          borderRadius: mobile ? 0 : 4,
          width: '100%',
          maxWidth: mobile ? '100%' : maxWidth,
          height: mobile ? '100dvh' : 'auto',
          maxHeight: mobile ? '100dvh' : 'calc(100vh - 4rem)',
          minHeight: mobile ? '100dvh' : undefined,
          border: mobile ? 'none' : `1px solid ${T?.border || '#DFE1E6'}`,
          boxShadow: mobile ? 'none' : '0 12px 32px rgba(9,30,66,0.25)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: mobile ? 'idemaq-modal-slide-up .22s cubic-bezier(.2,.7,.2,1)' : 'idemaq-modal-in .2s ease-out',
          transform: mobile && mobileDragY > 0 ? `translateY(${mobileDragY}px)` : undefined,
          transition: mobile
            ? (mobileDragRef.current?.active ? 'none' : 'transform .18s ease-out')
            : undefined,
        }}
      >
        {/* Grab handle — só mobile */}
        {mobile && (
          <div
            onTouchStart={onMobileDragStart}
            onTouchMove={onMobileDragMove}
            onTouchEnd={onMobileDragEnd}
            onTouchCancel={onMobileDragEnd}
            style={{
              display: 'flex', justifyContent: 'center',
              padding: '10px 0 5px', touchAction: 'none',
              cursor: 'grab', flexShrink: 0,
            }}
          >
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: dark ? 'rgba(255,255,255,0.18)' : '#DFE1E6',
            }} />
          </div>
        )}
        {children}
      </div>

      <style>{`
        @keyframes idemaq-modal-fade     { from { opacity: 0 } to { opacity: 1 } }
        @keyframes idemaq-modal-in        { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes idemaq-modal-slide-up  { from { transform: translateY(100%) } to { transform: translateY(0) } }
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
