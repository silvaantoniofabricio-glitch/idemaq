-- Fatura Visa Bradesco Neo Platinum (4641 XXXX XXXX 6669) - venc. 20/06/2026 - PAGA
-- Cartao PF do Toni. So entram itens PJ (parcelas finais de compras anteriores).
-- Fonte: REVISAO FECHAMENTO 2026/JUNHO/FATURAS/Bradesco Junho 26 Visa.xls
--
-- PF excluidos:
--   APPLE.COM/BILL 2x R$19.90 (iCloud PF confirmado)
--   IFD*iFood 2x R$7.95 (PF)

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-VISA-BRADESCO-JUN:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Bradesco PJ' LIMIT 1),
  '2026-06-20', '2026-06-20', 0, 'credito_parcelado'
FROM (VALUES
  (48.63, 'Materiais de limpeza', 'Limpeel Casa Carro 24/03 3/3'),
  (60.00, 'Pecas', 'Casa dos Parafusos 06/02 4/4'),
  (69.98, 'Pecas', 'Armazem 1,99 06/02 4/4'),
  (61.00, 'Pecas', 'Casa dos Parafusos 28/01 4/4')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-VISA-BRADESCO-JUN:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-VISA-BRADESCO-JUN:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
