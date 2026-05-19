// src/contexts/RefreshContext.jsx
// Permite que a página ativa registre seu refetch e o PullToRefresh global
// (em App.jsx no mobile) dispare a função certa quando o usuário puxa pra
// atualizar. Cada página que tem hook com refetch chama useRegisterRouteRefresh
// no mount — o último a registrar ganha (e a página é uma só por vez na rota).

import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react'

const RefreshContext = createContext({
  register: () => () => {},
  refresh: () => Promise.resolve(),
})

export function RefreshProvider({ children }) {
  const fnRef = useRef(null)

  const register = useCallback((fn) => {
    fnRef.current = fn
    return () => {
      if (fnRef.current === fn) fnRef.current = null
    }
  }, [])

  const refresh = useCallback(() => {
    const fn = fnRef.current
    if (!fn) return Promise.resolve()
    try {
      return Promise.resolve(fn())
    } catch {
      return Promise.resolve()
    }
  }, [])

  return (
    <RefreshContext.Provider value={{ register, refresh }}>
      {children}
    </RefreshContext.Provider>
  )
}

// Hook pra páginas: registra o refetch enquanto montada.
export function useRegisterRouteRefresh(fn) {
  const { register } = useContext(RefreshContext)
  useEffect(() => {
    if (typeof fn !== 'function') return
    return register(fn)
  }, [fn, register])
}

// Hook pro PullToRefresh: invoca o refetch da página ativa.
export function useRouteRefresh() {
  return useContext(RefreshContext).refresh
}
