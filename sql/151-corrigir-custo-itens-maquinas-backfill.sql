-- 151-corrigir-custo-itens-maquinas-backfill.sql
-- As 3 máquinas criadas pelo sql/150 usaram valor_unitario (preço de VENDA
-- cobrado no orçamento) como se fosse custo — corrigido no código
-- (useMaquinas.js) pra usar peca.custo_medio/custo_atual, mas os 3
-- registros já inseridos ficaram com o valor antigo (errado). Este script
-- corrige só esses 3, recalculando com a fórmula certa.

-- 1. Como a máquina não guarda o os_id de origem, usamos o número da OS que
--    está no texto de `observacoes` ("...pela OS #1713 (Fabricação).") pra
--    linkar de volta.
WITH maquinas_backfill AS (
  SELECT
    id AS maquina_id,
    custo_itens AS custo_itens_atual,
    (regexp_match(observacoes, 'OS #(\d+)'))[1]::int AS os_numero
  FROM maquina
  WHERE observacoes ILIKE '%backfill%'
),
custo_certo AS (
  SELECT
    mb.maquina_id,
    mb.custo_itens_atual,
    mb.os_numero,
    COALESCE(SUM(oi.quantidade * COALESCE(p.custo_medio, p.custo_atual, 0)), 0) AS custo_itens_correto
  FROM maquinas_backfill mb
  JOIN os o ON o.numero = mb.os_numero AND o.tipo = 'fabricacao'
  LEFT JOIN os_item oi ON oi.os_id = o.id AND oi.categoria = 'peca' AND oi.deleted_at IS NULL
  LEFT JOIN peca p ON p.id = oi.peca_id
  GROUP BY mb.maquina_id, mb.custo_itens_atual, mb.os_numero
)
SELECT * FROM custo_certo ORDER BY os_numero;

-- 2. Aplicar a correção (rodar depois de conferir a consulta 1 acima).
WITH maquinas_backfill AS (
  SELECT
    id AS maquina_id,
    (regexp_match(observacoes, 'OS #(\d+)'))[1]::int AS os_numero
  FROM maquina
  WHERE observacoes ILIKE '%backfill%'
),
custo_certo AS (
  SELECT
    mb.maquina_id,
    COALESCE(SUM(oi.quantidade * COALESCE(p.custo_medio, p.custo_atual, 0)), 0) AS custo_itens_correto
  FROM maquinas_backfill mb
  JOIN os o ON o.numero = mb.os_numero AND o.tipo = 'fabricacao'
  LEFT JOIN os_item oi ON oi.os_id = o.id AND oi.categoria = 'peca' AND oi.deleted_at IS NULL
  LEFT JOIN peca p ON p.id = oi.peca_id
  GROUP BY mb.maquina_id
)
UPDATE maquina m
SET custo_itens = cc.custo_itens_correto
FROM custo_certo cc
WHERE m.id = cc.maquina_id;

-- 3. Conferência final.
SELECT id, modelo, marca, custo_compra, custo_itens, preco_venda, observacoes
FROM maquina
WHERE observacoes ILIKE '%backfill%';
