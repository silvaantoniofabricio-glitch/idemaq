// Hook fake para desenvolvimento visual — sem Supabase.
// Para voltar ao real: apagar este arquivo e renomear useOS.real.js para useOS.js
import { useState } from 'react'
import { OS_MOCK } from '../_mocks/os'

export function useOS(_buscaAtiva) {
  const [osList, setOsList] = useState(OS_MOCK)
  return { osList, setOsList, loading: false, error: null, refetch: () => {} }
}

export function uiEtapaToDb(_tipo, etapa) { return etapa }
