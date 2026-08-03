-- Correcao: "Mano Auto Posto" no cartao Cresol Mastercard e PJ (abastecimento
-- de veiculo da empresa), nao PF como classificado antes por padrao (o padrao
-- PF valia pro Mano Auto Posto no Elo Grafite/Inter, cartoes pessoais).
-- Confirmado por Toni.
--
-- 6 lancamentos, R$200,00 cada, R$1.200,00 total:
--   3x no ciclo de junho (fatura periodo 01/05-31/05, sql/152)
--   3x no ciclo de julho (fatura periodo 01/06-30/06, sql/151)
-- Ja removidos do array PF (controleFinanceiroPF.js).

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, 'Combustivel', v.prefixo || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  v.vencimento, v.vencimento, 0, 'credito_parcelado'
FROM (VALUES
  ('FAT-CRESOL-MASTER-JUN:', 'Mano Auto Posto 25/05', 200.00, '2026-06-20'::date),
  ('FAT-CRESOL-MASTER-JUN:', 'Mano Auto Posto 15/05', 200.00, '2026-06-20'::date),
  ('FAT-CRESOL-MASTER-JUN:', 'Mano Auto Posto 04/05', 200.00, '2026-06-20'::date),
  ('FAT-CRESOL-MASTER-JUL:', 'Mano Auto Posto 22/06', 200.00, '2026-07-20'::date),
  ('FAT-CRESOL-MASTER-JUL:', 'Mano Auto Posto 12/06', 200.00, '2026-07-20'::date),
  ('FAT-CRESOL-MASTER-JUL:', 'Mano Auto Posto 03/06', 200.00, '2026-07-20'::date)
) AS v(prefixo, item, valor, vencimento)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = v.prefixo || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE descricao LIKE '%Mano Auto Posto%' AND descricao LIKE 'FAT-CRESOL-MASTER%' AND deleted_at IS NULL
ORDER BY descricao;
