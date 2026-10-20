-- Despesas maio 2026 - Mercado Pago
-- Fonte: FECHAMENTO MAIO/MERCADO PAGO/*.jpeg
-- Exclui: fatura cartao MP (Toni lanca itens), transferencias internas, Dinheiro reservado/retirado.

BEGIN;

-- Garante conta Mercado Pago
INSERT INTO conta_bancaria (nome, tipo)
SELECT 'Mercado Pago', 'digital'
WHERE NOT EXISTS (
  SELECT 1 FROM conta_bancaria WHERE nome = 'Mercado Pago' AND deleted_at IS NULL
);

-- Salario Guilherme (PIX 1410 + dinheiro 240 = 1650)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1650.00, 'Funcionarios', 'MP-MAIO:Salario Guilherme (PIX 1410 + dinheiro 240)',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-05-05','2026-05-05', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao = 'MP-MAIO:Salario Guilherme (PIX 1410 + dinheiro 240)' AND deleted_at IS NULL);

-- Mercado Livre - compra de pecas
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 43.91, 'Pecas', 'MP-MAIO:Mercado Livre',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-05-08','2026-05-08', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao = 'MP-MAIO:Mercado Livre' AND deleted_at IS NULL);

-- Bling (pagamento via Itau Unibanco)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 55.00, 'Software', 'MP-MAIO:Bling (cobranca via Itau)',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-05-09','2026-05-09', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao = 'MP-MAIO:Bling (cobranca via Itau)' AND deleted_at IS NULL);

-- Claude.ai subscription
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 113.85, 'Software', 'MP-MAIO:Claude.ai subscription',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-05-09','2026-05-09', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao = 'MP-MAIO:Claude.ai subscription' AND deleted_at IS NULL);

-- Anthropic 12/5 (3 pagamentos)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 20.70, 'Software', 'MP-MAIO:Anthropic 12/05 (1)',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-05-12','2026-05-12', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao = 'MP-MAIO:Anthropic 12/05 (1)' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 15.53, 'Software', 'MP-MAIO:Anthropic 12/05 (2)',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-05-12','2026-05-12', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao = 'MP-MAIO:Anthropic 12/05 (2)' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 20.70, 'Software', 'MP-MAIO:Anthropic 12/05 (3)',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-05-12','2026-05-12', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao = 'MP-MAIO:Anthropic 12/05 (3)' AND deleted_at IS NULL);

-- Junta Comercial
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 39.00, 'Taxas', 'MP-MAIO:Junta Comercial do Estado',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-05-19','2026-05-19', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro WHERE descricao = 'MP-MAIO:Junta Comercial do Estado' AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'MP-MAIO:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
