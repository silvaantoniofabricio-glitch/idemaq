-- Extrato bancario Cresol (conta corrente, ag. 1769 / conta 138286-1) —
-- agosto/2026. Fonte: REVISAO FECHAMENTO 2026/AGOSTO/FATURAS/EXTRATOS/
-- extrato_17691382861_20260801_20260831.pdf
--
-- O extrato tem 6 paginas e muita coisa que NAO entra aqui:
--   - Recebimentos de clientes (PIX de OS) — ja capturados via osToFinanceiro
--   - Pagamentos de fatura ja lancados por dentro (eSocial R$599,76 sql/178,
--     Bradesco PJ Elo Mais R$129,40 sql/186, Cresol Mastercard R$1.230,40
--     sql/189, Nubank PJ R$123,35≈123,34 sql/188) — sao a QUITACAO das
--     faturas ja detalhadas item a item, nao despesa nova
--   - PIX para o proprio Antonio Fabricio da Silva (03/08 R$500 + 12/08
--     R$1.500 + 14/08 R$1.600 + 18/08 R$1.400 + 25/08 R$2.000 + 25/08 R$300
--     = R$7.300,00) — retirada/pro-labore, fluxo interno, NAO lancado aqui
--   - Um emprestimo desconhecido (contrato 500100320260531371-4, R$84,19 em
--     17/08 + R$1.477,89 em 18/08) e o Seguro Prestamista R$25,20 (18/08) —
--     PENDENTE, Toni ainda nao confirmou o que e
--   - Varios "PIX CREDITO DE: IDEMAQ" (repasse de outra conta/maquininha) —
--     receita, fora do escopo deste SQL
--
-- Os 3 nomes que nao tinham precedente, confirmados pelo Toni em 20/08:
--   GESIEL CARLOS VISU R$150,00 (01/08) — compra de maquina
--   CLEIDE MASSON R$20,00 (19/08) — troco (Toni: "deve ser troco")
--   MARCIA DE FATIMA X R$361,64 (31/08) — conta de luz da empresa (Energisa),
--     paga pela mae do Toni e reembolsada — Toni: "e energia PJ"

-- APLICADO em 20/08/2026 — 12 itens, R$ 4.903,11, conta Cresol.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'CRESOL-AGO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  v.data::date, v.data::date, 0, 'pix'
FROM (VALUES
  ('Salario Alessandro ago/2026 (parcela 01/08)', 1000.00, 'Salario',       '2026-08-03'),
  ('Salario Alessandro ago/2026 (parcela 05/08)',  650.00, 'Salario',       '2026-08-05'),
  ('Salario Guilherme ago/2026 (parcela 01/08)',  1000.00, 'Salario',       '2026-08-03'),
  ('Salario Guilherme ago/2026 (parcela 05/08)',   650.00, 'Salario',       '2026-08-05'),
  ('Pacote Servicos Cresol ago/2026',               51.99, 'Tarifa banco',  '2026-08-05'),
  ('Zion Contabilidade ago/2026',                  250.00, 'Contabilidade', '2026-08-13'),
  ('FleetNet Telecomunicacoes ago/2026',           137.91, 'Internet',      '2026-08-11'),
  ('Luciano Aparecido Lima Cri - compra pecas 18/08', 569.38, 'Pecas',      '2026-08-18'),
  ('Viacao Cruzeiro do Sul - frete 19/08',           62.19, 'Frete',        '2026-08-19'),
  ('Gesiel Carlos Visu - compra de maquina 01/08',  150.00, 'Compra de maquina', '2026-08-03'),
  ('Cleide Masson - troco 19/08',                    20.00, 'Diverso',      '2026-08-19'),
  ('Energisa (via Marcia de Fatima) 31/08',         361.64, 'Energia eletrica', '2026-08-31')
) AS v(item, valor, categoria, data)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro WHERE descricao = 'CRESOL-AGO:' || v.item AND deleted_at IS NULL
);

COMMIT;

-- Verificacao 1: 12 itens, R$ 4.903,11, conta Cresol
SELECT cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND lf.descricao LIKE 'CRESOL-AGO:%'
GROUP BY cb.nome;

-- Verificacao 2: por categoria
SELECT categoria, COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'CRESOL-AGO:%'
GROUP BY categoria ORDER BY total DESC;
