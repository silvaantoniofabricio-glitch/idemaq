-- 141-diag-os-1650-pagamento.sql
-- SÓ LEITURA. OS #1650 (Mary Gabrielly) mostra 2 recebimentos lançados
-- (R$285 Dinheiro + R$285 PIX = R$570) mas a tela de "A receber" ainda
-- pede mais um pagamento, como se faltasse R$285. Isso só acontece quando
-- os.valor_pago não bate com a soma real dos lançamentos.
--
-- Rode e me manda o resultado.

SELECT
  o.numero, o.valor_total, o.desconto, o.valor_pago, o.pago,
  (SELECT COALESCE(SUM(valor), 0) FROM lancamento_financeiro
   WHERE os_id = o.id AND tipo = 'receita' AND deleted_at IS NULL AND pago_em IS NOT NULL
  ) AS soma_lancamentos_pagos
FROM os o
WHERE o.numero = 1650;

-- Detalhe de cada lançamento de receita dessa OS:
SELECT id, valor, forma_pagamento, pago_em, vencimento, deleted_at
FROM lancamento_financeiro
WHERE os_id = (SELECT id FROM os WHERE numero = 1650)
  AND tipo = 'receita'
ORDER BY pago_em;
