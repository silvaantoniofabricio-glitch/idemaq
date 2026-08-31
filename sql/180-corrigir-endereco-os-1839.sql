-- 180-corrigir-endereco-os-1839.sql
-- O endereço da OS é uma cópia feita na hora que ela foi criada — depois
-- disso fica independente do cadastro da cliente (permite OS num endereço
-- diferente do padrão). É por isso que editar o endereço da cliente não
-- atualiza OS antigas dela. Esse script copia o endereço ATUAL da cliente
-- pra essa OS específica (mesmo caso da OS #1816 antes).

-- 1) Diagnóstico — compara o endereço da OS com o cadastrado na cliente.
SELECT
  o.numero,
  o.endereco AS endereco_da_os,
  c.endereco AS endereco_da_cliente
FROM os o
JOIN cliente c ON c.id = o.cliente_id
WHERE o.numero = 1839;

-- 2) Corrige — copia o endereço atual da cliente pra OS #1839.
UPDATE os o
SET endereco = c.endereco
FROM cliente c
WHERE c.id = o.cliente_id
  AND o.numero = 1839;

-- 3) Confirma.
SELECT numero, endereco FROM os WHERE numero = 1839;
