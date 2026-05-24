-- sql/33-view-dre-consolidada.sql
-- Cria view `vw_dre_real` que retorna DRE mensal já excluindo duplicatas.
-- Pode ser consumida pelo Relatorios/DRE da UI sem refator (só trocar tabela
-- por view) OU via dashboard externo (Metabase, Looker, etc).
--
-- Lógica: tudo de lancamento_financeiro EXCETO o que tá em lancamento_duplicata.

DROP VIEW IF EXISTS vw_dre_mensal;
DROP VIEW IF EXISTS vw_dre_real;
CREATE VIEW vw_dre_real AS
SELECT
  date_trunc('month', COALESCE(pago_em, vencimento))::date AS mes,
  tipo,
  categoria,
  forma_pagamento,
  valor,
  COALESCE(pago_em, vencimento) AS data,
  descricao,
  conta_id,
  id AS lancamento_id
FROM lancamento_financeiro lf
WHERE deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM lancamento_duplicata d
    WHERE d.id_duplicata = lf.id
  );

-- View resumida mensal (pronta pro Painel/DRE)
DROP VIEW IF EXISTS vw_dre_mensal;
CREATE VIEW vw_dre_mensal AS
SELECT
  date_trunc('month', data)::date AS mes,
  SUM(valor) FILTER (WHERE tipo='receita') AS receita,
  SUM(valor) FILTER (WHERE tipo='despesa') AS despesa,
  COALESCE(SUM(valor) FILTER (WHERE tipo='receita'), 0)
    - COALESCE(SUM(valor) FILTER (WHERE tipo='despesa'), 0) AS lucro,
  COUNT(*) FILTER (WHERE tipo='receita') AS num_receitas,
  COUNT(*) FILTER (WHERE tipo='despesa') AS num_despesas
FROM vw_dre_real
GROUP BY 1
ORDER BY 1;

-- 1. Mostra DRE mensal completa
SELECT
  to_char(mes, 'YYYY-MM') AS mes,
  receita,
  despesa,
  lucro,
  num_receitas,
  num_despesas
FROM vw_dre_mensal
ORDER BY mes DESC
LIMIT 30;

-- 2. Totais consolidados
SELECT
  SUM(receita) AS receita_total,
  SUM(despesa) AS despesa_total,
  SUM(lucro) AS lucro_total,
  COUNT(*) AS meses_cobertos,
  ROUND(SUM(receita)::numeric / NULLIF(COUNT(*), 0), 2) AS receita_media_mes,
  ROUND(SUM(despesa)::numeric / NULLIF(COUNT(*), 0), 2) AS despesa_media_mes,
  ROUND(SUM(lucro)::numeric / NULLIF(COUNT(*), 0), 2) AS lucro_medio_mes
FROM vw_dre_mensal;

-- 3. Top 20 categorias de despesa pra revisão manual
SELECT
  COALESCE(categoria, '(sem categoria)') AS categoria,
  COUNT(*) AS qtd,
  SUM(valor) AS soma
FROM vw_dre_real
WHERE tipo='despesa'
GROUP BY 1
ORDER BY soma DESC
LIMIT 20;
