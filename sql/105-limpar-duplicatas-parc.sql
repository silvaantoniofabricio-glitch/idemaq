-- Remove duplicatas: mesmo valor + vencimento + numero de parcela (ex: 3/6)
-- Datas no formato DD/MM (ex: 12/05) sao excluidas porque M < N nessas.
-- Dentro de cada grupo: mantém o FAT-* (mensal canonico), remove o PARC-* (sql/71).

-- CONFERIR o que sera apagado:
WITH raw AS (
  -- extrai o primeiro padrao N/M encontrado na descricao
  SELECT
    lf.id, lf.valor, lf.vencimento, lf.descricao,
    (regexp_match(lf.descricao, '(\d+)/(\d+)'))[1] AS n_str,
    (regexp_match(lf.descricao, '(\d+)/(\d+)'))[2] AS m_str
  FROM lancamento_financeiro lf
  WHERE lf.tipo = 'despesa'
    AND lf.deleted_at IS NULL
    AND lf.vencimento >= '2026-05-01'
),
base AS (
  -- mantem so parcelas reais: M >= N (exclui datas DD/MM onde dia > mes)
  SELECT
    id, valor, vencimento, descricao,
    CASE WHEN m_str IS NOT NULL AND m_str::int >= n_str::int
      THEN n_str || '/' || m_str
      ELSE NULL
    END AS parcela
  FROM raw
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
  WHERE b.parcela IS NOT NULL
)
SELECT vencimento, valor, parcela, descricao AS sera_removido
FROM grupos
WHERE qtd > 1 AND rn > 1
ORDER BY vencimento, valor DESC;

-- APLICAR (descomente apos confirmar a lista acima):
/*
WITH raw AS (
  SELECT
    lf.id, lf.valor, lf.vencimento, lf.descricao,
    (regexp_match(lf.descricao, '(\d+)/(\d+)'))[1] AS n_str,
    (regexp_match(lf.descricao, '(\d+)/(\d+)'))[2] AS m_str
  FROM lancamento_financeiro lf
  WHERE lf.tipo = 'despesa'
    AND lf.deleted_at IS NULL
    AND lf.vencimento >= '2026-05-01'
),
base AS (
  SELECT id, valor, vencimento, descricao,
    CASE WHEN m_str IS NOT NULL AND m_str::int >= n_str::int
      THEN n_str || '/' || m_str
      ELSE NULL
    END AS parcela
  FROM raw
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
