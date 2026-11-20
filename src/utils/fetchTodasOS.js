// src/utils/fetchTodasOS.js
// Busca TODAS as OS não deletadas (só as colunas pedidas) paginando de verdade.
// O Supabase corta o número de linhas por request (Max Rows do painel) sem
// erro nenhum — sem paginar, a pontuação e os alertas ignoravam as OS que
// passavam do limite (ver feedback_postgrest_limite_1000_linhas).
//
// Avança o offset pelo que REALMENTE chegou (não por um tamanho fixo) e só
// para quando uma página vem vazia: se o servidor devolver páginas menores
// que o pedido (teto de Max Rows menor que 1000), nada é pulado nem a busca
// termina cedo. Ordem fixa por `numero` pra a paginação ser estável.
import { supabase } from '../supabase'

const TAMANHO_PAGINA = 1000
const MAX_PAGINAS = 100

export async function fetchTodasOS(colunas) {
  const todas = []
  let offset = 0
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const { data, error } = await supabase
      .from('os')
      .select(colunas)
      .is('deleted_at', null)
      .order('numero', { ascending: true })
      .range(offset, offset + TAMANHO_PAGINA - 1)
    if (error) return { data: null, error }
    if (!data || data.length === 0) break
    todas.push(...data)
    offset += data.length
  }
  return { data: todas, error: null }
}
