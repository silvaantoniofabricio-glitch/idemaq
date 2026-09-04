-- "JIM Wellynton (embreagem Montana)" R$94,44 x10 — Toni confirmou em 20/08:
-- e o Focus (PF), nao peca da Montana como o PJ tinha lancado desde maio.
--
-- Estava em 4 faturas do Elo Grafite (uma por mes, parcelas 6/10 a 9/10):
--   FAT-ELO-GRAFITE-MAIO  6/10  venc. 2026-05-11
--   FAT-ELO-GRAFITE-6819  7/10  venc. 2026-06-11
--   FAT-ELO-GRAFITE-JUN   8/10  venc. 2026-07-11
--   FAT-ELO-GRAFITE-JUL   9/10  venc. 2026-08-11
-- (prefixo segue o cartao/fatura anterior ao vencimento, nao o mes do
-- vencimento — mesmo padrao ja documentado no contexto-financeiro.md)
--
-- As 4 parcelas passam a viver em controleFinanceiroPF.js (Elo Grafite,
-- categoria Veiculo PF, "(Focus)"), uma por mes de maio a agosto. Aqui so
-- sai do PJ, via soft-delete.
--
-- Efeito: reduz o PJ de peças em R$94,44 em cada um dos 4 meses (maio a
-- agosto). Maio, junho e julho ja estao fechados/reportados — mexendo neles
-- porque o Toni autorizou explicitamente ("Pode corrigir tudo").

BEGIN;

UPDATE lancamento_financeiro
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND descricao ILIKE '%wellynt%'
  AND descricao ILIKE '%montana%';

COMMIT;

-- Verificacao 1: nao pode sobrar nenhuma (esperado 0 linhas)
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao ILIKE '%wellynt%' AND descricao ILIKE '%montana%';

-- Verificacao 2: as 4 faturas Elo Grafite, novo total (cada uma cai R$94,44)
SELECT
  CASE
    WHEN descricao LIKE 'FAT-ELO-GRAFITE-MAIO:%' THEN 'maio'
    WHEN descricao LIKE 'FAT-ELO-GRAFITE-6819:%'  THEN 'junho'
    WHEN descricao LIKE 'FAT-ELO-GRAFITE-JUN:%'   THEN 'julho'
    WHEN descricao LIKE 'FAT-ELO-GRAFITE-JUL:%'   THEN 'agosto'
  END AS mes,
  COUNT(*) AS qtd, SUM(valor) AS total
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND (descricao LIKE 'FAT-ELO-GRAFITE-MAIO:%' OR descricao LIKE 'FAT-ELO-GRAFITE-6819:%'
    OR descricao LIKE 'FAT-ELO-GRAFITE-JUN:%'  OR descricao LIKE 'FAT-ELO-GRAFITE-JUL:%')
GROUP BY 1;
