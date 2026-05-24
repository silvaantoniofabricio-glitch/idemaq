-- sql/32-cresol-intra-contas.sql
-- Detecta transferências entre as DUAS contas Cresol do próprio Toni.
-- Cenário: PIX/TED REM de Cresol1 que aparece como receita em Cresol2 (e vice-versa).
-- Mesma data ±2 dias, mesmo valor exato, ambos chamados "TRANSFERENCIA PIX".
--
-- Como tratar: marcar AMBOS lados como duplicata (sai dos totais).
-- Adiciona à tabela lancamento_duplicata existente.

DO $$
DECLARE r RECORD;
BEGIN
  CREATE TEMP TABLE _used_intra (id uuid PRIMARY KEY) ON COMMIT DROP;
  -- já consumidos por outras runs
  INSERT INTO _used_intra SELECT id_duplicata FROM lancamento_duplicata;
  INSERT INTO _used_intra SELECT id_principal FROM lancamento_duplicata ON CONFLICT DO NOTHING;

  -- Pares Cresol1 despesa ↔ Cresol2 receita (ou vice-versa)
  FOR r IN
    SELECT c1.id AS id_a, c2.id AS id_b, ABS(c2.vencimento - c1.vencimento) AS diff
    FROM lancamento_financeiro c1
    JOIN lancamento_financeiro c2
      ON c1.valor = c2.valor
      AND c2.vencimento BETWEEN c1.vencimento - INTERVAL '2 days' AND c1.vencimento + INTERVAL '2 days'
      AND c1.id < c2.id  -- evita pegar par (A,B) e (B,A)
      AND c1.tipo <> c2.tipo  -- 1 receita + 1 despesa
      AND c1.deleted_at IS NULL
      AND c2.deleted_at IS NULL
    WHERE (
      (c1.descricao LIKE 'CRESOL1-%' AND c2.descricao LIKE 'CRESOL2-%') OR
      (c1.descricao LIKE 'CRESOL2-%' AND c2.descricao LIKE 'CRESOL1-%')
    )
    AND (c1.descricao ILIKE '%TRANSFER%' OR c1.descricao ILIKE '%PIX%')
    AND (c2.descricao ILIKE '%TRANSFER%' OR c2.descricao ILIKE '%PIX%')
    ORDER BY ABS(c2.vencimento - c1.vencimento), c1.id, c2.id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM _used_intra WHERE id IN (r.id_a, r.id_b)) THEN
      -- Marca AMBOS como duplicatas (cada um é "principal" do outro)
      INSERT INTO lancamento_duplicata VALUES (r.id_a, r.id_b, 'CRESOL-INTRA', r.diff);
      INSERT INTO lancamento_duplicata VALUES (r.id_b, r.id_a, 'CRESOL-INTRA', r.diff) ON CONFLICT DO NOTHING;
      INSERT INTO _used_intra VALUES (r.id_a), (r.id_b);
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
  (SELECT SUM(valor) FROM limpa WHERE tipo='receita') - (SELECT SUM(valor) FROM limpa WHERE tipo='despesa') AS lucro_liquido,
  (SELECT COUNT(*) FROM lancamento_duplicata) AS total_duplicatas;
