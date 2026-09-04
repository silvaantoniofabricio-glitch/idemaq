-- Fatura Inter (cartoes 2306****9106 e 2306****3338) - venc. 25/08/2026
-- Fonte: REVISAO FECHAMENTO 2026/AGOSTO/FATURAS/FATURA INTER AGOSTO 2026.pdf
--
-- O arquivo original estava corrompido (450.517 bytes nulos na frente do PDF,
-- provavelmente download interrompido). Recuperado cortando os nulos —
-- 'FATURA INTER AGOSTO 2026 (recuperado).pdf' na mesma pasta.
--
-- Conferencia (total da fatura R$ 3.258,16):
--   Cartao 9106 ................. R$ 1.843,82  (34 itens, todos PF)
--   Cartao 3338 ................. R$ 1.414,34  (26 itens, 1 PJ + 25 PF)
--   (-) PF, em controleFinanceiroPF  R$ 2.914,54  (59 itens)
--   (=) PJ ......................... R$   343,62  (1 item, abaixo)
--
-- So um item e da empresa: a parcela 06/07 da maquina que foi dada ao cliente
-- em garantia (Toni confirmou isso quando a parcela 03/07 apareceu em maio).
-- Serie: 3/7 em maio (sql/...), 5/7 em julho (FAT-INTER-JUL), 6/7 agora — a
-- parcela 4/7 caiu na fatura de junho. Fecha em setembro com a 7/7.
--
-- Todo o resto e pessoal: Aiqfome, farmacia, supermercado, combustivel, e as
-- 4 parcelas de veiculo PF (Focus e vistoria do Civic), classificacao herdada
-- da fatura Inter de julho.
--
-- A fatura Bradesco NEO de agosto (venc. 20/08, R$ 88,70) e 100% PF —
-- anuidade, Apple e iFood. Nao gerou nenhum lancamento PJ, por isso nao tem
-- SQL pra ela.

BEGIN;

INSERT INTO lancamento_financeiro (tipo, valor, categoria, descricao, conta_id,
                                    vencimento, pago_em, taxa_pct, forma_pagamento)
SELECT 'despesa', 343.62, 'Garantia/Reposicao',
  'FAT-INTER-AGO:Magalu-Carrefour 23/02 6/7 (maquina garantia cliente)',
  (SELECT id FROM conta_bancaria WHERE nome = 'Inter' AND deleted_at IS NULL LIMIT 1),
  '2026-08-25', '2026-08-25', 0, 'credito_parcelado'
WHERE NOT EXISTS (
  SELECT 1 FROM lancamento_financeiro
  WHERE descricao = 'FAT-INTER-AGO:Magalu-Carrefour 23/02 6/7 (maquina garantia cliente)'
    AND deleted_at IS NULL
);

COMMIT;

-- Verificacao 1: a serie da maquina de garantia, mes a mes.
-- As parcelas tem que avancar de 1 em 1 e o valor e sempre R$ 343,62.
SELECT descricao, valor, vencimento, categoria
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao ILIKE '%Magalu-Carrefour%'
ORDER BY vencimento;

-- Verificacao 2: a fatura Inter de agosto no PJ (esperado 1 item / R$ 343,62)
SELECT cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
LEFT JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND lf.descricao LIKE 'FAT-INTER-AGO:%'
GROUP BY cb.nome;
