-- Alinha a categoria do item de julho (parcela 5/7) com o padrao ja
-- estabelecido pra essa serie (maio 3/7 e junho 4/7 usam "Garantia/Reposicao").

BEGIN;

UPDATE lancamento_financeiro
SET categoria = 'Garantia/Reposicao'
WHERE descricao = 'FAT-INTER-JUL:Magalu-Carrefour 23/02 5/7 (maquina garantia cliente)'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria
FROM lancamento_financeiro
WHERE descricao ILIKE '%magalu%carrefour%' AND deleted_at IS NULL
ORDER BY descricao;
