-- Outubro/2026 — PJ parte 3 (respostas do Toni em 18/11)
--   Salarios: R$1.600 para cada um. PIX Cresol + diferenca em dinheiro.
--     Alessandro: 500 (05/10) + 650 (06/10) + 450 dinheiro
--     Guilherme:  500 (05/10) + 650 (06/10) + 15 (06/10) + 435 dinheiro  (PIX de 15 tratado como salario — confirmar)
--   Compra de lavadoras (PIX Cresol): Priscila Bressa 200 (06/10), Irene Pereira Batista 100 (14/10), Jane Valeria 100 (30/10)
--   Credito de R$7.500 no Nubank (16/10) = dinheiro emprestado pra pagar contas -> NAO e faturamento nem despesa; nao lancado.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  v.data::date, v.data::date, 0, v.forma
FROM (VALUES
  ('CRESOL-OUT:Salario Alessandro out/2026 (PIX 05/10 R$500)', 500.00, 'Salario', '2026-10-05', 'pix'),
  ('CRESOL-OUT:Salario Alessandro out/2026 (PIX 06/10 R$650)', 650.00, 'Salario', '2026-10-06', 'pix'),
  ('CRESOL-OUT:Salario Alessandro out/2026 (diferenca paga em dinheiro)', 450.00, 'Salario', '2026-10-06', 'dinheiro'),
  ('CRESOL-OUT:Salario Guilherme out/2026 (PIX 05/10 R$500)', 500.00, 'Salario', '2026-10-05', 'pix'),
  ('CRESOL-OUT:Salario Guilherme out/2026 (PIX 06/10 R$650)', 650.00, 'Salario', '2026-10-06', 'pix'),
  ('CRESOL-OUT:Salario Guilherme out/2026 (PIX 06/10 R$15)', 15.00, 'Salario', '2026-10-06', 'pix'),
  ('CRESOL-OUT:Salario Guilherme out/2026 (diferenca paga em dinheiro)', 435.00, 'Salario', '2026-10-06', 'dinheiro'),
  ('CRESOL-OUT:Priscila Bressa Zandonadi - compra de lavadora 06/10', 200.00, 'Compra de maquina', '2026-10-06', 'pix'),
  ('CRESOL-OUT:Irene Pereira Batista - compra de lavadora 14/10', 100.00, 'Compra de maquina', '2026-10-14', 'pix'),
  ('CRESOL-OUT:Jane Valeria da Silva - compra de lavadora 30/10', 100.00, 'Compra de maquina', '2026-10-30', 'pix')
) AS v(descricao, valor, categoria, data, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL
);

COMMIT;

-- Verificacao: Alessandro 1600 · Guilherme 1600 · Compra de maquina 400
SELECT CASE WHEN descricao ILIKE '%Alessandro%' THEN 'Alessandro'
            WHEN descricao ILIKE '%Guilherme%' THEN 'Guilherme' ELSE categoria END AS grupo,
       count(*), sum(valor)
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'CRESOL-OUT:%'
  AND (categoria = 'Salario' OR categoria = 'Compra de maquina')
GROUP BY 1 ORDER BY 1;
