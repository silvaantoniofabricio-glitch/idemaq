-- Mostra TODOS os lancamentos ativos pra cada grupo com valor+vencimento duplicado
-- (sem filtro de N/M) — pra identificar o par de cada item suspeito

SELECT
  lf.vencimento,
  lf.valor,
  lf.descricao,
  lf.pago_em,
  cb.nome AS conta
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.tipo = 'despesa'
  AND lf.deleted_at IS NULL
  AND (lf.valor, lf.vencimento) IN (
    -- grupos com exatamente 2+ entradas (sem filtro N/M)
    SELECT valor, vencimento
    FROM lancamento_financeiro
    WHERE tipo = 'despesa'
      AND deleted_at IS NULL
      AND vencimento >= '2026-05-01'
    GROUP BY valor, vencimento
    HAVING COUNT(*) > 1
  )
  -- filtra so os casos suspeitos sem N/M na descricao
  AND lf.descricao !~ '\d+/\d+'
ORDER BY lf.vencimento, lf.valor DESC, lf.descricao;
