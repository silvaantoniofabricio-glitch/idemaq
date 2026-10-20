-- Mostra PARC-* de junho lado a lado com FAT-*-JUN do mesmo mes
-- Objetivo: identificar visualmente quais PARC-* duplicam um FAT-*-JUN

-- 1) Todos os PARC-* com vencimento em junho (lancados pelo sql/71)
SELECT 'PARC' AS origem, vencimento, valor, descricao, pago_em
FROM lancamento_financeiro
WHERE tipo = 'despesa'
  AND deleted_at IS NULL
  AND descricao LIKE 'PARC-%'
  AND vencimento BETWEEN '2026-06-01' AND '2026-06-30'
ORDER BY vencimento, valor DESC;

-- 2) Todos os FAT-*-JUN (lancados pelas SQLs mensais de junho)
SELECT 'FAT' AS origem, vencimento, valor, descricao, pago_em
FROM lancamento_financeiro
WHERE tipo = 'despesa'
  AND deleted_at IS NULL
  AND (descricao LIKE 'FAT-%JUN%' OR descricao LIKE '%-JUN:%')
  AND vencimento BETWEEN '2026-06-01' AND '2026-06-30'
ORDER BY vencimento, valor DESC;
