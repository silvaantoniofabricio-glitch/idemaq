-- Quantas OS com cada formato de TRELLO-CARD têm valor_total = 0/NULL?
-- Isso me diz quais REALMENTE precisam de enriquecimento.

SELECT
  length(substring(observacoes FROM 'TRELLO-CARD:([a-zA-Z0-9]+)')) AS tamanho_id,
  COUNT(*) AS total_os,
  COUNT(*) FILTER (WHERE valor_total IS NULL OR valor_total = 0) AS sem_valor,
  COUNT(*) FILTER (WHERE valor_total > 0) AS com_valor,
  SUM(valor_total) AS soma_total
FROM os
WHERE observacoes ILIKE '%TRELLO-CARD:%' AND deleted_at IS NULL
GROUP BY 1
ORDER BY 1;

-- Amostra de OS com full id (24-hex) e valor=0 (alvo do 23b)
SELECT
  numero,
  valor_total,
  substring(observacoes FROM 'TRELLO-CARD:([a-zA-Z0-9]+)') AS trello_id_capturado,
  substring(observacoes FROM 1 FOR 200) AS obs_inicio
FROM os
WHERE observacoes ILIKE '%TRELLO-CARD:%'
  AND length(substring(observacoes FROM 'TRELLO-CARD:([a-zA-Z0-9]+)')) = 24
  AND (valor_total IS NULL OR valor_total = 0)
  AND deleted_at IS NULL
LIMIT 5;
