// idemaq-src/utils/fmt.js
// Formatadores de moeda, data e helpers de exibição.

// Normaliza texto pra BUSCA: tira acentos e baixa o caixa. Usar nos DOIS lados
// (termo digitado E campo comparado) pra busca ignorar acentos —
// "valvula" acha "Válvula". Ex: semAcento('Válvula') === 'valvula'.
export function semAcento(s) {
  return (s == null ? '' : String(s))
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove marcas de acento (combining diacritics)
    .toLowerCase()
}

export function fmtBRL(v, opts = {}) {
  if (v == null) return '—'
  const s = Math.abs(v).toLocaleString('pt-BR', {
    minimumFractionDigits: opts.fr ? 2 : 0,
    maximumFractionDigits: opts.fr ? 2 : 0,
  })
  return (v < 0 ? '-' : '') + 'R$ ' + s
}

// Datas no formato YYYY-MM-DD (date-only) devem ser interpretadas como
// horário LOCAL, não UTC. Sem isso, `new Date('2026-06-01')` vira meia-noite
// UTC e no fuso de Cuiabá (-4) volta um dia (mostra 31/mai). Append 'T00:00:00'
// força parsing local. Timestamps completos (com hora/fuso) passam direto.
function parseDataLocal(iso) {
  if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(iso + 'T00:00:00')
  }
  return new Date(iso)
}

// "Hoje" no fuso LOCAL como YYYY-MM-DD. Evita o +1 dia do
// `new Date().toISOString().slice(0,10)`, que usa UTC e à noite (Cuiabá -4)
// já caiu no dia seguinte.
export function hojeISO() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function fmtPrazoCurto(prazoIso) {
  if (!prazoIso) return '—'
  const d = parseDataLocal(prazoIso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

export function fmtDataHora(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
