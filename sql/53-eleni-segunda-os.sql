-- Eleni Sordi Maier 67 9977-2525: na verdade sao 2 OS.
-- Atual: R$ 750 em 06/04/2026 (mantem)
-- Nova:  R$ 700 em maio (criado 06/05/2026 espelhando)

BEGIN;

INSERT INTO os (cliente_id, tipo, etapa, valor_total, valor_pago, pago,
                forma_pagamento, observacoes, criado_em, data_conclusao)
SELECT
  (SELECT id FROM cliente
   WHERE regexp_replace(telefone,'[^0-9]','','g') LIKE '%6799772525%'
     AND deleted_at IS NULL LIMIT 1),
  'atendimento','concluido',700.00,700.00,'total'::os_pagamento_status,'pix',
  'TRELLO-MAIO-2026:6799772525-B | Eleni 2a OS de maio R$ 700',
  '2026-05-06 12:00:00+00','2026-05-06'
WHERE NOT EXISTS(
  SELECT 1 FROM os
  WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799772525-B%'
    AND deleted_at IS NULL
);

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento, os_id)
SELECT 'receita', 700.00, 'Servico', 'Eleni Sordi Maier 67 9977-2525 (2a OS)',
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-05-06','2026-05-06', 0, 'pix',
  (SELECT id FROM os WHERE observacoes ILIKE '%TRELLO-MAIO-2026:6799772525-B%'
   AND deleted_at IS NULL LIMIT 1)
WHERE NOT EXISTS(
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao ILIKE '%Eleni%2a OS%' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT etapa, pago, COUNT(*), SUM(valor_total) as total
FROM os
WHERE criado_em >= '2026-05-01T03:00:00Z'
  AND criado_em < '2026-06-01T03:00:00Z'
  AND deleted_at IS NULL
  AND observacoes ILIKE '%TRELLO-MAIO-2026%'
GROUP BY etapa, pago
ORDER BY etapa;
