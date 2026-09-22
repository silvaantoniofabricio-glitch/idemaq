-- Mudanca de classificacao pedida pelo Toni em 22/09/2026: o "Pagamento
-- Carro BV" (Banco Votorantim) e PF, nao PJ — reverte a decisao anterior
-- (sql/157 maio->jul, sql/193 agosto) de que "o carro e da empresa".
--
-- Sao 4 lançamentos, duas series de nome diferentes mas confirmadas pelo
-- Toni como O MESMO emprestimo:
--   'Emprestimo PJ mai/2026 (pago conta Rafa)'  R$1.198,00  (maio)
--   'Emprestimo PJ jun/2026 (pago conta Rafa)'  R$1.198,00  (junho)
--   'Pagamento Carro BV 05/07'                  R$1.182,12  (julho)
--   'Pagamento Carro BV 07/08'                  R$1.183,10  (agosto)
--
-- Passam a viver em DESPESAS_PF_RAFA_<MES>_2026 (controleFinanceiroPF.js),
-- categoria Financiamento, nome unificado "Pagamento Carro BV DD/MM" nos 4
-- meses. Aqui so sai do PJ, via soft-delete.
--
-- NAO mexe no outro emprestimo PJ (Cresol, contrato 372388, R$1.421,71/mes)
-- — Toni confirmou que esse continua PJ.

-- APLICADO em 22/09/2026 — 4 linhas removidas do PJ. Confirmado que o
-- outro emprestimo (Cresol 372388) segue intacto nos 4 meses.

BEGIN;

UPDATE lancamento_financeiro
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND categoria = 'Emprestimo'
  AND (
    descricao ILIKE '%emprestimo pj%pago conta rafa%'
    OR descricao ILIKE '%pagamento carro bv%'
  );

COMMIT;

-- Verificacao 1: as 4 linhas nao podem mais aparecer no PJ
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL
  AND categoria = 'Emprestimo'
  AND (descricao ILIKE '%emprestimo pj%pago conta rafa%' OR descricao ILIKE '%pagamento carro bv%');

-- Verificacao 2: o outro emprestimo (Cresol 372388) continua intacto, 4 meses
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND descricao ILIKE '%372388%'
ORDER BY vencimento;
