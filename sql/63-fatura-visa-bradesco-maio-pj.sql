-- Fatura Visa Bradesco Neo Platinum (4641 XXXX XXXX 6669) - venc. 20/05/2026
-- Cartao PF do Toni. So entram itens PJ.
-- Fonte: FECHAMENTO MAIO/FATURAS CARTOES/VISA BRADESCO.pdf
-- Classificacao baseada em FATURA_ABRIL_2026_CONSOLIDADA.xlsx

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-VISA-BRADESCO-MAIO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-05-20','2026-05-20', 0, 'credito_parcelado'
FROM (VALUES
  (61.00, 'Pecas', 'Casa dos Parafusos 28/01 3/4'),
  (60.00, 'Pecas', 'Casa dos Parafusos 06/02 3/4'),
  (69.98, 'Pecas', 'Armazem 1,99 06/02 3/4'),
  (48.63, 'Materiais de limpeza', 'Limpeel Casa Carro 24/03 2/3'),
  (0.05, 'Tarifa banco', 'IOF Diario Rotativo'),
  (0.34, 'Tarifa banco', 'IOF Adicional Rotativo'),
  (100.00, 'Combustivel', 'Mano Auto Posto 23/04'),
  (68.90, 'Materiais de limpeza', 'Limpeel Casa Carro 23/04')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-VISA-BRADESCO-MAIO:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-VISA-BRADESCO-MAIO:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
