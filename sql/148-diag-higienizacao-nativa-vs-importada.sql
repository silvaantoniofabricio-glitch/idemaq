-- 148-diag-higienizacao-nativa-vs-importada.sql
-- SÓ LEITURA. O filtro de Higienização em /vendas continua só pegando OS
-- importadas mesmo depois da correção do código (regex já aceita
-- "limpez" e "higieniz", categoria aceita NULL ou 'servico'). Precisa ver
-- o dado real pra achar a causa.

-- 1. Todos os itens com "limpez" ou "higieniz" no nome, com os dados
--    exatos que o filtro do Vendas usa (nome, categoria, deleted_at) +
--    se a OS é importada (tem tag BLING-PEDIDO/TRELLO-CARD nas observações).
SELECT
  oi.id            AS item_id,
  oi.os_id,
  o.numero         AS os_numero,
  oi.nome,
  oi.categoria,
  oi.deleted_at    AS item_deleted_at,
  o.deleted_at     AS os_deleted_at,
  (o.observacoes ILIKE '%BLING-PEDIDO:%' OR o.observacoes ILIKE '%TRELLO-CARD:%') AS eh_importada
FROM os_item oi
JOIN os o ON o.id = oi.os_id
WHERE (oi.nome ILIKE '%limpez%' OR oi.nome ILIKE '%higieniz%')
ORDER BY eh_importada, o.numero DESC
LIMIT 50;

-- 2. Conferir se RLS do os_item deixa passar linha com categoria='servico'
--    (não só NULL) pro usuário logado como dono — roda como você mesmo,
--    autenticado no SQL Editor.
SELECT count(*) AS total_visivel_servico
FROM os_item
WHERE categoria = 'servico' AND deleted_at IS NULL;

SELECT count(*) AS total_visivel_null
FROM os_item
WHERE categoria IS NULL AND deleted_at IS NULL;
