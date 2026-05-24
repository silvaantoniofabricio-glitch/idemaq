-- sql/31-marcar-duplicatas-v2.sql
-- Versão 2: matching ESTRITO 1:1. Refaz o sql/29.
-- Cada par usa cada lado apenas uma vez (greedy por menor diferença de dias).
-- Garante que se há 5 PIX R$ 100 em Bling e 3 PIX R$ 100 em Cresol → 3 pares 1:1.

DROP TABLE IF EXISTS lancamento_duplicata;
CREATE TABLE lancamento_duplicata (
  id_duplicata uuid PRIMARY KEY REFERENCES lancamento_financeiro(id),
  id_principal uuid NOT NULL REFERENCES lancamento_financeiro(id),
  cenario text NOT NULL,
  janela_dias int NOT NULL,
  criado_em timestamptz DEFAULT now()
);
CREATE INDEX idx_dup_principal ON lancamento_duplicata(id_principal);

DO $$
DECLARE r RECORD;
BEGIN
  -- Tabela de IDs já consumidos (cada lançamento entra no máx 1 par)
  CREATE TEMP TABLE _used (id uuid PRIMARY KEY) ON COMMIT DROP;

  -- ─── CENÁRIO A: BLING-REC ↔ CRESOL receita (PIX) ───
  FOR r IN
    SELECT b.id AS dup, c.id AS principal, ABS(c.vencimento - b.vencimento) AS diff,
           'BLING-CRESOL_REC' AS cenario
    FROM lancamento_financeiro b
    JOIN lancamento_financeiro c
      ON c.valor = b.valor
      AND c.vencimento BETWEEN b.vencimento - INTERVAL '1 day' AND b.vencimento + INTERVAL '3 days'
      AND c.tipo = b.tipo
      AND c.deleted_at IS NULL
    WHERE b.descricao LIKE 'BLING-REC:%'
      AND (c.descricao LIKE 'CRESOL1-%' OR c.descricao LIKE 'CRESOL2-%')
      AND b.deleted_at IS NULL
    ORDER BY ABS(c.vencimento - b.vencimento), b.id, c.id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM _used WHERE id IN (r.dup, r.principal)) THEN
      INSERT INTO lancamento_duplicata VALUES (r.dup, r.principal, r.cenario, r.diff);
      INSERT INTO _used VALUES (r.dup), (r.principal);
    END IF;
  END LOOP;

  -- ─── CENÁRIO B: BLING-PAG ↔ CRESOL despesa ───
  FOR r IN
    SELECT b.id AS dup, c.id AS principal, ABS(c.vencimento - b.vencimento) AS diff,
           'BLING-CRESOL_PAG' AS cenario
    FROM lancamento_financeiro b
    JOIN lancamento_financeiro c
      ON c.valor = b.valor
      AND c.vencimento BETWEEN b.vencimento - INTERVAL '1 day' AND b.vencimento + INTERVAL '3 days'
      AND c.tipo = b.tipo
      AND c.deleted_at IS NULL
    WHERE b.descricao LIKE 'BLING-PAG:%'
      AND (c.descricao LIKE 'CRESOL1-%' OR c.descricao LIKE 'CRESOL2-%')
      AND b.deleted_at IS NULL
    ORDER BY ABS(c.vencimento - b.vencimento), b.id, c.id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM _used WHERE id IN (r.dup, r.principal)) THEN
      INSERT INTO lancamento_duplicata VALUES (r.dup, r.principal, r.cenario, r.diff);
      INSERT INTO _used VALUES (r.dup), (r.principal);
    END IF;
  END LOOP;

  -- ─── CENÁRIO C: BLING-REC cartão ↔ INFINITEPAY ───
  FOR r IN
    SELECT b.id AS dup, m.id AS principal, ABS(m.vencimento - b.vencimento) AS diff,
           'BLING-INFINITEPAY' AS cenario
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
    ORDER BY ABS(m.vencimento - b.vencimento), b.id, m.id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM _used WHERE id IN (r.dup, r.principal)) THEN
      INSERT INTO lancamento_duplicata VALUES (r.dup, r.principal, r.cenario, r.diff);
      INSERT INTO _used VALUES (r.dup), (r.principal);
    END IF;
  END LOOP;

  -- ─── CENÁRIO D: INFINITEPAY ↔ CRESOL ───
  FOR r IN
    SELECT m.id AS dup, c.id AS principal, ABS(c.vencimento - m.vencimento) AS diff,
           'INFINITEPAY-CRESOL' AS cenario
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
    ORDER BY ABS(c.vencimento - m.vencimento), m.id, c.id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM _used WHERE id IN (r.dup, r.principal)) THEN
      INSERT INTO lancamento_duplicata VALUES (r.dup, r.principal, r.cenario, r.diff);
      INSERT INTO _used VALUES (r.dup), (r.principal);
    END IF;
  END LOOP;

END $$;

-- Relatório
SELECT cenario, COUNT(*) AS pares, SUM(lf.valor) AS soma
FROM lancamento_duplicata d
JOIN lancamento_financeiro lf ON lf.id = d.id_duplicata
GROUP BY cenario
ORDER BY pares DESC;

WITH limpa AS (
  SELECT * FROM lancamento_financeiro lf
  WHERE lf.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM lancamento_duplicata d WHERE d.id_duplicata = lf.id)
)
SELECT
  (SELECT SUM(valor) FROM lancamento_financeiro WHERE tipo='receita' AND deleted_at IS NULL) AS receita_bruta,
  (SELECT SUM(valor) FROM lancamento_financeiro WHERE tipo='despesa' AND deleted_at IS NULL) AS despesa_bruta,
  (SELECT SUM(valor) FROM limpa WHERE tipo='receita') AS receita_liquida,
  (SELECT SUM(valor) FROM limpa WHERE tipo='despesa') AS despesa_liquida,
  (SELECT COUNT(*) FROM lancamento_duplicata) AS total_duplicatas;
