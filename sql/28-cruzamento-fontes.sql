-- sql/28-cruzamento-fontes.sql
-- DIAGNÓSTICO de duplicações entre as 5 fontes financeiras.
-- READ-ONLY: não modifica nem deleta nada. Só mostra candidatos a duplicação.
--
-- Cenários esperados:
-- A) Cliente paga PIX → BLING-REC + CRESOL1 (mesma R$ no mesmo dia)
-- B) Cliente paga cartão → BLING-REC bruto + INFINITEPAY ou TON depósito (D+1)
-- C) Maquininha → Cresol (transferência InfinitePay/Ton → conta) (D+1 a D+30)
--
-- Estratégia de match: data+valor exatos, com janela de tolerância pra D+1.

-- ────────────────────────
-- 1. RESUMO POR FONTE (sanidade)
-- ────────────────────────
SELECT
  CASE
    WHEN descricao LIKE 'BLING-REC:%' THEN 'BLING_REC'
    WHEN descricao LIKE 'BLING-PAG:%' THEN 'BLING_PAG'
    WHEN descricao LIKE 'CRESOL1-%' THEN 'CRESOL1'
    WHEN descricao LIKE 'CRESOL2-%' THEN 'CRESOL2'
    WHEN descricao LIKE 'INFINITEPAY-FITID:%' THEN 'INFINITEPAY'
    WHEN descricao LIKE 'TON-TAXA-%' THEN 'TON_TAXA'
    WHEN descricao LIKE 'TON-%' THEN 'TON'
    WHEN descricao LIKE 'TRELLO-COMENT:%' THEN 'TRELLO'
    ELSE 'OUTROS'
  END AS fonte,
  tipo,
  COUNT(*) AS lancamentos,
  SUM(valor) AS soma
FROM lancamento_financeiro
WHERE deleted_at IS NULL
GROUP BY 1, 2
ORDER BY 1, 2;

-- ────────────────────────
-- 2. CENÁRIO A: BLING-REC × CRESOL1/2 (PIX recebido mesmo dia, mesmo valor)
-- ────────────────────────
WITH bling_rec AS (
  SELECT id, valor, vencimento, descricao FROM lancamento_financeiro
  WHERE descricao LIKE 'BLING-REC:%' AND tipo='receita' AND deleted_at IS NULL
),
cresol_rec AS (
  SELECT id, valor, vencimento, descricao FROM lancamento_financeiro
  WHERE (descricao LIKE 'CRESOL1-%' OR descricao LIKE 'CRESOL2-%')
    AND tipo='receita' AND deleted_at IS NULL
)
SELECT
  COUNT(*) AS pares_provavel_duplicata,
  SUM(b.valor) AS soma_duplicada
FROM bling_rec b
JOIN cresol_rec c
  ON c.valor = b.valor
  AND c.vencimento BETWEEN b.vencimento AND b.vencimento + INTERVAL '2 days';

-- ────────────────────────
-- 3. CENÁRIO B: BLING-REC (cartão) × INFINITEPAY/TON (depósito da maquininha)
-- ────────────────────────
-- Cliente paga cartão na maquininha → Bling registra valor bruto → InfinitePay deposita D+1
WITH bling_cartao AS (
  SELECT id, valor, vencimento, descricao FROM lancamento_financeiro
  WHERE descricao LIKE 'BLING-REC:%'
    AND forma_pagamento IN ('credito_1x','debito','credito_parcelado')
    AND tipo='receita' AND deleted_at IS NULL
),
maquininha_dep AS (
  SELECT id, valor, vencimento, descricao FROM lancamento_financeiro
  WHERE (descricao LIKE 'INFINITEPAY-FITID:%' OR descricao LIKE 'TON-%' AND descricao NOT LIKE 'TON-TAXA-%')
    AND tipo='receita' AND deleted_at IS NULL
)
SELECT
  COUNT(*) AS pares_bling_cartao_maquininha,
  SUM(b.valor) AS soma
FROM bling_cartao b
JOIN maquininha_dep m
  ON m.valor = b.valor
  AND m.vencimento BETWEEN b.vencimento AND b.vencimento + INTERVAL '5 days';

-- ────────────────────────
-- 4. CENÁRIO C: INFINITEPAY/TON depósito → CRESOL transferência
-- ────────────────────────
-- Maquininha deposita líquido no banco. Como o valor já é líquido (após taxa),
-- bate exatamente entre maquininha (CREDIT) e banco Cresol (TRANSFERENCIA PIX entrante).
WITH maquininha AS (
  SELECT id, valor, vencimento, descricao FROM lancamento_financeiro
  WHERE descricao LIKE 'INFINITEPAY-FITID:%'
    AND tipo='receita' AND deleted_at IS NULL
),
cresol_pix AS (
  SELECT id, valor, vencimento, descricao FROM lancamento_financeiro
  WHERE (descricao LIKE 'CRESOL1-%' OR descricao LIKE 'CRESOL2-%')
    AND descricao ILIKE '%PIX%'
    AND tipo='receita' AND deleted_at IS NULL
)
SELECT
  COUNT(*) AS pares_maquininha_banco,
  SUM(m.valor) AS soma
FROM maquininha m
JOIN cresol_pix c
  ON c.valor = m.valor
  AND c.vencimento BETWEEN m.vencimento AND m.vencimento + INTERVAL '3 days';

-- ────────────────────────
-- 5. AMOSTRA: top 10 pares Bling-REC × Cresol (cenário A) pra inspeção visual
-- ────────────────────────
WITH bling_rec AS (
  SELECT id, valor, vencimento, descricao FROM lancamento_financeiro
  WHERE descricao LIKE 'BLING-REC:%' AND tipo='receita' AND deleted_at IS NULL
),
cresol_rec AS (
  SELECT id, valor, vencimento, descricao FROM lancamento_financeiro
  WHERE (descricao LIKE 'CRESOL1-%' OR descricao LIKE 'CRESOL2-%')
    AND tipo='receita' AND deleted_at IS NULL
)
SELECT
  b.vencimento AS data,
  b.valor,
  substring(b.descricao FROM 1 FOR 80) AS bling,
  substring(c.descricao FROM 1 FOR 80) AS cresol
FROM bling_rec b
JOIN cresol_rec c
  ON c.valor = b.valor
  AND c.vencimento BETWEEN b.vencimento AND b.vencimento + INTERVAL '2 days'
ORDER BY b.valor DESC, b.vencimento DESC
LIMIT 10;

-- ────────────────────────
-- 6. SOMA AJUSTADA (estimativa do que seria sem duplicação)
-- ────────────────────────
SELECT
  SUM(valor) FILTER (WHERE tipo='receita') AS receita_total_bruta,
  SUM(valor) FILTER (WHERE tipo='despesa') AS despesa_total_bruta
FROM lancamento_financeiro
WHERE deleted_at IS NULL;
