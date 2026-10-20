-- Registra pagamento da Sueli Da Silva Carvalho (R$240) recebido em 26/06/2026
-- pago_em estava NULL, Toni confirmou que recebeu nessa data

-- CONFERIR antes de aplicar:
SELECT id, descricao, valor, tipo, vencimento, pago_em, forma_pagamento
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND tipo = 'receita'
  AND valor = 240
  AND pago_em IS NULL
  AND descricao ILIKE '%sueli%';

-- APLICAR (descomente após confirmar):
/*
UPDATE lancamento_financeiro
SET pago_em = '2026-06-26'
WHERE deleted_at IS NULL
  AND tipo = 'receita'
  AND valor = 240
  AND pago_em IS NULL
  AND descricao ILIKE '%sueli%';

SELECT 'Atualizado: ' || COUNT(*) AS resultado
FROM lancamento_financeiro
WHERE pago_em = '2026-06-26'
  AND tipo = 'receita'
  AND valor = 240
  AND descricao ILIKE '%sueli%';
*/
