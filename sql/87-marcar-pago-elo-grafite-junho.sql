-- Marca os 13 itens da fatura Elo Grafite junho como pagos em 11/06/2026
UPDATE lancamento_financeiro
SET pago_em = '2026-06-11'
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%'
  AND deleted_at IS NULL
  AND pago_em IS NULL;

-- Verificacao
SELECT COUNT(*) as atualizados, pago_em
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%' AND deleted_at IS NULL
GROUP BY pago_em;
