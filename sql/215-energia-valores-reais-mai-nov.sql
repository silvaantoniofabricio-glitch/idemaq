-- Energia (Energisa) — valores REAIS por mes de referencia, informados pelo Toni em 19/11/2026
--   Antes: lancado pela data do PIX de reembolso a Marcia (1 conta atrasada), com valores misturados.
--   Agora: cada mes recebe a sua conta, data dia 07 (vencimento Energisa).
--     MAI 525,75 · JUN 403,36 · JUL 361,64 · AGO 454,95 · SET 296,91 · OUT 484,38 · NOV 587,11
--   O PIX de 23/10 (781,29) = SET 296,91 + OUT 484,38.
--   NOVEMBRO ja lancado aqui: NAO duplicar o PIX de reembolso da Energisa no extrato de novembro.

BEGIN;

UPDATE lancamento_financeiro SET deleted_at = now()
WHERE deleted_at IS NULL AND descricao IN (
  'NUBANK-MAIO:Energisa MS (luz)',
  'CRESOL-JUL:Energia (reembolso Marcia F. Xaves) jul/2026',
  'CRESOL-AGO:Energisa (via Marcia de Fatima) 31/08',
  'CRESOL-SET:Energisa (via Marcia de Fatima) 25/09',
  'CRESOL-OUT:Energisa (via Marcia de Fatima) 23/10'
);

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, 'Energia eletrica', v.descricao,
  CASE WHEN v.conta = 'MESMA-DE-MAIO'
    THEN (SELECT conta_id FROM lancamento_financeiro WHERE descricao = 'NUBANK-MAIO:Energisa MS (luz)' ORDER BY criado_em LIMIT 1)
    ELSE (SELECT id FROM conta_bancaria WHERE nome = v.conta AND deleted_at IS NULL LIMIT 1) END,
  v.data::date, v.data::date, 0, 'pix'
FROM (VALUES
  ('ENERGISA-MAI:Energisa luz mai/2026', 525.75, 'MESMA-DE-MAIO', '2026-05-07'),
  ('ENERGISA-JUN:Energisa luz jun/2026 (reembolso Marcia)', 403.36, 'Cresol', '2026-06-07'),
  ('ENERGISA-JUL:Energisa luz jul/2026 (reembolso Marcia)', 361.64, 'Cresol', '2026-07-07'),
  ('ENERGISA-AGO:Energisa luz ago/2026 (reembolso Marcia)', 454.95, 'Cresol', '2026-08-07'),
  ('ENERGISA-SET:Energisa luz set/2026 (reembolso Marcia, pago 23/10)', 296.91, 'Cresol', '2026-09-07'),
  ('ENERGISA-OUT:Energisa luz out/2026 (reembolso Marcia, pago 23/10)', 484.38, 'Cresol', '2026-10-07'),
  ('ENERGISA-NOV:Energisa luz nov/2026 (reembolso Marcia)', 587.11, 'Cresol', '2026-11-07')
) AS v(descricao, valor, conta, data)
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL);

COMMIT;

-- Verificacao: 7 linhas, total 3114.10, nenhuma energia antiga sobrando
SELECT to_char(pago_em, 'YYYY-MM') AS mes, count(*), sum(valor)
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND pago_em >= '2026-05-01'
  AND (categoria = 'Energia eletrica' OR descricao ILIKE '%energisa%' OR descricao ILIKE '%energia%')
GROUP BY 1 ORDER BY 1;
