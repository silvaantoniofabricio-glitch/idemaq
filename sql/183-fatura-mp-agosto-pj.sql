-- Fatura Mercado Pago (Visa 5566) - venc. 20/08/2026 -> mes de AGOSTO/2026
-- Fonte: REVISAO FECHAMENTO 2026/AGOSTO/FATURAS/FATURA MERCADO PAGO AGOSTO 2026.pdf
--
-- Conferencia da fatura (ciclo 16/07 a 15/08):
--   Consumos ...................................... R$ 3.089,70  (54 itens)
--   (-) PF (7 itens, vao no controleFinanceiroPF) . R$   224,97
--   (-) ML FrioLar 16/07, comprado e devolvido .... R$   202,89
--   (=) PJ .......................................  R$ 2.661,84  (46 itens abaixo)
--   PJ + PF = R$ 2.886,81 = "Total a pagar" da fatura. Fecha exato.
--
-- Devolucao do FrioLar: a compra de 16/07 (R$ 202,89) foi devolvida e o credito
-- caiu em 31/07, dentro da MESMA fatura — as duas linhas se anulam.
-- A primeira versao deste arquivo lancava a compra E um estorno de -202,89,
-- mas o banco recusou: lancamento_financeiro tem CHECK (valor >= 0), entao
-- valor negativo nao entra (por isso o PJ nunca teve um). Como o efeito
-- liquido e zero, a solucao e simplesmente nao lancar nenhuma das duas.
-- Se algum dia a devolucao cair numa fatura POSTERIOR a compra, ai vai
-- precisar de outra saida — os meses seriam diferentes e nao se anulariam.
--
-- Classificacao PF x PJ: herdada das parcelas da fatura anterior (FAT-MP-JUL).
-- As 7 series PF sao as mesmas de maio/junho/julho — EBazarComBrl, Gaya,
-- MercadoLivre 26/01, JoyBasico, 2Produtos, MercadoLivre 09/03 e o tenis
-- New Balance (que na fatura aparece como "CONSULTOR").

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-MP-AGO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome = 'Mercado Pago Cartão' AND deleted_at IS NULL LIMIT 1),
  '2026-08-20', '2026-08-20', 0, v.forma
FROM (VALUES
  -- ---- parcelas que continuam de faturas anteriores ----
  ('ML MercadoLi 04/11 10/11',        32.85, 'Pecas',        'credito_parcelado'),
  ('ML LojaDoMecanico 01/12 9/18',    78.64, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLi 04/02 7/8',          27.48, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLivre 05/02 7/11',      40.90, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLivre 21/02 6/6',       17.48, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLivre 03/03 6/8',       35.85, 'Pecas',        'credito_parcelado'),
  ('ML ConsertoMaq 05/03 6/6',        20.27, 'Pecas',        'credito_parcelado'),
  ('ML ElliMaqPecas 05/03 6/6',       16.87, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLi 06/03 6/8 (a)',      25.24, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLi 06/03 6/8 (b)',      27.48, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLivre 31/03 5/8',       30.50, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLivre 02/04 5/8',       23.67, 'Pecas',        'credito_parcelado'),
  ('ML PED 29/04 4/6',                18.66, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLivre 04/05 4/5',       16.13, 'Pecas',        'credito_parcelado'),
  ('ML AqueceArP 19/05 3/7',          25.07, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLivre 02/06 3/8',       34.11, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLi 13/06 3/12',         49.20, 'Pecas',        'credito_parcelado'),
  ('ML BMLDistribui 18/06 2/8',       27.26, 'Pecas',        'credito_parcelado'),
  ('ML KalisFrio 22/06 2/7',          23.84, 'Pecas',        'credito_parcelado'),
  ('ML IlhaDaEletro 30/06 2/6',       21.00, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLivre 30/06 2/6 (a)',   18.33, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLivre 30/06 2/6 (b)',   24.31, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLi 09/07 2/8',          22.87, 'Pecas',        'credito_parcelado'),
  -- ---- compras novas do ciclo ----
  ('ML SelecaoDePec 16/07',          124.00, 'Pecas',        'credito_1x'),
  ('ML MercadoLi 18/07',              35.96, 'Pecas',        'credito_1x'),
  ('ML ARA 20/07 1/5',                15.63, 'Pecas',        'credito_parcelado'),
  ('Facebook Ads xqf8zx9cd2 21/07',    0.10, 'Trafego pago', 'credito_1x'),
  ('ML FreePecasDis 23/07',           82.89, 'Pecas',        'credito_1x'),
  ('ML MBParts 23/07',               256.42, 'Pecas',        'credito_1x'),
  ('ML MercadoLivre 29/07',           37.88, 'Pecas',        'credito_1x'),
  ('ML MercadoLivre 31/07',           22.99, 'Pecas',        'credito_1x'),
  ('ML WSEletronica 01/08',           26.26, 'Pecas',        'credito_1x'),
  ('ML FilipeFlop 01/08',             78.00, 'Pecas',        'credito_1x'),
  ('ML VendasRafaTe 01/08',           21.99, 'Pecas',        'credito_1x'),
  ('ML EletroAmorim 03/08',          143.15, 'Pecas',        'credito_1x'),
  ('ML MBParts 06/08',               213.37, 'Pecas',        'credito_1x'),
  ('ML MercadoLivre 06/08 (a)',      278.99, 'Pecas',        'credito_1x'),
  ('ML MercadoLivre 06/08 1/6 (b)',   16.70, 'Pecas',        'credito_parcelado'),
  ('ML RankRank 07/08',              223.00, 'Pecas',        'credito_1x'),
  ('ML MercadoLivre 08/08',          102.84, 'Pecas',        'credito_1x'),
  ('MP MeliMais 09/08',               74.90, 'Software',     'credito_1x'),
  ('ML EletroComp 11/08 1/6',         26.48, 'Pecas',        'credito_parcelado'),
  ('ML MercadoLi 11/08',              92.00, 'Pecas',        'credito_1x'),
  ('ML Leao 12/08',                   40.48, 'Pecas',        'credito_1x'),
  ('ML MercadoLivre 12/08',           18.85, 'Pecas',        'credito_1x'),
  ('ML MercadoLivre 13/08',           70.95, 'Pecas',        'credito_1x')
) AS v(item, valor, categoria, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-MP-AGO:' || v.item AND deleted_at IS NULL
);

COMMIT;

-- APLICADO em 20/08/2026 — resultado: 46 itens / R$ 2.661,84 (confere).

-- Verificacao 1: esperado 46 itens / R$ 2.661,84
SELECT COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'FAT-MP-AGO:%';

-- Verificacao 2: por categoria
SELECT categoria, COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'FAT-MP-AGO:%'
GROUP BY categoria ORDER BY total DESC;

-- Verificacao 3: caiu na conta certa (tem que ser 'Mercado Pago Cartão', 46 itens)
SELECT cb.nome AS conta, COUNT(*) AS qtd
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND lf.descricao LIKE 'FAT-MP-AGO:%'
GROUP BY cb.nome;
