-- Itens PJ da fatura Nubank PF (cartao ****5876) — venc. 02/07/2026
-- Periodo: 26/mai a 25/jun. Apenas os itens de negocio (PJ).
-- Fonte: REVISAO FECHAMENTO 2026/JULHO/FATURAS/Nubank_2026-07-02.pdf

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-NUBANK-PF-JUL02:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome = 'Nubank' LIMIT 1),
  '2026-07-02', '2026-07-02', 0, 'credito_1x'
FROM (VALUES
  (113.75, 'Software',  'Anthropic Claude Sub 15/06 (USD 21.52 x 5.28)'),
  (  3.98, 'Impostos',  'IOF Anthropic Claude Sub 15/06'),
  ( 50.00, 'Pecas',     'Casa dos Parafusos parcela 1/2 16/06')
) AS v(valor, categoria, item)
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-PF-JUL02:' || v.item
    AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-NUBANK-PF-JUL02:%'
  AND deleted_at IS NULL
ORDER BY valor DESC;
