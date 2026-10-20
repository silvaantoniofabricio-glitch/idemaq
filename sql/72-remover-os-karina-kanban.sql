-- sql/72-remover-os-karina-kanban.sql
-- Soft-delete da OS #1328 (Karina Ferreira, jul/2025, em_oficina, já paga).
-- A OS #1616 (nova, criada 01/06/2026) fica intacta no Kanban.

UPDATE os
SET deleted_at = NOW()
WHERE numero = 1328
  AND deleted_at IS NULL;
