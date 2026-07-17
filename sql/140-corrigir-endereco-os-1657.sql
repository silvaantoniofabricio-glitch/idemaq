-- 140-corrigir-endereco-os-1657.sql
-- OS #1657 (Eleni Sordi Maier — Electrolux LTC12) tem o endereço errado.
-- Corrige pro segundo endereço da cliente: Rua Joaquim das Neves Norte, 701,
-- Centro, Naviraí, Mato Grosso do Sul.

UPDATE os
SET endereco = 'Rua Joaquim das Neves Norte, 701, Centro, Naviraí, Mato Grosso do Sul'
WHERE numero = 1657;

-- Conferir:
SELECT numero, endereco FROM os WHERE numero = 1657;
