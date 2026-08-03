-- eSocial (INSS + FGTS funcionario MEI, competencia 06/2026) - venc. 20/07/2026
-- Pago da conta pessoal Bradesco PF do Toni (nao rastreada no sistema).
-- Despesa PJ real, sem conta_bancaria associada (conta_id NULL).
-- Fonte: REVISAO FECHAMENTO 2026/JULHO/FATURAS IMPOSTOS/GuiaPagamento_55474130000158_060720261909199080.pdf

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 599.76, 'Impostos', 'ESOCIAL-JUN:INSS+FGTS competencia 06/2026', NULL,
  '2026-07-20', '2026-07-20', 0, 'pix'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'ESOCIAL-JUN:INSS+FGTS competencia 06/2026' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, conta_id, vencimento, pago_em
FROM lancamento_financeiro
WHERE descricao = 'ESOCIAL-JUN:INSS+FGTS competencia 06/2026' AND deleted_at IS NULL;
