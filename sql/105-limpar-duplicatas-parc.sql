-- Remove duplicatas geradas pelo sql/71 (PARC-*) que foram relancadas pelos SQLs mensais (FAT-*)
-- Regra: dentro de cada grupo (valor+vencimento+tipo despesa) com >1 registro,
--   apaga os que comecam com PARC- e mantem os FAT-.
--   Se nao houver PARC- no grupo, apaga os de id maior (mantem o mais antigo).

-- CONFERIR o que sera apagado:
WITH grupos AS (
  SELECT
    lf.valor, lf.vencimento,
    lf.id,
    lf.descricao,
    COUNT(*) OVER (PARTITION BY lf.valor, lf.vencimento) AS qtd,
    MIN(lf.id)  OVER (PARTITION BY lf.valor, lf.vencimento) AS min_id,
    BOOL_OR(lf.descricao LIKE 'FAT-%') OVER (PARTITION BY lf.valor, lf.vencimento) AS tem_fat
  FROM lancamento_financeiro lf
  WHERE lf.tipo = 'despesa'
    AND lf.deleted_at IS NULL
    AND lf.vencimento >= '2026-05-01'
),
a_remover AS (
  SELECT id, descricao, valor, vencimento
  FROM grupos
  WHERE qtd > 1
    AND (
      -- tem FAT- no grupo: remove os PARC-
      (tem_fat AND descricao LIKE 'PARC-%')
      OR
      -- nao tem FAT- no grupo: remove todos exceto o id mais antigo
      (NOT tem_fat AND id <> min_id)
    )
)
SELECT vencimento, valor, descricao AS sera_removido
FROM a_remover
ORDER BY vencimento, valor DESC;

-- APLICAR (descomente apos conferir):
/*
WITH grupos AS (
  SELECT
    lf.id,
    lf.descricao,
    COUNT(*) OVER (PARTITION BY lf.valor, lf.vencimento) AS qtd,
    MIN(lf.id)  OVER (PARTITION BY lf.valor, lf.vencimento) AS min_id,
    BOOL_OR(lf.descricao LIKE 'FAT-%') OVER (PARTITION BY lf.valor, lf.vencimento) AS tem_fat
  FROM lancamento_financeiro lf
  WHERE lf.tipo = 'despesa'
    AND lf.deleted_at IS NULL
    AND lf.vencimento >= '2026-05-01'
)
UPDATE lancamento_financeiro
SET deleted_at = NOW()
WHERE id IN (
  SELECT id FROM grupos
  WHERE qtd > 1
    AND (
      (tem_fat AND descricao LIKE 'PARC-%')
      OR
      (NOT tem_fat AND id <> min_id)
    )
);

SELECT 'Removidos: ' || COUNT(*) FROM lancamento_financeiro
WHERE deleted_at::date = CURRENT_DATE AND tipo = 'despesa';
*/
