-- Extrato Cresol PJ (138286-1) — junho 2026
-- Despesas PJ identificadas no extrato 01/06 a 25/06/2026.
--
-- Nao lancados:
--   Salario Guilherme extrato mostra R$1.400 (R$350 pago fora do Cresol); lancamos R$1.750 total.
--   SANESUL 01/06 R$199,27 -> ja lancado em maio (vencimento 04/05).
--   PIX IDEMAQ / PIX ANTONIO FABRICIO -> transferencias internas / retiradas dono.
--   NU PAGAMENTOS R$374,72 -> pagamento fatura Nubank (itens ja lancados).
--   Fatura Mastercard R$1.388,47 -> itens ja lancados individualmente.
--   Neide R$15,00 -> troco de overpayment (nao e despesa real).
--   Emprestimo R$1.526,48 -> PF (parcela Civic) em controleFinanceiroPF.js.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'CRESOL-JUN:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  v.data, v.data, 0, 'debito'
FROM (VALUES
  ('2026-06-01'::date, 100.00,   'Pecas',         'Jane Valeria da Si - compra maquina 01/06'),
  ('2026-06-05'::date, 1750.00,  'Salario',        'Salario Alessandro jun/2026'),
  ('2026-06-05'::date, 1750.00,  'Salario',        'Salario Guilherme jun/2026'),
  ('2026-06-05'::date, 51.99,    'Tarifa banco',   'Pacote Servicos Cresol jun/2026'),
  ('2026-06-10'::date, 909.35,   'Pecas',          'Luciano Aparecido Lima Cri - compra pecas 10/06'),
  ('2026-06-11'::date, 151.59,   'Agua/Luz/Fone',  'SANESUL agua jun/2026'),
  ('2026-06-11'::date, 320.00,   'Contabilidade',  'Zion Contabilidade jun/2026'),
  ('2026-06-11'::date, 137.91,   'Agua/Luz/Fone',  'FleetNet Telecomunicacoes jun/2026'),
  ('2026-06-11'::date, 64.73,    'Frete',          'Viacao Cruzeiro do Sul - frete 11/06'),
  ('2026-06-22'::date, 1421.71,  'Emprestimo',     'Parcela emprestimo Cresol PJ 22/06')
) AS v(data, valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-JUN:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*) as qtd, SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'CRESOL-JUN:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
