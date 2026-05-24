-- sql/36-pix-residual.sql
-- Lista destinatários PIX que ainda têm valor relevante após reclassificação.
-- Mostra próximos 40 (depois do top 20 já visto).

SELECT
  TRIM(substring(descricao FROM 'DES: ([^0-9]+?)(?:\s+\d|$)')) AS destinatario,
  COUNT(*) AS qtd,
  SUM(valor) AS soma
FROM vw_dre_real
WHERE tipo='despesa'
  AND categoria = 'PIX enviado'  -- só os que NÃO foram reclassificados no sql/35
  AND descricao LIKE '%DES:%'
GROUP BY 1
HAVING SUM(valor) > 300
ORDER BY soma DESC
LIMIT 50;

-- Resumo: quanto ainda falta classificar
SELECT
  COUNT(*) AS qtd_lancamentos,
  SUM(valor) AS soma,
  COUNT(DISTINCT TRIM(substring(descricao FROM 'DES: ([^0-9]+?)(?:\s+\d|$)'))) AS destinatarios_unicos
FROM vw_dre_real
WHERE tipo='despesa'
  AND categoria = 'PIX enviado';
