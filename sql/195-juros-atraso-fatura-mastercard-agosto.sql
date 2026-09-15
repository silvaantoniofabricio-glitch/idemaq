-- Diferenca entre a fatura Cresol Mastercard (R$1.210,50, ja lançada item a
-- item no sql/189) e o debito automatico no extrato Cresol (R$1.230,40,
-- 11/08) — Toni confirmou: juros por atraso no pagamento, R$19,90.
--
-- Mesma logica ja usada com a fatura Nubank PJ (sql/188, "Multa/IOF por
-- fatura atrasada", categoria Tarifa banco) — encargo do proprio cartao,
-- nao e um item de compra, entao nao faz parte da lista de 15 itens da
-- fatura em si.

-- APLICADO em 20/08/2026 — total fatura+juros = R$1.230,40, bate exato com
-- o debito automatico do extrato.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 19.90, 'Tarifa banco', 'CRESOL-AGO:Juros atraso fatura Mastercard 11/08',
  (SELECT id FROM conta_bancaria WHERE nome = 'Cresol' AND deleted_at IS NULL LIMIT 1),
  '2026-08-11', '2026-08-11', 0, 'debito'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'CRESOL-AGO:Juros atraso fatura Mastercard 11/08' AND deleted_at IS NULL
);

COMMIT;

-- Verificacao: fatura (sql/189) + juros = debito automatico do extrato
SELECT
  (SELECT SUM(valor) FROM lancamento_financeiro WHERE deleted_at IS NULL AND descricao LIKE 'FAT-CRESOL-MASTER-AGO:%') AS fatura_pj,
  121.75 AS fatura_pf,
  (SELECT valor FROM lancamento_financeiro WHERE deleted_at IS NULL AND descricao = 'CRESOL-AGO:Juros atraso fatura Mastercard 11/08') AS juros,
  (SELECT SUM(valor) FROM lancamento_financeiro WHERE deleted_at IS NULL AND descricao LIKE 'FAT-CRESOL-MASTER-AGO:%') + 121.75 +
  (SELECT valor FROM lancamento_financeiro WHERE deleted_at IS NULL AND descricao = 'CRESOL-AGO:Juros atraso fatura Mastercard 11/08') AS total_esperado_1230_40;
