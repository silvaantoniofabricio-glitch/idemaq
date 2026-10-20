-- =============================================================================
-- sql/207 — Receita e despesa PJ por mês (maio a setembro/2026), pra calcular
-- média de entradas, média de saídas e quanto faturar pra sobrar R$ 4.500.
-- Mês pelo vencimento (padrão usado nos fechamentos). PF não entra
-- (vive em controleFinanceiroPF.js, não nesta tabela). Só leitura.
-- =============================================================================

-- 1) Totais por mês
SELECT
  to_char(date_trunc('month', vencimento), 'YYYY-MM') AS mes,
  SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END) AS receita,
  SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END) AS despesa,
  SUM(CASE WHEN tipo = 'receita' THEN valor ELSE -valor END) AS resultado
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND vencimento >= '2026-05-01' AND vencimento < '2026-10-01'
GROUP BY 1
ORDER BY 1;

-- 2) Despesa por categoria e mês (pra conferir se tem algo que não é custo
--    de operação, tipo transferência ou pagamento de fatura duplicado)
SELECT
  COALESCE(categoria, '(sem categoria)') AS categoria,
  to_char(date_trunc('month', vencimento), 'YYYY-MM') AS mes,
  SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND tipo = 'despesa'
  AND vencimento >= '2026-05-01' AND vencimento < '2026-10-01'
GROUP BY 1, 2
ORDER BY 1, 2;
