// src/utils/pontuacao.js
// Sistema de pontuação por desempenho (base do prêmio) — 06/07/2026.
//
// Pesos calibrados por tempo médio × dificuldade (definidos com o Toni):
//   pontos = (minutos ÷ 5) × fator_dificuldade, arredondado
//   fatores: limpeza 1.5 · coleta/entrega 1.3 · diagnóstico/desm/manut/mont 1.0
//            · teste/acabamento 0.7 · lava_seca = tudo +0.3
//
// Cada serviço só pontua quando o BLOCO está completo E tem carimbo de autor
// (checks anteriores a 06/07/2026 não têm autor — não pontuam, naturalmente).
// Desmontagem/Montagem contam 1x por OS (compartilhadas entre Limpeza e
// Manutenção — ver AcaoOficinaHIG.jsx).

export const PONTOS = {
  coleta: 5,
  diagnostico: 4,
  desmontagem: 4,
  limpeza: 18,
  manutencao: 3, // por peça/componente
  montagem: 4,
  teste_final: 1,
  acabamento: 2,
  entrega: 5,
}

export const PONTOS_LAVA_SECA = {
  coleta: 6,
  diagnostico: 5,
  desmontagem: 5,
  limpeza: 22,
  manutencao: 4,
  montagem: 5,
  teste_final: 2,
  acabamento: 3,
  entrega: 6,
}

export const LABEL_SERVICO = {
  coleta: 'Coleta',
  diagnostico: 'Diagnóstico',
  desmontagem: 'Desmontagem',
  limpeza: 'Limpeza',
  manutencao: 'Manutenção',
  montagem: 'Montagem',
  teste_final: 'Teste final',
  acabamento: 'Acabamento',
  entrega: 'Entrega',
}

function isCarimbo(v) {
  return !!v && typeof v === 'object' && !!v.apelido
}

function ultimoCarimbo(lista) {
  return lista
    .filter(isCarimbo)
    .sort((a, b) => new Date(b.em || 0) - new Date(a.em || 0))[0] || null
}

/**
 * Calcula os pontos de UMA OS, devolvendo uma entrada por bloco de serviço
 * completo e carimbado. Cada entrada: { servico, label, pontos, funcionario_id,
 * apelido, em, os_id, os_numero }.
 */
export function calcularPontosOS(os) {
  const tab = os.tipoEquipamento === 'lava_seca' ? PONTOS_LAVA_SECA : PONTOS
  const pd = os.pre_diagnostico || {}
  const entries = []

  function push(servico, carimbo) {
    if (!isCarimbo(carimbo)) return
    entries.push({
      os_id: os.id,
      os_numero: os.numero,
      servico,
      label: LABEL_SERVICO[servico],
      pontos: tab[servico],
      funcionario_id: carimbo.uid || null,
      apelido: carimbo.apelido,
      em: carimbo.em || null,
    })
  }

  // ── Coleta ──────────────────────────────────────────────────────────────
  push('coleta', pd.coleta_confirmada)

  // ── Diagnóstico — bloco completo: testes avaliados + ≥1 componente ───────
  const testesRecebido = pd.checklist?.recebido?.itens || []
  const testesFeitos = testesRecebido.length > 0 && testesRecebido.every(i => i.valor != null)
  const componentesAutores = pd.componentes_autores || {}
  const temComponente = Object.values(pd.componentes_marcados || {})
    .some(g => Object.keys(g || {}).length > 0)
  if (testesFeitos && temComponente) {
    const autor = ultimoCarimbo([
      ...testesRecebido.map(i => i.autor),
      ...Object.values(componentesAutores),
    ])
    push('diagnostico', autor)
  }

  // ── Conserto ───────────────────────────────────────────────────────────
  const exec = pd.oficina?.execucao || {}
  push('desmontagem', exec.desmontagem)
  push('montagem', exec.montagem)
  if (pd.oficina?.tem_limpeza) push('limpeza', exec.limpeza_serv)
  // Manutenção: cada chave de manut_serv com carimbo válido = 1 peça/serviço
  for (const val of Object.values(exec.manut_serv || {})) {
    push('manutencao', val)
  }

  // ── Teste final ────────────────────────────────────────────────────────
  const itensTeste = pd.checklist?.teste_final?.itens || []
  const testesFinal = itensTeste.filter(i => i.id?.startsWith('teste:'))
  const acabItens = itensTeste.filter(i => i.id?.startsWith('acab:'))
  if (testesFinal.length > 0 && testesFinal.every(i => i.valor != null)) {
    push('teste_final', ultimoCarimbo(testesFinal.map(i => i.autor)))
  }
  if (acabItens.length > 0 && acabItens.every(i => i.checked)) {
    push('acabamento', ultimoCarimbo(acabItens.map(i => i.autor)))
  }

  // ── Entrega ────────────────────────────────────────────────────────────
  push('entrega', pd.entrega?.realizada_por)

  return entries
}
