-- sql/34-amostras-suspeitas.sql
-- Mostra amostras das 3 categorias suspeitas (PIX enviado, Despesa diversa,
-- Pagamento) pra Toni decidir quais filtrar como "pessoal" / "fatura cartão".

-- 1. Top 30 maiores valores PIX ENVIADO
SELECT
  data,
  valor,
  substring(descricao FROM 1 FOR 100) AS descricao
FROM vw_dre_real
WHERE tipo='despesa' AND categoria = 'PIX enviado'
ORDER BY valor DESC
LIMIT 30;

-- 2. Top 30 DESPESA DIVERSA
SELECT
  data,
  valor,
  substring(descricao FROM 1 FOR 100) AS descricao
FROM vw_dre_real
WHERE tipo='despesa' AND categoria = 'Despesa diversa'
ORDER BY valor DESC
LIMIT 30;

-- 3. Top 30 PAGAMENTO
SELECT
  data,
  valor,
  substring(descricao FROM 1 FOR 100) AS descricao
FROM vw_dre_real
WHERE tipo='despesa' AND categoria = 'Pagamento'
ORDER BY valor DESC
LIMIT 30;

-- 4. Agrupamento por DESTINATÁRIO no PIX enviado (extraído de "DES: NOME")
SELECT
  TRIM(substring(descricao FROM 'DES: ([^0-9]+?)(?:\s+\d|$)')) AS destinatario,
  COUNT(*) AS qtd,
  SUM(valor) AS soma
FROM vw_dre_real
WHERE tipo='despesa'
  AND categoria = 'PIX enviado'
  AND descricao LIKE '%DES:%'
GROUP BY 1
HAVING SUM(valor) > 1000
ORDER BY soma DESC
LIMIT 30;
