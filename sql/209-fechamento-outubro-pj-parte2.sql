-- Fechamento OUTUBRO/2026 — PJ parte 2 (prints enviados pelo Toni em 18/11)
--   Cresol Mastercard (venc. out, ciclo 01/09–30/09): fatura R$959,08, debito 13/10 (+19,90 tarifa ja no sql/208)
--     R Silva 2/12 (29,99) e estorno R Silva (-359,88) NAO lancados (regra do Toni).
--     Lancado: 959,08 + 359,88 - 29,99 = R$1.288,97 (19 itens)
--   Bradesco Elo Mais 3914 (venc. 10/10): fatura R$129,51 (4 itens, bate exato)
--   Carro BV outubro: valor padrao R$1.198,00 (extrato BB da Rafa ainda nao veio — ajustar se vier diferente)

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  CASE WHEN v.conta IS NULL THEN NULL
       ELSE (SELECT id FROM conta_bancaria WHERE nome = v.conta AND deleted_at IS NULL LIMIT 1) END,
  v.data::date, v.data::date, 0, v.forma
FROM (VALUES
  ('FAT-CRESOL-MASTER-OUT:Casa dos Parafusos 29/09',            13.00, 'Pecas',               'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Kaiser Pecas e Servicos 28/09',        8.00, 'Pecas',               'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Mano Auto Posto 24/09',              200.00, 'Combustivel',         'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Auto Pecas Navirai 23/09',            33.00, 'Servicos/Manutencao', 'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Limpeel Casa Carro 22/09 1/3',        90.60, 'Materiais de limpeza','Cresol Cartão', '2026-10-13', 'credito_parcelado'),
  ('FAT-CRESOL-MASTER-OUT:Casa dos Parafusos 15/09',            14.60, 'Pecas',               'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Mano Auto Posto 14/09',              200.00, 'Combustivel',         'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Comagran Produtos Agropecuarios 10/09',35.00,'Materiais',           'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Casa dos Parafusos 09/09 1/2',        61.45, 'Pecas',               'Cresol Cartão', '2026-10-13', 'credito_parcelado'),
  ('FAT-CRESOL-MASTER-OUT:Casa dos Parafusos 04/09',             4.00, 'Pecas',               'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:IPE Transporte e Gas 03/09',          55.00, 'Materiais',           'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:JIM.COM Maqsoldas 02/09',             24.00, 'Pecas',               'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Limpeel Casa Carro 02/09',            79.90, 'Materiais de limpeza','Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Mano Auto Posto 01/09',              200.00, 'Combustivel',         'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:JIM.COM Eletro Sam 01/09',            35.00, 'Pecas',               'Cresol Cartão', '2026-10-13', 'credito_1x'),
  ('FAT-CRESOL-MASTER-OUT:Limpeel Casa Carro 20/08 2/3',        59.97, 'Materiais de limpeza','Cresol Cartão', '2026-10-13', 'credito_parcelado'),
  ('FAT-CRESOL-MASTER-OUT:ML Mercado 15/04 6/6',                40.50, 'Pecas',               'Cresol Cartão', '2026-10-13', 'credito_parcelado'),
  ('FAT-CRESOL-MASTER-OUT:Ton.com.br (maquininha) 14/04 6/12',  14.96, 'Equipamentos',        'Cresol Cartão', '2026-10-13', 'credito_parcelado'),
  ('FAT-CRESOL-MASTER-OUT:Deposito ST Catarina 13/03 7/10',    119.99, 'Materiais',           'Cresol Cartão', '2026-10-13', 'credito_parcelado'),
  ('FAT-BRAD-PJ-ELO-OUT:Pronto Paulo Cesar AD 27/02 7/10 (pecas Montana)', 107.40, 'Servicos/Manutencao', 'Bradesco PJ', '2026-10-10', 'credito_parcelado'),
  ('FAT-BRAD-PJ-ELO-OUT:Anuidade 10/12',                        22.00, 'Tarifa cartao',       'Bradesco PJ', '2026-10-10', 'credito_1x'),
  ('FAT-BRAD-PJ-ELO-OUT:Facebook Ads QASVR3WBD4 10/09',          0.02, 'Trafego pago',        'Bradesco PJ', '2026-10-10', 'credito_1x'),
  ('FAT-BRAD-PJ-ELO-OUT:Facebook Ads Y82G84NBD4 07/09',          0.09, 'Trafego pago',        'Bradesco PJ', '2026-10-10', 'credito_1x'),
  ('RAFA-OUT:Pagamento Carro BV out/2026 (valor padrao, conferir extrato BB)', 1198.00, 'Emprestimo', NULL, '2026-10-05', 'debito')
) AS v(descricao, valor, categoria, conta, data, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL
);

COMMIT;

-- Verificacao: Master 19 / 1288.97 · Elo Mais 4 / 129.51 · BV 1 / 1198.00
SELECT split_part(descricao, ':', 1) AS prefixo, count(*), sum(valor)
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND (descricao LIKE 'FAT-CRESOL-MASTER-OUT:%' OR descricao LIKE 'FAT-BRAD-PJ-ELO-OUT:%' OR descricao LIKE 'RAFA-OUT:%')
GROUP BY 1 ORDER BY 1;
