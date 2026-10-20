-- LIMPEZA: soft-delete de TODAS as entradas e saidas com data em
-- jan/2025 a abr/2026, conforme decisao do Toni em 01/06/2026.
-- Motivo: imports automaticos (Cresol OFX, Bling, InfinitePay) com qualidade
-- duvidosa. So ficam dados confiaveis:
--   - maio/2026 (revisado item a item por Toni + assistente)
--   - jan-dez/2024 (NAO mexer agora - Toni nao mencionou; pode ser revisto depois)
-- OS antigas (tabela os) ficam intactas - so finanças sao limpas.

BEGIN;

-- Marca soft-delete em lancamentos com pago_em no periodo
UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND pago_em IS NOT NULL
  AND pago_em >= '2025-01-01'
  AND pago_em <= '2026-04-30';

-- Marca soft-delete em lancamentos abertos (pago_em null) com vencimento no periodo
UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE deleted_at IS NULL
  AND pago_em IS NULL
  AND vencimento IS NOT NULL
  AND vencimento >= '2025-01-01'
  AND vencimento <= '2026-04-30';

COMMIT;

-- Verificacao: lancamentos ativos por mes apos limpeza
SELECT
  to_char(COALESCE(pago_em, vencimento), 'YYYY-MM') as mes,
  tipo,
  COUNT(*) as qtd,
  ROUND(SUM(valor)::numeric, 2) as total
FROM lancamento_financeiro
WHERE deleted_at IS NULL
GROUP BY mes, tipo
ORDER BY mes, tipo;
