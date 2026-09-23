-- Segunda parte da mudanca pedida em 22-23/09/2026: o Empréstimo Cresol
-- (contrato 372388, R$1.421,71/mes) tambem vira PF — Toni confirmou que
-- os "meus dois emprestimos" eram esse E o Carro BV (ja movido no sql/196).
--
-- Isso reverte a confirmacao original de que essa serie continuava PJ
-- ("o A esta correto") — Toni mudou de ideia depois de ver que ainda
-- aparecia na PJ.
--
-- 4 lançamentos (mai a ago, sempre R$1.421,71), todos categoria Emprestimo,
-- descricao contendo "emprestimo cresol" ou o numero do contrato 372388.
-- Passam a viver em DESPESAS_PF_TONI_<MES>_2026, categoria Financiamento,
-- nome unificado "Parcela Emprestimo Cresol DD/MM", origem Cresol.

-- APLICADO em 23/09/2026 — 4 linhas removidas. Verificacao confirmou 0
-- linhas categoria Emprestimo no PJ (nem essa nem o Carro BV do sql/196).

BEGIN;

UPDATE lancamento_financeiro
SET deleted_at = NOW()
WHERE deleted_at IS NULL
  AND categoria = 'Emprestimo'
  AND (descricao ILIKE '%emprestimo cresol%' OR descricao ILIKE '%372388%');

COMMIT;

-- Verificacao: nao pode sobrar nada no PJ com categoria Emprestimo
-- (o outro emprestimo/Carro BV ja saiu no sql/196 — deve dar 0 linhas)
SELECT descricao, valor, vencimento
FROM lancamento_financeiro
WHERE deleted_at IS NULL AND categoria = 'Emprestimo';
