-- Limpeza: soft-delete de despesas antigas de maio/2026 vindas de imports
-- (BLING-PAG e CRESOL1/2 OFX). Mantem TON-TAXA-* (juros maquininha).
-- Apos rodar, lancar sql/55 (Cresol) e sql/56 (MP) com despesas reais dos extratos.

BEGIN;

-- 1. BLING-PAG sem pago_em (15 lixos do import antigo)
UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE descricao LIKE 'BLING-PAG:%'
  AND pago_em IS NULL
  AND deleted_at IS NULL;

-- 2. CRESOL1/CRESOL2 despesas de maio (sera substituido pelos extratos novos)
UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE (descricao LIKE 'CRESOL1-%' OR descricao LIKE 'CRESOL2-%')
  AND tipo = 'despesa'
  AND pago_em >= '2026-05-01'
  AND pago_em <= '2026-05-31'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao: despesas de maio que sobraram
SELECT
  CASE
    WHEN descricao LIKE 'TON-TAXA-%' THEN 'TON-TAXA (manter)'
    WHEN descricao LIKE 'BLING-PAG:%' THEN 'BLING-PAG'
    WHEN descricao LIKE 'CRESOL1-%' THEN 'CRESOL1'
    WHEN descricao LIKE 'CRESOL2-%' THEN 'CRESOL2'
    WHEN descricao LIKE 'CRESOL-MAIO:%' THEN 'CRESOL-MAIO (novo)'
    WHEN descricao LIKE 'MP-MAIO:%' THEN 'MP-MAIO (novo)'
    ELSE 'OUTRO'
  END as origem,
  COUNT(*) as qtd,
  SUM(valor) as total
FROM lancamento_financeiro
WHERE tipo = 'despesa'
  AND deleted_at IS NULL
  AND (
    (pago_em >= '2026-05-01' AND pago_em <= '2026-05-31')
    OR
    (vencimento >= '2026-05-01' AND vencimento <= '2026-05-31')
  )
GROUP BY origem
ORDER BY total DESC NULLS LAST;
