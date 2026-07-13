-- sql/138-view-lancamento-fiscal-split.sql
-- View que rateia cada RECEITA vinculada a uma OS entre Serviço / Peça /
-- Deslocamento, proporcional ao valor de cada tipo de item no orçamento
-- da OS (os_item.categoria × valor_unitario × quantidade).
--
-- Motivo fiscal: no Simples Nacional, peça/mercadoria cai no Anexo I (~4%)
-- e serviço no Anexo III (6%+ISS) — separar reduz a base tributada por
-- serviço. Ver sql/137 (diagnóstico manual que confirmou o split de junho:
-- serviço R$11.510,35 + desloc R$889,85 + peça R$4.954,80 + sem-detalhe R$100).
--
-- Receitas sem item detalhado (OS antiga, lançamento avulso) caem 100% em
-- valor_servico — mesma convenção usada no diagnóstico manual (o avulso da
-- Paula era saldo de manutenção, ou seja, serviço).
--
-- valor_servico é calculado por RESÍDUO (valor - peca - desloc) pra garantir
-- que a soma das 3 colunas SEMPRE feche exatamente com lf.valor, sem sobra
-- de centavo por arredondamento.
--
-- Idempotente (CREATE OR REPLACE). Espelha o padrão de sql/38 (vw_lancamentos_validos).

CREATE OR REPLACE VIEW vw_lancamento_fiscal_split AS
WITH it AS (
  SELECT os_id, categoria, SUM(valor_unitario * COALESCE(quantidade, 1)) AS tot
  FROM os_item
  WHERE deleted_at IS NULL
  GROUP BY os_id, categoria
),
ot AS (
  SELECT os_id, SUM(tot) AS total_os FROM it GROUP BY os_id
),
piv AS (
  SELECT
    ot.os_id, ot.total_os,
    COALESCE((SELECT tot FROM it WHERE it.os_id = ot.os_id AND it.categoria = 'peca'), 0)   AS tot_peca,
    COALESCE((SELECT tot FROM it WHERE it.os_id = ot.os_id AND it.categoria = 'desloc'), 0) AS tot_desloc
  FROM ot
)
SELECT
  lf.id AS lancamento_id,
  lf.os_id,
  lf.valor,
  lf.categoria      AS categoria_original,
  lf.descricao,
  lf.vencimento,
  lf.pago_em,
  (piv.total_os IS NOT NULL AND piv.total_os > 0) AS tem_detalhe_item,
  CASE WHEN piv.total_os > 0
    THEN ROUND(lf.valor * piv.tot_peca / piv.total_os, 2)
    ELSE 0
  END AS valor_peca,
  CASE WHEN piv.total_os > 0
    THEN ROUND(lf.valor * piv.tot_desloc / piv.total_os, 2)
    ELSE 0
  END AS valor_desloc,
  -- Resíduo: garante soma exata (peça + desloc + serviço = valor total)
  lf.valor
    - CASE WHEN piv.total_os > 0 THEN ROUND(lf.valor * piv.tot_peca / piv.total_os, 2) ELSE 0 END
    - CASE WHEN piv.total_os > 0 THEN ROUND(lf.valor * piv.tot_desloc / piv.total_os, 2) ELSE 0 END
    AS valor_servico
FROM lancamento_financeiro lf
LEFT JOIN piv ON piv.os_id = lf.os_id
WHERE lf.tipo = 'receita' AND lf.deleted_at IS NULL;

GRANT SELECT ON vw_lancamento_fiscal_split TO anon, authenticated;
