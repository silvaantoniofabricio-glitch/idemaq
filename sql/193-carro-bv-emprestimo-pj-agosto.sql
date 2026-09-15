-- Pagamento Carro BV (Banco Votorantim) - 07/08/2026 - R$1.183,10
-- Mesmo padrao de julho (sql/157): Toni confirmou que o carro e da empresa,
-- entra como emprestimo PJ, mesmo saindo da conta pessoal da Rafa (Banco do
-- Brasil, nao rastreada no sistema — por isso conta_id NULL).
-- Fonte: extrato Banco do Brasil da Rafa, agosto 2026.

-- APLICADO em 20/08/2026.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1183.10, 'Emprestimo', 'RAFA-AGO:Pagamento Carro BV 07/08', NULL,
  '2026-08-07', '2026-08-07', 0, 'debito'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'RAFA-AGO:Pagamento Carro BV 07/08' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao: as duas parcelas lado a lado (julho e agosto)
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao ILIKE '%Pagamento Carro BV%'
ORDER BY vencimento;
