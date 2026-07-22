-- Fatura Nubank PF (cartao pessoal ****5876 + ****4378) - itens PJ
-- Vencimento: 02/07/2026  |  Periodo: 26 MAI a 25 JUN
-- Total fatura: R$ 728,89  |  Itens PJ: R$ 177,73
-- Fonte: REVISAO FECHAMENTO 2026/JULHO/FATURAS/Nubank_2026-07-02.pdf

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-NUBANK-PF-JUL:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome = 'Nubank' LIMIT 1),
  '2026-07-02', '2026-07-02', 0, 'credito_1x'
FROM (VALUES
  (113.75, 'Software',  'Anthropic Claude Sub 15/06 (USD 21.52 x 5.28)'),
  (  3.98, 'Impostos',  'IOF Anthropic Claude Sub 15/06'),
  ( 50.00, 'Pecas',     'Casa dos Parafusos 1/2 16/06'),
  ( 10.00, 'Telefonia', 'Plano NuCel 19/06 (linha PJ)')
) AS v(valor, categoria, item)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-PF-JUL:' || v.item
    AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT descricao, valor, vencimento, pago_em, categoria
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-NUBANK-PF-JUL:%'
  AND deleted_at IS NULL
ORDER BY valor DESC;
