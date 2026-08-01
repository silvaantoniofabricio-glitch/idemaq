-- Fatura Cresol Mastercard - periodo 01/06 a 30/06/2026 - Total R$ 1.517,61
-- Cartao PJ do Cresol. So entram itens PJ classificados na revisao.
-- Fonte: fotos do extrato Cresol (app), enviadas por Toni 01/08/2026.
--
-- PF excluidos (ja no array PF de julho em controleFinanceiroPF.js):
--   Mano Auto Posto 3x R$200,00 | Supermercado Chama 3x (12,99+11,51+24,01)
--   JIM.COM Thiago Dos 13/03 4/6 R$121,75

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-CRESOL-MASTER-JUL:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Cresol' LIMIT 1),
  '2026-07-20', '2026-07-20', 0, 'credito_parcelado'
FROM (VALUES
  (36.00, 'Pecas',               'JIM.COM Maqsoldas 22/06'),
  (285.80,'Pecas',               'ML BCMPeca 18/06'),
  (25.00, 'Materiais',           'Com-El (materiais eletricos) 13/06'),
  (23.80, 'Pecas',               'Casa dos Parafusos 08/06'),
  (33.33, 'Materiais de limpeza','Limpeel Casa Carro 14/05 2/3 (a)'),
  (53.33, 'Materiais de limpeza','Limpeel Casa Carro 14/05 2/3 (b)'),
  (40.50, 'Pecas',               'ML Mercado 15/04 3/6'),
  (14.96, 'Equipamentos',        'Ton.com.br (maquininha) 14/04 3/12'),
  (26.70, 'Pecas',               'ML Assiste 09/04 3/4'),
  (27.00, 'Pecas',               'ML Mercado 09/04 3/4'),
  (26.64, 'Pecas',               'ML Refripe 08/04 3/3'),
  (34.30, 'Pecas',               'Mercado Refripecas 02/04 3/5'),
  (119.99,'Materiais',           'Deposito ST Catarina 13/03 4/10')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-CRESOL-MASTER-JUL:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*) as qtd, SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-CRESOL-MASTER-JUL:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
