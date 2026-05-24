-- Confere se um mesmo "principal" foi usado pra múltiplas duplicatas (overmatching).
-- Se sim, a heurística sobrestima e precisa de DISTINCT ON pelo principal também.

SELECT
  cenario,
  COUNT(*) AS total_pares,
  COUNT(DISTINCT id_principal) AS principais_unicos,
  COUNT(*) - COUNT(DISTINCT id_principal) AS overmatch
FROM lancamento_duplicata
GROUP BY cenario
ORDER BY overmatch DESC;

-- Top 5 "principais" que foram apontados por mais duplicatas (overmatch real)
SELECT
  id_principal,
  COUNT(*) AS qtd_duplicatas_apontando,
  (SELECT valor FROM lancamento_financeiro WHERE id = id_principal) AS valor_principal,
  (SELECT vencimento FROM lancamento_financeiro WHERE id = id_principal) AS data_principal,
  (SELECT substring(descricao FROM 1 FOR 60) FROM lancamento_financeiro WHERE id = id_principal) AS descricao
FROM lancamento_duplicata
GROUP BY id_principal
HAVING COUNT(*) > 1
ORDER BY qtd_duplicatas_apontando DESC
LIMIT 5;
