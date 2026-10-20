-- =============================================================================
-- sql/202 — Dados brutos das 5 OS corrigidas (sql/201) pra calcular local
-- (com calcularPontosOS real, não aproximação em SQL) quantos pontos cada
-- uma passou a valer depois de sair da garantia, e quem ganha esses pontos
-- em qual mês. Só leitura, não altera nada.
-- =============================================================================

SELECT id, numero, tipo, tipo_equipamento, garantia, pre_diagnostico
FROM os
WHERE numero IN (1624, 1759, 1773, 1774, 1782);
