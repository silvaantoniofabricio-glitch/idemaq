-- 156-backfill-maquina-os-1761.sql
-- Cria retroativamente a máquina da OS #1761 (Fabricação, Gesiel,
-- BRASTEMP BWK12BANA) que não entrou no estoque por causa do bug do
-- moverOS (corrigido em 12/08/2026). Mesma fórmula de custo do sql/151
-- (custo real da peça no catálogo, não o preço de venda cobrado no orçamento).

WITH alvo AS (
  SELECT id, numero, marca_equipamento, modelo_equipamento, valor_total
  FROM os
  WHERE numero = 1761
),
custo AS (
  SELECT oi.os_id, COALESCE(SUM(oi.quantidade * COALESCE(p.custo_medio, p.custo_atual, 0)), 0) AS custo_itens
  FROM os_item oi
  JOIN alvo a ON a.id = oi.os_id
  LEFT JOIN peca p ON p.id = oi.peca_id
  WHERE oi.categoria = 'peca' AND oi.deleted_at IS NULL
  GROUP BY oi.os_id
)
INSERT INTO maquina (modelo, marca, estado, custo_compra, custo_itens, custo_servico, preco_venda, observacoes)
SELECT
  a.modelo_equipamento, a.marca_equipamento, 'disponivel',
  COALESCE(a.valor_total, 0), COALESCE(c.custo_itens, 0), 0, 0,
  'Gerada retroativamente (backfill) pela OS #' || a.numero || ' (Fabricação) — bug do moverOS.'
FROM alvo a
LEFT JOIN custo c ON c.os_id = a.id;

UPDATE os SET maquina_criada = true WHERE numero = 1761;

-- Conferência.
SELECT modelo, marca, estado, custo_compra, custo_itens, preco_venda, observacoes
FROM maquina
WHERE observacoes ILIKE '%OS #1761%';
