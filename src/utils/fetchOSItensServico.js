// src/utils/fetchOSItensServico.js
// Busca TODOS os os_item de serviço (categoria NULL ou 'servico', sem soft-delete)
// pra montar os conjuntos de OS com Higienização/Manutenção — usado em
// Vendas.jsx, Kanban.jsx e OSMobile.jsx (mesma query nos 3).
//
// Pagina de verdade em blocos de 1000: o projeto Supabase tem um teto de
// linhas por request (Max Rows, configurado no painel — geralmente 1000)
// que o servidor aplica mesmo pedindo um .range() maior. Sem paginar, os
// itens importados em massa do Bling/Trello (>1687 com categoria NULL)
// lotam a 1ª página sozinhos e os itens nativos de serviço nunca chegam
// na resposta.
import { supabase } from '../supabase'

const TAMANHO_PAGINA = 1000
const MAX_PAGINAS = 30 // trava de segurança — 30k itens é bem acima do que a tabela tem hoje

export async function fetchTodosOSItemServico() {
  const todos = []
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const inicio = pagina * TAMANHO_PAGINA
    const { data, error } = await supabase
      .from('os_item')
      .select('os_id, nome')
      .or('categoria.is.null,categoria.eq.servico')
      .is('deleted_at', null)
      .range(inicio, inicio + TAMANHO_PAGINA - 1)
    if (error || !data) return todos
    todos.push(...data)
    if (data.length < TAMANHO_PAGINA) break // última página
  }
  return todos
}
