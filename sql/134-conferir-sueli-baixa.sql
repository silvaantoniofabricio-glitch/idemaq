-- Confere se o pago_em da Sueli foi atualizado corretamente
SELECT id, descricao, valor, tipo, vencimento, pago_em, forma_pagamento, deleted_at
FROM lancamento_financeiro
WHERE descricao ILIKE '%sueli%'
  AND deleted_at IS NULL
ORDER BY vencimento;
