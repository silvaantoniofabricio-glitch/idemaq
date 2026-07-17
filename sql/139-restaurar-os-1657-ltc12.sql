-- 139-restaurar-os-1657-ltc12.sql
-- Restaura a OS #1657 (Eleni Sordi Maier — Electrolux LTC12, "Troca da
-- Correia"), excluída em 09/07/2026. Soft-delete é reversível: só limpa
-- deleted_at/excluido_por, não perde nenhum dado (etapa, valores, histórico
-- continuam intactos).

UPDATE os
SET deleted_at = NULL, excluido_por = NULL
WHERE numero = 1657;

-- Conferir:
SELECT numero, etapa, deleted_at, marca_equipamento, modelo_equipamento
FROM os WHERE numero = 1657;
