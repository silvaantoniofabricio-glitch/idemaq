-- 135-corrigir-endereco-os-1720.sql
-- OS #1720 foi criada 40s depois do deploy do fix (commit 486e89c), então o
-- navegador ainda rodava a versao antiga e gravou os.endereco = NULL.
-- Aqui setamos o endereco 2 da Ednalva (o que o Toni escolheu na criacao).
--
-- Só atualiza se ainda estiver NULL (idempotente / seguro).

UPDATE os
SET endereco = 'Rua Paris, 23, Centro, Naviraí, Mato Grosso do Sul'
WHERE numero = 1720
  AND endereco IS NULL;

-- Conferir:
SELECT numero, endereco FROM os WHERE numero = 1720;
