-- Emprestimo PJ pago pela conta pessoal da Rafaela — junho 2026
-- Fonte: Extrato Rafaela / Aba 3

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1198.00, 'Emprestimo',
  'RAFA-JUN:Emprestimo PJ jun/2026 (pago conta Rafa)',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-06-30', '2026-06-30', 0, 'debito'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'RAFA-JUN:Emprestimo PJ jun/2026 (pago conta Rafa)'
    AND deleted_at IS NULL);

COMMIT;

SELECT descricao, valor, pago_em FROM lancamento_financeiro
WHERE descricao LIKE 'RAFA-JUN:%' AND deleted_at IS NULL;
