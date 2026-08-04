-- Correcao: Amazon Music e PJ (som usado na empresa) — confirmado por Toni.
-- Estava como PJ em maio (sql/62) mas como PF (Lazer) em junho e julho.
-- Ja removido do array PF; aqui entra como PJ nos dois meses.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, 'Software', v.prefixo || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  v.vencimento, v.vencimento, 0, 'credito_1x'
FROM (VALUES
  ('FAT-ELO-GRAFITE-JUN:', 'Amazon Music 26/06', 11.90, '2026-06-11'::date),
  ('FAT-ELO-GRAFITE-JUL:', 'Amazon Music 26/07', 13.90, '2026-07-13'::date)
) AS v(prefixo, item, valor, vencimento)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = v.prefixo || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE descricao ILIKE '%amazon music%' AND deleted_at IS NULL
ORDER BY vencimento;
