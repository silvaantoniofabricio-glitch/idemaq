-- Corrige vencimento dos itens PJ do Elo Grafite lançados no sql/85.
-- Bug: sql/85 usou vencimento '2026-06-11' (mes das compras), mas a fatura
-- (Bradesco Junho 26 Elo Grafite / pasta REVISAO FECHAMENTO 2026/JULHO/FATURAS)
-- tem vencimento real 11/07/2026. Isso fazia os itens aparecerem em JUNHO
-- na pagina Financeiro em vez de JULHO.

BEGIN;

UPDATE lancamento_financeiro
SET vencimento = '2026-07-11', pago_em = '2026-07-11'
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, vencimento, pago_em
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-ELO-GRAFITE-JUN:%' AND deleted_at IS NULL
ORDER BY valor DESC;
