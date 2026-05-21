// src/components/mobile/MobileSheet.jsx
// Bottom sheet pra substituir <Modal> em mobile.
//
// Features:
//   - Slide-up animation (translate Y 100% → 0)
//   - Backdrop com fade
//   - Drag handle visual no topo
//   - ESC fecha + click-fora fecha
//   - Bloqueia scroll do body enquanto aberto
//   - Safe-area-inset-bottom (iPhone notch)
//   - Aceita header sticky + footer sticky opcionais

import React, { useEffect, useRef } from 'react'

export default function MobileSheet({
  T, dark,
  open,
  onClose,
  title,                  // string ou ReactNode
  subtitle,               // string opcional
  icon,                   // ti-* opcional ao lado do título
  iconColor,              // override de cor do ícone
  rightAction,            // ReactNode (ex: botão Salvar) no header direito
  footer,                 // ReactNode sticky no rodapé (ex: botões Cancel/Save)
  children,
  maxHeight = '92vh',     // ocupa quase a tela toda — comum em apps mobile
  showHandle = true,      // barra de drag no topo
}) {
  const sheetRef = useRef(null)

  // Bloqueia scroll do body + ESC fecha
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'idemaq-fade-in .15s ease',
      }}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 600,
          maxHeight,
          background: T?.card || '#fff',
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
          animation: 'idemaq-slide-up .22s cubic-bezier(.22, .61, .36, 1)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Drag handle */}
        {showHandle && (
          <div style={{
            display: 'flex', justifyContent: 'center',
            padding: '8px 0 4px', flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: T?.border || '#ddd',
            }} />
          </div>
        )}

        {/* Header */}
        {(title || rightAction) && (
          <div style={{
            padding: '8px 18px 12px',
            borderBottom: `1px solid ${T?.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            {icon && (
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: `${iconColor || T?.textMuted}22`,
                color: iconColor || T?.textMuted,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <i className={`ti ${icon}`} style={{ fontSize: 17 }} aria-hidden="true" />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && (
                <div style={{
                  fontSize: 15, fontWeight: 700, color: T?.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {title}
                </div>
              )}
              {subtitle && (
                <div style={{ fontSize: 11, color: T?.textMuted, marginTop: 2 }}>
                  {subtitle}
                </div>
              )}
            </div>
            {rightAction}
            <button onClick={onClose} aria-label="Fechar"
              style={{
                width: 32, height: 32, borderRadius: 7,
                background: 'transparent', border: 'none', color: T?.textMuted,
                cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
              }}>
              <i className="ti ti-x" style={{ fontSize: 18 }} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Body (scroll) */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '14px 18px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {children}
        </div>

        {/* Footer sticky */}
        {footer && (
          <div style={{
            padding: '10px 18px 14px',
            borderTop: `1px solid ${T?.border}`,
            background: T?.card,
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// Animações inline-injected (idempotente — se já existir no document, não duplica)
if (typeof document !== 'undefined' && !document.getElementById('idemaq-mobile-anims')) {
  const style = document.createElement('style')
  style.id = 'idemaq-mobile-anims'
  style.textContent = `
    @keyframes idemaq-fade-in {
      from { opacity: 0 }
      to { opacity: 1 }
    }
    @keyframes idemaq-slide-up {
      from { transform: translateY(100%) }
      to { transform: translateY(0) }
    }
    @keyframes idemaq-fade-slide-up {
      from { opacity: 0; transform: translateY(8px) }
      to { opacity: 1; transform: translateY(0) }
    }
  `
  document.head.appendChild(style)
}
