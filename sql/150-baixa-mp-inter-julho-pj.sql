-- Da baixa (marca como pago) em todas as faturas PJ de Mercado Pago e Inter
-- (junho e julho) que ficaram com pago_em NULL — sql/89, sql/90, sql/147, sql/148.
-- Isso faz elas saírem de "A Pagar" e aparecerem no Caixa/resumo do mes.
-- Confirmado por Toni: todas ja foram pagas ("dar baixa em tudo").

BEGIN;

UPDATE lancamento_financeiro
SET pago_em = vencimento
WHERE (
  descricao LIKE 'FAT-MP-JUL:%'
  OR descricao LIKE 'FAT-INTER-JUL:%'
  OR descricao LIKE 'FAT-MP-JUN:%'
  OR descricao LIKE 'FAT-INTER-JUN:%'
)
  AND deleted_at IS NULL
  AND pago_em IS NULL;

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento, pago_em
FROM lancamento_financeiro
WHERE (
  descricao LIKE 'FAT-MP-JUL:%'
  OR descricao LIKE 'FAT-INTER-JUL:%'
  OR descricao LIKE 'FAT-MP-JUN:%'
  OR descricao LIKE 'FAT-INTER-JUN:%'
)
  AND deleted_at IS NULL
ORDER BY descricao;
