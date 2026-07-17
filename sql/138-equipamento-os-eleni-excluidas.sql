-- 138-equipamento-os-eleni-excluidas.sql
-- SÓ LEITURA. Mostra o equipamento das 2 OS excluídas da Eleni (#1657 e #1666).

SELECT numero, marca_equipamento, modelo_equipamento, numero_serie, tipo_equipamento, defeito_relatado
FROM os
WHERE numero IN (1657, 1666);
