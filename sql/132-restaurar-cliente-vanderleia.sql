-- 132-restaurar-cliente-vanderleia.sql
-- Cliente "Vanderleia da Silva Lima" não aparece na lista de clientes, apesar
-- de estar nos dados de origem (Bling ID 17366802252 / Trello GUqH49DD) e ter
-- histórico real (pedidos 214 e 537 + lançamentos financeiros).
-- Telefone: 6798611635 · Endereço: R. Itaúba, 363 - Res. Ipe, Naviraí-MS.
--
-- Este script é IDEMPOTENTE e cobre os dois cenários possíveis:
--   (a) ela existe mas foi soft-deletada  → reativa (deleted_at = NULL)
--   (b) ela não existe                     → cria
--   (c) já existe ativa                    → não faz nada
-- Match pelo telefone normalizado (fonte da verdade pra dedupe de cliente).
--
-- RODAR NO SQL EDITOR DO SUPABASE.

-- (a) Reativa se estiver soft-deletada
UPDATE cliente
SET deleted_at = NULL, excluido_por = NULL
WHERE deleted_at IS NOT NULL
  AND regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') = '6798611635';

-- (b) Cria só se não houver nenhuma ativa com esse telefone
INSERT INTO cliente (nome, telefone, endereco, observacoes)
SELECT 'Vanderleia da Silva Lima',
       '67 9861-1635',
       'R. Itaúba, 363 - Res. Ipe, Naviraí - MS, 79950-000, Brasil',
       'Restaurada — Bling ID 17366802252 / Trello GUqH49DD'
WHERE NOT EXISTS (
  SELECT 1 FROM cliente c
  WHERE c.deleted_at IS NULL
    AND regexp_replace(COALESCE(c.telefone, ''), '\D', '', 'g') = '6798611635'
);

-- Conferir:
SELECT id, nome, telefone, deleted_at
FROM cliente
WHERE regexp_replace(COALESCE(telefone, ''), '\D', '', 'g') = '6798611635';
