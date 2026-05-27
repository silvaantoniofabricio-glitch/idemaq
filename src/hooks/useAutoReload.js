// src/hooks/useAutoReload.js
// Polling de versão — detecta quando o Vercel publicou um novo bundle e
// avisa o usuário pra atualizar (ou auto-reload).
//
// Funcionamento:
// 1. Ao montar, lê o hash do bundle atual do <script src="/assets/index-XXX.js">
// 2. A cada N segundos (default 60s) faz fetch('/') e extrai o hash atual
// 3. Se diferente, expõe `hasUpdate=true`
// 4. Também checa ao voltar de background (window focus)
//
// Não precisa de service worker — vanilla fetch + setInterval.

import { useEffect, useState, useCallback } from 'react'

export function useAutoReload({ intervalMs = 60_000 } = {}) {
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    // Em dev mode (Vite HMR já faz hot-reload), não checa.
    if (import.meta.env.DEV) return

    // Pega o hash do bundle carregado no momento
    const scripts = document.querySelectorAll('script[src*="/assets/index-"]')
    let currentHash = null
    for (const s of scripts) {
      const m = s.src.match(/index-([^.]+)\.js/)
      if (m) { currentHash = m[1]; break }
    }
    if (!currentHash) return  // Nada pra comparar — ignora

    let cancelado = false

    const checar = async () => {
      if (cancelado) return
      try {
        // Cache-bust com timestamp pra evitar pegar versão cacheada do CDN
        const res = await fetch(`/?_v=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (!res.ok) return
        const html = await res.text()
        const m = html.match(/\/assets\/index-([^.]+)\.js/)
        const novoHash = m?.[1]
        if (novoHash && novoHash !== currentHash) {
          setHasUpdate(true)
        }
      } catch {
        // network error, sem net no momento — ignora silenciosamente
      }
    }

    // Primeira checagem depois de 30s (não imediatamente — usuário acabou de carregar)
    const timeoutId = setTimeout(checar, 30_000)
    const intervalId = setInterval(checar, intervalMs)

    // Quando o user volta a focar a aba (voltou de background), também checa
    const onFocus = () => checar()
    window.addEventListener('focus', onFocus)

    return () => {
      cancelado = true
      clearTimeout(timeoutId)
      clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [intervalMs])

  const reload = useCallback(() => {
    // Hard reload — força fetch do index.html novo (skipCache no Firefox/Safari)
    window.location.reload()
  }, [])

  return { hasUpdate, reload }
}
