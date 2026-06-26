-- Identifica lancamentos duplicados: mesmo valor + mesmo vencimento + tipo despesa
-- Provavelmente: PARC-xxx (sql/71) duplicado com FAT-xxx-JUN (sql/85/89/etc)

WITH duplicados AS (
  SELECT
    valor,
    vencimento,
    COUNT(*) AS qtd,
    -- agrega ids e descricoes pra visualizacao
    STRING_AGG(id::text,        '|' ORDER BY descricao) AS ids,
    STRING_AGG(descricao,       ' ||| ' ORDER BY descricao) AS descricoes,
    STRING_AGG(COALESCE(cb.nome,'?'), '|' ORDER BY lf.descricao) AS contas
  FROM lancamento_financeiro lf
  LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
  WHERE lf.tipo = 'despesa'
    AND lf.deleted_at IS NULL
    AND lf.vencimento >= '2026-05-01'
  GROUP BY valor, vencimento
  HAVING COUNT(*) > 1
)
SELECT
  d.vencimento,
  d.valor,
  d.qtd,
  d.contas,
  d.descricoes
FROM duplicados d
ORDER BY d.vencimento, d.valor DESC;

-- Total de registros duplicados:
SELECT COUNT(*) AS pares_duplicados,
       SUM(qtd - 1) AS registros_a_remover
FROM (
  SELECT COUNT(*) AS qtd
  FROM lancamento_financeiro lf
  WHERE lf.tipo = 'despesa'
    AND lf.deleted_at IS NULL
    AND lf.vencimento >= '2026-05-01'
  GROUP BY valor, vencimento
  HAVING COUNT(*) > 1
) sub;
