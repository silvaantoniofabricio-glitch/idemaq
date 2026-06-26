-- Fatura Nubank (cartao pessoal) — venc. 02/06/2026 (PAGA)
-- PJ: Claude.Ai Subscription + IOF
-- PF excluidos: Plano NuCel, NuTag, Nubank+ (em controleFinanceiroPF.js)

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-NUBANK-02JUN:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Nubank' LIMIT 1),
  '2026-06-02', '2026-06-02', 0, 'credito'
FROM (VALUES
  (480.41, 'Software', 'Claude.Ai Subscription 15/05'),
  (16.81,  'IOF',      'IOF Claude.Ai Subscription 15/05')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-02JUN:' || v.item AND deleted_at IS NULL);

COMMIT;

SELECT descricao, valor, pago_em
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-NUBANK-02JUN:%' AND deleted_at IS NULL;
