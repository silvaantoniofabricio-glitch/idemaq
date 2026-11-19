-- 19/11/2026 (aplicado): guia eSocial competencia 09/2026 reemitida e paga em 19/11 — R$665,79 (Cresol).
-- Lançada em OUTUBRO (vencimento 20/10), padrao dos impostos. NAO duplicar no extrato de NOVEMBRO.
--   FGTS 259,36 + encargos 28,94 = 288,30
--   INSS 269,64 + 107,85 = 377,49 -> JA tinha sido pago no DARF 350,50 de 29/10 (sql/211): pagamento em DUPLICIDADE.
--     Pedir a Zion compensacao (PER/DCOMP) com o INSS dos proximos meses ou restituicao.
INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, 'Impostos', v.descricao,
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  '2026-10-20', '2026-10-20', 0, 'pix'
FROM (VALUES
  ('ESOCIAL-OUT:FGTS competencia 09/2026 + encargos atraso (259,36 + 28,94) - pago 19/11', 288.30),
  ('ESOCIAL-OUT:INSS competencia 09/2026 PAGO EM DUPLICIDADE (ja quitado no DARF 350,50 de 29/10) - pago 19/11, pedir compensacao', 377.49)
) AS v(descricao, valor)
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL);
