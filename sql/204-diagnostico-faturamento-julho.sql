-- =============================================================================
-- sql/204 — Por que o "faturamento" de julho deu R$ 20.460 se o caixa real
-- foi menor? Quebra as OS concluídas em julho (sem garantia) por tipo e
-- situação de pagamento, comparando valor cobrado x valor pago, e depois
-- mostra o que realmente entrou como receita no financeiro em julho.
-- Só leitura, não altera nada.
-- =============================================================================

-- 1) OS concluídas em julho: cobrado x pago, por tipo e situação do pagamento
SELECT
  COALESCE(o.tipo, 'atendimento') AS tipo,
  o.pago,
  COUNT(*) AS n,
  SUM(COALESCE(o.valor_total, 0) - COALESCE(o.desconto, 0)) AS cobrado,
  SUM(COALESCE(o.valor_pago, 0)) AS pago_de_fato
FROM os o
WHERE o.etapa IN ('concluido', 'entrega')
  AND o.deleted_at IS NULL
  AND o.garantia IS NOT TRUE
  AND o.data_conclusao >= '2026-07-01' AND o.data_conclusao < '2026-08-01'
GROUP BY 1, 2
ORDER BY cobrado DESC;

-- 2) Receita lançada no financeiro em julho (o que realmente entrou)
SELECT
  COUNT(*) AS lancamentos,
  SUM(valor) AS total_receita_pago
FROM lancamento_financeiro
WHERE tipo = 'receita'
  AND deleted_at IS NULL
  AND pago_em >= '2026-07-01' AND pago_em < '2026-08-01';
