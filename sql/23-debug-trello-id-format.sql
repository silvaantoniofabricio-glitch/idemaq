-- Diagnóstico: descobre o formato do trello_id armazenado em os.observacoes.
-- Espera-se ou shortLink (8 chars) ou full id (24 hex chars).

-- 1. Quantas OS têm tag TRELLO-CARD?
SELECT COUNT(*) AS total_com_trello_tag
FROM os WHERE observacoes ILIKE '%TRELLO-CARD:%' AND deleted_at IS NULL;

-- 2. Quantas têm valor_total=0/NULL?
SELECT COUNT(*) AS trello_sem_valor
FROM os
WHERE observacoes ILIKE '%TRELLO-CARD:%'
  AND deleted_at IS NULL
  AND (valor_total IS NULL OR valor_total = 0);

-- 3. Amostra: extrai o trello_id real armazenado em algumas OS
SELECT
  numero,
  valor_total,
  substring(observacoes FROM 'TRELLO-CARD:([a-zA-Z0-9]+)') AS trello_id_capturado,
  length(substring(observacoes FROM 'TRELLO-CARD:([a-zA-Z0-9]+)')) AS tamanho_id
FROM os
WHERE observacoes ILIKE '%TRELLO-CARD:%'
  AND deleted_at IS NULL
ORDER BY criado_em DESC
LIMIT 10;

-- 4. Distribuição: quantas OS com tag têm ID de 8 chars (shortLink) vs 24 chars (full)?
SELECT
  length(substring(observacoes FROM 'TRELLO-CARD:([a-zA-Z0-9]+)')) AS tamanho_id,
  COUNT(*) AS quantas_os
FROM os
WHERE observacoes ILIKE '%TRELLO-CARD:%' AND deleted_at IS NULL
GROUP BY 1
ORDER BY 1;
