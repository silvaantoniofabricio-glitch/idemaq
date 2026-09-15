-- Agua (Sanesul) de agosto/2026 — Toni esqueceu e pagou so em 15/09/2026,
-- mas pediu pra lançar no vencimento (mesmo padrao ja usado em maio, que foi
-- paga em junho mas lançada no vencimento de maio).
--
-- Vencimento 02/08/2026, R$164,47, pago via Cresol (mesma conta usada nos
-- meses anteriores).
--
-- ATENCAO — nao duplicar: o extrato bancario da Cresol de agosto (sql/190)
-- ja foi processado e NAO tinha essa saida, porque na epoca do extrato
-- (periodo 01/08 a 31/08) o pagamento ainda nao tinha acontecido. O
-- pagamento em si (15/09/2026) vai aparecer no extrato de SETEMBRO quando
-- ele chegar — aquela linha e so a QUITACAO desta agua de agosto que ja foi
-- lançada aqui, NAO e uma agua nova de setembro. Nao lançar de novo.

-- APLICADO em 20/08/2026.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 164.47, 'Agua/Luz/Fone', 'CRESOL-AGO:Sanesul agua ago/2026',
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  '2026-08-02', '2026-08-02', 0, 'debito'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-AGO:Sanesul agua ago/2026' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento, pago_em
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE '%Sanesul%'
ORDER BY vencimento;
