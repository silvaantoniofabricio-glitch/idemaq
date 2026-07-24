-- 144-corrigir-os-437.sql
-- OS #437 (José Antonio Frazão): valor_total ja e liquido (pos-desconto) —
-- confirmado na tela: "Desconto -R$10" seguido de "TOTAL R$1.025". Os 3 PIX
-- lançados (325+400+300) somam exatamente 1025, batendo com o total. Não
-- era ambíguo — mesmo bug do excluirBaixa, só que o valor_pago (725) não
-- refletia o terceiro PIX (300, recebido 17/07/2026).

UPDATE os SET valor_pago = 1025.00, pago = 'total'::os_pagamento_status
WHERE numero = 437;

-- Conferir:
SELECT
  o.numero, o.valor_total, o.desconto, o.valor_pago, o.pago,
  (SELECT COALESCE(SUM(valor), 0) FROM lancamento_financeiro
   WHERE os_id = o.id AND tipo = 'receita' AND deleted_at IS NULL AND pago_em IS NOT NULL
  ) AS soma_lancamentos_pagos
FROM os o WHERE o.numero = 437;
