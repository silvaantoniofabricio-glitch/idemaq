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

// Pesos da lava e seca ajustados manualmente pelo Toni em 08/07/2026
// (desmontagem/montagem valem bem mais que a lavadora normal — mecanismo
// extra de secagem torna essas duas etapas mais trabalhosas).
export const PONTOS_LAVA_SECA = {
  coleta: 5,
  diagnostico: 4,
  desmontagem: 7,
  limpeza: 22,
  manutencao: 4,
  montagem: 8,
  teste_final: 1,
  acabamento: 2,
  entrega: 5,
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
  ajuste_gap: 'Ajuste · gap lançamento',
}

// Metas de prêmio por desempenho — definidas com o Toni em 08/07/2026.
// Meta IGUAL pra todo mundo (não existe divisão de tarefa por papel — ver
// memória feedback_nao_ha_divisao_de_papel_por_tarefa — qualquer funcionário
// pode fazer qualquer etapa, então a meta individual é a mesma pros dois).
// Não cumulativo: paga o prêmio do MAIOR nível atingido, não a soma.
export const METAS = [
  { nivel: 1, label: 'Nível 1 · mês comum',     pontos: 900,  premio: 100 },
  { nivel: 2, label: 'Nível 2 · mês bom',       pontos: 1050, premio: 150 },
  { nivel: 3, label: 'Nível 3 · mês excelente', pontos: 1200, premio: 200 },
]

// Dado o total de pontos do mês de uma pessoa, calcula o nível atingido
// (maior nível cujo `pontos` foi alcançado), o próximo nível (pra mostrar
// "faltam X pontos"), e o % de progresso na faixa atual.
export function calcularNivelPremio(totalPontos) {
  const pontos = totalPontos || 0
  let nivelAtingido = null
  for (const m of METAS) {
    if (pontos >= m.pontos) nivelAtingido = m
  }
  const proximoNivel = METAS.find(m => m.pontos > pontos) || null
  const baseFaixa = nivelAtingido ? nivelAtingido.pontos : 0
  const topoFaixa = proximoNivel ? proximoNivel.pontos : (nivelAtingido?.pontos || METAS[0].pontos)
  const pct = proximoNivel
    ? Math.max(0, Math.min(100, Math.round(((pontos - baseFaixa) / (topoFaixa - baseFaixa)) * 100)))
    : 100
  const faltam = proximoNivel ? Math.max(0, proximoNivel.pontos - pontos) : 0
  return { nivelAtingido, proximoNivel, pct, faltam }
}

function isCarimbo(v) {
  return !!v && typeof v === 'object' && !!v.apelido
}

function ultimoCarimbo(lista) {
  return lista
    .filter(isCarimbo)
    .sort((a, b) => new Date(b.em || 0) - new Date(a.em || 0))[0] || null
}

// OS de garantia pontuam pela metade — é retrabalho decorrente de um
// problema (nem sempre culpa de quem conserta: pode ser peça com defeito de
// fábrica, desgaste natural, mau uso do cliente), então reconhece o trabalho
// real sem valer o mesmo que um serviço novo. Combinado com o Toni 08/07/2026.
export const FATOR_GARANTIA = 0.5

/**
 * Calcula os pontos de UMA OS, devolvendo uma entrada por bloco de serviço
 * completo e carimbado. Cada entrada: { servico, label, pontos, funcionario_id,
 * apelido, em, os_id, os_numero }. Pontos vêm pela metade se `os.garantia`.
 */
export function calcularPontosOS(os) {
  const tab = os.tipoEquipamento === 'lava_seca' ? PONTOS_LAVA_SECA : PONTOS
  const pd = os.pre_diagnostico || {}
  const entries = []
  const fator = os.garantia ? FATOR_GARANTIA : 1

  function push(servico, carimbo) {
    if (!isCarimbo(carimbo)) return
    entries.push({
      os_id: os.id,
      os_numero: os.numero,
      servico,
      label: LABEL_SERVICO[servico],
      pontos: tab[servico] * fator,
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
