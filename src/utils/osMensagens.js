// src/utils/osMensagens.js
// Geração de mensagens pro WhatsApp do cliente a partir dos dados da OS.
// Texto corrido no estilo do gerador manual (FERRAMENTAS/gerador_idemaq_v4.html).

function primeiroNome(nome) {
  return (nome || '').trim().split(/\s+/)[0] || ''
}

function saudacaoAgora() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function minuscInicial(s) {
  const t = (s || '').trim()
  return t ? t.charAt(0).toLowerCase() + t.slice(1) : ''
}

// Valor sem ",00" quando inteiro (igual o gerador, que mostra "R$ 280").
function fmtValorMsg(v) {
  const n = Number(v) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

// Junta nomes numa lista natural: "a, b e c".
function listaNatural(itens) {
  const arr = (itens || []).filter(Boolean)
  if (arr.length === 0) return ''
  if (arr.length === 1) return arr[0]
  return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1]
}

// ─── Orçamento de conserto (etapa Orçamento normal) ───────────────────────────
// "{saudação}, {nome}! a máquina está com {defeito}. A troca de {peças} com mão
//  de obra fica em R$ {total} no total. Posso seguir com o conserto?"
export function montarMensagemOrcamento({ os, porTipo, total }) {
  if (!(total > 0)) return null  // sem orçamento fechado, nada pra enviar

  const nome = primeiroNome(os?.cliente)
  const saud = saudacaoAgora()
  const abertura = nome ? `${saud}, ${nome}! ` : `${saud}! `

  // Diagnóstico: causa do técnico > relato do cliente.
  const diag = minuscInicial(os?.pre_diagnostico?.causa_diagnostico || os?.defeito || '')
  const fraseDiag = diag ? `a máquina está com ${diag}. ` : ''

  // Peças trocadas → lista natural ("rolamento e eletrobomba").
  const pecas = (porTipo?.peca || []).map(p => (p?.nome || '').trim()).filter(Boolean)
  const fraseValor = pecas.length > 0
    ? `A troca de ${listaNatural(pecas)} com mão de obra fica em R$ ${fmtValorMsg(total)} no total. `
    : `O serviço fica em R$ ${fmtValorMsg(total)} no total. `

  return `${abertura}${fraseDiag}${fraseValor}Posso seguir com o conserto?`
}

// ─── Orçamento de higienização (etapa Orçamento da máquina de higienização) ───
// "{saudação}, {nome}! A higienização completa da sua máquina fica em R$ {total}.
//  Inclui limpeza de toda a máquina por dentro, eliminação de resíduo de sabão,
//  amaciante e bactérias, e polimento pra proteção. Posso confirmar o serviço?"
export function montarMensagemHigienizacao({ os, total }) {
  if (!(total > 0)) return null

  const nome = primeiroNome(os?.cliente)
  const saud = saudacaoAgora()
  const abertura = nome ? `${saud}, ${nome}! ` : `${saud}! `

  return `${abertura}A higienização completa da sua máquina fica em R$ ${fmtValorMsg(total)}. ` +
    `Inclui limpeza de toda a máquina por dentro, eliminação de resíduo de sabão, ` +
    `amaciante e bactérias, e polimento pra proteção. Posso confirmar o serviço?`
}

// Abre o WhatsApp do cliente com a mensagem pré-preenchida. Mesma lógica de
// número do Header (prefixa 55 se não tiver). Retorna false se não há telefone.
export function abrirWhatsAppComTexto(fone, texto) {
  const digits = (fone || '').replace(/\D/g, '')
  if (!digits) return false
  const numero = digits.startsWith('55') ? digits : '55' + digits
  window.location.href = `whatsapp://send?phone=${numero}&text=${encodeURIComponent(texto)}`
  return true
}
