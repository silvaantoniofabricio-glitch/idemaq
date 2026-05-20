import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabase'

// Cor por papel — alinhada com a paleta Deutan do projeto
const COR_PAPEL = {
  dono:      '#5B9BD5',
  logistica: '#FFD966',
  oficina:   '#B8CCE4',
}

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Tabela `usuarios` NÃO tem coluna `deleted_at` (não usa soft-delete).
    // Usa `ativo` como equivalente. Confirmado via probe-usuarios.mjs em 20/05.
    supabase
      .from('usuarios')
      .select('id, email, apelido, papel')
      .eq('ativo', true)
      .order('apelido')
      .then(({ data, error: err }) => {
        if (err) {
          setError(err)
        } else if (data) {
          setUsuarios(
            data.map(u => ({
              id:      u.id,
              nome:    u.apelido,        // tabela não tem campo "nome" — usa apelido
              email:   u.email,
              apelido: u.apelido,
              papel:   u.papel,
              cor:     COR_PAPEL[u.papel] || '#5B9BD5',
            }))
          )
        }
        setLoading(false)
      })
  }, [])

  // Helpers — substituem a constante FUNCIONARIOS do mock em `utils/osData.js`.
  // Memoizados pra não recriar a cada render do consumidor.
  const helpers = useMemo(() => ({
    funcPorId: (id) => usuarios.find(u => u.id === id) || null,
    apelidoDe: (id) => usuarios.find(u => u.id === id)?.apelido || 'desconhecido',
    papelDe:   (id) => usuarios.find(u => u.id === id)?.papel || null,
    porPapel:  (papel) => usuarios.filter(u => u.papel === papel),
    dono:      () => usuarios.find(u => u.papel === 'dono') || null,
  }), [usuarios])

  return { usuarios, loading, error, ...helpers }
}
