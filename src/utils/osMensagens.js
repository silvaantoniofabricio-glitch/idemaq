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

// Item de higienização/limpeza (oferecido à parte como adicional).
function ehHigienizacao(it) {
  return /limpez|higien/i.test(it?.nome || '')
}

// ─── Mensagem da etapa Orçamento ──────────────────────────────────────────────
// Texto corrido estilo gerador, com oferta de higienização como adicional:
//
//  "{saud}, {nome}! a máquina está com {causa}. A troca do {peças} com mão de
//   obra fica em R$ {conserto}. Ela também está com sujeira na parte interna, se
//   quiser aproveitar que já está aqui pra fazer a higienização completa junto
//   com o serviço fica R$ {hig}. Posso já incluir a higienização ou prefere só
//   o conserto?"
//
// - O valor do conserto = total − higienização (a higienização é opcional).
// - Se não houver item de higienização: fecha com "Posso seguir com o conserto?".
// - Se a OS for só higienização (sem conserto): mensagem de higienização pura.
export function montarMensagemOrcamento({ os, porTipo, total }) {
  if (!(total > 0)) return null  // sem orçamento fechado, nada pra enviar

  const nome = primeiroNome(os?.cliente)
  const saud = saudacaoAgora()
  const abertura = nome ? `${saud}, ${nome}! ` : `${saud}! `

  const servicos = porTipo?.servico || []
  const pecas = (porTipo?.peca || []).map(p => (p?.nome || '').trim()).filter(Boolean)

  // Higienização é um serviço à parte; o conserto é todo o resto.
  const valorHig = servicos.filter(ehHigienizacao)
    .reduce((s, it) => s + (Number(it.qtd) || 0) * (Number(it.valor_unitario) || 0), 0)
  const valorConserto = Math.max(0, total - valorHig)

  // Caso 1: OS só de higienização (sem conserto).
  if (valorConserto <= 0 && valorHig > 0) {
    return `${abertura}a higienização completa da sua máquina fica em R$ ${fmtValorMsg(valorHig)}. ` +
      `Inclui limpeza de toda a máquina por dentro, eliminação de resíduo de sabão, ` +
      `amaciante e bactérias, e polimento pra proteção. Posso confirmar o serviço?`
  }

  // Caso 2: conserto (com ou sem oferta de higienização).
  const diag = minuscInicial(os?.pre_diagnostico?.causa_diagnostico || os?.defeito || '')
  const fraseDiag = diag ? `a máquina está com ${diag}. ` : ''

  const fraseValor = pecas.length > 0
    ? `A troca do ${listaNatural(pecas)} com mão de obra fica em R$ ${fmtValorMsg(valorConserto)}. `
    : `O serviço com mão de obra fica em R$ ${fmtValorMsg(valorConserto)}. `

  const fraseFecho = valorHig > 0
    ? `Ela também está com sujeira na parte interna, se quiser aproveitar que já está aqui pra fazer a higienização completa junto com o serviço fica R$ ${fmtValorMsg(valorHig)}. Posso já incluir a higienização ou prefere só o conserto?`
    : `Posso seguir com o conserto?`

  return `${abertura}${fraseDiag}${fraseValor}${fraseFecho}`
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
