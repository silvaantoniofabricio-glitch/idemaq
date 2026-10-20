-- LIMPEZA: soft-delete de TODAS as entradas e saidas com data em 2024.
-- Apos rodar, so sobra:
--   - maio/2026 (revisado por nos)
--   - junho/2026 (Paula + Sueli a receber)

BEGIN;

UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND (
    (pago_em >= '2024-01-01' AND pago_em <= '2024-12-31')
    OR (pago_em IS NULL AND vencimento >= '2024-01-01' AND vencimento <= '2024-12-31')
  );

COMMIT;

-- Verificacao
SELECT
  to_char(COALESCE(pago_em, vencimento), 'YYYY-MM') as mes,
  tipo,
  COUNT(*) as qtd,
  ROUND(SUM(valor)::numeric, 2) as total
FROM lancamento_financeiro
WHERE deleted_at IS NULL
GROUP BY mes, tipo
ORDER BY mes, tipo;
