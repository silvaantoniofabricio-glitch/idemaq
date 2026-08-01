-- Correcao: a maquininha fisica usada e a Ton Black, nao a InfinitePay.
-- InfinitePay so deve aparecer em lancamentos de Link de pagamento
-- (forma_pagamento = 'link_pagamento' ou variantes 'link_Nx').
--
-- Este script SO mexe em lancamentos de debito/credito (nao-link) que
-- estao apontando pra conta InfinitePay por engano — move pra Ton Black.

-- 1) Conferencia ANTES de mudar nada — rode isso primeiro e confira a lista.
SELECT lf.id, lf.descricao, lf.forma_pagamento, lf.valor, lf.vencimento, cb.nome AS conta_atual
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE cb.nome = 'InfinitePay'
  AND lf.deleted_at IS NULL
  AND (
    lf.forma_pagamento IS NULL
    OR lf.forma_pagamento NOT ILIKE 'link%'
  )
ORDER BY lf.vencimento DESC;

-- 2) Se a lista acima bater com o esperado (só débito/crédito, nenhum link),
--    descomente e rode o UPDATE abaixo.

-- BEGIN;
--
-- UPDATE lancamento_financeiro
-- SET conta_id = (SELECT id FROM conta_bancaria WHERE nome = 'Ton Black' LIMIT 1)
-- WHERE conta_id = (SELECT id FROM conta_bancaria WHERE nome = 'InfinitePay' LIMIT 1)
--   AND deleted_at IS NULL
--   AND (forma_pagamento IS NULL OR forma_pagamento NOT ILIKE 'link%');
--
-- COMMIT;

-- 3) Verificacao pos-update
-- SELECT cb.nome, lf.forma_pagamento, COUNT(*), SUM(lf.valor)
-- FROM lancamento_financeiro lf
-- JOIN conta_bancaria cb ON cb.id = lf.conta_id
-- WHERE cb.nome IN ('Ton Black', 'InfinitePay') AND lf.deleted_at IS NULL
-- GROUP BY cb.nome, lf.forma_pagamento
-- ORDER BY cb.nome, lf.forma_pagamento;
