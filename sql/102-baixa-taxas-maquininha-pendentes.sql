-- Dar baixa em todas as taxas de maquininha pendentes (pago_em = vencimento)
-- Essas taxas sao descontadas automaticamente no D+1 util — nao precisam de baixa manual.

UPDATE lancamento_financeiro
SET pago_em = vencimento
WHERE categoria = 'Taxa maquininha'
  AND pago_em IS NULL
  AND deleted_at IS NULL;

SELECT 'Taxas baixadas: ' || COUNT(*) AS resultado
FROM lancamento_financeiro
WHERE categoria = 'Taxa maquininha'
  AND pago_em IS NOT NULL
  AND deleted_at IS NULL;
