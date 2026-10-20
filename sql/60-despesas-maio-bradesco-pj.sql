-- Despesas maio 2026 - Bradesco PJ (Ag 1373 / Conta 40990-1)
-- Fonte: FECHAMENTO MAIO/BRADESCO PJ/extrato.xlsx
-- Exclui: fatura cartao (Toni lanca itens), transferencias internas.

BEGIN;

-- Garante conta Bradesco PJ
INSERT INTO conta_bancaria (nome, tipo)
SELECT 'Bradesco PJ', 'corrente'
WHERE NOT EXISTS (
  SELECT 1 FROM conta_bancaria WHERE nome = 'Bradesco PJ' AND deleted_at IS NULL
);

-- IOF utilizacao limite 05/05
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 0.05, 'Tarifa banco', 'BRADESCO-PJ-MAIO:IOF utilizacao limite',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-05-05','2026-05-05', 0, 'debito_automatico'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'BRADESCO-PJ-MAIO:IOF utilizacao limite' AND deleted_at IS NULL);

-- Eletro Garrincha (capacitor)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 40.00, 'Pecas', 'BRADESCO-PJ-MAIO:Eletro Garrincha (capacitor)',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-05-06','2026-05-06', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'BRADESCO-PJ-MAIO:Eletro Garrincha (capacitor)' AND deleted_at IS NULL);

-- Tarifa Bradesco MEI 15/05
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 52.60, 'Tarifa banco', 'BRADESCO-PJ-MAIO:Tarifa Bradesco MEI',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-05-15','2026-05-15', 0, 'debito_automatico'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'BRADESCO-PJ-MAIO:Tarifa Bradesco MEI' AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT descricao, valor, pago_em
FROM lancamento_financeiro
WHERE descricao LIKE 'BRADESCO-PJ-MAIO:%' AND deleted_at IS NULL
ORDER BY pago_em;
