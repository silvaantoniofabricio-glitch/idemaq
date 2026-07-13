-- sql/137-contador-split-servico-peca-junho.sql
-- Separa a receita de JUNHO/2026 em Serviço / Peça / Deslocamento pro contador.
-- Motivo fiscal: no Simples Nacional peça (mercadoria, Anexo I ~4%) é tributada
-- menos que serviço (Anexo III, 6%+ISS). Separar reduz imposto.
--
-- Como funciona: cada receita vinculada a uma OS é RATEADA entre as categorias
-- dos itens do orçamento daquela OS (proporcional ao valor de cada item).
-- OS sem itens detalhados caem no balde "(sem detalhe)".
--
-- Rode as 3 consultas no SQL Editor do Supabase e me mande os 3 resultados.
-- Só leitura — não altera nada.

-- ─────────────────────────────────────────────────────────────────────────
-- CTE base (repetida nas 3 queries pra cada uma rodar sozinha)
-- ─────────────────────────────────────────────────────────────────────────

-- QUERY 1 — DIAGNÓSTICO: quanto da receita de junho está detalhada item a item
WITH rec AS (
  SELECT lf.os_id, SUM(lf.valor) AS receita
  FROM lancamento_financeiro lf
  WHERE lf.tipo = 'receita' AND lf.deleted_at IS NULL AND lf.os_id IS NOT NULL
    AND COALESCE(lf.pago_em, lf.vencimento) BETWEEN '2026-06-01' AND '2026-06-30'
  GROUP BY lf.os_id
),
it AS (
  SELECT os_id, categoria, SUM(valor_unitario * COALESCE(quantidade, 1)) AS tot
  FROM os_item WHERE deleted_at IS NULL
  GROUP BY os_id, categoria
),
ot AS (SELECT os_id, SUM(tot) AS total_os FROM it GROUP BY os_id)
SELECT
  COUNT(*)                                              AS os_com_receita,
  COUNT(*) FILTER (WHERE ot.total_os > 0)               AS os_detalhadas,
  ROUND(SUM(r.receita), 2)                              AS receita_total,
  ROUND(SUM(r.receita) FILTER (WHERE ot.total_os > 0), 2) AS receita_detalhada,
  ROUND(SUM(r.receita) FILTER (WHERE ot.total_os IS NULL), 2) AS receita_sem_detalhe
FROM rec r LEFT JOIN ot ON ot.os_id = r.os_id;


-- QUERY 2 — Categorias de item que existem (pra conferir os rótulos reais)
SELECT categoria, COUNT(*) AS qtd_itens, ROUND(SUM(valor_unitario * COALESCE(quantidade,1)),2) AS valor
FROM os_item
WHERE deleted_at IS NULL
GROUP BY categoria
ORDER BY valor DESC;


-- QUERY 3 — SPLIT rateado da receita de junho por categoria de item
WITH rec AS (
  SELECT lf.os_id, SUM(lf.valor) AS receita
  FROM lancamento_financeiro lf
  WHERE lf.tipo = 'receita' AND lf.deleted_at IS NULL AND lf.os_id IS NOT NULL
    AND COALESCE(lf.pago_em, lf.vencimento) BETWEEN '2026-06-01' AND '2026-06-30'
  GROUP BY lf.os_id
),
it AS (
  SELECT os_id, categoria, SUM(valor_unitario * COALESCE(quantidade, 1)) AS tot
  FROM os_item WHERE deleted_at IS NULL
  GROUP BY os_id, categoria
),
ot AS (SELECT os_id, SUM(tot) AS total_os FROM it GROUP BY os_id)
SELECT
  COALESCE(i.categoria, '(sem detalhe)') AS categoria,
  ROUND(SUM(
    CASE WHEN ot.total_os > 0
      THEN r.receita * (i.tot / ot.total_os)
      ELSE r.receita
    END
  ), 2) AS receita_rateada
FROM rec r
LEFT JOIN it i ON i.os_id = r.os_id
LEFT JOIN ot   ON ot.os_id = r.os_id
GROUP BY 1
ORDER BY 2 DESC;
