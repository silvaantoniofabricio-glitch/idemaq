-- Remove duplicata: sql/143 (criado nesta sessao) lancou os mesmos 3 itens
-- que ja existiam com o prefixo FAT-NUBANK-PF-JUL: (de sessao anterior),
-- so que com o prefixo FAT-NUBANK-PF-JUL02:, escapando da checagem de
-- duplicata (que compara descricao exata).
--
-- Mantém os originais (FAT-NUBANK-PF-JUL:), remove os "02" (soft-delete).

BEGIN;

UPDATE lancamento_financeiro
SET deleted_at = now()
WHERE descricao LIKE 'FAT-NUBANK-PF-JUL02:%'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao
SELECT descricao, valor, categoria, deleted_at IS NOT NULL AS removido
FROM lancamento_financeiro
WHERE descricao LIKE 'FAT-NUBANK-PF-JUL%'
ORDER BY descricao;
