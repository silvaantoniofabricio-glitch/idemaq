import fs from 'fs'
import * as D from './data.mjs'
const q = s => s.replace(/'/g, "''")
const jq = s => s.replace(/'/g, "\\'")
const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length))
const num = v => v.toFixed(2)

// ---------------- SQL PJ ----------------
// [prefixo, conta, venc, pago_em, forma-padrao, itens]
const CARDS = [
  ['FAT-ELO-GRAFITE-AGO', 'Bradesco PJ', '2026-09-11', D.ELO],
  ['FAT-MP-SET', 'Mercado Pago Cartão', '2026-09-21', D.MP],
  ['FAT-INTER-SET', 'Inter', '2026-09-25', D.INTER],
  ['FAT-NUBANK-PF-SET', 'Nubank PF', '2026-09-02', D.NUPF],
  ['FAT-NUBANK-PJ-SET', 'Nubank PJ', '2026-09-23', D.NUPJ],
  ['FAT-CRESOL-MASTER-SET', 'Cresol Cartão', '2026-09-11', D.MASTER],
  ['FAT-BRAD-PJ-ELO-SET', 'Bradesco PJ', '2026-09-10', D.BRAD],
]
const forma = d => (/ \d+\/\d+( |\)|$)/.test(d) && /\d{2}\/\d{2} \d+\/\d+/.test(d)) ? 'credito_parcelado' : 'credito_1x'
const rows = []
for (const [pre, conta, venc, itens] of CARDS) {
  for (const [d, v, c] of itens) {
    if (!c.startsWith('PJ:')) continue
    rows.push(`  ('${q(pre + ':' + d)}', ${num(v)}, '${q(c.slice(3))}', '${conta}', '${venc}', '${forma(d)}')`)
  }
}
// extrato Cresol + Nubank conta (PJ)
const EXTRATO = [
  ['CRESOL-SET:Salario Alessandro set/2026 (PIX 08/09 R$300)', 300.00, 'Salario', 'Cresol', '2026-09-08', 'pix'],
  ['CRESOL-SET:Salario Alessandro set/2026 (PIX 08/09 R$700)', 700.00, 'Salario', 'Cresol', '2026-09-08', 'pix'],
  ['CRESOL-SET:Salario Alessandro set/2026 (PIX 03/09 R$6)', 6.00, 'Salario', 'Cresol', '2026-09-03', 'pix'],
  ['CRESOL-SET:Salario Alessandro set/2026 (diferenca paga em dinheiro)', 544.00, 'Salario', 'Cresol', '2026-09-08', 'dinheiro'],
  ['CRESOL-SET:Salario Guilherme set/2026 (PIX 08/09 R$700)', 700.00, 'Salario', 'Cresol', '2026-09-08', 'pix'],
  ['CRESOL-SET:Salario Guilherme set/2026 (PIX 08/09 R$300)', 300.00, 'Salario', 'Cresol', '2026-09-08', 'pix'],
  ['CRESOL-SET:Salario Guilherme set/2026 (diferenca paga em dinheiro)', 550.00, 'Salario', 'Cresol', '2026-09-08', 'dinheiro'],
  ['CRESOL-SET:Pacote Servicos Cresol set/2026', 51.99, 'Tarifa banco', 'Cresol', '2026-09-08', 'pix'],
  ['CRESOL-SET:Zion Contabilidade set/2026', 250.00, 'Contabilidade', 'Cresol', '2026-09-10', 'pix'],
  ['CRESOL-SET:Tiago Fernandes - compra de lavadora 24/09', 150.00, 'Compra de maquina', 'Cresol', '2026-09-24', 'pix'],
  ['CRESOL-SET:Energisa (via Marcia de Fatima) 25/09', 454.95, 'Energia eletrica', 'Cresol', '2026-09-25', 'pix'],
  ['CRESOL-SET:Juros cheque especial 02/09', 72.41, 'Tarifa banco', 'Cresol', '2026-09-02', 'pix'],
  ['CRESOL-SET:IOF saldo devedor 02/09', 15.87, 'Tarifa banco', 'Cresol', '2026-09-02', 'pix'],
  ['CRESOL-SET:Cobranca extra fatura Mastercard 11/09', 19.90, 'Tarifa banco', 'Cresol', '2026-09-11', 'pix'],
  ['NUBANK-CONTA-SET:FleetNet Telecomunicacoes set/2026 (boleto 10/09)', 119.99, 'Internet', 'Nubank PF', '2026-09-10', 'boleto'],
]
for (const [d, v, c, conta, dt, f] of EXTRATO) rows.push(`  ('${q(d)}', ${num(v)}, '${q(c)}', '${conta}', '${dt}', '${f}')`)

const totalPJ = [...CARDS.flatMap(c => c[3].filter(x => x[2].startsWith('PJ:')))].reduce((s, x) => s + x[1], 0) + EXTRATO.reduce((s, x) => s + x[1], 0)
const sql = `-- Fechamento SETEMBRO/2026 — itens PJ.
-- Regra do Toni: tudo entra em SETEMBRO = extratos de setembro + faturas que
-- VENCERAM em setembro (a fatura conta no mes do vencimento, nao da compra).
--
-- Faturas (total do documento -> parte PJ aqui, resto PF em controleFinanceiroPF.js):
--   Elo Grafite 3558  venc 11/09  R$4.701,36 -> PJ R$433,95 (prefixo FAT-ELO-GRAFITE-AGO: = ciclo, como sempre)
--   Mercado Pago 5566 venc 21/09  R$3.910,86 -> PJ R$3.494,72
--   Inter             venc 25/09  R$1.872,98 -> PJ R$343,62 (Magalu-Carrefour 7/7, garantia)
--   Nubank PF         venc 02/09  R$199,78   -> PJ R$119,42 (Anthropic + IOF)
--   Nubank PJ         venc 23/09  R$175,57   -> PJ R$175,57
--   Cresol Mastercard (debito 11/09) R$1.297,81 -> PJ R$1.098,87 (R Silva R$29,99 12x FICA DE FORA, em investigacao)
--   Bradesco Elo Mais 3914 venc 10/09 R$129,40 -> PJ R$129,40
-- Extrato Cresol + FleetNet (Nubank conta): ver bloco EXTRATO.
--
-- Salarios: Toni informou R$1.550 para cada um; o que nao aparece no extrato
-- foi pago em dinheiro (Alessandro 1.550-1.006=544 | Guilherme 1.550-1.000=550).
-- O PIX de R$6 do Alessandro (03/09) foi tratado como parte do salario — confirmar.
--
-- NAO lancado de proposito: quitacoes de fatura (Mercado Pago 3.910,86, Nubank PJ 175,59,
-- Mastercard 1.317,71, Elo 4.701,36...), retiradas/PIX internos, "PIX CREDITO DE: IDEMAQ",
-- agua 15/09 R$164,47 (e a quitacao de AGOSTO ja lancada no sql/191) e as parcelas
-- do Civic/emprestimo Cresol (PF).

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  (SELECT id FROM conta_bancaria WHERE nome = v.conta AND deleted_at IS NULL LIMIT 1),
  v.vencimento::date, v.vencimento::date, 0, v.forma
FROM (VALUES
${rows.join(',\n')}
) AS v(descricao, valor, categoria, conta, vencimento, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL
);

COMMIT;

-- Verificacao 1: itens e total por prefixo (esperado: ${rows.length} itens, R$ ${totalPJ.toFixed(2)} no conjunto)
SELECT split_part(descricao, ':', 1) AS prefixo, COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND (descricao LIKE 'FAT-ELO-GRAFITE-AGO:%' OR descricao LIKE 'FAT-MP-SET:%' OR descricao LIKE 'FAT-INTER-SET:%'
    OR descricao LIKE 'FAT-NUBANK-PF-SET:%' OR descricao LIKE 'FAT-NUBANK-PJ-SET:%'
    OR descricao LIKE 'FAT-CRESOL-MASTER-SET:%' OR descricao LIKE 'FAT-BRAD-PJ-ELO-SET:%'
    OR descricao LIKE 'CRESOL-SET:%' OR descricao LIKE 'NUBANK-CONTA-SET:%')
GROUP BY 1 ORDER BY 1;

-- Verificacao 2: cada item caiu na conta certa
SELECT cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL
  AND (lf.descricao LIKE 'FAT-%-SET:%' OR lf.descricao LIKE 'FAT-ELO-GRAFITE-AGO:%' OR lf.descricao LIKE 'CRESOL-SET:%' OR lf.descricao LIKE 'NUBANK-CONTA-SET:%')
GROUP BY cb.nome ORDER BY 1;

-- Verificacao 3: salarios de setembro (esperado 1.550 cada)
SELECT CASE WHEN descricao ILIKE '%Alessandro%' THEN 'Alessandro' ELSE 'Guilherme' END AS quem, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'CRESOL-SET:Salario%'
GROUP BY 1;
`
fs.writeFileSync('sql/203-fechamento-setembro-pj.sql', sql)
console.log('SQL rows', rows.length, 'total PJ', totalPJ.toFixed(2))

// ---------------- JS PF ----------------
const L = (data, origem, d, v, c) => `  { data: '${data}', origem: '${origem}', descricao: '${jq(d)}', valor: ${v.toFixed(2)}, categoria: '${c}' },`
const pf = []
const addCard = (title, data, origem, itens) => {
  pf.push(`  // --- ${title} ---`)
  for (const [d, v, c] of itens) if (!c.startsWith('PJ:')) pf.push(L(data, origem, d, v, c))
}
addCard('Elo Grafite 3558/5900 — venc. 11/09/2026 (fatura R$4.701,36; PJ R$433,95 no sql/203)', '11/09/2026', 'Elo Grafite', D.ELO)
addCard('MP Cartao (Visa 5566) — venc. 21/09/2026 (fatura R$3.910,86; PJ R$3.494,72 no sql/203)', '21/09/2026', 'MP Cartao', D.MP)
addCard('Inter — venc. 25/09/2026 (fatura R$1.872,98; PJ so o Magalu-Carrefour, sql/203)', '25/09/2026', 'Inter', D.INTER)
addCard('Bradesco NEO (Visa) — venc. 20/09/2026 (fatura R$33,00, anuidade)', '20/09/2026', 'Bradesco NEO', D.NEO)
addCard('Nubank PF (cartao) — venc. 02/09/2026 (fatura R$199,78; Anthropic+IOF sao PJ, sql/203)', '02/09/2026', 'Nubank PF', D.NUPF)
addCard('Cresol Mastercard — debito 11/09/2026 (fatura R$1.297,81; PJ R$1.098,87 no sql/203; R Silva R$29,99 12x em investigacao, fora)', '11/09/2026', 'Cresol Mastercard', D.MASTER)
pf.push('  // --- Nubank conta (Toni) — extrato set/2026 ---')
pf.push(L('10/09/2026', 'Nubank', 'Garzon Informatica', 5.00, 'Diverso').replace("'10/09/2026'", "'11/09/2026'"))
pf.push(L('11/09/2026', 'Nubank', 'Luan Rogerio Gomes Fruto (pizza promocional da igreja)', 35.00, 'Doacao/Igreja'))
pf.push(L('12/09/2026', 'Nubank', 'Debito em conta 12/09', 25.00, 'Diverso'))
pf.push(L('13/09/2026', 'Nubank', 'Maykon Antonio de Oliveira (oferta missionaria)', 100.00, 'Doacao/Igreja'))
pf.push(L('19/09/2026', 'Nubank', 'Rosilene da Silva Pereira (churrasco da igreja)', 50.00, 'Doacao/Igreja'))
pf.push(L('25/09/2026', 'Nubank', 'Pay2All 25/09', 53.90, 'Diverso'))
pf.push(L('25/09/2026', 'Nubank', 'Davi Pereira Giusfredi (pix pra completar compra de pasteis entre amigos)', 15.00, 'Alimentacao'))
pf.push(L('27/09/2026', 'Nubank', 'Dizimo Sara Nossa Terra 27/09', 350.00, 'Dizimo'))
pf.push('  // --- Bradesco PF (conta 358510-7, nao rastreada) — extrato set/2026 ---')
pf.push(L('02/09/2026', 'Bradesco PF', 'Encargos limite credito 02/09', 86.75, 'Tarifa banco'))
pf.push(L('02/09/2026', 'Bradesco PF', 'IOF utilizacao limite 02/09', 30.81, 'IOF'))
pf.push(L('22/09/2026', 'Bradesco PF', 'PIX enviado 22/09 (610)', 610.00, 'Transferencia'))
pf.push(L('22/09/2026', 'Bradesco PF', 'PIX enviado 22/09 (4.700)', 4700.00, 'Transferencia'))
pf.push('  // --- Cresol (emprestimo Toni, PF desde 23/09) ---')
pf.push(L('21/09/2026', 'Cresol', 'Parcela Emprestimo Cresol 21/09', 1421.71, 'Financiamento'))
const toni = `export const DESPESAS_PF_TONI_SETEMBRO_2026 = [\n${pf.join('\n')}\n]\n`
const rafa = `export const DESPESAS_PF_RAFA_SETEMBRO_2026 = [\n  // So a parcela do Civic (extrato Cresol). Falta o extrato do Banco do Brasil/Nubank da Rafa — o Toni vai lancar.\n${L('16/09/2026', 'Cresol', 'Parcela Civic (emprestimo PF) 16/09', 1526.48, 'Financiamento')}\n]\n`
fs.writeFileSync('scripts/_tmp/pf-setembro.js', rafa + '\n' + toni)
const tot = pf.filter(l => l.startsWith('  {')).reduce((s, l) => s + Number(l.match(/valor: ([\d.]+)/)[1]), 0)
console.log('PF Toni linhas', pf.filter(l => l.startsWith('  {')).length, 'soma', tot.toFixed(2))
