-- Fatura Nubank Empresa (cartao PJ) + parte PJ da Fatura Nubank PF
-- Fonte: FECHAMENTO MAIO/FATURAS CARTOES/NUBANK EMPRESA.csv + NUBANK PF.csv
-- Boleto Nubank PF R$ 3.945,05 pago via Nubank conta em 26/05.

BEGIN;

-- Nubank EMPRESA (cartao PJ) - 6 Facebook Ads
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-NUBANK-EMP-MAIO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Nubank' LIMIT 1),
  '2026-05-26','2026-05-26', 0, 'credito_1x'
FROM (VALUES
  (13.22, 'Trafego pago', 'Facebook Ads Sxcsjmhcd2 13/05'),
  (11.42, 'Trafego pago', 'Facebook Ads 6lnw6pdcd2 13/05'),
  (34.16, 'Trafego pago', 'Facebook Ads Ywjqtm5cd2 12/05'),
  (34.39, 'Trafego pago', 'Facebook Ads Vrkptmmcd2 09/05'),
  (22.40, 'Trafego pago', 'Facebook Ads Nnrygm5cd2 09/05'),
  (0.21, 'Trafego pago', 'Facebook Ads 9yf7mlhcd2 05/05')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-EMP-MAIO:' || v.item AND deleted_at IS NULL);

-- Nubank PF (cartao pessoal) - so itens PJ (peças, ML peças, NuCel PJ)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-NUBANK-PF-MAIO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Nubank' LIMIT 1),
  '2026-05-26','2026-05-26', 0, 'credito_1x'
FROM (VALUES
  (10.00, 'Telefonia', 'Plano NuCel 19/04 (linha PJ)'),
  (59.50, 'Pecas', 'Casa dos Parafusos 17/04'),
  (44.95, 'Pecas', 'Casa dos Parafusos 03/04'),
  (50.49, 'Pecas', 'ML Plenitude 01/04 (parte de 2produto 117,42)'),
  (66.93, 'Pecas', 'ML Bonnaro 01/04 (parte de 2produto 117,42)')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-PF-MAIO:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT
  CASE WHEN descricao LIKE 'FAT-NUBANK-EMP-MAIO:%' THEN 'Nubank Empresa'
       ELSE 'Nubank PF (parte PJ)' END as origem,
  categoria,
  COUNT(*),
  SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-NUBANK-%MAIO:%' AND deleted_at IS NULL
GROUP BY origem, categoria
ORDER BY origem, total DESC;
