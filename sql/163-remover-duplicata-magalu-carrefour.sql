-- Remove duplicata: sql/162 (criado nesta sessao) lancou "Magalu-Carrefour
-- 23/02 4/7" pra junho, sem saber que ja existia um lancamento anterior
-- (prefixo INTER-JUN:, categoria Garantia/Reposicao) pro mesmo item.
--
-- Mantem o original (INTER-JUN:...), remove o duplicado (FAT-INTER-JUN:...).

BEGIN;

UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE descricao = 'FAT-INTER-JUN:Magalu-Carrefour 23/02 4/7 (maquina garantia cliente)'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao — confere tambem se o de julho (5/7) ja existia antes tambem
SELECT descricao, valor, categoria, deleted_at IS NOT NULL AS removido
FROM lancamento_financeiro
WHERE descricao ILIKE '%magalu%carrefour%' OR descricao ILIKE '%magalu carrefour%'
ORDER BY descricao;
