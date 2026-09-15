-- Fatura Cresol Mastercard - venc. 20/08/2026
-- Fonte: prints do app Cresol (aba Credito, Ago/26) enviados pelo Toni.
-- Total da fatura: R$ 1.210,50, 15 itens. Confere exato com a soma dos
-- prints — as duas telas cobrem a fatura inteira, sem sobra nem falta.
--
-- Classificacao herdada das faturas anteriores (maio/junho/julho), quase
-- tudo com serie continuando (parcela avancando +1):
--   Ton.com.br (maquininha) 14/04 ...........  2/12 jun -> 3/12 jul -> 4/12
--   ML Assiste 09/04 .........................  2/4 jun  -> 3/4 jul  -> 4/4 (fecha)
--   Mercado Refripecas 02/04 .................  2/5 jun  -> 3/5 jul  -> 4/5
--   Deposito ST Catarina 13/03 ...............  3/10 jun -> 4/10 jul -> 5/10
--   Limpeel Casa Carro 14/05 (a) e (b) .......  1/3 jun  -> 2/3 jul  -> 3/3 (fecha)
--   Mano Auto Posto (3x R$200/mes, avulso) ... mesmo padrao de maio a julho
--   Casa dos Parafusos, Eletro Garrincha ..... compras avulsas, mesma loja
--
-- Duas series novas sem precedente exato (mesmo fornecedor generico
-- "Mercadolivre*Mercado" ja visto varias vezes classificado como Pecas no
-- Cresol Mastercard): 'ML Mercado 15/04' e 'ML Mercado 09/04'.
-- 'Limpeel Casa Carro 07/07' tambem e serie nova (primeira parcela).
--
-- O unico item PF e 'JIM.COM Thiago Dos 13/03 5/6' (Servicos, R$121,75) —
-- ja no controleFinanceiroPF.js, mesma serie que veio 3/6 (junho) e 4/6
-- (julho). Nao confundir com 'JIM COM Thiago dos Santos 20/07' do Elo
-- Grafite — series diferentes, mesma pessoa.

-- APLICADO em 20/08/2026 — 14 itens, R$ 1.088,75, conta Cresol Cartão.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-CRESOL-MASTER-AGO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol Cartão' AND deleted_at IS NULL LIMIT 1),
  '2026-08-20', '2026-08-20', 0, v.forma
FROM (VALUES
  ('Eletro Garrincha 28/07',           35.00, 'Pecas',                'credito_1x'),
  ('Mano Auto Posto 04/07',           200.00, 'Combustivel',          'credito_1x'),
  ('Mano Auto Posto 14/07',           200.00, 'Combustivel',          'credito_1x'),
  ('Mano Auto Posto 23/07',           200.00, 'Combustivel',          'credito_1x'),
  ('Limpeel Casa Carro 14/05 3/3 (a)', 33.34, 'Materiais de limpeza', 'credito_parcelado'),
  ('Limpeel Casa Carro 14/05 3/3 (b)', 53.34, 'Materiais de limpeza', 'credito_parcelado'),
  ('Limpeel Casa Carro 07/07',         75.90, 'Materiais de limpeza', 'credito_1x'),
  ('Casa dos Parafusos 01/07',         27.75, 'Pecas',                'credito_1x'),
  ('ML Mercado 15/04 4/6',             40.50, 'Pecas',                'credito_parcelado'),
  ('Ton.com.br (maquininha) 14/04 4/12', 14.96, 'Equipamentos',       'credito_parcelado'),
  ('ML Assiste 09/04 4/4',             26.68, 'Pecas',                'credito_parcelado'),
  ('ML Mercado 09/04 4/4',             26.99, 'Pecas',                'credito_parcelado'),
  ('Mercado Refripecas 02/04 4/5',     34.30, 'Pecas',                'credito_parcelado'),
  ('Deposito ST Catarina 13/03 5/10', 119.99, 'Materiais',            'credito_parcelado')
) AS v(item, valor, categoria, forma)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-CRESOL-MASTER-AGO:' || v.item AND deleted_at IS NULL
);

COMMIT;

-- Verificacao 1: 14 itens, R$ 1.088,75, na conta Cresol Cartão
SELECT cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND lf.descricao LIKE 'FAT-CRESOL-MASTER-AGO:%'
GROUP BY cb.nome;

-- Verificacao 2: series continuando certinho (Ton, Assiste, Refripecas, Deposito)
SELECT REPLACE(descricao,'FAT-CRESOL-MASTER-AGO:','') AS item, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao LIKE 'FAT-CRESOL-MASTER-AGO:%'
ORDER BY item;
