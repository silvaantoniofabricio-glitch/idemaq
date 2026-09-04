-- eSocial (INSS + FGTS funcionario MEI, competencia 07/2026) - venc. 20/08/2026
-- Toni pagou hoje, 20/08/2026, via PIX da conta Cresol (conta corrente PJ).
--
-- Composicao da guia (DAE 07.16.26214.8176984-8, total R$ 599,76):
--   1082  CP segurados - empregado contratado por MEI ....... 243,14
--   1138  CP patronal - MEI ................................... 97,26
--   1718  FGTS - deposito mensal ............................. 259,36
--
-- Regime de caixa: competencia e julho, mas o pagamento caiu em 20/08 —
-- entao a despesa pertence a AGOSTO/2026. Nao altera o fechamento de julho
-- nem o documento entregue ao contador.
--
-- Diferenca pro sql/154 (competencia 06/2026): aquele saiu da conta pessoal
-- Bradesco PF (nao rastreada, conta_id NULL). Este saiu da Cresol PJ, entao
-- vai amarrado na conta.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 599.76, 'Impostos', 'ESOCIAL-JUL:INSS+FGTS competencia 07/2026',
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  '2026-08-20', '2026-08-20', 0, 'pix'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'ESOCIAL-JUL:INSS+FGTS competencia 07/2026' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao: as duas guias lado a lado (junho sem conta, julho na Cresol)
SELECT lf.descricao, lf.valor, lf.categoria, cb.nome AS conta,
       lf.vencimento, lf.pago_em, lf.forma_pagamento
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND lf.descricao LIKE 'ESOCIAL-%'
ORDER BY lf.vencimento;
