// src/utils/osOrcamentoPdf.js
// Gera um PDF do orçamento sem lib nenhuma: abre uma aba com HTML simples e
// dispara window.print() — o usuário escolhe "Salvar como PDF" no diálogo
// nativo do navegador (funciona igual em desktop e celular).

const LABEL_TIPO = { servico: 'Serviços', peca: 'Peças', desloc: 'Deslocamento' }

function fmtBRL(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

/**
 * @param {object} os - dados da OS (numero, cliente, fone, endereco, marca, modelo, defeito)
 * @param {object} porTipo - { servico: [], peca: [], desloc: [] }
 * @param {number} descontoRS
 * @param {number} total
 */
export function gerarPdfOrcamento({ os, porTipo, descontoRS, total }) {
  const grupos = ['servico', 'peca', 'desloc']
    .map(tipo => ({ tipo, itens: porTipo?.[tipo] || [] }))
    .filter(g => g.itens.length > 0)

  if (grupos.length === 0) return { ok: false, motivo: 'Orçamento sem itens lançados ainda.' }

  const dataStr = new Date().toLocaleDateString('pt-BR')
  const equip = [os?.marca, os?.modelo].filter(Boolean).join(' ') || os?.equipamento || ''
  const subtotalBruto = grupos.reduce((s, g) =>
    s + g.itens.reduce((si, it) => si + (Number(it.qtd) || 0) * (Number(it.valor_unitario) || 0), 0), 0)

  const linhasGrupos = grupos.map(g => `
    <tr><td colspan="3" class="grupo">${LABEL_TIPO[g.tipo] || g.tipo}</td></tr>
    ${g.itens.map(it => {
      const qtd = Number(it.qtd) || 0
      const unit = Number(it.valor_unitario) || 0
      return `<tr>
        <td>${escapeHtml(it.nome)}</td>
        <td class="num">${qtd} × ${fmtBRL(unit)}</td>
        <td class="num">${fmtBRL(qtd * unit)}</td>
      </tr>`
    }).join('')}
  `).join('')

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Orçamento OS #${os?.numero || ''}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 32px; max-width: 640px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
  .info { margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
  .info b { color: #333; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 6px 4px; border-bottom: 1px solid #eee; }
  td.grupo { font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; color: #5B9BD5; border-bottom: 2px solid #5B9BD5; padding-top: 14px; }
  td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totais { margin-top: 16px; font-size: 13px; }
  .totais .linha { display: flex; justify-content: space-between; padding: 3px 0; }
  .totais .final { font-size: 17px; font-weight: 700; border-top: 2px solid #1a1a1a; margin-top: 6px; padding-top: 8px; }
  .rodape { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>Orçamento — OS #${os?.numero || ''}</h1>
  <div class="sub">${dataStr}</div>
  <div class="info">
    <div><b>Cliente:</b> ${escapeHtml(os?.cliente || '—')}</div>
    ${os?.fone ? `<div><b>Telefone:</b> ${escapeHtml(os.fone)}</div>` : ''}
    ${equip ? `<div><b>Equipamento:</b> ${escapeHtml(equip)}</div>` : ''}
    ${os?.defeito ? `<div><b>Defeito relatado:</b> ${escapeHtml(os.defeito)}</div>` : ''}
  </div>
  <table>${linhasGrupos}</table>
  <div class="totais">
    ${descontoRS > 0 ? `
      <div class="linha"><span>Subtotal</span><span>${fmtBRL(subtotalBruto)}</span></div>
      <div class="linha"><span>Desconto</span><span>− ${fmtBRL(descontoRS)}</span></div>
    ` : ''}
    <div class="linha final"><span>Total</span><span>${fmtBRL(total)}</span></div>
  </div>
  <div class="rodape">IdeMaq Assistência Técnica — Naviraí/MS</div>
</body></html>`

  return abrirEImprimir(html)
}

// Abre a aba nova com o HTML e dispara o print — compartilhado pelos dois
// documentos (orçamento e recibo).
function abrirEImprimir(html) {
  const win = window.open('', '_blank')
  if (!win) return { ok: false, motivo: 'O navegador bloqueou a nova aba — permita pop-ups pra este site.' }
  win.document.write(html)
  win.document.close()
  win.focus()
  // Pequeno delay pra garantir que o layout renderizou antes do print.
  setTimeout(() => win.print(), 250)
  return { ok: true }
}

const LABEL_FORMA = {
  pix: 'PIX', dinheiro: 'Dinheiro',
  credito_1x: 'Cartão de crédito', credito_parcelado: 'Cartão de crédito (parcelado)',
  debito: 'Cartão de débito', boleto: 'Boleto',
  link_pagamento: 'Link de pagamento', a_prazo: 'A prazo',
}

/**
 * Recibo do que já foi pago na OS. Mostra os itens (referência do que foi
 * cobrado) + o valor efetivamente recebido, forma de pagamento e status.
 *
 * @param {object} os - inclui valor_pago, pago ('nao'|'parcial'|'total'), forma_pagamento
 * @param {object} porTipo
 * @param {number} descontoRS
 * @param {number} total
 */
export function gerarPdfRecibo({ os, porTipo, descontoRS, total }) {
  const valorPago = Number(os?.valor_pago) || 0
  if (valorPago <= 0) return { ok: false, motivo: 'Nenhum pagamento registrado nesta OS ainda.' }

  const grupos = ['servico', 'peca', 'desloc']
    .map(tipo => ({ tipo, itens: porTipo?.[tipo] || [] }))
    .filter(g => g.itens.length > 0)

  const dataStr = new Date().toLocaleDateString('pt-BR')
  const equip = [os?.marca, os?.modelo].filter(Boolean).join(' ') || os?.equipamento || ''
  const subtotalBruto = grupos.reduce((s, g) =>
    s + g.itens.reduce((si, it) => si + (Number(it.qtd) || 0) * (Number(it.valor_unitario) || 0), 0), 0)

  const linhasGrupos = grupos.map(g => `
    <tr><td colspan="3" class="grupo">${LABEL_TIPO[g.tipo] || g.tipo}</td></tr>
    ${g.itens.map(it => {
      const qtd = Number(it.qtd) || 0
      const unit = Number(it.valor_unitario) || 0
      return `<tr>
        <td>${escapeHtml(it.nome)}</td>
        <td class="num">${qtd} × ${fmtBRL(unit)}</td>
        <td class="num">${fmtBRL(qtd * unit)}</td>
      </tr>`
    }).join('')}
  `).join('')

  const formaLabel = LABEL_FORMA[os?.forma_pagamento] || os?.forma_pagamento || '—'
  const statusLabel = os?.pago === 'total' ? 'Pago integralmente' : os?.pago === 'parcial' ? 'Pago parcialmente' : 'Recebido'
  const saldo = Math.max(0, total - valorPago)

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Recibo OS #${os?.numero || ''}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 32px; max-width: 640px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
  .info { margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
  .info b { color: #333; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 6px 4px; border-bottom: 1px solid #eee; }
  td.grupo { font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; color: #5B9BD5; border-bottom: 2px solid #5B9BD5; padding-top: 14px; }
  td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totais { margin-top: 16px; font-size: 13px; }
  .totais .linha { display: flex; justify-content: space-between; padding: 3px 0; }
  .totais .final { font-size: 17px; font-weight: 700; border-top: 2px solid #1a1a1a; margin-top: 6px; padding-top: 8px; }
  .pagamento { margin-top: 20px; padding: 14px; background: #f0f7ee; border: 1px solid #cfe8c6; border-radius: 8px; }
  .pagamento .status { font-size: 15px; font-weight: 700; color: #2f7a3d; margin-bottom: 6px; }
  .pagamento .linha { display: flex; justify-content: space-between; font-size: 13px; padding: 2px 0; }
  .rodape { margin-top: 32px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 0; } }
</style></head>
<body>
  <h1>Recibo — OS #${os?.numero || ''}</h1>
  <div class="sub">${dataStr}</div>
  <div class="info">
    <div><b>Cliente:</b> ${escapeHtml(os?.cliente || '—')}</div>
    ${os?.fone ? `<div><b>Telefone:</b> ${escapeHtml(os.fone)}</div>` : ''}
    ${equip ? `<div><b>Equipamento:</b> ${escapeHtml(equip)}</div>` : ''}
  </div>
  ${grupos.length > 0 ? `<table>${linhasGrupos}</table>
  <div class="totais">
    ${descontoRS > 0 ? `
      <div class="linha"><span>Subtotal</span><span>${fmtBRL(subtotalBruto)}</span></div>
      <div class="linha"><span>Desconto</span><span>− ${fmtBRL(descontoRS)}</span></div>
    ` : ''}
    <div class="linha final"><span>Total</span><span>${fmtBRL(total)}</span></div>
  </div>` : ''}
  <div class="pagamento">
    <div class="status">${statusLabel}</div>
    <div class="linha"><span>Valor recebido</span><span>${fmtBRL(valorPago)}</span></div>
    <div class="linha"><span>Forma de pagamento</span><span>${escapeHtml(formaLabel)}</span></div>
    ${saldo > 0 ? `<div class="linha"><span>Saldo restante</span><span>${fmtBRL(saldo)}</span></div>` : ''}
  </div>
  <div class="rodape">IdeMaq Assistência Técnica — Naviraí/MS</div>
</body></html>`

  return abrirEImprimir(html)
}
