-- Fatura Inter (cartao PF, mas com gastos PJ) - venc. fatura paga 26/05/2026 (boleto R$ 3.945,05)
-- Fonte: FECHAMENTO MAIO/FATURAS CARTOES/FATURAS EM FOTOS INTER/*.jpeg
-- So entram itens PJ. Carros do Toni (Focus + Civic) sao PF, nao entram.

BEGIN;

-- Garante conta Inter
INSERT INTO conta_bancaria (nome, tipo)
SELECT 'Inter', 'digital'
WHERE NOT EXISTS (
  SELECT 1 FROM conta_bancaria WHERE nome = 'Inter' AND deleted_at IS NULL
);

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', v.valor, v.categoria, 'FAT-INTER-MAIO:' || v.item,
  (SELECT id FROM conta_bancaria WHERE nome='Inter' LIMIT 1),
  '2026-05-26','2026-05-26', 0, 'credito_parcelado'
FROM (VALUES
  (56.20, 'Materiais de limpeza', 'Limpeel Casa Carro 24/04 1/3'),
  (118.09, 'Pecas', 'JIM COM Berti Autoca 03/03 3/4'),
  (123.33, 'Pecas', 'Navirai Bateria 10/03 3/3'),
  (343.62, 'Garantia/Reposicao', 'MLP Magalu Carrefour 23/02 3/7 (reposicao maquina cliente)'),
  (20.00, 'Combustivel', 'Mano Auto Posto 05/05'),
  (100.00, 'Combustivel', 'Mano Auto Posto 03/05')
) AS v(valor, categoria, item)
WHERE NOT EXISTS(SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-INTER-MAIO:' || v.item AND deleted_at IS NULL);

COMMIT;

-- Verificacao
SELECT categoria, COUNT(*), SUM(valor) as total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-INTER-MAIO:%' AND deleted_at IS NULL
GROUP BY categoria
ORDER BY total DESC;
