-- Fatura Inter (cartao 9106 + 3338) - venc. 25/07/2026, total R$2.884,43
-- Cartao PF do Toni. So entra 1 item PJ classificado na revisao.
-- Fonte: REVISAO FECHAMENTO 2026/JULHO/FATURAS/fatura-inter-2026-07.pdf

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-INTER-JUL:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  '2026-07-25', NULL, 0, 'credito_parcelado'
FROM (VALUES
  (56.20, 'Materiais de limpeza', 'Limpeel Casa Carro 25/04 3/3')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-INTER-JUL:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-INTER-JUL:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
