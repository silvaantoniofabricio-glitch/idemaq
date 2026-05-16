import { useState, useEffect } from 'react'
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

  useEffect(() => {
    supabase
      .from('usuarios')
      .select('id, nome, apelido, papel')
      .is('deleted_at', null)
      .order('apelido')
      .then(({ data, error }) => {
        if (!error && data) {
          setUsuarios(
            data.map(u => ({
              id:      u.id,
              nome:    u.nome,
              apelido: u.apelido,
              papel:   u.papel,
              cor:     COR_PAPEL[u.papel] || '#5B9BD5',
            }))
          )
        }
        setLoading(false)
      })
  }, [])

  return { usuarios, loading }
}
