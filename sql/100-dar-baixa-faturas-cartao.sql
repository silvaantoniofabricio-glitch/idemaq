-- Dar baixa nas faturas de cartao vencidas ate 26/06/2026
-- Aplica pago_em = vencimento em todos os lancamentos onde:
--   - pago_em IS NULL (ainda a pagar)
--   - vencimento <= 2026-06-26 (ja venceu)
--   - conta bancaria e do tipo 'cartao' OU categoria = 'Cartao'

-- CONFERIR ANTES: o que sera baixado
SELECT
  lf.id,
  cb.nome AS conta,
  cb.tipo AS tipo_conta,
  lf.categoria,
  lf.descricao,
  lf.valor,
  lf.vencimento
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.pago_em IS NULL
  AND lf.deleted_at IS NULL
  AND lf.vencimento <= '2026-06-26'
  AND (cb.tipo = 'cartao' OR lf.categoria = 'Cartao')
ORDER BY lf.vencimento, cb.nome;

-- BAIXA
UPDATE lancamento_financeiro lf
SET pago_em = lf.vencimento
FROM conta_bancaria cb
WHERE lf.conta_id = cb.id
  AND lf.pago_em IS NULL
  AND lf.deleted_at IS NULL
  AND lf.vencimento <= '2026-06-26'
  AND (cb.tipo = 'cartao' OR lf.categoria = 'Cartao');

SELECT 'Baixas aplicadas: ' || COUNT(*) AS resultado
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.pago_em IS NOT NULL
  AND lf.deleted_at IS NULL
  AND lf.vencimento <= '2026-06-26'
  AND (cb.tipo = 'cartao' OR lf.categoria = 'Cartao');
