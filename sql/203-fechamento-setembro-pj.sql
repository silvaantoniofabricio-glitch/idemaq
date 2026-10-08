-- Fechamento SETEMBRO/2026 — itens PJ.
-- Regra do Toni: tudo entra em SETEMBRO = extratos de setembro + faturas que
-- VENCERAM em setembro (a fatura conta no mes do vencimento, nao da compra).
--
-- Faturas (total do documento -> parte PJ aqui, resto PF em controleFinanceiroPF.js):
--   Elo Grafite 3558  venc 11/09  R$4.701,36 -> PJ R$433,95 (prefixo FAT-ELO-GRAFITE-AGO: = ciclo, como sempre)
--   Mercado Pago 5566 venc 21/09  R$3.910,86 -> PJ R$3.494,72
--   Inter             venc 25/09  R$1.872,98 -> PJ R$343,62 (Magalu-Carrefour 7/7, garantia)
--   Nubank PF         venc 02/09  R$199,78   -> PJ R$119,42 (Anthropic + IOF)
--   Nubank PJ         venc 23/09  R$175,57   -> PJ R$175,57
--   Cresol Mastercard (debito 11/09) R$1.297,81 -> PJ R$1.098,87 (R Silva R$29,99 12x FICA DE FORA, em investigacao)
--   Bradesco Elo Mais 3914 venc 10/09 R$129,40 -> PJ R$129,40
-- Extrato Cresol + FleetNet (Nubank conta): ver bloco EXTRATO.
--
-- Salarios: Toni informou R$1.550 para cada um; o que nao aparece no extrato
-- foi pago em dinheiro (Alessandro 1.550-1.006=544 | Guilherme 1.550-1.000=550).
-- O PIX de R$6 do Alessandro (03/09) foi tratado como parte do salario — confirmar.
--
-- NAO lancado de proposito: quitacoes de fatura (Mercado Pago 3.910,86, Nubank PJ 175,59,
-- Mastercard 1.317,71, Elo 4.701,36...), retiradas/PIX internos, "PIX CREDITO DE: IDEMAQ",
-- agua 15/09 R$164,47 (e a quitacao de AGOSTO ja lancada no sql/191) e as parcelas
-- do Civic/emprestimo Cresol (PF).

-- APLICADO em 08/10/2026 pelo Chrome — 99 itens, R$ 10.030,66, todos com conta_id.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, v.descricao,
  (SELECT id FROM conta_bancaria WHERE nome = v.conta AND deleted_at IS NULL LIMIT 1),
  v.vencimento::date, v.vencimento::date, 0, v.forma
FROM (VALUES
  ('FAT-ELO-GRAFITE-AGO:Amazon Music 26/08', 13.90, 'Software', 'Bradesco PJ', '2026-09-11', 'credito_1x'),
  ('FAT-ELO-GRAFITE-AGO:Casa dos Parafusos 20/08 1/2', 53.98, 'Pecas', 'Bradesco PJ', '2026-09-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-AGO:Casa dos Parafusos 17/06 3/6', 48.19, 'Pecas', 'Bradesco PJ', '2026-09-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-AGO:Limpeel Casa Carro 15/06 3/5', 53.72, 'Materiais de limpeza', 'Bradesco PJ', '2026-09-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-AGO:ML Eletron 15/04 5/10', 86.90, 'Pecas', 'Bradesco PJ', '2026-09-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-AGO:Deposito ST Catarina 27/01 7/10', 124.30, 'Materiais', 'Bradesco PJ', '2026-09-11', 'credito_parcelado'),
  ('FAT-ELO-GRAFITE-AGO:ML Autochave 17/09 12/12', 52.96, 'Pecas', 'Bradesco PJ', '2026-09-11', 'credito_parcelado'),
  ('FAT-MP-SET:ML SelecaoDePec 04/09', 186.21, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML Samatec 08/09 1/4', 23.73, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLi 08/09', 182.40, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML Geofrio 08/09', 35.34, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MercadoLivre 08/09 (a)', 170.00, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MercadoLivre 08/09 1/5', 29.28, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML Gelmaq 09/09', 57.00, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MHMaquina 10/09', 80.89, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MercadoLivre 11/09', 44.89, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML BCMPecasEAce 14/09 1/6', 24.81, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLi 04/11 11/11', 32.85, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML LojaDoMecanico 01/12 10/18', 78.64, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLi 04/02 8/8', 27.48, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 05/02 8/11', 40.90, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 03/03 7/8', 35.85, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLi 06/03 7/8 (a)', 25.24, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLi 06/03 7/8 (b)', 27.48, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 31/03 6/8', 30.50, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 02/04 6/8', 23.67, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML PED 29/04 5/6', 18.66, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 04/05 5/5', 16.13, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML AqueceArP 19/05 4/7', 25.07, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 02/06 4/8', 34.11, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLi 13/06 4/12', 49.20, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML BMLDistribui 18/06 3/8', 27.26, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML KalisFrio 22/06 3/7', 23.84, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML IlhaDaEletro 30/06 3/6', 21.00, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 30/06 3/6 (a)', 18.33, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 30/06 3/6 (b)', 24.31, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLi 09/07 3/8', 22.87, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML ARA 20/07 2/5', 15.59, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 06/08 2/6', 16.66, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML EletroComp 11/08 2/6', 26.44, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLi 15/08', 79.86, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MacEletro 20/08', 26.21, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MGParts 21/08', 37.49, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML NautRefriger 22/08', 77.52, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML RankRank 22/08', 340.80, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MercadoLivre 25/08 (a)', 297.05, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MercadoLivre 25/08 1/8', 28.89, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-MP-SET:ML MercadoLivre 25/08 (b)', 36.57, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MercadoLivre 26/08', 658.87, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MercadoLivre 31/08 (a)', 62.13, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML BCMPecasEAce 31/08', 145.00, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML MercadoLivre 01/09', 155.70, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_1x'),
  ('FAT-MP-SET:ML Alkatec 01/09 1/15', 52.00, 'Pecas', 'Mercado Pago Cartão', '2026-09-21', 'credito_parcelado'),
  ('FAT-INTER-SET:Magalu-Carrefour 23/02 7/7 (maquina garantia cliente)', 343.62, 'Garantia/Reposicao', 'Inter', '2026-09-25', 'credito_parcelado'),
  ('FAT-NUBANK-PF-SET:Anthropic Claude Sub 15/08', 115.39, 'Software', 'Nubank PF', '2026-09-02', 'credito_1x'),
  ('FAT-NUBANK-PF-SET:IOF Anthropic Claude Sub 15/08', 4.03, 'Impostos', 'Nubank PF', '2026-09-02', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:Facebook Ads Bnfs556cd4 02/09', 16.97, 'Trafego pago', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:Facebook Ads Nv2ty22cd4 06/09', 34.57, 'Trafego pago', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:Facebook Ads Yqbr53ecd4 06/09', 15.10, 'Trafego pago', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:Facebook Ads Ylbwd4jcd4 09/09', 34.20, 'Trafego pago', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:Facebook Ads Fypht4sbd4 11/09', 34.23, 'Trafego pago', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:Facebook Ads 67ezl66cd4 13/09', 17.12, 'Trafego pago', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:Facebook Ads 949bj5jcd4 14/09', 17.24, 'Trafego pago', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:Juros por fatura atrasada 29/08', 3.19, 'Tarifa banco', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:Multa por fatura atrasada 29/08', 2.47, 'Tarifa banco', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-NUBANK-PJ-SET:IOF por fatura atrasada 29/08', 0.48, 'Tarifa banco', 'Nubank PJ', '2026-09-23', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:Casa dos Parafusos 28/08', 5.55, 'Pecas', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:Lumen Materiais 26/08', 23.00, 'Materiais', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:JIM.COM Maqsoldas 26/08', 98.00, 'Pecas', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:Mano Auto Posto 21/08', 200.00, 'Combustivel', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:Limpeel Casa Carro 20/08 1/3', 59.97, 'Materiais de limpeza', 'Cresol Cartão', '2026-09-11', 'credito_parcelado'),
  ('FAT-CRESOL-MASTER-SET:Mano Auto Posto 13/08', 200.00, 'Combustivel', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:Eletro Garrincha 13/08', 6.00, 'Pecas', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:Casa dos Parafusos 10/08', 17.25, 'Pecas', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:JIM.COM Maqsoldas 08/08', 10.00, 'Pecas', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:Mano Auto Posto 03/08', 200.00, 'Combustivel', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:Casa dos Parafusos 03/08', 53.35, 'Pecas', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:Eletro Garrincha 03/08', 16.00, 'Pecas', 'Cresol Cartão', '2026-09-11', 'credito_1x'),
  ('FAT-CRESOL-MASTER-SET:ML Mercado 15/04 5/6', 40.50, 'Pecas', 'Cresol Cartão', '2026-09-11', 'credito_parcelado'),
  ('FAT-CRESOL-MASTER-SET:Ton.com.br (maquininha) 14/04 5/12', 14.96, 'Equipamentos', 'Cresol Cartão', '2026-09-11', 'credito_parcelado'),
  ('FAT-CRESOL-MASTER-SET:Mercado Refripecas 02/04 5/5', 34.30, 'Pecas', 'Cresol Cartão', '2026-09-11', 'credito_parcelado'),
  ('FAT-CRESOL-MASTER-SET:Deposito ST Catarina 13/03 6/10', 119.99, 'Materiais', 'Cresol Cartão', '2026-09-11', 'credito_parcelado'),
  ('FAT-BRAD-PJ-ELO-SET:Pronto Paulo Cesar AD 27/02 6/10 (pecas Montana)', 107.40, 'Servicos/Manutencao', 'Bradesco PJ', '2026-09-10', 'credito_parcelado'),
  ('FAT-BRAD-PJ-ELO-SET:Anuidade 09/12', 22.00, 'Tarifa cartao', 'Bradesco PJ', '2026-09-10', 'credito_1x'),
  ('CRESOL-SET:Salario Alessandro set/2026 (PIX 08/09 R$300)', 300.00, 'Salario', 'Cresol', '2026-09-08', 'pix'),
  ('CRESOL-SET:Salario Alessandro set/2026 (PIX 08/09 R$700)', 700.00, 'Salario', 'Cresol', '2026-09-08', 'pix'),
  ('CRESOL-SET:Salario Alessandro set/2026 (PIX 03/09 R$6)', 6.00, 'Salario', 'Cresol', '2026-09-03', 'pix'),
  ('CRESOL-SET:Salario Alessandro set/2026 (diferenca paga em dinheiro)', 544.00, 'Salario', 'Cresol', '2026-09-08', 'dinheiro'),
  ('CRESOL-SET:Salario Guilherme set/2026 (PIX 08/09 R$700)', 700.00, 'Salario', 'Cresol', '2026-09-08', 'pix'),
  ('CRESOL-SET:Salario Guilherme set/2026 (PIX 08/09 R$300)', 300.00, 'Salario', 'Cresol', '2026-09-08', 'pix'),
  ('CRESOL-SET:Salario Guilherme set/2026 (diferenca paga em dinheiro)', 550.00, 'Salario', 'Cresol', '2026-09-08', 'dinheiro'),
  ('CRESOL-SET:Pacote Servicos Cresol set/2026', 51.99, 'Tarifa banco', 'Cresol', '2026-09-08', 'pix'),
  ('CRESOL-SET:Zion Contabilidade set/2026', 250.00, 'Contabilidade', 'Cresol', '2026-09-10', 'pix'),
  ('CRESOL-SET:Tiago Fernandes - compra de lavadora 24/09', 150.00, 'Compra de maquina', 'Cresol', '2026-09-24', 'pix'),
  ('CRESOL-SET:Energisa (via Marcia de Fatima) 25/09', 454.95, 'Energia eletrica', 'Cresol', '2026-09-25', 'pix'),
  ('CRESOL-SET:Juros cheque especial 02/09', 72.41, 'Tarifa banco', 'Cresol', '2026-09-02', 'pix'),
  ('CRESOL-SET:IOF saldo devedor 02/09', 15.87, 'Tarifa banco', 'Cresol', '2026-09-02', 'pix'),
  ('CRESOL-SET:Cobranca extra fatura Mastercard 11/09', 19.90, 'Tarifa banco', 'Cresol', '2026-09-11', 'pix'),
  ('NUBANK-CONTA-SET:FleetNet Telecomunicacoes set/2026 (boleto 10/09)', 119.99, 'Internet', 'Nubank PF', '2026-09-10', 'boleto')
) AS v(descricao, valor, categoria, conta, vencimento, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro WHERE descricao = v.descricao AND deleted_at IS NULL
);

COMMIT;

-- Verificacao 1: itens e total por prefixo (esperado: 99 itens, R$ 10030.66 no conjunto)
SELECT split_part(descricao, ':', 1) AS prefixo, COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND (descricao LIKE 'FAT-ELO-GRAFITE-AGO:%' OR descricao LIKE 'FAT-MP-SET:%' OR descricao LIKE 'FAT-INTER-SET:%'
    OR descricao LIKE 'FAT-NUBANK-PF-SET:%' OR descricao LIKE 'FAT-NUBANK-PJ-SET:%'
    OR descricao LIKE 'FAT-CRESOL-MASTER-SET:%' OR descricao LIKE 'FAT-BRAD-PJ-ELO-SET:%'
    OR descricao LIKE 'CRESOL-SET:%' OR descricao LIKE 'NUBANK-CONTA-SET:%')
GROUP BY 1 ORDER BY 1;

-- Verificacao 2: cada item caiu na conta certa
SELECT cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL
  AND (lf.descricao LIKE 'FAT-%-SET:%' OR lf.descricao LIKE 'FAT-ELO-GRAFITE-AGO:%' OR lf.descricao LIKE 'CRESOL-SET:%' OR lf.descricao LIKE 'NUBANK-CONTA-SET:%')
GROUP BY cb.nome ORDER BY 1;

-- Verificacao 3: salarios de setembro (esperado 1.550 cada)
SELECT CASE WHEN descricao ILIKE '%Alessandro%' THEN 'Alessandro' ELSE 'Guilherme' END AS quem, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'CRESOL-SET:Salario%'
GROUP BY 1;
