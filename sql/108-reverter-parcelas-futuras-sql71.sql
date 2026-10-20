-- Reverte o sql/71 por completo.
-- Mantém apenas os lançamentos reais inseridos fatura por fatura (Maio e Junho).
-- Os PARC-* eram projeções baseadas em "N parcelas a partir de X" — não confiáveis
-- porque o cartão pode pular parcelas, renegociar, etc.
-- Quando chegar a vez de cada mês, a fatura real será inserida manualmente.

UPDATE lancamento_financeiro
SET deleted_at = NOW()
WHERE descricao LIKE 'PARC-%'
  AND deleted_at IS NULL;

SELECT 'Removidos: ' || COUNT(*) AS resultado
FROM lancamento_financeiro
WHERE descricao LIKE 'PARC-%'
  AND deleted_at IS NOT NULL
  AND deleted_at::date = CURRENT_DATE;
