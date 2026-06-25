-- Marca faturas Inter e MP junho como pagas na data de vencimento
UPDATE lancamento_financeiro
SET pago_em = '2026-06-25'
WHERE descricao LIKE 'FAT-INTER-JUN:%'
  AND deleted_at IS NULL
  AND pago_em IS NULL;

UPDATE lancamento_financeiro
SET pago_em = '2026-06-22'
WHERE descricao LIKE 'FAT-MP-JUN:%'
  AND deleted_at IS NULL
  AND pago_em IS NULL;

-- Verificacao
SELECT
  CASE WHEN descricao LIKE 'FAT-INTER-JUN:%' THEN 'Inter' ELSE 'MP' END as fatura,
  COUNT(*) as itens,
  pago_em
FROM lancamento_financeiro
WHERE (descricao LIKE 'FAT-INTER-JUN:%' OR descricao LIKE 'FAT-MP-JUN:%')
  AND deleted_at IS NULL
GROUP BY 1, 3
ORDER BY 1;
