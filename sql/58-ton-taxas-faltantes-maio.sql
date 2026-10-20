-- Taxas maquininhas faltantes de maio:
-- TON: Nelci 23/05 + Hellen 28/05 (vendas posteriores ao import sql/27)
-- InfinitePay: Larissa 07/05 + Solange 29/05 (nunca importadas como despesa separada)

BEGIN;

-- TON Nelci R$ 655 - 3x Mastercard
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 40.02, 'Taxas pagas', 'TON-TAXA-20260523-65500 Mastercard 3x',
  (SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),
  '2026-05-23','2026-05-23', 0, 'credito_parcelado'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'TON-TAXA-20260523-65500 Mastercard 3x' AND deleted_at IS NULL);

-- TON Hellen R$ 360 - 3x Mastercard
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 22.00, 'Taxas pagas', 'TON-TAXA-20260528-36000 Mastercard 3x',
  (SELECT id FROM conta_bancaria WHERE nome='Ton Black' LIMIT 1),
  '2026-05-28','2026-05-28', 0, 'credito_parcelado'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'TON-TAXA-20260528-36000 Mastercard 3x' AND deleted_at IS NULL);

-- InfinitePay Larissa R$ 535 - Link 1x (taxa 4,2% = 22,47)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 22.47, 'Taxas pagas', 'INFINITEPAY-TAXA-20260507-53500 Link 1x',
  (SELECT id FROM conta_bancaria WHERE nome='InfinitePay' LIMIT 1),
  '2026-05-07','2026-05-07', 0, 'link_pagamento'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'INFINITEPAY-TAXA-20260507-53500 Link 1x' AND deleted_at IS NULL);

-- InfinitePay Solange R$ 185 - Credito 1x (taxa 3,146% = 5,82)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 5.82, 'Taxas pagas', 'INFINITEPAY-TAXA-20260529-18500 Credito 1x',
  (SELECT id FROM conta_bancaria WHERE nome='InfinitePay' LIMIT 1),
  '2026-05-29','2026-05-29', 0, 'credito_1x'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'INFINITEPAY-TAXA-20260529-18500 Credito 1x' AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT descricao, valor, pago_em
FROM lancamento_financeiro
WHERE (descricao LIKE 'TON-TAXA-2026052%' OR descricao LIKE 'INFINITEPAY-TAXA-202605%')
  AND deleted_at IS NULL
ORDER BY pago_em;
