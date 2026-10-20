-- 20/10/2026 — Toni mandou VOLTAR os dois emprestimos pra PJ (reverte sql/196 e sql/197).
--   Carro BV (Votorantim, pago pela conta Banco do Brasil da Rafa): R$1.198 mai, 1.198 jun, 1.182,12 jul, 1.183,10 ago, 1.180,15 set
--   Emprestimo Cresol (contrato 372388): R$1.421,71 de mai a set
-- O Civic (Parcela Civic, Cresol) NAO mexe: continua PF.
-- APLICADO em 20/10/2026 pelo Chrome — 8 linhas restauradas (deleted_at = NULL) + 2 de setembro inseridas.

BEGIN;

UPDATE lancamento_financeiro SET deleted_at = NULL
WHERE categoria = 'Emprestimo' AND pago_em >= '2026-05-01' AND pago_em < '2026-09-01' AND deleted_at IS NOT NULL;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1180.15, 'Emprestimo', 'RAFA-SET:Pagamento Carro BV 04/09', NULL, '2026-09-04', '2026-09-04', 0, 'debito'
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'RAFA-SET:Pagamento Carro BV 04/09' AND deleted_at IS NULL);

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1421.71, 'Emprestimo', 'CRESOL-SET:Parcela emprestimo Cresol PJ 21/09',
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1), '2026-09-21', '2026-09-21', 0, 'debito'
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = 'CRESOL-SET:Parcela emprestimo Cresol PJ 21/09' AND deleted_at IS NULL);

COMMIT;

-- Verificacao: 10 linhas ativas (5 Carro BV + 5 Cresol), mai a set
SELECT to_char(pago_em,'MM-DD') AS pago, valor, deleted_at IS NULL AS ativo, descricao
FROM lancamento_financeiro WHERE categoria = 'Emprestimo' AND pago_em >= '2026-05-01' ORDER BY pago_em, valor;
