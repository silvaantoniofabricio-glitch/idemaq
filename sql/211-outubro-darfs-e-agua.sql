-- Outubro/2026 — PJ parte 4 (Toni mandou os DARFs em 19/11)
--   DARF 350,50 (pago 29/10, Cresol): INSS competencia 09/2026 — CP patronal MEI 97,26 + CP segurados 243,14 + multa 10,10
--   DARF 108,48 (pago 29/10, Cresol): multas por atraso na entrega da DASN-SIMEI (2025) 58,48 e do PGDAS-D (08/2026) 50,00
--   Agua Sanesul out/2026 R$201,56: PAGA EM NOVEMBRO, lançada em outubro (vencimento) a pedido do Toni.
--     NAO duplicar quando ler o extrato de NOVEMBRO.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  v.data::date, v.data::date, 0, v.forma
FROM (VALUES
  ('CRESOL-OUT:DARF INSS competencia 09/2026 (CP patronal + segurados, com multa) 29/10', 350.50, 'Impostos', '2026-10-29', 'pix'),
  ('CRESOL-OUT:DARF multas atraso entrega DASN-SIMEI 2025 + PGDAS-D 08/2026 29/10', 108.48, 'Impostos', '2026-10-29', 'pix'),
  ('CRESOL-OUT:Sanesul agua out/2026 (paga em novembro)', 201.56, 'Agua/Luz/Fone', '2026-10-02', 'debito')
) AS v(descricao, valor, categoria, data, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL
);

COMMIT;

SELECT descricao, valor, categoria, pago_em FROM lancamento_financeiro
WHERE deleted_at IS NULL AND (descricao LIKE 'CRESOL-OUT:DARF%' OR descricao LIKE 'CRESOL-OUT:Sanesul%');
