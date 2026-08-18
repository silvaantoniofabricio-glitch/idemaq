-- Fatura do cartao Cresol Mastercard estava arquivada na CONTA CORRENTE.
--
-- Toni apontou: a fatura de julho soma R$1.517,61, mas filtrando "Cartão
-- Cresol Mastercard" so apareciam R$170,26. O resto (R$1.347,35) estava sob
-- "Cresol" — a conta corrente — porque os sql/151, 152 e 161 usaram
-- nome='Cresol' na hora de gravar.
--
-- E a mesma distincao fatura x extrato:
--   FAT-CRESOL-MASTER-*  -> fatura do CARTAO   -> conta 'Cresol Cartão'
--   CRESOL-JUN: / CRESOL-JUL: -> EXTRATO da conta -> ficam em 'Cresol'
--
-- A conta 'Cresol Cartão' ja existe no seed (sql/01) e nunca foi usada. Mesmo
-- caso ja corrigido pro Elo Grafite/Neo Visa/Nubank (sql/171) e Mercado Pago
-- (sql/172) — o Cresol Mastercard passou batido.
--
-- NAO muda valor, data, categoria nem descricao. So o conta_id.

BEGIN;

UPDATE lancamento_financeiro
SET conta_id = (SELECT id FROM conta_bancaria WHERE nome = 'Cresol Cartão' AND deleted_at IS NULL LIMIT 1)
WHERE deleted_at IS NULL
  AND descricao LIKE 'FAT-CRESOL-MASTER-%';

COMMIT;

-- Verificacao 1: fatura de julho deve dar 16 itens / R$1.347,35 no cartao
SELECT cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND lf.descricao LIKE 'FAT-CRESOL-MASTER-JUL:%'
GROUP BY cb.nome;

-- Verificacao 2: o extrato tem que continuar na conta corrente
SELECT cb.nome AS conta, COUNT(*) AS qtd, SUM(lf.valor) AS total
FROM lancamento_financeiro lf
JOIN conta_bancaria cb ON cb.id = lf.conta_id
WHERE lf.deleted_at IS NULL AND lf.descricao LIKE 'CRESOL-JUL:%'
GROUP BY cb.nome;
