-- Faturamento junho 2026: todas as receitas recebidas (pago_em em junho)
-- + receitas com vencimento em junho ainda não pagas

-- 1) RECEITAS RECEBIDAS EM JUNHO (base do faturamento real)
SELECT
  descricao,
  valor,
  vencimento,
  pago_em,
  forma_pagamento,
  categoria
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND tipo = 'receita'
  AND pago_em BETWEEN '2026-06-01' AND '2026-06-30'
ORDER BY pago_em, valor DESC;

-- 2) TOTAL RECEBIDO EM JUNHO
SELECT
  COUNT(*) AS qtd,
  SUM(valor) AS total_recebido
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND tipo = 'receita'
  AND pago_em BETWEEN '2026-06-01' AND '2026-06-30';

-- 3) RECEITAS COM VENCIMENTO EM JUNHO AINDA SEM pago_em (a receber / em aberto)
SELECT
  descricao,
  valor,
  vencimento,
  pago_em,
  categoria
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND tipo = 'receita'
  AND vencimento BETWEEN '2026-06-01' AND '2026-06-30'
  AND pago_em IS NULL
ORDER BY vencimento;
