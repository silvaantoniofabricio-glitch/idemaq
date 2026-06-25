-- Fatura Inter (cartao 9106 + 3338) - venc. 25/06/2026
-- Cartao PF do Toni. So entram itens PJ classificados na revisao.
-- Fonte: REVISAO FECHAMENTO 2026/JUNHO/FATURAS/fatura-inter-2026-06.docx
--
-- PF excluidos: todos os demais (aiqfome, supermercado, farmacia, combustivel,
--   vestuario, dentista, pedagio, encargos, etc.)

BEGIN;

-- Garante conta Inter
INSERT INTO conta_bancaria (nome, tipo)
SELECT 'Inter', 'digital'
WHERE NOT EXISTS (
  SELECT 1 FROM conta_bancaria WHERE nome = 'Inter' AND deleted_at IS NULL
);

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-INTER-JUN:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  '2026-06-25', NULL, 0, 'credito_parcelado'
FROM (VALUES
  -- Card 9106
  (40.00,  'Pecas',               'JIM.COM Maqsoldas C 02/06'),
  -- Card 3338
  (118.09, 'Pecas',               'JIM COM Berti Autoca 03/03 4/4'),
  (56.20,  'Materiais de limpeza','Limpeel Casa Carro 25/04 2/3')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-INTER-JUN:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-INTER-JUN:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
