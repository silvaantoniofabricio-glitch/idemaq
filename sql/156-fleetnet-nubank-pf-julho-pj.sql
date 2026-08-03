-- FleetNet Telecomunicacoes (PJ) - lancado no Nubank PF, reportado por Toni sem
-- documento fonte (data 10/07/2026 usada como referencia).
-- Mesmo fornecedor ja classificado PJ no extrato Cresol de junho (sql/94).

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 119.98, 'Agua/Luz/Fone', 'FAT-NUBANK-PF-JUL10:FleetNet Telecomunicacoes',
  (SELECT id FROM conta_bancaria WHERE nome='Nubank' LIMIT 1),
  '2026-07-10', '2026-07-10', 0, 'credito_1x'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-NUBANK-PF-JUL10:FleetNet Telecomunicacoes' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento
FROM lancamento_financeiro
WHERE descricao = 'FAT-NUBANK-PF-JUL10:FleetNet Telecomunicacoes' AND deleted_at IS NULL;
