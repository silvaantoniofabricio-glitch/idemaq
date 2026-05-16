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

export function responsavelAtual(os) {
  if (os.historico && os.historico.length > 0) {
    return os.historico[os.historico.length - 1].funcionario
  }
  return null
}

// Status de prazo: 'ok' | 'vencido' | 'hoje' | 'amanha'
export function calcStatusPrazo(prazoIso, etapaId) {
  if (etapaId === 'concluido' || etapaId === 'recusado') return 'ok'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const prazo = new Date(prazoIso); prazo.setHours(0, 0, 0, 0)
  const diff = Math.round((prazo - hoje) / 86400000)
  if (diff < 0)   return 'vencido'
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanha'
  return 'ok'
}

export function diasPrazo(prazoIso) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const prazo = new Date(prazoIso); prazo.setHours(0, 0, 0, 0)
  return Math.round((prazo - hoje) / 86400000)
}

// Regras de movimentação de etapa — drag-and-drop ou botões manuais
// Retorna { ok: bool, motivo?: string, alvo?: string } — alvo pode redirecionar
export function podeMoverOS(os, etapaAlvo) {
  if (os.etapa === etapaAlvo) return { ok: false, motivo: 'OS já está nesta etapa' }
  if (os.etapa === 'concluido') return { ok: false, motivo: 'OS concluída não pode ser movida — reabra se necessário' }
  if (os.etapa === 'recusado' && etapaAlvo !== 'diagnostico') {
    return { ok: false, motivo: 'De Recusado só é possível voltar para Diagnóstico ou converter em Fabricação' }
  }

  const config = TIPOS_OS[os.tipo]
  const idxAtual = config.etapas.findIndex(e => e.id === os.etapa)
  const idxAlvo  = config.etapas.findIndex(e => e.id === etapaAlvo)
  if (idxAlvo === -1) return { ok: false, motivo: `Etapa "${etapaAlvo}" não existe no fluxo de ${config.label}` }

  if (Math.abs(idxAlvo - idxAtual) > 1) {
    return { ok: false, motivo: 'Não é possível pular etapas. Avance ou volte uma de cada vez.' }
  }

  if (etapaAlvo === 'teste_final' && os.etapa === 'oficina') {
    if (os.limpeza !== 'concluido' || os.manutencao !== 'concluido') {
      return { ok: false, motivo: 'Limpeza e manutenção precisam estar concluídas antes do teste final' }
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
      return arr.sort((a, b) => (b.horasNaEtapa || 0) - (a.horasNaEtapa || 0) || new Date(a.prazo) - new Date(b.prazo))
    case 'oficina':
    case 'teste_final':
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

// OS concluída no MÊS DO CALENDÁRIO atual (não 30 dias corridos)
export function dentroMesCorrente(os) {
  if (os.etapa !== 'concluido') return true
  const reg = (os.historico || []).find(h => h.etapa === 'concluido')
  if (!reg) return true
  const d = new Date(reg.data)
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

// Identifica papel do usuário pelo email
export function getRole(user) {
  const e = (user?.email || '').toLowerCase()
  if (e === 'empresaidemaq@gmail.com') return 'dono'
  if (e === 'func1@idemaq.com') return 'func1'
  if (e === 'func2@idemaq.com') return 'func2'
  return 'dono' // fallback durante desenvolvimento
}
export function isAdmin(user) { return getRole(user) === 'dono' }
