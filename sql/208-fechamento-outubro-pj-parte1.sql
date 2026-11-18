-- Fechamento OUTUBRO/2026 — itens PJ (parte 1: tudo que esta confirmado).
-- Regra: faturas que VENCERAM em outubro + extratos de outubro.
--   Elo Grafite 3558/5900 venc 11/10 R$5.325,69 -> PJ R$380,98 (FAT-ELO-GRAFITE-SET: = ciclo; conta Elo Grafite)
--                                                  pendentes: Sertao Comercial de Eq 33,90 / Incopama 1/10 100,00 / Carro e Cia 20,00
--   Mercado Pago 5566     venc 20/10 R$3.390,87 -> PJ R$3.022,57 (inclui multa/juros/IOF de atraso R$118,07)
--                                                  pendentes: NunesBike 178,90 / PrincesAutLD 1/8 27,63
--   Nubank PF             venc 02/10 R$218,15   -> PJ R$118,40 (Anthropic + IOF)
--   Nubank PJ             venc 23/10 R$322,96   -> PJ R$322,96
--   Extrato Cresol: juros/IOF cheque, pacote, Zion, tarifa Mastercard 19,90, parcela emprestimo Cresol, Energisa via Marcia
--   Extrato Nubank (conta): FleetNet 119,99 (conta NULL — extrato, nao cartao)
-- NAO lancado aqui (pendente/fora): Cresol Mastercard (falta print do topo), Bradesco Elo Mais (fatura nao veio),
--   salarios (confirmar parte em dinheiro), Carro BV de outubro (extrato da Rafa), Ministerio da Fazenda 29/10 (350,50+108,48),
--   Priscila Bressa 200 / Irene 100 / Jane Valeria 100. DAS+eSocial pagos 16/10 sao de SETEMBRO (sql/204) — nao duplicar.

-- APLICADO em 18/11/2026 pelo Chrome — 66 itens, R$ 6.568,22, todos na conta certa (FleetNet sem conta, de proposito).

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id, vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  CASE WHEN v.conta = 'ELO' THEN (SELECT id FROM conta_bancaria WHERE nome ILIKE '%grafite%' AND deleted_at IS NULL LIMIT 1)
       WHEN v.conta IS NULL THEN NULL
       ELSE (SELECT id FROM conta_bancaria WHERE nome = v.conta AND deleted_at IS NULL LIMIT 1) END,
  v.dt::date, v.dt::date, 0, v.forma
FROM (VALUES
  ('FAT-ELO-GRAFITE-SET:Deposito ST Catarina 27/01 8/10', 124.30, 'Materiais', 'ELO', '2026-10-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-SET:ML Eletron 15/04 6/10', 86.90, 'Pecas', 'ELO', '2026-10-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-SET:Limpeel Casa Carro 15/06 4/5', 53.72, 'Materiais de limpeza', 'ELO', '2026-10-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-SET:Casa dos Parafusos 17/06 4/6', 48.19, 'Pecas', 'ELO', '2026-10-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-SET:Casa dos Parafusos 20/08 2/2', 53.97, 'Pecas', 'ELO', '2026-10-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-SET:Amazon Music 26/09', 13.90, 'Software', 'ELO', '2026-10-11', 'credito_1x'),
  ('FAT-MP-OUT:Multa por atraso 16/10', 78.22, 'Tarifa cartao', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:Juros de mora 16/10', 1.31, 'Tarifa cartao', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:IOF do rotativo 16/10', 15.20, 'Tarifa cartao', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:Juros do rotativo 16/10', 23.34, 'Tarifa cartao', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML Samatec 08/09 2/4', 23.71, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 08/09 2/5', 29.26, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Bcmpecaseace 14/09 2/6', 24.77, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 15/09', 45.00, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML MercadoLivre 15/09 1/8', 26.26, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Eletroar 17/09 1/5', 17.40, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 17/09', 106.98, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML Grupovendas2 26/09 1/7', 24.73, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Lojabatoni 28/09', 117.00, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML MercadoLivre 28/09 1/4', 14.01, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 29/09', 598.65, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML Gelmaq 02/10', 304.58, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML MercadoLivre 05/10', 124.50, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML MercadoLi 06/10', 89.90, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML MercadoLivre 07/10', 144.90, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML Mfstore 13/10 1/5', 22.03, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 14/10', 342.91, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML MercadoLi 14/10', 181.40, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_1x'),
  ('FAT-MP-OUT:ML Lojadomecani 01/12 11/18', 78.64, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 05/02 9/11', 40.90, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 03/03 8/8', 35.85, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLi 06/03 8/8 (a)', 25.24, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLi 06/03 8/8 (b)', 27.48, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 31/03 7/8', 30.50, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 02/04 7/8', 23.67, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Ped 29/04 6/6', 18.66, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Aquecearp 19/05 5/7', 25.07, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 02/06 5/8', 34.11, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLi 13/06 5/12', 49.20, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Bmldistribui 18/06 4/8', 27.26, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Kalisfrio 22/06 4/7', 23.84, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Ilhadaeletro 30/06 4/6', 21.00, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 30/06 4/6 (a)', 18.33, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 30/06 4/6 (b)', 24.31, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLi 09/07 4/8', 22.87, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Ara 20/07 3/5', 15.59, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 06/08 3/6', 16.66, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Eletrocomp 11/08 3/6', 26.44, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML MercadoLivre 25/08 2/8', 28.89, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-MP-OUT:ML Alkatec 01/09 2/15', 52.00, 'Pecas', 'Mercado Pago Cartão', '2026-10-20', 'credito_parcelado'),
  ('FAT-NUBANK-PF-OUT:Anthropic Claude Sub 15/09', 114.40, 'Software', 'Nubank PF', '2026-10-02', 'credito_1x'),
  ('FAT-NUBANK-PF-OUT:IOF Anthropic Claude Sub 15/09', 4.00, 'Impostos', 'Nubank PF', '2026-10-02', 'credito_1x'),
  ('FAT-NUBANK-PJ-OUT:Facebook Ads Z853986cd4 25/09', 132.08, 'Trafego pago', 'Nubank PJ', '2026-10-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-OUT:Facebook Ads 9jr7p62cd4 29/09', 34.04, 'Trafego pago', 'Nubank PJ', '2026-10-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-OUT:Facebook Ads W69mg9jcd4 13/10', 152.52, 'Trafego pago', 'Nubank PJ', '2026-10-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-OUT:Multa por fatura atrasada 25/09', 3.52, 'Tarifa banco', 'Nubank PJ', '2026-10-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-OUT:IOF complementar renegociacao 25/09', 0.13, 'Tarifa banco', 'Nubank PJ', '2026-10-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-OUT:IOF por fatura atrasada 25/09', 0.67, 'Tarifa banco', 'Nubank PJ', '2026-10-23', 'credito_1x'),
  ('CRESOL-OUT:Juros cheque especial 02/10', 67.14, 'Tarifa banco', 'Cresol', '2026-10-02', 'pix'),
  ('CRESOL-OUT:IOF saldo devedor 02/10', 11.29, 'Tarifa banco', 'Cresol', '2026-10-02', 'pix'),
  ('CRESOL-OUT:Pacote Servicos Cresol out/2026', 51.99, 'Tarifa banco', 'Cresol', '2026-10-05', 'pix'),
  ('CRESOL-OUT:Zion Contabilidade out/2026', 250.00, 'Contabilidade', 'Cresol', '2026-10-13', 'pix'),
  ('CRESOL-OUT:Cobranca extra fatura Mastercard 13/10', 19.90, 'Tarifa banco', 'Cresol', '2026-10-13', 'pix'),
  ('CRESOL-OUT:Parcela emprestimo Cresol PJ 20/10', 1421.71, 'Emprestimo', 'Cresol', '2026-10-20', 'debito'),
  ('CRESOL-OUT:Energisa (via Marcia de Fatima) 23/10', 781.29, 'Energia eletrica', 'Cresol', '2026-10-23', 'pix'),
  ('NUBANK-CONTA-OUT:FleetNet Telecomunicacoes out/2026 (boleto 13/10)', 119.99, 'Internet', NULL, '2026-10-13', 'boleto')
) AS v(descricao, valor, categoria, conta, dt, forma)
WHERE NOT EXISTS (SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL);

COMMIT;

-- Verificacao: 66 itens, R$ 6.568,22
SELECT split_part(lf.descricao, ':', 1) AS prefixo, cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND (lf.descricao LIKE 'FAT-ELO-GRAFITE-SET:%' OR lf.descricao LIKE 'FAT-%-OUT:%' OR lf.descricao LIKE 'CRESOL-OUT:%' OR lf.descricao LIKE 'NUBANK-CONTA-OUT:%')
GROUP BY 1, 2 ORDER BY 1;
