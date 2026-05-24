-- sql/27-ton-black-screenshots.sql
-- Importa 20 vendas Ton Black extraídas dos 4 screenshots WhatsApp.
-- Período visível: 15/04/2026 → 22/05/2026 (Toni começou a usar Ton recentemente).
-- Conta destino: 'Ton Black' (já existe em sql/01 seed como maquininha).
-- Idempotente via tag TON-<data>-<valor_bruto_centavos> em descricao.
--
-- Modelo de dados: cada linha cria 2 lancamentos:
--   1. receita BRUTA (valor cliente pagou) — confirma a venda
--   2. despesa TAXA (taxa da maquininha) — reduz o valor líquido recebido
-- Forma de pagamento: credito_Nx ou debito
-- Bandeira (Visa/MC/Elo) sai no histórico.

-- 1. Garante conta Ton Black existe
INSERT INTO conta_bancaria (nome, tipo)
SELECT 'Ton Black', 'maquininha'
WHERE NOT EXISTS (SELECT 1 FROM conta_bancaria WHERE nome = 'Ton Black');

-- 2. INSERTs das vendas (1 lancamento de receita + 1 de despesa-taxa por venda)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Ton Black' LIMIT 1),
  vendas (data, valor_bruto, taxa, parcelas, bandeira) AS (VALUES
    ('2026-05-22'::date, 185.00::numeric, 11.95::numeric, '2x', 'Elo'),
    ('2026-05-22'::date, 270.00::numeric, 16.50::numeric, '3x', 'Mastercard'),
    ('2026-05-22'::date, 85.00::numeric,  2.67::numeric,  '1x', 'Visa'),
    ('2026-05-20'::date, 400.00::numeric, 21.52::numeric, '2x', 'Mastercard'),
    ('2026-05-18'::date, 685.00::numeric, 41.85::numeric, '3x', 'Visa'),
    ('2026-05-18'::date, 430.00::numeric, 26.27::numeric, '3x', 'Visa'),
    ('2026-05-12'::date, 640.00::numeric, 43.78::numeric, '4x', 'Visa'),
    ('2026-05-12'::date, 650.00::numeric, 39.71::numeric, '3x', 'Visa'),
    ('2026-05-07'::date, 420.00::numeric, 25.66::numeric, '3x', 'Visa'),
    ('2026-05-05'::date, 245.00::numeric, 13.18::numeric, '2x', 'Mastercard'),
    ('2026-04-29'::date, 320.00::numeric, 10.05::numeric, '1x', 'Mastercard'),
    ('2026-04-28'::date, 185.00::numeric, 5.81::numeric,  '1x', 'Mastercard'),
    ('2026-04-28'::date, 100.00::numeric, 3.14::numeric,  '1x', 'Visa'),
    ('2026-04-28'::date, 285.00::numeric, 3.88::numeric,  'DEB', 'Mastercard'),
    ('2026-04-24'::date, 630.00::numeric, 38.49::numeric, '3x', 'Visa'),
    ('2026-04-22'::date, 645.00::numeric, 44.12::numeric, '4x', 'Mastercard'),
    ('2026-04-18'::date, 250.00::numeric, 13.45::numeric, '2x', 'Mastercard'),
    ('2026-04-17'::date, 330.00::numeric, 20.16::numeric, '3x', 'Mastercard'),
    ('2026-04-17'::date, 385.00::numeric, 23.52::numeric, '3x', 'Mastercard'),
    ('2026-04-15'::date, 490.00::numeric, 26.36::numeric, '2x', 'Mastercard')
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, taxa_pct, conta_id)
-- 2.1. Receitas (valor bruto)
SELECT
  'receita',
  v.valor_bruto,
  'Vendas via Ton Black',
  'TON-' || to_char(v.data, 'YYYYMMDD') || '-' || (v.valor_bruto * 100)::int || ' ' || v.bandeira || ' ' || v.parcelas,
  v.data,
  v.data,
  CASE WHEN v.parcelas = 'DEB' THEN 'debito' ELSE 'credito_' || v.parcelas END,
  ROUND(v.taxa / v.valor_bruto * 100, 3),
  c.id
FROM vendas v CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE 'TON-' || to_char(v.data, 'YYYYMMDD') || '-' || (v.valor_bruto * 100)::int || '%'
    AND lf.tipo = 'receita'
);

-- 2.2. Despesas (taxa da maquininha) — pago em D+30 (Ton Black demora pra repassar)
WITH
  conta_cte AS (SELECT id FROM conta_bancaria WHERE nome = 'Ton Black' LIMIT 1),
  vendas (data, valor_bruto, taxa, parcelas, bandeira) AS (VALUES
    ('2026-05-22'::date, 185.00::numeric, 11.95::numeric, '2x', 'Elo'),
    ('2026-05-22'::date, 270.00::numeric, 16.50::numeric, '3x', 'Mastercard'),
    ('2026-05-22'::date, 85.00::numeric,  2.67::numeric,  '1x', 'Visa'),
    ('2026-05-20'::date, 400.00::numeric, 21.52::numeric, '2x', 'Mastercard'),
    ('2026-05-18'::date, 685.00::numeric, 41.85::numeric, '3x', 'Visa'),
    ('2026-05-18'::date, 430.00::numeric, 26.27::numeric, '3x', 'Visa'),
    ('2026-05-12'::date, 640.00::numeric, 43.78::numeric, '4x', 'Visa'),
    ('2026-05-12'::date, 650.00::numeric, 39.71::numeric, '3x', 'Visa'),
    ('2026-05-07'::date, 420.00::numeric, 25.66::numeric, '3x', 'Visa'),
    ('2026-05-05'::date, 245.00::numeric, 13.18::numeric, '2x', 'Mastercard'),
    ('2026-04-29'::date, 320.00::numeric, 10.05::numeric, '1x', 'Mastercard'),
    ('2026-04-28'::date, 185.00::numeric, 5.81::numeric,  '1x', 'Mastercard'),
    ('2026-04-28'::date, 100.00::numeric, 3.14::numeric,  '1x', 'Visa'),
    ('2026-04-28'::date, 285.00::numeric, 3.88::numeric,  'DEB', 'Mastercard'),
    ('2026-04-24'::date, 630.00::numeric, 38.49::numeric, '3x', 'Visa'),
    ('2026-04-22'::date, 645.00::numeric, 44.12::numeric, '4x', 'Mastercard'),
    ('2026-04-18'::date, 250.00::numeric, 13.45::numeric, '2x', 'Mastercard'),
    ('2026-04-17'::date, 330.00::numeric, 20.16::numeric, '3x', 'Mastercard'),
    ('2026-04-17'::date, 385.00::numeric, 23.52::numeric, '3x', 'Mastercard'),
    ('2026-04-15'::date, 490.00::numeric, 26.36::numeric, '2x', 'Mastercard')
  )
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, vencimento, pago_em, forma_pagamento, conta_id)
SELECT
  'despesa',
  v.taxa,
  'Taxas pagas',
  'TON-TAXA-' || to_char(v.data, 'YYYYMMDD') || '-' || (v.valor_bruto * 100)::int || ' ' || v.bandeira || ' ' || v.parcelas,
  v.data + INTERVAL '1 day',
  v.data + INTERVAL '1 day',
  CASE WHEN v.parcelas = 'DEB' THEN 'debito' ELSE 'credito_' || v.parcelas END,
  c.id
FROM vendas v CROSS JOIN conta_cte c
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro lf
  WHERE lf.descricao LIKE 'TON-TAXA-' || to_char(v.data, 'YYYYMMDD') || '-' || (v.valor_bruto * 100)::int || '%'
);

-- 3. Verificação
SELECT
  COUNT(*) FILTER (WHERE descricao LIKE 'TON-%' AND descricao NOT LIKE 'TON-TAXA-%') AS vendas_count,
  SUM(valor) FILTER (WHERE descricao LIKE 'TON-%' AND descricao NOT LIKE 'TON-TAXA-%') AS vendas_soma,
  COUNT(*) FILTER (WHERE descricao LIKE 'TON-TAXA-%') AS taxas_count,
  SUM(valor) FILTER (WHERE descricao LIKE 'TON-TAXA-%') AS taxas_soma,
  SUM(valor) FILTER (WHERE descricao LIKE 'TON-%' AND descricao NOT LIKE 'TON-TAXA-%')
    - SUM(valor) FILTER (WHERE descricao LIKE 'TON-TAXA-%') AS liquido
FROM lancamento_financeiro
WHERE deleted_at IS NULL;
