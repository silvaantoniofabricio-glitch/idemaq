-- 179 — Sincroniza os.valor_total com a soma real dos itens do orçamento
--
-- Problema: valor_total só era gravado nas ações de pagamento. Quem editava
-- os itens do orçamento (add/remover/alterar) deixava valor_total defasado —
-- ex.: OS da Madalena com R$ 410 em itens e valor_total = 330. O card do
-- Kanban e a soma do topo da coluna liam valor_total, então mostravam errado.
--
-- Rode a CONFERÊNCIA primeiro, veja a lista, depois rode o UPDATE.

-- ── 1. Conferência: OS cujo valor_total não bate com a soma dos itens ──
WITH soma AS (
  SELECT os_id, SUM(COALESCE(quantidade, 1) * COALESCE(valor_unitario, 0)) AS total_itens
  FROM os_item
  WHERE deleted_at IS NULL
  GROUP BY os_id
)
SELECT o.numero, o.etapa, o.valor_total, s.total_itens,
       s.total_itens - COALESCE(o.valor_total, 0) AS diferenca
FROM os o
JOIN soma s ON s.os_id = o.id
WHERE o.deleted_at IS NULL
  AND ABS(COALESCE(o.valor_total, 0) - s.total_itens) > 0.01
ORDER BY ABS(s.total_itens - COALESCE(o.valor_total, 0)) DESC;

-- ── 2. Correção ──
-- Só toca em OS que TÊM itens lançados (não zera OS antiga sem itens).
WITH soma AS (
  SELECT os_id, SUM(COALESCE(quantidade, 1) * COALESCE(valor_unitario, 0)) AS total_itens
  FROM os_item
  WHERE deleted_at IS NULL
  GROUP BY os_id
)
UPDATE os o
SET valor_total = s.total_itens
FROM soma s
WHERE s.os_id = o.id
  AND o.deleted_at IS NULL
  AND ABS(COALESCE(o.valor_total, 0) - s.total_itens) > 0.01;
