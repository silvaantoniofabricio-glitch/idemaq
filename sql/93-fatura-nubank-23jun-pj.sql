-- Fatura Nubank (cartao pessoal) — venc. 23/06/2026 (PAGA)
-- PJ: Facebook Ads (trafego pago limpeza)
-- PF excluidos: PIX Matheus R$10,65, Edna do Prado R$12,00 (em controleFinanceiroPF.js)

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-NUBANK-23JUN:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Nubank' LIMIT 1),
  '2026-06-23', '2026-06-23', 0, 'credito'
FROM (VALUES
  (22.71,  'Publicidade', 'Facebook Ads 16/05'),
  (10.31,  'Publicidade', 'Facebook Ads 17/05'),
  (34.14,  'Publicidade', 'Facebook Ads 20/05'),
  (20.41,  'Publicidade', 'Facebook Ads 21/05'),
  (34.14,  'Publicidade', 'Facebook Ads 24/05'),
  (132.06, 'Publicidade', 'Facebook Ads 05/06'),
  (34.23,  'Publicidade', 'Facebook Ads 08/06'),
  (8.99,   'Publicidade', 'Facebook Ads 09/06'),
  (34.27,  'Publicidade', 'Facebook Ads 11/06'),
  (13.26,  'Publicidade', 'Facebook Ads 13/06 (a)'),
  (7.55,   'Publicidade', 'Facebook Ads 13/06 (b)')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-23JUN:' || v.item AND deleted_at IS NULL);

COMMIT;

SELECT COUNT(*) as itens, SUM(valor) as total_publicidade, pago_em
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-NUBANK-23JUN:%' AND deleted_at IS NULL
GROUP BY pago_em;
