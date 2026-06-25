-- Fatura Mercado Pago (Visa 5566) - venc. 22/06/2026 - Total R$ 3.794,72
-- Cartao PF do Toni, usado quase exclusivamente para compras PJ (pecas lavadora/microondas).
-- Fonte: REVISAO FECHAMENTO 2026/JUNHO/FATURAS/fatura mercado pago junho 26.pdf
-- Verificado no historico ML: todas as compras sao pecas e componentes para assistencia tecnica.
--
-- PF excluidos (parcelas continuadas confirmadas do mes passado):
--   EBAZARCOMBRL 10/18 R$50,07 | GAYA 10/12 R$35,83 | CUBOSHOP 5/8 R$18,75
--   JOYBASICO 4/12 R$10,97   | 2PRODUTOS 4/12 R$12,43 | BARBEARIA 4/4 R$13,68
--   ML MercadoLivre 4/10 R$44,81 | ML MercadoLivre 5/8 R$27,37

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-MP-JUN:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Mercado Pago' LIMIT 1),
  '2026-06-22', NULL, 0, 'credito_parcelado'
FROM (VALUES
  -- Parcelas antigas PJ (confirmadas no sql/65 de maio)
  (22.84, 'Ferramentas',  'ML Ismafer 01/12 8/11'),
  (78.64, 'Pecas',        'ML LojaDoMecanico 01/12 7/7'),
  (32.85, 'Pecas',        'ML MercadoLi 04/11'),
  (23.71, 'Pecas',        'ML MercadoLivre 05/12 7/18'),
  (17.48, 'Pecas',        'ML MercadoLivre 27/12 7/7'),
  (23.33, 'Pecas',        'ML AT4U 08/01 6/6'),
  (24.98, 'Pecas',        'ML DSSRefrigera 08/01 6/6'),
  (27.37, 'Pecas',        'ML MercadoLivre 26/01 6/6'),
  (16.63, 'Pecas',        'ML MercadoLivre 02/02 5/5'),
  (27.48, 'Pecas',        'ML MercadoLi 04/02 5/5'),
  (24.31, 'Pecas',        'ML EletroUti 04/02 5/6'),
  (40.90, 'Pecas',        'ML MercadoLivre 05/02 5/11'),
  (19.98, 'Pecas',        'ML PSMarket 09/02 5/6'),
  (13.97, 'Pecas',        'ML MercadoLivre 21/02 4/4'),
  (17.48, 'Pecas',        'ML MercadoLivre 21/02 4/6'),
  (35.85, 'Pecas',        'ML MercadoLivre 03/03 4/8'),
  (14.84, 'Pecas',        'ML PED 05/03 4/5'),
  (20.27, 'Pecas',        'ML ConsertoMaq 05/03 4/6'),
  (16.87, 'Pecas',        'ML ElliMaqPecas 05/03 4/6'),
  (25.24, 'Pecas',        'ML MercadoLi 06/03 4/8 (a)'),
  (27.48, 'Pecas',        'ML MercadoLi 06/03 4/8 (b)'),
  (30.50, 'Pecas',        'ML MercadoLivre 31/03 3/8'),
  (23.67, 'Pecas',        'ML MercadoLivre 02/04 3/8'),
  (18.66, 'Pecas',        'ML PED 29/04 2/6'),
  (16.13, 'Pecas',        'ML MercadoLivre 04/05 2/5'),
  -- Compras novas PJ (confirmadas no historico ML)
  (25.08, 'Pecas',        'ML AqueceArP 19/05 1/7'),
  (257.00,'Pecas',        'ML MercadoLivre 19/05 (avulso)'),
  (65.70, 'Pecas',        'ML MercadoLivre 20/05 1/8'),
  (111.80,'Pecas',        'ML MercadoLivre 21/05 (avulso)'),
  (103.68,'Pecas',        'ML SelecaoDePec 22/05'),
  (210.00,'Pecas',        'ML Princesau 23/05 (Mecanismo Chinezinho Electrolux)'),
  (178.00,'Pecas',        'ML MercadoLivre 25/05 (Valvula Consul avulso)'),
  (227.66,'Pecas',        'ML CompElectro 25/05 (Placa Potencia Lavadora)'),
  (234.33,'Pecas',        'ML FacilManguei 26/05 (Mecanismo Eixo Curto Brastemp)'),
  (168.00,'Pecas',        'ML LojaBatoni 26/05 (Pistola + Kit Engate Lavadoras)'),
  (65.47, 'Software',     'Trello Atlassian 28/05'),
  (108.80,'Pecas',        'ML JRCompany 02/06'),
  (34.15, 'Pecas',        'ML MercadoLivre 02/06 (avulso)'),
  (555.76,'Pecas',        'ML MercadoLivre 02/06 (lote pecas)'),
  (199.89,'Pecas',        'ML CarlosDantas 10/06 (Kit Eixo Tripe Samsung)'),
  (199.08,'Pecas',        'ML MercadoLi 13/06 (Placa Interface Lavadora)'),
  (49.29, 'Pecas',        'ML MercadoLi 13/06 1/12 (Kit Capacitor Brastemp)'),
  (173.03,'Pecas',        'ML MBParts 14/06')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-MP-JUN:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*) as qtd, SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-MP-JUN:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
