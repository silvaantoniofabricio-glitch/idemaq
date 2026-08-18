-- 158-merge-cliente-frais-duplicado.sql
-- "Frais" (8ba6e09e) e "Rafael Frais" (24d8b9ff) são a mesma pessoa —
-- mesmo telefone 67 9659-3234 (dedupe por telefone, não nome/endereço).
-- "Mirian Regina Frais" NÃO é duplicata (telefone diferente) — não é tocada.

BEGIN;

-- 1. Move a OS que estava em "Frais" pra "Rafael Frais".
UPDATE os
SET cliente_id = '24d8b9ff-dd5c-4dd5-8736-6390a4bbb620'
WHERE cliente_id = '8ba6e09e-8c48-419d-b070-f8e13b1dd4b3'
  AND deleted_at IS NULL;

-- 2. Guarda o endereço antigo de "Frais" como 2º endereço de "Rafael Frais"
--    (só se ele ainda não tiver um endereco2 preenchido).
UPDATE cliente
SET endereco2 = 'Alameda Londrina, 587 - Eco Park Residence, Naviraí - MS, 79950-000, Brasil, Naviraí, MS'
WHERE id = '24d8b9ff-dd5c-4dd5-8736-6390a4bbb620'
  AND (endereco2 IS NULL OR endereco2 = '');

-- 3. Soft-delete do registro duplicado "Frais".
UPDATE cliente
SET deleted_at = now()
WHERE id = '8ba6e09e-8c48-419d-b070-f8e13b1dd4b3';

COMMIT;

-- Conferência.
SELECT id, nome, telefone, endereco, endereco2, deleted_at,
  (SELECT COUNT(*) FROM os WHERE cliente_id = cliente.id AND deleted_at IS NULL) AS qtd_os
FROM cliente
WHERE id IN ('8ba6e09e-8c48-419d-b070-f8e13b1dd4b3', '24d8b9ff-dd5c-4dd5-8736-6390a4bbb620');
