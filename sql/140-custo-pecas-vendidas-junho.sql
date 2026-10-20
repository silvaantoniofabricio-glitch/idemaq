-- sql/140-custo-pecas-vendidas-junho.sql
-- CMV (Custo da Mercadoria Vendida) de junho/2026 — custo real das peças
-- efetivamente aplicadas nas OS pagas em junho, não das compradas em junho.
-- Diferente de "peças compradas no mês" (R$5.385,55, via despesa) porque
-- peça pode ter sido comprada num mês e usada/vendida em outro.
--
-- Usa custo_medio (mais representativo do consumo real) com fallback pra
-- custo_atual quando custo_medio não estiver preenchido.
-- Só leitura — não altera nada.

-- QUERY 1 — CMV total + quantas peças ficam sem custo rastreável
WITH linhas AS (
  SELECT
    i.id AS item_id, i.os_id, i.peca_id, i.nome,
    i.valor_unitario, COALESCE(i.quantidade, 1) AS qtd
  FROM os_item i
  JOIN lancamento_financeiro lf ON lf.os_id = i.os_id
    AND lf.tipo = 'receita' AND lf.deleted_at IS NULL
    AND COALESCE(lf.pago_em, lf.vencimento) BETWEEN '2026-06-01' AND '2026-06-30'
  WHERE i.categoria = 'peca' AND i.deleted_at IS NULL
),
comCusto AS (
  SELECT l.*, COALESCE(p.custo_medio, p.custo_atual, 0) AS custo_unit
  FROM linhas l
  LEFT JOIN peca p ON p.id = l.peca_id AND p.deleted_at IS NULL
)
SELECT
  COUNT(*)                                                        AS total_itens_peca,
  COUNT(*) FILTER (WHERE peca_id IS NULL OR custo_unit = 0)        AS itens_sem_custo_rastreavel,
  ROUND(SUM(valor_unitario * qtd), 2)                              AS receita_pecas_vendidas,
  ROUND(SUM(custo_unit * qtd), 2)                                  AS cmv_pecas_vendidas,
  ROUND(SUM(valor_unitario * qtd) - SUM(custo_unit * qtd), 2)      AS margem_bruta_pecas,
  ROUND(
    CASE WHEN SUM(custo_unit * qtd) > 0
      THEN SUM(valor_unitario * qtd) / NULLIF(SUM(custo_unit * qtd), 0)
      ELSE NULL END
  , 2) AS markup_medio_real
FROM comCusto;

-- QUERY 2 — detalhe por peça (pra conferir item a item)
WITH linhas AS (
  SELECT
    i.id AS item_id, i.os_id, i.peca_id, i.nome,
    i.valor_unitario, COALESCE(i.quantidade, 1) AS qtd
  FROM os_item i
  JOIN lancamento_financeiro lf ON lf.os_id = i.os_id
    AND lf.tipo = 'receita' AND lf.deleted_at IS NULL
    AND COALESCE(lf.pago_em, lf.vencimento) BETWEEN '2026-06-01' AND '2026-06-30'
  WHERE i.categoria = 'peca' AND i.deleted_at IS NULL
)
SELECT
  l.nome, l.qtd, l.valor_unitario,
  COALESCE(p.custo_medio, p.custo_atual, 0) AS custo_unit,
  ROUND(l.valor_unitario * l.qtd, 2) AS receita_linha,
  ROUND(COALESCE(p.custo_medio, p.custo_atual, 0) * l.qtd, 2) AS custo_linha,
  CASE WHEN l.peca_id IS NULL THEN 'sem vínculo c/ estoque' ELSE NULL END AS aviso
FROM linhas l
LEFT JOIN peca p ON p.id = l.peca_id AND p.deleted_at IS NULL
ORDER BY receita_linha DESC;
