-- Seguro Prestamista (contratacao do cheque especial da conta Cresol) —
-- venc. 18/08/2026, R$25,20. Toni confirmou em 20/08: e da contratacao do
-- cheque especial, nao do emprestimo do Civic (esse ficou junto no mesmo
-- dia no extrato, mas sao coisas diferentes).
--
-- Cheque especial e linha de credito da propria conta corrente da empresa,
-- entao e PJ — diferente da Parcela Civic (essa sim PF, foi pra
-- DESPESAS_PF_RAFA_AGOSTO_2026 no controleFinanceiroPF.js).

-- APLICADO em 20/08/2026.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 25.20, 'Tarifa banco', 'CRESOL-AGO:Seguro Prestamista (cheque especial) 18/08',
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  '2026-08-18', '2026-08-18', 0, 'debito'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-AGO:Seguro Prestamista (cheque especial) 18/08' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao ILIKE '%prestamista%';
