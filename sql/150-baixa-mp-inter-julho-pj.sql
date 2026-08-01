-- Da baixa (marca como pago) nas faturas PJ de julho que ficaram
-- com pago_em NULL — Mercado Pago (sql/148) e Inter (sql/147).
-- Isso faz elas saírem de "A Pagar" e aparecerem no Caixa/resumo do mes.
-- Confirmado por Toni: as duas faturas ja foram pagas.

BEGIN;

UPDATE lancamento_financeiro
SET pago_em = vencimento
WHERE descricao LIKE 'FAT-MP-JUL:%'
  AND deleted_at IS NULL
  AND pago_em IS NULL;

UPDATE lancamento_financeiro
SET pago_em = vencimento
WHERE descricao LIKE 'FAT-INTER-JUL:%'
  AND deleted_at IS NULL
  AND pago_em IS NULL;

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento, pago_em
FROM lancamento_financeiro
WHERE (descricao LIKE 'FAT-MP-JUL:%' OR descricao LIKE 'FAT-INTER-JUL:%')
  AND deleted_at IS NULL
ORDER BY descricao;
