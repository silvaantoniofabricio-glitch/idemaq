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

  const win = window.open('', '_blank')
  if (!win) return { ok: false, motivo: 'O navegador bloqueou a nova aba — permita pop-ups pra este site.' }
  win.document.write(html)
  win.document.close()
  win.focus()
  // Pequeno delay pra garantir que o layout renderizou antes do print.
  setTimeout(() => win.print(), 250)
  return { ok: true }
}
