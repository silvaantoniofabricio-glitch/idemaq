-- Despesas maio 2026 - Nubank PJ (conta 686197501-7)
-- Fonte: FECHAMENTO MAIO/NU BANK/NU_6861975017_01MAI2026_30MAI2026.ofx
-- Exclui: faturas cartao (Toni lanca itens), transferencias entre contas, despesas PF.

BEGIN;

-- Garante conta Nubank
INSERT INTO conta_bancaria (nome, tipo)
SELECT 'Nubank', 'digital'
WHERE NOT EXISTS (
  SELECT 1 FROM conta_bancaria WHERE nome = 'Nubank' AND deleted_at IS NULL
);

-- FleetNet (internet)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 119.98, 'Internet', 'NUBANK-MAIO:FleetNet Telecomunicacoes (internet)',
  (SELECT id FROM conta_bancaria WHERE nome='Nubank' LIMIT 1),
  '2026-05-11','2026-05-11', 0, 'boleto'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'NUBANK-MAIO:FleetNet Telecomunicacoes (internet)' AND deleted_at IS NULL);

-- Energisa MS (energia eletrica)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 525.78, 'Energia eletrica', 'NUBANK-MAIO:Energisa MS (luz)',
  (SELECT id FROM conta_bancaria WHERE nome='Nubank' LIMIT 1),
  '2026-05-11','2026-05-11', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'NUBANK-MAIO:Energisa MS (luz)' AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT descricao, valor, pago_em
FROM lancamento_financeiro
WHERE descricao LIKE 'NUBANK-MAIO:%' AND deleted_at IS NULL
ORDER BY pago_em;
