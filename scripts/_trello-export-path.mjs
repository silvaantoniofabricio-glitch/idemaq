// Helper: retorna o path da pasta de export MAIS RECENTE do Trello.
// Procura por areadetrabalho95498714_<YYYYMMDD>_<HHMMSS>/ dentro de
// "Base de dados clientes Bling/" e devolve a com timestamp maior.

import { readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT_PAI = 'Base de dados clientes Bling'

export function exportMaisRecente() {
  const candidatos = readdirSync(ROOT_PAI)
    .filter(n => /^areadetrabalho\d+_\d{8}_\d{6}$/.test(n))
    .filter(n => {
      try { return statSync(resolve(ROOT_PAI, n)).isDirectory() } catch { return false }
    })
    .sort() // ordenacao lexicografica funciona porque timestamp tem padding fixo
  if (!candidatos.length) {
    throw new Error(`Nenhum export Trello encontrado em ${ROOT_PAI}`)
  }
  const escolhido = candidatos[candidatos.length - 1]
  return resolve(ROOT_PAI, escolhido)
}

export function boardsPath() {
  return resolve(exportMaisRecente(), 'boards')
}
