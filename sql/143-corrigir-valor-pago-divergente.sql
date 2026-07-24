-- 143-corrigir-valor-pago-divergente.sql
-- Corrige o valor_pago/pago de 8 OS onde o bug do excluirBaixa (corrigido no
-- código em cb95694) zerou/reduziu pagamento real já recebido — descontava
-- o valor de QUALQUER baixa excluída, mesmo parcelas "a prazo" nunca pagas.
--
-- Cada OS abaixo tem lançamentos de receita REAIS (pago_em preenchido) que
-- batem exatamente com o total da OS (ou, no caso da #1631, com o que já
-- foi pago de fato — o resto segue como "a prazo" agendado, sem mudança).
--
-- NÃO mexe em #437 (diferença de R$10 == desconto, ambíguo — revisar à
-- parte) nem em #1598/#1623 (já corretas na própria OS; o excesso está nos
-- lançamentos, não aqui — investigar Financeiro separadamente).

BEGIN;

UPDATE os SET valor_pago = 725.00, pago = 'total'::os_pagamento_status WHERE numero = 1636;
UPDATE os SET valor_pago = 650.00, pago = 'total'::os_pagamento_status WHERE numero = 1633;
UPDATE os SET valor_pago = 700.00, pago = 'total'::os_pagamento_status WHERE numero = 1662;
UPDATE os SET valor_pago = 570.00, pago = 'total'::os_pagamento_status WHERE numero = 1650;
UPDATE os SET valor_pago = 385.00, pago = 'total'::os_pagamento_status WHERE numero = 1602;
UPDATE os SET valor_pago = 355.00, pago = 'total'::os_pagamento_status WHERE numero = 1610;
UPDATE os SET valor_pago = 495.00, pago = 'total'::os_pagamento_status WHERE numero = 1634;
UPDATE os SET valor_pago = 225.00, pago = 'parcial'::os_pagamento_status WHERE numero = 1631;

COMMIT;

-- Conferir (deve mostrar diferenca = 0 pras 8, e continuar mostrando as
-- 3 que ficaram de fora):
SELECT
  o.numero, o.valor_total, o.desconto, o.valor_pago, o.pago,
  (SELECT COALESCE(SUM(valor), 0) FROM lancamento_financeiro
   WHERE os_id = o.id AND tipo = 'receita' AND deleted_at IS NULL AND pago_em IS NOT NULL
  ) AS soma_lancamentos_pagos
FROM os o
WHERE o.numero IN (1636, 1633, 1662, 1650, 1602, 1610, 1634, 1631, 437, 1598, 1623)
ORDER BY o.numero;
