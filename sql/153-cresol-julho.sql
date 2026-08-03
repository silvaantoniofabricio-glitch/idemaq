-- Extrato Cresol PJ (138286-1) — julho 2026
-- Despesas PJ identificadas no extrato 01/07 a 31/07/2026.
--
-- Nao lancados (mesmo criterio do sql/94 de junho):
--   PIX Antonio Fabricio da Silva / PIX IDEMAQ -> transferencias internas / retiradas dono
--   DEBITO AUTOMATICO FATURA MASTERCARD R$1.537,51 -> itens ja lancados individualmente (sql/151/152)
--   PGTO PARCELA EMPRESTIMO R$1.421,71 -> emprestimo Cresol PJ (nao classificado ainda, avisar Toni se quiser lancar)
--   PGTO PARCELA EMPRESTIMO R$1.526,48 -> PF (parcela Civic, Rafa) em controleFinanceiroPF.js
--   Todos os "PIX CREDITO DE: <cliente>" -> receita de OS, ja lancada automaticamente pelo sistema

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'CRESOL-JUL:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  v.data, v.data, 0, 'debito'
FROM (VALUES
  ('2026-07-02'::date, 473.89,  'Pecas',         'Luciano Aparecido Lima Cri - compra pecas 02/07'),
  ('2026-07-06'::date, 1650.00, 'Salario',       'Salario Alessandro jul/2026'),
  ('2026-07-06'::date, 1000.00, 'Salario',       'Salario Guilherme jul/2026 (parcela 04/07)'),
  ('2026-07-06'::date, 650.00,  'Salario',       'Salario Guilherme jul/2026 (parcela 05/07)'),
  ('2026-07-06'::date, 51.99,   'Tarifa banco',  'Pacote Servicos Cresol jul/2026'),
  ('2026-07-07'::date, 403.93,  'Agua/Luz/Fone', 'Energia (reembolso Marcia F. Xaves) jul/2026'),
  ('2026-07-13'::date, 158.43,  'Agua/Luz/Fone', 'SANESUL agua jul/2026'),
  ('2026-07-14'::date, 250.00,  'Contabilidade', 'Zion Contabilidade jul/2026'),
  ('2026-07-20'::date, 776.11,  'Impostos',      'Ministerio da Fazenda (DAS) jul/2026'),
  ('2026-07-28'::date, 318.56,  'Pecas',         'Matucho Refrigeracao CG - compra pecas 28/07'),
  ('2026-07-29'::date, 60.67,   'Frete',         'Viacao Cruzeiro do Sul - frete 29/07')
) AS v(data, valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-JUL:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*) as qtd, SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'CRESOL-JUL:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
