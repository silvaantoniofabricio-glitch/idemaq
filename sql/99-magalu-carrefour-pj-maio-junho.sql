-- Magalu Carrefour 23/02 — PJ — parcelas maio e junho 2026
-- Compra parcelada 7x no Inter (cartao PF usado pra despesa PJ).
-- Parcela 3/7 estava na fatura Inter venc. 26/05; 4/7 venc. 25/06.

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 343.62, 'Compras pessoais',
  'INTER-MAI:Magalu Carrefour 23/02 3/7',
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  '2026-05-26', '2026-05-26', 0, 'credito'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'INTER-MAI:Magalu Carrefour 23/02 3/7' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 343.62, 'Compras pessoais',
  'INTER-JUN:Magalu Carrefour 23/02 4/7',
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  '2026-06-25', '2026-06-25', 0, 'credito'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'INTER-JUN:Magalu Carrefour 23/02 4/7' AND deleted_at IS NULL);

SELECT descricao, valor, vencimento FROM lancamento_financeiro
WHERE descricao LIKE '%Magalu Carrefour%' AND deleted_at IS NULL
ORDER BY vencimento;
