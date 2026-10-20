-- =============================================================================
-- sql/203 — Ticket médio e quantas OS faltam pra R$ 15 mil, SEM as OS de
-- garantia real (garantia = true). Garantia que foi faturada já foi
-- convertida pra garantia = false (sql/201 e botão do Resumo), então entra
-- normal. Só leitura, não altera nada.
-- =============================================================================

SELECT
  to_char(date_trunc('month', o.data_conclusao), 'YYYY-MM') AS mes,
  COUNT(*) AS os_finalizadas,
  SUM(COALESCE(o.valor_total, 0) - COALESCE(o.desconto, 0)) AS faturamento,
  ROUND(AVG(COALESCE(o.valor_total, 0) - COALESCE(o.desconto, 0)), 2) AS ticket_medio,
  CEIL(15000 / NULLIF(AVG(COALESCE(o.valor_total, 0) - COALESCE(o.desconto, 0)), 0)) AS os_para_15k
FROM os o
WHERE o.etapa IN ('concluido', 'entrega')
  AND o.deleted_at IS NULL
  AND o.garantia IS NOT TRUE
  AND o.data_conclusao >= '2026-07-01' AND o.data_conclusao < '2026-10-01'
GROUP BY 1
ORDER BY 1;
