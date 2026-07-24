-- 142-diagnostico-valor-pago-divergente.sql
-- SÓ LEITURA. Acha TODAS as OS onde os.valor_pago não bate com a soma real
-- dos lançamentos de receita pagos (tipo='receita', pago_em preenchido,
-- não excluído) — é o sintoma visto nas OS #1650 e #1631: pagamentos reais
-- lançados, mas a tela de "A receber" continua pedindo o valor inteiro de
-- novo, como se nada tivesse sido pago.

SELECT
  o.numero,
  o.cliente_id,
  o.etapa,
  o.pago,
  o.valor_total,
  o.desconto,
  o.valor_pago                                            AS valor_pago_na_os,
  COALESCE(l.soma_pago, 0)                                 AS soma_lancamentos_pagos,
  o.valor_pago - COALESCE(l.soma_pago, 0)                  AS diferenca
FROM os o
LEFT JOIN (
  SELECT os_id, SUM(valor) AS soma_pago
  FROM lancamento_financeiro
  WHERE tipo = 'receita' AND deleted_at IS NULL AND pago_em IS NOT NULL
  GROUP BY os_id
) l ON l.os_id = o.id
WHERE o.deleted_at IS NULL
  AND ABS(o.valor_pago - COALESCE(l.soma_pago, 0)) > 0.01
ORDER BY ABS(o.valor_pago - COALESCE(l.soma_pago, 0)) DESC;
