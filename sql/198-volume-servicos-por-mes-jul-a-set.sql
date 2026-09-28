-- =============================================================================
-- sql/198 — Volume de serviço por mês (jul-set/2026), independente da régua de
-- pontos: conta OS finalizadas e etapas concluídas (os_historico) por mês e
-- por funcionário. Objetivo: checar se houve queda real de serviço realizado
-- depois de julho (quando o Gui bateu a meta de 900 pts), ou se foi a régua
-- de pontos que ficou mais dura. Só leitura, não altera nada.
-- =============================================================================

-- 1) Etapas concluídas por mês e por funcionário (todo movimento no Kanban)
SELECT
  to_char(date_trunc('month', h.data), 'YYYY-MM') AS mes,
  u.apelido,
  COUNT(*) AS etapas_concluidas,
  COUNT(DISTINCT h.os_id) AS os_distintas
FROM os_historico h
LEFT JOIN usuarios u ON u.id = h.funcionario_id
WHERE h.data >= '2026-07-01' AND h.data < '2026-10-01'
GROUP BY 1, 2
ORDER BY 1, 3 DESC;

-- 2) OS finalizadas por mês (independente de quem fez)
SELECT
  to_char(date_trunc('month', o.data_conclusao), 'YYYY-MM') AS mes,
  COUNT(*) AS os_finalizadas,
  SUM(COALESCE(o.valor_total, 0) - COALESCE(o.desconto, 0)) AS faturamento
FROM os o
WHERE o.etapa IN ('concluido', 'entrega')
  AND o.deleted_at IS NULL
  AND o.data_conclusao >= '2026-07-01' AND o.data_conclusao < '2026-10-01'
GROUP BY 1
ORDER BY 1;
