// src/hooks/usePullToRefresh.js
// Pull-to-refresh nativo pra mobile. Detecta swipe pra baixo no topo do
// container scrollable e chama callback de refresh. Sem dependências.
//
// Uso:
//   const { ref, pullDistance, refreshing } = usePullToRefresh({ onRefresh })
//   <div ref={ref} style={{overflowY:'auto', ...}}>
//     <PullIndicator distance={pullDistance} refreshing={refreshing} />
//     ...conteudo...
//   </div>

import { useEffect, useRef, useState, useCallback } from 'react'

const THRESHOLD = 70   // px de pull pra disparar refresh
const MAX_PULL  = 100  // pull máximo (com damping)
const DAMPING   = 0.5  // resistência: 1 pull real = .5 visual

export function usePullToRefresh({ onRefresh, enabled = true } = {}) {
  const ref = useRef(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(null)
  const isPulling = useRef(false)

  const dispatch = useCallback(async () => {
    setRefreshing(true)
    try {
      await onRefresh?.()
    } finally {
      // Pequeno delay pra feedback visual nao sumir instantaneo
      setTimeout(() => {
        setRefreshing(false)
        setPullDistance(0)
      }, 300)
    }
  }, [onRefresh])

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    const onTouchStart = (e) => {
      // Só inicia se já está no topo do scroll
      if (el.scrollTop > 0) return
      touchStartY.current = e.touches[0].clientY
      isPulling.current = false
    }
    const onTouchMove = (e) => {
      if (touchStartY.current == null) return
      const dy = e.touches[0].clientY - touchStartY.current
      if (dy <= 0) {
        // Subindo, cancela
        if (isPulling.current) {
          setPullDistance(0)
          isPulling.current = false
        }
        return
      }
      // Se scroll já está > 0 (rolou pra baixo durante o gesto), cancela
      if (el.scrollTop > 0) {
        touchStartY.current = null
        if (isPulling.current) setPullDistance(0)
        isPulling.current = false
        return
      }
      isPulling.current = true
      // Damping pra dar sensação de "puxando"
      const damped = Math.min(MAX_PULL, dy * DAMPING)
      setPullDistance(damped)
      // Previne scroll nativo enquanto puxa
      if (e.cancelable && damped > 5) e.preventDefault()
    }
    const onTouchEnd = () => {
      if (!isPulling.current) {
        touchStartY.current = null
        return
      }
      isPulling.current = false
      touchStartY.current = null
      if (pullDistance >= THRESHOLD) {
        dispatch()
      } else {
        setPullDistance(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [enabled, pullDistance, dispatch])

  return {
    ref,
    pullDistance,
    refreshing,
    progress: Math.min(1, pullDistance / THRESHOLD),
  }
}
