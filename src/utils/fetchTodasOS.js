// src/utils/fetchTodasOS.js
// Busca TODAS as OS não deletadas (só as colunas pedidas) paginando de verdade.
// O Supabase corta em 1000 linhas por request (Max Rows do painel) sem erro
// nenhum — sem paginar, a pontuação e os alertas ignoravam as OS que passavam
// do limite (ver feedback_postgrest_limite_1000_linhas). Ordem fixa por
// `numero` pra a paginação não repetir nem pular linhas entre páginas.
import { supabase } from '../supabase'

const TAMANHO_PAGINA = 1000
const MAX_PAGINAS = 30

export async function fetchTodasOS(colunas) {
  const todas = []
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const inicio = pagina * TAMANHO_PAGINA
    const { data, error } = await supabase
      .from('os')
      .select(colunas)
      .is('deleted_at', null)
      .order('numero', { ascending: true })
      .range(inicio, inicio + TAMANHO_PAGINA - 1)
    if (error) return { data: null, error }
    todas.push(...(data || []))
    if (!data || data.length < TAMANHO_PAGINA) break
  }
  return { data: todas, error: null }
}
