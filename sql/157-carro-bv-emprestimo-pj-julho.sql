-- Pagamento Carro BV - 05/07/2026 - R$1.182,12
-- Confirmado por Toni: o carro e da empresa, entra como emprestimo PJ.
-- Fonte: planilha manual de despesas da Rafa (Banco do Brasil), julho 2026.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1182.12, 'Emprestimo', 'RAFA-JUL:Pagamento Carro BV 05/07', NULL,
  '2026-07-05', '2026-07-05', 0, 'debito'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'RAFA-JUL:Pagamento Carro BV 05/07' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE descricao = 'RAFA-JUL:Pagamento Carro BV 05/07' AND deleted_at IS NULL;
