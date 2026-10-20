-- Fatura Bradesco PJ Empresarial Elo Mais (3914) - venc. 10/05/2026
-- Cartao PJ (CNPJ 55.474.130). Quase tudo PJ (peças, Facebook Ads, anuidade).
-- Unico PF: Supermercado Chama R$ 23,83.
-- Fonte: FECHAMENTO MAIO/FATURAS CARTOES/BRADESCO PJ.xlsx

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-BRAD-PJ-ELO-MAIO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-05-10','2026-05-10', 0, 'credito_parcelado'
FROM (VALUES
  (107.40, 'Servicos/Manutencao', 'Pronto Paulo Cesar AD 27/02 2/10 (pecas Montana)'),
  (106.00, 'Servicos/Manutencao', 'Pronto Paulo Cesar AD 30/03 1/2 (pecas Montana)'),
  (55.00, 'Pecas', 'Mercado Graxabranca 31/03'),
  (34.17, 'Trafego pago', 'Facebook Ads HQ5SFH5CD2 31/03'),
  (53.00, 'Pecas', 'Eletro Garrincha 31/03'),
  (13.18, 'Trafego pago', 'Facebook Ads YDZLCK9CD2 01/04'),
  (40.00, 'Pecas', 'JIM COM MaqSoldas 02/04'),
  (34.14, 'Trafego pago', 'Facebook Ads JNPMJHHCD2 05/04'),
  (9.72, 'Trafego pago', 'Facebook Ads QYBEKHZBD2 05/04'),
  (74.90, 'Software', 'MP MeliMais 06/04'),
  (34.23, 'Trafego pago', 'Facebook Ads GZ7NMJRBD2 08/04'),
  (13.69, 'Trafego pago', 'Facebook Ads XU9VYHHCD2 09/04'),
  (20.72, 'Trafego pago', 'Facebook Ads TS78JL9CD2 13/04'),
  (13.52, 'Trafego pago', 'Facebook Ads GFL5KKMCD2 13/04'),
  (7.34, 'Trafego pago', 'Facebook Ads SB3DWKDCD2 13/04'),
  (34.48, 'Trafego pago', 'Facebook Ads ZJ6LZKMCD2 17/04'),
  (34.14, 'Trafego pago', 'Facebook Ads 9PN27LVBD2 17/04'),
  (0.04, 'Trafego pago', 'Facebook Ads DD6YELVBD2 20/04'),
  (34.14, 'Trafego pago', 'Facebook Ads E97JAKZBD2 22/04'),
  (15.75, 'Trafego pago', 'Facebook Ads MG5NGKZBD2 24/04'),
  (22.00, 'Tarifa cartao', 'Anuidade cartao PJ 05/12')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-BRAD-PJ-ELO-MAIO:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-BRAD-PJ-ELO-MAIO:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
