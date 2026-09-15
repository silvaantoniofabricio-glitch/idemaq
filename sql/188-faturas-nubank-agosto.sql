-- Faturas Nubank de agosto/2026 — PF venc. 02/08, PJ venc. 23/08.
-- Fonte: REVISAO FECHAMENTO 2026/AGOSTO/FATURAS/Nubank PF_2026-08-02.csv
--        REVISAO FECHAMENTO 2026/AGOSTO/FATURAS/Nubank PJ_2026-08-23.csv
--
-- === Nubank PF (fatura toda R$ 790,13, 22 itens) ===
-- 19 itens ficaram no PF (controleFinanceiroPF.js) — Aiqfome, NuTag, Plano
-- NuCel, Nubank+. Aqui so os 3 que sao PJ, mesma classificacao ja usada em
-- julho pros itens identicos:
--   'Anthropic Claude Sub' + IOF — Software/Impostos (FAT-NUBANK-PF-JUL tinha
--   os mesmos dois, mesmo valor aproximado — assinatura mensal)
--   'Casa dos Parafusos - Parcela 2/2 16/06' — Pecas — completa a serie cuja
--   1/2 ja estava lancada em julho (FAT-NUBANK-PF-JUL:Casa dos Parafusos 1/2 16/06)
--
-- Ficou de fora (nem PF nem PJ ainda): 'Mercadolivre*Felipeal' R$263,58,
-- sem precedente — precisa o Toni confirmar antes de classificar.
--
-- === Nubank PJ (fatura toda R$123,34 de despesa nova) ===
-- 4x Facebook Ads (Trafego pago) + Multa e IOF por fatura atrasada (Tarifa
-- banco — a fatura de julho ficou com saldo pendente e pagou juntos).
-- NAO lanco 'Valor pendente do mes anterior' (R$328,36) nem 'Pagamento
-- recebido' (-R$328,36): sao o mesmo valor se cancelando — o rotativo da
-- fatura de julho sendo quitado dentro do proprio ciclo, nao e despesa nova.

-- APLICADO em 20/08/2026 — 9 linhas: Nubank PF 3 itens/R$167,26,
-- Nubank PJ 6 itens/R$123,34, cada uma na conta certa. Serie Casa dos
-- Parafusos 16/06 fechada em 2/2.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  (SELECT id FROM conta_bancaria WHERE nome = v.conta AND deleted_at IS NULL LIMIT 1),
  v.vencimento::date, v.vencimento::date, 0, v.forma
FROM (VALUES
  -- Nubank PF venc. 02/08 — so os itens PJ
  ('FAT-NUBANK-PF-AGO:Anthropic Claude Sub 15/07',      113.30, 'Software',    'Nubank PF', '2026-08-02', 'credito_1x'),
  ('FAT-NUBANK-PF-AGO:IOF Anthropic Claude Sub 15/07',    3.96, 'Impostos',    'Nubank PF', '2026-08-02', 'credito_1x'),
  ('FAT-NUBANK-PF-AGO:Casa dos Parafusos 2/2 16/06',     50.00, 'Pecas',       'Nubank PF', '2026-08-02', 'credito_parcelado'),
  -- Nubank PJ venc. 23/08 — tudo PJ
  ('FAT-NUBANK-PJ-AGO:Facebook Ads Bmt8sv5cd2 22/07',    34.49, 'Trafego pago','Nubank PJ', '2026-08-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-AGO:Facebook Ads Dps5cwvbd2 20/07',    34.39, 'Trafego pago','Nubank PJ', '2026-08-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-AGO:Facebook Ads Qdyn2vmbd2 16/07',    46.56, 'Trafego pago','Nubank PJ', '2026-08-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-AGO:Facebook Ads 7b52rvrbd2 16/07',     0.06, 'Trafego pago','Nubank PJ', '2026-08-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-AGO:Multa por fatura atrasada 24/07',   6.59, 'Tarifa banco','Nubank PJ', '2026-08-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-AGO:IOF por fatura atrasada 24/07',     1.25, 'Tarifa banco','Nubank PJ', '2026-08-23', 'credito_1x')
) AS v(descricao, valor, categoria, conta, vencimento, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL
);

COMMIT;

-- Verificacao 1: 3 itens PJ da fatura PF, R$ 167,26
SELECT descricao, valor, categoria
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'FAT-NUBANK-PF-AGO:%'
ORDER BY valor DESC;

-- Verificacao 2: fatura PJ completa, 6 itens, R$ 123,34
SELECT COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'FAT-NUBANK-PJ-AGO:%';

-- Verificacao 3: cada conta recebeu na conta certa
SELECT cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND (lf.descricao LIKE 'FAT-NUBANK-PF-AGO:%' OR lf.descricao LIKE 'FAT-NUBANK-PJ-AGO:%')
GROUP BY cb.nome;

-- Verificacao 4: serie Casa dos Parafusos, agora completa (1/2 julho, 2/2 agosto)
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao ILIKE '%Casa dos Parafusos%16/06%'
ORDER BY vencimento;
