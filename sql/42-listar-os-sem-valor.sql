-- sql/42-listar-os-sem-valor.sql
-- Dump completo das 30 OS sem valor pra decidir como preencher.
-- Junta com cliente + 1ª item (descrição do serviço) pra ter contexto.

SELECT
  o.numero,
  o.tipo,
  o.etapa,
  o.criado_em::date AS data,
  c.nome AS cliente,
  c.telefone,
  (SELECT string_agg(oi.nome, ' | ' ORDER BY oi.criado_em)
   FROM os_item oi
   WHERE oi.os_id = o.id AND oi.deleted_at IS NULL
   LIMIT 3) AS itens,
  substring(o.observacoes FROM 1 FOR 150) AS observacoes
FROM os o
LEFT JOIN cliente c ON c.id = o.cliente_id
WHERE o.observacoes ILIKE '%[REVISAR-VALOR]%'
  AND o.deleted_at IS NULL
ORDER BY o.criado_em DESC;
