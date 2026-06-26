-- Magalu Carrefour 23/02 — PJ — parcela junho 2026 (4/7)
-- Parcela 3/7 (maio) ja estava lancada em Garantia/Reposicao.
-- Apenas adiciona a 4/7 no mesmo padrao.

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 343.62, 'Garantia/Reposicao',
  'INTER-JUN:Magalu Carrefour 23/02 4/7',
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  '2026-06-25', '2026-06-25', 0, 'credito'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'INTER-JUN:Magalu Carrefour 23/02 4/7' AND deleted_at IS NULL);

SELECT descricao, valor, categoria, vencimento FROM lancamento_financeiro
WHERE descricao LIKE '%Magalu Carrefour%' AND deleted_at IS NULL
ORDER BY vencimento;
