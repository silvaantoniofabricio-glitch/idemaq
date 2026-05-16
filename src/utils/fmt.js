// idemaq-src/utils/fmt.js
// Formatadores de moeda, data e helpers de exibição.

export function fmtBRL(v, opts = {}) {
  if (v == null) return '—'
  const s = Math.abs(v).toLocaleString('pt-BR', {
    minimumFractionDigits: opts.fr ? 2 : 0,
    maximumFractionDigits: opts.fr ? 2 : 0,
  })
  return (v < 0 ? '-' : '') + 'R$ ' + s
}

export function fmtPrazoCurto(prazoIso) {
  if (!prazoIso) return '—'
  const d = new Date(prazoIso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

export function fmtDataHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
