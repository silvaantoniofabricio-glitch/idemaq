-- ============================================================
-- SQL COMBINADO — todos os pendentes de confirmacao ate agora.
-- Seguro rodar mesmo que algum ja tenha sido aplicado antes
-- (todos idempotentes: INSERT usa WHERE NOT EXISTS, UPDATE so
-- afeta linhas que ainda nao foram alteradas).
-- Ordem importa: correcao do tenis (149) vem antes da baixa (150).
-- ============================================================

-- ── 1) sql/149 — corrige tenis New Balance (estava como PJ/Pecas) ──
BEGIN;
UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE descricao = 'FAT-MP-JUL:ML Consultor 08/07 1/8'
  AND deleted_at IS NULL;
COMMIT;

-- ── 2) sql/152 — Fatura Cresol Mastercard junho (13 itens PJ, R$662,77) ──
BEGIN;
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-CRESOL-MASTER-JUN:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-06-20', '2026-06-20', 0, 'credito_parcelado'
FROM (VALUES
  (43.50, 'Pecas',               'Casa dos Parafusos 26/05'),
  (30.00, 'Materiais de limpeza','Limpeel Casa Carro 25/05'),
  (72.99, 'Pecas',               'ML Regisla 16/05'),
  (20.00, 'Software',            'Anthropic Claude 14/05'),
  (33.33, 'Materiais de limpeza','Limpeel Casa Carro 14/05 1/3 (a)'),
  (53.33, 'Materiais de limpeza','Limpeel Casa Carro 14/05 1/3 (b)'),
  (10.95, 'Software',            'Anthropic Claude 13/05'),
  (15.00, 'Software',            'Anthropic Claude 12/05 (a)'),
  (28.98, 'Software',            'Anthropic Claude 12/05 (b)'),
  (10.21, 'Software',            'Anthropic Claude 12/05 (c)'),
  (23.70, 'Pecas',               'Casa dos Parafusos 12/05'),
  (10.70, 'Software',            'Anthropic Claude 12/05 (d)'),
  (20.00, 'Software',            'Anthropic Claude 12/05 (e)'),
  (40.50, 'Pecas',               'ML Mercado 15/04 2/6'),
  (14.96, 'Equipamentos',        'Ton.com.br (maquininha) 14/04 2/12'),
  (26.70, 'Pecas',               'ML Assiste 09/04 2/4'),
  (27.00, 'Pecas',               'ML Mercado 09/04 2/4'),
  (26.63, 'Pecas',               'ML Refripe 08/04 2/3'),
  (34.30, 'Pecas',               'Mercado Refripecas 02/04 2/5'),
  (119.99,'Materiais',           'Deposito ST Catarina 13/03 2/10')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-CRESOL-MASTER-JUN:' || v.item AND deleted_at IS NULL);
COMMIT;

-- ── 3) sql/154 — eSocial jun/2026 (INSS+FGTS), pago do Bradesco PF ──
BEGIN;
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 599.76, 'Impostos', 'ESOCIAL-JUN:INSS+FGTS competencia 06/2026', NULL,
  '2026-07-20', '2026-07-20', 0, 'pix'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'ESOCIAL-JUN:INSS+FGTS competencia 06/2026' AND deleted_at IS NULL
);
COMMIT;

-- ── 4) sql/155 — parcela emprestimo Cresol PJ 20/07 ──
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

-- ── 5) sql/156 — FleetNet Telecomunicacoes (Nubank PF, PJ) ──
BEGIN;
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 119.98, 'Agua/Luz/Fone', 'FAT-NUBANK-PF-JUL10:FleetNet Telecomunicacoes',
  (SELECT id FROM conta_bancaria WHERE nome='Nubank' LIMIT 1),
  '2026-07-10', '2026-07-10', 0, 'credito_1x'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-PF-JUL10:FleetNet Telecomunicacoes' AND deleted_at IS NULL
);
COMMIT;

-- ── 6) sql/157 — Pagamento Carro BV (emprestimo PJ, Rafa) ──
BEGIN;
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1182.12, 'Emprestimo', 'RAFA-JUL:Pagamento Carro BV 05/07', NULL,
  '2026-07-05', '2026-07-05', 0, 'debito'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'RAFA-JUL:Pagamento Carro BV 05/07' AND deleted_at IS NULL
);
COMMIT;

-- ── 7) sql/150 — baixa (marca pago_em) MP+Inter jun/jul ──
BEGIN;
UPDATE lancamento_financeiro
SET pago_em = vencimento
WHERE (
  descricao LIKE 'FAT-MP-JUL:%'
  OR descricao LIKE 'FAT-INTER-JUL:%'
  OR descricao LIKE 'FAT-MP-JUN:%'
  OR descricao LIKE 'FAT-INTER-JUN:%'
)
  AND deleted_at IS NULL
  AND pago_em IS NULL;
COMMIT;

-- ============================================================
-- VERIFICACAO FINAL — roda tudo e confere os 7 itens de uma vez
-- ============================================================
SELECT 'tenis removido?' AS item, descricao, valor, deleted_at IS NOT NULL AS ok
FROM lancamento_financeiro WHERE descricao = 'FAT-MP-JUL:ML Consultor 08/07 1/8'
UNION ALL
SELECT 'cresol master jun', descricao, valor, true FROM lancamento_financeiro
  WHERE descricao LIKE 'FAT-CRESOL-MASTER-JUN:%' AND deleted_at IS NULL
UNION ALL
SELECT 'esocial', descricao, valor, true FROM lancamento_financeiro
  WHERE descricao = 'ESOCIAL-JUN:INSS+FGTS competencia 06/2026' AND deleted_at IS NULL
UNION ALL
SELECT 'emprestimo cresol pj', descricao, valor, true FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-JUL:Parcela emprestimo Cresol PJ 20/07' AND deleted_at IS NULL
UNION ALL
SELECT 'fleetnet', descricao, valor, true FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-PF-JUL10:FleetNet Telecomunicacoes' AND deleted_at IS NULL
UNION ALL
SELECT 'carro bv', descricao, valor, true FROM lancamento_financeiro
  WHERE descricao = 'RAFA-JUL:Pagamento Carro BV 05/07' AND deleted_at IS NULL
UNION ALL
SELECT 'baixa mp/inter pendentes', descricao, valor, (pago_em IS NOT NULL) FROM lancamento_financeiro
  WHERE (descricao LIKE 'FAT-MP-JUL:%' OR descricao LIKE 'FAT-INTER-JUL:%'
      OR descricao LIKE 'FAT-MP-JUN:%' OR descricao LIKE 'FAT-INTER-JUN:%')
    AND deleted_at IS NULL AND pago_em IS NULL;
