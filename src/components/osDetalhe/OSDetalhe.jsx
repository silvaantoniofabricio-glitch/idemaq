// src/components/osDetalhe/OSDetalhe.jsx
// Modal centralizado de detalhe da OS.
// Desktop: 780px centrado.
// Mobile (mobile=true): bottom-sheet com grab handle, swipe-down-to-close,
// HeaderMobile + FooterMobile dedicados (mais touch-friendly).

import React, { useState, useEffect, useRef } from 'react'
import { isAdmin } from '../../utils/osHelpers'
import Header from './Header'
import HeaderMobile from './HeaderMobile'
import Footer from './Footer'
import FooterMobile from './FooterMobile'
import HistoricoPanel from './HistoricoPanel'
import RelatorioTab from './tabs/RelatorioTab'
import PagamentoTab from './tabs/PagamentoTab'
import EtapaTab from './tabs/EtapaTab'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import PullIndicator from '../ui/PullIndicator'

function abaInicial(etapa) {
  if (etapa === 'pagamento') return 'pagamento'
  if (etapa === 'concluido' || etapa === 'recusado') return 'relatorio'
  return 'etapa'
}

export default function OSDetalhe({
  T, dark,
  os, user, osBase, usuarios,
  onClose,
  onToggleAgPeca,
  onAbrirOS,
  onMoverOS,
  onUpdateOS,
  onExcluir,
  onDuplicar,
  onRefetchOS,
  onOrcamentoEnviado,
  mobile = false,
}) {
  const admin = isAdmin(user)
  const [aba, setAba] = useState(() => abaInicial(os.etapa))
  const [showHistorico, setShowHistorico] = useState(false)

  // Pull-to-refresh dentro da OS aberta (mobile so) — puxa pra baixo no
  // scroll do conteudo e chama onRefetchOS pra recarregar dados do banco.
  const { ref: scrollRef, pullDistance, refreshing, progress } = usePullToRefresh({
    onRefresh: onRefetchOS,
    enabled: mobile,
  })

  // Quando a OS avança de etapa (footer Avançar →), troca a aba automaticamente
  // pra que a UI já mostre a ação da nova etapa em vez de deixar o user perdido
  // na aba antiga. Usa ref pra distinguir "etapa mudou de verdade" de "render
  // normal" — sem isso, qualquer re-render resetava a aba escolhida pelo user.
  const etapaRef = useRef(os.etapa)
  useEffect(() => {
    if (os.etapa !== etapaRef.current) {
      etapaRef.current = os.etapa
      setAba(abaInicial(os.etapa))
    }
  }, [os.etapa])

  // ESC fecha o modal (ignorado se o painel de histórico estiver aberto — ele tem seu próprio listener)
  useEffect(() => {
    function fn(e) {
      if (e.key === 'Escape' && !showHistorico) onClose()
    }
    document.addEventListener('keydown', fn)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', fn)
      document.body.style.overflow = prev
    }
  }, [onClose, showHistorico])

  // === Swipe-down-to-close (só mobile, gesto na top area) ===
  // Pattern padrão de bottom-sheet: o usuário arrasta o cabeçalho pra baixo;
  // se passar de 100px de deslocamento, fecha. Senão volta pro lugar.
  // O listener fica só na área do grab handle / topbar pra não brigar com o
  // scroll vertical do conteúdo interno (que é o que mais incomoda quando o
  // gesto é capturado errado).
  const sheetRef = useRef(null)
  const dragRef = useRef(null)
  const _mouseDownOnBackdrop = useRef(false)
  const [dragY, setDragY] = useState(0)

  function onDragStart(e) {
    if (!mobile) return
    const t = e.touches?.[0]
    if (!t) return
    dragRef.current = { y0: t.clientY, active: true }
  }
  function onDragMove(e) {
    if (!mobile || !dragRef.current?.active) return
    const t = e.touches?.[0]
    if (!t) return
    const dy = Math.max(0, t.clientY - dragRef.current.y0) // só pra baixo
    setDragY(dy)
  }
  function onDragEnd() {
    if (!mobile || !dragRef.current?.active) return
    const dy = dragY
    dragRef.current = null
    if (dy > 100) {
      // anima a queda final e fecha
      setDragY(window.innerHeight)
      setTimeout(() => { setDragY(0); onClose() }, 160)
    } else {
      setDragY(0)
    }
  }

  // Props comuns repassados às abas.
  const tabProps = {
    T, dark, os, user, osBase, usuarios, admin,
    onAbrirOS, onToggleAgPeca, onMoverOS, onUpdateOS,
    onOrcamentoEnviado,
    setAba,
    mobile,
  }

  const HeaderC = mobile ? HeaderMobile : Header
  const FooterC = mobile ? FooterMobile : Footer

  return (
    <>
      {/* Overlay + container — full-screen no mobile, centralizado no desktop */}
      <div
        onMouseDown={(e) => { _mouseDownOnBackdrop.current = e.target === e.currentTarget }}
        onClick={(e) => { if (e.target === e.currentTarget && _mouseDownOnBackdrop.current) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          display: 'flex',
          alignItems: mobile ? 'stretch' : 'center',
          justifyContent: 'center',
          padding: mobile ? 0 : '2rem',
          animation: 'os-detalhe-fade .15s ease-out',
        }}
      >
        <div
          ref={sheetRef}
          onClick={(e) => e.stopPropagation()}
          className={mobile ? '' : 'idemaq-card'}
          style={{
            // HIG: SF font system aplicado em toda a OS — inherited por children
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
            background: T.card,
            color: T.textPrimary,
            borderRadius: mobile ? 0 : 14,
            width: '100%',
            maxWidth: mobile ? '100%' : 780,
            // Mobile: tamanho fixo full-screen (dvh respeita barra de URL dinâmica do iOS Safari).
            // Conteúdo varia internamente via overflow do bloco do meio, mas o shell não muda.
            height: mobile ? '100dvh' : 'auto',
            maxHeight: mobile ? '100dvh' : 'calc(100vh - 4rem)',
            minHeight: mobile ? '100dvh' : undefined,
            border: mobile ? 'none' : `1px solid ${T.border}`,
            boxShadow: mobile ? 'none' : '0 -8px 40px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: mobile
              ? 'os-detalhe-slide-up .22s cubic-bezier(.2,.7,.2,1)'
              : 'os-detalhe-in .22s cubic-bezier(.2,.7,.2,1)',
            transform: dragY ? `translateY(${dragY}px)` : undefined,
            transition: dragRef.current?.active ? 'none' : 'transform .18s ease-out',
          }}
        >
          {/* Grab handle (só mobile) — captura o gesto de arrastar pra fechar */}
          {mobile && (
            <div
              onTouchStart={onDragStart}
              onTouchMove={onDragMove}
              onTouchEnd={onDragEnd}
              onTouchCancel={onDragEnd}
              style={{
                flexShrink: 0,
                padding: '8px 0 6px',
                display: 'flex', justifyContent: 'center',
                background: T.card,
                cursor: 'grab',
                touchAction: 'none',
              }}
              aria-hidden="true"
            >
              <div style={{
                width: 40, height: 4, borderRadius: 2,
                background: T.border,
              }} />
            </div>
          )}

          <HeaderC
            T={T} dark={dark} os={os} admin={admin}
            aba={aba} setAba={setAba}
            onShowHistorico={() => setShowHistorico(true)}
            onClose={onClose}
            onUpdateOS={onUpdateOS}
            onExcluir={onExcluir}
            onDuplicar={onDuplicar}
            onRefetchOS={onRefetchOS}
            mobile={mobile}
          />

          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: T.bg,
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
          }}>
            {mobile && (
              <PullIndicator
                distance={pullDistance}
                refreshing={refreshing}
                progress={progress}
              />
            )}
            {aba === 'etapa'     && <EtapaTab {...tabProps} />}
            {aba === 'relatorio' && <RelatorioTab {...tabProps} />}
            {aba === 'pagamento' && <PagamentoTab {...tabProps} />}
          </div>

          <FooterC
            T={T} dark={dark} os={os} admin={admin}
            onMoverOS={onMoverOS}
          />
        </div>

        <style>{`
          @keyframes os-detalhe-fade { from { opacity: 0 } to { opacity: 1 } }
          @keyframes os-detalhe-in   { from { transform: translateY(24px); opacity: .85 } to { transform: translateY(0); opacity: 1 } }
          @keyframes os-detalhe-slide-up { from { transform: translateY(100%); opacity: 1 } to { transform: translateY(0); opacity: 1 } }
        `}</style>
      </div>

      {/* Painel de histórico (sobreposto, z-index maior) */}
      {showHistorico && (
        <HistoricoPanel
          T={T} dark={dark} os={os} mobile={mobile}
          onClose={() => setShowHistorico(false)}
        />
      )}
    </>
  )
}
