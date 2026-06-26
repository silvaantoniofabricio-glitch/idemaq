-- Conta Bling (software gestao) — junho 2026 — PJ
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 55.00, 'Software',
  'BRADESCO-PJ-JUN:Bling software gestao jun/2026',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-06-30', '2026-06-30', 0, 'debito'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'BRADESCO-PJ-JUN:Bling software gestao jun/2026' AND deleted_at IS NULL);
