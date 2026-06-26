-- Emprestimo PJ pago pela conta pessoal da Rafaela — maio 2026
-- Mesmo padrao do sql/95 (junho). Valor R$1.198 assumido igual.

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1198.00, 'Emprestimo',
  'RAFA-MAI:Emprestimo PJ mai/2026 (pago conta Rafa)',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-05-20', '2026-05-20', 0, 'debito'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'RAFA-MAI:Emprestimo PJ mai/2026 (pago conta Rafa)'
    AND deleted_at IS NULL);

SELECT descricao, valor, pago_em FROM lancamento_financeiro
WHERE descricao LIKE 'RAFA-MAI:%' AND deleted_at IS NULL;
