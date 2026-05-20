// idemaq-src/utils/financeiro.js
// Helpers de cálculo financeiro — começa pelo D+1 útil das maquininhas.
//
// Regra confirmada com o dono (contexto-financeiro.md §4.5):
//   InfinitePay e Ton Black liquidam D+1 útil — pulam fins de semana E
//   feriados bancários. Vendas em FDS/feriado caem no próximo dia útil.
//
// Próximo passo (Módulo 09): ler feriados de uma tabela `configuracoes`
// pra incluir feriados móveis e municipais (Naviraí/MS — 06/11).

// ─── Feriados bancários nacionais fixos ─────────────────────────────────────
// Lista oficial Febraban + Lei 14.759/2023 (Consciência Negra nacional).
// Formato 'DD/MM' pra comparação rápida. Móveis (Carnaval, Sexta Santa,
// Corpus Christi) ainda não incluídos — TODO Módulo 09.
const FERIADOS_BANCARIOS_FIXOS = [
  '01/01', // Confraternização Universal
  '21/04', // Tiradentes
  '01/05', // Dia do Trabalho
  '07/09', // Independência
  '12/10', // Nossa Senhora Aparecida
  '02/11', // Finados
  '15/11', // Proclamação da República
  '20/11', // Consciência Negra (nacional desde 2024)
  '25/12', // Natal
]

/**
 * Verifica se a data é feriado bancário nacional.
 * @param {Date} data
 * @returns {boolean}
 */
export function ehFeriadoBancario(data) {
  const dia = data.getDate()
  const mes = data.getMonth() + 1
  const chave = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
  return FERIADOS_BANCARIOS_FIXOS.includes(chave)
}

/**
 * Verifica se a data cai em fim de semana (sábado ou domingo).
 * @param {Date} data
 * @returns {boolean}
 */
export function ehFimDeSemana(data) {
  const d = data.getDay()
  return d === 0 || d === 6
}

/**
 * Calcula D+1 útil a partir de uma data base.
 * Pula FDS + feriados bancários até encontrar o primeiro dia útil.
 *
 * Exemplos:
 *   Segunda → Terça
 *   Sexta   → Segunda (pula sáb/dom)
 *   Sábado  → Segunda
 *   Feriado quinta → Sexta (ou segunda se sexta também for feriado)
 *
 * @param {Date|string} data - Date ou ISO 'YYYY-MM-DD'
 * @returns {Date} - Data D+1 útil (novo Date, não muta o input)
 */
export function calcularD1Util(data) {
  const base = data instanceof Date ? new Date(data) : new Date(data + 'T00:00:00')
  const resultado = new Date(base)
  resultado.setDate(resultado.getDate() + 1)

  // Pula FDS + feriados até encontrar dia útil. Loop com guarda contra
  // sequência absurda (10 dias dá pra qualquer cadeia realista de feriados).
  let tentativas = 0
  while ((ehFimDeSemana(resultado) || ehFeriadoBancario(resultado)) && tentativas < 10) {
    resultado.setDate(resultado.getDate() + 1)
    tentativas++
  }
  return resultado
}

/**
 * Helper: retorna ISO 'YYYY-MM-DD' do D+1 útil (formato usado nos lançamentos).
 * @param {Date|string} data
 * @returns {string}
 */
export function calcularD1UtilISO(data) {
  return calcularD1Util(data).toISOString().slice(0, 10)
}
