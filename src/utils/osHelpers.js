// idemaq-src/utils/osHelpers.js
// Regras de negócio e cálculos relacionados a OS.
// (sem JSX — pura lógica reusável entre Kanban, OSDetalhe, OSMobile etc.)

import { TIPOS_OS } from './osData'

export function totalAPagar(os) {
  return (os.valor || 0) - (os.desconto || 0)
}
export function estaPagaTotal(os) {
  if (os.pago === 'total') return true
  return ((os.valor_pago || 0) >= totalAPagar(os) && totalAPagar(os) > 0)
}
export function estaPagaParcial(os) {
  return os.pago === 'parcial' || ((os.valor_pago || 0) > 0 && (os.valor_pago || 0) < totalAPagar(os))
}

// Status do chip Limp./Manut. (card do Kanban — desktop e mobile) a partir dos
// checks reais do Conserto. NÃO exige a montagem: o chip reflete o SERVIÇO.
//   · Limpeza: verde quando "Limpeza feita"; amarelo se só desmontou; cinza se nada.
//   · Manutenção: verde quando TODOS os checks (peças + componentes) foram dados;
//     amarelo se parte foi feita (trocou 1, falta outra); cinza se nada.
//     A contagem vem de oficina.manut_total/manut_feitos (salvos no Conserto).
// Retorna vocabulário do SubStatus: 'concluido' | 'em_andamento' | 'aguardando'.
export function statusServicoSub(oficina, secao) {
  const ex = oficina?.execucao || {}
  const desm = !!ex.desmontagem?.feito

  if (secao === 'limpeza') {
    if (ex.limpeza_serv?.feito) return 'concluido'
    if (desm) return 'em_andamento'
    return 'aguardando'
  }

  // Manutenção — usa os contadores salvos pelo Conserto (peças + componentes).
  const total  = oficina?.manut_total
  const feitos = oficina?.manut_feitos
  if (typeof total === 'number') {
    if (total === 0) {
      // Manutenção de mão de obra: check único "Manutenção feita".
      if (ex.manut_serv?.feito) return 'concluido'
      return desm ? 'em_andamento' : 'aguardando'
    }
    if (feitos >= total) return 'concluido'   // todas as peças/serviços marcados
    if (feitos > 0 || desm) return 'em_andamento'
    return 'aguardando'
  }
  // Legado (OS salva antes dos contadores): NÃO usa a montagem (pode estar velha
  // se uma peça foi adicionada depois). Usa o status guardado, que foi calculado
  // com a lista de peças correta na época.
  const st = oficina?.manutencao_status
  if (st === 'concluido') return 'concluido'
  if (st === 'pendente')  return 'aguardando'
  if (st === 'andamento') return 'em_andamento'
  const algumManut = Object.values(ex.manut_serv || {}).some(Boolean)
  if (algumManut || desm) return 'em_andamento'
  return 'aguardando'
}

// Quais chips de serviço (Limp./Manut.) o card de Conserto deve mostrar.
// Fonte: DETECÇÃO REAL enriquecida no Kanban/OSMobile (os._temLimp = tem serviço
// de limpeza no orçamento; os._temManut = tem manutenção/peça) + sinais salvos no
// Conserto. Substitui o default antigo que mostrava AMBOS quando a OS ainda não
// tinha sido tocada no Conserto (mostrava "Limp." em OS sem limpeza).
export function secoesOficinaVisiveis(os) {
  const of = os?.pre_diagnostico?.oficina || {}
  const limp = !!os?._temLimp
  let manut = !!os?._temManut
    || of.tem_manutencao === true
    || (typeof of.manut_total === 'number' && of.manut_total > 0)
  if (!manut) {
    // Componente marcado como "manutenção" no diagnóstico (mão de obra sem peça).
    const marc = os?.pre_diagnostico?.componentes_marcados || {}
    for (const items of Object.values(marc)) {
      if (items && typeof items === 'object' && !Array.isArray(items)
          && Object.values(items).some(v => v === 'manutencao')) { manut = true; break }
    }
  }
  return { limp, manut }
}

export function responsavelAtual(os) {
  if (os.historico && os.historico.length > 0) {
    return os.historico[os.historico.length - 1].funcionario
  }
  return null
}

// Status de prazo: 'ok' | 'vencido' | 'hoje' | 'amanha'
export function calcStatusPrazo(prazoIso, etapaId) {
  if (etapaId === 'concluido' || etapaId === 'recusado') return 'ok'
  if (!prazoIso) return 'ok'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const prazo = new Date(prazoIso); prazo.setHours(0, 0, 0, 0)
  const diff = Math.round((prazo - hoje) / 86400000)
  if (diff < 0)   return 'vencido'
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanha'
  return 'ok'
}

export function diasPrazo(prazoIso) {
  if (!prazoIso) return null
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const prazo = new Date(prazoIso); prazo.setHours(0, 0, 0, 0)
  return Math.round((prazo - hoje) / 86400000)
}

// Regras de movimentação de etapa — drag-and-drop ou botões manuais
// Retorna { ok: bool, motivo?: string, alvo?: string } — alvo pode redirecionar
export function podeMoverOS(os, etapaAlvo, opts = {}) {
  const { pularEtapas = false } = opts
  if (os.etapa === etapaAlvo) return { ok: false, motivo: 'OS já está nesta etapa' }
  if (os.etapa === 'concluido') {
    const config = TIPOS_OS[os.tipo]
    const idxAtual = config.etapas.findIndex(e => e.id === os.etapa)
    const idxAlvo  = config.etapas.findIndex(e => e.id === etapaAlvo)
    if (!pularEtapas && idxAlvo !== idxAtual - 1) {
      return { ok: false, motivo: 'De Concluído só é possível voltar uma etapa' }
    }
    return { ok: true }
  }
  if (os.etapa === 'recusado' && !['diagnostico', 'entrega', 'orcamento'].includes(etapaAlvo)) {
    return { ok: false, motivo: 'De Recusado só é possível Reabrir orçamento, Devolver (Entrega) ou voltar pro Diagnóstico' }
  }

  // recusado é etapa lateral — pode vir de qualquer etapa
  if (etapaAlvo === 'recusado') return { ok: true }

  const config = TIPOS_OS[os.tipo]
  const idxAtual = config.etapas.findIndex(e => e.id === os.etapa)
  const idxAlvo  = config.etapas.findIndex(e => e.id === etapaAlvo)
  if (idxAlvo === -1) return { ok: false, motivo: `Etapa "${etapaAlvo}" não existe no fluxo de ${config.label}` }

  if (!pularEtapas && Math.abs(idxAlvo - idxAtual) > 1) {
    return { ok: false, motivo: 'Não é possível pular etapas. Avance ou volte uma de cada vez.' }
  }

  if (etapaAlvo === 'teste_final' && os.etapa === 'oficina') {
    // Lê status de pre_diagnostico.oficina (as colunas top-level os.limpeza/os.manutencao
    // nunca foram criadas no banco). Se nenhum status foi gravado ainda, bloqueia.
    const oficina = os.pre_diagnostico?.oficina || {}
    const limpStatus  = oficina.limpeza_status
    const manutStatus = oficina.manutencao_status
    // Pelo menos um dos lados deve estar presente; os que estão presentes devem ser 'concluido'
    const algumPresente = limpStatus || manutStatus
    const limpOk  = !limpStatus  || limpStatus  === 'concluido'
    const manutOk = !manutStatus || manutStatus === 'concluido'
    if (!algumPresente || !limpOk || !manutOk) {
      return { ok: false, motivo: 'Conclua o conserto antes de ir pro Teste final' }
    }
  }

  if (etapaAlvo === 'pagamento' && estaPagaTotal(os)) {
    return { ok: true, alvo: 'concluido', motivo: 'OS já está paga — indo direto para Concluído' }
  }

  if (etapaAlvo === 'concluido') {
    const veioDePagamento = os.etapa === 'pagamento'
    const veioDeEntregaPaga = (os.etapa === 'entrega' || os.etapa === 'entregue') && estaPagaTotal(os)
    const veioDeTesteFinalFab = os.tipo === 'fabricacao' && os.etapa === 'teste_final'
    if (!veioDePagamento && !veioDeEntregaPaga && !veioDeTesteFinalFab) {
      return { ok: false, motivo: 'Só é possível concluir uma OS paga + entregue (ou após Teste final no caso de Fabricação)' }
    }
  }

  return { ok: true }
}

// Ordenação por coluna conforme regras
export function ordenarColuna(etapaId, lista) {
  const arr = [...lista]
  switch (etapaId) {
    case 'ag_agendamento':
      return arr.sort((a, b) => new Date(a.abertura) - new Date(b.abertura))
    case 'agendado':
    case 'agendamento':
      return arr.sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    case 'recebido':
    case 'diagnostico':
    case 'orcamento':
    case 'oficina':
    case 'teste_final':
      // Mais dias aberto aparece primeiro: base = entrada em 'recebido' ou abertura
      return arr.sort((a, b) => {
        const baseA = (a.historico || []).find(h => h.etapa === 'recebido')?.data || a.abertura
        const baseB = (b.historico || []).find(h => h.etapa === 'recebido')?.data || b.abertura
        return new Date(baseA) - new Date(baseB)
      })
    case 'entrega':
    case 'entregue':
      return arr.sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
    case 'pagamento':
      return arr.sort((a, b) => {
        const dataA = (a.historico || []).find(h => h.etapa === 'entrega' || h.etapa === 'entregue')?.data || a.abertura
        const dataB = (b.historico || []).find(h => h.etapa === 'entrega' || h.etapa === 'entregue')?.data || b.abertura
        return new Date(dataB) - new Date(dataA)
      })
    case 'concluido':
      return arr.sort((a, b) => {
        const dataA = (a.historico || []).find(h => h.etapa === 'concluido')?.data || a.abertura
        const dataB = (b.historico || []).find(h => h.etapa === 'concluido')?.data || b.abertura
        return new Date(dataB) - new Date(dataA)
      })
    default:
      return arr
  }
}

// OS concluída no MÊS DO CALENDÁRIO atual (não 30 dias corridos).
// Prefere os.data_conclusao (sempre atualizado quando a OS é concluida).
// Fallback: ULTIMA transicao pra concluido no historico (OS pode ter sido
// concluida/revertida varias vezes — a 1a entrada pode ser de mes antigo).
export function dentroMesCorrente(os) {
  if (os.etapa !== 'concluido') return true
  let dataRef = os.data_conclusao
  if (!dataRef) {
    const hist = os.historico || []
    for (let i = hist.length - 1; i >= 0; i--) {
      if (hist[i].etapa === 'concluido') { dataRef = hist[i].data; break }
    }
  }
  if (!dataRef) return true
  const d = new Date(dataRef)
  const hoje = new Date()
  return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth()
}

// Garantia válida — 90 dias após entrega da OS origem
export function dentroGarantia(osOrigem) {
  if (!osOrigem) return false
  const dias = osOrigem.garantia_dias || 90
  const reg = (osOrigem.historico || []).find(h => h.etapa === 'entrega' || h.etapa === 'entregue')
  if (!reg) return false
  const entregaData = new Date(reg.data)
  const limite = new Date(entregaData.getTime() + dias * 86400000)
  return new Date() <= limite
}

// Identifica papel do usuário.
// Fonte primária: `user.papel` enriquecido em App.jsx (lê da tabela `usuarios`
// pelo email autenticado). Retorna o id usado pelo resto do app: `dono`, `func1`,
// `func2`. Antes era 100% hardcoded por email — quando trocavam o email no Auth,
// o usuário caía no fallback "dono" silencioso e ganhava admin total. Corrigido
// em 21/05/2026.
export function getRole(user) {
  // Mapeamento papel-da-tabela → id usado pelo app
  const papel = user?.papel
  if (papel === 'dono')      return 'dono'
  if (papel === 'logistica') return 'func1'   // Alessandro
  if (papel === 'oficina')   return 'func2'   // Guilherme

  // Fallback por email — só pra retrocompat com emails antigos.
  // Sem cair em "dono" no default: ausência de match = sem permissão (defensivo).
  const e = (user?.email || '').toLowerCase()
  if (e === 'empresaidemaq@gmail.com') return 'dono'
  if (e === 'func1@idemaq.com') return 'func1'
  if (e === 'func2@idemaq.com') return 'func2'
  return null
}
export function isAdmin(user) { return getRole(user) === 'dono' }
