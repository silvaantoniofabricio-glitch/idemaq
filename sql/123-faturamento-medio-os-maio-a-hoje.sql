-- =============================================================================
-- sql/123 — Faturamento médio por OS concluída, de maio/2026 até hoje
-- Exclui OS de garantia (valor_total = 0 por definição — incluir puxaria a
-- média pra baixo artificialmente, não reflete faturamento real).
-- Valor líquido = valor_total - desconto (mesmo cálculo do relatório de
-- Funcionários). Só leitura.
-- =============================================================================

SELECT
  COUNT(*) AS total_os_concluidas,
  SUM(valor_total - COALESCE(desconto, 0)) AS faturamento_total,
  ROUND(AVG(valor_total - COALESCE(desconto, 0)), 2) AS ticket_medio
FROM os
WHERE deleted_at IS NULL
  AND etapa = 'concluido'
  AND garantia IS NOT TRUE
  AND data_conclusao >= '2026-05-01'
  AND data_conclusao <= now();
