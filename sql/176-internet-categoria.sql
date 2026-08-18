-- Internet tem categoria propria: "Internet".
--
-- O FleetNet de junho (sql/94) ficou como 'Agua/Luz/Fone' junto com agua e
-- energia. Maio e julho ja usavam 'Internet' — junho estava fora do padrao.
--
-- So a categoria muda.

BEGIN;

UPDATE lancamento_financeiro
SET categoria = 'Internet'
WHERE deleted_at IS NULL
  AND descricao ILIKE '%fleetnet%'
  AND categoria <> 'Internet';

COMMIT;

-- Verificacao: os tres meses devem estar como Internet
SELECT descricao, valor, vencimento, categoria
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao ILIKE '%fleetnet%'
ORDER BY vencimento;
