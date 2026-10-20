-- Corrige forma_pagamento da Sueli: dinheiro -> pix
-- Comprovante confirma PIX 26/06/2026 09:31 para Cresol IDEMAQ

UPDATE lancamento_financeiro
SET forma_pagamento = 'pix'
WHERE deleted_at IS NULL
  AND tipo = 'receita'
  AND valor = 240
  AND pago_em = '2026-06-26'
  AND descricao ILIKE '%sueli%';

SELECT id, descricao, valor, pago_em, forma_pagamento
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND tipo = 'receita'
  AND valor = 240
  AND pago_em = '2026-06-26'
  AND descricao ILIKE '%sueli%';
