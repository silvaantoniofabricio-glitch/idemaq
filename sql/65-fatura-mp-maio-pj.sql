-- Fatura Mercado Pago (Visa 5566 + Visa 2360) - venc. 20/05/2026 - Total R$ 3.611,02
-- Fonte: FECHAMENTO MAIO/FATURAS CARTOES/MERCADO PAGO.pdf
-- Regra Toni: peças lavadora/Montana/limpeza = PJ. Roupas/calcados/Focus/PC = PF.
-- Default PJ (MP histórico majoritariamente PJ).

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-MP-MAIO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-05-20','2026-05-20', 0, 'credito_parcelado'
FROM (VALUES
  -- Parcelas antigas (continuacao PJ)
  (87.90, 'Pecas', 'ML 28Produtos 23/10 18/18'),
  (157.42, 'Pecas', 'ML EbazarComBR 20/05 12/12'),
  (23.52, 'Pecas', 'MP 2Produtos 02/07 11/11'),
  (13.60, 'Pecas', 'ML EbazarComBR 06/09 9/9'),
  (32.85, 'Pecas', 'ML MercadoLi 04/11 7/11'),
  (7.42, 'Pecas', 'ML MercadoLivre 05/11 7/7'),
  (22.84, 'Ferramentas', 'ML Ismafer 01/12 6/7'),
  (78.64, 'Pecas', 'ML LojaDoMecanico 01/12 6/18'),
  (23.71, 'Pecas', 'ML MercadoLivre 05/12 6/7'),
  (17.48, 'Pecas', 'ML MercadoLivre 27/12 5/6'),
  (23.33, 'Pecas', 'ML AT4U 08/01 5/6'),
  (24.98, 'Pecas', 'ML DSSRefrigera 08/01 5/6 (refrigeracao)'),
  (16.63, 'Pecas', 'ML MercadoLivre 02/02 4/5'),
  (11.37, 'Pecas', 'ML MercadoLi 02/02 4/4'),
  (14.84, 'Pecas', 'ML MercadoLivre 02/02 4/4'),
  (27.48, 'Pecas', 'ML MercadoLi 04/02 4/8'),
  (24.31, 'Pecas', 'ML EletroUti 04/02 4/6'),
  (40.90, 'Pecas', 'ML MercadoLivre 05/02 4/11'),
  (19.98, 'Pecas', 'ML PSMarket 09/02 4/6'),
  (13.97, 'Pecas', 'ML MercadoLivre 21/02 3/4'),
  (17.48, 'Pecas', 'ML MercadoLivre 21/02 3/6'),
  (35.85, 'Pecas', 'ML MercadoLivre 03/03 3/8'),
  (14.84, 'Pecas', 'ML PED 05/03 3/5'),
  (20.27, 'Pecas', 'ML ConsertoMaq 05/03 3/6'),
  (16.87, 'Pecas', 'ML ElliMaqPecas 05/03 3/6'),
  (25.24, 'Pecas', 'ML MercadoLi 06/03 3/8 (a)'),
  (27.48, 'Pecas', 'ML MercadoLi 06/03 3/8 (b)'),
  (30.50, 'Pecas', 'ML MercadoLivre 31/03 2/8'),
  (23.67, 'Pecas', 'ML MercadoLivre 02/04 2/8'),
  (391.87, 'Pecas', 'ML 2Produtos 17/04 (a)'),
  (184.98, 'Pecas', 'ML 2Produtos 17/04 (b)'),
  -- Compras a vista de abril/maio
  (179.95, 'Pecas', 'ML MercadoLivre 22/04 (a)'),
  (179.98, 'Pecas', 'ML MercadoLivre 25/04'),
  (108.00, 'Materiais de limpeza', 'ML GraxaBranca 28/04'),
  (64.31, 'Software', 'Trello Atlassian 28/04 (USD 12.5 internacional)'),
  (185.42, 'Pecas', 'ML GelMaq 29/04'),
  (18.70, 'Pecas', 'ML PED 29/04'),
  (65.29, 'Pecas', 'ML GelMaq 02/05 1/6'),
  (16.13, 'Pecas', 'ML MercadoLivre 04/05'),
  (51.39, 'Pecas', 'ML MercadoLi 06/05 1/5'),
  (250.00, 'Pecas', 'ML MercadoLivre 07/05'),
  (49.97, 'Pecas', 'ML SelecaoDePec 08/05'),
  (58.00, 'Pecas', 'ML MercadoLivre 09/05'),
  (277.08, 'Pecas', 'ML MercadoLivre 11/05'),
  (91.91, 'Pecas', 'ML MercadoLivre 12/05'),
  -- Itens reclassificados PJ apos checar XMLs (Batoni = peças, Fraelli = peças)
  (41.89, 'Pecas', 'ML LojaBatoni 08/05 (L A Muedra Batoni)'),
  (27.27, 'Pecas', 'ML GrupoFraelli 22/04 (Fraellio Industria)'),
  -- Cartao Visa 2360 (todo PJ)
  (200.00, 'Combustivel', 'Mano Auto Posto 23/04'),
  (28.00, 'Pecas', 'Eletro Garrincha 27/04'),
  (11.90, 'Pecas', 'Casa dos Parafusos 27/04')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-MP-MAIO:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-MP-MAIO:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
