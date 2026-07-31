-- Fatura Elo Grafite Bradesco (6550 XXXX XXXX 3558) - fatura paga 13/07/2026
-- Cartao PF do Toni. So entram itens PJ classificados na revisao.
-- Fonte: REVISAO FECHAMENTO 2026/JULHO/FATURAS/Bradesco_31072026_142327.xls
-- Despesas 01/07-29/07 + parcelas continuando de compras anteriores.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-ELO-GRAFITE-JUL:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome = 'Bradesco PJ' LIMIT 1),
  '2026-07-13', '2026-07-13', 0, 'credito_parcelado'
FROM (VALUES
  (48.19, 'Pecas',               'Casa dos Parafusos 17/06 2/6'),
  (53.72, 'Materiais de limpeza','Limpeel Casa Carro 15/06 2/5'),
  (86.90, 'Pecas',               'ML Eletron 15/04 4/10'),
  (141.50,'Materiais',           'Imperio da Construcao 16/02 6/6'),
  (48.16, 'Pecas',               'EC DimaKMaquina 11/02 6/6'),
  (45.16, 'Pecas',               'EC ML 11/02 6/6'),
  (124.30,'Materiais',           'Deposito ST Catarina 27/01 6/10'),
  (94.44, 'Pecas',               'JIM Wellynton embreagem Montana 06/11 9/10'),
  (52.96, 'Pecas',               'ML Autochave 17/09 11/12')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-ELO-GRAFITE-JUL:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUL:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
