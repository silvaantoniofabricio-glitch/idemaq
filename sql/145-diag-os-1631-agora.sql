-- 145-diag-os-1631-agora.sql
-- SÓ LEITURA. Estado atual real da OS #1631 — pra saber se o valor_pago
-- ainda está correto (225, do fix anterior) ou se voltou a zerar, e se a
-- parcela "a prazo" de R$225 (vencia 20/07) ainda existe ou foi excluída.

SELECT numero, valor_total, desconto, valor_pago, pago, atualizado_em
FROM os WHERE numero = 1631;

SELECT id, valor, forma_pagamento, pago_em, vencimento, deleted_at
FROM lancamento_financeiro
WHERE os_id = (SELECT id FROM os WHERE numero = 1631)
  AND tipo = 'receita'
ORDER BY vencimento;
