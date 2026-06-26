-- Comparação PJ: maio vs junho 2026 por categoria
-- Rode no Supabase SQL Editor

WITH maio AS (
  SELECT categoria, SUM(valor) AS total
  FROM lancamento_financeiro
  WHERE tipo = 'despesa'
    AND vencimento >= '2026-05-01' AND vencimento <= '2026-05-31'
    AND deleted_at IS NULL
  GROUP BY categoria
),
junho AS (
  SELECT categoria, SUM(valor) AS total
  FROM lancamento_financeiro
  WHERE tipo = 'despesa'
    AND vencimento >= '2026-06-01' AND vencimento <= '2026-06-30'
    AND deleted_at IS NULL
  GROUP BY categoria
),
todas AS (
  SELECT COALESCE(m.categoria, j.categoria) AS categoria,
         COALESCE(m.total, 0) AS maio,
         COALESCE(j.total, 0) AS junho,
         COALESCE(j.total, 0) - COALESCE(m.total, 0) AS diferenca
  FROM maio m
  FULL OUTER JOIN junho j USING (categoria)
)
SELECT categoria,
       ROUND(maio::numeric, 2)      AS maio,
       ROUND(junho::numeric, 2)     AS junho,
       ROUND(diferenca::numeric, 2) AS diferenca,
       CASE WHEN maio > 0 THEN ROUND((diferenca / maio * 100)::numeric, 0) || '%' ELSE 'nova' END AS var_pct
FROM todas
ORDER BY ABS(diferenca) DESC;
