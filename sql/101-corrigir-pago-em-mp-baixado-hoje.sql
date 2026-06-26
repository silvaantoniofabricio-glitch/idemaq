-- Corrige pago_em dos lancamentos do Mercado Pago baixados manualmente em 26/06/2026
-- que deveriam ter outra data de pagamento.
-- Substitua '2026-XX-XX' pela data correta antes de rodar.

-- VER o que foi baixado hoje no MP:
SELECT id, descricao, valor, vencimento, pago_em
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.pago_em = '2026-06-26'
  AND lf.deleted_at IS NULL
  AND (cb.nome ILIKE '%mercado%' OR lf.descricao ILIKE '%mp%' OR lf.descricao ILIKE '%mercado%')
ORDER BY lf.vencimento;

-- CORRIGIR (troque a data e descomente):
/*
UPDATE lancamento_financeiro lf
SET pago_em = '2026-XX-XX'   -- << data correta aqui
FROM conta_bancaria cb
WHERE lf.conta_id = cb.id
  AND lf.pago_em = '2026-06-26'
  AND lf.deleted_at IS NULL
  AND (cb.nome ILIKE '%mercado%' OR lf.descricao ILIKE '%mp%' OR lf.descricao ILIKE '%mercado%');
*/
