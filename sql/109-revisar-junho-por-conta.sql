-- Todos os lancamentos de junho/2026 ativos, agrupados por conta
-- Use para conferir contra faturas e extratos reais

SELECT
  cb.nome AS conta,
  lf.vencimento,
  lf.tipo,
  lf.valor,
  lf.descricao,
  lf.categoria,
  lf.pago_em,
  lf.forma_pagamento
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL
  AND (
    (lf.vencimento BETWEEN '2026-06-01' AND '2026-06-30')
    OR
    (lf.pago_em BETWEEN '2026-06-01' AND '2026-06-30')
  )
ORDER BY cb.nome, lf.vencimento, lf.tipo DESC, lf.valor DESC;
