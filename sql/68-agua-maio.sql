-- Conta de agua Sanesul - venceu 04/05/2026, pagamento real 01/06/2026
-- Lancada com data 04/05 (vencimento) a pedido do Toni para entrar no fechamento maio.
-- ATENCAO: Quando fizer leitura do extrato Cresol de junho, NAO lancar de novo o debito
-- de R$ 199,27 que aparecera em 01/06/2026 - ja esta aqui.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 199.27, 'Agua', 'AGUA-MAIO:Sanesul (venc 04/05, paga 01/06 via Cresol)',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-05-04','2026-05-04', 0, 'pix'
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'AGUA-MAIO:Sanesul (venc 04/05, paga 01/06 via Cresol)' AND deleted_at IS NULL);

COMMIT;

SELECT descricao, valor, vencimento, pago_em
FROM lancamento_financeiro
WHERE descricao LIKE 'AGUA-MAIO:%' AND deleted_at IS NULL;
