-- Fatura Mercado Pago (Visa 5566) - venc. 20/07/2026 - Total R$ 3.341,34
-- Cartao PF do Toni, usado quase exclusivamente para compras PJ (pecas lavadora/microondas).
-- Fonte: REVISAO FECHAMENTO 2026/JULHO/FATURAS/credit-card-mp-statement.pdf
--
-- PF excluidos (parcelas continuadas confirmadas em sql/90 de junho):
--   EBAZARCOMBRL 11/18 R$50,07 | GAYA 11/12 R$35,83 | JOYBASICO 5/12 R$10,97
--   2PRODUTOS 5/12 R$12,43 | ML MercadoLivre 26/01 6/8 R$27,37
--   ML MercadoLivre 09/03 5/10 R$44,81

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-MP-JUL:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-07-20', NULL, 0, 'credito_parcelado'
FROM (VALUES
  -- Parcelas antigas PJ (continuacao de sql/90)
  (32.85, 'Pecas', 'ML MercadoLi 04/11 9/11'),
  (78.64, 'Pecas', 'ML LojaDoMecanico 01/12 8/18'),
  (27.48, 'Pecas', 'ML MercadoLi 04/02 6/8'),
  (24.31, 'Pecas', 'ML EletroUti 04/02 6/6'),
  (40.90, 'Pecas', 'ML MercadoLivre 05/02 6/11'),
  (19.98, 'Pecas', 'ML PSMarket 09/02 6/6'),
  (17.48, 'Pecas', 'ML MercadoLivre 21/02 5/6'),
  (35.85, 'Pecas', 'ML MercadoLivre 03/03 5/8'),
  (14.84, 'Pecas', 'ML PED 05/03 5/5'),
  (20.27, 'Pecas', 'ML ConsertoMaq 05/03 5/6'),
  (16.87, 'Pecas', 'ML ElliMaqPecas 05/03 5/6'),
  (25.24, 'Pecas', 'ML MercadoLi 06/03 5/8 (a)'),
  (27.48, 'Pecas', 'ML MercadoLi 06/03 5/8 (b)'),
  (30.50, 'Pecas', 'ML MercadoLivre 31/03 4/8'),
  (23.67, 'Pecas', 'ML MercadoLivre 02/04 4/8'),
  (18.66, 'Pecas', 'ML PED 29/04 3/6'),
  (16.13, 'Pecas', 'ML MercadoLivre 04/05 3/5'),
  (25.07, 'Pecas', 'ML AqueceArP 19/05 2/7'),
  (34.11, 'Pecas', 'ML MercadoLivre 02/06 2/8'),
  (49.20, 'Pecas', 'ML MercadoLi 13/06 2/12'),
  -- Compras novas de junho/julho (confirmadas historico ML — pecas assistencia tecnica)
  (223.31,'Pecas', 'ML MercadoLivre 17/06 (a)'),
  (81.80, 'Pecas', 'ML MercadoLivre 17/06 (b)'),
  (27.30, 'Pecas', 'ML BMLDistribui 18/06 1/8'),
  (92.58, 'Pecas', 'ML SelecaoDePec 18/06'),
  (0.08,  'Trafego pago', 'Facebook Ads Adctks5cd2 19/06'),
  (40.98, 'Pecas', 'ML PecasAJato 22/06'),
  (23.85, 'Pecas', 'ML KalisFrio 22/06 1/7'),
  (269.00,'Pecas', 'ML MercadoLivre 23/06 (a)'),
  (269.90,'Pecas', 'ML MercadoLivre 23/06 (b)'),
  (50.40, 'Pecas', 'ML MercadoLivre 26/06'),
  (33.99, 'Pecas', 'ML WayShop 30/06'),
  (84.55, 'Pecas', 'ML CiliosRicky 30/06'),
  (21.00, 'Pecas', 'ML IlhaDaEletro 30/06 1/6'),
  (22.64, 'Pecas', 'ML Leao 30/06'),
  (18.33, 'Pecas', 'ML MercadoLivre 30/06 1/6 (a)'),
  (24.35, 'Pecas', 'ML MercadoLivre 30/06 1/6 (b)'),
  (0.06,  'Trafego pago', 'Facebook Ads 5pa2uv9cd2 01/07'),
  (235.00,'Pecas', 'ML Braslam 03/07 (a)'),
  (38.54, 'Pecas', 'ML Braslam 03/07 (b)'),
  (118.30,'Pecas', 'ML GelMaq 06/07'),
  (339.90,'Pecas', 'ML MercadoLivre 06/07'),
  (43.51, 'Pecas', 'ML Consultor 08/07 1/8'),
  (22.91, 'Pecas', 'ML MercadoLi 09/07 1/8'),
  (195.60,'Pecas', 'ML MercadoLi 10/07'),
  (179.49,'Pecas', 'ML TrevilarPeca 13/07'),
  (122.96,'Pecas', 'ML ComClick 14/07')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-MP-JUL:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*) as qtd, SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-MP-JUL:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
