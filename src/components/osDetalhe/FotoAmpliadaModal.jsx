// src/components/osDetalhe/FotoAmpliadaModal.jsx
// Modal de foto ampliada — overlay escuro, foto centralizada, X pra fechar.
// Fecha com Esc ou click fora. Sem outros controles (mantém simples).

import React, { useEffect } from 'react'

export default function FotoAmpliadaModal({ src, alt = 'Foto', onClose }) {
  // Esc fecha + trava scroll do body
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'foto-ampliada-fade .15s ease-out',
      }}
    >
      {/* Botão X */}
      <button
        onClick={onClose}
        aria-label="Fechar"
        style={{
          position: 'absolute', top: 16, right: 16,
          width: 40, height: 40, borderRadius: 8,
          background: 'rgba(0,0,0,0.5)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.15)',
          cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className="ti ti-x" style={{ fontSize: 22 }} aria-hidden="true" />
      </button>

      {/* Imagem */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw', maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: 6,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          cursor: 'default',
        }}
      />

      <style>{`@keyframes foto-ampliada-fade { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </div>
  )
}
