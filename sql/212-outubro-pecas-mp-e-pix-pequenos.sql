-- Outubro/2026 — PJ parte 5 (respostas do Toni em 19/11)
--   MP: NunesBike 13/10 R$178,90 e PrincesAutLD 14/10 1/8 R$27,63 = pecas (PJ). Fecha a fatura MP 3.390,87 (PJ 3.229,10 + PF 161,77).
--   PIX pequenos = pecas pra oficina (nao salario):
--     Guilherme de Oliveira Souza R$15 (06/10, Cresol) -> sai do salario; diferenca em dinheiro sobe de 435 pra 450 (salario segue 1.600)
--     Alessandro Monteiro Felix R$10 (19/10, Nubank conta do Toni -> conta NULL)
--   PIX Wanderson R$20 (Nubank) = troco devolvido -> nao e despesa, nao lancado.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  CASE WHEN v.conta IS NULL THEN NULL
       ELSE (SELECT id FROM conta_bancaria WHERE nome = v.conta AND deleted_at IS NULL LIMIT 1) END,
  v.data::date, v.data::date, 0, v.forma
FROM (VALUES
  ('FAT-MP-OUT:Mercadolivre NunesBike 13/10', 178.90, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:Mercadolivre PrincesAutLD 14/10 1/8', 27.63, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('NUBANK-CONTA-OUT:Alessandro Monteiro Felix - pecas pra oficina 19/10', 10.00, 'Pecas', NULL, '2026-10-19', 'pix')
) AS v(descricao, valor, categoria, conta, data, forma)
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL);

UPDATE lancamento_financeiro
SET descricao = 'CRESOL-OUT:Guilherme de Oliveira Souza - pecas pra oficina 06/10', categoria = 'Pecas'
WHERE deleted_at IS NULL AND descricao = 'CRESOL-OUT:Salario Guilherme out/2026 (PIX 06/10 R$15)';

UPDATE lancamento_financeiro SET valor = 450.00
WHERE deleted_at IS NULL AND descricao = 'CRESOL-OUT:Salario Guilherme out/2026 (diferenca paga em dinheiro)';

COMMIT;

-- Verificacao: MP total 3229.10 (Mercado Pago Cartão) · Guilherme salario 1600 · pecas PIX 15 + 10
SELECT 'MP-OUT' AS item, count(*), sum(valor) FROM lancamento_financeiro WHERE deleted_at IS NULL AND descricao LIKE 'FAT-MP-OUT:%'
UNION ALL
SELECT 'Salario Guilherme', count(*), sum(valor) FROM lancamento_financeiro WHERE deleted_at IS NULL AND descricao LIKE 'CRESOL-OUT:Salario Guilherme%'
UNION ALL
SELECT 'Pecas PIX pequenos', count(*), sum(valor) FROM lancamento_financeiro WHERE deleted_at IS NULL AND descricao LIKE '%pecas pra oficina%' AND pago_em >= '2026-10-01';
