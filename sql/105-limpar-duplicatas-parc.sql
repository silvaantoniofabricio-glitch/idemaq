-- Remove duplicatas: mesmo valor + vencimento + numero de parcela (ex: 3/6)
-- Itens sem parcela na descricao ou com parcelas diferentes NAO sao tocados.
-- Dentro de cada grupo duplicado: mantém o FAT-* (lancamento mensal canonico),
-- remove o PARC-* (lancamento futuro do sql/71).

-- CONFERIR o que sera apagado:
WITH base AS (
  SELECT
    lf.id,
    lf.valor,
    lf.vencimento,
    lf.descricao,
    -- extrai o numero de parcela "N/M" da descricao (ex: "3/6" -> "3/6")
    (regexp_match(lf.descricao, '\d+/\d+'))[1] AS parcela
  FROM lancamento_financeiro lf
  WHERE lf.tipo = 'despesa'
    AND lf.deleted_at IS NULL
    AND lf.vencimento >= '2026-05-01'
),
grupos AS (
  SELECT
    b.id, b.valor, b.vencimento, b.descricao, b.parcela,
    COUNT(*) OVER (PARTITION BY b.valor, b.vencimento, b.parcela) AS qtd,
    ROW_NUMBER() OVER (
      PARTITION BY b.valor, b.vencimento, b.parcela
      ORDER BY CASE WHEN b.descricao LIKE 'FAT-%' THEN 0 ELSE 1 END
    ) AS rn
  FROM base b
  WHERE b.parcela IS NOT NULL  -- so compara itens que tem N/M na descricao
)
SELECT vencimento, valor, parcela, descricao AS sera_removido
FROM grupos
WHERE qtd > 1 AND rn > 1
ORDER BY vencimento, valor DESC;

-- APLICAR (descomente apos conferir a lista acima):
/*
WITH base AS (
  SELECT lf.id, lf.valor, lf.vencimento, lf.descricao,
    (regexp_match(lf.descricao, '\d+/\d+'))[1] AS parcela
  FROM lancamento_financeiro lf
  WHERE lf.tipo = 'despesa'
    AND lf.deleted_at IS NULL
    AND lf.vencimento >= '2026-05-01'
),
grupos AS (
  SELECT b.id,
    COUNT(*) OVER (PARTITION BY b.valor, b.vencimento, b.parcela) AS qtd,
    ROW_NUMBER() OVER (
      PARTITION BY b.valor, b.vencimento, b.parcela
      ORDER BY CASE WHEN b.descricao LIKE 'FAT-%' THEN 0 ELSE 1 END
    ) AS rn
  FROM base b
  WHERE b.parcela IS NOT NULL
)
UPDATE lancamento_financeiro
SET deleted_at = NOW()
WHERE id IN (
  SELECT id FROM grupos WHERE qtd > 1 AND rn > 1
);

SELECT 'Removidos: ' || COUNT(*) AS resultado
FROM lancamento_financeiro
WHERE deleted_at::date = CURRENT_DATE AND tipo = 'despesa';
*/
