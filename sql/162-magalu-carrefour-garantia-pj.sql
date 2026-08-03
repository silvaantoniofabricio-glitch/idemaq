-- Correcao: "Magalu-Carrefour 23/02" (cartao Inter) e PJ — maquina que teve
-- que ser dada pro cliente na garantia. Estava classificado PF por engano.
-- Confirmado por Toni.
--
-- 2 parcelas ja identificadas (4/7 no ciclo junho, 5/7 no ciclo julho),
-- R$343,62 cada, R$687,24 total. Ja removidas do array PF.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, 'Equipamentos', v.prefixo || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  v.vencimento, v.vencimento, 0, 'credito_parcelado'
FROM (VALUES
  ('FAT-INTER-JUN:', 'Magalu-Carrefour 23/02 4/7 (maquina garantia cliente)', 343.62, '2026-06-25'::date),
  ('FAT-INTER-JUL:', 'Magalu-Carrefour 23/02 5/7 (maquina garantia cliente)', 343.62, '2026-07-25'::date)
) AS v(prefixo, item, valor, vencimento)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = v.prefixo || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE descricao LIKE '%Magalu-Carrefour%' AND deleted_at IS NULL
ORDER BY descricao;
