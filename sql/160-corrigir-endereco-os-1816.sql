-- 160-corrigir-endereco-os-1816.sql
-- Corrige o endereço da OS #1816 (estava com endereço diferente do
-- cadastrado da cliente Ana Carla) — usa o endereço registrado dela.

UPDATE os
SET endereco = 'Rua Eduardo Rodrigues Gutierres, 616, Novo Horizonte, Naviraí, Mato Grosso do Sul'
WHERE numero = 1816;

-- Conferência.
SELECT numero, endereco FROM os WHERE numero = 1816;
