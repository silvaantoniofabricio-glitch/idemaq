-- 161-custo-pecas-os-1816.sql
-- SÓ LEITURA. Custo real (catálogo) das peças usadas na OS #1816, vs o
-- preço de venda cobrado no orçamento.

SELECT
  oi.nome,
  oi.quantidade,
  oi.valor_unitario AS preco_venda_unit,
  COALESCE(p.custo_medio, p.custo_atual, 0) AS custo_unit,
  oi.quantidade * oi.valor_unitario AS total_venda,
  oi.quantidade * COALESCE(p.custo_medio, p.custo_atual, 0) AS total_custo
FROM os_item oi
JOIN os o ON o.id = oi.os_id
LEFT JOIN peca p ON p.id = oi.peca_id
WHERE o.numero = 1816
  AND oi.categoria = 'peca'
  AND oi.deleted_at IS NULL
ORDER BY oi.nome;

-- Totais.
SELECT
  SUM(oi.quantidade * oi.valor_unitario) AS total_venda_pecas,
  SUM(oi.quantidade * COALESCE(p.custo_medio, p.custo_atual, 0)) AS total_custo_pecas
FROM os_item oi
JOIN os o ON o.id = oi.os_id
LEFT JOIN peca p ON p.id = oi.peca_id
WHERE o.numero = 1816
  AND oi.categoria = 'peca'
  AND oi.deleted_at IS NULL;
