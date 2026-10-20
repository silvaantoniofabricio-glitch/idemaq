-- Eleni R$ 750 e a OS de abril (criado_em 06/04/2026).
-- A data_conclusao tinha sido mudada pra 15/05, devolve pra 06/04.

UPDATE os
SET data_conclusao = '2026-04-06'
WHERE id = '4d3ce03b-0cec-4495-b76a-83268399b58c';

-- Verificacao
SELECT etapa, pago, COUNT(*), SUM(valor_total) as total
FROM os
WHERE criado_em >= '2026-05-01T03:00:00Z'
  AND criado_em < '2026-06-01T03:00:00Z'
  AND deleted_at IS NULL
  AND observacoes ILIKE '%TRELLO-MAIO-2026%'
GROUP BY etapa, pago
ORDER BY etapa;
