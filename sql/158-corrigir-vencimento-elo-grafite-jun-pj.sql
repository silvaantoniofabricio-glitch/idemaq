-- Corrige vencimento dos itens FAT-ELO-GRAFITE-JUN de volta pra 11/06/2026.
-- Historico: sql/144 (criado e depois descartado nesta sessao) mudou esses
-- itens pra vencimento 11/07/2026 — o codigo (controleFinanceiroPF.js) foi
-- revertido de volta pra junho, mas o banco (PJ) ficou com a data errada,
-- causando inconsistencia entre PF (junho) e PJ (julho) pro mesmo lote.

BEGIN;

UPDATE lancamento_financeiro
SET vencimento = '2026-06-11', pago_em = '2026-06-11'
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento, pago_em
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%' AND deleted_at IS NULL
ORDER BY valor DESC;
