-- Amostra dos PIX enviados que NÃO têm padrão "DES: nome".
-- Mostra primeiros 30 chars do histórico pra entender o padrão.

SELECT
  substring(descricao FROM 1 FOR 80) AS descricao_inicio,
  COUNT(*) AS qtd,
  SUM(valor) AS soma
FROM vw_dre_real
WHERE tipo='despesa'
  AND categoria = 'PIX enviado'
  AND descricao NOT LIKE '%DES:%'
GROUP BY 1
ORDER BY soma DESC
LIMIT 40;
