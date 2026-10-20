-- Insere a OS Solange 67 9659-9557 R$ 185 do 29/05/2026 que foi bloqueada
-- pelo guard NOT EXISTS no sql/49 (mesmo telefone da Solange R$ 400 do 20/05).

BEGIN;

INSERT INTO os (cliente_id, tipo, etapa, valor_total, valor_pago, pago,
                forma_pagamento, observacoes, criado_em, data_conclusao)
SELECT
  (SELECT id FROM cliente
   WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6796599557%'
     AND deleted_at IS NULL LIMIT 1),
  'atendimento','concluido',185.00,185.00,'total'::os_pagamento_status,'credito_1x',
  'TRELLO-MAIO-2026:6796599557-B | Solange 2o atendimento 29/05 - InfinitePay',
  '2026-05-29 12:00:00+00','2026-05-29'
WHERE NOT EXISTS(
  SELECT 1 FROM os
  WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6796599557-B%'
    AND deleted_at IS NULL
);

COMMIT;

-- Verificacao final
SELECT etapa, pago, COUNT(*), SUM(valor_total) as total
FROM os
WHERE criado_em >= '2026-05-01T03:00:00Z'
  AND criado_em < '2026-06-01T03:00:00Z'
  AND deleted_at IS NULL
  AND observacoes ILIKE '%TRELLO-MAIO-2026%'
GROUP BY etapa, pago
ORDER BY etapa;
