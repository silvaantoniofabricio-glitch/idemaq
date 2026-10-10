// src/utils/pontuacao.js
// Sistema de pontuação por desempenho (base do prêmio) — 06/07/2026.
//
// Pesos calibrados por tempo médio × dificuldade (definidos com o Toni):
//   pontos = (minutos ÷ 5) × fator_dificuldade, arredondado
//   fatores: limpeza 1.5 · coleta/entrega 1.3 · diagnóstico/desm/manut/mont 1.0
//            · teste/acabamento 0.7 · lava_seca = tudo +0.3
//
// Rebalanceamento 09/07/2026: Higienização concentrava desempenho demais
// (uma única OS com higienização valia mais que Coleta+Diagnóstico+
// Desmontagem+Montagem+Entrega juntas) — analisado com dados reais de
// julho/2026, onde a diferença entre os 2 funcionários vinha quase toda
// (81%) dessa única etapa. Ajuste combinado com o Toni: limpeza -2,
// coleta +1, entrega +1 (mesma mudança nas 2 tabelas, normal e lava_seca).
//
// Cada serviço só pontua quando o BLOCO está completo E tem carimbo de autor
// (checks anteriores a 06/07/2026 não têm autor — não pontuam, naturalmente).
// Desmontagem/Montagem contam 1x por OS (compartilhadas entre Limpeza e
// Manutenção — ver AcaoOficinaHIG.jsx).

// Reajuste 08/10/2026, baseado numa pesquisa com os 2 funcionários (ordem do
// que "deveria valer mais" considerando gosto, tempo e dificuldade): Higienização
// 16→10, Desmontagem 4→6, Montagem 4→5, Acabamento 2→5, Diagnóstico 4→3,
// Teste final 1→2. Pontuação é calculada ao vivo, então vale pra todos os meses.
export const PONTOS = {
  coleta: 6,
  diagnostico: 3,
  desmontagem: 6,
  limpeza: 10,
  manutencao: 3, // por peça/componente
  montagem: 5,
  teste_final: 2,
  acabamento: 5,
  entrega: 6,
}

// Pesos da lava e seca ajustados manualmente pelo Toni em 08/07/2026
// (desmontagem/montagem valem bem mais que a lavadora normal — mecanismo
// extra de secagem torna essas duas etapas mais trabalhosas).
export const PONTOS_LAVA_SECA = {
  coleta: 6,
  diagnostico: 3,
  desmontagem: 12,
  limpeza: 20,
  manutencao: 3,
  montagem: 10,
  teste_final: 2,
  acabamento: 5,
  entrega: 6,
}

export const LABEL_SERVICO = {
  coleta: 'Coleta',
  diagnostico: 'Diagnóstico',
  desmontagem: 'Desmontagem',
  limpeza: 'Higienização',
  manutencao: 'Manutenção',
  montagem: 'Montagem',
  teste_final: 'Teste final',
  acabamento: 'Acabamento',
  entrega: 'Entrega',
  ajuste_gap: 'Ajuste · gap lançamento',
}

// Prêmio por NÍVEL ACUMULADO — definido com o Toni em 08/10/2026 (ideia de um
// funcionário). Os pontos NÃO zeram todo mês: somam desde o início (06/07/2026)
// e a cada 400 pontos a pessoa sobe 1 nível, que vale R$ 50 no dia do
// pagamento. Meta igual pros dois (não existe divisão de tarefa por papel).
// Substitui as metas mensais antigas (900/1050/1200 pts → R$100/150/200).
// R$ a pagar num período = (nível no fim - nível no início) × R$ 50.
export const PONTOS_POR_NIVEL = 400
export const PREMIO_POR_NIVEL = 50

export function calcularNivelAcumulado(totalAcumulado) {
  const pontos = Math.max(0, totalAcumulado || 0)
  const nivel = Math.floor(pontos / PONTOS_POR_NIVEL)
  const pontosNoNivel = pontos - nivel * PONTOS_POR_NIVEL
  const faltam = PONTOS_POR_NIVEL - pontosNoNivel
  const pct = Math.round((pontosNoNivel / PONTOS_POR_NIVEL) * 100)
  return { nivel, pontosNoNivel, faltam, pct, premioAcumulado: nivel * PREMIO_POR_NIVEL }
}

// Níveis ganhos num período: acumulado até o fim do período vs. o acumulado
// até o início (= acumulado do fim - pontos do próprio período).
export function niveisGanhosNoPeriodo(acumuladoAteFim, pontosDoPeriodo) {
  const ganhos = calcularNivelAcumulado(acumuladoAteFim).nivel
    - calcularNivelAcumulado((acumuladoAteFim || 0) - (pontosDoPeriodo || 0)).nivel
  return { niveis: ganhos, premio: ganhos * PREMIO_POR_NIVEL }
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
 * apelido, em, os_id, os_numero, tipo, garantia }. Pontos vêm pela metade se
 * `os.garantia`. `tipo` e `garantia` vão em cada entrada pra permitir quebrar
 * o placar por origem (atendimento normal/garantia/venda/fabricação).
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
      tipo: os.tipo || null,
      garantia: !!os.garantia,
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
  // Desmontagem/Montagem/Limpeza são checks de valor único salvos como
  // { feito: carimbo } (chaveId='feito' em AcaoOficinaHIG.toggleEm) — o
  // carimbo mora DENTRO da chave 'feito', não no objeto em si.
  const exec = pd.oficina?.execucao || {}
  push('desmontagem', exec.desmontagem?.feito)
  push('montagem', exec.montagem?.feito)
  if (pd.oficina?.tem_limpeza) push('limpeza', exec.limpeza_serv?.feito)
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
