-- sql/29-marcar-duplicatas.sql
-- Cria tabela `lancamento_duplicata` que MAPEIA pares (principal, duplicata).
-- Não deleta nem altera lancamento_financeiro — só cria o índice de dups.
--
-- Hierarquia de "principal" (= o que mantém):
-- 1. Cresol bank (verdade do caixa)
-- 2. Maquininha (verdade da maquininha)
-- 3. Bling (registro interno)
-- 4. Trello (registro mais antigo)
--
-- Pra cada par detectado: o de MENOR prioridade vira duplicata do MAIOR.

DROP TABLE IF EXISTS lancamento_duplicata;

CREATE TABLE lancamento_duplicata (
  id_duplicata uuid PRIMARY KEY REFERENCES lancamento_financeiro(id),
  id_principal uuid NOT NULL REFERENCES lancamento_financeiro(id),
  cenario text NOT NULL,
  janela_dias int NOT NULL,
  criado_em timestamptz DEFAULT now()
);

CREATE INDEX idx_dup_principal ON lancamento_duplicata(id_principal);

-- Função interna pra dar fonte (prioridade) de um lançamento
-- Maior número = maior prioridade (= é o "principal")
-- Usaremos via CASE expression inline.

-- ────────────────────────
-- CENÁRIO A: BLING-REC ↔ CRESOL (recebimento via PIX)
-- Janela: ±2 dias, mesmo valor exato
-- Principal: Cresol (banco = ground truth)
-- ────────────────────────
INSERT INTO lancamento_duplicata (id_duplicata, id_principal, cenario, janela_dias)
SELECT DISTINCT ON (b.id)
  b.id, c.id, 'BLING-CRESOL_PIX', ABS((c.vencimento - b.vencimento))
FROM lancamento_financeiro b
JOIN lancamento_financeiro c
  ON c.valor = b.valor
  AND c.vencimento BETWEEN b.vencimento - INTERVAL '1 day' AND b.vencimento + INTERVAL '3 days'
  AND c.tipo = b.tipo
  AND c.deleted_at IS NULL
WHERE b.descricao LIKE 'BLING-REC:%'
  AND (c.descricao LIKE 'CRESOL1-%' OR c.descricao LIKE 'CRESOL2-%')
  AND b.deleted_at IS NULL
ORDER BY b.id, ABS((c.vencimento - b.vencimento))
ON CONFLICT (id_duplicata) DO NOTHING;

-- ────────────────────────
-- CENÁRIO B: BLING-PAG ↔ CRESOL (despesa)
-- ────────────────────────
INSERT INTO lancamento_duplicata (id_duplicata, id_principal, cenario, janela_dias)
SELECT DISTINCT ON (b.id)
  b.id, c.id, 'BLING-CRESOL_PAG', ABS((c.vencimento - b.vencimento))
FROM lancamento_financeiro b
JOIN lancamento_financeiro c
  ON c.valor = b.valor
  AND c.vencimento BETWEEN b.vencimento - INTERVAL '1 day' AND b.vencimento + INTERVAL '3 days'
  AND c.tipo = b.tipo
  AND c.deleted_at IS NULL
WHERE b.descricao LIKE 'BLING-PAG:%'
  AND (c.descricao LIKE 'CRESOL1-%' OR c.descricao LIKE 'CRESOL2-%')
  AND b.deleted_at IS NULL
ORDER BY b.id, ABS((c.vencimento - b.vencimento))
ON CONFLICT (id_duplicata) DO NOTHING;

-- ────────────────────────
-- CENÁRIO C: BLING-REC cartão ↔ INFINITEPAY (depósito da maquininha)
-- Maquininha já é depositada no banco, então prioridade é maquininha sobre Bling.
-- Janela maior (até 5 dias) porque InfinitePay paga D+1 e Bling pode lançar em dia distinto.
-- ────────────────────────
INSERT INTO lancamento_duplicata (id_duplicata, id_principal, cenario, janela_dias)
SELECT DISTINCT ON (b.id)
  b.id, m.id, 'BLING-INFINITEPAY', ABS((m.vencimento - b.vencimento))
FROM lancamento_financeiro b
JOIN lancamento_financeiro m
  ON m.valor = b.valor
  AND m.vencimento BETWEEN b.vencimento - INTERVAL '1 day' AND b.vencimento + INTERVAL '7 days'
  AND m.tipo = 'receita'
  AND m.deleted_at IS NULL
WHERE b.descricao LIKE 'BLING-REC:%'
  AND b.forma_pagamento IN ('credito_1x', 'debito', 'credito_parcelado')
  AND m.descricao LIKE 'INFINITEPAY-FITID:%'
  AND b.deleted_at IS NULL
  AND b.id NOT IN (SELECT id_duplicata FROM lancamento_duplicata)
ORDER BY b.id, ABS((m.vencimento - b.vencimento))
ON CONFLICT (id_duplicata) DO NOTHING;

-- ────────────────────────
-- CENÁRIO D: INFINITEPAY ↔ CRESOL (depósito da maquininha → conta)
-- Maquininha desce dinheiro no banco. Cresol PIX entrante com mesmo valor + 0-3 dias.
-- Principal: Cresol (banco final).
-- ────────────────────────
INSERT INTO lancamento_duplicata (id_duplicata, id_principal, cenario, janela_dias)
SELECT DISTINCT ON (m.id)
  m.id, c.id, 'INFINITEPAY-CRESOL', ABS((c.vencimento - m.vencimento))
FROM lancamento_financeiro m
JOIN lancamento_financeiro c
  ON c.valor = m.valor
  AND c.vencimento BETWEEN m.vencimento AND m.vencimento + INTERVAL '4 days'
  AND c.tipo = 'receita'
  AND c.deleted_at IS NULL
WHERE m.descricao LIKE 'INFINITEPAY-FITID:%'
  AND m.tipo = 'receita'
  AND (c.descricao LIKE 'CRESOL1-%' OR c.descricao LIKE 'CRESOL2-%')
  AND m.deleted_at IS NULL
  AND m.id NOT IN (SELECT id_duplicata FROM lancamento_duplicata)
ORDER BY m.id, ABS((c.vencimento - m.vencimento))
ON CONFLICT (id_duplicata) DO NOTHING;

-- ────────────────────────
-- RELATÓRIO FINAL
-- ────────────────────────

-- 1. Distribuição por cenário
SELECT cenario, COUNT(*) AS pares, SUM(lf.valor) AS soma_duplicada
FROM lancamento_duplicata d
JOIN lancamento_financeiro lf ON lf.id = d.id_duplicata
GROUP BY cenario
ORDER BY pares DESC;

-- 2. Balanço bruto (todos) vs líquido (sem duplicatas)
WITH limpa AS (
  SELECT * FROM lancamento_financeiro lf
  WHERE lf.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM lancamento_duplicata d WHERE d.id_duplicata = lf.id)
)
SELECT
  -- Bruto (com duplicatas)
  (SELECT SUM(valor) FROM lancamento_financeiro WHERE tipo='receita' AND deleted_at IS NULL) AS receita_bruta,
  (SELECT SUM(valor) FROM lancamento_financeiro WHERE tipo='despesa' AND deleted_at IS NULL) AS despesa_bruta,
  -- Líquido (sem duplicatas)
  (SELECT SUM(valor) FROM limpa WHERE tipo='receita') AS receita_liquida,
  (SELECT SUM(valor) FROM limpa WHERE tipo='despesa') AS despesa_liquida,
  -- Diferenças
  (SELECT COUNT(*) FROM lancamento_duplicata) AS total_duplicatas_marcadas;
