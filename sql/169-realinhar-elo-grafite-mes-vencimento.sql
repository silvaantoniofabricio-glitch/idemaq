-- Realinha as faturas Elo Grafite (lado PJ) pelo MES DO VENCIMENTO.
-- Regra confirmada por Toni: a fatura conta no mes em que vence/e paga,
-- independente de quando a compra foi feita.
--
-- Estado antes            ->  depois
--   FAT-ELO-GRAFITE-JUN   ->  fatura R$4.851,29, venc 11/07 (estava como 11/06)
--   FAT-ELO-GRAFITE-JUL   ->  fatura R$4.698,00, venc 11/08 (estava como 13/07)
--   FAT-ELO-GRAFITE-6819  ->  fatura R$6.819,31, venc 11/06 — JA CORRETO, nao mexe
--
-- Os prefixos JUN/JUL ficam como estao de proposito: sao a chave usada pelo
-- WHERE NOT EXISTS dos scripts anteriores. Renomear quebraria a protecao
-- contra duplicata. So a data muda.
--
-- Pega tambem os itens de Amazon Music (sql/167), que usam os mesmos prefixos.

BEGIN;

-- fatura R$4.851,29 -> julho
UPDATE lancamento_financeiro
SET vencimento = '2026-07-11', pago_em = '2026-07-13'
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%'
  AND deleted_at IS NULL;

-- fatura R$4.698,00 -> agosto
UPDATE lancamento_financeiro
SET vencimento = '2026-08-11', pago_em = '2026-08-11'
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUL:%'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao: esperado 1 grupo por mes, sem sobreposicao
SELECT
  CASE
    WHEN descricao LIKE 'FAT-ELO-GRAFITE-6819:%' THEN 'fatura R$6.819 (junho)'
    WHEN descricao LIKE 'FAT-ELO-GRAFITE-JUN:%'  THEN 'fatura R$4.851 (julho)'
    WHEN descricao LIKE 'FAT-ELO-GRAFITE-JUL:%'  THEN 'fatura R$4.698 (agosto)'
    ELSE 'outra'
  END AS fatura,
  vencimento, COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-ELO-GRAFITE%' AND deleted_at IS NULL
GROUP BY fatura, vencimento
ORDER BY vencimento;
