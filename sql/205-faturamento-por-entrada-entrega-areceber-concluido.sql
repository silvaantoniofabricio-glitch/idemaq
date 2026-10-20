-- =============================================================================
-- sql/205 — OS "fechadas" por mês = primeira vez que a OS entrou em Entrega,
-- A receber ou Concluído (pelo os_historico). Sem garantia real. Mostra
-- quantidade, valor cobrado, valor já pago de fato e ticket médio.
-- Só leitura, não altera nada.
-- =============================================================================

WITH primeira AS (
  SELECT h.os_id, MIN(h.data) AS entrou
  FROM os_historico h
  WHERE h.etapa_para IN ('entrega', 'pagamento', 'concluido')
  GROUP BY h.os_id
)
SELECT
  to_char(date_trunc('month', p.entrou), 'YYYY-MM') AS mes,
  COUNT(*) AS os_fechadas,
  SUM(COALESCE(o.valor_total, 0) - COALESCE(o.desconto, 0)) AS cobrado,
  SUM(COALESCE(o.valor_pago, 0)) AS pago_de_fato,
  ROUND(AVG(COALESCE(o.valor_total, 0) - COALESCE(o.desconto, 0)), 2) AS ticket_medio,
  CEIL(15000 / NULLIF(AVG(COALESCE(o.valor_total, 0) - COALESCE(o.desconto, 0)), 0)) AS os_para_15k
FROM primeira p
JOIN os o ON o.id = p.os_id
WHERE o.deleted_at IS NULL
  AND o.garantia IS NOT TRUE
  AND p.entrou >= '2026-07-01' AND p.entrou < '2026-10-01'
GROUP BY 1
ORDER BY 1;
