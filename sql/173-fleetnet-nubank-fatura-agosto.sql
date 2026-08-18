-- FleetNet (Nubank PF) estava na fatura errada.
--
-- A compra e de 10/07. A fatura Nubank PF de julho cobre 26/mai a 25/jun
-- (venc. 02/07) — conferido no PDF. Entao compra de 10/07 cai na fatura
-- seguinte, que fecha 26/07 e vence 02/08.
--
-- Estava com vencimento 2026-07-10 (data da compra), inflando julho em
-- R$119,98 e nao batendo com o total da fatura.
--
-- So a data muda. Valor, categoria e conta ficam como estao.

BEGIN;

UPDATE lancamento_financeiro
SET vencimento = '2026-08-02', pago_em = '2026-08-02'
WHERE descricao LIKE 'FAT-NUBANK-PF-JUL10:%'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao: a fatura de julho deve ficar so com os 4 itens do periodo
-- 26/mai-25/jun (Anthropic 113,75 + IOF 3,98 + Casa Parafusos 50,00 +
-- Plano NuCel 10,00 = R$177,73)
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-NUBANK%' AND deleted_at IS NULL
ORDER BY vencimento, descricao;
