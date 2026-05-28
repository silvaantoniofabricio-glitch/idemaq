// src/components/osDetalhe/OSDetalhe.jsx
// Modal centralizado de detalhe da OS.
// Desktop: 780px centrado.
// Mobile (mobile=true): bottom-sheet com grab handle, swipe-down-to-close,
// HeaderMobile + FooterMobile dedicados (mais touch-friendly).

import React, { useState, useEffect, useRef } from 'react'
import { isAdmin, podeMoverOS } from '../../utils/osHelpers'
import { TIPOS_OS } from '../../utils/osData'
import { corEtapa } from '../../utils/colors'
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

// Apple HIG — easing usada em UIPageViewController scroll-style
const APPLE_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
const SWIPE_DURATION = 280  // ms
const SWIPE_DIRECTION_LOCK = 10  // px — distância antes de decidir horizontal/vertical
const SWIPE_COMMIT_RATIO = 0.28  // 28% da largura
const SWIPE_COMMIT_VELOCITY = 0.45  // px/ms

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
  onRefetchOS,
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

  // === Swipe horizontal pra avançar/voltar etapa (mobile only) ===
  // Padrão Apple HIG (UIPageViewController scroll-style):
  //   - Tracking 1:1 enquanto arrasta
  //   - Rubber band em borda sem destino
  //   - Snap por threshold de distância OU velocidade
  //   - Easing apple-spring no commit/cancel
  const etapasOrdem = TIPOS_OS[os.tipo]?.etapas || []
  const idxAtual = etapasOrdem.findIndex(e => e.id === os.etapa)
  const proxEtapa = idxAtual >= 0 ? etapasOrdem[idxAtual + 1] : null
  const antEtapa  = idxAtual >  0 ? etapasOrdem[idxAtual - 1] : null
  const canNext = proxEtapa && podeMoverOS(os, proxEtapa.id).ok
  const canPrev = antEtapa  && podeMoverOS(os, antEtapa.id).ok

  const swipeRef = useRef(null)
  const [swipeX, setSwipeX] = useState(0)
  const [swipeState, setSwipeState] = useState('idle')  // 'idle' | 'dragging' | 'animating'

  function onSwipeStart(e) {
    if (!mobile) return
    if (swipeState === 'animating') return
    const t = e.touches?.[0]
    if (!t) return
    swipeRef.current = {
      x0: t.clientX, y0: t.clientY,
      t0: Date.now(),
      locked: null,
    }
  }
  function onSwipeMove(e) {
    if (!swipeRef.current) return
    const t = e.touches?.[0]
    if (!t) return
    const dx = t.clientX - swipeRef.current.x0
    const dy = t.clientY - swipeRef.current.y0

    // Decisão de direção (lock)
    if (!swipeRef.current.locked) {
      if (Math.abs(dx) < SWIPE_DIRECTION_LOCK && Math.abs(dy) < SWIPE_DIRECTION_LOCK) return
      // Horizontal só ganha quando claramente predominante (1.4x) — protege scroll
      if (Math.abs(dx) > Math.abs(dy) * 1.4) {
        swipeRef.current.locked = 'h'
        setSwipeState('dragging')
      } else {
        swipeRef.current.locked = 'v'
        swipeRef.current = null
        return
      }
    }

    const goingNext = dx < 0
    const canGo = goingNext ? canNext : canPrev
    // Rubber band quando não há destino
    const translateX = canGo ? dx : Math.sign(dx) * Math.pow(Math.abs(dx), 0.72)
    setSwipeX(translateX)
  }
  function onSwipeEnd() {
    const ref = swipeRef.current
    swipeRef.current = null
    if (!ref || ref.locked !== 'h') {
      if (swipeState === 'dragging') setSwipeState('idle')
      return
    }
    const width = window.innerWidth || 360
    const dx = swipeX
    const dt = Math.max(1, Date.now() - ref.t0)
    const velocity = dx / dt
    const goingNext = dx < 0
    const canGo = goingNext ? canNext : canPrev
    const alvo = goingNext ? proxEtapa?.id : antEtapa?.id
    const commit = canGo && (
      Math.abs(dx) > width * SWIPE_COMMIT_RATIO ||
      Math.abs(velocity) > SWIPE_COMMIT_VELOCITY
    )

    setSwipeState('animating')

    if (commit && alvo) {
      // Anima saída pra borda e troca etapa ao terminar
      setSwipeX(goingNext ? -width : width)
      setTimeout(() => {
        // Reset instantâneo (sem transição) + commit da nova etapa
        setSwipeState('idle')
        setSwipeX(0)
        onMoverOS?.(os.numero, alvo)
      }, SWIPE_DURATION)
    } else {
      // Spring back
      setSwipeX(0)
      setTimeout(() => setSwipeState('idle'), SWIPE_DURATION)
    }
  }

  // Label de destino na borda — só durante drag, indica pra onde vai
  const swipeDirection = swipeX < 0 ? 'next' : swipeX > 0 ? 'prev' : null
  const swipeAlvo = swipeDirection === 'next' ? proxEtapa : swipeDirection === 'prev' ? antEtapa : null
  const swipeProgress = Math.min(1, Math.abs(swipeX) / (window.innerWidth * SWIPE_COMMIT_RATIO || 100))
  const swipeOk = swipeDirection === 'next' ? canNext : swipeDirection === 'prev' ? canPrev : false

  // Props comuns repassados às abas.
  const tabProps = {
    T, dark, os, user, osBase, usuarios, admin,
    onAbrirOS, onToggleAgPeca, onMoverOS, onUpdateOS,
    setAba,
    mobile,
  }

  const HeaderC = mobile ? HeaderMobile : Header
  const FooterC = mobile ? FooterMobile : Footer

  return (
    <>
      {/* Overlay + container — full-screen no mobile, centralizado no desktop */}
      <div
        onClick={onClose}
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
            onRefetchOS={onRefetchOS}
            mobile={mobile}
          />

          <div
            ref={scrollRef}
            onTouchStart={onSwipeStart}
            onTouchMove={onSwipeMove}
            onTouchEnd={onSwipeEnd}
            onTouchCancel={onSwipeEnd}
            style={{
              flex: 1, overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              background: T.bg,
              overscrollBehavior: 'contain',
              touchAction: 'pan-y',
              position: 'relative',
            }}
          >
            {mobile && (
              <PullIndicator
                distance={pullDistance}
                refreshing={refreshing}
                progress={progress}
              />
            )}

            {/* Hint de destino — só durante drag horizontal */}
            {mobile && swipeAlvo && swipeState !== 'idle' && (
              <SwipeHint
                T={T} dark={dark}
                etapa={swipeAlvo}
                direction={swipeDirection}
                progress={swipeProgress}
                ok={swipeOk}
              />
            )}

            {/* Container translatado — 1:1 com o dedo */}
            <div style={{
              transform: swipeX ? `translate3d(${swipeX}px, 0, 0)` : undefined,
              transition: swipeState === 'animating'
                ? `transform ${SWIPE_DURATION}ms ${APPLE_EASING}`
                : 'none',
              willChange: swipeState !== 'idle' ? 'transform' : undefined,
            }}>
              {aba === 'etapa'     && <EtapaTab {...tabProps} />}
              {aba === 'relatorio' && <RelatorioTab {...tabProps} />}
              {aba === 'pagamento' && <PagamentoTab {...tabProps} />}
            </div>
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

// Indicador na borda mostrando pra qual etapa o swipe vai levar.
// Aparece grudado na borda oposta ao movimento (igual iOS back gesture).
function SwipeHint({ T, dark, etapa, direction, progress, ok }) {
  const cor = corEtapa(ok ? (etapa.cor || 'blue') : 'red', dark)
  const isPrev = direction === 'prev'
  // Opacidade segue progresso (até 1 no threshold de commit)
  const opacity = Math.min(1, 0.3 + progress * 0.7)
  // Escala/translateX dá feedback de "tá quase comitando"
  const scale = 0.92 + progress * 0.08

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', top: 0, bottom: 0,
        [isPrev ? 'left' : 'right']: 0,
        width: 110,
        display: 'flex', alignItems: 'center',
        justifyContent: isPrev ? 'flex-start' : 'flex-end',
        padding: isPrev ? '0 0 0 14px' : '0 14px 0 0',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        opacity,
        transform: `scale(${scale})`,
        transition: 'opacity .08s linear, transform .08s linear',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 22,
          background: ok ? cor + '22' : 'rgba(200,80,80,0.18)',
          border: `1.5px solid ${cor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 4px 12px ${cor}33`,
        }}>
          <i
            className={`ti ${ok ? (isPrev ? 'ti-arrow-left' : 'ti-arrow-right') : 'ti-ban'}`}
            style={{ fontSize: 22, color: cor }}
          />
        </div>
        <span style={{
          fontSize: 11.5, fontWeight: 700, color: cor,
          textTransform: 'uppercase', letterSpacing: '.04em',
          textShadow: dark ? '0 1px 2px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.8)',
          maxWidth: 100, textAlign: 'center', lineHeight: 1.2,
        }}>
          {ok ? etapa.curto || etapa.label : 'Bloqueado'}
        </span>
      </div>
    </div>
  )
}
