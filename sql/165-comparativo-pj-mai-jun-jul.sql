-- Comparativo de despesas PJ (pagas) por categoria — Maio, Junho, Julho 2026.
-- Usa pago_em (nao vencimento) pra refletir o mes em que a saida efetivamente ocorreu.

SELECT
  to_char(pago_em, 'YYYY-MM') AS mes,
  categoria,
  COUNT(*) AS qtd,
  SUM(valor) AS total
FROM lancamento_financeiro
WHERE tipo = 'despesa'
  AND deleted_at IS NULL
  AND pago_em IS NOT NULL
  AND pago_em >= '2026-05-01'
  AND pago_em <  '2026-08-01'
GROUP BY mes, categoria
ORDER BY mes, total DESC;

-- Totais gerais por mes (visao rapida)
SELECT
  to_char(pago_em, 'YYYY-MM') AS mes,
  COUNT(*) AS qtd,
  SUM(valor) AS total
FROM lancamento_financeiro
WHERE tipo = 'despesa'
  AND deleted_at IS NULL
  AND pago_em IS NOT NULL
  AND pago_em >= '2026-05-01'
  AND pago_em <  '2026-08-01'
GROUP BY mes
ORDER BY mes;
