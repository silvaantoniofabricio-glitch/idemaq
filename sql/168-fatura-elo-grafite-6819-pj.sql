-- Fatura Elo Grafite (6550 XXXX XXXX 3558 + 5900) — R$6.819,31
-- Venc. 11/06/2026, PAGA 12/06/2026.
-- Fatura que estava FALTANDO no sistema; achada na auditoria de 04/08/2026.
-- Fonte: REVISAO FECHAMENTO 2026/FATURAS/BRADESCO ELO GRAFITE JUNHO.xls
--
-- Confere: PJ R$722,16 + PF R$6.097,15 = R$6.819,31
-- PF (66 itens) ja adicionado em src/data/controleFinanceiroPF.js (array JUNHO).
--
-- Classificacao PJ segue os precedentes de sql/62 e sql/85 (mesmas series).
-- Amazon Music confirmado PJ por Toni (som usado na empresa).

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-ELO-GRAFITE-6819:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-06-11', '2026-06-12', 0, 'credito_parcelado'
FROM (VALUES
  ( 11.90, 'Software',  'Amazon Music 26/05'),
  ( 86.90, 'Pecas',     'ML Eletronic 15/04 2/10'),
  ( 35.49, 'Pecas',     'EC ML 09/03 3/4'),
  (141.50, 'Materiais', 'Imperio da Construcao 16/02 4/6'),
  ( 48.16, 'Pecas',     'EC DimaKMaquina 11/02 4/6'),
  ( 45.16, 'Pecas',     'EC ML 11/02 4/6'),
  (124.30, 'Materiais', 'Deposito ST Catarina 27/01 4/10'),
  ( 94.44, 'Pecas',     'JIM Wellynton embreagem Montana 06/11 7/10'),
  ( 21.44, 'Pecas',     'ML 52500399D 03/10 8/9'),
  ( 28.66, 'Pecas',     'ML AFCCOMERC 03/10 8/9'),
  ( 52.96, 'Pecas',     'ML Autochave 17/09 9/12'),
  ( 31.25, 'Materiais', 'Ilha Grande Materiais 18/02 4/4 (cartao 5900)')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-ELO-GRAFITE-6819:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao (esperado: 12 itens, R$722,16)
SELECT categoria, COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-ELO-GRAFITE-6819:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
