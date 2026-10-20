-- Conta "Cresol 2 (40990-1)" foi cadastrada errada — na verdade e Bradesco PJ (Ag 1373 Conta 40990-1)
-- Migra todos os lancamentos historicos vinculados pra Bradesco PJ e soft-delete a conta errada.

BEGIN;

-- Migra todos os lancamentos (receitas + despesas, inclusive os ja soft-deletados)
UPDATE lancamento_financeiro
SET conta_id = (SELECT id FROM conta_bancaria WHERE nome = 'Bradesco PJ' AND deleted_at IS NULL LIMIT 1)
WHERE conta_id = (SELECT id FROM conta_bancaria WHERE nome = 'Cresol 2 (40990-1)' LIMIT 1);

-- Soft-delete da conta errada
UPDATE conta_bancaria
SET deleted_at = now()
WHERE nome = 'Cresol 2 (40990-1)'
  AND deleted_at IS NULL;

COMMIT;

-- Verificacao: contas ativas
SELECT nome, tipo
FROM conta_bancaria
WHERE deleted_at IS NULL
ORDER BY nome;
