-- Fatura Elo Grafite Bradesco (6550 XXXX XXXX 3558) - venc. 11/06/2026 - PAGA 11/06
-- Cartao PF do Toni. So entram itens PJ classificados na revisao.
-- Fonte: REVISAO FECHAMENTO 2026/JUNHO/FATURAS/Bradesco Junho 26 Elo Grafite.xls
--
-- PF excluidos:
--   MANO AUTO POSTO 17/06 R$100 (Toni: PF)
--   AUTO POSTO IMACULADA C 22/06 R$50 (Toni: PF)
--   JIM COM WELLYNTTON LUCAS 22/04 3/12 R$190.25 (Toni: Focus PF)
--   MP MARINESHOP 4/10 R$93.27 (PF confirmado em fatura abr/mai)
--   ML MERCADOLI 7/7 R$59.34 (PF confirmado em fatura abr/mai)
--   IFD BR 2x R$24.99 (iFood PF)
--   DL GOOGLE YouTub R$26.90 (PF)
--   CORDIL R$13 (mercearia PF)
--   Demais: academia, farmacia, supermercado, restaurante, salao, lojas

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-ELO-GRAFITE-JUN:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-06-11', '2026-06-11', 0, 'credito_parcelado'
FROM (VALUES
  -- Compras novas de junho
  (48.20, 'Pecas', 'Casa dos Parafusos 17/06 1/6'),
  (45.85, 'Pecas', 'Casa dos Parafusos 17/06 avulso'),
  (53.72, 'Materiais de limpeza', 'Limpeel Casa Carro 15/06 1/5'),
  -- Parcelas em andamento (PJ)
  (86.90, 'Pecas', 'ML Eletron 15/04 3/10'),
  (35.49, 'Pecas', 'EC ML 09/03 4/4'),
  (141.50, 'Materiais', 'Imperio da Construcao 16/02 5/6'),
  (48.16, 'Pecas', 'EC DimaKMaquina 11/02 5/6'),
  (45.16, 'Pecas', 'EC ML 11/02 5/6'),
  (124.30, 'Materiais', 'Deposito ST Catarina 27/01 5/10'),
  (94.44, 'Pecas', 'JIM Wellynton (embreagem Montana) 06/11 8/10'),
  (21.44, 'Pecas', 'ML 52500399D 03/10 9/9'),
  (28.66, 'Pecas', 'ML AFCCOMERC 03/10 9/9'),
  (52.96, 'Pecas', 'ML Autochave 17/09 10/12')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-ELO-GRAFITE-JUN:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
