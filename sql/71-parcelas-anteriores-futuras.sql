-- sql/71-parcelas-anteriores-futuras.sql
-- Parcelas passadas (pagas) e futuras (abertas) dos cartoes de credito PJ
-- Baseado nas faturas de maio/2026 (sql/62-67)
-- Parcela atual (maio): ja inserida nos sql/62-67 com prefixo FAT-
-- Este SQL usa prefixo PARC- para distinguir
-- Passadas: pago_em = vencimento (paga na data do boleto)
-- Futuras: pago_em = NULL (aberta, a vencer)
-- NOTA: parcelas anteriores a mai/2026 serao inseridas mesmo que o periodo
--       tenha sido limpo por sql/69+70 (reconstrucao historica dos parcelamentos)

BEGIN;

-- ============================================================
-- ELO GRAFITE BRADESCO (venc. dia 11, conta: Bradesco PJ)
-- Fatura maio = 2026-05-11 | P_atual ja em FAT-ELO-GRAFITE-MAIO
-- ============================================================

-- ML Autochave 7/12 | R$52.96 | P1=2025-11-11
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 52.96, 'Pecas', 'PARC-ELO-GRAFITE:ML Autochave ' || n || '/12',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2025-11-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 7 THEN ('2025-11-11'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,12) n WHERE n <> 7
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:ML Autochave ' || n || '/12' AND deleted_at IS NULL);

-- ML 525003907 6/9 | R$21.44 | P1=2025-12-11
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 21.44, 'Pecas', 'PARC-ELO-GRAFITE:ML 525003907 ' || n || '/9',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2025-12-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 6 THEN ('2025-12-11'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,9) n WHERE n <> 6
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:ML 525003907 ' || n || '/9' AND deleted_at IS NULL);

-- ML AFCCOMERC 6/9 | R$28.66 | P1=2025-12-11
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 28.66, 'Pecas', 'PARC-ELO-GRAFITE:ML AFCCOMERC ' || n || '/9',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2025-12-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 6 THEN ('2025-12-11'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,9) n WHERE n <> 6
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:ML AFCCOMERC ' || n || '/9' AND deleted_at IS NULL);

-- JIM Wellynton embreagem Montana 5/10 | R$94.44 | P1=2026-01-11
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 94.44, 'Pecas', 'PARC-ELO-GRAFITE:JIM Wellynton Montana ' || n || '/10',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-01-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 5 THEN ('2026-01-11'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,10) n WHERE n <> 5
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:JIM Wellynton Montana ' || n || '/10' AND deleted_at IS NULL);

-- Deposito ST Catarina reforma 2/10 | R$124.30 | P1=2026-04-11
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 124.30, 'Materiais', 'PARC-ELO-GRAFITE:Deposito ST Catarina reforma ' || n || '/10',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-04-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 2 THEN ('2026-04-11'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,10) n WHERE n <> 2
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:Deposito ST Catarina reforma ' || n || '/10' AND deleted_at IS NULL);

-- EC DIMAKMAQUINA 2/6 | R$48.16 | P1=2026-04-11
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 48.16, 'Pecas', 'PARC-ELO-GRAFITE:EC DIMAKMAQUINA ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-04-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 2 THEN ('2026-04-11'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 2
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:EC DIMAKMAQUINA ' || n || '/6' AND deleted_at IS NULL);

-- EC ML 11/02 2/6 | R$45.16 | P1=2026-04-11
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 45.16, 'Pecas', 'PARC-ELO-GRAFITE:EC ML 11fev ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-04-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 2 THEN ('2026-04-11'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 2
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:EC ML 11fev ' || n || '/6' AND deleted_at IS NULL);

-- Imperio da Construcao 2/6 | R$141.50 | P1=2026-04-11
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 141.50, 'Materiais', 'PARC-ELO-GRAFITE:Imperio da Construcao ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-04-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 2 THEN ('2026-04-11'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 2
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:Imperio da Construcao ' || n || '/6' AND deleted_at IS NULL);

-- EC ML 09/03 1/4 | R$35.49 | P1=2026-05-11 (so futuras)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 35.49, 'Pecas', 'PARC-ELO-GRAFITE:EC ML 09mar ' || n || '/4',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-05-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  NULL,
  0, 'credito_parcelado'
FROM generate_series(2,4) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:EC ML 09mar ' || n || '/4' AND deleted_at IS NULL);

-- ML Eletron 1/10 | R$86.90 | P1=2026-05-11 (so futuras)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 86.90, 'Pecas', 'PARC-ELO-GRAFITE:ML Eletron ' || n || '/10',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-05-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  NULL,
  0, 'credito_parcelado'
FROM generate_series(2,10) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:ML Eletron ' || n || '/10' AND deleted_at IS NULL);

-- Ilha Grande Materiais 3/4 | R$31.25 | P1=2026-03-11
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 31.25, 'Materiais', 'PARC-ELO-GRAFITE:Ilha Grande Materiais ' || n || '/4',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-03-11'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-11'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,4) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-ELO-GRAFITE:Ilha Grande Materiais ' || n || '/4' AND deleted_at IS NULL);


-- ============================================================
-- VISA BRADESCO NEO PLATINUM (venc. dia 20, conta: Bradesco PJ)
-- Fatura maio = 2026-05-20
-- ============================================================

-- Casa dos Parafusos 28/01 3/4 | R$61.00 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 61.00, 'Pecas', 'PARC-VISA-BRAD:Casa Parafusos 28jan ' || n || '/4',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,4) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-VISA-BRAD:Casa Parafusos 28jan ' || n || '/4' AND deleted_at IS NULL);

-- Casa dos Parafusos 06/02 3/4 | R$60.00 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 60.00, 'Pecas', 'PARC-VISA-BRAD:Casa Parafusos 06fev ' || n || '/4',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,4) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-VISA-BRAD:Casa Parafusos 06fev ' || n || '/4' AND deleted_at IS NULL);

-- Armazem 1,99 06/02 3/4 | R$69.98 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 69.98, 'Pecas', 'PARC-VISA-BRAD:Armazem 1,99 06fev ' || n || '/4',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,4) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-VISA-BRAD:Armazem 1,99 06fev ' || n || '/4' AND deleted_at IS NULL);

-- Limpeel Casa Carro 24/03 2/3 | R$48.63 | P1=2026-04-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 48.63, 'Materiais de limpeza', 'PARC-VISA-BRAD:Limpeel 24mar ' || n || '/3',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-04-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 2 THEN ('2026-04-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,3) n WHERE n <> 2
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-VISA-BRAD:Limpeel 24mar ' || n || '/3' AND deleted_at IS NULL);


-- ============================================================
-- INTER (venc. dia 26, conta: Inter)
-- Fatura maio = 2026-05-26
-- ============================================================

-- Limpeel Casa Carro 24/04 1/3 | R$56.20 | P1=2026-05-26 (so futuras: P2-3)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 56.20, 'Materiais de limpeza', 'PARC-INTER:Limpeel 24abr ' || n || '/3',
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  ('2026-05-26'::date + ((n-1) * INTERVAL '1 month'))::date,
  NULL,
  0, 'credito_parcelado'
FROM generate_series(2,3) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-INTER:Limpeel 24abr ' || n || '/3' AND deleted_at IS NULL);

-- JIM COM Berti Autoca 03/03 3/4 | R$118.09 | P1=2026-03-26
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 118.09, 'Pecas', 'PARC-INTER:JIM Berti Autoca 03mar ' || n || '/4',
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  ('2026-03-26'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-26'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,4) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-INTER:JIM Berti Autoca 03mar ' || n || '/4' AND deleted_at IS NULL);

-- Navirai Bateria 10/03 3/3 | R$123.33 | P1=2026-03-26 (ultima — so passadas)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 123.33, 'Pecas', 'PARC-INTER:Navirai Bateria 10mar ' || n || '/3',
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  ('2026-03-26'::date + ((n-1) * INTERVAL '1 month'))::date,
  ('2026-03-26'::date + ((n-1) * INTERVAL '1 month'))::date,
  0, 'credito_parcelado'
FROM generate_series(1,2) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-INTER:Navirai Bateria 10mar ' || n || '/3' AND deleted_at IS NULL);

-- MLP Magalu Carrefour 23/02 3/7 | R$343.62 | P1=2026-03-26
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 343.62, 'Garantia/Reposicao', 'PARC-INTER:MLP Magalu Carrefour 23fev ' || n || '/7',
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  ('2026-03-26'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-26'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,7) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-INTER:MLP Magalu Carrefour 23fev ' || n || '/7' AND deleted_at IS NULL);


-- ============================================================
-- BRADESCO PJ ELO MAIS (venc. dia 10, conta: Bradesco PJ)
-- Fatura maio = 2026-05-10
-- ============================================================

-- Pronto Paulo Cesar AD 27/02 2/10 | R$107.40 | P1=2026-04-10
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 107.40, 'Servicos/Manutencao', 'PARC-BRAD-PJ-ELO:Pronto Paulo Cesar 27fev ' || n || '/10',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  ('2026-04-10'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 2 THEN ('2026-04-10'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,10) n WHERE n <> 2
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-BRAD-PJ-ELO:Pronto Paulo Cesar 27fev ' || n || '/10' AND deleted_at IS NULL);

-- Pronto Paulo Cesar AD 30/03 1/2 | R$106.00 | P1=2026-05-10 (so futura: P2)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 106.00, 'Servicos/Manutencao', 'PARC-BRAD-PJ-ELO:Pronto Paulo Cesar 30mar 2/2',
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-06-10',
  NULL,
  0, 'credito_parcelado'
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-BRAD-PJ-ELO:Pronto Paulo Cesar 30mar 2/2' AND deleted_at IS NULL);


-- ============================================================
-- MERCADO PAGO (venc. dia 20, conta: Mercado Pago)
-- Fatura maio = 2026-05-20
-- ============================================================

-- ML 28Produtos 23/10 18/18 | R$87.90 | P1=2024-12-20 (ultima — so passadas P1-17)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 87.90, 'Pecas', 'PARC-MP:ML 28Produtos 23out ' || n || '/18',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2024-12-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  ('2024-12-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  0, 'credito_parcelado'
FROM generate_series(1,17) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML 28Produtos 23out ' || n || '/18' AND deleted_at IS NULL);

-- ML EbazarComBR 20/05 12/12 | R$157.42 | P1=2025-06-20 (ultima — so passadas P1-11)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 157.42, 'Pecas', 'PARC-MP:ML EbazarComBR 20mai ' || n || '/12',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2025-06-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  ('2025-06-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  0, 'credito_parcelado'
FROM generate_series(1,11) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML EbazarComBR 20mai ' || n || '/12' AND deleted_at IS NULL);

-- MP 2Produtos 02/07 11/11 | R$23.52 | P1=2025-07-20 (ultima — so passadas P1-10)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 23.52, 'Pecas', 'PARC-MP:MP 2Produtos 02jul ' || n || '/11',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2025-07-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  ('2025-07-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  0, 'credito_parcelado'
FROM generate_series(1,10) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:MP 2Produtos 02jul ' || n || '/11' AND deleted_at IS NULL);

-- ML EbazarComBR 06/09 9/9 | R$13.60 | P1=2025-09-20 (ultima — so passadas P1-8)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 13.60, 'Pecas', 'PARC-MP:ML EbazarComBR 06set ' || n || '/9',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2025-09-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  ('2025-09-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  0, 'credito_parcelado'
FROM generate_series(1,8) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML EbazarComBR 06set ' || n || '/9' AND deleted_at IS NULL);

-- ML MercadoLi 04/11 7/11 | R$32.85 | P1=2025-11-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 32.85, 'Pecas', 'PARC-MP:ML MercadoLi 04nov ' || n || '/11',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2025-11-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 7 THEN ('2025-11-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,11) n WHERE n <> 7
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLi 04nov ' || n || '/11' AND deleted_at IS NULL);

-- ML MercadoLivre 05/11 7/7 | R$7.42 | P1=2025-11-20 (ultima — so passadas P1-6)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 7.42, 'Pecas', 'PARC-MP:ML MercadoLivre 05nov ' || n || '/7',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2025-11-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  ('2025-11-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  0, 'credito_parcelado'
FROM generate_series(1,6) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 05nov ' || n || '/7' AND deleted_at IS NULL);

-- ML Ismafer 01/12 6/7 | R$22.84 | P1=2025-12-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 22.84, 'Ferramentas', 'PARC-MP:ML Ismafer 01dez ' || n || '/7',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2025-12-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 6 THEN ('2025-12-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,7) n WHERE n <> 6
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML Ismafer 01dez ' || n || '/7' AND deleted_at IS NULL);

-- ML LojaDoMecanico 01/12 6/18 | R$78.64 | P1=2025-12-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 78.64, 'Pecas', 'PARC-MP:ML LojaDoMecanico 01dez ' || n || '/18',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2025-12-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 6 THEN ('2025-12-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,18) n WHERE n <> 6
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML LojaDoMecanico 01dez ' || n || '/18' AND deleted_at IS NULL);

-- ML MercadoLivre 05/12 6/7 | R$23.71 | P1=2025-12-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 23.71, 'Pecas', 'PARC-MP:ML MercadoLivre 05dez ' || n || '/7',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2025-12-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 6 THEN ('2025-12-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,7) n WHERE n <> 6
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 05dez ' || n || '/7' AND deleted_at IS NULL);

-- ML MercadoLivre 27/12 5/6 | R$17.48 | P1=2026-01-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 17.48, 'Pecas', 'PARC-MP:ML MercadoLivre 27dez ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-01-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 5 THEN ('2026-01-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 5
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 27dez ' || n || '/6' AND deleted_at IS NULL);

-- ML AT4U 08/01 5/6 | R$23.33 | P1=2026-01-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 23.33, 'Pecas', 'PARC-MP:ML AT4U 08jan ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-01-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 5 THEN ('2026-01-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 5
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML AT4U 08jan ' || n || '/6' AND deleted_at IS NULL);

-- ML DSSRefrigera 08/01 5/6 | R$24.98 | P1=2026-01-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 24.98, 'Pecas', 'PARC-MP:ML DSSRefrigera 08jan ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-01-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 5 THEN ('2026-01-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 5
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML DSSRefrigera 08jan ' || n || '/6' AND deleted_at IS NULL);

-- ML MercadoLivre 02/02 4/5 | R$16.63 | P1=2026-02-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 16.63, 'Pecas', 'PARC-MP:ML MercadoLivre 02fev-a ' || n || '/5',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 4 THEN ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,5) n WHERE n <> 4
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 02fev-a ' || n || '/5' AND deleted_at IS NULL);

-- ML MercadoLi 02/02 4/4 | R$11.37 | P1=2026-02-20 (ultima — so passadas P1-3)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 11.37, 'Pecas', 'PARC-MP:ML MercadoLi 02fev ' || n || '/4',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  0, 'credito_parcelado'
FROM generate_series(1,3) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLi 02fev ' || n || '/4' AND deleted_at IS NULL);

-- ML MercadoLivre 02/02 4/4 | R$14.84 | P1=2026-02-20 (ultima — so passadas P1-3)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 14.84, 'Pecas', 'PARC-MP:ML MercadoLivre 02fev-b ' || n || '/4',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  0, 'credito_parcelado'
FROM generate_series(1,3) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 02fev-b ' || n || '/4' AND deleted_at IS NULL);

-- ML MercadoLi 04/02 4/8 | R$27.48 | P1=2026-02-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 27.48, 'Pecas', 'PARC-MP:ML MercadoLi 04fev ' || n || '/8',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 4 THEN ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,8) n WHERE n <> 4
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLi 04fev ' || n || '/8' AND deleted_at IS NULL);

-- ML EletroUti 04/02 4/6 | R$24.31 | P1=2026-02-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 24.31, 'Pecas', 'PARC-MP:ML EletroUti 04fev ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 4 THEN ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 4
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML EletroUti 04fev ' || n || '/6' AND deleted_at IS NULL);

-- ML MercadoLivre 05/02 4/11 | R$40.90 | P1=2026-02-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 40.90, 'Pecas', 'PARC-MP:ML MercadoLivre 05fev ' || n || '/11',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 4 THEN ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,11) n WHERE n <> 4
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 05fev ' || n || '/11' AND deleted_at IS NULL);

-- ML PSMarket 09/02 4/6 | R$19.98 | P1=2026-02-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 19.98, 'Pecas', 'PARC-MP:ML PSMarket 09fev ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 4 THEN ('2026-02-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 4
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML PSMarket 09fev ' || n || '/6' AND deleted_at IS NULL);

-- ML MercadoLivre 21/02 3/4 | R$13.97 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 13.97, 'Pecas', 'PARC-MP:ML MercadoLivre 21fev-a ' || n || '/4',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,4) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 21fev-a ' || n || '/4' AND deleted_at IS NULL);

-- ML MercadoLivre 21/02 3/6 | R$17.48 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 17.48, 'Pecas', 'PARC-MP:ML MercadoLivre 21fev-b ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 21fev-b ' || n || '/6' AND deleted_at IS NULL);

-- ML MercadoLivre 03/03 3/8 | R$35.85 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 35.85, 'Pecas', 'PARC-MP:ML MercadoLivre 03mar ' || n || '/8',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,8) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 03mar ' || n || '/8' AND deleted_at IS NULL);

-- ML PED 05/03 3/5 | R$14.84 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 14.84, 'Pecas', 'PARC-MP:ML PED 05mar ' || n || '/5',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,5) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML PED 05mar ' || n || '/5' AND deleted_at IS NULL);

-- ML ConsertoMaq 05/03 3/6 | R$20.27 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 20.27, 'Pecas', 'PARC-MP:ML ConsertoMaq 05mar ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML ConsertoMaq 05mar ' || n || '/6' AND deleted_at IS NULL);

-- ML ElliMaqPecas 05/03 3/6 | R$16.87 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 16.87, 'Pecas', 'PARC-MP:ML ElliMaqPecas 05mar ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,6) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML ElliMaqPecas 05mar ' || n || '/6' AND deleted_at IS NULL);

-- ML MercadoLi 06/03 3/8 (a) | R$25.24 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 25.24, 'Pecas', 'PARC-MP:ML MercadoLi 06mar-a ' || n || '/8',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,8) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLi 06mar-a ' || n || '/8' AND deleted_at IS NULL);

-- ML MercadoLi 06/03 3/8 (b) | R$27.48 | P1=2026-03-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 27.48, 'Pecas', 'PARC-MP:ML MercadoLi 06mar-b ' || n || '/8',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 3 THEN ('2026-03-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,8) n WHERE n <> 3
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLi 06mar-b ' || n || '/8' AND deleted_at IS NULL);

-- ML MercadoLivre 31/03 2/8 | R$30.50 | P1=2026-04-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 30.50, 'Pecas', 'PARC-MP:ML MercadoLivre 31mar ' || n || '/8',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-04-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 2 THEN ('2026-04-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,8) n WHERE n <> 2
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 31mar ' || n || '/8' AND deleted_at IS NULL);

-- ML MercadoLivre 02/04 2/8 | R$23.67 | P1=2026-04-20
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 23.67, 'Pecas', 'PARC-MP:ML MercadoLivre 02abr ' || n || '/8',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-04-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  CASE WHEN n < 2 THEN ('2026-04-20'::date + ((n-1) * INTERVAL '1 month'))::date ELSE NULL END,
  0, 'credito_parcelado'
FROM generate_series(1,8) n WHERE n <> 2
AND NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLivre 02abr ' || n || '/8' AND deleted_at IS NULL);

-- ML GelMaq 02/05 1/6 | R$65.29 | P1=2026-05-20 (so futuras P2-6)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 65.29, 'Pecas', 'PARC-MP:ML GelMaq 02mai ' || n || '/6',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-05-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  NULL,
  0, 'credito_parcelado'
FROM generate_series(2,6) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML GelMaq 02mai ' || n || '/6' AND deleted_at IS NULL);

-- ML MercadoLi 06/05 1/5 | R$51.39 | P1=2026-05-20 (so futuras P2-5)
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 51.39, 'Pecas', 'PARC-MP:ML MercadoLi 06mai ' || n || '/5',
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  ('2026-05-20'::date + ((n-1) * INTERVAL '1 month'))::date,
  NULL,
  0, 'credito_parcelado'
FROM generate_series(2,5) n
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'PARC-MP:ML MercadoLi 06mai ' || n || '/5' AND deleted_at IS NULL);

COMMIT;

-- ============================================================
-- Verificacao geral
-- ============================================================
SELECT
  CASE WHEN pago_em IS NOT NULL THEN 'Pagas (historico)' ELSE 'Abertas (futuras)' END as status,
  COUNT(*) as qtd,
  ROUND(SUM(valor)::numeric, 2) as total_R$
FROM lancamento_financeiro
WHERE descricao LIKE 'PARC-%' AND deleted_at IS NULL
GROUP BY status
ORDER BY status;

-- Verificacao por cartao
SELECT
  split_part(descricao, ':', 1) as cartao,
  CASE WHEN pago_em IS NOT NULL THEN 'paga' ELSE 'futura' END as status,
  COUNT(*) as qtd,
  ROUND(SUM(valor)::numeric, 2) as total_R$
FROM lancamento_financeiro
WHERE descricao LIKE 'PARC-%' AND deleted_at IS NULL
GROUP BY cartao, status
ORDER BY cartao, status;
