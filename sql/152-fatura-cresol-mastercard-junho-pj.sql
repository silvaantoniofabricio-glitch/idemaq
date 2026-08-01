-- Fatura Cresol Mastercard - periodo 01/05 a 31/05/2026 - Total R$ 1.384,52
-- Cartao PJ do Cresol. So entram itens PJ classificados na revisao.
-- Fonte: REVISAO FECHAMENTO 2026/JUNHO/FATURAS/CRESOL FOTOS DA FATURA/ (1,2,3.jpeg)
--
-- PF excluidos (ja no array PF de junho em controleFinanceiroPF.js):
--   Mano Auto Posto 3x R$200,00 | JIM.COM Thiago Dos 13/03 2/6 R$121,75
--
-- Nota: falta a fatura do ciclo anterior (periodo 01/04-30/04) — as parcelas
-- pulam de 2/6 pra 4/6 (JIM.COM Thiago Dos) e de 2/10 pra 4/10 (Deposito ST
-- Catarina), faltando a parcela 3. Ciclo nao encontrado nos arquivos do
-- projeto — avisar Toni.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-CRESOL-MASTER-JUN:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-06-20', '2026-06-20', 0, 'credito_parcelado'
FROM (VALUES
  (43.50, 'Pecas',               'Casa dos Parafusos 26/05'),
  (30.00, 'Materiais de limpeza','Limpeel Casa Carro 25/05'),
  (72.99, 'Pecas',               'ML Regisla 16/05'),
  (20.00, 'Software',            'Anthropic Claude 14/05'),
  (33.33, 'Materiais de limpeza','Limpeel Casa Carro 14/05 1/3 (a)'),
  (53.33, 'Materiais de limpeza','Limpeel Casa Carro 14/05 1/3 (b)'),
  (10.95, 'Software',            'Anthropic Claude 13/05'),
  (15.00, 'Software',            'Anthropic Claude 12/05 (a)'),
  (28.98, 'Software',            'Anthropic Claude 12/05 (b)'),
  (10.21, 'Software',            'Anthropic Claude 12/05 (c)'),
  (23.70, 'Pecas',               'Casa dos Parafusos 12/05'),
  (10.70, 'Software',            'Anthropic Claude 12/05 (d)'),
  (20.00, 'Software',            'Anthropic Claude 12/05 (e)'),
  (40.50, 'Pecas',               'ML Mercado 15/04 2/6'),
  (14.96, 'Equipamentos',        'Ton.com.br (maquininha) 14/04 2/12'),
  (26.70, 'Pecas',               'ML Assiste 09/04 2/4'),
  (27.00, 'Pecas',               'ML Mercado 09/04 2/4'),
  (26.63, 'Pecas',               'ML Refripe 08/04 2/3'),
  (34.30, 'Pecas',               'Mercado Refripecas 02/04 2/5'),
  (119.99,'Materiais',           'Deposito ST Catarina 13/03 2/10')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-CRESOL-MASTER-JUN:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*) as qtd, SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-CRESOL-MASTER-JUN:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
