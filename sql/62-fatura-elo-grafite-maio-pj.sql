-- Fatura Elo Grafite Bradesco (6550 XXXX XXXX 3558) - venc. 11/05/2026
-- Cartao PF do Toni, usado pra compras misturadas. So entram itens PJ.
-- Fonte: FECHAMENTO MAIO/FATURAS CARTOES/ELO GRAFITE.pdf
-- Classificacao PJ/PF: baseada na planilha FATURA_ABRIL_2026_CONSOLIDADA.xlsx
-- PF (todos os demais ~50 itens) ficam fora do sistema da empresa.

BEGIN;

-- Conta de origem: Bradesco PJ (fatura paga via boleto da conta Bradesco PJ em 11/05)
-- Categorias: Pecas, Combustivel, Materiais, Software

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-ELO-GRAFITE-MAIO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-05-11','2026-05-11', 0, 'credito_parcelado'
FROM (VALUES
  (52.96, 'Pecas', 'ML Autochave 7/12'),
  (21.44, 'Pecas', 'ML 525003907 6/9'),
  (28.66, 'Pecas', 'ML AFCCOMERC 6/9'),
  (94.44, 'Pecas', 'JIM Wellynton (embreagem Montana) 5/10'),
  (124.30, 'Materiais', 'Deposito ST Catarina (reforma) 2/10'),
  (48.16, 'Pecas', 'EC DIMAKMAQUINA 2/6'),
  (45.16, 'Pecas', 'EC ML 11/02 2/6'),
  (141.50, 'Materiais', 'Imperio da Construcao 2/6'),
  (35.49, 'Pecas', 'EC ML 09/03 1/4'),
  (50.00, 'Combustivel', 'Mano Auto Posto 03/04'),
  (100.00, 'Combustivel', 'Mano Auto Posto 05/04'),
  (20.00, 'Combustivel', 'Portal Auto Posto 10/04'),
  (210.00, 'Combustivel', 'Auto Posto Antonini 11/04'),
  (86.90, 'Pecas', 'ML Eletron 1/10'),
  (11.90, 'Software', 'Amazon Music 26/04'),
  (31.25, 'Materiais', 'Ilha Grande Materiais 3/4 (cartao adicional)')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-ELO-GRAFITE-MAIO:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-ELO-GRAFITE-MAIO:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
