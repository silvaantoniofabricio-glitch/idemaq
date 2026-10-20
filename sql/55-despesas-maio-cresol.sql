-- Despesas maio 2026 - Cresol (extrato 138286-1, conta unica do sistema 'Cresol')
-- Fonte: FECHAMENTO MAIO/CRESOL/extrato_17691382861_20260501_20260601.pdf
-- Exclui: fatura Mastercard (Toni lanca itens), emprestimo 18/05 (PF carro), transferencias internas.

BEGIN;

-- Tarifa banco 04/05
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 51.99, 'Tarifa banco', 'CRESOL-MAIO:Pacote Servicos Empresarial 04-mai',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-05-04','2026-05-04', 0, 'debito_automatico'
WHERE NOT EXISTS(
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-MAIO:Pacote Servicos Empresarial 04-mai' AND deleted_at IS NULL
);

-- Salario Alessandro 05/05
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1650.00, 'Funcionarios', 'CRESOL-MAIO:Salario Alessandro',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-05-05','2026-05-05', 0, 'pix'
WHERE NOT EXISTS(
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-MAIO:Salario Alessandro' AND deleted_at IS NULL
);

-- Contabilidade Zion 20/05
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 250.00, 'Contabilidade', 'CRESOL-MAIO:Zion Contabilidade Digital',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-05-20','2026-05-20', 0, 'pix'
WHERE NOT EXISTS(
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-MAIO:Zion Contabilidade Digital' AND deleted_at IS NULL
);

-- Parcela emprestimo PJ 20/05
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1421.71, 'Emprestimo', 'CRESOL-MAIO:Parcela Emprestimo PJ 500100320260372388-2',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-05-20','2026-05-20', 0, 'debito_automatico'
WHERE NOT EXISTS(
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-MAIO:Parcela Emprestimo PJ 500100320260372388-2' AND deleted_at IS NULL
);

-- Compra maquina usada Jane Valeria (saida 30/05, debitou 01/06)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 100.00, 'Compra de maquina', 'CRESOL-MAIO:Jane Valeria - maquina usada para venda',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-05-30','2026-05-30', 0, 'pix'
WHERE NOT EXISTS(
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-MAIO:Jane Valeria - maquina usada para venda' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'CRESOL-MAIO:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
