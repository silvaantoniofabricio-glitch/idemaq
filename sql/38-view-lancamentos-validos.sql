-- sql/38-view-lancamentos-validos.sql
-- View que espelha lancamento_financeiro 1:1 (mesmas colunas, mesmos tipos)
-- mas filtra os marcados em lancamento_duplicata.
-- Usada pelo hook useFinanceiro pra leitura — escrita continua na tabela real.

DROP VIEW IF EXISTS vw_lancamentos_validos;
CREATE VIEW vw_lancamentos_validos AS
SELECT lf.*
FROM lancamento_financeiro lf
WHERE lf.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM lancamento_duplicata d
    WHERE d.id_duplicata = lf.id
  );

-- Grant pra anon e authenticated lerem (RLS herda da tabela base)
GRANT SELECT ON vw_lancamentos_validos TO anon, authenticated;

-- Sanidade
SELECT
  (SELECT COUNT(*) FROM lancamento_financeiro WHERE deleted_at IS NULL) AS total_bruto,
  (SELECT COUNT(*) FROM vw_lancamentos_validos) AS total_valido,
  (SELECT COUNT(*) FROM lancamento_financeiro WHERE deleted_at IS NULL)
    - (SELECT COUNT(*) FROM vw_lancamentos_validos) AS excluidos_por_dup;
