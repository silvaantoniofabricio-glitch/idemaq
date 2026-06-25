-- Corrige vencimento e pago_em dos itens Elo Grafite junho
-- Erro: foram inseridos com vencimento 11/07/2026; correto e 11/06/2026 (PAGA 11/06)
UPDATE lancamento_financeiro
SET
  vencimento = '2026-06-11',
  pago_em    = '2026-06-11'
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%'
  AND deleted_at IS NULL;

-- Verificacao
SELECT COUNT(*) as total, vencimento, pago_em
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%' AND deleted_at IS NULL
GROUP BY vencimento, pago_em;
