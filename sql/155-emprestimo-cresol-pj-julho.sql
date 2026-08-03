-- Parcela emprestimo Cresol PJ - 20/07/2026 - R$1.421,71
-- Confirmado por Toni: emprestimo da empresa (PJ).
-- Fonte: extrato Cresol PJ (138286-1) julho 2026.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1421.71, 'Emprestimo', 'CRESOL-JUL:Parcela emprestimo Cresol PJ 20/07',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-07-20', '2026-07-20', 0, 'debito'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-JUL:Parcela emprestimo Cresol PJ 20/07' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE descricao = 'CRESOL-JUL:Parcela emprestimo Cresol PJ 20/07' AND deleted_at IS NULL;
