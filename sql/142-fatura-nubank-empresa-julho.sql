-- Fatura Nubank Empresa (IDEMAQ ASSISTENCIA TECNICA LTDA, cartao ****6707)
-- Vencimento: 23/07/2026  |  Periodo: 16 JUN a 16 JUL
-- Total: R$ 328,36  |  Todos os itens: Facebook Ads (Trafego pago)
-- Fonte: REVISAO FECHAMENTO 2026/JULHO/FATURAS/Nubank_2026-07-23.pdf

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, 'Trafego pago', 'FAT-NUBANK-EMP-JUL:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome = 'Nubank' LIMIT 1),
  '2026-07-23', '2026-07-23', 0, 'credito_1x'
FROM (VALUES
  (27.23, 'Facebook Ads Zujjqrhcd2 16/06'),
  (12.52, 'Facebook Ads W62uqr5cd2 17/06'),
  (34.46, 'Facebook Ads Zk8ftrhcd2 20/06'),
  ( 0.04, 'Facebook Ads N98ygszbcd2 23/06 (a)'),
  (34.22, 'Facebook Ads Jrcsgu9cd2 23/06 (b)'),
  ( 0.05, 'Facebook Ads Skcf7uvbcd2 26/06 (a)'),
  (34.44, 'Facebook Ads Px2kuq9cd2 26/06 (b)'),
  (34.26, 'Facebook Ads Zdq92umcd2 29/06 (a)'),
  ( 0.06, 'Facebook Ads V22shv9cd2 29/06 (b)'),
  (34.27, 'Facebook Ads Q9d26tzbcd2 02/07'),
  (34.21, 'Facebook Ads 9x767w9cd2 05/07'),
  (82.60, 'Facebook Ads Kzxn2vmbd2 13/07')
) AS v(valor, item)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-EMP-JUL:' || v.item
    AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT descricao, valor, vencimento, pago_em, categoria
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-NUBANK-EMP-JUL:%'
  AND deleted_at IS NULL
ORDER BY valor DESC;
