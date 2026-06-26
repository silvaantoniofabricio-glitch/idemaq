-- Remove duplicata Magalu Carrefour 4/7 jun/2026
-- PARC-INTER:MLP Magalu Carrefour 23fev 4/7  (sql/71 — parcelas futuras)
-- INTER-JUN:Magalu Carrefour 23/02 4/7        (sql/99 — lancamento PJ junho)
-- Mantém o INTER-JUN (mais recente e com descricao padrao). Remove o PARC-INTER.

-- Conferir antes:
SELECT id, descricao, valor, vencimento, pago_em, deleted_at
FROM lancamento_financeiro
WHERE descricao ILIKE '%magalu carrefour%'
  AND deleted_at IS NULL
ORDER BY vencimento;

-- Remover o duplicado do sql/71:
UPDATE lancamento_financeiro
SET deleted_at = NOW()
WHERE descricao ILIKE '%PARC-INTER%MLP Magalu Carrefour 23fev 4/7%'
  AND deleted_at IS NULL;
