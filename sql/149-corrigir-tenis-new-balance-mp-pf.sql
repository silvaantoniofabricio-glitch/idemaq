-- Correcao: "ML Consultor 08/07 1/8" (sql/148) foi lancado como PJ (Pecas),
-- mas na verdade e um tenis New Balance 480 comprado por Toni (compra
-- pessoal no cartao PJ). "Consultor" e so o nome do vendedor no Mercado Livre.
-- Confirmado pelo comprovante: R$347,94 em 8x R$43,49, comprado 08/07,
-- entregue 13/07.
--
-- Remove o lancamento PJ (soft-delete). O item PF equivalente ja foi
-- adicionado no array PF de julho em controleFinanceiroPF.js.

BEGIN;

UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE descricao = 'FAT-MP-JUL:ML Consultor 08/07 1/8'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, deleted_at
FROM lancamento_financeiro
WHERE descricao = 'FAT-MP-JUL:ML Consultor 08/07 1/8';
