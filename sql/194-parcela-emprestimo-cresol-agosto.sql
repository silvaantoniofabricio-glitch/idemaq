-- Parcela do emprestimo Cresol PJ (contrato 500100320260372388) de agosto —
-- ficou de fora do sql/190 por engano. E a mesma serie mensal de sempre
-- (maio/junho/julho, sempre R$1.421,71, mesmo contrato 372388) — confirmado
-- no extrato: "20/08/2026 PGTO PARCELA EMPRESTIMO DEBITO AUTOMATICO
-- 500100320260372388-5 - R$1.421,71".
--
-- Nao confundir com o outro emprestimo de agosto (contrato 531371, a
-- Parcela Civic — essa e PF, ja tratada em DESPESAS_PF_RAFA_AGOSTO_2026)
-- nem com o Seguro Prestamista (sql/192). Sao 3 coisas diferentes que
-- caíram no extrato quase juntas.

-- APLICADO em 20/08/2026 — serie confirmada completa: mai/jun/jul/ago,
-- sempre R$1.421,71.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 1421.71, 'Emprestimo', 'CRESOL-AGO:Parcela emprestimo Cresol PJ 20/08',
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  '2026-08-20', '2026-08-20', 0, 'debito'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-AGO:Parcela emprestimo Cresol PJ 20/08' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao: a serie completa, mes a mes (maio a agosto, sempre R$1.421,71)
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND (descricao ILIKE '%emprestimo cresol%' OR descricao ILIKE '%372388%')
ORDER BY vencimento;
